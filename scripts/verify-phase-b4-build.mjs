import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
assert.equal(Number(process.versions.node.split(".")[0]),22);
assert(!existsSync(".env.local") && !existsSync(".env"));
assert(!existsSync(".next"),"Use a fresh checkout/build directory for clean build verification");
const output=process.env.B4_EVIDENCE_DIRECTORY;assert(output);mkdirSync(output,{recursive:true});
const env={...process.env};
for(const name of Object.keys(env))if(/^(DATABASE_URL|DIRECT_URL|GOOGLE_|RESEND_|EMAIL_|TURNSTILE_|CRON_SECRET|COMPATIBILITY_|NEXT_PUBLIC_|SUPABASE_|PRODUCTION_)/.test(name))delete env[name];
const privateNames=["DATABASE_URL","DIRECT_URL","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_ID",
  "RESEND_API_KEY","TURNSTILE_SECRET_KEY","CRON_SECRET","COMPATIBILITY_PROBE_SECRET","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SECRET_KEY"];
const canaries=Object.fromEntries(privateNames.map(name=>[name,"synthetic-b4-canary-"+name+"-"+randomBytes(12).toString("hex")]));
canaries.DATABASE_URL="postgresql://"+canaries.DATABASE_URL+"@127.0.0.1:1/unavailable";
canaries.DIRECT_URL="postgresql://"+canaries.DIRECT_URL+"@127.0.0.1:1/unavailable";
async function run(name,args,extra={}){
  const r=await new Promise((resolve,reject)=>{let log="";const child=spawn(process.execPath,args,{windowsHide:true,env:{...env,...extra}});
    child.stdout.on("data",d=>log+=d);child.stderr.on("data",d=>log+=d);child.on("error",reject);child.on("close",code=>resolve({code,log}));});
  for(const value of Object.values(canaries))assert(!r.log.includes(value),"Private canary in build/check output");
  writeFileSync(output+"/"+name+".log",r.log);console.log(name+" exit="+r.code);
  if(r.code!==0){console.error(r.log.slice(-2500));throw new Error("Local quality gate failed");}
}
await run("b4-lint",["node_modules/eslint/bin/eslint.js","src"]);
await run("b4-typecheck",["node_modules/typescript/bin/tsc","--noEmit"]);
await run("b4-build",["node_modules/next/dist/bin/next","build","--webpack"],{...canaries,NODE_ENV:"production"});
await run("b4-postbuild-typecheck",["node_modules/typescript/bin/tsc","--noEmit"]);
await run("b4-boundary-scan",["scripts/scan-phase-b4a.mjs"],{...canaries,B4_EVIDENCE_DIRECTORY:output});
console.log("B4A_BUILD_OK clean=true canaries=private build_liveness_not_provider_acceptance=true");
