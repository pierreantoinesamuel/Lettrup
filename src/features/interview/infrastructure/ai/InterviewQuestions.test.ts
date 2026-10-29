import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runInterviewQuestionsTests() {
  let testCount = 0;

  testCount++;
  {
    const prompt = AI_PROMPTS.interview.generateList(
      'Data Analyst',
      'Senior',
      5,
      'Build dashboards, analyze product metrics, and present insights to stakeholders.',
      'Acme',
      'Technical interview',
      'en'
    );
    assert(prompt.includes('Data Analyst'), 'Interview questions must use the selected target role');
    assert(prompt.includes('Build dashboards'), 'Interview questions must use the provided job description');
    assert(prompt.includes('Acme'), 'Interview questions must use the target company when provided');
    assert(prompt.includes('Technical interview'), 'Interview questions must use the selected interview type');
    assert(prompt.includes('anglais'), 'Interview questions must follow the selected language');
    assert(prompt.includes('exactement 5'), 'Interview questions must respect the requested question count');
  }

  testCount++;
  {
    const prompt = AI_PROMPTS.interview.generateList('Comptable', 'Intermédiaire', 5);
    assert(prompt.includes('Comptable'), 'Questions must still use the role when no job description is provided');
    assert(prompt.includes('responsabilités et compétences habituelles'), 'Questions without a job description must remain role-specific');
  }

  return { testCount };
}
