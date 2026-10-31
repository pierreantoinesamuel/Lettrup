import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as Sentry from '@sentry/node';

// @ts-ignore
dotenv.config({ path: '.env.local', quiet: true });


import { handleTailorCvRoute } from './src/infrastructure/routes/cvTailorApi.js';
import { handleGenerateApplicationPackRoute, handleDownloadApplicationPackRoute } from './src/infrastructure/routes/applicationPackApi.js';
import { handleAtsScanRoute } from './src/infrastructure/routes/atsScanApi.js';
import { handleGenerateOutreachRoute } from './src/infrastructure/routes/outreachApi.js';
import { handleFranceTravailSearchRoute } from './src/infrastructure/routes/franceTravailApi.js';
import { handleAtsAnalyzeRoute } from './src/infrastructure/routes/atsAnalyzeApi.js';
import { handleLearningResourcesRoute } from './src/infrastructure/routes/learningResourcesApi.js';
import { handlePortfolioContactRoute } from './src/infrastructure/routes/portfolioContactApi.js';
import { handleGetPublicPortfolioRoute } from './src/infrastructure/routes/portfolioPublicApi.js';
import { getPublishedPortfolioBySlug } from './src/infrastructure/portfolio/portfolioSeoRepository.js';
import { getPortfolioSlugFromHostname } from './src/shared/portfolioSubdomain.js';
import { handleContactSupportRoute } from './src/infrastructure/routes/contactSupportApi.js';
import { handleCreateCheckoutSessionRoute } from './src/infrastructure/routes/stripeCheckoutApi.js';
import { handleCreatePortalSessionRoute } from './src/infrastructure/routes/stripePortalApi.js';
import { handleStripeWebhookRoute } from './src/infrastructure/routes/stripeWebhookApi.js';
import { handleCreateExportCheckoutSessionRoute } from './src/infrastructure/routes/stripeExportCheckoutApi.js';
import { handleCreateSetupSessionRoute } from './src/infrastructure/routes/stripeSetupCheckoutApi.js';
import { handlePricingInfoRoute } from './src/infrastructure/routes/stripePricingInfoApi.js';
import { handleCheckExportEntitlementRoute, handleConsumeExportEntitlementRoute } from './src/infrastructure/routes/exportEntitlementApi.js';
import { handleEmployerVerificationRoute } from './src/infrastructure/routes/adminEmployerVerificationApi.js';
import { handleAdminMutationRoute } from './src/infrastructure/routes/adminMutationApi.js';
import { handlePromoteAdminRoute } from './src/infrastructure/routes/adminPromotionApi.js';
import { handleAdminBlogPostsRoute } from './src/infrastructure/routes/adminBlogPostsApi.js';
import { handleDeleteAccountRoute } from './src/infrastructure/routes/deleteAccountApi.js';
import { handleExportAccountRoute } from './src/infrastructure/routes/exportAccountApi.js';
import { handleAiInvokeRoute, handleAdminAiOversightRoute } from './src/infrastructure/routes/aiEngineApi.js';
import { handleResumeExtractRoute } from './src/infrastructure/routes/resumeExtractApi.js';
import { rateLimitMiddleware, checkUserAiRateLimit } from './src/infrastructure/rateLimit/upstashRateLimit.js';
import { verifySupabaseUser } from './src/infrastructure/auth/verifySupabaseUser.js';
import { getPublishedBlogPostForSeo, listPublishedBlogPostsForSitemap } from './src/infrastructure/blog/blogSeoRepository.js';
import { getActiveJobForSeo, listActiveJobsForSitemap } from './src/infrastructure/jobs/jobSeoRepository.js';

import { SITE_DOMAIN, LEGACY_DOMAINS } from './src/config/brand.js';
declare const __dirname: string | undefined;

const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const PORT = 3000;
const HOST = '0.0.0.0';

// The canonical public host used for every absolute URL we generate
// (SEO tags, sitemap, robots.txt). Deliberately NOT derived from the
// request's Host header, which is client-controlled and can be spoofed
// to poison caches / hijack canonical URLs (see security audit 1.3).
const CANONICAL_HOST = process.env.CANONICAL_HOST || SITE_DOMAIN;

// Requires express-side `verifySupabaseUser` on every AI-backed route —
// those proxy paid third-party providers, so an unauthenticated caller
// must never be able to trigger a billable request (see audit 1.7).
async function requireAuth(
  req: express.Request,
  res: express.Response
): Promise<{ id: string; email: string } | null> {
  const user = await verifySupabaseUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return null;
  }
  return user;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripScriptTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

// Escapes JSON destined for a <script type="application/ld+json"> block so
// a value containing "</script>" (or "<!--") can't break out of the tag.
function escapeJsonForScriptTag(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// Path segment for /job/:id and /jobs/:id — only used to look up static
// sample data and to build the canonical URL, but must still be
// allowlisted since it comes straight from the request path (audit 1.1).
const JOB_ID_RE = /^[a-zA-Z0-9-]+$/;

interface RouteSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  isPublic: boolean;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object[];
  bodyHtmlFallback?: string;
}

