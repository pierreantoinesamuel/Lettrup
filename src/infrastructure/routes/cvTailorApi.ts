/**
 * Infrastructure Layer: API Route Handler for CV Tailoring
 * Route: POST /api/cv/tailor
 *
 * Scraping boundary: if the caller provides jobPostingUrl instead of jobOfferText,
 * this handler fetches and strips the HTML to plain text before forwarding to the use
 * case. The AI pipeline never receives a URL — only plain text.
 */

import nodeDns from 'dns';
import nodeHttp from 'http';
import nodeHttps from 'https';
import { AdaptCvToJobOfferUseCase, AdaptCvInput } from '../../application/cv-tailoring/AdaptCvToJobOffer';
import { SupabaseCvRepository } from '../repositories/SupabaseCvRepository';
import { sanitizeAiJson } from '../../shared/ai/sanitizeAiOutput';
import { PipelineTask, FullPipelineOutput } from '../../application/cv-tailoring/types';

const MAX_SCRAPES_PER_USER_PER_DAY = 15;
const scrapeCounters = new Map<string, { count: number; resetAt: number }>();

export function checkUserScrapeLimit(userId: string): boolean {
  const now = Date.now();
  const entry = scrapeCounters.get(userId);
  if (!entry || now > entry.resetAt) {
    scrapeCounters.set(userId, { count: 1, resetAt: now + 86_400_000 });
    return true;
  }
  if (entry.count >= MAX_SCRAPES_PER_USER_PER_DAY) return false;
  entry.count++;
  return true;
}

export interface TailorCvApiRequest {
  cvId: string;
  jobOfferText?: string;
  jobOfferId?: string;
  jobPostingUrl?: string;
  task?: PipelineTask;
  userProfile?: {
    name?: string;
    targetRole?: string;
    preferredTone?: string;
    language?: string;
  };
}

export interface TailorCvApiResponse {
  success: boolean;
  tailoredCv?: unknown;
  changeSummary?: string[];
  diffPreview?: {
    originalSummary: string;
    tailoredSummary: string;
  };
  matchScore?: number;
  pipelineResult?: FullPipelineOutput;
  error?: string;
}

export async function handleTailorCvRoute(
  reqBody: TailorCvApiRequest,
  callerId: string
): Promise<TailorCvApiResponse> {
  try {
    const repository = new SupabaseCvRepository();
    const useCase = new AdaptCvToJobOfferUseCase();

    const baseCv = await repository.getCvById(reqBody.cvId, callerId);
    if (!baseCv) {
      return { success: false, error: 'CV introuvable ou accès refusé.' };
    }

    // Scraping boundary: resolve URL → plain text before the pipeline
    let jobOfferText = reqBody.jobOfferText;
    let sourceUrl = reqBody.jobPostingUrl;

    if (!jobOfferText && reqBody.jobPostingUrl) {
      if (!checkUserScrapeLimit(callerId)) {
        return { success: false, error: 'Limite de récupération d\'URL atteinte pour aujourd\'hui. Collez le texte de l\'offre à la place.' };
      }
      jobOfferText = await scrapeJobPostingUrl(reqBody.jobPostingUrl);
    }

    const adaptInput: AdaptCvInput = {
      cvId: reqBody.cvId,
      jobOfferText,
      jobOfferId: reqBody.jobOfferId,
      sourceUrl,
      task: reqBody.task ?? 'full_pipeline',
      userProfile: reqBody.userProfile,
    };

    const result = await useCase.execute(
      adaptInput,
      baseCv,
      callerId,
      (tailoredCv) => repository.saveTailoredCvVersion(tailoredCv, callerId)
    );

    return {
      success: true,
      tailoredCv: sanitizeAiJson(result.tailoredCv),
      changeSummary: result.changeSummary?.map(s => sanitizeAiJson(s)),
      diffPreview: result.diffPreview ? sanitizeAiJson(result.diffPreview) : undefined,
      matchScore: result.matchScore,
      pipelineResult: result.pipelineResult ? sanitizeAiJson(result.pipelineResult) : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Une erreur est survenue lors de la personnalisation du CV.',
    };
  }
}

// ─── SSRF guard ──────────────────────────────────────────────────────────────
// Resolves the hostname once, validates every returned IP, then connects
// directly to the validated IP so fetch() never re-resolves DNS (prevents
// DNS-rebinding attacks). The original hostname is carried only in the
// Host header and TLS SNI field, never used for connection routing.

