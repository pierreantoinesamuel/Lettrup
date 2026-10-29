import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Sparkles,
  Columns,
  Camera,
  Briefcase,
  FileCheck,
  Globe,
  ArrowRight,
  Eye,
  X,
  Check
} from 'lucide-react';
import { TemplateType } from './templates';
import { usePageSEO } from './hooks/usePageSEO';
import CompactCvSample from './components/dashboard/CompactCvSample';

interface TemplatesGalleryProps {
  inDashboard?: boolean;
}

export type CategoryKey =
  | 'all'
  | 'simple'
  | 'modern'
  | 'one-column'
  | 'with-photo'
  | 'professional'
  | 'ats'
  | 'classic'
  | 'creative';

export interface TemplateItem {
  id: TemplateType;
  name: string;
  categories: CategoryKey[];
  description: string;
  candidateName: string;
  candidateRole: string;
  photoUrl?: string;
  photoShape?: 'circle' | 'square' | 'rounded';
  isEuropass?: boolean;
  hasBorderFrame?: boolean;
  colors: string[];
  layoutType: string;
}

export const TEMPLATES_DATA: TemplateItem[] = [
  {
    id: 'minimalist',
    name: 'Galaxy',
    categories: ['simple', 'ats', 'one-column'],
    description: 'Style épuré et centré, noir & blanc, mettant en valeur l\'expertise de manière équilibrée.',
    candidateName: 'MÉLINA GAUTHIER',
    candidateRole: 'Chef de Produit Digital',
    colors: ['#000000', '#525252', '#a3a3a3'],
    layoutType: 'galaxy'
  },
  {
    id: 'swiss',
    name: 'Grille Suisse',
    categories: ['simple', 'one-column', 'ats'],
    description: 'Grille suisse monochrome à structure stricte en 2 colonnes avec bordures nettes.',
    candidateName: 'Julie Renard',
    candidateRole: 'Cheffe de Produit',
    colors: ['#000000', '#333333', '#666666'],
    layoutType: 'swiss'
  },
  {
    id: 'admin',
    name: 'Administratif Simplifié',
    categories: ['professional', 'one-column', 'ats'],
    description: 'Style officiel en Times New Roman, noir & gris, idéal pour la fonction publique et concours.',
    candidateName: 'Paul Girard',
    candidateRole: 'Agent Administratif Catégorie A/B',
    colors: ['#000000', '#1f2937', '#4b5563'],
    layoutType: 'admin'
  },
  {
    id: 'elegant',
    name: 'Elegant',
    categories: ['professional', 'with-photo', 'modern'],
    description: 'Sidebar sombre · Typographie serif raffinée. Idéal pour : Direction, Cabinets premium',
    candidateName: 'VERA LANGFORD',
    candidateRole: 'Directrice Marketing',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    photoShape: 'square',
    colors: ['#1a1a1a', '#404040', '#ffffff'],
    layoutType: 'elegant'
  },
  {
    id: 'stylish',
    name: 'Stylish',
    categories: ['modern', 'simple'],
    description: 'Accent noir sur blanc · Bloc titre inversé. Idéal pour : Ingénierie, Profils accrocheurs',
    candidateName: 'HARPER WEBB',
    candidateRole: 'Ingénieure Logiciel',
    colors: ['#000000', '#1f2937', '#ffffff'],
    layoutType: 'stylish'
  },
  {
    id: 'executive',
    name: 'Executive',
    categories: ['professional', 'modern', 'ats'],
    description: 'Header noir profond · Hiérarchie forte · Présentation dirigeant. Idéal pour : Management, Direction',
    candidateName: 'JORDAN WILLIAMS',
    candidateRole: 'Directeur des Opérations',
    colors: ['#0f172a', '#334155', '#ffffff'],
    layoutType: 'executive'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    categories: ['simple', 'professional', 'one-column'],
    description: 'Typographie éditoriale · Espaces généreux · Ligne fine. Idéal pour : Conseil, Communication',
    candidateName: 'AMELIE MARTIN',
    candidateRole: 'Consultante en Stratégie',
    colors: ['#292524', '#78716c', '#ffffff'],
    layoutType: 'editorial'
  },
  {
    id: 'classic_french',
    name: 'Classic French',
    categories: ['professional', 'with-photo', 'ats'],
    description: 'En-tête bleu foncé avec corps clair, format très apprécié des recruteurs français.',
    candidateName: 'JULIEN MORAND',
    candidateRole: 'Chef de Projet',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    photoShape: 'square',
    colors: ['#1e293b', '#334155', '#ffffff'],
    layoutType: 'classic_french'
  },
  {
    id: 'modern_it',
    name: 'Modern IT',
    categories: ['modern', 'professional', 'ats'],
    description: 'Deux colonnes sans fond coloré, typographie forte et lignes noires. Idéal pour les ingénieurs et développeurs.',
    candidateName: 'HUGO LAMANDIER',
    candidateRole: 'Développeur Full-Stack',
    colors: ['#0f172a', '#334155', '#ffffff'],
    layoutType: 'modern_it'
  },
  {
    id: 'luxury_black',
    name: 'Luxury Black',
    categories: ['modern', 'with-photo', 'professional'],
    description: 'Grand bloc d\'en-tête noir et présentation élégante. Parfait pour les secteurs du luxe, de la mode ou de la direction.',
    candidateName: 'LISA MARCEAU',
    candidateRole: 'Marketing du luxe',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#000000', '#1f2937', '#ffffff'],
    layoutType: 'luxury_black'
  },
  {
    id: 'comptabilite_simple',
    name: 'CV de comptabilité',
    categories: ['simple', 'one-column', 'professional'],
    description: 'Design centré très épuré, avec des lignes de séparation claires.',
    candidateName: 'DIANE ROBIN',
    candidateRole: 'Comptable',
    colors: ['#000000', '#334155', '#ffffff'],
    layoutType: 'comptabilite_simple'
  },
  {
    id: 'comptable_osc',
    name: 'C.V. comptable type OSC',
    categories: ['simple', 'modern', 'one-column'],
    description: 'Fond intégral vert pastel avec une typographie émeraude douce et professionnelle.',
    candidateName: 'DANIELLE BRASSEUR',
    candidateRole: 'Comptable',
    colors: ['#e6f4ea', '#064e3b', '#065f46'],
    layoutType: 'comptable_osc'
  },
  {
    id: 'comptable_classique',
    name: 'C.V. de comptable classique',
    categories: ['professional', 'simple', 'one-column'],
    description: 'Structure ultra classique, alignée à gauche, avec une lecture horizontale claire.',
    candidateName: 'DONNA ROBBINS',
    candidateRole: 'Comptable',
    colors: ['#0f172a', '#334155', '#ffffff'],
    layoutType: 'comptable_classique'
  },
  {
    id: 'juriste',
    name: 'CV de juriste',
    categories: ['professional', 'simple', 'ats'],
    description: 'Design en deux colonnes minimaliste avec une base grise solide, parfait pour les profils juridiques.',
    candidateName: 'Aline Perrot',
    candidateRole: 'Avocate',
    colors: ['#000000', '#475569', '#ffffff'],
    layoutType: 'juriste'
  },
  {
    id: 'propre_elegant',
    name: 'CV propre et élégant',
    categories: ['modern', 'professional'],
    description: 'Design percutant sur fond bleu avec une très grande typographie d\'en-tête.',
    candidateName: 'Taylor Phillips',
    candidateRole: 'Directeur de conception',
    colors: ['#b3d4db', '#0f172a', '#334155'],
    layoutType: 'propre_elegant'
  },
  {
    id: 'timeline_blue',
    name: 'Chronologique Bleu',
    categories: ['modern', 'one-column'],
    description: 'Frise chronologique avec points bleus, compétences en badges et en-têtes de sections dynamiques.',
    candidateName: 'Lucas Bernard',
    candidateRole: 'Développeur Full Stack',
    colors: ['#2563eb', '#1e3a8a', '#f1f5f9'],
    layoutType: 'timeline_blue'
  },
  {
    id: 'pro_orange',
    name: 'Professionnel Orange',
    categories: ['modern', 'professional'],
    description: 'Bannière orange percutante centrée, compétences en ligne fluide. Style commercial impactant.',
    candidateName: 'Camille Rousseau',
    candidateRole: 'Responsable Commercial',
    colors: ['#f97316', '#ea580c', '#fff7ed'],
    layoutType: 'pro_orange'
  },
  {
    id: 'colorful_coral',
    name: 'Coloré Corail',
    categories: ['modern', 'with-photo'],
    description: 'Sidebar corail vif avec expériences en cartes colorées et compétences en badges.',
    candidateName: 'Sophie Martin',
    candidateRole: 'Designer UX/UI',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    colors: ['#e85d04', '#9a3412', '#ffffff'],
    layoutType: 'colorful_coral'
  },
  {
    id: 'skills_green',
    name: 'Compétences Vert',
    categories: ['modern', 'professional', 'with-photo'],
    description: 'Sidebar vert forêt avec barres de progression pour les compétences. Idéal pour les profils techniques.',
    candidateName: 'Antoine Dubois',
    candidateRole: 'Ingénieur DevOps',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    colors: ['#14532d', '#16a34a', '#f0fdf4'],
    layoutType: 'skills_green'
  },
  {
    id: 'bold_amber',
    name: 'Poli Doré',
    categories: ['modern', 'professional', 'with-photo'],
    description: 'Sidebar crème doré chaleureux, badges compétences, style professionnel haut de gamme.',
    candidateName: 'Marie Leclerc',
    candidateRole: 'Directrice Financière',
    colors: ['#fef3c7', '#d97706', '#78350f'],
    layoutType: 'bold_amber'
  },
  {
    id: 'card_teal',
    name: 'Académique Teal',
    categories: ['simple', 'professional', 'with-photo', 'ats'],
    description: 'Sidebar menthe claire, expériences en cartes bordées teal, compétences en chips — style académique aéré.',
    candidateName: 'Élodie Fontaine',
    candidateRole: 'Chercheuse en Sciences Cognitives',
    colors: ['#ccfbf1', '#0d9488', '#0f766e'],
    layoutType: 'card_teal'
  },
  {
    id: 'noir_sidebar',
    name: 'Noir Élégant',
    categories: ['professional', 'modern', 'with-photo'],
    description: 'Sidebar noir pur avec accent ambre — style sombre et percutant, idéal pour cadres et directeurs.',
    candidateName: 'Emmanuel Chantal',
    candidateRole: 'Directeur Informatique',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    colors: ['#1c1c1e', '#f59e0b', '#374151'],
    layoutType: 'noir_sidebar'
  },
  {
    id: 'split_column',
    name: 'Bicolore Moderne',
    categories: ['modern', 'one-column', 'ats'],
    description: 'Nom bicolore en grand format, contact aligné à droite, séparateur bleu — épuré et moderne.',
    candidateName: 'Emmanuel Chantal',
    candidateRole: 'Chef de Projet Digital',
    colors: ['#0ea5e9', '#0284c7', '#f0f9ff'],
    layoutType: 'split_column'
  },
  {
    id: 'structured_two_col',
    name: 'Structuré Classique',
    categories: ['professional', 'ats', 'simple'],
    description: 'En-tête centré, deux colonnes structurées sans fond coloré — clarté et sobriété professionnelle.',
    candidateName: 'Emmanuel Chantal',
    candidateRole: 'Ingénieur Systèmes',
    colors: ['#1e293b', '#475569', '#f1f5f9'],
    layoutType: 'structured_two_col'
  },
  {
    id: 'classic-compact',
    name: 'Classic Compact',
    categories: ['professional', 'ats', 'simple', 'with-photo'],
    description: 'CV européen compact avec photo ronde, colonne de libellés et séparateurs fins. Idéal pour profils Data, Tech, Finance et Business.',
    candidateName: 'CLARA MARTIN',
    candidateRole: 'Data Analyst',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#18181b', '#71717a', '#e4e4e7'],
    layoutType: 'classic_compact'
  },
  {
    id: 'pilot_lumiere',
    name: 'Pilot Lumière',
    categories: ['professional', 'ats', 'one-column', 'with-photo', 'modern'],
    description: 'Une colonne claire, en-tête nom et coordonnées, frise de dates et accent vert Lettrup. Lisible par les logiciels de recrutement, photo facultative.',
    candidateName: 'CAMILLE ROUSSEL',
    candidateRole: 'Chargée de recrutement',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    photoShape: 'rounded',
    colors: ['#007568', '#0f172a', '#e2e8f0'],
    layoutType: 'pilot_lumiere'
  },
  {
    id: 'pilot_nuit',
    name: 'Pilot Nuit',
    categories: ['professional', 'modern', 'with-photo'],
    description: 'Colonne bleu nuit avec photo, contacts et compétences ; parcours et formation en grand à droite. Pour cadres, conseil et commerce.',
    candidateName: 'THÉO MARCHAND',
    candidateRole: 'Responsable commercial',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#0b4056', '#8cf0d8', '#f1f5f9'],
    layoutType: 'pilot_nuit'
  },
  {
    id: 'pilot_editorial',
    name: 'Pilot Éditorial',
    categories: ['simple', 'professional', 'one-column', 'classic'],
    description: 'En-tête centré avec nom en serif léger, filets fins et bordeaux discret. Sobre et élégant, idéal pour juridique, finance, communication.',
    candidateName: 'INÈS LEFEBVRE',
    candidateRole: 'Juriste d’entreprise',
    colors: ['#7a2e3a', '#1c1917', '#d6d3d1'],
    layoutType: 'pilot_editorial'
  },
  {
    id: 'refined_olive',
    name: 'Professional Olive',
    categories: ['professional', 'ats', 'with-photo'],
    description: 'Structure horizontale olive avec frise de dates, photo discrète et hiérarchie compacte.',
    candidateName: 'MARIANNE GIRARD',
    candidateRole: 'Responsable RH',
    photoUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#6b7d3a', '#a3a380', '#f7f7f2'],
    layoutType: 'ref_olive'
  },
  {
    id: 'sepia_marketing',
    name: 'Marketing Sepia',
    categories: ['professional', 'with-photo', 'modern'],
    description: 'Colonne gauche sépia, composition marketing premium et sections sobres.',
    candidateName: 'HANNAH MORALES',
    candidateRole: 'Marketing Manager',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#8b6f5a', '#c7aa91', '#f7efe8'],
    layoutType: 'ref_sidebar'
  },
  {
    id: 'taupe_profile',
    name: 'Taupe Profile',
    categories: ['modern', 'professional', 'simple'],
    description: 'Fond taupe très doux avec blocs de contenu arrondis et présentation éditoriale.',
    candidateName: 'CÉLIA NAUDIN',
    candidateRole: 'Chargée de projets',
    colors: ['#a78b76', '#f6f3ee', '#5f5148'],
    layoutType: 'ref_cards'
  },
  {
    id: 'formal_minimal',
    name: 'Formal Minimal',
    categories: ['simple', 'professional', 'ats'],
    description: 'Modèle formel noir et blanc, très lisible, idéal pour profils administratifs et finance.',
    candidateName: 'THOMAS GARCIA',
    candidateRole: 'Contrôleur financier',
    colors: ['#0f172a', '#64748b', '#ffffff'],
    layoutType: 'ref_formal'
  },
  {
    id: 'soft_beige_photo',
    name: 'Beige Photo',
    categories: ['professional', 'with-photo', 'simple'],
    description: 'Sidebar beige clair, photo ronde et ton élégant pour profils communication ou RH.',
    candidateName: 'SOPHIE KELLER',
    candidateRole: 'Consultante RH',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#b08968', '#f1e4d1', '#6f553e'],
    layoutType: 'ref_sidebar'
  },
  {
    id: 'rose_sidebar',
    name: 'Rose Sidebar',
    categories: ['with-photo', 'modern', 'professional'],
    description: 'Colonne rose poudré, photo ronde et mise en page équilibrée inspirée portfolio.',
    candidateName: 'LOU HILET',
    candidateRole: 'Office Manager',
    photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#be6d7c', '#f3c5cc', '#7f3f4f'],
    layoutType: 'ref_sidebar'
  },
  {
    id: 'beige_split',
    name: 'Beige Split',
    categories: ['professional', 'with-photo', 'modern'],
    description: 'Deux colonnes beige, cartes fines et accents chauds pour CV polyvalent.',
    candidateName: 'CHLOÉ VALLET',
    candidateRole: 'Chargée de clientèle',
    colors: ['#b08d67', '#f8f1e8', '#7b5f43'],
    layoutType: 'ref_split'
  },
  {
    id: 'peach_editorial',
    name: 'Peach Editorial',
    categories: ['modern', 'professional', 'with-photo'],
    description: 'Style éditorial pêche avec typographie serif et séparateurs fins.',
    candidateName: 'OLIVIA WILSON',
    candidateRole: 'Brand Strategist',
    photoUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#bf755f', '#fff4ee', '#6f4538'],
    layoutType: 'ref_editorial'
  },
  {
    id: 'steel_minimal',
    name: 'Steel Minimal',
    categories: ['simple', 'professional', 'ats'],
    description: 'Minimalisme gris acier, structure très ATS et lecture rapide.',
    candidateName: 'DANIELLA SANCHEZ',
    candidateRole: 'Business Analyst',
    colors: ['#64748b', '#e2e8f0', '#0f172a'],
    layoutType: 'ref_formal'
  },
  {
    id: 'navy_executive',
    name: 'Navy Executive',
    categories: ['professional', 'with-photo', 'modern'],
    description: 'Sidebar bleu nuit, portrait professionnel et rendu exécutif structuré.',
    candidateName: 'THOMAS GARCIA',
    candidateRole: 'Directeur commercial',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#17324d', '#8fb3d9', '#f8fafc'],
    layoutType: 'ref_sidebar_dark'
  },
  {
    id: 'mauve_initial',
    name: 'Mauve Initial',
    categories: ['professional', 'simple', 'with-photo'],
    description: 'Colonne mauve douce avec rendu élégant, idéal pour profils conseil ou formation.',
    candidateName: 'SACHA DUBOIS',
    candidateRole: 'Consultante formation',
    colors: ['#8b728d', '#d8cbd8', '#4e3f50'],
    layoutType: 'ref_sidebar'
  },
  {
    id: 'black_line',
    name: 'Black Line',
    categories: ['simple', 'professional', 'ats'],
    description: 'CV monochrome à lignes fortes, très lisible et dense.',
    candidateName: 'CÉLIA NAUDIN',
    candidateRole: 'Responsable administratif',
    colors: ['#000000', '#525252', '#ffffff'],
    layoutType: 'ref_line'
  },
  {
    id: 'grid_professional',
    name: 'Professional Grid',
    categories: ['professional', 'ats', 'simple'],
    description: 'Grille structurée avec encadrés légers et sections très scannables.',
    candidateName: 'LOUISE MARTIN',
    candidateRole: 'Cheffe de projet',
    colors: ['#334155', '#e2e8f0', '#f8fafc'],
    layoutType: 'ref_cards'
  },
  {
    id: 'copper_serif',
    name: 'Copper Serif',
    categories: ['professional', 'simple'],
    description: 'Typographie serif et accent cuivre pour un CV classique haut de gamme.',
    candidateName: 'CLAIRE DUBOIS',
    candidateRole: 'Juriste',
    colors: ['#9b5f3d', '#d6b39d', '#ffffff'],
    layoutType: 'ref_editorial'
  },
  {
    id: 'teal_modern',
    name: 'Teal Modern',
    categories: ['modern', 'professional', 'ats'],
    description: 'En-tête turquoise fort, cartes de contenu et blocs de compétences modernes.',
    candidateName: 'ANDRÉA MORENO',
    candidateRole: 'Product Manager',
    colors: ['#0f9f9a', '#ccfbf1', '#134e4a'],
    layoutType: 'ref_teal'
  },
  {
    id: 'blue_compact',
    name: 'Blue Compact',
    categories: ['professional', 'with-photo', 'ats'],
    description: 'Sidebar bleu clair et contenu compact pour profils techniques ou support.',
    candidateName: 'SACHA DUBOIS',
    candidateRole: 'Technicien support',
    colors: ['#2563eb', '#d9ecff', '#1d4f8f'],
    layoutType: 'ref_sidebar'
  },
  {
    id: 'clean_photo',
    name: 'Clean Photo',
    categories: ['professional', 'with-photo', 'simple'],
    description: 'Photo en haut, lignes fines, blanc dominant et lecture très sobre.',
    candidateName: 'ANTHONY BOURCHET',
    candidateRole: 'Consultant SI',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    photoShape: 'square',
    colors: ['#404040', '#d4d4d4', '#ffffff'],
    layoutType: 'ref_photo_clean'
  },
  {
    id: 'emerald_consultant',
    name: 'Emerald Consultant',
    categories: ['professional', 'with-photo', 'modern'],
    description: 'Sidebar vert profond et accents frais pour profils conseil, data ou stratégie.',
    candidateName: 'AGATHE DUPONT',
    candidateRole: 'Consultante data',
    photoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#295e4b', '#8bd0a8', '#f0fdf4'],
    layoutType: 'ref_sidebar_dark'
  },
  {
    id: 'modern_blocks',
    name: 'Modern Blocks',
    categories: ['modern', 'professional', 'ats'],
    description: 'Sections en blocs nets, idéal pour un CV contemporain très organisé.',
    candidateName: 'SACHA DUBOIS',
    candidateRole: 'Chargée de mission',
    colors: ['#52525b', '#e4e4e7', '#fafafa'],
    layoutType: 'ref_blocks'
  },
  {
    id: 'sand_classic',
    name: 'Sand Classic',
    categories: ['professional', 'simple', 'with-photo'],
    description: 'Palette sable et rendu classique, propre et chaleureux.',
    candidateName: 'LOUISE CHANEV',
    candidateRole: 'Assistante de direction',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    photoShape: 'circle',
    colors: ['#a9855f', '#fbf7f0', '#7a5f43'],
    layoutType: 'ref_editorial'
  }
];

