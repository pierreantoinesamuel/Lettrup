// AdminCandidate, AdminEmployer, AdminJob, and AdminApplication used to live
// here as mock types. They're now real Supabase-backed types defined in
// src/lib/adminApi.ts, which also owns real admin_audit_log writes for those
// four entities. AdminAuditLog/AdminAIAgent/AdminAILog/AdminWorkflow/Article
// below remain mock/localStorage-backed — see the core-recruiting-loop
// migration plan for why those are out of scope for now. AdminAuditLog here
// is still used by AIAgentsView/WorkflowsView's own toggle-logging and by
// SettingsView's audit trail display.

export interface AdminAuditLog {
  id: string;
  adminName: string;
  adminRole: 'Super Admin' | 'Moderator' | 'Support Staff';
  actionType: string;
  targetType: 'Candidate' | 'Employer' | 'Job' | 'Application' | 'AI Agent' | 'Workflow' | 'Article';
  targetId: string;
  notes: string;
  timestamp: string;
}

export interface AdminAIAgent {
  id: string;
  name: string;
  slug: string;
  status: 'enabled' | 'disabled';
  totalCalls: number;
  successCount: number;
  errorCount: number;
  avgResponseMs: number;
  costEstimateUSD: number;
  description: string;
  lastErrorTime?: string;
  lastErrorMessage?: string;
}

export interface AdminAILog {
  id: string;
  agentName: string;
  inputSnippet: string;
  outputSnippet: string;
  status: 'success' | 'error';
  errorMessage?: string;
  durationMs: number;
  costEstimateUSD: number;
  userEmail: string;
  timestamp: string;
}

export interface AdminWorkflow {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'paused' | 'error';
  triggerType: 'job_created' | 'employer_signup' | 'cron_10m' | 'application_created';
  lastRunTime: string;
  durationMs: number;
  successCount: number;
  failureCount: number;
  lastErrorMessage?: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
}

export interface Article {
  id: string;
  category: string;
  date: string;
  readTime: string;
  title: string;
  subtitle: string;
  excerpt: string;
  image: string;
  quote: string;
  author: {
    name: string;
    role: string;
    avatar: string;
    bio: string;
  };
  featured?: boolean;
  tags: string[];
  sections: Section[];
}

// Initial Seed Data
// Empty by default — previously seeded with fake entries referencing
// candidate/employer/job IDs that no longer exist now that those entities
// are real Supabase data (see src/lib/adminApi.ts).
export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [];

export const INITIAL_AI_AGENTS: AdminAIAgent[] = [
  { id: 'agent-1', name: 'Resume Optimizer Agent', slug: 'resume-optimizer', status: 'enabled', totalCalls: 12450, successCount: 12380, errorCount: 70, avgResponseMs: 1420, costEstimateUSD: 18.65, description: 'Optimise la structuration et la pertinence des CV selon les standards ATS.' },
  { id: 'agent-2', name: 'Cover Letter Generator Agent', slug: 'cover-letter', status: 'enabled', totalCalls: 8900, successCount: 8850, errorCount: 50, avgResponseMs: 1850, costEstimateUSD: 14.20, description: 'Génère des lettres de motivation ultra-personnalisées par offre.' },
  { id: 'agent-3', name: 'ATS Scanner & Match Agent', slug: 'ats-scanner', status: 'enabled', totalCalls: 15600, successCount: 15510, errorCount: 90, avgResponseMs: 980, costEstimateUSD: 12.40, description: 'Calcule le match score et détecte les mots-clés manquants.' },
  { id: 'agent-4', name: 'Interview Simulator Agent', slug: 'interview-simulator', status: 'enabled', totalCalls: 6200, successCount: 6120, errorCount: 80, avgResponseMs: 1100, costEstimateUSD: 9.30, description: 'Mène les simulations d\'entretiens vocaux et fournit des feedbacks.' },
  { id: 'agent-5', name: 'Admin Oversight Agent', slug: 'admin-oversight', status: 'enabled', totalCalls: 1280, successCount: 1278, errorCount: 2, avgResponseMs: 1600, costEstimateUSD: 3.10, description: 'Analyse la santé globale, modère les offres et détecte les comportements suspects.' },
];

