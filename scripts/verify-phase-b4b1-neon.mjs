import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { REHEARSAL, validateLedger, cleanupPlan, mutationManifest } from "./neon-rehearsal-manifest.mjs";
import { authorization, connectionTarget, validateProvider, assertSqlIdentity, emptyDatabaseFacts, assertEmptyDatabase,
  assertRolePrerequisites, providerPreflight, assertConnectionPair, cleanupMetadata } from "./neon-rehearsal-target.mjs";
import { childEnvironment, safeEvidence, main, runChild, pooledVerification } from "./run-phase-b4b1-neon.mjs";

// These are explicit offline mocks. They never reach the CLI's live provider
// gate, and no mock branch is represented as an existing or approved resource.
let checks = 0;
const check = (actual, expected = true) => { assert.deepEqual(actual, expected); checks++; };
const rejects = (fn, code) => { assert.throws(fn, { message: code }); checks++; };
const auth = { project: REHEARSAL.project, branchId: "br-offline-fixture", runId: randomUUID() };
const stamp = new Date(Date.now() - 1000).toISOString();
const env = { P3_PROJECT_ID: auth.project, P3_BRANCH_ID: auth.branchId, P3_RUN_ID: auth.runId,
  P3_REHEARSAL_AUTHORIZATION: REHEARSAL.authorization };
