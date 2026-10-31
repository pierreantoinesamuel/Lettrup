/**
 * Infrastructure Layer: API Route Handler for the "Pack candidature"
 * Route: POST /api/application-pack/generate
 *
 * Reads one job offer (pasted text, a France Travail link through the official
 * API, or any other public page) and returns a tailored CV, a cover letter and
 * interview STAR sheets. Generation is open to any signed-in user; what is
 * gated is the *download* (one CV credit + one cover-letter credit, see the
 * export entitlement routes), so a visitor can pay 1.99€ once instead of
 * subscribing.
 *
 * Sites that block automated reading (LinkedIn, Indeed) are never fetched:
 * the user is asked to paste the offer text instead.
 */

import { SupabaseCvRepository } from '../repositories/SupabaseCvRepository';
import { GenerateApplicationPackUseCase, ApplicationPack } from '../../application/application-pack/GenerateApplicationPack';
import { scrapeJobPostingUrl, checkUserScrapeLimit } from './cvTailorApi';
import { getFranceTravailAccessToken } from './franceTravailApi';
import { sealPack, openPack } from '../security/packToken';
import { reserveAiBudget, finalizeAiRun, cancelAiReservation, nextResetDateLabel } from '../../application/billing/AiBudget';
import { EntitlementService } from '../../application/billing/EntitlementGate';
import { TrialLifecycleRepository } from '../repositories/TrialLifecycleRepository';
import { handleCheckExportEntitlementRoute, handleConsumeExportEntitlementRoute } from './exportEntitlementApi';

export interface GenerateApplicationPackApiRequest {
  cvId: string;
  jobPostingUrl?: string;
  jobOfferText?: string;
}

export type ApplicationPackErrorCode =
  | 'invalid_request'
  | 'cv_not_found'
  | 'offer_unreadable'
  | 'budget_reached'
  | 'generation_failed';

export interface GenerateApplicationPackApiResponse {
  success: boolean;
  /** Redacted preview only: the full pack is released by the download route. */
  pack?: ApplicationPack;
  /** Sealed full pack, opaque to the browser. */
  token?: string;
  offerSource?: 'pasted_text' | 'france_travail_api' | 'web_page';
  code?: ApplicationPackErrorCode;
  error?: string;
}

// A full pack (CV + letter + STAR) uses roughly 15-20k tokens; the budget check
// reserves the upper end before any AI call is made.
const EXPECTED_PACK_TOKENS = 20_000;

const MIN_OFFER_CHARS = 250;
const MAX_OFFER_CHARS = 12_000;

const UNREADABLE_MESSAGE =
  "Je n'ai pas pu lire cette offre automatiquement. Ouvrez-la, copiez son texte et collez-le dans le champ prévu.";

// Hosts that forbid or technically block automated reading: never fetched.
const PASTE_ONLY_HOSTS = ['linkedin.com', 'indeed.', 'glassdoor.', 'welcometothejungle.com'];

const WALL_MARKERS = [
  'enable javascript',
  'activez javascript',
  'captcha',
  'verify you are human',
  'access denied',
  'connectez-vous pour',
  'sign in to view',
  'join now to see',
];

function hostOf(url: URL): string {
  return url.hostname.toLowerCase();
}

const JOB_SIGNALS_FR = ['poste', 'contrat', 'cdi', 'cdd', 'candidature', 'expérience', 'compétences', 'missions', 'profil recherché', 'rémunération', 'salaire', 'recrutement', 'postuler'];
const JOB_SIGNALS_EN = ['position', 'contract', 'apply', 'requirements', 'qualifications', 'salary', 'experience', 'responsibilities', 'we are looking'];

function looksLikeRealOffer(text: string): boolean {
  if (text.length < MIN_OFFER_CHARS) return false;
  const lower = text.toLowerCase();
  const wallHits = WALL_MARKERS.filter((marker) => lower.includes(marker)).length;
  if (wallHits >= 1 && text.length < 1500) return false;
  const jobHits = [...JOB_SIGNALS_FR, ...JOB_SIGNALS_EN].filter((s) => lower.includes(s)).length;
  return jobHits >= 2;
}

function extractFranceTravailOfferId(url: URL): string | null {
  const last = url.pathname.split('/').filter(Boolean).pop() || '';
  return /^[0-9A-Za-z]{6,8}$/.test(last) ? last.toUpperCase() : null;
}

