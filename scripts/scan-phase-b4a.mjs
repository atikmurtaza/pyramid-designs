import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";
import {execFileSync} from "node:child_process";

const privateNames=["DATABASE_URL","DIRECT_URL","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_ID",
  "RESEND_API_KEY","TURNSTILE_SECRET_KEY","CRON_SECRET","COMPATIBILITY_PROBE_SECRET","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SECRET_KEY"];
const git=args=>execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
const doc=readFileSync("docs/operations/production-environment.md","utf8");
const example=readFileSync(".env.example","utf8");
let checked=0;
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+"/"+e.name):[dir+"/"+e.name]);}
const source=[...walk("src"),...walk("scripts"),"prisma.config.ts","next.config.ts"].filter(f=>/\.(?:[cm]?js|tsx?)$/.test(f));
const consumed=new Set();
for(const file of source)for(const match of readFileSync(file,"utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g))consumed.add(match[1]);
for(const file of ["src/lib/server/intake-challenge.ts","src/lib/server/resend-email.ts"])
  for(const match of readFileSync(file,"utf8").matchAll(/e\.([A-Z][A-Z0-9_]+)/g))consumed.add(match[1]);
for(const name of [...consumed,...privateNames,"GOOGLE_CLIENT_ID","PRODUCTION_STAFF_ENABLED","PRODUCTION_WORKER_ENABLED","PRODUCTION_EMAIL_ENABLED","PRODUCTION_DRIVE_ENABLED","COMPATIBILITY_BASE_URL"])
  assert(doc.includes("| "+name+" |"),"Environment consumer missing from authoritative contract");
for(const line of example.split(/\r?\n/)){
  if(!line || line.startsWith("#"))continue;
  const [name,...parts]=line.split("=");assert(doc.includes("| "+name+" |"));
  const value=parts.join("=");
  if(privateNames.includes(name))assert.equal(value,"","Secret example must be blank");
  if(name.startsWith("PRODUCTION_"))assert.equal(value,"false");
}
assert(!example.includes("SUPABASE_SERVICE_ROLE_KEY="));
const values=privateNames.map(n=>process.env[n]).filter(v=>v?.startsWith("synthetic-b4-canary-") || v?.includes("synthetic-b4-canary-"));
function inspect(file,bytes,client=false) {
  checked++;
  for(const value of values)assert(!bytes.includes(Buffer.from(value)),"Private build canary leaked");
  const text=bytes.toString();
  if(client)for(const name of privateNames)assert(!text.includes(name),"Private environment name in browser asset");
  for(const pattern of [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,/eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,
    /re_(?!synthetic)[A-Za-z0-9_-]{24,}/,/ya29\.[A-Za-z0-9_-]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}/])
      assert(!pattern.test(text),"Sensitive literal detected; contents suppressed");
}
const staged=process.argv.includes("--staged");
const files=(staged?git(["diff","--cached","--name-only"]):git(["diff","--name-only"])+"\n"+git(["ls-files","--others","--exclude-standard"])).split(/\r?\n/).filter(Boolean);
for(const file of files){
  assert(!/^\.env(?!\.example$)|\.(?:pem|key)$|^tmp\//.test(file),"Unexpected sensitive/generated change");
  if(!existsSync(file))continue;
  inspect(file,staged?Buffer.from(execFileSync("git",["show",":"+file],{stdio:["ignore","pipe","ignore"]})):readFileSync(file));
}
assert(existsSync(".next/static"),"Production build required");
const staticFiles=walk(".next/static");
for(const file of staticFiles)inspect(file,readFileSync(file),true);
for(const file of walk(".next/server"))inspect(file,readFileSync(file));
const output=process.env.B4_EVIDENCE_DIRECTORY;
if(output)for(const file of walk(output).filter(f=>/\.(?:log|json)$/.test(f)))inspect(file,readFileSync(file));
assert.equal(git(["diff","999603ea1a35d55896dfef94841feb015f982ab8","--","package.json","package-lock.json","prisma/schema.prisma","prisma/migrations"]),"");
assert.equal(git(["ls-files","--",".env.local",".env"]),"");
console.log("B4A_BOUNDARY_SCAN_OK files="+checked+" changed="+files.length+" client_files="+staticFiles.length+" env_consumers="+consumed.size+" findings=0 staged="+staged);
