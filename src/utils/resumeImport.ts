export const RESUME_IMPORT_CHUNK_SIZE = 15000;

export function splitResumeText(text: string, chunkSize = RESUME_IMPORT_CHUNK_SIZE): string[] {
  if (!text.trim()) return [];
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1000) {
    throw new Error('Resume text chunk size must be at least 1000 characters.');
  }

  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > chunkSize) {
    let splitAt = remaining.lastIndexOf('\n', chunkSize);
    if (splitAt < chunkSize * 0.6) splitAt = remaining.lastIndexOf(' ', chunkSize);
    if (splitAt < chunkSize * 0.6) splitAt = chunkSize;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mergeArrayValues(values: unknown[]): unknown[] {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const key = JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

export function mergeParsedResumeChunks(chunks: unknown[]): Record<string, unknown> {
  const parsedChunks = chunks.map(asObject);
  const merged: Record<string, unknown> = {};
  for (const chunk of parsedChunks) {
    for (const [key, value] of Object.entries(chunk)) {
      if (Array.isArray(value)) {
        merged[key] = mergeArrayValues([merged[key], value]);
      } else if (
        (typeof value === 'string' && value.trim()) &&
        (typeof merged[key] !== 'string' || !String(merged[key]).trim())
      ) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function mergeResumeAuditChunks(
  audits: Array<{ atsScore: number; summary: string; strengths: string[]; improvements: string[]; missingKeywords: string[] }>,
  chunkLengths: number[]
) {
  if (!audits.length) throw new Error('No resume ATS audit results were provided.');
  const totalLength = chunkLengths.reduce((sum, length) => sum + length, 0);
  const atsScore = Math.round(audits.reduce(
    (sum, audit, index) => sum + audit.atsScore * (chunkLengths[index] || 1),
    0
  ) / (totalLength || audits.length));
  const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  return {
    atsScore,
    summary: unique(audits.map((audit) => audit.summary)).join(' '),
    strengths: unique(audits.flatMap((audit) => audit.strengths)),
    improvements: unique(audits.flatMap((audit) => audit.improvements)),
    missingKeywords: unique(audits.flatMap((audit) => audit.missingKeywords)),
  };
}
