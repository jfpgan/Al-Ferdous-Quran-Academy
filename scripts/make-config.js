// Runs on Netlify before publishing. Writes js/cms-config.js from environment variables.
// Only the public URL and the public "anon" key are used here. NEVER set a service_role key.
const fs = require('fs');
const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
if (!url && !key) {
  console.log('SUPABASE_URL / SUPABASE_ANON_KEY not set: keeping js/cms-config.js as it is.');
  process.exit(0);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  console.error('SUPABASE_URL looks wrong. Expected https://xxxx.supabase.co');
  process.exit(1);
}
try {
  const payload = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64').toString('utf8'));
  if (payload.role === 'service_role') { console.error('STOP: that is the secret service_role key. Use the anon public key.'); process.exit(1); }
} catch (e) { /* new-style keys (sb_publishable_...) are not JWTs: accepted */ }
if (/^sb_secret_/i.test(key)) { console.error('STOP: that is a secret key. Use the publishable/anon key.'); process.exit(1); }
fs.writeFileSync('js/cms-config.js',
  '/* Generated at deploy time from Netlify environment variables. */\nwindow.AF_CMS_CONFIG = ' +
  JSON.stringify({ url: url.replace(/\/+$/, ''), anonKey: key }) + ';\n');
console.log('js/cms-config.js written for', url);
