import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {productionCapabilityEnabled,PRODUCTION_ORIGIN} from "../src/lib/server/production-gates.ts";
import {hasSameOriginMutation,hasSameOriginMutationHeaders} from "../src/lib/server/auth/csrf.ts";
import {handleWorkerTrigger} from "../src/lib/server/worker-trigger.ts";
import {runBackgroundWorker} from "../src/lib/server/background-worker.ts";
import {googleDriveStorage,googleStorageConfigured} from "../src/lib/server/google-drive.ts";
import {emailReadiness,configuredEmailAdapter} from "../src/lib/server/resend-email.ts";
import {handleReadiness,healthResponse} from "../src/lib/server/health.ts";
import {syntheticIntakeEnabled} from "../src/lib/server/public-intake.ts";
import {enqueueDueRetention} from "../src/lib/server/background-worker.ts";
import {validateTarget} from "./production-database-readiness.mjs";
import {query} from "../src/lib/server/database.ts";

let checks=0,calls=0;
const check=(actual,expected=true)=>{assert.deepEqual(actual,expected);checks++};
const original={...process.env},transport=globalThis.fetch;
try {
  process.env.NODE_ENV="production";
  globalThis.fetch=async()=>{calls++;throw new Error("Unexpected provider request");};
  for(const name of ["STAFF","WORKER","EMAIL","DRIVE"]){
    const key="PRODUCTION_"+name+"_ENABLED";delete process.env[key];
    for(const value of [undefined,"","false","1","TRUE","true "]){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
      check(productionCapabilityEnabled(name),false);
    }
    process.env[key]="true";check(productionCapabilityEnabled(name));delete process.env[key];
  }
  check(PRODUCTION_ORIGIN,"https://pyramiddesigns.co");
  const good={origin:PRODUCTION_ORIGIN,host:"pyramiddesigns.co"};
  check(hasSameOriginMutationHeaders(new Headers(good)));
  for(const headers of [
    {},{...good,origin:"https://evil.invalid"},{...good,host:"evil.invalid"},
    {...good,origin:"http://pyramiddesigns.co"},{...good,origin:PRODUCTION_ORIGIN+"/"},
    {...good,origin:"https://user@pyramiddesigns.co"},{...good,host:"pyramiddesigns.co, evil.invalid"},
    {origin:"https://evil.invalid",host:"evil.invalid","x-forwarded-host":"pyramiddesigns.co"},
    {origin:PRODUCTION_ORIGIN,host:"evil.invalid","x-forwarded-host":"pyramiddesigns.co"}])
      check(hasSameOriginMutationHeaders(new Headers(headers)),false);
  // Untrusted forwarding never supplies Host/protocol authority.
  check(hasSameOriginMutationHeaders(new Headers({...good,"x-forwarded-host":"evil.invalid","x-forwarded-proto":"http"})));
  check(hasSameOriginMutation(new Request(PRODUCTION_ORIGIN+"/staff",{method:"POST",headers:good})));
  check(syntheticIntakeEnabled(PRODUCTION_ORIGIN),false);check(syntheticIntakeEnabled("http://127.0.0.1"),false);
  check(await enqueueDueRetention({query:async()=>{throw new Error("Unexpected DB work")}}),0);
  let work=0;
  const trigger=new Request(PRODUCTION_ORIGIN+"/api/internal/worker",{method:"POST"});
  check((await handleWorkerTrigger(trigger,async()=>{work++;return {}})).status,404);
  await assert.rejects(()=>runBackgroundWorker({run:async()=>{work++;throw new Error("Unexpected DB work")}}));checks++;
  check(work,0);
  Object.assign(process.env,{GOOGLE_CLIENT_ID:"synthetic-only",GOOGLE_CLIENT_SECRET:"synthetic-only",
    GOOGLE_REFRESH_TOKEN:"synthetic-only",GOOGLE_DRIVE_ROOT_ID:"synthetic-root-only"});
  check(googleStorageConfigured(),false);assert.throws(()=>googleDriveStorage());checks++;
  Object.assign(process.env,{EMAIL_PROVIDER:"resend",RESEND_API_KEY:"re_synthetic_not_a_credential_only",
    EMAIL_FROM_ADDRESS:"applications@mail.pyramiddesigns.co",EMAIL_FROM_NAME:"Pyramid Designs",
    EMAIL_REPLY_TO_MODE:"fixed",EMAIL_REPLY_TO_ADDRESS:"contact@pyramiddesigns.co"});
  check(emailReadiness(),"EMAIL_CONFIGURATION_UNAVAILABLE");check(configuredEmailAdapter().mode,"unavailable");
  process.env.PRODUCTION_EMAIL_ENABLED="true";const adapter=configuredEmailAdapter();check(adapter.mode,"provider");
  process.env.PRODUCTION_EMAIL_ENABLED="false";
  check((await adapter.send({},new AbortController().signal)).outcome,"CONFIG_FAILURE");
  delete process.env.CRON_SECRET;
  check((await handleReadiness(new Request(PRODUCTION_ORIGIN+"/api/health/ready"))).status,503);
  process.env.CRON_SECRET="synthetic-readiness-secret-only-32-characters";
  const headers={authorization:"Bearer "+process.env.CRON_SECRET};
  check((await handleReadiness(new Request(PRODUCTION_ORIGIN+"/api/health/ready"))).status,401);
  check((await handleReadiness(new Request(PRODUCTION_ORIGIN+"/api/health/ready?diagnostic=1",{headers}))).status,400);
  const saved=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
  const result=await handleReadiness(new Request(PRODUCTION_ORIGIN+"/api/health/ready",{headers}));
  check(result.status,503);check(await result.json(),{ok:false});process.env.DATABASE_URL=saved;
  check(await healthResponse(true).json(),{ok:true});
  process.env.DATABASE_URL="postgresql://synthetic-invalid-configuration@[";
  assert.throws(()=>query("SELECT 1"),error=>error.message==="DATABASE_URL must be a PostgreSQL URL.");checks++;
  process.env.DATABASE_URL=saved;
  for(const mode of ["runtime","operator"]){
    const project="abcdefghijklmnopqrst";
    for (const host of [`db.${project}.supabase.co`,"aws-0-eu-west-2.pooler.supabase.com"]) {
      const user=host.startsWith("db.") ? "synthetic" : `synthetic.${project}`;
      const base=`postgresql://${user}@${host}:5432/postgres?sslmode=verify-full`;
      check(!!validateTarget(base,mode,false,project,host));
      for(const value of [
        base.replace(host,"ep-synthetic.neon.tech"),
        base.replace("verify-full","require"),
        base+"&options=anything",base+"&sslmode=require",base+"#ignored",
        base.replace(":5432/",":6543/"),base.replace("/postgres?","/other?"),
        base.replace(user,`${user}.wrong`),base.replace(host,host+".evil.invalid")]) {
        assert.throws(()=>validateTarget(value,mode,false,project,host));checks++;
      }
      assert.throws(()=>validateTarget(base,mode,false,"zyxwvutsrqponmlkjihg",host));checks++;
    }
  }
  for(const file of readdirSync("src/app/api/internal/compatibility")){
    const text=readFileSync("src/app/api/internal/compatibility/"+file+"/route.ts","utf8");
    check(text.includes('if (process.env.NODE_ENV === "production") return new Response(null, { status: 404'));
  }
  check(calls,0);
  console.log("B4A_OFFLINE_OK checks="+checks+" provider_calls=0 production_intake=closed retention=closed");
}finally{globalThis.fetch=transport;for(const name of Object.keys(process.env))if(!(name in original))delete process.env[name];Object.assign(process.env,original);}