export const INITIAL_AI_LOGS: AdminAILog[] = [
  { id: 'log-101', agentName: 'ATS Scanner & Match Agent', inputSnippet: 'Job: Senior Product Manager AI | Candidate: Sophie Martin', outputSnippet: '{"matchScore": 92, "recommendation": "Shortlist"}', status: 'success', durationMs: 890, costEstimateUSD: 0.0012, userEmail: 'sophie.martin@gmail.com', timestamp: '2026-07-23 09:12:04' },
  { id: 'log-102', agentName: 'Resume Optimizer Agent', inputSnippet: 'Optimisation CV - Alexandre Dubois - Target: Lead Dev', outputSnippet: '{"bulletPoints": ["Refactored legacy React state to Redux Toolkit..."]}', status: 'success', durationMs: 1450, costEstimateUSD: 0.0021, userEmail: 'alex.dubois@tech.io', timestamp: '2026-07-23 09:10:15' },
  { id: 'log-103', agentName: 'Admin Oversight Agent', inputSnippet: 'System Audit Check: Employer Verification & Job Flagging', outputSnippet: '{"alerts": ["Suspicious employer: Crypto Wealth Scam Ltd"], "recommended_actions": ["Suspend employer emp-103"]}', status: 'success', durationMs: 1620, costEstimateUSD: 0.0035, userEmail: 'admin@cvpilot.fr', timestamp: '2026-07-23 08:45:00' },
  { id: 'log-104', agentName: 'Interview Simulator Agent', inputSnippet: 'Voice Simulation Question #3 for Lucas Petit', outputSnippet: 'ERROR: Gemini API rate limit temporary threshold reached (429)', status: 'error', errorMessage: '429 Too Many Requests - Rate limit exceeded on flash tier', durationMs: 310, costEstimateUSD: 0.0000, userEmail: 'lucas.petit@edhec.com', timestamp: '2026-07-23 08:30:12' },
];