function ipv4ToBigInt(a: number, b: number, c: number, d: number): bigint {
  return (BigInt(a) << 24n) | (BigInt(b) << 16n) | (BigInt(c) << 8n) | BigInt(d);
}

// All private / reserved IPv4 ranges. Extended to include CGNAT (100.64/10),
// multicast (224/4), TEST-NET (192.0.2/24, 198.51.100/24, 203.0.113/24),
// and reserved (240/4) so they can't be reached via redirect tricks.
const BLOCKED_IPV4_RANGES: Array<{ start: bigint; end: bigint }> = [
  { start: ipv4ToBigInt(0, 0, 0, 0),       end: ipv4ToBigInt(0, 255, 255, 255) },       // 0.0.0.0/8
  { start: ipv4ToBigInt(10, 0, 0, 0),      end: ipv4ToBigInt(10, 255, 255, 255) },      // 10/8 private
  { start: ipv4ToBigInt(100, 64, 0, 0),    end: ipv4ToBigInt(100, 127, 255, 255) },     // 100.64/10 CGNAT
  { start: ipv4ToBigInt(127, 0, 0, 0),     end: ipv4ToBigInt(127, 255, 255, 255) },     // 127/8 loopback
  { start: ipv4ToBigInt(169, 254, 0, 0),   end: ipv4ToBigInt(169, 254, 255, 255) },     // 169.254/16 link-local / AWS metadata
  { start: ipv4ToBigInt(172, 16, 0, 0),    end: ipv4ToBigInt(172, 31, 255, 255) },      // 172.16/12 private
  { start: ipv4ToBigInt(192, 0, 2, 0),     end: ipv4ToBigInt(192, 0, 2, 255) },         // 192.0.2/24 TEST-NET-1
  { start: ipv4ToBigInt(192, 168, 0, 0),   end: ipv4ToBigInt(192, 168, 255, 255) },     // 192.168/16 private
  { start: ipv4ToBigInt(198, 51, 100, 0),  end: ipv4ToBigInt(198, 51, 100, 255) },      // 198.51.100/24 TEST-NET-2
  { start: ipv4ToBigInt(203, 0, 113, 0),   end: ipv4ToBigInt(203, 0, 113, 255) },       // 203.0.113/24 TEST-NET-3
  { start: ipv4ToBigInt(224, 0, 0, 0),     end: ipv4ToBigInt(239, 255, 255, 255) },     // 224/4 multicast
  { start: ipv4ToBigInt(240, 0, 0, 0),     end: ipv4ToBigInt(255, 255, 255, 254) },     // 240/4 reserved
  { start: ipv4ToBigInt(255, 255, 255, 255), end: ipv4ToBigInt(255, 255, 255, 255) },   // broadcast
];

function assertSafeIPv4(address: string): void {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error('Adresse IPv4 invalide.');
  }
  const num = ipv4ToBigInt(parts[0], parts[1], parts[2], parts[3]);
  if (BLOCKED_IPV4_RANGES.some((r) => num >= r.start && num <= r.end)) {
    throw new Error('L\'URL pointe vers une adresse réseau privée ou réservée.');
  }
}

function expandIPv6(addr: string): string {
  let full = addr.toLowerCase().replace(/\.$/, '');
  if (full.includes('::')) {
    const [left, right] = full.split('::');
    const lParts = left ? left.split(':') : [];
    const rParts = right ? right.split(':') : [];
    const fill = 8 - lParts.length - rParts.length;
    full = [...lParts, ...Array(Math.max(fill, 0)).fill('0'), ...rParts].join(':');
  }
  return full.split(':').map((g) => g.padStart(4, '0')).join(':');
}