export const FEATURED_REFERENCE_TEMPLATE_IDS: TemplateType[] = [
  'pilot_lumiere',
  'pilot_nuit',
  'pilot_editorial',
  'refined_olive',
  'sepia_marketing',
  'taupe_profile',
  'formal_minimal',
  'soft_beige_photo',
  'rose_sidebar',
  'beige_split',
  'peach_editorial',
  'steel_minimal',
  'navy_executive',
  'mauve_initial',
  'black_line',
  'grid_professional',
  'copper_serif',
  'teal_modern',
  'blue_compact',
  'clean_photo',
  'emerald_consultant',
  'modern_blocks',
  'sand_classic',
];

const featuredTemplateRank = new Map<TemplateType, number>(
  FEATURED_REFERENCE_TEMPLATE_IDS.map((id, index) => [id, index])
);

export const sortFeaturedTemplatesFirst = (items: TemplateItem[]): TemplateItem[] =>
  [...items].sort((a, b) => {
    const aRank = featuredTemplateRank.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bRank = featuredTemplateRank.get(b.id) ?? Number.POSITIVE_INFINITY;
    return aRank - bRank;
  });

export default function TemplatesGallery({ inDashboard }: TemplatesGalleryProps) {
  usePageSEO({
    title: 'Modèles de CV professionnels — Lettrup',
    description: 'Explorez notre galerie de modèles de CV modernes, compatibles ATS : one-page, avec photo, professionnels ou créatifs. Choisissez et personnalisez en quelques clics.',
    canonicalPath: '/templates',
  });

  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);

  const categoriesList: { key: CategoryKey; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: inDashboard ? 'Tous' : `Tous les modèles (${TEMPLATES_DATA.length})`, icon: <LayoutTemplate size={14} /> },
    { key: 'modern', label: 'Moderne', icon: <Sparkles size={14} /> },
    { key: 'classic', label: 'Classique', icon: <Briefcase size={14} /> },
    { key: 'creative', label: 'Créatif', icon: <Sparkles size={14} /> },
    { key: 'simple', label: 'Minimaliste', icon: <Columns size={14} /> },
    { key: 'with-photo', label: 'Avec photo', icon: <Camera size={14} /> },
    { key: 'ats', label: 'ATS', icon: <FileCheck size={14} /> }
  ];

  const matchesCategory = (t: TemplateItem, cat: CategoryKey): boolean => {
    if (cat === 'all') return true;
    if (cat === 'classic') return t.categories.includes('professional');
    if (cat === 'creative') return t.categories.includes('modern') && t.categories.includes('with-photo');
    return t.categories.includes(cat);
  };

  const filteredTemplates = sortFeaturedTemplatesFirst(
    TEMPLATES_DATA.filter((t) => matchesCategory(t, activeCategory))
  );

  const handleColorChange = (templateName: string, color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedColors((prev) => ({ ...prev, [templateName]: color }));
  };

  return (
    <div className="space-y-6 pb-16 md:pb-12">
      {!inDashboard && (
        <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">Lettrup</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PRO</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-full text-xs font-semibold text-slate-600">
              <Link to="/" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Accueil</Link>
              <Link to="/#features" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Fonctionnalités</Link>
              <Link to="/pricing" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Tarifs</Link>
              <Link to="/blog" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Blog & Guides</Link>
              <Link to="/#comparison" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Comparatif</Link>
              <Link to="/#faq" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">FAQ</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Se connecter
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
              >
                <span>Créer un compte</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </nav>
      )}

      {inDashboard ? (
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-tertiary tracking-tight leading-tight">
            Modèles de CV
          </h1>
          <p className="text-sm text-[#456071] mt-2 max-w-2xl">
            Choisissez parmi nos modèles professionnels et personnalisez-le selon vos besoins.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Modèles de CV professionnels et modernes
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Une galerie de modèles compatibles ATS — simples, avec photo, professionnels ou créatifs — à personnaliser en quelques clics.
          </p>
        </div>
      )}

      {/* Top Filter Pills (7. Modèles de CV) */}
      <div className={inDashboard ? 'flex items-center gap-2 overflow-x-auto no-scrollbar py-1' : 'bg-white border-b border-gray-200 px-2 pt-2 sticky top-20 z-10'}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categoriesList.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap rounded-full transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-tertiary text-white'
                    : 'bg-transparent border border-tertiary/20 text-tertiary hover:border-tertiary'
                }`}
              >
                {!inDashboard && cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Mini Version Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${inDashboard ? '' : 'px-2'}`}>
        {filteredTemplates.map((item) => {
          const currentColor = selectedColors[item.name] || item.colors[0];

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/builder?template=${item.id}`)}
              className="bg-white rounded-lg border border-tertiary/10 hover:border-tertiary/30 hover:shadow-[0_18px_40px_-20px_rgba(11,64,86,0.35)] transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden"
            >
              {/* Mini Preview Container */}
              <div className="bg-[#e9f0f4] p-3 relative min-h-[295px] flex items-center justify-center overflow-hidden">
                {/* Mini A4 Document Sheet */}
                <div
                  className={`w-[190px] h-[269px] bg-white rounded-xs transition-transform duration-300 group-hover:scale-[1.015] text-[6px] text-gray-700 leading-tight select-none relative flex flex-col overflow-hidden ${
                    item.hasBorderFrame ? 'border-2 border-gray-800' : ''
                  }`}
                >
                  <CompactCvSample template={item} accentColor={currentColor} size="sm" />
                </div>

                {/* Quick Eye Preview Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(item);
                  }}
                  title="Aperçu grand format"
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-[#007568] border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Eye size={14} />
                </button>

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-tertiary/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                  <span className="bg-accent text-tertiary font-bold text-sm px-5 py-2.5 rounded-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    Utiliser ce modèle
                  </span>
                </div>

                {/* Color palette and export-format badges */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-1 rounded-full border border-gray-200/80">
                    {item.colors.map((color) => {
                      const isSelected = currentColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={(event) => handleColorChange(item.name, color, event)}
                          style={{ backgroundColor: color }}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${isSelected ? 'border-gray-900 scale-110' : 'border-transparent opacity-80'}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="bg-white/90 text-tertiary text-xs font-bold px-1.5 py-0.5 rounded border border-tertiary/10">PDF</span>
                    <span className="bg-white/90 text-tertiary text-xs font-bold px-1.5 py-0.5 rounded border border-tertiary/10">DOCX</span>
                  </div>
                </div>
              </div>

              {/* Template Title & Description */}
              <div className="p-4 bg-white flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-serif font-black text-lg text-tertiary mb-0.5 group-hover:text-[#007568] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#007568] mb-1.5 truncate">
                    Ex. : {item.candidateRole}
                  </p>
                  <p className="text-sm text-[#456071] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-tertiary/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(item);
                    }}
                    className="text-sm font-semibold text-[#456071] hover:text-tertiary inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={14} />
                    Aperçu
                  </button>
                  <span className="text-sm font-bold text-[#007568] group-hover:underline underline-offset-4">
                    Choisir ce modèle →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Size A4 CV Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">{previewTemplate.name}</h3>
                  <span className="text-xs font-semibold text-[#456071]">Format A4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exemple : {previewTemplate.candidateName} — {previewTemplate.candidateRole}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const id = previewTemplate.id;
                    setPreviewTemplate(null);
                    navigate(`/builder?template=${id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007568] hover:bg-[#006257] text-white text-xs font-bold cursor-pointer"
                >
                  <Check size={14} />
                  Choisir ce modèle
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-[#f2f4f8] overflow-y-auto flex justify-center">
              <div className="w-full max-w-[560px] aspect-[210/297] bg-white rounded-md shadow-xl ring-1 ring-slate-200 overflow-hidden">
                <CompactCvSample
                  template={previewTemplate}
                  accentColor={selectedColors[previewTemplate.name] || previewTemplate.colors[0]}
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent to render the exact mini CV for each template
export function MiniCvDocument({
  template,
  accentColor
}: {
  template: TemplateItem;
  accentColor: string;
}) {
  return <CompactCvSample template={template} accentColor={accentColor} size="xs" />;
}