async function fetchFranceTravailOfferText(offerId: string): Promise<string | null> {
  try {
    const token = await getFranceTravailAccessToken();
    if (!token) return null;

    const res = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/${offerId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const offer: any = await res.json();

    const lines: string[] = [];
    if (offer.intitule) lines.push(`Intitulé du poste : ${offer.intitule}`);
    if (offer.entreprise?.nom) lines.push(`Entreprise : ${offer.entreprise.nom}`);
    if (offer.lieuTravail?.libelle) lines.push(`Lieu : ${offer.lieuTravail.libelle}`);
    if (offer.typeContratLibelle || offer.typeContrat) lines.push(`Contrat : ${offer.typeContratLibelle || offer.typeContrat}`);
    if (offer.experienceLibelle) lines.push(`Expérience : ${offer.experienceLibelle}`);
    if (offer.description) lines.push('', String(offer.description));
    if (Array.isArray(offer.formations) && offer.formations.length) {
      lines.push('', 'Formation : ' + offer.formations.map((f: any) => [f.domaineLibelle, f.niveauLibelle].filter(Boolean).join(' ')).join(' ; '));
    }
    if (Array.isArray(offer.competences) && offer.competences.length) {
      lines.push('', 'Compétences : ' + offer.competences.map((c: any) => c.libelle).filter(Boolean).join(' ; '));
    }
    if (Array.isArray(offer.qualitesProfessionnelles) && offer.qualitesProfessionnelles.length) {
      lines.push('', 'Qualités professionnelles : ' + offer.qualitesProfessionnelles.map((q: any) => q.libelle).filter(Boolean).join(' ; '));
    }
    return lines.join('\n').trim();
  } catch {
    return null;
  }
}

async function resolveOffer(
  req: GenerateApplicationPackApiRequest,
  callerId: string
): Promise<{ text: string; source: NonNullable<GenerateApplicationPackApiResponse['offerSource']> } | null> {
  const pasted = (req.jobOfferText || '').trim();
  if (pasted.length >= MIN_OFFER_CHARS) {
    return { text: pasted.slice(0, MAX_OFFER_CHARS), source: 'pasted_text' };
  }

  const rawUrl = (req.jobPostingUrl || '').trim();
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }

  // Job pages are served over HTTPS; refusing plain http also keeps the
  // server from being steered at internal HTTP services.
  if (url.protocol !== 'https:') return null;

  const host = hostOf(url);
  if (PASTE_ONLY_HOSTS.some((blocked) => host.includes(blocked))) return null;

  if (host.endsWith('francetravail.fr') || host.endsWith('pole-emploi.fr')) {
    const offerId = extractFranceTravailOfferId(url);
    if (offerId) {
      const text = await fetchFranceTravailOfferText(offerId);
      if (text && looksLikeRealOffer(text)) return { text: text.slice(0, MAX_OFFER_CHARS), source: 'france_travail_api' };
    }
    return null;
  }

  if (!checkUserScrapeLimit(callerId)) return null;

  try {
    const text = await scrapeJobPostingUrl(url.toString());
    if (looksLikeRealOffer(text)) return { text: text.slice(0, MAX_OFFER_CHARS), source: 'web_page' };
  } catch {
    // Falls through to the "paste the text" answer below.
  }
  return null;
}

export async function handleGenerateApplicationPackRoute(
  reqBody: GenerateApplicationPackApiRequest,
  callerId: string
): Promise<GenerateApplicationPackApiResponse> {
  if (!reqBody || typeof reqBody.cvId !== 'string' || !reqBody.cvId) {
    return { success: false, code: 'invalid_request', error: 'Choisissez le CV à adapter.' };
  }
  if (!reqBody.jobPostingUrl && !reqBody.jobOfferText) {
    return { success: false, code: 'invalid_request', error: "Ajoutez le lien ou le texte de l'offre." };
  }

  try {
    // Same account gate as /api/cv/tailor, minus the payment wall: a visitor
    // whose trial ended unpaid is exactly who buys the one-time pack, so only
    // blocked or cancelled accounts are refused here.
    const access = await new EntitlementService(new TrialLifecycleRepository()).checkEntitlement(callerId);
    if (!access.allowed && access.reason !== 'payment_required') {
      return { success: false, code: 'invalid_request', error: 'Votre compte est bloqué ou suspendu.' };
    }

    const repository = new SupabaseCvRepository();
    const baseCv = await repository.getCvById(reqBody.cvId, callerId);
    if (!baseCv?.data) {
      return { success: false, code: 'cv_not_found', error: 'CV introuvable ou accès refusé.' };
    }

    const offer = await resolveOffer(reqBody, callerId);
    if (!offer) {
      return { success: false, code: 'offer_unreadable', error: UNREADABLE_MESSAGE };
    }

    const budget = await reserveAiBudget(callerId, EXPECTED_PACK_TOKENS, 'application_pack', reqBody.cvId);
    if (!budget.allowed) {
      const subscriber = budget.plan === 'pro' || budget.plan === 'plus' || budget.plan === 'max';
      return {
        success: false,
        code: 'budget_reached',
        error: subscriber
          ? `Vous avez atteint votre quota de génération IA pour ce mois. Il se renouvelle le ${nextResetDateLabel()}.`
          : `Vous avez atteint la limite de générations gratuites du mois (renouvelée le ${nextResetDateLabel()}). Passez à Pro pour générer davantage.`,
      };
    }

    const useCase = new GenerateApplicationPackUseCase();
    const startedAt = Date.now();
    let pack: ApplicationPack;
    try {
      pack = await useCase.execute({ jobOfferText: offer.text, masterCv: baseCv.data });
    } catch (err: any) {
      if (budget.reservationId) await finalizeAiRun(budget.reservationId, { tokens: useCase.lastEstimatedTokens, success: false, durationMs: Date.now() - startedAt, error: String(err?.message || '').slice(0, 200) });
      throw err;
    }
    if (budget.reservationId) await finalizeAiRun(budget.reservationId, { tokens: useCase.lastEstimatedTokens, success: true, durationMs: Date.now() - startedAt });

    // The browser only ever receives a redacted preview plus an opaque sealed
    // token; the full pack is released by handleDownloadApplicationPackRoute.
    return { success: true, pack: redactPack(pack), token: sealPack(callerId, pack), offerSource: offer.source };
  } catch (err: any) {
    const message = String(err?.message || '');
    if (message.startsWith('PIPELINE_ERROR:not_a_job_posting')) {
      return { success: false, code: 'offer_unreadable', error: "Ce texte ne ressemble pas à une offre d'emploi. Collez le texte complet de l'annonce." };
    }
    console.error('[Application Pack] Generation failed:', message);
    return { success: false, code: 'generation_failed', error: "La génération a échoué. Réessayez dans un instant." };
  }
}

