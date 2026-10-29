
import { SITE_DOMAIN, LEGACY_DOMAINS } from '../config/brand';/**
 * Shared (client + server) helper to recognize a published-portfolio
 * subdomain, e.g. `jean-dupont-a1b2c3.cvpilot.fr`, and extract its slug.
 *
 * Used by server.ts (SSR/SEO + routing) and App.tsx (client-side routing) so
 * both sides agree on what counts as a portfolio subdomain vs. the main app.
 */

export const DEFAULT_APEX_HOSTS = [SITE_DOMAIN, ...LEGACY_DOMAINS, 'localhost'];

// DNS label rules: lowercase alphanumeric, hyphens allowed but not at the
// edges — matches how buildSlug() in PortfolioBuilder.tsx generates slugs.
const SUBDOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getPortfolioSlugFromHostname(
  hostname: string | undefined | null,
  apexHosts: string[] = DEFAULT_APEX_HOSTS
): string | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase();

  for (const apex of apexHosts) {
    if (host === apex || host === `www.${apex}`) return null;
    const suffix = `.${apex}`;
    if (host.endsWith(suffix)) {
      const sub = host.slice(0, -suffix.length);
      if (sub && !sub.includes('.') && SUBDOMAIN_LABEL_RE.test(sub)) {
        return sub;
      }
    }
  }
  return null;
}
