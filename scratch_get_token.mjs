import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_EMAIL = `cvpilot-checkout-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test-Password-' + Math.random().toString(36).slice(2) + '-9!';

async function main() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw new Error('createUser failed: ' + createErr.message);
  const userId = created.user.id;

  const anonClient = createClient(url, anonKey);
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) throw new Error('signIn failed: ' + signInErr.message);
  const token = signIn.session.access_token;

  console.log(JSON.stringify({ userId, token }));
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
