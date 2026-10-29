export type ToneId = 'professionnel' | 'enthousiaste' | 'concis' | 'creatif';

export interface CoverLetterHistoryItem {
  id: string;
  content: string;
  company: string;
  posteVise: string;
  recruiter: string;
  template: string;
  tone: ToneId;
  createdAt: string;
}

export const COVER_LETTER_MAX = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCoverLetterRow(row: any): CoverLetterHistoryItem {
  const snapshot = row.resume_snapshot || {};
  return {
    id: row.id,
    content: row.content || '',
    company: row.company || '',
    posteVise: row.job_title || '',
    recruiter: snapshot.recruiter || '',
    template: row.template || 'candidature-spontanee',
    tone: (snapshot.tone as ToneId) || 'professionnel',
    createdAt: row.created_at,
  };
}