// TODO(design): logo-icon.png (public/, copied from src/assets/logo-icon.png)
// is a square brand icon, not a dedicated 1200x630 OG share image — it fixes
// the 404 (audit 3.4) and gives social previews a real logo instead of
// nothing, but a proper landscape share image is still worth commissioning
// for optimal Facebook/Twitter card rendering (audit 3.3).
const DEFAULT_OG_IMAGE_PATH = '/logo-icon.png';

// Sample job postings for public job URLs (/jobs/:id or /job/:id)
const SAMPLE_PUBLIC_JOBS: Record<string, { title: string; company: string; location: string; type: string; datePosted: string; description: string }> = {
  'job-101': {
    title: 'Développeur Full Stack Senior (React / Node.js)',
    company: 'TechCorp Solutions',
    location: 'Paris, France (Hybride)',
    type: 'FULL_TIME',
    datePosted: '2026-07-20',
    description: 'TechCorp Solutions recherche un Développeur Full Stack Senior pour piloter la création de nos architectures web SaaS. Maîtrise de React, TypeScript, Node.js et Express requise.'
  },
  'job-102': {
    title: 'Product Manager IA',
    company: 'InnoData France',
    location: 'Lyon, France',
    type: 'FULL_TIME',
    datePosted: '2026-07-22',
    description: 'InnoData recherche un Product Manager passionné par l\'intelligence artificielle pour concevoir la roadmap produit et superviser la livraison des fonctionnalités GenAI.'
  }
};

