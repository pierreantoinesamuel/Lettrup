import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_EMAIL = `cvpilot-e2e-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test-Password-' + Math.random().toString(36).slice(2) + '-9!';

async function main() {
  console.log('--- 1. Creating throwaway test user ---');
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw new Error('createUser failed: ' + createErr.message);
  const userId = created.user.id;
  console.log('Created user id:', userId);

  console.log('--- 2. Signing in as test user to get a real access token ---');
  const anonClient = createClient(url, process.env.SUPABASE_ANON_KEY);
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) throw new Error('signIn failed: ' + signInErr.message);
  const token = signIn.session.access_token;
  console.log('Got access token, length:', token.length);

  console.log('--- 3. Inserting a real CV for this user (simulating "import") ---');
  const cvId = crypto.randomUUID();
  const resumeData = {
    fullName: 'Alex Martin',
    email: TEST_EMAIL,
    phone: '+33 6 12 34 56 78',
    summary: 'Développeur web avec 3 ans d\'expérience en JavaScript.',
    skills: ['JavaScript', 'HTML', 'CSS'],
    experience: [
      {
        id: 'exp-1',
        company: 'WebAgency',
        role: 'Développeur Frontend',
        startDate: '2022',
        endDate: 'Présent',
        description: 'A travaillé sur des sites web pour des clients.',
      },
    ],
  };
  const { error: insertErr } = await admin.from('user_resumes').insert({
    id: cvId,
    user_id: userId,
    name: 'CV Test E2E',
    type: 'created',
    job_title: 'Développeur Frontend',
    resume_data: resumeData,
    is_primary: true,
  });
  if (insertErr) throw new Error('insert CV failed: ' + insertErr.message);
  console.log('Inserted CV id:', cvId);

  const results = { userId, cvId, token };
  console.log('--- READY ---');
  console.log(JSON.stringify(results));
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
