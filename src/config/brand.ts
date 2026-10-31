/**
 * Single source of truth for the brand's public identity.
 *
 * The product name is fixed here. The domain (and every address and URL built
 * from it) comes from ONE variable, so moving to a new domain is a
 * configuration change, not a code change:
 *
 *   VITE_SITE_DOMAIN=lettrup.fr   (front end: baked in at build time)
 *   SITE_DOMAIN=lettrup.fr        (server: read at start-up)
 *
 * Until it is set, the current domain keeps working exactly as before.
 * This module is shared by the browser bundle and the Node server, so it only
 * touches environment access defensively.
 */

const viteEnv: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const nodeEnv: Record<string, string | undefined> = typeof process !== 'undefined' && process.env ? process.env : {};

const FALLBACK_DOMAIN = 'lettrup.fr';

export const BRAND_NAME = 'Lettrup';
export const PUBLISHER_NAME = 'Linker Automation Tech';

export const SITE_DOMAIN: string = (
  viteEnv.VITE_SITE_DOMAIN ||
  nodeEnv.SITE_DOMAIN ||
  nodeEnv.CANONICAL_HOST ||
  FALLBACK_DOMAIN
).trim().toLowerCase();

export const SITE_URL = `https://${SITE_DOMAIN}`;

/** Domains the site was reachable on before; kept so old links and portfolio sub-domains keep resolving during a move. */
export const LEGACY_DOMAINS = ['cvpilot.fr'];

/**
 * Only two mailboxes, so a single person can follow them:
 *  - contact: general, privacy (RGPD), partnerships and legal requests
 *  - support: technical help, billing and subscriptions
 */
export const EMAILS = {
  contact: `contact@${SITE_DOMAIN}`,
  support: `support@${SITE_DOMAIN}`,
} as const;
