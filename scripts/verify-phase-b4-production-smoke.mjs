import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {writeFileSync} from "node:fs";
const output=process.env.B4_EVIDENCE_DIRECTORY;assert(output);
const target=new URL(process.env.DATABASE_URL ?? "invalid:");
assert.equal(target.hostname,"127.0.0.1");assert.equal(target.port,"55442");
assert(/^\/phase2ib_b1r1_b[24]_[a-z0-9_]+$/.test(target.pathname));
const origin="http://127.0.0.1:3114";
const secret="synthetic-b4-readiness-secret-only-0000000000";
const env={...process.env,NODE_ENV:"production",PUBLIC_INTAKE_MODE:"synthetic",DIRECT_URL:"",
  CRON_SECRET:secret,COMPATIBILITY_PROBE_SECRET:secret};
for(const key of Object.keys(env))if(/^(GOOGLE_|RESEND_|EMAIL_|TURNSTILE_|SUPABASE_|NEXT_PUBLIC_|PRODUCTION_)/.test(key))delete env[key];
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3114"],{windowsHide:true,env});
let log="";child.stdout.on("data",d=>log+=d);child.stderr.on("data",d=>log+=d);
let checks=0;const results=[];const check=(a,b=true)=>{assert.deepEqual(a,b);checks++};
try {
  let ready=false;
  for(let i=0;i<100&&!ready;i++){try{ready=(await fetch(origin+"/api/health/live")).ok}catch{}if(!ready)await new Promise(r=>setTimeout(r,200));}
  check(ready);
  for(const path of ["/","/careers","/work","/join"]){
    const response=await fetch(origin+path);check(response.status,200);const text=await response.text();
    if(path==="/join"){check(text.includes("Applications are not open yet."));check(!text.includes('type="file"'));check(!text.includes("Submit synthetic application"));}
    results.push({path,status:response.status});
  }
  for(const path of ["/staff","/staff/applications","/staff/content","/api/staff/candidate-files/00000000-0000-4000-8000-000000000012/download",
    "/internal/staff-auth","/api/internal/staff-auth/verify","/api/internal/staff-auth/read","/dev/design-system"]){
    const r=await fetch(origin+path,{redirect:"manual"});check(r.status,404);results.push({path,status:r.status});
  }
  for(const path of ["/api/internal/compatibility/server","/api/internal/compatibility/database","/api/internal/compatibility/outbound",
    "/api/internal/compatibility/revalidation","/api/internal/compatibility/upload","/api/internal/cron-probe"])
    for(const method of ["GET","POST"]){
      const r=await fetch(origin+path,{method,headers:{authorization:"Bearer "+secret}});check(r.status,404);
      check(!((await r.text()).includes("PROBE")));results.push({path,method,status:r.status});
    }
  const live=await fetch(origin+"/api/health/live");check(live.status,200);check(await live.json(),{ok:true});check(live.headers.get("cache-control").includes("no-store"));
  const denied=await fetch(origin+"/api/health/ready");check(denied.status,401);check(await denied.json(),{ok:false});
  const headers={authorization:"Bearer "+secret};
  const dependency=await fetch(origin+"/api/health/ready",{headers});check(dependency.status,200);check(await dependency.json(),{ok:true});
  check((await fetch(origin+"/api/health/ready?verbose=yes",{headers})).status,400);
  for(const init of [{},{headers},{headers,body:"{}"}])check((await fetch(origin+"/api/internal/worker",{method:"POST",...init})).status,404);
  for(const headers of [{origin,host:"127.0.0.1:3114"},{"origin":"https://pyramiddesigns.co","x-forwarded-host":"pyramiddesigns.co","x-forwarded-proto":"https"}]){
    const r=await fetch(origin+"/api/applications",{method:"POST",headers:{...headers,"content-type":"application/x-www-form-urlencoded"},body:"mode=synthetic"});
    check(r.status,403);
  }
  check(!log.includes(secret));check(!log.includes(target.href));check(!log.includes(decodeURIComponent(target.password)));
  writeFileSync(output+"/b4-route-audit.json",JSON.stringify({passed:true,checks,results,staff:"closed",worker:"closed",intake:"closed",diagnostics:"404",readiness:"authenticated bounded SELECT 1",liveEffects:0},null,2));
  console.log("B4A_ROUTE_SMOKE_OK checks="+checks+" production_gates=closed diagnostics=404 readiness=authenticated");
} finally {
  child.kill();await new Promise(resolve=>child.once("close",resolve));
  writeFileSync(output+"/b4-production-server.log",log.replaceAll(target.href,"[disposable URL]").replaceAll(decodeURIComponent(target.password),"[disposable credential]"));
}