async function getSeoMetadataForPath(reqPath: string): Promise<RouteSeoMetadata> {
  const baseUrl = `https://${CANONICAL_HOST}`;
  const cleanPath = reqPath.split('?')[0];

  // 1. Landing Page
  if (cleanPath === '/' || cleanPath === '') {
    return {
      title: 'Lettrup — Plateforme IA de Création de CV, Lettres & Préparation aux Entretiens',
      description: 'Découvrez Lettrup, le copilote IA pour vos candidatures : création de CV compatibles ATS, lettres de motivation sur mesure, simulation d\'entretien vocale et portfolios web.',
      canonicalUrl: `${baseUrl}/`,
      isPublic: true,
      ogType: 'website',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'Lettrup',
          'url': baseUrl,
          'logo': `${baseUrl}${DEFAULT_OG_IMAGE_PATH}`,
          'description': 'Plateforme SaaS IA pour l\'accélération de carrière et l\'optimisation de CV ATS.',
          'sameAs': [
            'https://linkedin.com/company/cvpilot',
            'https://twitter.com/cvpilot_fr'
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': 'Lettrup PRO',
          'operatingSystem': 'Web',
          'applicationCategory': 'BusinessApplication',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'EUR',
            'availability': 'https://schema.org/InStock'
          },
          'description': 'Générateur de CV IA sur mesure, analyseur de score ATS et simulateur d\'entretien.'
        }
      ],
      bodyHtmlFallback: `
        <header>
          <h1>Lettrup — Le Copilote IA pour vos Candidatures</h1>
          <p>Créez des CV adaptés sur mesure, réussissez les filtres ATS et décrochez plus d'entretiens.</p>
        </header>
        <section>
          <h2>Fonctionnalités Principales</h2>
          <ul>
            <li>Adaptation automatique de CV à chaque offre d'emploi</li>
            <li>Analyse de score ATS et détection de mots-clés manquants</li>
            <li>Générateur de lettres de motivation personnalisées</li>
            <li>Simulateur d'entretien vocal interactif (Méthode STAR)</li>
          </ul>
        </section>
      `
    };
  }

  // 2. Pricing Page
  if (cleanPath === '/pricing') {
    return {
      title: 'Tarifs & Offres — Lettrup PRO',
      description: 'Offres et abonnements Lettrup : commencez gratuitement avec notre essai de 7 jours, puis débloquez les générations illimitées de CV adaptés, scans ATS et coaching IA.',
      canonicalUrl: `${baseUrl}/pricing`,
      isPublic: true,
      ogType: 'website',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': 'Abonnement Lettrup PRO',
          'description': 'Accès illimité à l\'adaptation de CV IA, scans ATS et coaching vocal d\'entretien.',
          'offers': {
            '@type': 'AggregateOffer',
            'priceCurrency': 'EUR',
            'lowPrice': '1.99',
            'highPrice': '39.99',
            'offerCount': '3'
          }
        }
      ],
      bodyHtmlFallback: `
        <h1>Tarifs & Offres Lettrup</h1>
        <p>Commencez avec 7 jours d'essai gratuit sans engagement.</p>
      `
    };
  }

  // 3. Blog Page
  if (cleanPath === '/blog') {
    return {
      title: 'Blog & Guides Carrière — Lettrup',
      description: 'Astuces de rédaction de CV, préparation aux entretiens avec la méthode STAR, optimisation pour les logiciels ATS et conseils pour décrocher plus d\'entretiens.',
      canonicalUrl: `${baseUrl}/blog`,
      isPublic: true,
      ogType: 'blog',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          'name': 'Blog Lettrup Carrière & IA',
          'description': 'Guides pratiques et conseils d\'experts pour optimiser vos candidatures.'
        }
      ],
      bodyHtmlFallback: `
        <h1>Blog & Guides Carrière Lettrup</h1>
        <p>Retrouvez nos derniers articles pour optimiser votre recherche d'emploi.</p>
      `
    };
  }

  // 3a. Contact & Support Page
  if (cleanPath === '/contact') {
    return {
      title: 'Contact & Support — Lettrup',
      description: "Une question sur Lettrup, votre abonnement ou vos données personnelles ? Contactez notre équipe support, facturation ou confidentialité.",
      canonicalUrl: `${baseUrl}/contact`,
      isPublic: true,
      ogType: 'website',
      bodyHtmlFallback: `
        <h1>Contact & Support Lettrup</h1>
        <p>Une question, un problème technique ou une demande sur vos données personnelles ? Notre équipe vous répond sous 24 à 48h ouvrées.</p>
      `
    };
  }

  // 3a-2. À propos Page
  if (cleanPath === '/a-propos') {
    return {
      title: 'À propos — Lettrup',
      description: "Découvrez pourquoi Lettrup a été créé, et comment nous accompagnons les talents dans leur stratégie de candidature.",
      canonicalUrl: `${baseUrl}/a-propos`,
      isPublic: true,
      ogType: 'website',
      bodyHtmlFallback: `
        <h1>À propos de Lettrup</h1>
        <p>L'histoire derrière Lettrup et comment nous transformons les parcours professionnels.</p>
      `
    };
  }

  // 3b. Blog Article Page (/blog/:slug) — real per-article SSR, backed by
  // the blog_posts table (security/SEO audit 3.2). Falls through to the
  // generic noindex default below if the slug doesn't match a published
  // post, rather than fabricating metadata for content that may not exist.
  const blogSlugMatch = cleanPath.match(/^\/blog\/([a-zA-Z0-9-]+)$/);
  if (blogSlugMatch) {
    const post = await getPublishedBlogPostForSeo(blogSlugMatch[1]);
    if (post) {
      return {
        title: post.seoTitle || `${post.title} — Blog Lettrup`,
        description: post.seoDescription || post.excerpt || post.subtitle || '',
        canonicalUrl: `${baseUrl}/blog/${post.slug}`,
        isPublic: true,
        ogType: 'article',
        ogImage: post.featuredImage || undefined,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': post.title,
            'description': post.excerpt || post.subtitle || '',
            'image': post.featuredImage || undefined,
            'datePublished': post.publishedAt || undefined,
            'dateModified': post.updatedAt,
            'author': post.authorName ? { '@type': 'Person', 'name': post.authorName } : undefined,
            'publisher': { '@type': 'Organization', 'name': 'Lettrup', 'logo': { '@type': 'ImageObject', 'url': `${baseUrl}${DEFAULT_OG_IMAGE_PATH}` } },
          },
        ],
        // title/subtitle are plain text (author-set, not markup) and get
        // spliced into <noscript> via string concatenation below — escape
        // them same as the portfolio/job blocks. contentHtml is intentionally
        // left raw: it's the post's actual rendered HTML body, not a plain
        // text field.
        bodyHtmlFallback: `
          <article>
            <h1>${escapeHtml(post.title)}</h1>
            ${post.subtitle ? `<p>${escapeHtml(post.subtitle)}</p>` : ''}
            ${stripScriptTags(post.contentHtml)}
          </article>
        `,
      };
    }
  }

  // 3b-2. Public Portfolio Page (/p/:slug, or a portfolio subdomain rewritten
  // to this same path by the caller — see getPortfolioSlugFromHostname).
  const portfolioSlugMatch = cleanPath.match(/^\/p\/([a-z0-9-]+)$/);
  if (portfolioSlugMatch) {
    const portfolio = await getPublishedPortfolioBySlug(portfolioSlugMatch[1]);
    if (portfolio) {
      const fullName = (portfolio.resumeData?.fullName as string | undefined) || portfolio.configName;
      const summary = (portfolio.resumeData?.summary as string | undefined) || `Portfolio professionnel de ${fullName}, créé avec Lettrup.`;
      return {
        title: `${fullName} — Portfolio`,
        description: summary,
        canonicalUrl: `${baseUrl}/p/${portfolioSlugMatch[1]}`,
        isPublic: true,
        ogType: 'profile',
        // fullName/summary come from user-controlled resume data (any
        // published portfolio owner can set them to arbitrary text) and this
        // string is spliced into <noscript> via plain concatenation in
        // renderHtmlWithSeo — unescaped, a value like `</noscript><script>`
        // would break out of the noscript wrapper into live, executing HTML.
        bodyHtmlFallback: `
          <article>
            <h1>${escapeHtml(fullName)}</h1>
            <p>${escapeHtml(summary)}</p>
          </article>
        `,
      };
    }
    return {
      title: 'Portfolio introuvable — Lettrup',
      description: "Ce portfolio n'existe pas ou n'est plus publié.",
      canonicalUrl: `${baseUrl}${cleanPath}`,
      isPublic: false,
    };
  }

  // 3c. Templates Gallery
  if (cleanPath === '/templates') {
    return {
      title: 'Modèles de CV professionnels — Lettrup',
      description: 'Explorez notre galerie de modèles de CV modernes, compatibles ATS : one-page, avec photo, professionnels ou créatifs. Choisissez et personnalisez en quelques clics.',
      canonicalUrl: `${baseUrl}/templates`,
      isPublic: true,
      ogType: 'website',
      bodyHtmlFallback: `
        <h1>Modèles de CV professionnels et modernes</h1>
        <p>Une galerie de modèles de CV compatibles ATS, prêts à personnaliser avec Lettrup.</p>
      `,
    };
  }

  // 3d. Privacy Policy
  if (cleanPath === '/privacy') {
    return {
      title: 'Politique de confidentialité — Lettrup',
      description: 'Découvrez comment Lettrup collecte, utilise et protège vos données personnelles, conformément au RGPD.',
      canonicalUrl: `${baseUrl}/privacy`,
      isPublic: true,
      ogType: 'website',
    };
  }

  // 3d. Legal notice
  if (cleanPath === '/mentions-legales') {
    return {
      title: 'Mentions légales — Lettrup',
      description: 'Éditeur, hébergeur et informations légales du site Lettrup.',
      canonicalUrl: `${baseUrl}/mentions-legales`,
      isPublic: true,
      ogType: 'website',
    };
  }

  // 3e. Terms of Service
  if (cleanPath === '/terms') {
    return {
      title: 'Conditions générales — Lettrup',
      description: 'Consultez les conditions générales d\'utilisation et de vente de la plateforme Lettrup.',
      canonicalUrl: `${baseUrl}/terms`,
      isPublic: true,
      ogType: 'website',
    };
  }

  // 3f. Auth pages — kept out of the search index (a signed-out user has
  // nothing to rank), but still get a real title instead of the generic
  // "Espace Utilisateur" fallback (audit 3.1).
  if (cleanPath === '/login' || cleanPath === '/signup' || cleanPath === '/auth') {
    const title = cleanPath === '/signup' ? 'Inscription — Lettrup' : 'Connexion — Lettrup';
    return {
      title,
      description: 'Connectez-vous ou créez votre compte Lettrup pour créer vos CV, lettres de motivation et préparer vos entretiens.',
      canonicalUrl: `${baseUrl}${cleanPath}`,
      isPublic: false,
    };
  }

  // 4. Public Job Posting Page (/job/:id or /jobs/:id)
  const jobMatch = cleanPath.match(/^\/jobs?\/(.+)$/);
  if (jobMatch && JOB_ID_RE.test(jobMatch[1])) {
    const jobId = jobMatch[1];
    const sampleJob = SAMPLE_PUBLIC_JOBS[jobId];
    // Real recruiter-posted jobs (SEO follow-up finding, 2026-08-12): every
    // job that isn't one of the 2 hardcoded demo entries used to fall
    // through to a generic placeholder below — meaning every actual posting
    // on the platform was indexed as near-duplicate content. Now resolved
    // against the real `jobs` table first.
    const realJob = sampleJob ? null : await getActiveJobForSeo(jobId);

    if (!sampleJob && !realJob) {
      // Unknown/expired job id — nothing real to show a crawler, so don't
      // invite indexing of a placeholder page (thin/duplicate content).
      return {
        title: 'Offre d\'emploi introuvable — Lettrup',
        description: 'Cette offre d\'emploi n\'est plus disponible. Consultez nos autres offres sur Lettrup.',
        canonicalUrl: `${baseUrl}/job/${jobId}`,
        isPublic: false,
      };
    }

    const job = sampleJob
      ? { ...sampleJob, datePosted: sampleJob.datePosted }
      : {
          title: realJob!.title,
          company: realJob!.company,
          location: realJob!.location || 'France',
          type: realJob!.type || 'FULL_TIME',
          datePosted: realJob!.createdAt.split('T')[0],
          description: realJob!.description,
        };

    return {
      title: `${job.title} chez ${job.company} — Offre d'Emploi | Lettrup`,
      description: job.description,
      canonicalUrl: `${baseUrl}/job/${jobId}`,
      isPublic: true,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          'title': job.title,
          'description': job.description,
          'datePosted': job.datePosted,
          'employmentType': job.type,
          'hiringOrganization': {
            '@type': 'Organization',
            'name': job.company
          },
          'jobLocation': {
            '@type': 'Place',
            'address': {
              '@type': 'PostalAddress',
              'addressLocality': job.location,
              'addressCountry': 'FR'
            }
          }
        }
      ],
      // title/company/location/description are recruiter-entered plain text
      // (for realJob) and get spliced into <noscript> via string
      // concatenation below — same escaping as the portfolio/blog blocks.
      bodyHtmlFallback: `
        <article>
          <h1>${escapeHtml(job.title)}</h1>
          <p><strong>Entreprise :</strong> ${escapeHtml(job.company)}</p>
          <p><strong>Lieu :</strong> ${escapeHtml(job.location)}</p>
          <p>${escapeHtml(job.description)}</p>
        </article>
      `
    };
  }

  // Default for non-public / authenticated routes (/dashboard, /builder, /admin, etc.)
  return {
    title: 'Espace Utilisateur — Lettrup',
    description: 'Espace sécurisé utilisateur Lettrup.',
    canonicalUrl: `${baseUrl}${cleanPath}`,
    isPublic: false
  };
}

