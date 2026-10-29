/**
 * Portfolio themes offered in the builder.
 *
 * Nine genuinely different layouts (see portfolioThemes.tsx). Portfolios saved
 * before this redesign stored the id of an older template ('tech', 'wes-bold',
 * 'executive'...): LEGACY_TEMPLATE_MAP keeps them rendering with the closest
 * new theme, so nothing already published breaks.
 */

export type PortfolioThemeId = 'editorial' | 'bento' | 'cabinet' | 'studio' | 'swiss' | 'atelier' | 'aurore' | 'brutal' | 'carnet';

/** Ids that may still be stored in a saved portfolio configuration. */
export type LegacyWebsiteTemplate =
  | 'tech'
  | 'executive'
  | 'minimal'
  | 'sidebar'
  | 'creative'
  | 'modern'
  | 'brittany-spotlight'
  | 'paco-craft'
  | 'rauno-swiss'
  | 'josh-playful'
  | 'bruno-arcade'
  | 'guillermo-terminal'
  | 'lynn-brutalist'
  | 'kent-indie'
  | 'wes-bold';

export type WebsiteTemplate = PortfolioThemeId | LegacyWebsiteTemplate;

export type PortfolioTemplateCategory = 'all' | 'clair' | 'marque';

export interface PortfolioTemplateMeta {
  id: PortfolioThemeId;
  name: string;
  /** Who the theme suits, shown in the gallery. */
  audience: string;
  category: Exclude<PortfolioTemplateCategory, 'all'>;
  badge: string;
  description: string;
  previewBg: string;
  previewSurface: string;
  previewAccent: string;
  previewText: string;
}

export const LEGACY_TEMPLATE_MAP: Record<LegacyWebsiteTemplate, PortfolioThemeId> = {
  tech: 'studio',
  'brittany-spotlight': 'studio',
  'guillermo-terminal': 'studio',
  'bruno-arcade': 'studio',
  'wes-bold': 'studio',
  'paco-craft': 'editorial',
  minimal: 'editorial',
  'rauno-swiss': 'swiss',
  'lynn-brutalist': 'swiss',
  'josh-playful': 'bento',
  modern: 'bento',
  'kent-indie': 'cabinet',
  executive: 'cabinet',
  sidebar: 'cabinet',
  creative: 'atelier',
};

const THEME_IDS: PortfolioThemeId[] = ['editorial', 'bento', 'cabinet', 'studio', 'swiss', 'atelier', 'aurore', 'brutal', 'carnet'];

/** Maps any stored template id (new or legacy) to one of the nine themes. */
export function resolvePortfolioTemplateId(id?: string | null): PortfolioThemeId {
  if (id && (THEME_IDS as string[]).includes(id)) return id as PortfolioThemeId;
  if (id && id in LEGACY_TEMPLATE_MAP) return LEGACY_TEMPLATE_MAP[id as LegacyWebsiteTemplate];
  return 'bento';
}

export const PORTFOLIO_TEMPLATES_CATALOG: PortfolioTemplateMeta[] = [
  {
    id: 'editorial',
    name: 'Éditorial',
    audience: 'Communication, marketing, RH, conseil',
    category: 'clair',
    badge: 'Serif & papier',
    description: 'Papier crème, grand titre en serif léger, mise en page aérée comme un magazine.',
    previewBg: '#f6f1e7',
    previewSurface: '#ffffff',
    previewAccent: '#b4452a',
    previewText: '#1b1a17',
  },
  {
    id: 'bento',
    name: 'Bento clair',
    audience: 'Tous les métiers',
    category: 'clair',
    badge: 'Tuiles',
    description: 'Une grille de tuiles de tailles différentes : présentation, chiffres, projets, compétences.',
    previewBg: '#f3f4f7',
    previewSurface: '#ffffff',
    previewAccent: '#2f5bff',
    previewText: '#0f172a',
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    audience: 'Finance, comptabilité, juridique, management',
    category: 'clair',
    badge: 'Sobre & chiffré',
    description: 'Bleu nuit et ivoire, chiffres clés tirés de votre CV, parcours détaillé.',
    previewBg: '#0e2a47',
    previewSurface: '#faf7f0',
    previewAccent: '#c9a96b',
    previewText: '#ffffff',
  },
  {
    id: 'studio',
    name: 'Studio',
    audience: 'Développeurs, designers, créatifs numériques',
    category: 'marque',
    badge: 'Grand format',
    description: 'Fond charbon, noms de projets en très grand, un seul accent vif.',
    previewBg: '#0c0c0d',
    previewSurface: '#1a1a1c',
    previewAccent: '#d7ff3f',
    previewText: '#f2f0eb',
  },
  {
    id: 'swiss',
    name: 'Suisse',
    audience: 'Designers, architectes, métiers créatifs',
    category: 'marque',
    badge: 'Grille visible',
    description: 'Noir et blanc, grille typographique apparente, un accent rouge.',
    previewBg: '#f2f2f0',
    previewSurface: '#ffffff',
    previewAccent: '#e10600',
    previewText: '#0a0a0a',
  },
  {
    id: 'atelier',
    name: 'Atelier',
    audience: 'Indépendants, artisans, santé, bien-être',
    category: 'marque',
    badge: 'Chaleureux',
    description: 'Tons terre et sauge, formes arrondies, votre photo en arche.',
    previewBg: '#f1e9dc',
    previewSurface: '#fbf7f1',
    previewAccent: '#c8693a',
    previewText: '#2b2a26',
  },
  {
    id: 'aurore',
    name: 'Aurore',
    audience: 'Freelances, marketing digital, produit, start-up',
    category: 'clair',
    badge: 'Dégradé & verre',
    description: 'Dégradé pastel lumineux, cartes translucides et grand portrait centré.',
    previewBg: '#efe7fb',
    previewSurface: '#ffffff',
    previewAccent: '#6d5bd0',
    previewText: '#2a2540',
  },
  {
    id: 'carnet',
    name: 'Carnet',
    audience: 'Tous les métiers, profils sobres',
    category: 'clair',
    badge: 'Page de notes',
    description: 'Une seule colonne étroite, texte net et listes simples, sans décor.',
    previewBg: '#ffffff',
    previewSurface: '#f3f3ef',
    previewAccent: '#1c1c1a',
    previewText: '#1c1c1a',
  },
  {
    id: 'brutal',
    name: 'Brutal',
    audience: 'Créatifs, événementiel, commerce, jeunes diplômés',
    category: 'marque',
    badge: 'Contours & couleurs',
    description: 'Gros contours noirs, ombres franches et aplats de couleurs vives.',
    previewBg: '#fffbea',
    previewSurface: '#ffd23f',
    previewAccent: '#ff8fc7',
    previewText: '#111111',
  },
];

export function getPortfolioTemplateMeta(id: string): PortfolioTemplateMeta {
  const resolved = resolvePortfolioTemplateId(id);
  return PORTFOLIO_TEMPLATES_CATALOG.find((item) => item.id === resolved) || PORTFOLIO_TEMPLATES_CATALOG[0];
}
