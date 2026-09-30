import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';

assert.equal(Number(process.versions.node.split('.')[0]),22);
assert(!existsSync('.env.local') && !existsSync('.env'));
const adminUrl=new URL(process.env.B2_DISPOSABLE_ADMIN_URL ?? 'invalid:');
assert.equal(adminUrl.hostname,'127.0.0.1'); assert.equal(adminUrl.port,'55442'); assert.equal(adminUrl.pathname,'/postgres');
const output=process.env.B2_EVIDENCE_DIRECTORY; assert(output);
await mkdir(output,{recursive:true});
const secrets=[];
const env={...process.env,NODE_ENV:'test',PUBLIC_INTAKE_MODE:'synthetic'};
for(const key of Object.keys(env)) if(/^(GOOGLE_|RESEND_|TURNSTILE_|NEXT_PUBLIC_SUPABASE_|SUPABASE_|CRON_SECRET|EMAIL_PROVIDER|B[12]_DISPOSABLE_ADMIN_URL|DATABASE_URL|DIRECT_URL|B1_TEST_OWNER_URL|PHASE2IB_TEST_DATABASE_URL)/.test(key)) delete env[key];
function safe(log){ for(const secret of secrets) log=log.replaceAll(secret,'[disposable credential]'); return log.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/g,'[disposable DB URL]'); }
async function run(name,args,identity={},accepted=[0]){
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...env,...identity},windowsHide:true});let log='';
    child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
    child.on('error',reject);child.on('close',code=>resolve({code,log:safe(log)}));
  });
  await writeFile(`${output}/${name}.log`,result.log);
  console.log(`${name} exit=${result.code} ${result.log.split(/\r?\n/).filter(l=>/(?:_OK|checks=|No difference|vulnerabilities)/.test(l)).join(' | ')}`);
  if(!accepted.includes(result.code)){console.error(result.log.slice(-5000));throw new Error(`${name} failed`);}
  return result;
}
const args=file=>['--conditions=react-server','--experimental-strip-types',`scripts/${file}`];
const admin=new pg.Client({connectionString:adminUrl.href});await admin.connect();
try{
  assert((await admin.query('SELECT version() AS v')).rows[0].v.startsWith('PostgreSQL 17'));
  for(const role of ['anon','authenticated','pyramid_runtime','pyramid_reference_locker']){
    if(!(await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount)
      await admin.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
  }
  async function fresh(label,deploy=false){
    const suffix=randomBytes(6).toString('hex'),database=`phase2ib_b1r1_b2_${label}_${suffix}`;
    const owner=`b2_owner_${suffix}`,runtime=`b2_runtime_${suffix}`,publicRole=`b1_public_${suffix}`;
    const passwords=[randomBytes(32).toString('hex'),randomBytes(32).toString('hex')];secrets.push(...passwords);
    for(const [index,role] of [owner,runtime].entries())await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${passwords[index]}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
    await admin.query(`GRANT pyramid_reference_locker TO ${owner} WITH INHERIT TRUE, SET TRUE`);
    await admin.query(`GRANT pyramid_runtime TO ${runtime}`);
    await admin.query(`CREATE ROLE ${publicRole} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
    await admin.query(`GRANT anon,authenticated,${publicRole} TO ${owner} WITH INHERIT FALSE, SET TRUE`);
    await admin.query(`CREATE DATABASE ${database} OWNER ${owner}`);
    const urls=[owner,runtime].map((role,i)=>{const u=new URL(adminUrl.href);u.username=role;u.password=passwords[i];u.pathname=`/${database}`;return u.href;});
    const identity={DATABASE_URL:urls[0],DIRECT_URL:urls[0],PHASE2IB_TEST_DATABASE_URL:urls[0]};
    const restricted={DATABASE_URL:urls[1],DIRECT_URL:'',PHASE2IB_TEST_DATABASE_URL:urls[1],B1_TEST_OWNER_URL:urls[0],B1_TEST_PUBLIC_ROLE:publicRole};
    await run(`${label}-replay`,deploy?['node_modules/prisma/build/index.js','migrate','deploy']:['scripts/replay-phase-2ib-migrations.mjs'],identity);
    await writeFile(`${output}/${label}-identity.json`,JSON.stringify({database,owner,runtime,publicRole,port:55442}));
    return {identity,restricted};
  }
  const mode=process.argv[2] ?? 'foundation';
  if(mode==='foundation'){
    const f=await fresh('foundation');
    await run('prisma-validate',['node_modules/prisma/build/index.js','validate'],f.identity);
    await run('migration-status',['node_modules/prisma/build/index.js','migrate','status'],f.identity);
    await run('schema-drift',['node_modules/prisma/build/index.js','migrate','diff','--from-url',f.identity.DIRECT_URL,'--to-schema-datamodel','prisma/schema.prisma','--exit-code'],f.identity);
  }else if(mode==='permissions'){
    const f=await fresh('permissions',true);
    await run('permissions-seed',args('seed-phase-2c-synthetic.mjs'),f.identity);
    await run('b1-permissions',args('verify-phase-b1-permissions.mjs'),f.restricted);
    const b2=await fresh('b2',true);
    await run('b2-seed',args('seed-phase-2c-synthetic.mjs'),b2.identity);
    await run('b2-workflows',args('verify-phase-b2-workflows.mjs'),b2.restricted);
    await run('permissions-status',['node_modules/prisma/build/index.js','migrate','status'],b2.identity);
    await run('permissions-drift',['node_modules/prisma/build/index.js','migrate','diff','--from-url',b2.identity.DIRECT_URL,'--to-schema-datamodel','prisma/schema.prisma','--exit-code'],b2.identity);
  }else if(mode==='regression'){
    for(const [label,file] of [['2b','verify-phase-2b-domain.mjs'],['2c','verify-phase-2c-authorization.mjs'],['2d','verify-phase-2d-staff-reads.mjs'],['2e','verify-phase-2e-staff-portal.mjs'],['2f','verify-phase-2f-staff-mutations.mjs'],['2g','verify-phase-2g-public-intake.mjs'],['2h','verify-phase-2h-candidate-files.mjs'],['2ib','verify-phase-2ib-worker.mjs'],['2ic1','verify-phase-2ic1-notifications.mjs'],['2ic2b','verify-phase-2ic2b-resend.mjs'],['2id','verify-phase-2id-abuse.mjs'],['2ie','verify-phase-2ie-challenge.mjs']]){
      const f=await fresh(label);
      if(label==='2g')await run('2g-seed',args('seed-phase-2c-synthetic.mjs'),f.identity);
      await run(label,args(file),f.identity);
    }
  }else if(mode==='browser'){
    const f=await fresh('browser',true);
    await run('browser-seed',args('seed-phase-2c-synthetic.mjs'),f.identity);
    const auth={NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3333',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-browser-public-key'};
    await run('browser-build',['node_modules/next/dist/bin/next','build','--webpack'],{DATABASE_URL:'',DIRECT_URL:'',NODE_ENV:'production',PUBLIC_INTAKE_MODE:'',...auth});
    await run('browser',args('verify-phase-b2-browser.mjs'),{...f.restricted,...auth,B2_EVIDENCE_DIRECTORY:output});
  }else if(mode==='quality'){
    const synthetic={DATABASE_URL:'postgresql://synthetic@127.0.0.1:1/phase2ib_schema_only',DIRECT_URL:'postgresql://synthetic@127.0.0.1:1/phase2ib_schema_only'};
    await run('lint',['node_modules/eslint/bin/eslint.js','src'],synthetic);
    await run('typecheck',['node_modules/typescript/bin/tsc','--noEmit'],synthetic);
    await run('build',['node_modules/next/dist/bin/next','build','--webpack'],{DATABASE_URL:'',DIRECT_URL:'',NODE_ENV:'production',PUBLIC_INTAKE_MODE:''});
    await run('post-build-typecheck',['node_modules/typescript/bin/tsc','--noEmit'],synthetic);
    const f=await fresh('smoke');await mkdir('tmp',{recursive:true});
    await run('production-smoke',['scripts/verify-phase-2ib-production-smoke.cjs'],{...f.restricted,B1_TEST_OWNER_URL:''});
  }else throw new Error('Unknown mode');
  console.log(`B2_DISPOSABLE_${mode.toUpperCase()}_OK`);
}finally{await admin.end();}
