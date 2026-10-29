import { validateJobPostingSubmission } from './JobPostingValidation';

export function runJobPostingValidationTests() {
  console.log('--- Testing JobPostingValidation ---');
  let testCount = 0;

  // 1. Missing title
  const res1 = validateJobPostingSubmission({
    company: 'Acme Corp',
    descriptionText: 'a'.repeat(150),
  });
  if (res1.valid || !res1.errors.some((e) => e.includes('titre'))) {
    throw new Error('Test 1 failed: Missing title should be invalid');
  }
  testCount++;

  // 2. Missing company
  const res2 = validateJobPostingSubmission({
    title: 'Développeur Fullstack',
    descriptionText: 'a'.repeat(150),
  });
  if (res2.valid || !res2.errors.some((e) => e.includes('entreprise'))) {
    throw new Error('Test 2 failed: Missing company should be invalid');
  }
  testCount++;

  // 3. Description too short (< 100 chars)
  const res3 = validateJobPostingSubmission({
    title: 'Développeur Fullstack',
    company: 'Acme Corp',
    descriptionText: 'Trop court',
  });
  if (res3.valid || !res3.errors.some((e) => e.includes('100 caractères'))) {
    throw new Error('Test 3 failed: Short description (<100 chars) should be invalid');
  }
  testCount++;

  // 4. Description too long (> 10,000 chars)
  const res4 = validateJobPostingSubmission({
    title: 'Développeur Fullstack',
    company: 'Acme Corp',
    descriptionText: 'a'.repeat(10001),
  });
  if (res4.valid || !res4.errors.some((e) => e.includes('10 000 caractères'))) {
    throw new Error('Test 4 failed: Long description (>10000 chars) should be invalid');
  }
  testCount++;

  // 5. Valid submission
  const res5 = validateJobPostingSubmission({
    title: 'Développeur Senior React / Node.js',
    company: 'Tech Innovators',
    location: 'Paris (Hybride)',
    descriptionText:
      'Nous recherchons un développeur senior React et Node.js pour rejoindre notre équipe produit dynamique à Paris. Expérience minimale de 5 ans requise, maîtrise de TypeScript, GraphQL, Docker, et CI/CD.',
    salaryRange: '60k - 75k EUR',
  });
  if (!res5.valid || res5.errors.length > 0) {
    throw new Error(`Test 5 failed: Valid submission should pass, errors: ${res5.errors.join(', ')}`);
  }
  testCount++;

  return { testCount };
}