// ─── Paywall: preview vs. full pack ──────────────────────────────────────────

/** What a visitor may see before paying: enough to judge the quality, not enough to use the pack. */
function redactPack(pack: ApplicationPack): ApplicationPack {
  const paragraphs = pack.coverLetter.body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  return {
    ...pack,
    tailoredCv: {
      ...pack.tailoredCv,
      experience: pack.tailoredCv.experience.map((exp, index) => (index === 0 ? exp : { ...exp, bullets: [] })),
      education: [],
      skills: [],
    },
    coverLetter: { subject: pack.coverLetter.subject, body: paragraphs.slice(0, 1).join('\n\n') },
    starSheets: pack.starSheets.map((sheet, index) =>
      index === 0
        ? sheet
        : { ...sheet, situation: '', task: '', action: '', result: '', tip: '' }
    ),
  };
}

export interface DownloadApplicationPackApiRequest {
  token: string;
}

export interface DownloadApplicationPackApiResponse {
  success: boolean;
  pack?: ApplicationPack;
  code?: 'payment_required' | 'invalid_token' | 'credit_failed';
  reason?: 'quota_exceeded' | 'no_subscription';
  error?: string;
}

/**
 * Releases the full pack. Both credits (CV + cover letter) are checked first
 * and only then consumed, cover letter first since it is the scarcer one.
 */
export async function handleDownloadApplicationPackRoute(
  reqBody: DownloadApplicationPackApiRequest,
  callerId: string,
  authorizationHeader: string | undefined
): Promise<DownloadApplicationPackApiResponse> {
  if (!reqBody || typeof reqBody.token !== 'string' || !reqBody.token) {
    return { success: false, code: 'invalid_token', error: 'Pack introuvable. Générez-le à nouveau.' };
  }

  let pack: ApplicationPack | null = null;
  try {
    pack = openPack<ApplicationPack>(callerId, reqBody.token);
  } catch (err: any) {
    console.error('[Application Pack] Token unavailable:', err.message);
    return { success: false, code: 'invalid_token', error: 'Le téléchargement est momentanément indisponible.' };
  }
  if (!pack) {
    return { success: false, code: 'invalid_token', error: 'Ce pack a expiré. Générez-le à nouveau.' };
  }

  const [cv, letter] = await Promise.all([
    handleCheckExportEntitlementRoute({ documentType: 'cv' }, authorizationHeader),
    handleCheckExportEntitlementRoute({ documentType: 'cover_letter' }, authorizationHeader),
  ]);
  if (!cv.entitled || !letter.entitled) {
    return {
      success: false,
      code: 'payment_required',
      reason: letter.reason || cv.reason,
      error: 'Un pack à 1,99 € est nécessaire pour télécharger ce contenu.',
    };
  }

  const letterDone = await handleConsumeExportEntitlementRoute({ documentType: 'cover_letter', format: 'pdf' }, authorizationHeader);
  if (!letterDone.success) {
    return { success: false, code: 'credit_failed', error: 'Impossible de valider votre crédit. Réessayez dans un instant.' };
  }
  const cvDone = await handleConsumeExportEntitlementRoute({ documentType: 'cv', format: 'pdf' }, authorizationHeader);
  if (!cvDone.success) {
    return { success: false, code: 'credit_failed', error: 'Impossible de valider votre crédit. Réessayez dans un instant.' };
  }

  return { success: true, pack };
}
