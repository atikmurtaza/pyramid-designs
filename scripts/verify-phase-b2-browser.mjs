import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import pg from 'pg';
import { phase2BFixtures as f } from './seed-phase-2b-synthetic.mjs';
import { phase2CFixtures as s } from './seed-phase-2c-synthetic.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.B2_PLAYWRIGHT_MODULE || 'C:/Users/atikm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://127.0.0.1:3210',authOrigin='http://127.0.0.1:3333',output=process.env.B2_EVIDENCE_DIRECTORY;
assert(output);assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,authOrigin);
for(const key of ['DATABASE_URL','B1_TEST_OWNER_URL']){const u=new URL(process.env[key]);assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55442');assert(u.pathname.startsWith('/phase2ib_b1r1_b2_browser_'));}
assert.notEqual(new URL(process.env.DATABASE_URL).username,new URL(process.env.B1_TEST_OWNER_URL).username);
const owner=new pg.Client({connectionString:process.env.B1_TEST_OWNER_URL});await owner.connect();
const db=await import('../src/lib/server/database.ts'),intake=await import('../src/lib/server/public-intake.ts');
const session=await import('../src/lib/server/auth/session.ts'),mutations=await import('../src/lib/server/staff-mutations.ts');
const admin=await session.resolveAuthenticatedStaff(async()=>({subjectId:'synthetic-supabase-subject-admin',assuranceLevel:'aal2'}));
const mutate=(type,extra)=>mutations.performStaffMutation({type,idempotencyKey:randomUUID(),...extra},{resolvePrincipal:async()=>admin});
const fields=new URLSearchParams({applicationType:'JOB_APPLICATION',jobId:f.jobId,[`answer.${f.jobQuestionId}`]:f.jobQuestionOptionId,
  fullName:'Synthetic Browser Candidate',email:'synthetic.browser@example.invalid',city:'Synthetic City',experienceLevel:'SYNTHETIC_LEVEL',consentDefinitionId:f.consentDefinitionId,consent:'accepted',idempotencyKey:randomUUID()});
const application=await db.transaction(e=>intake.submitIntake(fields,e));
await mutate('application.note.create',{applicationId:application.id,body:'Synthetic browser review note'});
for(let i=0;i<22;i++)await mutate('application.note.create',{applicationId:application.id,body:`Synthetic pagination note ${i}`});
const project=(await mutate('content.create',{slug:`synthetic-browser-${randomUUID()}`,title:'Synthetic Browser Project',summary:'Synthetic browser summary'})).targetId;
const classificationIds=[randomUUID(),randomUUID()];
await owner.query(`INSERT INTO public."Discipline" ("id","slug","name") VALUES ($1,'synthetic-browser','Synthetic Design')`,[classificationIds[0]]);
await owner.query(`INSERT INTO public."Sector" ("id","slug","name") VALUES ($1,'synthetic-browser','Synthetic Sector')`,[classificationIds[1]]);
const media=randomUUID();await owner.query(`INSERT INTO public."ProjectMedia" ("id","projectId","mediaType","publicDeliveryPath","altText","updatedAt") VALUES ($1,$2,'IMAGE','/media/projects/synthetic.png','Synthetic image',CURRENT_TIMESTAMP)`,[media,project]);
const jobFields={title:'Synthetic Browser Role',summary:'Synthetic role summary',departmentId:f.departmentId,jobLocationId:f.jobLocationId,workArrangement:'Remote',employmentType:'Full time',experienceLevel:'Experienced',shiftSchedule:'Daytime',compensationMode:'HIDDEN',compensationMinMinor:null,compensationMaxMinor:null,compensationCurrency:'',compensationPeriod:'',compensationText:'',responsibilities:['Synthetic work'],requiredQualifications:['Synthetic skill'],preferredQualifications:[],hiringProcessCopy:['Synthetic process'],applicationDeadline:null};
const job=(await mutate('job.create',{slug:`synthetic-browser-${randomUUID()}`,fields:jobFields})).targetId;
await mutate('job.question.save',{jobId:job,expectedVersion:1,questionId:null,questionType:'SELECT',prompt:'Synthetic preferred option',required:true,active:true,options:['Synthetic A','Synthetic B']});
// A synthetic quarantine fixture, never connected to a live storage provider.
const pending=randomUUID(),file=randomUUID();
await owner.query(`INSERT INTO public."Application" ("id","publicReference","applicationType","departmentId","engagementType","fullName","email","city","experienceLevel","source","retentionPolicyId","expiresAt","updatedAt","requiresClearedFile") VALUES ($1,$2,'TALENT_NETWORK',$3,'PERMANENT_INTEREST','Synthetic Pending','synthetic.pending@example.invalid','Synthetic City','SYNTHETIC_LEVEL','SYNTHETIC_TEST',$4,CURRENT_TIMESTAMP+interval '30 days',CURRENT_TIMESTAMP,true)`,[pending,`PD-${randomUUID().replaceAll('-','').slice(0,16).toUpperCase()}`,f.departmentId,f.retentionPolicyId]);
await owner.query(`INSERT INTO public."CandidateConsent" ("id","applicationId","consentDefinitionId","decision","source","requestId") VALUES ($1,$2,$3,'ACCEPTED','TALENT_FORM','synthetic-browser')`,[randomUUID(),pending,f.consentDefinitionId]);
await owner.query(`INSERT INTO public."CandidateFile" ("id","applicationId","driveFileId","storedFilename","extension","declaredMime","detectedMime","sizeBytes","contentHash","validationStatus","technicalStatus","updatedAt") VALUES ($1,$2,'syntheticBrowserDrive',$3,'pdf','application/pdf','application/pdf',100,$4,'PASSED','QUARANTINED',CURRENT_TIMESTAMP)`,[file,pending,`${randomUUID()}.pdf`,'a'.repeat(64)]);
await owner.query(`UPDATE public."Application" SET "technicalStatus"='SECURITY_PENDING' WHERE "id"=$1`,[pending]);
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'synthetic-b2',alg:'RS256',use:'sig'};
let jwksRequests=0,unexpectedAuth=0,externalRequests=0,checks=0;const matrix=[];
const check=(actual,expected=true)=>{assert.deepEqual(actual,expected);checks++;};
const issuer=createServer((req,res)=>{if(req.url==='/auth/v1/.well-known/jwks.json'){jwksRequests++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({keys:[jwk]}));}else{unexpectedAuth++;res.writeHead(404);res.end('{}');}});
await new Promise(resolve=>issuer.listen(3333,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3210'],{windowsHide:true,env:{...process.env,NODE_ENV:'production',PUBLIC_INTAKE_MODE:''}});
let appLog='';app.stdout.on('data',d=>appLog+=d);app.stderr.on('data',d=>appLog+=d);
function cookie(subject,aal='aal2',invalid=false){const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const body=enc({alg:'RS256',typ:'JWT',kid:'synthetic-b2'})+'.'+enc({sub:subject,aal,aud:'authenticated',role:'authenticated',iss:authOrigin+'/auth/v1',iat:now,exp:now+3600});const jwt=body+'.'+(invalid?'invalid':sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url'));return 'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'synthetic-local-only',token_type:'bearer',expires_in:3600,expires_at:now+3600,user:{id:subject,app_metadata:{},user_metadata:{},aud:'authenticated'}})).toString('base64url');}
let browser;
try{
  for(let i=0;i<120;i++){try{if((await fetch(origin+'/careers')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));if(i===119)throw Error('Local app did not start');}
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;if(!['127.0.0.1','localhost'].includes(host)){externalRequests++;return route.abort();}return route.continue();});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function identity(subject='synthetic-supabase-subject-admin',aal='aal2',invalid=false){await context.clearCookies();await context.addCookies([{name:'sb-127-auth-token',value:cookie(subject,aal,invalid),url:origin,httpOnly:true,sameSite:'Lax'}]);}
  await identity();
  const routes=['/staff/content',`/staff/content/${project}`,'/staff/jobs',`/staff/jobs/${job}`,'/staff/applications',`/staff/applications/${application.id}`,`/staff/applications/${pending}`,'/staff/audit','/careers','/work'];
  for(const width of [320,390,768,1280,1440])for(const route of routes){
    await page.setViewportSize({width,height:900});const response=await page.goto(origin+route,{waitUntil:'networkidle'});check(response.status(),200);
    check(await page.locator('h1').count(),1);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
    check(await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(elements=>elements.every(el=>el.labels?.length>0)));
    check(await page.locator('.staff-confirmation input').evaluateAll(elements=>elements.every(el=>el.getBoundingClientRect().width<=24&&el.parentElement.querySelector('span').getBoundingClientRect().width>=100)));
    if(route.startsWith('/staff'))check(response.headers()['cache-control'].includes('no-store'));
    await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement!==document.body));
    check(await page.evaluate(()=>{const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}));
    matrix.push({width,route,overflow:false,labels:true,keyboardFocus:true});
    if(width===390 && [`/staff/content/${project}`,`/staff/jobs/${job}`,`/staff/applications/${pending}`,'/careers'].includes(route))await page.screenshot({path:`${output}/browser-${route.split('/').at(-1)}-390.png`,fullPage:true});
    if(width===390 && route===`/staff/applications/${pending}`)await page.locator('.staff-confirmation').first().screenshot({path:`${output}/browser-confirmation-390.png`});
  }
  await page.goto(origin+`/staff/applications/${application.id}`);await page.getByLabel('New internal note').fill('<script>synthetic browser escaped</script>');
  await Promise.all([page.waitForURL('**mutation=applied'),page.getByRole('button',{name:'Append note'}).click()]);check(await page.getByText('<script>synthetic browser escaped</script>',{exact:true}).count(),1);check(await page.locator('script').evaluateAll(es=>!es.some(e=>e.textContent==='synthetic browser escaped')));
  // Unknown and duplicate browser fields are rejected by the actual server action.
  for(const duplicate of [false,true]){
    await page.goto(origin+`/staff/applications/${application.id}`);await page.getByLabel('New internal note').fill('Synthetic rejected input');
    await page.locator('form').filter({has:page.locator('textarea[name=body]')}).evaluate((form,duplicate)=>{const input=document.createElement('input');input.type='hidden';input.name=duplicate?'body':'unknown';input.value='Synthetic invalid';form.append(input);},duplicate);
    await Promise.all([page.waitForURL('**mutation=validation_failed'),page.getByRole('button',{name:'Append note'}).click()]);check(await page.getByText('Synthetic rejected input',{exact:true}).count(),0);
  }
  await page.goto(origin+`/staff/applications/${application.id}`);
  const noteForm=page.locator('form').filter({has:page.locator('textarea[name=body]')});
  const csrfForm=await noteForm.evaluate(form=>Object.fromEntries(new FormData(form)));
  csrfForm.body='Synthetic cross-origin denied';
  const beforeCsrf=(await owner.query('SELECT count(*)::int AS n FROM public."InternalNote" WHERE "applicationId"=$1',[application.id])).rows[0].n;
  await context.request.post(origin+`/staff/applications/${application.id}`,{form:csrfForm,headers:{Origin:'https://example.invalid'},maxRedirects:0});
  check((await owner.query('SELECT count(*)::int AS n FROM public."InternalNote" WHERE "applicationId"=$1',[application.id])).rows[0].n,beforeCsrf);
  await page.goto(origin+`/staff/content/${project}`);
  await page.getByLabel('Brief',{exact:true}).fill('Synthetic brief');for(const name of ['Challenge','Approach','Outcome'])await page.getByLabel(name,{exact:true}).fill(`Synthetic ${name}`);
  await page.getByLabel(/Disciplines/).selectOption(classificationIds[0]);await page.getByLabel(/Sectors/).selectOption(classificationIds[1]);
  await Promise.all([page.waitForURL('**mutation=applied'),page.getByRole('button',{name:'Save draft and relationships'}).click()]);check(await page.locator('p').getByText('Synthetic brief',{exact:true}).count(),1);
  const publicationForm=page.locator('form').filter({has:page.getByRole('button',{name:'Publish project',exact:true})});await publicationForm.getByRole('checkbox').check();
  await Promise.all([page.waitForURL('**mutation=unavailable'),publicationForm.getByRole('button',{name:'Publish project',exact:true}).click()]);
  await page.goto(origin+`/staff/jobs/${job}`);const questionForm=page.locator('form').filter({has:page.getByRole('heading',{name:'Add question',exact:true})});await questionForm.getByLabel('Question prompt').fill('Synthetic browser added question');
  await Promise.all([page.waitForURL('**mutation=applied'),questionForm.getByRole('button',{name:'Save question'}).click()]);check(await page.getByText('Synthetic browser added question',{exact:true}).count()>0);
  await page.goto(origin+`/staff/applications/${pending}`);
  let initiate=page.locator('form').filter({has:page.getByRole('button',{name:'Start manual review'})});
  check(await initiate.evaluate(form=>!form.checkValidity()));
  await initiate.locator('input[name=applicationId]').evaluate((el,id)=>el.value=id,application.id);await initiate.getByRole('checkbox').check();
  await Promise.all([page.waitForURL('**mutation=unavailable'),initiate.getByRole('button').click()]);
  check((await owner.query('SELECT "securityStatus" FROM public."CandidateFile" WHERE "id"=$1',[file])).rows[0].securityStatus,'UNREVIEWED');
  await page.goto(origin+`/staff/applications/${pending}`);initiate=page.locator('form').filter({has:page.getByRole('button',{name:'Start manual review'})});await initiate.getByRole('checkbox').check();
  await Promise.all([page.waitForURL('**mutation=applied'),initiate.getByRole('button').click()]);check(await page.getByRole('link',{name:'Retrieve quarantined PDF attachment'}).count(),1);
  const attest=page.locator('form').filter({has:page.getByRole('button',{name:'Record reviewer attestation'})});await attest.getByLabel('Observed file SHA-256').fill('b'.repeat(64));await attest.getByLabel('Scan start time, ISO UTC').fill(new Date().toISOString());await attest.getByLabel('Microsoft Defender Antivirus version').fill('Synthetic-test-version');await attest.getByLabel('Observed outcome').selectOption('FAILED');await attest.getByRole('checkbox').check();
  await Promise.all([page.waitForURL('**mutation=unavailable'),attest.getByRole('button').click()]);check((await owner.query('SELECT "securityStatus" FROM public."CandidateFile" WHERE "id"=$1',[file])).rows[0].securityStatus,'IN_REVIEW');
  await page.getByLabel('Observed file SHA-256').fill('a'.repeat(64));await page.getByLabel('Scan start time, ISO UTC').fill(new Date().toISOString());await page.getByLabel('Microsoft Defender Antivirus version').fill('Synthetic-test-version');await page.getByLabel('Observed outcome').selectOption('FAILED');await page.locator('form').filter({has:page.getByRole('button',{name:'Record reviewer attestation'})}).getByRole('checkbox').check();
  await Promise.all([page.waitForURL('**mutation=applied'),page.getByRole('button',{name:'Record reviewer attestation'}).click()]);check((await owner.query('SELECT "securityStatus" FROM public."CandidateFile" WHERE "id"=$1',[file])).rows[0].securityStatus,'REVIEW_FAILED');
  await page.goto(origin+'/staff/audit');await page.getByLabel('Resource type').selectOption('APPLICATION');await page.getByLabel('Exact target ID, optional').fill(application.id);await page.getByRole('button',{name:'Apply filters'}).click();await page.waitForLoadState('networkidle');check(await page.locator('.staff-list__item').count()>0);await page.locator('.staff-list__item a').first().click();await page.getByText('Correlation ID',{exact:true}).waitFor();check(await page.getByText('Correlation ID',{exact:true}).count(),1);
  await page.goto(origin+'/staff/audit');await page.getByRole('link',{name:'Older events'}).click();await page.waitForLoadState('networkidle');check(new URL(page.url()).searchParams.has('before'));
  for(const subject of [s.subjects.auditor,s.subjects.contentEditor]) {
    await identity(subject);
    for(const id of [application.id,randomUUID()]) {
      const denied=await page.goto(origin+`/staff/applications/${id}`,{waitUntil:'networkidle'});
      // Next can stream notFound with HTTP 200; assert denial and full-response privacy.
      check([200,404].includes(denied.status()));
      check(await page.getByRole('heading',{name:'The requested staff record is unavailable'}).count(),1);
      check(!/Synthetic Browser Candidate|synthetic\.browser@example\.invalid/.test(await denied.text()));
      check(await page.getByLabel('New internal note').count(),0);
    }
  }
  await identity(s.subjects.auditor);await page.goto(origin+'/staff/audit');check(await page.locator('form[method=post]').count(),1);
  for(const [aal,invalid,status] of [['aal1',false,'mfa_required'],['aal2',true,'authentication_required']]) {
    await identity('synthetic-supabase-subject-admin',aal,invalid);
    try { await page.goto(origin+'/staff/jobs',{waitUntil:'domcontentloaded'}); }
    catch(error) { if(!error.message.includes('interrupted by another navigation')) throw error; }
    await page.waitForURL(url=>url.pathname==='/staff'&&url.searchParams.get('status')===status,{waitUntil:'networkidle'});
    check(await page.getByRole('heading',{name:'Create job draft'}).count(),0);
  }
  check(errors,[]);check(externalRequests,0);check(unexpectedAuth,0);check(jwksRequests>0);
  await writeFile(`${output}/browser-matrix.json`,JSON.stringify({checks,matrix,jwksRequests,externalRequests,syntheticOnly:true},null,2));
  console.log(`PHASE_B2_BROWSER_OK checks=${checks} viewports=5 pages=${matrix.length} auth=local-signed-jwks runtime=restricted live_provider_effects=0`);
}finally{
  await browser?.close();app.kill();await new Promise(resolve=>issuer.close(resolve));
  await writeFile(`${output}/browser-app.log`,appLog.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/g,'[disposable DB URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[JWT removed]'));
  await Promise.all([owner.end(),db.closeDatabasePool()]);
}
