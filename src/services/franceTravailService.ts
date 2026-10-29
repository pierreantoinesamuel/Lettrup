// Service for France Travail (formerly Pôle Emploi) API integration
// Real data comes from the server-side France Travail OAuth proxy.

export interface FranceTravailJob {
  id: string;
  title: string;
  company: string;
  location: string;
  department?: string;
  contractType: string;
  salary: string;
  description: string;
  requirements: string[];
  publicationDate: string;
  url: string;
  isLiveApi?: boolean;
  contactEmail?: string;
  experienceLevel?: string;
  remoteOption?: string;
  educationLevel?: string;
}

export const SALARY_RANGE_OPTIONS: { value: string; label: string; min: number; max?: number }[] = [
  { value: 'Tous', label: 'Toutes rémunérations', min: 0 },
  { value: '20-30', label: '20 000 € - 30 000 €', min: 20000, max: 30000 },
  { value: '30-40', label: '30 000 € - 40 000 €', min: 30000, max: 40000 },
  { value: '40-50', label: '40 000 € - 50 000 €', min: 40000, max: 50000 },
  { value: '50-60', label: '50 000 € - 60 000 €', min: 50000, max: 60000 },
  { value: '60-80', label: '60 000 € - 80 000 €', min: 60000, max: 80000 },
  { value: '80+', label: '80 000 € et plus', min: 80000 },
];

export const EDUCATION_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'Tous', label: "Indifférent" },
  { value: 'CAP, BEP', label: 'CAP, BEP' },
  { value: 'Bac', label: 'Bac' },
  { value: 'Bac+2', label: 'Bac+2' },
  { value: 'Bac+3, Bac+4', label: 'Bac+3, Bac+4' },
  { value: 'Bac+5 et plus', label: 'Bac+5 et plus' },
];

export const DATE_POSTED_OPTIONS: { value: string; label: string; days: number }[] = [
  { value: 'Tous', label: 'Toutes les dates', days: Infinity },
  { value: '1', label: 'Dernières 24 heures', days: 1 },
  { value: '3', label: '3 derniers jours', days: 3 },
  { value: '7', label: '7 derniers jours', days: 7 },
  { value: '14', label: '14 derniers jours', days: 14 },
  { value: '30', label: '30 derniers jours', days: 30 },
];

export interface FranceTravailCredentials {
  clientId: string;
  clientSecret: string;
}

export function getFranceTravailCredentials(): FranceTravailCredentials {
  return { clientId: '', clientSecret: '' };
}

export function saveFranceTravailCredentials(_clientId: string, _clientSecret: string): void {
  // Server-side credentials are maintained exclusively on the backend.
}

export function clearFranceTravailCredentials(): void {
  // No browser-side credential persistence is used in production.
}

export async function searchFranceTravailJobs(params: {
  keywords?: string;
  location?: string;
  contractType?: string;
  salaryRange?: string;
  educationLevel?: string;
  datePosted?: string;
  page?: number;
}): Promise<{ jobs: FranceTravailJob[]; total: number; isLiveApi: boolean; errorNotice?: string }> {
  try {
    const proxyRes = await fetch('/api/france-travail/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: params.keywords,
        location: params.location,
        contractType: params.contractType,
        salaryRange: params.salaryRange,
        educationLevel: params.educationLevel,
        datePosted: params.datePosted,
        page: params.page,
      }),
    });

    const data = await proxyRes.json();
    if (proxyRes.ok && data?.success && Array.isArray(data.jobs)) {
      return {
        jobs: data.jobs as FranceTravailJob[],
        total: Number.isSafeInteger(data.total) ? data.total : data.jobs.length,
        isLiveApi: true,
      };
    }

    return {
      jobs: [],
      total: 0,
      isLiveApi: false,
      errorNotice: data?.message || 'Les offres France Travail sont temporairement indisponibles.',
    };
  } catch (error) {
    console.error('France Travail search failed:', error);
    return {
      jobs: [],
      total: 0,
      isLiveApi: false,
      errorNotice: 'Les offres France Travail sont temporairement indisponibles.',
    };
  }
}
