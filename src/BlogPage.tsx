import React, { useState, useEffect } from 'react';
import logoIcon from './assets/logo-icon.png';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Footer from './components/Footer';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  BookOpen,
  Calendar,
  Clock,
  User,
  X,
  ChevronRight,
  Send,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Tag,
  Share2,
  ThumbsUp,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';

import { AdminStore } from './components/admin/adminStore';
import { Article, Section } from './components/admin/adminData';
import { listPublishedBlogPosts } from './services/blogService';
import { usePageSEO } from './hooks/usePageSEO';

export type { Article, Section };

export const ARTICLES: Article[] = [
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
        content: "Dans Lettrup, vous pouvez vous entraîner directement grâce au Simulateur d'Entretien IA qui évalue en temps réel la structure STAR de vos réponses orales et écrites."
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
        content: "En générant votre CV sur Lettrup, vous bénéficiez d'une conformité ATS native garantie sur tous les formats d'exportation PDF."
      }
    ]
  },
  {
    id: 'cvpilot-vs-canva-word',
    category: 'Comparatifs',
    date: '2026-06-10',
    readTime: '5 min de lecture',
    title: 'Lettrup vs Canva & Word : Le Comparatif Complet 2026',
    subtitle: 'Analyse comparative approfondie entre les traitements de texte, les éditeurs graphiques et la plateforme IA dédiée.',
    excerpt: 'Découvrez pourquoi les modèles Canva échouent aux tests ATS et comment Word génère des décalages de mise en page récurrents.',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
    quote: "Le design ne doit jamais se faire au détriment de la lisibilité algorithmique. Lettrup allie l'élégance visuelle à la rigueur technique.",
    author: {
      name: 'Marc-Antoine Sorel',
      role: 'LEAD CAREER COACH',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Accompagnateur de carrière spécialisé dans les outils digitaux et le personal branding.'
    },
    tags: ['#COMPARATIF', '#LETTRUP', '#CANVA', '#WORD', '#OUTILS'],
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
        title: '3. L\'Approche Lettrup : Allier Design et Compatibilité',
        content: "Lettrup génère automatiquement un PDF vectoriel épuré, structuré de façon sémantique et parfaitement lisible sur ordinateur et mobile."
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
    excerpt: 'Transformez vos lettres de motivation génériques en histoires ciblées grâce aux modèles de rédaction intelligents Lettrup.',
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
        content: "Utilisez le module IA de Lettrup pour générer en un clic une lettre parfaitement harmonisée avec votre CV."
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
        title: '2. Génération Automatique via Lettrup',
        content: "En un clic, Lettrup convertit la structure de votre CV en une page web réactive et hébergée en toute sécurité.",
      },
      {
        id: 'conclusion',
        title: 'En Conclusion',
        content: "Combinez CV PDF et Portfolio Web pour maximiser votre impact auprès des employeurs."
      }
    ]
  }
];

const CATEGORIES = [
  'Tous les articles',
  'Guides de Rédaction',
  'Comparatifs',
  'Méthode & Entretien',
  'Gestion de Carrière'
];

