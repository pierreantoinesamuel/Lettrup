/**
 * Infrastructure Layer: SupabaseCvRepository
 * Repository methods for persisting and fetching CV versions in Supabase Postgres.
 */

import { TailoredCv } from '../../domain/cv-tailoring/TailoredCv';
import { SavedResume, ResumeProfile } from '../../types';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';

export class SupabaseCvRepository {
  /**
   * Persists a tailored CV as a new row the caller owns. There's no
   * cv_versions table — tailored CVs live alongside originals in
   * user_resumes, same as ResumeList.tsx's "duplicate" flow.
   */
  async saveTailoredCvVersion(tailoredCv: TailoredCv, userId: string): Promise<void> {
    const admin = getSupabaseAdminClient();
    // The domain layer stamps a non-UUID id (`tailored-<timestamp>`), but
    // user_resumes.id is a uuid column — generate the real row id here and
    // mutate the (by-reference) domain object so the id returned to the
    // client matches what was actually persisted.
    const rowId = crypto.randomUUID();
    const { error } = await admin.from('user_resumes').insert({
      id: rowId,
      user_id: userId,
      name: tailoredCv.name,
      type: 'created',
      job_title: tailoredCv.jobTitle,
      resume_data: tailoredCv.data,
      is_primary: false,
    });
    if (error) {
      throw new Error(`Failed to save tailored CV: ${error.message}`);
    }
    tailoredCv.id = rowId;
  }

  /**
   * Fetches a CV by id, scoped to its owner — a caller can never read
   * another user's CV by guessing/passing a different cvId.
   */
  async getCvById(cvId: string, userId: string): Promise<SavedResume | null> {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from('user_resumes')
      .select('id, name, job_title, resume_data')
      .eq('id', cvId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      jobTitle: data.job_title || undefined,
      data: (data.resume_data || {}) as ResumeProfile,
    };
  }
}
