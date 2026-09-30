import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import pg from 'pg';
import { phase2BFixtures as f } from './seed-phase-2b-synthetic.mjs';
import { phase2CFixtures as s } from './seed-phase-2c-synthetic.mjs';

assert(!existsSync('.env.local') && !existsSync('.env'));
assert.equal(Number(process.versions.node.split('.')[0]),22);
const runtimeUrl=new URL(process.env.DATABASE_URL),ownerUrl=new URL(process.env.B1_TEST_OWNER_URL);
for(const url of [runtimeUrl,ownerUrl]) {assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55442');assert(url.pathname.startsWith('/phase2ib_b1r1_b2_'));}
assert.equal(runtimeUrl.pathname,ownerUrl.pathname);assert.notEqual(runtimeUrl.username,ownerUrl.username);
const owner=new pg.Client({connectionString:ownerUrl.href}), runtime=new pg.Client({connectionString:runtimeUrl.href});
await Promise.all([owner.connect(),runtime.connect()]);
const db=await import('../src/lib/server/database.ts');
const session=await import('../src/lib/server/auth/session.ts');
const mutations=await import('../src/lib/server/staff-mutations.ts');
const reads=await import('../src/lib/server/staff-workflow-reads.ts');
const lists=await import('../src/lib/server/staff-reads.ts');
const publicReads=await import('../src/lib/server/public-content.ts');
const intake=await import('../src/lib/server/public-intake.ts');
const narrative=await import('../src/lib/server/narrative.ts');
let checks=0;
const check=(actual,expected=true)=>{assert.deepEqual(actual,expected);checks++;};
const rejects=async(work)=>{await assert.rejects(work);checks++;};
const actors={};
for(const [role,subject] of [['CONTENT_EDITOR',s.subjects.contentEditor],['HIRING_REVIEWER',s.subjects.reviewer],['HIRING_MANAGER',s.subjects.manager],['AUDITOR',s.subjects.auditor],['ADMIN','synthetic-supabase-subject-admin']])
  actors[role]=await session.resolveAuthenticatedStaff(async()=>({subjectId:subject,assuranceLevel:'aal2'}));
const mutate=(input,actor=actors.ADMIN)=>mutations.performStaffMutation(input,{resolvePrincipal:async()=>actor});
const request=(type,extra={})=>({type,idempotencyKey:randomUUID(),...extra});
const jobFields={title:'Synthetic B2 role',summary:'Synthetic verification only.',departmentId:f.departmentId,jobLocationId:f.jobLocationId,
  workArrangement:'SYNTHETIC_REMOTE',employmentType:'SYNTHETIC_FULL_TIME',experienceLevel:'SYNTHETIC_LEVEL',shiftSchedule:'Synthetic hours',
  compensationMode:'HIDDEN',compensationMinMinor:null,compensationMaxMinor:null,compensationCurrency:'',compensationPeriod:'',compensationText:'',
  responsibilities:['Synthetic responsibility'],requiredQualifications:['Synthetic qualification'],preferredQualifications:[],hiringProcessCopy:['Synthetic process'],applicationDeadline:null};
async function createJob(){return (await mutate(request('job.create',{slug:`synthetic-b2-${randomUUID()}`,fields:jobFields}),actors.HIRING_MANAGER)).targetId;}
const version=async(id,table)=> (await runtime.query(`SELECT "version" FROM public."${table}" WHERE "id"=$1`,[id])).rows[0].version;
const fields=()=>new URLSearchParams({applicationType:'JOB_APPLICATION',jobId:f.jobId,[`answer.${f.jobQuestionId}`]:f.jobQuestionOptionId,
  fullName:'Synthetic B2 Candidate',email:'synthetic.b2@example.invalid',city:'Synthetic City',experienceLevel:'SYNTHETIC_LEVEL',
  consentDefinitionId:f.consentDefinitionId,consent:'accepted',idempotencyKey:randomUUID()});
const application=()=>db.transaction(e=>intake.submitIntake(fields(),e));
async function denied(sql,values=[],code='42501'){
  await runtime.query('BEGIN');let error;
  try{await runtime.query(sql,values);}catch(e){error=e;}finally{await runtime.query('ROLLBACK');}
  check(error?.code,code);
}
try {
  const flags=(await runtime.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
  check(flags,{rolsuper:false,rolbypassrls:false});
  const app=await application(),otherApp=await application();
  const note=request('application.note.create',{applicationId:app.id,body:'Synthetic confidential note <script>never executable</script>'});
  check((await mutate(note,actors.HIRING_REVIEWER)).outcome,'APPLIED');
  check((await mutate(note,actors.HIRING_REVIEWER)).outcome,'ALREADY_APPLIED');
  await rejects(()=>mutate({...note,applicationId:otherApp.id},actors.HIRING_REVIEWER));
  const concurrent=await Promise.all(Array.from({length:8},(_,i)=>mutate(request('application.note.create',{applicationId:app.id,body:`Synthetic parallel note ${i}`}),actors.HIRING_REVIEWER)));
  check(concurrent.length,8);
  check((await runtime.query('SELECT count(*)::int AS n FROM public."InternalNote" WHERE "applicationId"=$1',[app.id])).rows[0].n,9);
  check((await reads.readApplicationWorkflow(actors.HIRING_REVIEWER,app.id)).notes.length,9);
  check((await reads.readApplicationWorkflow(actors.HIRING_REVIEWER,otherApp.id)).notes.length,0);
  check((await runtime.query(`SELECT count(*)::int AS n FROM public."AuditEvent" WHERE "actionCode"='APPLICATION_NOTE_CREATE' AND "targetId"=$1 AND "safeMetadata"::text LIKE '%confidential%'`,[app.id])).rows[0].n,0);
  check((await runtime.query(`SELECT count(*)::int AS n FROM public."AuditEvent" WHERE "actionCode"='APPLICATION_NOTE_CREATE' AND "targetId"=$1`,[app.id])).rows[0].n,9);
  for(const actor of [actors.CONTENT_EDITOR,actors.AUDITOR,{...actors.HIRING_REVIEWER,assuranceLevel:'aal1'},null]) {
    await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body:'Synthetic denied'}),actor));
    await rejects(()=>reads.readApplicationWorkflow(actor,app.id));
  }
  for(const body of ['', ' \n ', 'x'.repeat(2001)]) await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body})));
  for(const applicationId of ['invalid',randomUUID()]) await rejects(()=>mutate(request('application.note.create',{applicationId,body:'Synthetic denied'})));
  await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body:'Synthetic',authorStaffUserId:s.auditorStaffId})));
  await denied('UPDATE public."InternalNote" SET "body"=\'changed\'');
  await denied('DELETE FROM public."InternalNote"');
  await denied('INSERT INTO public."InternalNote" ("id","applicationId","authorStaffUserId","body") VALUES ($1,$2,$3,$4)',[randomUUID(),app.id,s.reviewerStaffId,'\n\t\r'],'23514');
  await denied('INSERT INTO public."InternalNote" ("id","applicationId","authorStaffUserId","body") VALUES ($1,$2,$3,$4)',[randomUUID(),app.id,s.reviewerStaffId,'  '],'23514');
  await owner.query('UPDATE public."StaffUser" SET "status"=\'DISABLED\',"disabledAt"=clock_timestamp() WHERE "id"=$1',[s.reviewerStaffId]);
  await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body:'Synthetic stale principal'}),actors.HIRING_REVIEWER));
  await rejects(()=>reads.readApplicationWorkflow(actors.HIRING_REVIEWER,app.id));
  await owner.query('UPDATE public."StaffUser" SET "status"=\'ACTIVE\',"disabledAt"=NULL WHERE "id"=$1',[s.reviewerStaffId]);
  await owner.query('UPDATE public."UserRole" SET "revokedAt"=clock_timestamp() WHERE "id"=$1',[s.reviewerRoleId]);
  await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body:'Synthetic stale role'}),actors.HIRING_REVIEWER));
  await owner.query('UPDATE public."UserRole" SET "revokedAt"=NULL WHERE "id"=$1',[s.reviewerRoleId]);
  const retentionApp=await application();
  await mutate(request('application.note.create',{applicationId:retentionApp.id,body:'Synthetic retention-bound note'}));
  await owner.query('UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval \'1 second\' WHERE "id"=$1',[retentionApp.id]);
  await owner.query('UPDATE public."BackgroundJob" SET "availableAt"=\'2099-01-01\' WHERE "state"=\'QUEUED\'');
  const jobs=await import('../src/lib/server/repositories/background-jobs.ts'),worker=await import('../src/lib/server/background-worker.ts');
  const retentionJobId=await jobs.enqueueBackgroundJob({jobType:'APPLICATION_RETENTION_DELETE',applicationId:retentionApp.id,safePayload:{version:1},dedupeKey:`application-retention:${retentionApp.id}`,availableAt:new Date('2000-01-01')});
  const [retentionJob]=await jobs.claimBackgroundJobs(1,60);check(retentionJob.id,retentionJobId);
  await rejects(()=>worker.deleteRetainedApplication(retentionJob,{erase:async()=>{throw new Error('No file storage authorized in this fixture');}}));
  check((await runtime.query('SELECT "deletionRequestedAt" IS NOT NULL AS pending,"deletionCompletedAt" IS NULL AS incomplete FROM public."Application" WHERE "id"=$1',[retentionApp.id])).rows[0],{pending:true,incomplete:true});
  check((await runtime.query('SELECT count(*)::int AS n FROM public."InternalNote" WHERE "applicationId"=$1',[retentionApp.id])).rows[0].n,1);
  await rejects(()=>mutate(request('application.note.create',{applicationId:retentionApp.id,body:'Synthetic erasure pending'})));
  await denied('UPDATE public."Application" SET "deletionCompletedAt"=clock_timestamp() WHERE "id"=$1',[retentionApp.id],'23514');
  await owner.query('UPDATE public."Application" SET "expiresAt"=clock_timestamp()-interval \'1 second\' WHERE "id"=$1',[otherApp.id]);
  await rejects(()=>mutate(request('application.note.create',{applicationId:otherApp.id,body:'Synthetic expired'})));
  await rejects(()=>reads.readApplicationWorkflow(actors.ADMIN,otherApp.id));
  check(!(await lists.listStaffApplications(actors.ADMIN)).some(a=>a.id===otherApp.id));
  check(Object.keys((await lists.listStaffApplications(actors.HIRING_REVIEWER))[0]).sort(),['applicationType','createdAt','hiringStatus','id','jobTitle','publicReference','technicalStatus']);
  const withdrawal=request('application.withdraw.record',{applicationId:app.id,expectedTechnicalStatus:'SUBMITTED',confirmed:true});
  await rejects(()=>mutate(request('application.hiring_status.change',{applicationId:app.id,expectedHiringStatus:'NEW',requestedHiringStatus:'WITHDRAWN'}),actors.HIRING_MANAGER));
  await rejects(()=>mutate({...withdrawal,confirmed:false},actors.HIRING_MANAGER));
  await rejects(()=>mutate({...withdrawal,expectedTechnicalStatus:'SECURITY_PENDING'},actors.HIRING_MANAGER));
  await assert.rejects(()=>reads.readApplicationWorkflow(actors.AUDITOR,app.id),lists.StaffReadUnavailableError);checks++;
  await rejects(()=>mutate(withdrawal,actors.HIRING_REVIEWER));
  check((await mutate(withdrawal,actors.HIRING_MANAGER)).outcome,'APPLIED');
  check((await mutate(withdrawal,actors.HIRING_MANAGER)).outcome,'ALREADY_APPLIED');
  check((await runtime.query('SELECT "technicalStatus","hiringStatus" FROM public."Application" WHERE "id"=$1',[app.id])).rows[0],{technicalStatus:'WITHDRAWN',hiringStatus:'WITHDRAWN'});
  await rejects(()=>mutate(request('application.note.create',{applicationId:app.id,body:'Synthetic withdrawn'})));
  await rejects(()=>reads.readApplicationWorkflow(actors.ADMIN,app.id));
  const discipline=randomUUID(),sector=randomUUID(),media=randomUUID();
  await owner.query('INSERT INTO public."Discipline" ("id","slug","name") VALUES ($1,$2,\'Synthetic Discipline\')',[discipline,`synthetic-${discipline}`]);
  await owner.query('INSERT INTO public."Sector" ("id","slug","name") VALUES ($1,$2,\'Synthetic Sector\')',[sector,`synthetic-${sector}`]);
  const project=(await mutate(request('content.create',{slug:`synthetic-b2-${randomUUID()}`,title:'Synthetic B2 project',summary:'Synthetic B2 summary'}),actors.CONTENT_EDITOR)).targetId;
  await owner.query('INSERT INTO public."ProjectMedia" ("id","projectId","mediaType","publicDeliveryPath","altText","updatedAt") VALUES ($1,$2,\'IMAGE\',\'/media/projects/synthetic-sample.png\',\'Synthetic alt\',CURRENT_TIMESTAMP)',[media,project]);
  const content={title:'Synthetic B2 project',summary:'Synthetic B2 summary',clientDescriptor:'Synthetic descriptor',year:2026,brief:'Synthetic brief',challenge:['Synthetic challenge'],approach:['Synthetic approach'],outcome:['Synthetic outcome'],featured:false,
    disciplineIds:[discipline],sectorIds:[sector],credits:[{displayName:'Synthetic credit',role:'Synthetic role',approvedUrl:'https://example.invalid/credit'}],media:[{id:media,altText:'Synthetic alt',caption:'Synthetic caption',accessibilityDescription:''}]};
  const save=request('content.save',{contentId:project,expectedVersion:1,fields:content});
  check((await mutate(save,actors.CONTENT_EDITOR)).outcome,'APPLIED');
  check((await mutate(save,actors.CONTENT_EDITOR)).outcome,'ALREADY_APPLIED');
  check((await reads.readContentWorkflow(actors.CONTENT_EDITOR,project)).fields.credits.length,1);
  await rejects(()=>mutate({...save,idempotencyKey:randomUUID()},actors.CONTENT_EDITOR));
  await rejects(()=>mutate(request('content.save',{contentId:project,expectedVersion:2,fields:{...content,media:[{...content.media[0],id:randomUUID()}]}})));
  await rejects(()=>mutate(request('content.save',{contentId:project,expectedVersion:2,fields:{...content,disciplineIds:[randomUUID()]}})));
  await rejects(()=>mutate(request('content.save',{contentId:project,expectedVersion:2,fields:{...content,credits:[{displayName:'Synthetic',role:'Synthetic',approvedUrl:'javascript:alert(1)'}]}})));
  const race=await Promise.allSettled([1,2].map(()=>mutate(request('content.save',{contentId:project,expectedVersion:2,fields:content}),actors.CONTENT_EDITOR)));
  check(race.filter(r=>r.status==='fulfilled').length,1);check(await version(project,'Project'),3);
  process.env.NODE_ENV='production';await rejects(()=>mutate(request('content.publish',{contentId:project,expectedVersion:3,confirmed:true}),actors.CONTENT_EDITOR));process.env.NODE_ENV='test';
  const publish=request('content.publish',{contentId:project,expectedVersion:3,confirmed:true});
  const publicationRace=await Promise.allSettled([publish,{...publish,idempotencyKey:randomUUID()}].map(i=>mutate(i,actors.CONTENT_EDITOR)));
  check(publicationRace.filter(r=>r.status==='fulfilled').length,1);
  check((await runtime.query('SELECT "publicationState" FROM public."Project" WHERE "id"=$1',[project])).rows[0].publicationState,'PUBLISHED');
  check(await publicReads.listPublicProjects(),[]);
  check((await runtime.query('DELETE FROM public."ProjectDiscipline" WHERE "projectId"=$1',[project])).rowCount,0);
  await rejects(()=>mutate(request('content.save',{contentId:project,expectedVersion:4,fields:content}),actors.CONTENT_EDITOR));
  check((await mutate(request('content.archive',{contentId:project,expectedVersion:4,confirmed:true}),actors.CONTENT_EDITOR)).outcome,'APPLIED');
  await rejects(()=>reads.readContentWorkflow(actors.CONTENT_EDITOR,project));
  await denied('DELETE FROM public."Project"');await denied('DELETE FROM public."Job"');await denied('DELETE FROM public."JobQuestion"');
  await denied('UPDATE public."ProjectMedia" SET "publicDeliveryPath"=\'/evil.png\'');
  await denied('INSERT INTO public."ProjectMedia" DEFAULT VALUES');
  const job=await createJob();check(await version(job,'Job'),1);
  for(const actor of [actors.CONTENT_EDITOR,actors.HIRING_REVIEWER,actors.AUDITOR]) await rejects(()=>mutate(request('job.create',{slug:`synthetic-denied-${randomUUID()}`,fields:jobFields}),actor));
  await rejects(()=>mutate(request('job.save',{jobId:job,expectedVersion:1,fields:{...jobFields,compensationMode:'NUMERIC_RANGE',compensationMinMinor:100,compensationMaxMinor:50,compensationCurrency:'GBP',compensationPeriod:'year'}})));
  check((await mutate(request('job.save',{jobId:job,expectedVersion:1,fields:jobFields}),actors.HIRING_MANAGER)).outcome,'APPLIED');
  const q=request('job.question.save',{jobId:job,expectedVersion:2,questionId:null,questionType:'SELECT',prompt:'Synthetic choice',required:true,active:true,options:['Synthetic A','Synthetic B']});
  check((await mutate(q,actors.HIRING_MANAGER)).outcome,'APPLIED');
  let workflow=await reads.readJobWorkflow(actors.HIRING_MANAGER,job);check(workflow.questions.length,1);
  const qId=workflow.questions[0].id;
  check((await mutate({...q,idempotencyKey:randomUUID(),expectedVersion:3,questionId:qId,options:['Synthetic C','Synthetic D']},actors.HIRING_MANAGER)).outcome,'APPLIED');
  await rejects(()=>mutate({...q,idempotencyKey:randomUUID(),expectedVersion:4,questionId:f.jobQuestionId}));
  check((await mutate({...q,idempotencyKey:randomUUID(),expectedVersion:4,questionId:null,questionType:'SHORT_TEXT',options:[]},actors.HIRING_MANAGER)).outcome,'APPLIED');
  workflow=await reads.readJobWorkflow(actors.HIRING_MANAGER,job);
  check((await mutate(request('job.questions.order',{jobId:job,expectedVersion:5,questionIds:workflow.questions.map(q=>q.id).reverse()}),actors.HIRING_MANAGER)).outcome,'APPLIED');
  await rejects(()=>mutate(request('job.questions.order',{jobId:job,expectedVersion:6,questionIds:[qId,randomUUID()]})));
  process.env.NODE_ENV='production';await rejects(()=>mutate(request('job.publish',{jobId:job,expectedVersion:6,confirmed:true})));process.env.NODE_ENV='test';
  const jobRace=await Promise.allSettled([1,2].map(()=>mutate(request('job.publish',{jobId:job,expectedVersion:6,confirmed:true}),actors.HIRING_MANAGER)));
  check(jobRace.filter(r=>r.status==='fulfilled').length,1);
  check(await publicReads.listPublicJobs(),[]);
  await rejects(()=>mutate({...q,idempotencyKey:randomUUID(),expectedVersion:7}));
  check((await mutate(request('job.transition',{jobId:job,expectedVersion:7,requestedLifecycleState:'CLOSED'}),actors.HIRING_MANAGER)).outcome,'APPLIED');
  check((await mutate(request('job.transition',{jobId:job,expectedVersion:8,requestedLifecycleState:'ARCHIVED'}),actors.HIRING_MANAGER)).outcome,'APPLIED');
  await rejects(()=>mutate(request('job.publish',{jobId:job,expectedVersion:9,confirmed:true})));
  await denied('UPDATE public."JobQuestion" SET "prompt"=\'changed\' WHERE "id"=$1',[f.jobQuestionId],'55000');
  check((await runtime.query('DELETE FROM public."JobQuestionOption" WHERE "id"=$1',[f.jobQuestionOptionId])).rowCount,0);
  await denied('UPDATE public."JobQuestionOption" SET "label"=\'changed\' WHERE "id"=$1',[f.jobQuestionOptionId]);
  const otherProject=(await mutate(request('content.create',{slug:`synthetic-other-${randomUUID()}`,title:'Synthetic other',summary:'Synthetic other'}))).targetId;
  await rejects(()=>mutate(request('content.save',{contentId:otherProject,expectedVersion:1,fields:content})));
  await rejects(()=>reads.readContentWorkflow(actors.CONTENT_EDITOR,job));
  await rejects(()=>reads.readJobWorkflow(actors.HIRING_MANAGER,otherProject));
  for(const actor of [actors.AUDITOR,actors.HIRING_REVIEWER,actors.HIRING_MANAGER]) await rejects(()=>reads.readContentWorkflow(actor,otherProject));
  const concurrentJob=await createJob();
  const questionPublishRace=await Promise.allSettled([
    mutate(request('job.publish',{jobId:concurrentJob,expectedVersion:1,confirmed:true})),
    mutate({...q,idempotencyKey:randomUUID(),jobId:concurrentJob,expectedVersion:1,questionId:null}),
  ]);
  check(questionPublishRace.filter(r=>r.status==='fulfilled').length,1);
  const concurrencyApp=await application();
  const hiringWithdrawalRace=await Promise.allSettled([
    mutate(request('application.hiring_status.change',{applicationId:concurrencyApp.id,expectedHiringStatus:'NEW',requestedHiringStatus:'UNDER_REVIEW'})),
    mutate(request('application.withdraw.record',{applicationId:concurrencyApp.id,expectedTechnicalStatus:'SUBMITTED',confirmed:true})),
  ]);
  check(hiringWithdrawalRace.some(r=>r.status==='fulfilled'));
  check((await runtime.query('SELECT "technicalStatus","hiringStatus" FROM public."Application" WHERE "id"=$1',[concurrencyApp.id])).rows[0],{technicalStatus:'WITHDRAWN',hiringStatus:'WITHDRAWN'});
  // Deterministic active-reference race: mutation sees the committed inactive reference.
  await owner.query('BEGIN');await owner.query('UPDATE public."Discipline" SET "active"=false WHERE "id"=$1',[discipline]);
  const blockedSave=mutate(request('content.save',{contentId:otherProject,expectedVersion:1,fields:{...content,media:[]}}));
  const blockedResult=blockedSave.then(()=>false,()=>true);
  await owner.query('COMMIT');check(await blockedResult);check(await version(otherProject,'Project'),1);
  await owner.query('UPDATE public."Discipline" SET "active"=true WHERE "id"=$1',[discipline]);
  await runtime.query('BEGIN');
  for(const [kind,table,id] of [['LOCATION','JobLocation',f.jobLocationId],['DISCIPLINE','Discipline',discipline],['SECTOR','Sector',sector]]) {
    await runtime.query('SELECT pyramid_private.lock_reference($1,$2)',[kind,id]);
    await owner.query('BEGIN');await owner.query("SET LOCAL lock_timeout='100ms'");
    await assert.rejects(()=>owner.query(`UPDATE public."${table}" SET "active"=false WHERE "id"=$1`,[id]),{code:'55P03'});checks++;
    await owner.query('ROLLBACK');
  }
  await runtime.query('ROLLBACK');
  await rejects(()=>mutate(request('job.create',{slug:`synthetic-date-${randomUUID()}`,fields:{...jobFields,applicationDeadline:'2027-02-31T23:59:59Z'}})));
  check(narrative.narrativeParagraphs(narrative.narrativeDocument(['<script>escaped text</script>'])),['<script>escaped text</script>']);
  for(const value of [[],{version:2,type:'document',children:[]},{version:1,type:'document',children:[{type:'html',html:'<script>'}]},narrative.narrativeDocument(['x'.repeat(2001)])]) check(narrative.narrativeParagraphs(value),null);
  // Positive public DTOs use unmarked text only in this confirmed disposable database.
  const positiveJob=(await mutate(request('job.create',{slug:'boundary-test-role',fields:jobFields}))).targetId;
  const positiveProject=(await mutate(request('content.create',{slug:'boundary-test-project',title:'Study',summary:'Study'}))).targetId;
  await owner.query('INSERT INTO public."ProjectDiscipline" ("projectId","disciplineId") VALUES ($1,$2)',[positiveProject,discipline]);
  await owner.query('INSERT INTO public."ProjectSector" ("projectId","sectorId") VALUES ($1,$2)',[positiveProject,sector]);
  await owner.query('INSERT INTO public."ProjectCredit" ("id","projectId","displayName","role") VALUES ($1,$2,$3,$4)',[randomUUID(),positiveProject,'Approved contributor','Design']);
  await owner.query('INSERT INTO public."ProjectMedia" ("id","projectId","mediaType","publicDeliveryPath","altText","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',[randomUUID(),positiveProject,'IMAGE','/media/projects/sample.png','Study']);
  await owner.query(`UPDATE public."Department" SET "name"='Design' WHERE "id"=$1`,[f.departmentId]);
  await owner.query(`UPDATE public."JobLocation" SET "label"='Remote' WHERE "id"=$1`,[f.jobLocationId]);
  await owner.query(`UPDATE public."Job" SET "slug"='boundary-test-role',"title"='Design role',"summary"='Role summary',"workArrangement"='Remote',"employmentType"='Full time',"experienceLevel"='Experienced',"shiftSchedule"='Daytime',"lifecycleState"='PUBLISHED',"publishedAt"=CURRENT_TIMESTAMP,"closedAt"=NULL,"archivedAt"=NULL,
    "responsibilities"=$2,"requiredQualifications"=$2,"preferredQualifications"=$3,"hiringProcessCopy"=$2 WHERE "id"=$1`,[positiveJob,JSON.stringify(narrative.narrativeDocument(['Approved paragraph'])),JSON.stringify(narrative.narrativeDocument([]))]);
  const publicJob=(await publicReads.listPublicJobs())[0];check(publicJob.title,'Design role');check(!('id' in publicJob));check(!('questions' in publicJob));
  await owner.query(`UPDATE public."Job" SET "preferredQualifications"=$2 WHERE "id"=$1`,[positiveJob,JSON.stringify(narrative.narrativeDocument(['Synthetic qualification']))]);check(await publicReads.listPublicJobs(),[]);
  await owner.query(`UPDATE public."Project" SET "slug"='boundary-test-project',"title"='Design study',"summary"='Study summary',"clientDescriptor"='Approved descriptor',"brief"='Brief',"challenge"=$2,"approach"=$2,"outcome"=$2,"publicationState"='PUBLISHED',"publishedAt"=CURRENT_TIMESTAMP,"archivedAt"=NULL WHERE "id"=$1`,[positiveProject,JSON.stringify(narrative.narrativeDocument(['Approved paragraph']))]);
  await owner.query(`UPDATE public."Discipline" SET "name"='Design' WHERE "id"=$1`,[discipline]);await owner.query(`UPDATE public."Sector" SET "name"='Culture' WHERE "id"=$1`,[sector]);
  await owner.query(`UPDATE public."ProjectMedia" SET "publicDeliveryPath"='/media/projects/sample.png',"altText"='Design study',"caption"=NULL,"accessibilityDescription"=NULL WHERE "projectId"=$1`,[positiveProject]);
  await owner.query(`UPDATE public."ProjectCredit" SET "displayName"='Approved contributor',"role"='Design',"approvedUrl"=NULL WHERE "projectId"=$1`,[positiveProject]);
  const publicProject=(await publicReads.listPublicProjects())[0];check(publicProject.title,'Design study');check(!('id' in publicProject));
  await owner.query(`UPDATE public."ProjectCredit" SET "role"='Synthetic role' WHERE "projectId"=$1`,[positiveProject]);check(await publicReads.listPublicProjects(),[]);
  const audit=await reads.readAuditWorkflow(actors.AUDITOR);check(audit.events.length,20);check(typeof audit.next,'string');
  const next=await reads.readAuditWorkflow(actors.AUDITOR,{before:audit.next});check(next.events.every(e=>!audit.events.some(a=>a.id===e.id)));
  check((await reads.readAuditWorkflow(actors.AUDITOR,{targetType:'JOB',targetId:job})).events.every(e=>e.targetId===job));
  check((await reads.readAuditWorkflow(actors.HIRING_MANAGER)).events.every(e=>['JOB','APPLICATION','CANDIDATE_FILE'].includes(e.targetType)));
  const event=audit.events[0];check((await reads.readAuditWorkflow(actors.AUDITOR,{eventId:event.id})).events[0].id,event.id);
  check(await reads.auditTargetHref(actors.AUDITOR,event),null);
  await rejects(()=>reads.readAuditWorkflow(actors.HIRING_REVIEWER));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{targetType:'APPLICATION',targetId:'invalid'}));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{before:'invalid'}));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{before:['invalid']}));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{before:'x'.repeat(81)}));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{unknown:'bad'}));
  await rejects(()=>reads.readAuditWorkflow(actors.AUDITOR,{eventId:randomUUID()}));
  for(const sql of ['UPDATE public."AuditEvent" SET "outcome"=\'SUCCEEDED\'','DELETE FROM public."CandidateConsent"','DELETE FROM public."ApplicationStatusEvent"','DELETE FROM public."FileSecurityReview"']) await denied(sql);
  check((await runtime.query(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`)).rows[0].n,80);
  console.log(`PHASE_B2_WORKFLOWS_OK checks=${checks} runtime=restricted notes=9 live_provider_effects=0`);
}finally{await Promise.all([owner.end(),runtime.end(),db.closeDatabasePool()]);}