export default function BlogPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  const [articlesList, setArticlesList] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tous les articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real content lives in the blog_posts table now (see blogService.ts /
  // security-SEO audit 3.2) — AdminStore/localStorage and the hardcoded
  // ARTICLES constant are only a last-resort fallback if Supabase isn't
  // reachable, so the page never renders empty.
  useEffect(() => {
    let cancelled = false;
    listPublishedBlogPosts().then((posts) => {
      if (cancelled) return;
      if (posts.length > 0) {
        setArticlesList(posts);
        return;
      }
      try {
        const stored = AdminStore.getArticles();
        setArticlesList(stored && stored.length > 0 ? stored : ARTICLES);
      } catch {
        setArticlesList(ARTICLES);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The URL is the source of truth for which article is open — this makes
  // /blog/:slug shareable, bookmarkable, and back/forward-navigable, and is
  // what server.ts's SSR SEO metadata keys off for crawlers (audit 3.2).
  useEffect(() => {
    if (!slug) {
      setSelectedArticle(null);
      return;
    }
    setSelectedArticle(articlesList.find((a) => a.id === slug) || null);
  }, [slug, articlesList]);

  // Scroll to top when switching view or article
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedArticle]);

  usePageSEO(
    selectedArticle
      ? {
          title: `${selectedArticle.title} — Blog Lettrup`,
          description: selectedArticle.excerpt,
          canonicalPath: `/blog/${selectedArticle.id}`,
        }
      : {
          title: 'Blog & Guides Carrière — Lettrup',
          description: "Astuces de rédaction de CV, préparation aux entretiens avec la méthode STAR, optimisation pour les logiciels ATS et conseils pour décrocher plus d'entretiens.",
          canonicalPath: '/blog',
        }
  );

  // Filter articles
  const filteredArticles = articlesList.filter((art) => {
    const matchesCategory =
      selectedCategory === 'Tous les articles' || art.category === selectedCategory;
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articlesList.find((a) => a.featured) || articlesList[0];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get similar articles (excluding current selected article)
  const similarArticles = selectedArticle
    ? articlesList.filter((a) => a.id !== selectedArticle.id).slice(0, 3)
    : [];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#007568] selection:text-white antialiased">

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoIcon} alt="Lettrup" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">Lettrup</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                PRO
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-full text-xs font-semibold text-slate-600">
            <Link to="/" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">
              Accueil
            </Link>
            <Link to="/#features" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">
              Fonctionnalités
            </Link>
            <Link to="/pricing" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">
              Tarifs
            </Link>
            <button
              type="button"
              onClick={() => navigate('/blog')}
              className={`px-4 py-2 rounded-full font-bold transition-colors ${
                !selectedArticle
                  ? 'bg-primary-container/40 text-tertiary border border-tertiary/20'
                  : 'hover:text-slate-900 hover:bg-white text-slate-600'
              }`}
            >
              Blog & Guides
            </button>
            <Link to="/#comparison" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">
              Comparatif
            </Link>
            <Link to="/#faq" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">
              FAQ
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95"
            >
              <span>Lancer l'App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ARTICLE READER VIEW (When an article is selected) */}
      {selectedArticle ? (
        <main className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          
          {/* Top Bar: Back button & Share */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[#007568]" />
              <span>Retour aux articles</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} className="text-[#007568]" />}
              <span>{copied ? 'Lien copié !' : 'Partager'}</span>
            </button>
          </div>

          {/* Article Header Header */}
          <header className="text-center max-w-3xl mx-auto mb-10">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#007568] mb-6">
              {selectedArticle.category}
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.15]">
              {selectedArticle.title}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
              {selectedArticle.subtitle}
            </p>

            {/* Author & Meta Bar */}
            <div className="inline-flex items-center justify-center gap-4 flex-wrap text-xs text-slate-500 py-2 px-6 rounded-full bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <img
                  src={selectedArticle.author.avatar}
                  alt={selectedArticle.author.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                />
                <span className="font-bold text-slate-900">{selectedArticle.author.name}</span>
                <span className="text-xs text-tertiary font-sans font-semibold px-2 py-0.5 rounded bg-primary-container/40 border border-tertiary/20">
                  {selectedArticle.author.role}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                <span>Publié le {selectedArticle.date}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock size={13} className="text-slate-400" />
                <span>{selectedArticle.readTime}</span>
              </div>
            </div>
          </header>

          {/* Hero Featured Image */}
          <div className="mb-12 rounded-lg overflow-hidden border border-slate-200 shadow-xl h-52 sm:h-72 lg:h-80 relative bg-slate-100">
            <img
              src={selectedArticle.image}
              alt={selectedArticle.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content Layout Grid (Table of Contents Sidebar + Article Body) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-16">
            
            {/* Sticky Left Table of Contents */}
            <aside className="lg:col-span-4 sticky top-28 bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 text-xs font-bold text-tertiary">
                <BookOpen size={14} />
                <span>SOMMAIRE</span>
              </div>
              <nav className="space-y-2.5 text-xs text-slate-600 font-medium">
                {selectedArticle.sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block hover:text-slate-900 hover:translate-x-1 transition-all py-1 border-l-2 border-transparent hover:border-[#007568] pl-2"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Right Main Article Content */}
            <article className="lg:col-span-8 space-y-8 text-slate-600 leading-relaxed font-sans text-sm sm:text-base">

              {/* Highlight Quote Box */}
              {selectedArticle.quote && (
                <blockquote className="p-6 sm:p-7 rounded-lg bg-primary-container/40 border-l-4 border-[#007568] text-slate-900 italic font-serif text-base sm:text-lg leading-snug">
                  "{selectedArticle.quote}"
                </blockquote>
              )}

              {/* Sections rendering */}
              {selectedArticle.sections.map((sec) => (
                <section key={sec.id} id={sec.id} className="scroll-mt-32 space-y-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-2">
                    {sec.title}
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                    {sec.content}
                  </p>
                  {sec.bullets && (
                    <ul className="space-y-2 mt-3 pl-2 text-slate-600 text-xs sm:text-sm">
                      {sec.bullets.map((b, idx) => (
                        <li key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {/* Tags Section */}
              <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 font-bold mr-1">MOTS-CLÉS :</span>
                  {selectedArticle.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:border-tertiary/30 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author Bio Card */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7 flex items-start gap-5">
                <img
                  src={selectedArticle.author.avatar}
                  alt={selectedArticle.author.name}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-slate-900">{selectedArticle.author.name}</h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-container/40 text-tertiary border border-tertiary/20">
                      {selectedArticle.author.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedArticle.author.bio}
                  </p>
                </div>
              </div>

              {/* Newsletter Subscription Box */}
              <div className="bg-primary-container/40 border border-tertiary/20 rounded-lg p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-tertiary/50 blur-3xl rounded-full pointer-events-none" />

                <div className="inline-flex items-center gap-2 text-sm font-bold text-[#007568] mb-3">
                  <Send size={12} />
                  INFOLETTRE DÉDIÉE À LA CARRIÈRE
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                  Recevez nos conseils de candidature directement dans votre boîte.
                </h3>
                <p className="text-xs text-slate-600 mb-6">
                  Un email par semaine avec nos meilleurs guides, conseils de rédaction et astuces de recrutement.
                </p>

                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Votre adresse email professionnelle"
                    required
                    className="flex-1 px-4 py-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#007568] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg bg-[#007568] hover:bg-tertiary text-white font-bold text-xs transition-all shrink-0"
                  >
                    S'abonner
                  </button>
                </form>
                {subscribed && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-3">
                    <CheckCircle2 size={14} /> Merci ! Vous êtes bien inscrit à l'infolettre.
                  </p>
                )}
              </div>

            </article>

          </div>

          {/* Similar Articles Section at Bottom */}
          <section className="pt-12 border-t border-slate-100">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-8">
              Articles Similaires qui pourraient vous Intéresser
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => navigate(`/blog/${art.id}`)}
                  className="cursor-pointer group bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-tertiary/30 hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={art.image}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-tertiary border border-tertiary/20">
                        {art.category}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-2 text-xs text-slate-400">
                        <span>{art.date}</span>
                        <span>•</span>
                        <span>{art.readTime}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-tertiary transition-colors leading-snug line-clamp-2">
                        {art.title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-tertiary">
                      <span>Lire l'article</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      ) : (
        /* MAIN BLOG LIST VIEW */
        <>
          {/* Hero Header Section */}
          <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center bg-transparent">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-primary-container/50 blur-[130px] rounded-full pointer-events-none" />

            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#007568] mb-6">
              <BookOpen size={14} className="text-[#007568]" />
              Ressources et expertises RH
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-4 leading-[1.1]">
              Le Blog du <span className="text-[#007568]">Candidat Exécutif</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-500 leading-relaxed mb-8">
              Analyses de recrutements, guides de rédaction de CV, comparatifs d'outils et méthodologies d'entretien pour réussir sa carrière.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative mb-10">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article par mot-clé (ex: ATS, STAR, CV, Lettre)..."
                className="w-full pl-11 pr-4 py-3.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#007568] focus:ring-2 focus:ring-tertiary/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#007568] text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Featured Article Card ("À la une") */}
          {selectedCategory === 'Tous les articles' && !searchQuery && featuredArticle && (
            <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div
                onClick={() => navigate(`/blog/${featuredArticle.id}`)}
                className="cursor-pointer bg-white border border-slate-200 hover:border-tertiary/30 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 group"
              >

                {/* Image Column */}
                <div className="lg:col-span-5 relative h-52 sm:h-60 lg:h-72 overflow-hidden bg-slate-100">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#007568] text-white text-xs font-extrabold">
                      À la une
                    </span>
                  </div>
                </div>

                {/* Content Column */}
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3 text-xs text-slate-400">
                      <span className="px-2.5 py-0.5 rounded bg-primary-container/40 text-tertiary border border-tertiary/20 font-bold text-xs">
                        {featuredArticle.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {featuredArticle.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {featuredArticle.readTime}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 group-hover:text-tertiary transition-colors leading-snug">
                      {featuredArticle.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                      {featuredArticle.excerpt}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={featuredArticle.author.avatar}
                        alt={featuredArticle.author.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{featuredArticle.author.name}</div>
                        <div className="text-xs text-slate-400">{featuredArticle.author.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 group-hover:bg-slate-800 text-white text-xs font-bold transition-all">
                      <span>Lire l'article</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>

                </div>

              </div>
            </section>
          )}

          {/* Main Articles Grid */}
          <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{filteredArticles.length} Articles disponibles</span>
                {selectedCategory !== 'Tous les articles' && (
                  <span className="text-xs font-normal text-tertiary">({selectedCategory})</span>
                )}
              </h2>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                <BookOpen size={40} className="mx-auto text-slate-400 mb-3" />
                <p className="text-base font-bold text-slate-700">Aucun article trouvé</p>
                <p className="text-xs text-slate-400 mt-1">Essayez une autre recherche ou réinitialisez la catégorie.</p>
                <button
                  type="button"
                  onClick={() => { setSelectedCategory('Tous les articles'); setSearchQuery(''); }}
                  className="mt-4 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Voir tous les articles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredArticles.map((art) => (
                  <article
                    key={art.id}
                    onClick={() => navigate(`/blog/${art.id}`)}
                    className="cursor-pointer group bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-tertiary/30 hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                  >
                    <div>
                      {/* Thumbnail Image */}
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        <img
                          src={art.image}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-tertiary border border-tertiary/20">
                          {art.category}
                        </span>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-2 text-xs text-slate-400">
                          <span>{art.date}</span>
                          <span>•</span>
                          <span>{art.readTime}</span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-tertiary transition-colors leading-snug">
                          {art.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {art.excerpt}
                        </p>
                      </div>
                    </div>

                    {/* Footer Author & CTA */}
                    <div className="p-6 pt-0">
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={art.author.avatar}
                            alt={art.author.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <span className="text-xs text-slate-600 font-medium">{art.author.name}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-tertiary hover:text-tertiary transition-colors">
                          <span>Lire</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Footer */}
      <Footer light />

    </div>
  );
}
