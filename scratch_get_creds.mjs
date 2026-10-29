import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_EMAIL = `cvpilot-browser-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test-Password-9!Zx';

async function main() {
  const { error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error('createUser failed: ' + error.message);
  console.log(JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }));
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
