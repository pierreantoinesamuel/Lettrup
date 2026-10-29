import { withResumeAtsMetadata } from './resumeAtsMetadata';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runResumeAtsMetadataTests() {
  const source = {
    coordonnees: { name: 'Candidate' },
    _meta: { template: 'classique-paris', fileName: 'resume.pdf', atsScore: 40 },
  };
  const updated = withResumeAtsMetadata(source, 87, 12);

  assert(updated._meta.atsScore === 87, 'Successful ATS scans should update the saved resume score');
  assert(updated._meta.keywordsCount === 12, 'ATS metadata should include the analyzed keyword count');
  assert(updated._meta.template === 'classique-paris' && updated._meta.fileName === 'resume.pdf', 'Updating ATS metadata must preserve existing resume metadata');
  assert(source._meta.atsScore === 40, 'ATS metadata updates must not mutate the original resume data');

  return { testCount: 4 };
}