function renderHtmlWithSeo(templateHtml: string, seo: RouteSeoMetadata): string {
  // Ensure lang="fr"
  let html = templateHtml.replace('<html lang="en">', '<html lang="fr">');

  // Build Head tags
  const robotsMeta = seo.isPublic
    ? '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'
    : '<meta name="robots" content="noindex, nofollow" />';

  const jsonLdScripts = (seo.jsonLd || [])
    .map((data) => `<script type="application/ld+json">\n${escapeJsonForScriptTag(JSON.stringify(data, null, 2))}\n</script>`)
    .join('\n');

  // All dynamic strings below are HTML-escaped: seo.title/description/canonicalUrl
  // can derive from request path segments (e.g. /job/:id), so they must never
  // be trusted as raw HTML (reflected XSS — see security audit 1.1).
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonicalUrl = escapeHtml(seo.canonicalUrl);
  const ogType = escapeHtml(seo.ogType || 'website');
  const ogImage = escapeHtml(seo.ogImage || `https://${CANONICAL_HOST}${DEFAULT_OG_IMAGE_PATH}`);

  const headElements = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${robotsMeta}

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:site_name" content="Lettrup" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />

    ${jsonLdScripts}
  `;

  // Inject into <head> (replace title if exists)
  if (html.includes('<title>')) {
    html = html.replace(/<title>.*?<\/title>/s, headElements);
  } else {
    html = html.replace('</head>', `${headElements}\n</head>`);
  }

  // Inject SSR Fallback content into <div id="root"> inside <noscript> for crawlers
  if (seo.bodyHtmlFallback) {
    const rootReplacement = `<div id="root"><noscript><div id="ssr-crawler-content">${seo.bodyHtmlFallback}</div></noscript></div>`;
    html = html.replace('<div id="root"></div>', rootReplacement);
  }

  return html;
}

async function startServer() {
  // Fail-fast in production rather than silently falling back to the mock
  // sender (which logs instead of actually delivering RGPD-relevant email
  // like account-deletion or trial notices) — audit 2.3.
  if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
    throw new Error('[Lettrup Server] RESEND_API_KEY is not configured. Refusing to start in production.');
  }

  const app = express();

  // Render/behind-proxy deployments terminate TLS in front of this process,
  // so without this Express treats the proxy's IP as the client's — that
  // breaks per-IP rate limiting and req.ip everywhere (audit 1.6). Adjust
  // the hop count to match the real number of proxies in front of the app.
  app.set('trust proxy', 1);

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      // Vite's dev middleware injects inline/eval'd HMR scripts that a
      // strict CSP would block, so the policy only applies to the built
      // production bundle (which is 100% self-hosted, no inline scripts).
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              // posthog-js lazy-loads its recorder from the EU assets host.
              scriptSrc: ["'self'", 'https://eu-assets.i.posthog.com'],
              workerSrc: ["'self'", 'blob:'],
              // index.html loads DM Sans / Fraunces / Space Grotesk from Google Fonts.
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              connectSrc: [
                "'self'",
                // html-to-image fetches the web fonts to embed them in the exported PDF.
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com',
                'https://*.supabase.co',
                'https://api.stripe.com',
                'https://api.resend.com',
                'https://*.posthog.com',
              ],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // X-Frame-Options / X-Content-Type-Options / frame-ancestors are all
      // enabled by helmet's defaults; only Permissions-Policy needs a
      // manual header since helmet doesn't set one out of the box.
    })
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

  // HTTPS redirect in production (behind reverse proxy, X-Forwarded-Proto is set).
  if (isProduction) {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] === 'http') {
        res.redirect(301, `https://${req.headers.host}${req.url}`);
        return;
      }
      next();
    });
  }

  // CORS: restrict to known origins in production; permissive in dev.
  const allowedOrigins = isProduction
    ? [`https://${CANONICAL_HOST}`, ...LEGACY_DOMAINS.map(d => `https://${d}`)]
    : undefined;
  app.use(cors({
    origin: isProduction ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
    maxAge: 86400,
  }));

  // Stripe webhook needs the exact raw request bytes to verify Stripe's
  // signature, so it's registered with express.raw() before the global
  // express.json() below ever gets a chance to parse (and re-serialize) it.
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const result = await handleStripeWebhookRoute(req.body, req.headers['stripe-signature'] as string | undefined);
    res.status(result.received ? 200 : 400).json(result);
  });

  // Dedicated resume extraction route (handles large base64 PDFs, scans, DOCX up to 50MB).
  // MUST be registered BEFORE the global express.json({ limit: '100kb' }) below so
  // uploads up to 50MB are not rejected by HTTP 413 Payload Too Large.
  app.post(
    '/api/resume/extract-text',
    express.json({ limit: '50mb' }),
    rateLimitMiddleware,
    async (req, res) => {
      const user = await verifySupabaseUser(req.headers.authorization).catch(() => null);
      const result = await handleResumeExtractRoute(req.body, user);
      const statusCode = result.success
        ? 200
        : result.code === 'AUTH_REQUIRED_FOR_OCR'
          ? 401
          : result.code === 'PAYLOAD_TOO_LARGE'
            ? 413
            : 422;
      res.status(statusCode).json(result);
    }
  );

  app.use(express.json({ limit: '100kb' }));

  // Liveness probe for the host / uptime monitor. Deliberately dependency-free:
  // it answers "is the process up", not "is every provider reachable".
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
  });

  // API Routes
  // AI-backed routes get a shared per-IP rate limit (see upstashRateLimit.ts) —
  // they proxy paid AI providers, so an unbounded client can run up real cost —
  // and now also require a verified Supabase session (audit 1.7): consuming
  // paid AI credits must never be reachable by an anonymous caller.
  app.post('/api/cv/tailor', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const userLimit = await checkUserAiRateLimit(user.id);
    if (!userLimit.allowed) { res.status(429).json({ error: 'Trop de générations. Réessayez dans une heure.' }); return; }
    const result = await handleTailorCvRoute(req.body, user.id);
    res.json(result);
  });

  app.post('/api/application-pack/generate', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const userLimit = await checkUserAiRateLimit(user.id);
    if (!userLimit.allowed) { res.status(429).json({ error: 'Trop de générations. Réessayez dans une heure.' }); return; }
    const result = await handleGenerateApplicationPackRoute(req.body, user.id);
    res.status(result.success ? 200 : 422).json(result);
  });

  app.post('/api/application-pack/download', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const result = await handleDownloadApplicationPackRoute(req.body, user.id, req.headers.authorization);
    res.status(result.success ? 200 : result.code === 'payment_required' ? 402 : 422).json(result);
  });

  app.post('/api/ats/scan', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const userLimit = await checkUserAiRateLimit(user.id);
    if (!userLimit.allowed) { res.status(429).json({ error: 'Trop de générations. Réessayez dans une heure.' }); return; }
    const result = await handleAtsScanRoute(req.body, user.id);
    res.status(result.success ? 200 : 422).json(result);
  });

  app.post('/api/ats/analyze', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const userLimit = await checkUserAiRateLimit(user.id);
    if (!userLimit.allowed) { res.status(429).json({ error: 'Trop de générations. Réessayez dans une heure.' }); return; }
    try {
      const result = await handleAtsAnalyzeRoute(req.body);
      res.json(result);
    } catch {
      res.status(502).json({ error: 'Analyse ATS indisponible. Veuillez réessayer.' });
    }
  });

  app.post('/api/outreach/generate', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const userLimit = await checkUserAiRateLimit(user.id);
    if (!userLimit.allowed) { res.status(429).json({ error: 'Trop de générations. Réessayez dans une heure.' }); return; }
    const result = await handleGenerateOutreachRoute(req.body, user.id);
    res.json(result);
  });

  // Single dispatch endpoint backing every client-side AI feature
  // (resume, ATS, cover letter, interview, LinkedIn, career roadmap, AI
  // coach, salary, learning hub) — see aiEngineApi.ts for why this replaced
  // per-feature client-side calls (provider keys were shipping in the
  // browser bundle).
  app.post('/api/ai/invoke', rateLimitMiddleware, async (req, res) => {
    const result = await handleAiInvokeRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/learning/resources', rateLimitMiddleware, async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const result = await handleLearningResourcesRoute(req.body);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/admin/ai-oversight', rateLimitMiddleware, async (req, res) => {
    const result = await handleAdminAiOversightRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/france-travail/search', rateLimitMiddleware, async (req, res) => {
    const result = await handleFranceTravailSearchRoute(req.body);
    res.json(result);
  });

  app.post('/api/stripe/create-checkout-session', rateLimitMiddleware, async (req, res) => {
    const result = await handleCreateCheckoutSessionRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/stripe/create-portal-session', rateLimitMiddleware, async (req, res) => {
    const result = await handleCreatePortalSessionRoute(req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/stripe/create-export-checkout-session', rateLimitMiddleware, async (req, res) => {
    const result = await handleCreateExportCheckoutSessionRoute(req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/stripe/create-setup-session', rateLimitMiddleware, async (req, res) => {
    const result = await handleCreateSetupSessionRoute(req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.get('/api/stripe/pricing-info', rateLimitMiddleware, async (_req, res) => {
    const result = await handlePricingInfoRoute();
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/export/check-entitlement', rateLimitMiddleware, async (req, res) => {
    const result = await handleCheckExportEntitlementRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/export/consume-entitlement', rateLimitMiddleware, async (req, res) => {
    const result = await handleConsumeExportEntitlementRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.post('/api/admin/employer-verification', rateLimitMiddleware, async (req, res) => {
    const result = await handleEmployerVerificationRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : result.error === 'Accès refusé.' ? 403 : result.error?.includes('SUPABASE_SERVICE_ROLE_KEY') ? 500 : 400).json(result);
  });

  app.post('/api/admin/mutation', rateLimitMiddleware, async (req, res) => {
    const result = await handleAdminMutationRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : result.error === 'Accès refusé.' ? 403 : result.error?.includes('SUPABASE_SERVICE_ROLE_KEY') ? 500 : 400).json(result);
  });

  app.post('/api/admin/promote-admin', rateLimitMiddleware, async (req, res) => {
    const result = await handlePromoteAdminRoute(req.body, req.headers.authorization);
    res.status(result.success ? 200 : result.error === 'Accès refusé.' ? 403 : result.error?.includes('SUPABASE_SERVICE_ROLE_KEY') ? 500 : 400).json(result);
  });

  app.post('/api/admin/blog-posts', rateLimitMiddleware, async (req, res) => {
    const result = await handleAdminBlogPostsRoute(req.body, req.headers.authorization);
    const status = result.success
      ? 200
      : result.error === 'Accès refusé.'
        ? 403
        : result.error === 'Authentification requise.'
          ? 401
          : result.error?.includes('SUPABASE_SERVICE_ROLE_KEY')
            ? 500
            : 400;
    res.status(status).json(result);
  });

  app.post('/api/account/delete', rateLimitMiddleware, async (req, res) => {
    const result = await handleDeleteAccountRoute(req.headers.authorization);
    res.status(result.success ? 200 : 400).json(result);
  });

  app.get('/api/account/export', rateLimitMiddleware, async (req, res) => {
    const result = await handleExportAccountRoute(req.headers.authorization);
    res.status(result.success ? 200 : result.error === 'Authentification requise.' ? 401 : 400).json(result);
  });

  // Public + unauthenticated (a Portfolio Visitor has no account, see CONTEXT.md) —
  // shares the same per-IP limit, plus its own independent per-IP send cap
  // and server-side recipient lookup (see portfolioContactApi.ts / audit 1.4)
  // so it can't be scripted into an open email relay.
  app.post('/api/portfolio/contact', rateLimitMiddleware, async (req, res) => {
    const result = await handlePortfolioContactRoute(req.body, req.ip);
    res.status(result.success ? 200 : 400).json(result);
  });

  // Public + unauthenticated (the /contact page's "Contact & Support" form) —
  // same pattern as portfolio/contact: fixed server-side recipient, own
  // per-IP send cap (see contactSupportApi.ts).
  app.post('/api/contact', rateLimitMiddleware, async (req, res) => {
    const result = await handleContactSupportRoute(req.body, req.ip);
    res.status(result.success ? 200 : 400).json(result);
  });

  // Public + unauthenticated — backs /p/:slug and portfolio subdomains
  // (see src/PortfolioPublicPage.tsx). Read-only, service-role-scoped to
  // published rows only (see portfolioSeoRepository.ts).
  app.get('/api/portfolio/public/:slug', rateLimitMiddleware, async (req, res) => {
    const result = await handleGetPublicPortfolioRoute(req.params.slug);
    res.status(result.success ? 200 : 404).json(result);
  });

  // Dynamic Sitemap XML
  app.get('/sitemap.xml', async (_req, res) => {
    // Never derive this from the request's Host header — it's client-controlled
    // and would let an attacker poison the sitemap with an arbitrary domain
    // (audit 1.3).
    const baseUrl = `https://${CANONICAL_HOST}`;
    const now = new Date().toISOString().split('T')[0];
    const blogPosts = await listPublishedBlogPostsForSitemap();
    const realJobs = await listActiveJobsForSitemap();

    const staticUrls = [
      { loc: `${baseUrl}/`, lastmod: now, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/pricing`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/templates`, lastmod: now, changefreq: 'weekly', priority: '0.7' },
      { loc: `${baseUrl}/blog`, lastmod: now, changefreq: 'daily', priority: '0.8' },
      { loc: `${baseUrl}/a-propos`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
      { loc: `${baseUrl}/contact`, lastmod: now, changefreq: 'monthly', priority: '0.4' },
      { loc: `${baseUrl}/privacy`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
      { loc: `${baseUrl}/terms`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
      { loc: `${baseUrl}/mentions-legales`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
    ];

    const sampleJobUrls = Object.entries(SAMPLE_PUBLIC_JOBS).map(([jobId, job]) => ({
      loc: `${baseUrl}/job/${jobId}`,
      lastmod: job.datePosted,
      changefreq: 'weekly',
      priority: '0.7',
    }));

    const realJobUrls = realJobs.map((job) => ({
      loc: `${baseUrl}/job/${job.id}`,
      lastmod: job.updatedAt.split('T')[0],
      changefreq: 'weekly',
      priority: '0.7',
    }));

    const blogUrls = blogPosts.map((post) => ({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.updatedAt.split('T')[0],
      changefreq: 'monthly',
      priority: '0.6',
    }));

    const urlXml = (u: { loc: string; lastmod: string; changefreq: string; priority: string }) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...staticUrls, ...sampleJobUrls, ...realJobUrls, ...blogUrls].map(urlXml).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemapXml);
  });

  // Robots.txt
  app.get('/robots.txt', (_req, res) => {
    // See sitemap.xml above — same reasoning, never trust the Host header.
    const baseUrl = `https://${CANONICAL_HOST}`;

    const robotsTxt = `User-agent: *
Allow: /
Allow: /pricing
Allow: /templates
Allow: /privacy
Allow: /terms
Allow: /mentions-legales
Allow: /blog
Allow: /contact
Allow: /job/*
Allow: /jobs/*

Disallow: /dashboard
Disallow: /builder
Disallow: /admin
Disallow: /recruiter
Disallow: /login
Disallow: /signup
Disallow: /auth
Disallow: /api/*

Sitemap: ${baseUrl}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    app.use(vite.middlewares);

    // Deliberately app.get, not app.use: Express's app.use(path, ...) mounts
    // the handler and rewrites req.path/req.url relative to the match — with
    // '*' matching the whole URL, that collapsed req.path to '/' for every
    // request, so every dev-mode page (this route, blog posts, jobs, and now
    // portfolios) got the landing page's title/description/canonical instead
    // of its own. app.get doesn't do that path-rewriting, matching how the
    // production branch below (already app.get('*', ...)) always worked.
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      try {
        const rawTemplate = fs.readFileSync(path.resolve(currentDirname, 'index.html'), 'utf-8');
        const viteTransformedTemplate = await vite.transformIndexHtml(req.originalUrl, rawTemplate);

        // A portfolio subdomain (jean-dupont-a1b2c3.cvpilot.fr) serves the
        // same page as /p/jean-dupont-a1b2c3 — rewrite for SEO purposes only,
        // the client-side router does its own equivalent hostname check.
        const portfolioSlugFromHost = getPortfolioSlugFromHostname(req.hostname, [CANONICAL_HOST, 'localhost']);
        const effectivePath = portfolioSlugFromHost ? `/p/${portfolioSlugFromHost}` : req.path;
        const seoMetadata = await getSeoMetadataForPath(effectivePath);
        if (portfolioSlugFromHost) {
          seoMetadata.canonicalUrl = `https://${req.hostname}/`;
        }
        const finalHtml = renderHtmlWithSeo(viteTransformedTemplate, seoMetadata);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          const normalizedPath = filePath.replace(/\\/g, '/');
          if (normalizedPath.includes('/dist/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (normalizedPath.endsWith('/dist/index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );

    app.get('*', async (req, res) => {
      // Missing build assets must not fall through to index.html. Otherwise
      // stale browsers/CDN caches request an old chunk URL, receive HTML, and
      // fail with "Expected a JavaScript-or-Wasm module script".
      if (req.path.startsWith('/assets/') || path.extname(req.path)) {
        res.status(404).set({
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        }).send('Not found');
        return;
      }

      const rawTemplate = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      const portfolioSlugFromHost = getPortfolioSlugFromHostname(req.hostname, [CANONICAL_HOST, 'localhost']);
      const effectivePath = portfolioSlugFromHost ? `/p/${portfolioSlugFromHost}` : req.path;
      const seoMetadata = await getSeoMetadataForPath(effectivePath);
      if (portfolioSlugFromHost) {
        seoMetadata.canonicalUrl = `https://${req.hostname}/`;
      }
      const finalHtml = renderHtmlWithSeo(rawTemplate, seoMetadata);

      res.status(200).set({ 'Cache-Control': 'no-cache', 'Content-Type': 'text/html' }).end(finalHtml);
    });
  }

  // Error tracking + final error handler (must be registered after all routes/middleware)
  if (process.env.VITE_SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Lettrup Server] Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(PORT, HOST, () => {
    console.info(`[Lettrup Server] Express server running on http://${HOST}:${PORT}`);
  });
}

startServer();
