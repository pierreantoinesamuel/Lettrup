import { supabase } from './supabase';
import { withResumeAtsMetadata } from './resumeAtsMetadata';

export { withResumeAtsMetadata } from './resumeAtsMetadata';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawResumeData = any;

export interface ResumeMeta {
  template?: string;
  atsScore?: number;
  fileName?: string;
  fileSize?: string;
  keywordsCount?: number;
}

export interface ResumeListItem {
  id: string;
  name: string;
  type: 'created' | 'uploaded';
  createdDate: string;
  updatedDate: string;
  template: string;
  atsScore: number;
  /** true when an ATS score has actually been stored (vs the default 0 for unanalyzed CVs) */
  atsAnalyzed: boolean;
  fileName?: string;
  fileSize?: string;
  keywordsCount?: number;
  jobTitle?: string;
  company?: string;
  resumeData: RawResumeData;
  isPrimary: boolean;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD} j`;
    return date.toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

// Extra display-only fields (template label, simulated ATS score, imported file info)
// have no dedicated columns on user_resumes, so they travel inside resume_data
// under a reserved `_meta` key alongside the real CV content fields.
function mapRow(row: {
  id: string;
  name: string | null;
  type: string | null;
  job_title: string | null;
  company: string | null;
  resume_data: RawResumeData;
  created_at: string | null;
  updated_at: string | null;
  is_primary: boolean | null;
}): ResumeListItem {
  const resumeData = row.resume_data || {};
  const meta: ResumeMeta = (resumeData && resumeData._meta) || {};
  return {
    id: row.id,
    name: row.name || 'CV sans titre',
    type: row.type === 'uploaded' ? 'uploaded' : 'created',
    createdDate: fmtDate(row.created_at),
    updatedDate: fmtRelative(row.updated_at || row.created_at),
    template: meta.template || (row.type === 'uploaded' ? 'Fichier Importé' : 'CV en ligne'),
    atsScore: typeof meta.atsScore === 'number' ? meta.atsScore : 0,
    atsAnalyzed: typeof meta.atsScore === 'number',
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    keywordsCount: meta.keywordsCount,
    jobTitle: row.job_title || undefined,
    company: row.company || undefined,
    resumeData,
    isPrimary: Boolean(row.is_primary),
  };
}

export async function updateUserResumeAtsScore(
  id: string,
  userId: string,
  atsScore: number,
  keywordsCount: number
): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré.');
  if (!id || !userId || !Number.isFinite(atsScore) || atsScore < 0 || atsScore > 100 || !Number.isSafeInteger(keywordsCount) || keywordsCount < 0) {
    throw new Error('ATS score metadata is invalid.');
  }

  const { data: current, error: readError } = await supabase
    .from('user_resumes')
    .select('resume_data')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (readError || !current) throw new Error(readError?.message || 'CV introuvable.');

  const { data: updated, error: updateError } = await supabase
    .from('user_resumes')
    .update({ resume_data: withResumeAtsMetadata(current.resume_data, atsScore, keywordsCount) })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (updateError || !updated) throw new Error(updateError?.message || 'CV introuvable.');
}

export async function listUserResumes(userId: string): Promise<ResumeListItem[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('user_resumes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getUserResumeById(id: string, userId: string): Promise<ResumeListItem | null> {
  if (!supabase || !userId || !id) return null;
  const { data, error } = await supabase
    .from('user_resumes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

// Thrown by createUserResume when a free-tier account already has its one
// allowed CV and tries to create another — callers match on this exact
// message to show an upgrade prompt instead of a generic save error.
export const FREE_TIER_CV_LIMIT_ERROR = 'free_tier_cv_limit';
const FREE_TIER_CV_LIMIT = 1;

function isFreeTierPlan(plan: string | null | undefined): boolean {
  return plan !== 'pro' && plan !== 'plus' && plan !== 'max';
}

export async function createUserResume(
  userId: string,
  input: {
    name: string;
    type: 'created' | 'uploaded';
    jobTitle?: string;
    company?: string;
    resumeData: RawResumeData;
    meta?: ResumeMeta;
  },
  plan?: string | null
): Promise<ResumeListItem> {
  if (!supabase) throw new Error('Supabase non configuré.');

  // A candidate's first resume becomes their Primary Resume automatically, so
  // Cover Letter / Portfolio generation has something unambiguous to use without
  // requiring an extra action from the common single-resume candidate.
  const { count } = await supabase
    .from('user_resumes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const isFirstResume = !count;

  if (isFreeTierPlan(plan) && (count ?? 0) >= FREE_TIER_CV_LIMIT) {
    throw new Error(FREE_TIER_CV_LIMIT_ERROR);
  }

  const payload = {
    user_id: userId,
    name: input.name,
    type: input.type,
    job_title: input.jobTitle,
    company: input.company,
    resume_data: { ...input.resumeData, _meta: input.meta || {} },
    is_primary: isFirstResume,
  };

  let { data, error } = await supabase.from('user_resumes').insert(payload).select().single();

  // Two concurrent "create my first resume" requests can both read count=0 and
  // both try to insert is_primary: true; the loser hits the one-primary-per-user
  // unique index (migration 011). Retry without the flag instead of failing the
  // whole creation — the candidate still ends up with a resume, just not primary.
  if (error?.code === '23505' && isFirstResume) {
    ({ data, error } = await supabase
      .from('user_resumes')
      .insert({ ...payload, is_primary: false })
      .select()
      .single());
  }

  if (error || !data) throw new Error(error?.message || 'Failed to create resume.');
  return mapRow(data);
}

// Sets `id` as the candidate's sole Primary Resume, unsetting any previous one.
// Two sequential updates rather than one atomic statement (the Supabase client
// can't express an UPDATE ... FROM in one call); an interleaved request in this
// same narrow window is not a realistic concern for a candidate managing their
// own resumes.
export async function setPrimaryResume(id: string, userId: string): Promise<void> {
  if (!supabase || !userId || !id) return;
  const { error: clearError } = await supabase
    .from('user_resumes')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);
  if (clearError) throw new Error(clearError.message);

  const { error } = await supabase
    .from('user_resumes')
    .update({ is_primary: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function updateUserResume(
  id: string,
  userId: string,
  updates: {
    name?: string;
    type?: 'created' | 'uploaded';
    jobTitle?: string;
    company?: string;
    resumeData?: RawResumeData;
    meta?: ResumeMeta;
  }
): Promise<void> {
  if (!supabase) return;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
  if (updates.company !== undefined) payload.company = updates.company;

  if (updates.resumeData !== undefined) {
    let meta = updates.meta;
    if (!meta) {
      // Preserve the previously stored display meta when this update doesn't touch it
      // (e.g. a plain content autosave shouldn't wipe out an earlier upload's file info).
      const { data: current } = await supabase
        .from('user_resumes')
        .select('resume_data')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      meta = (current?.resume_data && current.resume_data._meta) || {};
    }
    payload.resume_data = { ...updates.resumeData, _meta: meta };
  }

  const { error } = await supabase.from('user_resumes').update(payload).eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteUserResume(id: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré.');
  if (!id || !userId) throw new Error('CV ou utilisateur invalide.');
  const { error } = await supabase.from('user_resumes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);

  // If that deletion left the candidate with no Primary Resume (it was the
  // primary, or the flag was already missing), auto-promote the most recently
  // updated survivor so Cover Letter / Portfolio always have one to use.
  const { data: remaining } = await supabase
    .from('user_resumes')
    .select('id, is_primary')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (remaining && remaining.length > 0 && !remaining.some((r) => r.is_primary)) {
    await supabase
      .from('user_resumes')
      .update({ is_primary: true })
      .eq('id', remaining[0].id)
      .eq('user_id', userId);
  }
}

export async function duplicateUserResume(
  item: ResumeListItem,
  userId: string,
  plan?: string | null
): Promise<ResumeListItem> {
  return createUserResume(
    userId,
    {
      name: `${item.name} (Copie)`,
      type: item.type,
      jobTitle: item.jobTitle,
      company: item.company,
      resumeData: item.resumeData,
      meta: {
        template: item.template,
        atsScore: item.atsScore,
        fileName: item.fileName,
        fileSize: item.fileSize,
        keywordsCount: item.keywordsCount,
      },
    },
    plan
  );
}

// Flattens a resume's structured content into plain text for AI/ATS matching use cases.
export function resumeDataToPlainText(resumeData: RawResumeData): string {
  if (!resumeData) return '';
  const lines: string[] = [];
  const c = resumeData.coordonnees || {};
  if (c.name) lines.push(c.name);
  if (c.jobTitle) lines.push(c.jobTitle);
  if (c.email) lines.push(c.email);
  if (c.phone) lines.push(c.phone);
  if (c.location) lines.push(c.location);
  if (resumeData.profil) lines.push(resumeData.profil);
  if (Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
    lines.push('Expérience :');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumeData.experience.forEach((exp: any) => {
      lines.push(`- ${exp.jobTitle || ''} chez ${exp.company || ''} (${exp.startDate || ''} - ${exp.current ? 'Présent' : exp.endDate || ''})`);
      if (exp.description) lines.push(String(exp.description).replace(/<[^>]*>?/gm, ''));
    });
  }
  if (Array.isArray(resumeData.education) && resumeData.education.length > 0) {
    lines.push('Éducation :');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumeData.education.forEach((edu: any) => lines.push(`- ${edu.degree || ''} - ${edu.institution || ''} (${edu.date || ''})`));
  }
  if (resumeData.competences) lines.push(`Compétences : ${resumeData.competences}`);
  if (resumeData.langues) lines.push(`Langues : ${resumeData.langues}`);
  if (resumeData.interets) lines.push(`Centres d’intérêt : ${resumeData.interets}`);
  if (Array.isArray(resumeData.projets) && resumeData.projets.length > 0) {
    lines.push('Projets :');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumeData.projets.forEach((project: any) => {
      if (project.name) lines.push(project.name);
      if (project.description) lines.push(project.description);
    });
  }
  if (Array.isArray(resumeData.customSections)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumeData.customSections.forEach((section: any) => {
      if (section.title) lines.push(`${section.title} :`);
      if (Array.isArray(section.content)) {
        section.content.forEach((item: unknown) => {
          if (typeof item === 'string' && item.trim()) lines.push(`- ${item.trim()}`);
        });
      }
    });
  }
  return lines.join('\n');
}