export const INITIAL_WORKFLOWS: AdminWorkflow[] = [
  { id: 'wf-1', name: 'Job Moderation Workflow', code: 'job_moderation_v2', status: 'active', triggerType: 'job_created', lastRunTime: 'Il y a 15 min', durationMs: 1200, successCount: 420, failureCount: 2 },
  { id: 'wf-2', name: 'Employer Verification Workflow', code: 'emp_verify_v1', status: 'active', triggerType: 'employer_signup', lastRunTime: 'Il y a 1 heure', durationMs: 850, successCount: 180, failureCount: 0 },
  { id: 'wf-3', name: 'AI Agent Health Monitor', code: 'ai_health_cron', status: 'active', triggerType: 'cron_10m', lastRunTime: 'Il y a 5 min', durationMs: 400, successCount: 1440, failureCount: 1 },
  { id: 'wf-4', name: 'Auto-Rejection (<70% Match)', code: 'auto_reject_match', status: 'active', triggerType: 'application_created', lastRunTime: 'Il y a 28 min', durationMs: 650, successCount: 890, failureCount: 0 },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'methode-star-entretien',
    category: 'Méthode & Entretien',
    date: '2026-06-01',
    readTime: '6 min de lecture',
    featured: true,
    title: 'Comprendre et Appliquer la Méthode STAR à votre Entretien',
    subtitle: 'Décryptage étape par étape des 4 piliers comportementaux : de la Mise en Marge de la Situation au Résultat final.',
    excerpt: 'Découvrez la méthodologie reine utilisée par Amazon, Google et les recruteurs internationaux pour structurer vos réponses avec brio.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    quote: "Créée pour structurer l'expression orale, la grille de lecture « STAR » est devenue l'une des méthodes d'analyse les plus populaires au monde pour le recrutement. Son secret ? Proposer un équilibre rythmique clair tout en laissant une liberté créative totale.",
    author: {
      name: 'Sonia Benali',
      role: 'RÉDACTRICE & AUTEURE',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      bio: 'Spécialiste des structures de recrutement et de la préparation aux entretiens dans les secteurs tech et exécutif.'
    },
    tags: ['#MÉTHODE STAR', '#ENTRETIEN', '#RECRUTEMENT', '#PITCH', '#SCÉNARIO'],
    sections: [
      {
        id: 'pourquoi-star',
        title: '1. Pourquoi la méthode STAR séduit le Recrutement',
        content: "Répéter un CV sans relief ne suffit plus. Les grands cabinets de recrutement appliquent la méthode STAR de manière intuitive : une progression structurée en 4 temps forts qui matérialisent votre savoir-faire en illustrant un cheminement logique du début à la fin.",
      },
      {
        id: 'piliers-decortiques',
        title: '2. Les 4 Piliers fondamentaux décortiqués',
        content: "Sur une présentation standard de 2 minutes lors d'une question comportementale, chaque étape doit occuper une proportion stratégique bien définie :",
        bullets: [
          "• Situation (15%) : Mettez en place le cadre (projet, entreprise, contraintes temporelles).",
          "• Tâche (15%) : Précisez votre responsabilité directe et l'objectif spécifique qui vous était confié.",
          "• Action (50%) : Le cœur du récit ! Détaillez les démarches, outils et décisions que VOUS avez déployés.",
          "• Résultat (20%) : Présentez des métriques chiffrées (chiffre d'affaires, temps gagné) et le bilan tiré."
        ]
      },
      {
        id: 'phase-situation-tache',
        title: '3. Phase S & T : L\'Ancien Monde et le Déclencheur',
        content: "Commencez par poser le contexte initial du problème sans vous perdre dans les détails techniques secondaires. L'interlocuteur doit immédiatement saisir l'enjeu stratégique et la tension opérationnelle de la situation."
      },
      {
        id: 'phase-action',
        title: '4. Phase A : L\'Action Stratégique au Cœur du Pitch',
        content: "C'est l'étape où vous brillez. Mettez l'accent sur les choix individuels, la gestion de crise, l'utilisation d'outils modernes (IA, frameworks, méthodologies agiles) et la coordination de votre équipe."
      },
      {
        id: 'phase-resultat',
        title: '5. Phase R : La Réconciliation et l\'Impact Mesurable',
        content: "Terminez toujours sur une note positive et quantifiée. Un bon résultat associe des métriques concrètes (ex: +30% d'efficacité) et un apprentissage durable réutilisable dans votre futur poste."
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Dans CVPilot, vous pouvez vous entraîner directement grâce au Simulateur d'Entretien IA qui évalue en temps réel la structure STAR de vos réponses orales et écrites."
      }
    ]
  },
  {
    id: 'guide-ultime-cv-ats',
    category: 'Guides de Rédaction',
    date: '2026-06-15',
    readTime: '8 min de lecture',
    title: 'Le Guide Ultime du Formatage de CV (Standard ATS & Europe)',
    subtitle: 'Toutes les normes typographiques, structures et stratégies de mots-clés pour réussir le passage des filtres de recrutement.',
    excerpt: 'Règles typographiques, marges, gestion des mots-clés et pièges à éviter : tout ce que vous devez savoir pour un CV 100% lisible par les robots ATS.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80',
    quote: "Plus de 85% des entreprises utilisent un ATS pour trier les candidatures. Un CV mal formaté peut être rejeté avant d'être lu par un humain.",
    author: {
      name: 'Claire Delamare',
      role: 'CONSULTANTE RH & HEADHUNTER',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      bio: 'Experte en processus de sélection automatisés et refonte de candidatures exécutives.'
    },
    tags: ['#ATS', '#FORMATAGE', '#CV', '#RH', '#EFFICACITÉ'],
    sections: [
      {
        id: 'structure-tech',
        title: '1. La Structure Technique Indispensable',
        content: "Privilégiez les polices système sans empattement (Inter, Arial, Helvetica) avec une taille minimale de 10.5pt. Évitez les tableaux complexes, les zones de texte flottantes et les illustrations vectorielles non indexables.",
      },
      {
        id: 'mots-cles',
        title: '2. L\'Art de l\'Optimisation des Mots-Clés',
        content: "Analysez la fiche de poste. Identifiez les compétences requises et répétez-les naturellement au sein de vos descriptions d'expériences.",
      },
      {
        id: 'quantification',
        title: '3. La Quantification Systématique des Succès',
        content: "Chaque puce de votre CV doit comporter un verbe d'action et une métrique chiffrée (ex: 'Optimisation du tunnel de vente (+24% de conversion)')."
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "En générant votre CV sur CVPilot, vous bénéficiez d'une conformité ATS native garantie sur tous les formats d'exportation PDF."
      }
    ]
  },
  {
    id: 'cvpilot-vs-canva-word',
    category: 'Comparatifs',
    date: '2026-06-10',
    readTime: '5 min de lecture',
    title: 'CVPilot vs Canva & Word : Le Comparatif Complet 2026',
    subtitle: 'Analyse comparative approfondie entre les traitements de texte, les éditeurs graphiques et la plateforme IA dédiée.',
    excerpt: 'Découvrez pourquoi les modèles Canva échouent aux tests ATS et comment Word génère des décalages de mise en page récurrents.',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
    quote: "Le design ne doit jamais se faire au détriment de la lisibilité algorithmique. CVPilot allie l'élégance visuelle à la rigueur technique.",
    author: {
      name: 'Marc-Antoine Sorel',
      role: 'LEAD CAREER COACH',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Accompagnateur de carrière spécialisé dans les outils digitaux et le personal branding.'
    },
    tags: ['#COMPARATIF', '#CVPILOT', '#CANVA', '#WORD', '#OUTILS'],
    sections: [
      {
        id: 'limites-canva',
        title: '1. Les Limites Cachées de Canva pour le Recrutement',
        content: "Canva est un excellent outil de création graphique mais transforme souvent le texte en blocs d'images invisibles pour les logiciels de tri ATS.",
      },
      {
        id: 'problemes-word',
        title: '2. Les Inconvénients de Word et des Fichiers .DOCX',
        content: "Word génère régulièrement des sauts de page imprévus et des polices décalées selon le système d'exploitation du recruteur.",
      },
      {
        id: 'solution-cvpilot',
        title: '3. L\'Approche CVPilot : Allier Design et Compatibilité',
        content: "CVPilot génère automatiquement un PDF vectoriel épuré, structuré de façon sémantique et parfaitement lisible sur ordinateur et mobile."
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Adoptez la solution construite spécialement pour la recherche d'emploi et multipliez vos chances de sélection dès aujourd'hui."
      }
    ]
  },
  {
    id: 'rediger-bible-lettre-motivation',
    category: 'Guides de Rédaction',
    date: '2026-05-25',
    readTime: '7 min de lecture',
    title: 'Comment Rédiger une Lettre de Motivation Captivante avec l\'IA',
    subtitle: 'Passez d\'une formule d\'accroche banale à un pitch personnalisé qui suscite l\'enthousiasme immédiat du recruteur.',
    excerpt: 'Transformez vos lettres de motivation génériques en histoires ciblées grâce aux modèles de rédaction intelligents CVPilot.',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    quote: "La lettre de motivation doit répondre à la question : 'Pourquoi nous, pourquoi vous, et pourquoi maintenant ?'",
    author: {
      name: 'Marc-Antoine Sorel',
      role: 'LEAD CAREER COACH',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Accompagnateur de carrière spécialisé dans les outils digitaux et le personal branding.'
    },
    tags: ['#LETTRE', '#REDACTION', '#IA', '#MOTIVATION'],
    sections: [
      {
        id: 'structure-lettre',
        title: '1. La Règle du Vous - Moi - Nous',
        content: "Commencez par parler de l'entreprise (VOUS), enchaînez sur ce que vous apportez (MOI), et terminez par la synergie créée (NOUS).",
      },
      {
        id: 'accroche',
        title: '2. Bâtir une Accroche Imparable',
        content: "Évitez les banalités ('Je vous adresse ma candidature...'). Évoquez directement un projet récent ou un enjeu actuel de l'entreprise.",
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Utilisez le module IA de CVPilot pour générer en un clic une lettre parfaitement harmonisée avec votre CV."
      }
    ]
  },
  {
    id: 'creer-arcs-d-experiences',
    category: 'Entretien & Pitch',
    date: '2026-05-18',
    readTime: '6 min de lecture',
    title: 'Créer des Arcs de Personnages Professionnels : Conflit Interne vs Objectif Externe',
    subtitle: 'La chimie psychologique pour intéresser vos interlocuteurs : structurer votre parcours comme un récit inspirant.',
    excerpt: 'Découvrez comment présenter votre trajectoire et vos reconversions sous forme de progression cohérente et captivante.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    quote: "Les gens n'achètent pas ce que vous faites, ils achètent pourquoi vous le faites. Appliquez ce principe à votre pitch de carrière.",
    author: {
      name: 'Claire Delamare',
      role: 'CONSULTANTE RH & HEADHUNTER',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      bio: 'Experte en recrutement exécutif et valorisation du potentiel individuel.'
    },
    tags: ['#PITCH', '#STORYTELLING', '#CARRIÈRE', '#SNOB'],
    sections: [
      {
        id: 'storytelling-pro',
        title: '1. Le Storytelling Appliqué au Recrutement',
        content: "Chaque transition professionnelle répond à un objectif. Présentez vos virages de carrière comme des choix stratégiques d'apprentissage.",
      },
      {
        id: 'conflit-interne',
        title: '2. Mettre en Valeur le Dépassement de Soi',
        content: "Expliquez comment vous avez surmonté des défis complexes pour acquérir vos compétences actuelles.",
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Construisez votre argumentaire avec clarté pour captiver les décideurs lors de vos entretiens."
      }
    ]
  },
  {
    id: 'portfolio-web-candidat',
    category: 'Gestion de Carrière',
    date: '2026-05-10',
    readTime: '5 min de lecture',
    title: 'Pourquoi et Comment Créer un Portfolio Web Interactif en 2026',
    subtitle: 'Démarquez-vous de 99% des candidats en accompagnant votre CV PDF d\'une page web dynamique et sécurisée.',
    excerpt: 'Un lien interactif vers vos réalisations augmente le taux de retour des recruteurs de plus de 40%.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    quote: "Le CV montre ce que vous avez fait. Le Portfolio Web prouve ce que vous êtes capable de produire aujourd'hui.",
    author: {
      name: 'Sonia Benali',
      role: 'RÉDACTRICE & AUTEURE',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      bio: 'Spécialiste des structures de recrutement et du marketing de carrière.'
    },
    tags: ['#PORTFOLIO', '#WEB', '#CANDIDATURE', '#DIGITAL'],
    sections: [
      {
        id: 'avantage-portfolio',
        title: '1. L\'Impact d\'un Portfolio Numérique',
        content: "Proposer un site vitrine sobre permet aux recruteurs de visualiser vos projets réels en haute résolution.",
      },
      {
        id: 'integration-cvpilot',
        title: '2. Génération Automatique via CVPilot',
        content: "En un clic, CVPilot convertit la structure de votre CV en une page web réactive et hébergée en toute sécurité.",
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Combinez CV PDF et Portfolio Web pour maximiser votre impact auprès des employeurs."
      }
    ]
  }
];