const resource = (kind,id,source) => ({ kind,id,source,createdAt:stamp,runId:auth.runId,branchId:auth.branchId });
const publics = ["b1_public_123456789abc", "b1_public_abcdef123456"];
const ledger = { ...auth, project: auth.project, startedAt: new Date(Date.now() - 2000).toISOString(), resources: [
  resource("branch",auth.branchId,"neon-create-schema-only"), resource("compute","ep-offline-fixture","neon-create-compute"),
  ...Object.values(REHEARSAL.suites).map(t => resource("database",t.database,"sql-create-template0")),
  ...[...Object.values(REHEARSAL.suites).flatMap(t => [t.owner,t.runtime]),"pyramid_runtime","pyramid_reference_locker",...publics]
    .map(role => resource("role",role,"sql-create-role")),
] };
// Only the exact receipt shape is accepted; remove the auth-only field.
delete ledger.branchId; ledger.branchId = auth.branchId; delete ledger.runId; ledger.runId = auth.runId;
const host = "ep-offline-fixture.ap-southeast-1.aws.neon.tech";
const provider = { branch: { id:auth.branchId,project_id:auth.project,name:REHEARSAL.branchName,default:false,protected:false,
  init_source:"schema-only",current_state:"ready",created_at:stamp },
endpoints:[{id:"ep-offline-fixture",host,branch_id:auth.branchId,project_id:auth.project,region_id:REHEARSAL.region,
  type:"read_write",disabled:false,passwordless_access:true,current_state:"active",created_at:stamp}],
databases:Object.values(REHEARSAL.suites).map(t => ({name:t.database,owner_name:t.owner,branch_id:auth.branchId})) };
const url = (suite,kind) => { const t=REHEARSAL.suites[suite]; return `postgresql://${t[kind === "operator" ? "owner" : "runtime"]}:synthetic-password-canary@${host.replace(".ap-",kind === "runtime" ? "-pooler.ap-" : ".ap-")}/${t.database}?sslmode=verify-full`; };
const copy = value => structuredClone(value);
check(authorization(env),auth);
for (const branchId of REHEARSAL.deniedBranches) rejects(() => authorization({...env,P3_BRANCH_ID:branchId}),"PRODUCTION_BRANCH_DENIED");
rejects(() => authorization({...env,P3_BRANCH_ID:""}),"BLOCKED_DISPOSABLE_BRANCH_REQUIRED");
rejects(() => authorization({...env,P3_PROJECT_ID:"wrong-project"}),"PROJECT_DENIED");
rejects(() => authorization({...env,P3_REHEARSAL_AUTHORIZATION:"test"}),"REHEARSAL_AUTHORIZATION_REQUIRED");
rejects(() => authorization({...env,P3_RUN_ID:"fictional-run"}),"RUN_ID_REQUIRED");
for (const suite of ["b1","b2"]) for (const kind of ["operator","runtime"]) {
  const good = url(suite,kind), target = connectionTarget(good,suite,kind);
  check(target.database,REHEARSAL.suites[suite].database);
  rejects(() => connectionTarget(good.replace(target.database,"pyramid_design"),suite,kind),"PRODUCTION_DATABASE_DENIED");
  rejects(() => connectionTarget(good.replace(target.database,REHEARSAL.suites[suite === "b1" ? "b2" : "b1"].database),suite,kind),"DATABASE_BINDING_MISMATCH");
  for (const hostname of ["localhost","127.0.0.1","evil.invalid","ep-fake.neon.tech.evil.invalid","db.supabase.co"])
    rejects(() => connectionTarget(good.replace(target.host,hostname),suite,kind),"PROVIDER_HOST_DENIED");
  rejects(() => connectionTarget(good.replace("verify-full","require"),suite,kind),"TLS_CONFIGURATION_DENIED");
  rejects(() => connectionTarget(good+"&sslmode=verify-full",suite,kind),"TLS_CONFIGURATION_DENIED");
  rejects(() => connectionTarget(good+"&options=anything",suite,kind),"TLS_CONFIGURATION_DENIED");
  rejects(() => connectionTarget(good.replace(target.login,"pyramid_owner"),suite,kind),"LOGIN_BINDING_MISMATCH");
  rejects(() => connectionTarget("postgresql://synthetic-password-canary@[",suite,kind),"CONNECTION_CONFIGURATION_INVALID");
}
check(validateProvider(auth,provider,ledger).id,"ep-offline-fixture");
for (const [field,value,code] of [["id",REHEARSAL.deniedBranches[0],"PROVIDER_BRANCH_DENIED"],
  ["project_id","wrong-project","PROVIDER_BRANCH_DENIED"],["name","migration-baseline","PROVIDER_BRANCH_DENIED"],
  ["init_source","parent-data","PROVIDER_BRANCH_METADATA_MISMATCH"],["default",true,"PROVIDER_BRANCH_METADATA_MISMATCH"],
  ["protected",true,"PROVIDER_BRANCH_METADATA_MISMATCH"],["parent_id",REHEARSAL.deniedBranches[0],"PROVIDER_BRANCH_METADATA_MISMATCH"]]) {
  const bad=copy(provider);bad.branch[field]=value;rejects(()=>validateProvider(auth,bad,ledger),code);
}
for (const field of ["branch_id","project_id","region_id","host","id"]) {
  const bad=copy(provider);bad.endpoints[0][field]="wrong";rejects(()=>validateProvider(auth,bad,ledger),"PROVIDER_COMPUTE_MISMATCH");
}
const wrongOwner=copy(provider);wrongOwner.databases[0].owner_name="pyramid_owner";
rejects(()=>validateProvider(auth,wrongOwner,ledger),"PROVIDER_DATABASE_METADATA_MISMATCH");
const productionEndpoint=copy(provider);productionEndpoint.endpoints[0].branch_id=REHEARSAL.deniedBranches[0];
rejects(()=>validateProvider(auth,productionEndpoint,ledger),"PROVIDER_COMPUTE_MISMATCH");
const target={...connectionTarget(url("b1","operator"),"b1","operator"),suite:"b1"};
const runtimeTarget=connectionTarget(url("b1","runtime"),"b1","runtime");
assertConnectionPair(target,runtimeTarget);checks++;
rejects(()=>assertConnectionPair(target,{...runtimeTarget,directHost:"ep-other.ap-southeast-1.aws.neon.tech"}),"OPERATOR_RUNTIME_ENDPOINT_MISMATCH");
rejects(()=>assertConnectionPair(target,connectionTarget(url("b2","runtime"),"b2","runtime")),"OPERATOR_RUNTIME_ENDPOINT_MISMATCH");
const facts={database:target.database,current_user:target.login,session_user:target.login,owner:target.login,version:170011,ssl:true,readonly:"on"};
assertSqlIdentity(facts,target);checks++;
rejects(()=>assertSqlIdentity({...facts,database:"pyramid_design"},target),"AUTHENTICATED_PRODUCTION_DATABASE_DENIED");
rejects(()=>assertSqlIdentity({...facts,current_user:"pyramid_owner"},target),"AUTHENTICATED_TARGET_MISMATCH");
rejects(()=>assertSqlIdentity({...facts,ssl:false},target),"AUTHENTICATED_TRANSPORT_MISMATCH");
rejects(()=>assertSqlIdentity({...facts,readonly:"off"},target),"AUTHENTICATED_TRANSPORT_MISMATCH");
rejects(()=>assertSqlIdentity({...facts,version:160001},target),"AUTHENTICATED_TRANSPORT_MISMATCH");
const zeroClient={query:async sql=>({rows:[sql.includes("AS schemas") ? Object.fromEntries(["schemas","extensions","event_triggers","foreign_servers","foreign_wrappers","publications","subscriptions","large_objects","default_acls","languages","transforms","user_casts","migration_ledgers"].map(k=>[k,"0"])):{n:"0"}]})};
const empty=await emptyDatabaseFacts(zeroClient);assertEmptyDatabase(empty);checks++;
for (const key of Object.keys(empty)) rejects(()=>assertEmptyDatabase({...empty,[key]:1}),"DATABASE_NOT_MIGRATION_EMPTY");
rejects(()=>assertEmptyDatabase({}),"DATABASE_NOT_MIGRATION_EMPTY");
const roles = Object.entries({anon:[false,false],authenticated:[false,false],pyramid_runtime:[false,true],pyramid_reference_locker:[false,true],
  [publics[0]]:[false,true],[target.login]:[true,true],[REHEARSAL.suites.b1.runtime]:[true,true],pyramid_owner:[true,true],neon_superuser:[false,true]})
  .map(([rolname,[rolcanlogin,rolinherit]])=>({rolname,rolcanlogin,rolinherit,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false,rolconfig:null}));
