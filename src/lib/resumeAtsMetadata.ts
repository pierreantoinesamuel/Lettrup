export interface ResumeAtsMetadata extends Record<string, unknown> {
  atsScore: number;
  keywordsCount: number;
}

export interface ResumeDataWithAtsMetadata extends Record<string, unknown> {
  _meta: ResumeAtsMetadata;
}

export function withResumeAtsMetadata(
  resumeData: unknown,
  atsScore: number,
  keywordsCount: number
): ResumeDataWithAtsMetadata {
  const currentData: Record<string, unknown> = resumeData && typeof resumeData === 'object' && !Array.isArray(resumeData)
    ? resumeData as Record<string, unknown>
    : {};
  const currentMeta: Record<string, unknown> = currentData._meta && typeof currentData._meta === 'object'
    ? currentData._meta as Record<string, unknown>
    : {};
  return {
    ...currentData,
    _meta: { ...currentMeta, atsScore, keywordsCount },
  };
}