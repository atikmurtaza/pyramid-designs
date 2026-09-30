const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const testUrl=new URL(process.env.PHASE2IB_TEST_DATABASE_URL ?? 'invalid:');
assert(['localhost','127.0.0.1'].includes(testUrl.hostname) && /^\/phase2ib_[a-z0-9_]+$/.test(testUrl.pathname),'Smoke requires an explicit disposable database');
process.env.DATABASE_URL=testUrl.href;process.env.DIRECT_URL='';
const env=fs.existsSync('.env.local')?require('dotenv').parse(fs.readFileSync('.env.local')):{};
const origin='http://localhost:3110';
const keys=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_DRIVE_ROOT_ID','RESEND_API_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'];
const privateValues=keys.map(k=>env[k]).filter(Boolean);
let log='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3110'],{
 windowsHide:true,env:{...process.env,NODE_ENV:'production',PUBLIC_INTAKE_MODE:'synthetic',COMPATIBILITY_PROBE_SECRET:'synthetic-probe-secret-only-0000000000000000',CRON_SECRET:'synthetic-cron-secret-only-0000000000000000',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GOOGLE_REFRESH_TOKEN:'',GOOGLE_DRIVE_ROOT_ID:'',EMAIL_PROVIDER:'',RESEND_API_KEY:''},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
(async()=>{let checks=0;const results=[];try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(origin+'/')).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}
 assert(ready,'Production server did not start');
 const id='00000000-0000-4000-8000-000000000012';
 const cases=[['/',200],['/careers',200],['/join',200],['/join?job=synthetic-phase-2b-role',200],['/staff',200],['/staff/applications',null],
 ['/dev/design-system',404],['/internal/staff-auth',404],['/api/internal/staff-auth/read',404],['/api/internal/staff-auth/verify',404],
 ['/api/internal/compatibility/database',405],['/api/applications',405],['/api/applications/'+id,404],
 ['/api/staff/candidate-files/'+id+'/download',404],['/api/staff/candidate-files/'+id+'/quarantine',404]];
 for(const [path,status] of cases){const r=await fetch(origin+path,{redirect:'manual'});const body=await r.text();
  if(status!==null)assert.equal(r.status,status,path);else {assert([200,307].includes(r.status));assert((r.headers.get('location')??body).includes('authentication_required'));assert((r.headers.get('cache-control')??'').includes('no-store'));assert(!body.includes('Application contact'));}
  if(path.startsWith('/join')){assert(body.includes('Applications are not open yet.'));assert(!body.includes('Submit synthetic application'));assert(!body.includes('type="file"'));}
  if(path==='/join'){
    const csp=r.headers.get('content-security-policy')||'';
    assert(csp.includes('script-src') && /'nonce-[A-Za-z0-9+/=]+'/.test(csp));
    assert(csp.includes('frame-src https://challenges.cloudflare.com'));
    assert(csp.includes("connect-src 'self'") && csp.includes("frame-ancestors 'none'"));
    assert(!csp.includes('unsafe-eval') && !csp.includes('*') && !csp.includes('https:;'));
    const nonce=csp.match(/'nonce-([^']+)'/)[1];assert(body.includes('nonce="'+nonce+'"'));
    assert(!body.includes('challenges.cloudflare.com/turnstile/v0/api.js'));
    assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('referrer-policy'),'no-referrer');checks++;
  }
  for(const value of privateValues)assert(!body.includes(value),'Private configuration in response');
  if(path.includes('/candidate-files/'))assert((r.headers.get('cache-control')??'').includes('no-store'));
  results.push({path,status:r.status});checks++;
 }
 for(const suffix of ['/review','/review/initiate']){const r=await fetch(origin+'/api/staff/candidate-files/'+id+suffix,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(r.status,404);assert((r.headers.get('cache-control')??'').includes('no-store'));checks++;}
 assert.equal((await fetch(origin+'/api/internal/compatibility/database',{method:'POST'})).status,401);checks++;
 for(const forwarded of [false,true])for(const multipart of [false,true]){
  const headers={origin,...(forwarded?{'x-forwarded-host':'localhost:3109','x-forwarded-for':'127.0.0.1'}:{})};
  let body='applicationType=TALENT_NETWORK&mode=synthetic&PUBLIC_INTAKE_MODE=synthetic';
  if(multipart){body=new FormData();body.set('mode','synthetic');body.set('cv',new File(['Synthetic invalid bytes'],'Synthetic.pdf',{type:'application/pdf'}));}else headers['content-type']='application/x-www-form-urlencoded';
  assert.equal((await fetch(origin+'/api/applications',{method:'POST',headers,body})).status,403);checks++;
 }
 const cronHeaders={authorization:'Bearer synthetic-cron-secret-only-0000000000000000'};
 assert.equal((await fetch(origin+'/api/internal/worker')).status,405);checks++;
 assert.equal((await fetch(origin+'/api/internal/worker',{method:'POST'})).status,401);checks++;
 assert.equal((await fetch(origin+'/api/internal/worker',{method:'POST',headers:{authorization:'Bearer wrong'}})).status,401);checks++;
 assert.equal((await fetch(origin+'/api/internal/worker?jobId=synthetic',{method:'POST',headers:cronHeaders})).status,400);checks++;
 assert.equal((await fetch(origin+'/api/internal/worker',{method:'POST',headers:cronHeaders,body:'{}'})).status,400);checks++;
 for(let i=0;i<2;i++){const response=await fetch(origin+'/api/internal/worker',{method:'POST',headers:cronHeaders});assert.equal(response.status,200);const value=await response.json();assert.equal(value.ok,true);assert(!JSON.stringify(value).includes('claimToken'));assert(response.headers.get('cache-control').includes('private, no-store'));if(i===1)assert.equal(value.admitted,false);checks++;}
 let staticFiles=0;function inspect(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())inspect(path);else{staticFiles++;const bytes=fs.readFileSync(path);for(const value of privateValues)assert(!bytes.includes(Buffer.from(value)),'Private Google configuration in client build');}}}
 inspect('.next/static');checks++;
 for(const value of privateValues)assert(!log.includes(value),'Private configuration in server logs');checks++;
 fs.writeFileSync('tmp/phase2ib-production-smoke-results.json',JSON.stringify({passed:true,checks,staticFiles,results,syntheticIntake:'closed_even_when_configured',anonymousDownloads:'denied'},null,2));
 console.log(`PRODUCTION_SMOKE_OK checks=${checks} client_files_scanned=${staticFiles}`);
 }finally{server.kill();for(const value of privateValues)log=log.split(value).join('[REDACTED]');fs.writeFileSync('tmp/phase2ib-production-server.log',log);}
})().catch(error=>{console.log('PRODUCTION_SMOKE_FAILED '+error.message);process.exitCode=1;});
