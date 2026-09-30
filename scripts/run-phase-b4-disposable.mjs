import assert from "node:assert/strict";
import {randomBytes,createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {readFile,writeFile,mkdir,existsSync} from "node:fs";
import {promisify} from "node:util";
import pg from "pg";
import {catalogContract,inspectDatabase,validateTarget} from "./production-database-readiness.mjs";

const read=promisify(readFile),write=promisify(writeFile),make=promisify(mkdir);
assert.equal(Number(process.versions.node.split(".")[0]),22);
assert(!existsSync(".env") && !existsSync(".env.local"));
const output=process.env.B4_EVIDENCE_DIRECTORY;assert(output);
const adminUrl=new URL(process.env.B4_DISPOSABLE_ADMIN_URL ?? "invalid:");
assert.equal(adminUrl.hostname,"127.0.0.1");assert.equal(adminUrl.port,"55442");assert.equal(adminUrl.pathname,"/postgres");
await make(output,{recursive:true});
const secrets=[];
const env={...process.env,NODE_ENV:"test",PUBLIC_INTAKE_MODE:"synthetic"};
for(const name of Object.keys(env)) if(/^(DATABASE_URL|DIRECT_URL|GOOGLE_|RESEND_|EMAIL_|TURNSTILE_|CRON_SECRET|COMPATIBILITY_|NEXT_PUBLIC_|SUPABASE_|PRODUCTION_)/.test(name))delete env[name];
async function run(label,command,args,extra={}){
  const r=await new Promise((resolve,reject)=>{let log="";const child=spawn(command,args,{windowsHide:true,env:{...env,...extra}});
    child.stdout.on("data",d=>log+=d);child.stderr.on("data",d=>log+=d);child.on("error",reject);child.on("close",code=>resolve({code,log}));});
  for(const secret of secrets)r.log=r.log.replaceAll(secret,"[disposable credential]");
  r.log=r.log.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/g,"[disposable URL]");
  await write(output+"/"+label+".log",r.log);
  console.log(label+" exit="+r.code);
  assert.equal(r.code,0,label+" failed; review safe local evidence");
}
const admin=new pg.Client({connectionString:adminUrl.href});await admin.connect();
try{
  assert((await admin.query("SELECT version() AS v")).rows[0].v.startsWith("PostgreSQL 17"));
  for(const role of ["anon","authenticated","pyramid_runtime","pyramid_reference_locker"])
    if(!(await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[role])).rowCount)
      await admin.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
  const suffix=randomBytes(6).toString("hex"),source="phase2ib_b1r1_b4_source_"+suffix,target="phase2ib_b1r1_b4_restore_"+suffix;
  const owner="b4_owner_"+suffix,runtime="b4_runtime_"+suffix,publicRole="b1_public_"+suffix;
  const passwords=[randomBytes(32).toString("hex"),randomBytes(32).toString("hex")];secrets.push(...passwords);
  for(const [i,role] of [owner,runtime].entries())
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${passwords[i]}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await admin.query(`GRANT pyramid_reference_locker TO ${owner} WITH INHERIT TRUE, SET TRUE`);
  await admin.query(`GRANT pyramid_runtime TO ${runtime}`);
  await admin.query(`CREATE ROLE ${publicRole} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await admin.query(`GRANT anon,authenticated,${publicRole} TO ${owner} WITH INHERIT FALSE, SET TRUE`);
  await admin.query(`CREATE DATABASE ${source} OWNER ${owner}`);
  const url=(role,database)=>{const u=new URL(adminUrl);u.username=role;u.password=role===owner?passwords[0]:passwords[1];u.pathname="/"+database;return u.href};
  const direct=url(owner,source),restricted=url(runtime,source);
  await run("b4-deploy",process.execPath,["node_modules/prisma/build/index.js","migrate","deploy"],{DIRECT_URL:direct,DATABASE_URL:""});
  await run("b4-seed",process.execPath,["--conditions=react-server","--experimental-strip-types","scripts/seed-phase-2c-synthetic.mjs"],{DATABASE_URL:direct});
  const client=new pg.Client({connectionString:direct});await client.connect();
  let expected;
  try{
    await client.query("BEGIN READ ONLY");await client.query("SET LOCAL search_path=pg_catalog,public");
    expected=await catalogContract(client);await client.query("ROLLBACK");
  }finally{await client.end();}
  if(process.argv.includes("--record-contract")) await write("scripts/production-database-contract.json",JSON.stringify(expected,null,2)+"\n");
  else assert.deepEqual(expected,JSON.parse(await read("scripts/production-database-contract.json","utf8")));
  await inspectDatabase(validateTarget(direct,"operator",true),"operator",expected);
  await inspectDatabase(validateTarget(restricted,"runtime",true),"runtime",expected);
  await run("b4-offline",process.execPath,["--conditions=react-server","--experimental-strip-types","scripts/verify-phase-b4a.mjs"],{DATABASE_URL:restricted,DIRECT_URL:""});
  if (existsSync(".next/BUILD_ID")) await run("b4-production-smoke",process.execPath,["scripts/verify-phase-b4-production-smoke.mjs"],
    {DATABASE_URL:restricted,DIRECT_URL:"",B4_EVIDENCE_DIRECTORY:output});
  // Real custom-format logical backup and restore, entirely synthetic/loopback.
  const started=performance.now(),dump="/tmp/pyramid-b4-"+suffix+".dump";
  await run("b4-dump","docker",["exec","pyramid-b4-pg17","pg_dump","--format=custom","--file="+dump,"--username="+owner,"--dbname="+source]);
  await run("b4-copy","docker",["cp","pyramid-b4-pg17:"+dump,output+"/synthetic-"+suffix+".dump"]);
  const bytes=await read(output+"/synthetic-"+suffix+".dump");assert(bytes.length>0);
  await admin.query(`CREATE DATABASE ${target} OWNER ${owner}`);
  await run("b4-restore","docker",["exec","pyramid-b4-pg17","pg_restore","--exit-on-error","--no-owner","--username="+owner,"--dbname="+target,dump]);
  const restored=url(owner,target),restoredRuntime=url(runtime,target);
  // Restore is isolated and closed. Repair exactly the nonowner locking-function
  // ownership; the temporary CREATE privilege must be revoked before any smoke.
  const repair=new pg.Client({connectionString:restored});await repair.connect();
  try {
    await repair.query("BEGIN");
    await repair.query("GRANT CREATE ON SCHEMA pyramid_private TO pyramid_reference_locker");
    await repair.query("ALTER FUNCTION pyramid_private.lock_reference(text,uuid) OWNER TO pyramid_reference_locker");
    await repair.query("REVOKE CREATE ON SCHEMA pyramid_private FROM pyramid_reference_locker");
    await repair.query(`REVOKE CREATE, TEMPORARY ON DATABASE ${target} FROM PUBLIC, anon, authenticated, pyramid_runtime, pyramid_reference_locker`);
    await repair.query("COMMIT");
  } finally {await repair.end();}
  await inspectDatabase(restored,"operator",expected);await inspectDatabase(restoredRuntime,"runtime",expected);
  await run("b4-restored-permissions",process.execPath,["--conditions=react-server","--experimental-strip-types","scripts/verify-phase-b1-permissions.mjs"],
    {DATABASE_URL:restoredRuntime,DIRECT_URL:"",B1_TEST_OWNER_URL:restored,B1_TEST_PUBLIC_ROLE:publicRole});
  // Fault injection only on the disposable source. The checker remains read-only.
  const bad=new pg.Client({connectionString:direct});await bad.connect();
  try {
    await bad.query('ALTER TABLE public."AuditEvent" DISABLE ROW LEVEL SECURITY');
    await assert.rejects(()=>inspectDatabase(restricted,"runtime",expected));
    await bad.query('ALTER TABLE public."AuditEvent" ENABLE ROW LEVEL SECURITY');
    await bad.query("GRANT SELECT ON public.\"AuditEvent\" TO anon");
    await assert.rejects(()=>inspectDatabase(restricted,"runtime",expected));
    await bad.query("REVOKE SELECT ON public.\"AuditEvent\" FROM anon");
    await bad.query("UPDATE public._prisma_migrations SET checksum=repeat('0',64) WHERE migration_name=$1",["20260930010000_phase_b2_admin_workflows"]);
    await assert.rejects(()=>inspectDatabase(direct,"operator",expected));
  }finally{await bad.end();}
  await write(output+"/b4-summary.json",JSON.stringify({passed:true,source,target,owner,runtime,port:55442,migrations:11,
    facets:expected,restoreMs:Math.round(performance.now()-started),dumpBytes:bytes.length,dumpSha256:createHash("sha256").update(bytes).digest("hex"),
    restore:"synthetic logical backup/restored catalog/restricted evidence",faultsRejected:["RLS disabled","browser grant","ledger checksum"],
    liveProviderEffects:0},null,2));
  console.log("B4_DISPOSABLE_OK migrations=11 read_only_connections=verified restore=synthetic restricted_runtime=verified faults_rejected=3 live_effects=0");
}finally{await admin.end();}
