/**
 * Infrastructure Layer: SupabaseAtsRepository
 * Handles persistence for ATS scan reports in Supabase Postgres (scan_history table).
 */

import { AtsScanReport } from '../../domain/ats-engine/AtsScanReport';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';

export interface AtsScanSnapshot {
  companyName?: string;
  resumeName: string;
  resumeText: string;
  jobDescription: string;
}

export class SupabaseAtsRepository {
  async saveAtsScanReport(report: AtsScanReport, userId: string, snapshot: AtsScanSnapshot): Promise<void> {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from('scan_history').insert({
      id: report.id,
      user_id: userId,
      scan_date: report.scannedAt,
      company: snapshot.companyName || '',
      role: report.jobOfferTitle,
      score: report.scores.overallScore,
      status: 'Saved',
      analysis_results: report,
      job_description: snapshot.jobDescription,
      resume_snapshot: { name: snapshot.resumeName, text: snapshot.resumeText },
      missing_keywords: report.keywords.filter((k) => !k.foundInCv).map((k) => k.keyword),
      suggestions: report.recommendedBulletPoints,
    });
    if (error) {
      throw new Error(`Failed to save ATS scan report: ${error.message}`);
    }
  }

  async getScanHistoryByCvId(cvId: string): Promise<AtsScanReport[]> {
    // scan_history has no cv_id column — history is keyed by user_id only
    // (see saveAtsScanReport). Not needed by any current caller.
    void cvId;
    return [];
  }
}