const membership=(role,member,inherit)=>({role,member,admin_option:false,inherit_option:inherit,set_option:true});
const roleFixture={roles,memberships:[membership("pyramid_reference_locker",target.login,true),
  ...["anon","authenticated",publics[0]].map(r=>membership(r,target.login,false)),membership("pyramid_runtime",REHEARSAL.suites.b1.runtime,true)],
ownership:[{role:"pyramid_reference_locker",n:1},{role:target.login,n:2}],databases:[{database:target.database,owner:target.login}]};
check(assertRolePrerequisites(roleFixture,"b1",publics[0],"current"),["pyramid_owner","neon_superuser"]);
rejects(()=>assertRolePrerequisites(roleFixture,"b1",publics[0],"empty"),"PREMATURE_RUNTIME_ROLE_DENIED");
const emptyRoles=copy(roleFixture);emptyRoles.roles=emptyRoles.roles.filter(role=>role.rolname!==REHEARSAL.suites.b1.runtime);
emptyRoles.memberships=emptyRoles.memberships.filter(m=>m.member!==REHEARSAL.suites.b1.runtime);emptyRoles.ownership=emptyRoles.ownership.filter(o=>o.role!=="pyramid_reference_locker");
check(assertRolePrerequisites(emptyRoles,"b1",publics[0],"empty"),["pyramid_owner","neon_superuser"]);
const finalRoles=copy(roleFixture);finalRoles.memberships=finalRoles.memberships.filter(m=>m.member!==target.login||m.role==="pyramid_reference_locker");
check(assertRolePrerequisites(finalRoles,"b1",publics[0],"final"),["pyramid_owner","neon_superuser"]);
rejects(()=>assertRolePrerequisites(roleFixture,"b1",publics[0],"final"),"ROLE_MEMBERSHIPS_MISMATCH");
for(const flag of ["rolsuper","rolcreatedb","rolcreaterole","rolreplication","rolbypassrls"]){const bad=copy(roleFixture);bad.roles.find(r=>r.rolname===REHEARSAL.suites.b1.runtime)[flag]=true;rejects(()=>assertRolePrerequisites(bad,"b1",publics[0],"current"),"ROLE_ATTRIBUTES_MISMATCH");}
const badMembership=copy(roleFixture);badMembership.memberships.push(membership("neon_superuser",REHEARSAL.suites.b1.runtime,true));
rejects(()=>assertRolePrerequisites(badMembership,"b1",publics[0],"current"),"ROLE_MEMBERSHIPS_MISMATCH");
const owned=copy(roleFixture);owned.ownership.push({role:REHEARSAL.suites.b1.runtime,n:1});
rejects(()=>assertRolePrerequisites(owned,"b1",publics[0],"current"),"ROLE_OWNERSHIP_MISMATCH");
validateLedger(ledger,auth.runId,auth.branchId);checks++;
check(cleanupPlan(ledger,auth.runId,auth.branchId).branchId,auth.branchId);
const partial=copy(ledger);partial.resources=partial.resources.filter(r=>r.kind==="branch");
check(cleanupPlan(partial,auth.runId,auth.branchId).branchId,auth.branchId);
rejects(()=>validateLedger(ledger,randomUUID(),auth.branchId),"CLEANUP_RUN_MISMATCH");
rejects(()=>validateLedger(ledger,auth.runId,REHEARSAL.deniedBranches[0]),"CLEANUP_BRANCH_DENIED");
const foreign=copy(ledger);foreign.resources.push(resource("database","pyramid_design","sql-create-template0"));
rejects(()=>validateLedger(foreign,auth.runId,auth.branchId),"CLEANUP_UNRECORDED_TARGET");
const noReceipt=copy(ledger);noReceipt.resources=noReceipt.resources.filter(r=>r.kind!=="branch");
rejects(()=>cleanupPlan(noReceipt,auth.runId,auth.branchId),"CLEANUP_CREATION_RECEIPTS_REQUIRED");
const secretReceipt=copy(ledger);secretReceipt.resources[0].password="synthetic-password-canary";
rejects(()=>validateLedger(secretReceipt,auth.runId,auth.branchId),"CLEANUP_RECEIPT_SHAPE");
const earlier=copy(ledger);earlier.resources[0].createdAt="2026-09-01T00:00:00Z";
rejects(()=>validateLedger(earlier,auth.runId,auth.branchId),"CLEANUP_RECEIPT_REQUIRED");
const childEnv=childEnvironment({...env,NODE_OPTIONS:"unsafe",PGHOST:"production",RESEND_API_KEY:"synthetic-token-canary",DATABASE_URL:url("b1","operator"),DIRECT_URL:url("b1","operator")});
check(Object.keys(childEnv).sort(),["DIRECT_URL","NODE_ENV","PUBLIC_INTAKE_MODE"]);
const evidence=safeEvidence({auth,operator:target},{operation:"b1-suite",status:"FAIL",exitCode:1,assertions:0,
  log:url("b1","operator"),password:"synthetic-password-canary",token:"synthetic-token-canary"});
