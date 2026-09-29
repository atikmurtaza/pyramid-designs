const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const configured = require('dotenv').parse(fs.readFileSync('.env.local'));
const names = ['TURNSTILE_SECRET_KEY', 'TURNSTILE_SITE_KEY', 'RESEND_API_KEY', 'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_ROOT_ID', 'DATABASE_URL', 'DIRECT_URL', 'CRON_SECRET',
  'COMPATIBILITY_PROBE_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'];
const values = names.map(name => configured[name]).filter(value => value && value.length >= 10);
const canaries = ['synthetic_2ie_private_canary_94dea392', 'synthetic_2ie_public_canary_849dea44'];
const staged = process.argv.includes('--staged');
const changed = (staged ? git(['diff', '--cached', '--name-only'])
  : git(['diff', '--name-only']) + '\n' + git(['ls-files', '--others', '--exclude-standard'])).trim().split('\n').filter(Boolean);
let scanned = 0;
function inspect(bytes, generated = true) {
  scanned++;
  // Fail with fixed output only: never report the matching value or content.
  for (const value of generated ? [...values, ...canaries] : values) assert(!bytes.includes(Buffer.from(value)), 'Private configuration or closed-widget key leakage');
}
for (const path of changed) {
  assert(!/^\.env(?!\.example$)|\.pem$|\.key$|^tmp\//.test(path), 'Unexpected sensitive/generated staging path');
  const bytes = Buffer.from(staged ? git(['show', ':' + path]) : fs.readFileSync(path)); inspect(bytes, false);
  const text = bytes.toString();
  for (const pattern of [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,
    /postgres(?:ql)?:\/\/[^\s"'`]+/, /re_[A-Za-z0-9_-]{24,}/,
    /ya29\.[A-Za-z0-9_-]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}/]) assert(!pattern.test(text), 'Sensitive literal in intended source');
}
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) visit(path); else inspect(fs.readFileSync(path));
  }
}
visit('.next/static'); visit('.next/server');
for (const path of ['tmp/2ie-build.log', 'tmp/phase2ib-production-server.log']) if (fs.existsSync(path)) inspect(fs.readFileSync(path));
const baseline = 'd6c92b5d7e51c7c7061387fa3d9563edb0162f63';
assert.equal(git(['diff', baseline, '--', 'prisma/schema.prisma', 'prisma/migrations', 'package-lock.json']), '');
const logo = 'public/brand/approved/pyramid-designs-master.svg';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
assert.equal(hash(git(['show', baseline + ':' + logo])), hash(fs.readFileSync(logo, 'utf8').replaceAll('\r\n', '\n')));
assert.equal(git(['ls-files', '--', '.env.local']), '');
console.log(`PHASE_2IE_LEAKAGE_OK files=${scanned} source_files=${changed.length} findings=0 logo_sha256=${hash(git(['show', baseline + ':' + logo]))}`);
