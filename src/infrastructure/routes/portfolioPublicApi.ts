/**
 * Infrastructure Layer: API Route Handler for reading a published portfolio
 * Route: GET /api/portfolio/public/:slug
 *
 * Backs the public portfolio page (src/PortfolioPublicPage.tsx), reachable
 * either via /p/:slug or via a published-portfolio subdomain
 * (jean-dupont-a1b2c3.cvpilot.fr) — see src/shared/portfolioSubdomain.ts.
 * Anonymous visitors have no session, so this goes through the service-role
 * repository rather than a client-side RLS-scoped query.
 */

import { getPublishedPortfolioBySlug } from '../portfolio/portfolioSeoRepository';

export interface PortfolioPublicApiResponse {
  success: boolean;
  portfolio?: {
    configName: string;
    template: string;
    sections: string[];
    resumeData: Record<string, unknown>;
  };
  error?: string;
}

export async function handleGetPublicPortfolioRoute(slug: string | undefined): Promise<PortfolioPublicApiResponse> {
  const portfolio = await getPublishedPortfolioBySlug(slug);
  if (!portfolio) {
    return { success: false, error: 'Portfolio introuvable ou non publié.' };
  }
  return {
    success: true,
    portfolio: {
      configName: portfolio.configName,
      template: portfolio.template,
      sections: portfolio.sections,
      resumeData: portfolio.resumeData,
    },
  };
}