check(!JSON.stringify(evidence).includes("canary") && !JSON.stringify(evidence).includes("postgresql:") && !JSON.stringify(evidence).includes(host));
const noisy=await runChild(["-e","process.stderr.write('synthetic-password-canary');process.stdout.write('synthetic-token-canary');process.exit(1)"],childEnvironment(process.env),"");
check(noisy,{status:"FAIL",exitCode:1,assertions:0});
const reviewed=JSON.parse(await readFile("scripts/neon-rehearsal-mutation-manifest.json","utf8"));
check(await mutationManifest(),reviewed);
check(reviewed.operations.filter(o=>o.targetType==="migration").length,22);
check(new Set(reviewed.operations.map(o=>o.id)).size,reviewed.operations.length);
check(reviewed.operations.every(o=>o.prerequisite && o.cleanupIdentifierRequirement && o.productionImpact && o.reversibility));
check(reviewed.disposableBranchId,null);
const operationIndex=id=>reviewed.operations.findIndex(operation=>operation.id===id);
check(operationIndex("b2-runtime-membership")<operationIndex("b1-seed"));
check(operationIndex("b2-probes")<operationIndex("b1-test-revoke"));
// The dry run must perform no API/SQL work, including with inherited canaries.
const transport=globalThis.fetch;let calls=0;
try{globalThis.fetch=async()=>{calls++;throw new Error("Unexpected request");};await main(["--dry-run"],{});check(calls,0);}finally{globalThis.fetch=transport;}
// Live metadata adapter: authenticate only native GET URLs; refusal cannot
// authorize SQL, and redirect/auth/network failures are fixed-code failures.
const apiEnv={...env,P3_NEON_API_KEY:"synthetic-token-canary"};let requests=[];
try {
  globalThis.fetch=async (input,options)=>{requests.push({input,method:options.method,redirect:options.redirect});return {ok:true,json:async()=>
    input.endsWith("/endpoints")?{endpoints:provider.endpoints}:input.endsWith("/databases")?{databases:provider.databases}:{branch:provider.branch}};};
  check((await providerPreflight(apiEnv,auth,ledger)).endpoint.id,"ep-offline-fixture");
  check(requests.length,3);check(requests.every(r=>r.method==="GET"&&r.redirect==="error"&&r.input.startsWith("https://console.neon.tech/api/v2/")));
  check((await cleanupMetadata(apiEnv,auth,partial)).id,auth.branchId);
  globalThis.fetch=async()=>{throw new Error(url("b1","operator"));};
  await assert.rejects(()=>providerPreflight(apiEnv,auth,ledger),{message:"PROVIDER_METADATA_UNAVAILABLE"});checks++;
} finally {globalThis.fetch=transport;}
for (const [bad,code] of [[{...env,P3_BRANCH_ID:REHEARSAL.deniedBranches[0]},"PRODUCTION_BRANCH_DENIED"],
  [{...env,P3_BRANCH_ID:""},"BLOCKED_DISPOSABLE_BRANCH_REQUIRED"],[{...env,P3_REHEARSAL_AUTHORIZATION:""},"REHEARSAL_AUTHORIZATION_REQUIRED"]]) {
  await assert.rejects(()=>main(["--migrate"],bad),{message:code});checks++;
}
await assert.rejects(()=>main(["--migrate","--force"],env),{message:"COMMAND_DENIED"});checks++;
// Defaults still refuse arbitrary remote endpoints BEFORE DB access.
for(const script of ["verify-phase-b1-permissions.mjs","verify-phase-b2-workflows.mjs"]){
  const result=spawnSync(process.execPath,["--conditions=react-server","--experimental-strip-types",`scripts/${script}`],
    {env:childEnvironment(process.env,{DATABASE_URL:url("b1","runtime"),B1_TEST_OWNER_URL:url("b1","operator")}),encoding:"utf8",timeout:5000,windowsHide:true});
  check(result.status!==0);check(!result.stdout.includes("_OK"));
  const guarded=spawnSync(process.execPath,["--conditions=react-server","--experimental-strip-types",`scripts/${script}`,"--neon-disposable"],
    {env:childEnvironment(process.env,{DATABASE_URL:"postgresql://synthetic-password-canary@[",B1_TEST_OWNER_URL:url("b1","operator")}),encoding:"utf8",timeout:5000,windowsHide:true});
  check(guarded.status,1);check(!(guarded.stdout+guarded.stderr).includes("synthetic-password-canary"));
}