function extractEmbeddedIPv4(expanded: string): string | null {
  const groups = expanded.split(':');
  if (groups.length !== 8) return null;
  const prefix = groups.slice(0, 6);
  const hi = parseInt(groups[6], 16);
  const lo = parseInt(groups[7], 16);
  const isV4Mapped = prefix.slice(0, 5).every((g) => g === '0000') && prefix[5] === 'ffff';
  const isV4Compat = prefix.every((g) => g === '0000') && (hi !== 0 || lo !== 0);
  const isNAT64 = prefix[0] === '0064' && prefix[1] === 'ff9b' && prefix.slice(2).every((g) => g === '0000');
  if (isV4Mapped || isV4Compat || isNAT64) {
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

function assertSafeIPv6(address: string): void {
  const lower = address.toLowerCase();
  const expanded = expandIPv6(lower);

  const embeddedV4 = extractEmbeddedIPv4(expanded);
  if (embeddedV4) {
    assertSafeIPv4(embeddedV4);
    return;
  }

  const dottedMapped = lower.match(/^[0:]*:?:ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dottedMapped) {
    assertSafeIPv4(dottedMapped[1]);
    return;
  }

  const blocked =
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('ff') ||
    expanded.startsWith('2001:0db8:') ||
    expanded.startsWith('2001:0000:') ||
    expanded.startsWith('2002:') ||
    expanded.startsWith('0100:0000:0000:0000:');

  if (blocked) {
    throw new Error('L\'URL pointe vers une adresse réseau privée ou réservée (IPv6).');
  }

  if (expanded.startsWith('2002:')) {
    const hi = parseInt(expanded.split(':')[1], 16);
    const lo = parseInt(expanded.split(':')[2], 16);
    assertSafeIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
}

// Resolves hostname → validates ALL returned IPs → returns the first validated
// IP and its family for use as the direct connection target.
async function resolveAndValidateHost(hostname: string): Promise<{ ip: string; family: 4 | 6 }> {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '');

  let records: { address: string; family: number }[];
  try {
    records = await nodeDns.promises.lookup(normalizedHost, { all: true });
  } catch {
    throw new Error('Impossible de résoudre l\'hôte de l\'URL fournie.');
  }

  if (!records.length) throw new Error('Aucune adresse IP trouvée pour l\'hôte.');

  for (const { address, family } of records) {
    if (family === 4) {
      assertSafeIPv4(address);
    } else {
      assertSafeIPv6(address);
    }
  }

  const first = records[0];
  return { ip: first.address, family: first.family as 4 | 6 };
}

// Makes a single HTTP/HTTPS request directly to `ip` (no DNS lookup),
// carrying `hostname` only in the Host header and TLS SNI.
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB — generous for a job posting page

function requestDirect(
  method: string,
  protocol: 'http:' | 'https:',
  ip: string,
  port: number,
  path: string,
  hostname: string
): Promise<{ statusCode: number; headers: nodeHttp.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const options: nodeHttps.RequestOptions = {
      method,
      host: ip,
      port,
      path,
      servername: hostname,
      headers: {
        Host: hostname,
        'User-Agent': 'CVPilot-Bot/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 10_000,
    };

    const lib = protocol === 'https:' ? nodeHttps : nodeHttp;
    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          req.destroy();
          reject(new Error('La page dépasse la taille maximale autorisée.'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      );
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout lors de la récupération de l\'URL.')); });
    req.end();
  });
}

export async function scrapeJobPostingUrl(url: string): Promise<string> {
  // 1. Parse and enforce http/https only
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL de l\'offre d\'emploi invalide.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Seules les URLs http/https sont acceptées.');
  }

  const MAX_REDIRECTS = 5;
  let currentUrl = parsed;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // 2. Resolve + validate — returns the IP we will actually connect to
    const { ip } = await resolveAndValidateHost(currentUrl.hostname);
    const port = currentUrl.port
      ? parseInt(currentUrl.port, 10)
      : currentUrl.protocol === 'https:' ? 443 : 80;

    // 3. Connect directly to the validated IP, not the hostname
    const { statusCode, headers, body } = await requestDirect(
      'GET',
      currentUrl.protocol as 'http:' | 'https:',
      ip,
      port,
      currentUrl.pathname + currentUrl.search,
      currentUrl.hostname
    );

    if (statusCode >= 300 && statusCode < 400) {
      const location = headers['location'];
      if (!location) throw new Error('Redirection sans en-tête Location.');
      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location, currentUrl.toString());
      } catch {
        throw new Error('URL de redirection invalide.');
      }
      if (redirectUrl.protocol !== 'https:' && redirectUrl.protocol !== 'http:') {
        throw new Error('Redirection vers un protocole non autorisé.');
      }
      currentUrl = redirectUrl;
      continue;
    }

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Impossible de récupérer l'offre d'emploi depuis l'URL fournie (${statusCode}).`);
    }

    return stripHtmlToText(body);
  }

  throw new Error('Trop de redirections lors de la récupération de l\'URL.');
}

function stripHtmlToText(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Replace block-level tags with newlines
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    // Collapse excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
