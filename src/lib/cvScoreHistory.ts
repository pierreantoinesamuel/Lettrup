import { supabase } from './supabase';

/**
 * Score history of a resume: every time a CV is imported or the AI rewrites
 * part of it, one entry records the ATS score before and after, together with
 * a copy of the CV at that moment so the two versions can be compared later.
 *
 * Entries live in the resume's own `_meta.history` (same JSON column as the
 * rest of its display metadata), so they follow the CV and need no new table.
 */

export type CvHistoryKind =
  | 'import'
  | 'create'
  | 'duplicate'
  | 'primary'
  | 'applied'
  | 'ai_rewrite'
  | 'ai_profile'
  | 'ai_experience'
  | 'ai_skills'
  | 'ai_section';

export type CvSnapshot = Record<string, unknown>;

export interface CvHistoryEntry {
  id: string;
  /** ISO timestamp of the event. */
  at: string;
  kind: CvHistoryKind;
  label: string;
  /** Score before the event; null for an import (there was no previous version). */
  scoreBefore: number | null;
  scoreAfter: number;
  /** CV content before the event; null for an import. */
  before: CvSnapshot | null;
  after: CvSnapshot;
  /** The job this CV was used for, when the event is tied to an application. */
  opportunity?: { company: string; role: string };
}

// `object` rather than CvSnapshot: callers hand over their typed ResumeData.
export type NewCvHistoryEntry = Omit<CvHistoryEntry, 'id' | 'at' | 'before' | 'after'> & {
  before: object | null;
  after: object;
};

// Each entry carries up to two copies of the CV, so the list is bounded to
// keep the resume row small.
const MAX_ENTRIES = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function stripMeta(resumeData: unknown): CvSnapshot {
  if (!isRecord(resumeData)) return {};
  const { _meta, ...content } = resumeData;
  void _meta;
  return content;
}

/** Reads the history stored in a resume's JSON (`_meta.history`), oldest first. */
export function readCvHistory(resumeData: unknown): CvHistoryEntry[] {
  if (!isRecord(resumeData) || !isRecord(resumeData._meta)) return [];
  const history = resumeData._meta.history;
  if (!Array.isArray(history)) return [];
  return history.filter(
    (entry): entry is CvHistoryEntry =>
      isRecord(entry) && typeof entry.id === 'string' && typeof entry.at === 'string' && typeof entry.scoreAfter === 'number'
  );
}

export function sameCvContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(stripMeta(a)) === JSON.stringify(stripMeta(b));
}

/** Removes one entry from a resume's history; the CV's content and score are left untouched. */
export async function deleteCvHistoryEntry(resumeId: string, userId: string, entryId: string): Promise<void> {
  if (!supabase || !resumeId || !userId || !entryId) return;

  const { data: current, error: readError } = await supabase
    .from('user_resumes')
    .select('resume_data')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (readError || !current) throw new Error(readError?.message || 'CV introuvable.');

  const currentMeta = isRecord(current.resume_data?._meta) ? current.resume_data._meta : {};
  const history = readCvHistory(current.resume_data).filter((entry) => entry.id !== entryId);

  const { error } = await supabase
    .from('user_resumes')
    .update({ resume_data: { ...stripMeta(current.resume_data), _meta: { ...currentMeta, history } } })
    .eq('id', resumeId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Appends an entry to the resume's history and keeps the resume's displayed
 * ATS score in step with the latest one. The CV content is written together
 * with it so a concurrent autosave can never leave older content behind.
 */
export async function recordCvHistoryEvent(
  resumeId: string,
  userId: string,
  entry: NewCvHistoryEntry
): Promise<void> {
  if (!supabase || !resumeId || !userId) return;
  if (!Number.isFinite(entry.scoreAfter)) return;

  const { data: current, error: readError } = await supabase
    .from('user_resumes')
    .select('resume_data')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (readError || !current) return;

  const currentMeta = isRecord(current.resume_data?._meta) ? current.resume_data._meta : {};
  const saved: CvHistoryEntry = {
    ...entry,
    before: entry.before ? stripMeta(entry.before) : null,
    after: stripMeta(entry.after),
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  const history = [...readCvHistory(current.resume_data), saved].slice(-MAX_ENTRIES);

  // Making a CV the primary one, or applying with it, changes neither its
  // content nor its score: log it, but leave both as they are.
  const touchesContent = entry.kind !== 'primary' && entry.kind !== 'applied';
  const nextMeta: Record<string, unknown> = { ...currentMeta, history };
  if (touchesContent) nextMeta.atsScore = Math.round(entry.scoreAfter);

  const { error } = await supabase
    .from('user_resumes')
    .update({
      resume_data: {
        ...(touchesContent ? saved.after : stripMeta(current.resume_data)),
        _meta: nextMeta,
      },
    })
    .eq('id', resumeId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