if(process.argv.includes("--local")) {
  assert(!existsSync(".env")&&!existsSync(".env.local"));
  const local=new URL(process.env.P3_LOCAL_ADMIN_URL??"invalid:");
  assert.equal(local.hostname,"127.0.0.1");assert.equal(local.port,"55442");assert.equal(local.pathname,"/postgres");
  const admin=new pg.Client({connectionString:local.href});await admin.connect();
  const suffix=randomBytes(6).toString("hex"),database=`phase2ib_b1r1_b2_p3a_empty_${suffix}`,owner=`p3a_empty_owner_${suffix}`;
  try {
    check(Number((await admin.query("SHOW server_version_num")).rows[0].server_version_num)>=170000);
    await admin.query(`CREATE ROLE ${owner} LOGIN PASSWORD 'synthetic-p3a-local-only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
    await admin.query(`CREATE DATABASE ${database} OWNER ${owner} TEMPLATE template0`);
    const ownerUrl=new URL(local);ownerUrl.username=owner;ownerUrl.password="synthetic-p3a-local-only";ownerUrl.pathname="/"+database;
    const client=new pg.Client({connectionString:ownerUrl.href});await client.connect();
    try {
      await client.query("BEGIN READ ONLY");assertEmptyDatabase(await emptyDatabaseFacts(client));checks++;await client.query("ROLLBACK");
      // Temporary namespaces can survive rollback; run that case last so it
      // cannot mask the object-specific rejection checks that precede it.
      for(const sql of ["CREATE TABLE public.unexpected(id int)","CREATE TABLE public._prisma_migrations(id int)",
        "CREATE SCHEMA pyramid_private","CREATE FUNCTION public.unexpected() RETURNS int LANGUAGE sql AS 'SELECT 1'",
        "CREATE TYPE public.unexpected AS ENUM ('x')","ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO PUBLIC",
        "SELECT lo_create(0)","CREATE TEMP TABLE unexpected(id int)"]){
        await client.query("BEGIN");await client.query(sql);
        const awaitedFacts=await emptyDatabaseFacts(client);
        rejects(()=>assertEmptyDatabase(awaitedFacts),"DATABASE_NOT_MIGRATION_EMPTY");
        await client.query("ROLLBACK");
      }
    } finally {await client.query("ROLLBACK").catch(()=>{});await client.end();}
    const runtime=`p3a_pool_runtime_${suffix}`;
    await admin.query(`CREATE ROLE ${runtime} LOGIN INHERIT PASSWORD 'synthetic-p3a-pool-only' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
    const runtimeUrl=new URL(local);runtimeUrl.username=runtime;runtimeUrl.password="synthetic-p3a-pool-only";runtimeUrl.pathname="/"+database;
    checks+=await pooledVerification({auth:{runId:randomUUID()},runtime:{url:runtimeUrl,login:runtime,database}});
  }finally{await admin.end();}
}
console.log(`P3A_NEON_HARNESS_OFFLINE_OK checks=${checks} live_provider_calls=0 remote_connections=0 mutations=local-only-if-explicit`);
