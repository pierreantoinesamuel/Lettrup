import { mergeParsedResumeChunks, mergeResumeAuditChunks, splitResumeText } from './resumeImport';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runResumeImportTests() {
  let testCount = 0;

  testCount++;
  {
    const input = `${'A'.repeat(1100)}\n${'B'.repeat(1100)}\n${'C'.repeat(1100)}`;
    const chunks = splitResumeText(input, 1000);
    assert(chunks.length > 1, 'Long CV text should be split for the AI request size limit');
    assert(chunks.join('\n').replace(/\s/g, '') === input.replace(/\s/g, ''), 'Chunking must preserve every character');
  }

  testCount++;
  {
    const merged = mergeParsedResumeChunks([
      { fullName: 'Amira Martin', experience: [{ company: 'Alpha' }], skills: ['Excel'] },
      { experience: [{ company: 'Beta' }, { company: 'Alpha' }], skills: ['SQL'] },
    ]);
    assert(merged.fullName === 'Amira Martin', 'Non-empty candidate details should be retained');
    assert((merged.experience as unknown[]).length === 2, 'Experiences from every chunk should be combined without duplicates');
    assert((merged.skills as unknown[]).length === 2, 'Skills from every chunk should be combined');
  }

  testCount++;
  {
    const merged = mergeResumeAuditChunks([
      { atsScore: 80, summary: 'Score 1', strengths: ['Clair'], improvements: [], missingKeywords: ['SQL'] },
      { atsScore: 60, summary: 'Score 2', strengths: ['Clair'], improvements: ['Ajouter des chiffres'], missingKeywords: ['Python'] },
    ], [100, 100]);
    assert(merged.atsScore === 70, 'Chunk ATS scores should be length-weighted into a final score');
    assert(merged.missingKeywords.join(',') === 'SQL,Python', 'Missing keywords should be combined without duplicates');
  }

  return { testCount };
}
