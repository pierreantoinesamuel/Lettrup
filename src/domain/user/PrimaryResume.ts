export interface ResumeSummary {
  isPrimary: boolean;
}

// `resumesMostRecentFirst` must already be ordered most-recently-updated-first,
// as returned by `listUserResumes`. Prefers the candidate's explicit Primary
// Resume; falls back to the most recently updated Resume when none is set yet
// (pre-migration accounts, or the brief window right after creating a second
// Resume before a primary has been chosen).
export function resolvePrimaryResume<T extends ResumeSummary>(
  resumesMostRecentFirst: T[]
): T | null {
  return resumesMostRecentFirst.find((r) => r.isPrimary) ?? resumesMostRecentFirst[0] ?? null;
}
