import { JobStatus } from '../types';

export function normalizeJobStatus(status: string | undefined | null, defaultStatus: JobStatus = 'Saved'): JobStatus {
  if (!status) return defaultStatus;
  const s = status.toLowerCase();
  if (s.includes('save') || s === 'enregistré' || s === 'enregistres' || s === 'sauvegardé') return 'Saved';
  if (s.includes('apply') || s.includes('applied') || s === 'postulé' || s === 'postules') return 'Applied';
  if (s.includes('interview') || s === 'entretien' || s === 'entretiens') return 'Interview';
  if (s.includes('offer') || s === 'offre' || s === 'offres') return 'Offer';
  if (s.includes('reject') || s === 'refusé' || s === 'refuses') return 'Rejected';
  return defaultStatus;
}
