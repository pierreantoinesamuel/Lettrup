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
import { PipelineTask, FullPipelineOutput } from '../../application/cv-tailoring/types';

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
      tailoredCv: result.tailoredCv,
      changeSummary: result.changeSummary,
      diffPreview: result.diffPreview,
      matchScore: result.matchScore,
      pipelineResult: result.pipelineResult,
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

function assertSafeIPv6(address: string): void {
  const lower = address.toLowerCase();
  // Loopback, link-local, ULA
  if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    throw new Error('L\'URL pointe vers une adresse réseau privée ou réservée (IPv6).');
  }
  // Unspecified address and multicast (ff00::/8)
  if (lower === '::' || lower.startsWith('ff')) {
    throw new Error('L\'URL pointe vers une adresse réseau privée ou réservée (IPv6).');
  }
  // IPv4-mapped IPv6 ::ffff:x.x.x.x — extract and validate the embedded IPv4
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    assertSafeIPv4(mapped[1]);
  }
  // Same mapping written in hex (::ffff:7f00:1): rebuild the IPv4 and validate it
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
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
      host: ip,          // connect to the validated IP — no second DNS lookup
      port,
      path,
      servername: hostname, // TLS SNI: required for virtual-hosted HTTPS
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
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
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
