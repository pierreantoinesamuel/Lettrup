import { parseAndBuildResumeData } from './resumeDataMapper';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runResumeDataMapperTests() {
  let testCount = 0;

  testCount++;
  {
    const result = parseAndBuildResumeData({
      fullName: 'Amina Diallo',
      jobTitle: 'Ingénieure logiciel',
      email: 'amina@example.com',
      phone: '+33 6 12 34 56 78',
      location: 'Paris',
      summary: 'Ingénieure avec huit ans d’expérience.',
      skills: ['TypeScript', 'React', 'Node.js'],
      languages: ['Français (natif)', 'Anglais (courant)'],
      interests: ['Mentorat'],
      experience: [{
        company: 'Exemple SAS',
        role: 'Développeuse',
        duration: '2020 - 2024',
        location: 'Paris',
        description: ['Pilotage de projets', 'Réduction des délais de 30 %'],
      }],
      education: [{ institution: 'Université de Paris', degree: 'Master informatique', year: '2018 - 2020' }],
      projects: [{ name: 'Plateforme web', description: 'Création et maintenance.' }],
    });

    assert(result.coordonnees.name === 'Amina Diallo', 'Imported name should be retained');
    assert(result.experience.length === 1, 'All imported experience entries should be retained');
    assert(result.experience[0].description.includes('Réduction des délais de 30 %'), 'Experience descriptions should be retained');
    assert(result.education[0].institution === 'Université de Paris', 'Education should be retained');
    assert(result.competences === 'TypeScript\nReact\nNode.js', 'All imported skills should be retained');
    assert(result.langues === 'Français (natif)\nAnglais (courant)', 'Imported languages should be retained');
    assert(result.projets[0].name === 'Plateforme web', 'Imported projects should be retained');
  }

  testCount++;
  {
    const result = parseAndBuildResumeData({});
    assert(result.experience.length === 0, 'Missing imported experience should not be replaced by demo content');
    assert(result.education.length === 0, 'Missing imported education should not be replaced by demo content');
    assert(result.competences === '', 'Missing imported skills should remain empty');
    assert(result.langues === '', 'Missing imported languages should remain empty');
  }

  testCount++;
  {
    const result = parseAndBuildResumeData({ experience: [{ company: 'New company', role: 'New role' }] }, {
      experience: [{ company: 'Old template company' }],
      education: [{ institution: 'Old template school' }],
    });
    assert(result.experience[0].company === 'New company', 'Imported data should take precedence over fallback data');
    assert(result.education[0].institution === 'Old template school', 'Explicit fallback data should remain supported');
  }

  testCount++;
  {
    const result = parseAndBuildResumeData({
      experience: [
        { company: 'Alpha', role: 'Analyste BI', duration: 'Mai 2025 – Présent' },
        { company: 'Beta', role: 'Consultant', duration: 'Janvier 2024 - Avril 2025' },
      ],
    });
    assert(result.experience[0].startDate === 'Mai 2025', 'Current experience startDate should be extracted from duration');
    assert(result.experience[0].current === true, 'Present duration should set current=true');
    assert(result.experience[1].startDate === 'Janvier 2024', 'Past experience startDate should be extracted');
    assert(result.experience[1].endDate === 'Avril 2025', 'Past experience endDate should be extracted');
    assert(result.experience[1].current === false, 'Past experience should set current=false');
  }

  return { testCount };
}
