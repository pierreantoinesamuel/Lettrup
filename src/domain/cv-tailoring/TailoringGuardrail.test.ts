/**
 * Unit Tests & Executable Guardrail Assertions for Feature 1: CV Tailoring & Anti-Fabrication
 */

import { computeMatchGaps } from './MatchGap';
import { validateNoFabricatedFacts } from './TailoredCv';
import { ResumeProfile } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runCvTailoringGuardrailTests(): { passed: boolean; testCount: number } {
  let testCount = 0;

  const baseCvData: ResumeProfile = {
    fullName: 'Pierre Samuel',
    email: 'pierre@example.com',
    summary: 'Développeur Full Stack React et Node.js',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    experience: [
      {
        id: 'exp-1',
        company: 'Doctolib',
        role: 'Full Stack Engineer',
        startDate: '2022',
        endDate: '2026',
        description: 'Conception d\'interfaces React et microservices Node.js'
      }
    ]
  };

  // Test 1: MatchGap computation
  {
    testCount++;
    const jobRequirements = ['React', 'TypeScript', 'Docker', 'GraphQL'];
    const gaps = computeMatchGaps(jobRequirements, baseCvData.skills, 'Conception interfaces React');

    assert(gaps.length === 4, 'Match gaps count should be 4');
    assert(gaps.find(g => g.keyword === 'React')?.status === 'fully_matched', 'React should be fully matched');
    assert(gaps.find(g => g.keyword === 'Docker')?.status === 'missing', 'Docker should be missing');
  }

  // Test 2: Valid tailoring (subset of original skills)
  {
    testCount++;
    const tailoredProfile: ResumeProfile = {
      ...baseCvData,
      skills: ['TypeScript', 'React'],
    };

    const validation = validateNoFabricatedFacts(baseCvData, tailoredProfile);
    assert(validation.isValid === true, 'Validation should pass for valid skills subset');
    assert(validation.violations.length === 0, 'No violations expected');
    assert(validation.sanitizedProfile.skills.length === 2, 'Sanitized skills count should be 2');
  }

  // Test 3: Hallucinated skills detection & filtering
  {
    testCount++;
    const hallucinatedProfile: ResumeProfile = {
      ...baseCvData,
      skills: ['React', 'TypeScript', 'Python', 'Kubernetes'], // Python & Kubernetes are hallucinations
    };

    const validation = validateNoFabricatedFacts(baseCvData, hallucinatedProfile);

    assert(validation.isValid === false, 'Validation should fail when hallucinated skills are present');
    assert(validation.violations.length > 0, 'Violations array should contain notice');
    assert(validation.violations[0].includes('Compétences filtrées'), 'Violation should mention filtered skills');
    assert(validation.violations[0].includes('Python, Kubernetes'), 'Violation should specify hallucinated skill names');

    // Asserts that sanitizedProfile strips out Python and Kubernetes, leaving only original valid skills
    assert(validation.sanitizedProfile.skills.join(',') === 'React,TypeScript', 'Sanitized profile must strip Python & Kubernetes');
  }

  // Test 4: Unverified experience items rejection
  {
    testCount++;
    const hallucinatedExpProfile: ResumeProfile = {
      ...baseCvData,
      experience: [
        ...baseCvData.experience,
        {
          id: 'exp-fake',
          company: 'FakeCorp',
          role: 'Chief Architect',
          startDate: '2020',
          endDate: '2022',
          description: 'Invented company'
        }
      ]
    };

    const validation = validateNoFabricatedFacts(baseCvData, hallucinatedExpProfile);
    assert(validation.isValid === false, 'Validation should fail for added experience items');
    assert(validation.sanitizedProfile.experience.length === 1, 'Experience array must revert back to 1 original item');
  }

  // Test 5: Experience metadata modification (company/role/dates) rejection
  {
    testCount++;
    const modifiedMetaProfile: ResumeProfile = {
      ...baseCvData,
      experience: [
        {
          id: 'exp-1',
          company: 'Doctolib France', // Changed company name
          role: 'VP of Engineering',  // Changed role title
          startDate: '2020',          // Changed start date
          endDate: '2026',
          description: 'Conception d\'interfaces React et microservices Node.js'
        }
      ]
    };

    const validation = validateNoFabricatedFacts(baseCvData, modifiedMetaProfile);
    assert(validation.isValid === false, 'Validation should fail when company/role/dates are modified');
    assert(validation.violations[0].includes('Modifications de métadonnées interdites'), 'Violation should mention metadata modification');
    assert(validation.sanitizedProfile.experience[0].company === 'Doctolib', 'Company should revert to original Doctolib');
    assert(validation.sanitizedProfile.experience[0].role === 'Full Stack Engineer', 'Role should revert to original Full Stack Engineer');
  }

  // Test 6: Unverified quantitative claims in description rejection
  {
    testCount++;
    const quantitativeClaimProfile: ResumeProfile = {
      ...baseCvData,
      experience: [
        {
          id: 'exp-1',
          company: 'Doctolib',
          role: 'Full Stack Engineer',
          startDate: '2022',
          endDate: '2026',
          description: 'Conception d\'interfaces React gérant 50000 utilisateurs et amélioration des perfs de 40%' // Added 50000 and 40%
        }
      ]
    };

    const validation = validateNoFabricatedFacts(baseCvData, quantitativeClaimProfile);
    assert(validation.isValid === false, 'Validation should fail when new numbers/percentages are introduced in description');
    assert(validation.violations[0].includes('Chiffres/pourcentages non vérifiés'), 'Violation should mention unverified numbers');
    assert(validation.sanitizedProfile.experience[0].description === baseCvData.experience[0].description, 'Description must revert to original when quantitative claims are added');
  }

  // Test 7: Unverified quantitative claims in professional summary rejection
  {
    testCount++;
    const summaryClaimProfile: ResumeProfile = {
      ...baseCvData,
      summary: 'Développeur Senior avec 10 ans d\'expérience ayant dirigé 15 développeurs' // 10 and 15 are unverified in source CV
    };

    const validation = validateNoFabricatedFacts(baseCvData, summaryClaimProfile);
    assert(validation.isValid === false, 'Validation should fail when unverified numbers/percentages are introduced in summary');
    assert(validation.violations[0].includes('résumé professionnel'), 'Violation should explicitly cite professional summary');
    assert(validation.sanitizedProfile.summary === baseCvData.summary, 'Summary must revert to original source summary when unverified numbers are added');
  }

  return { passed: true, testCount };
}

