import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';
import logoIcon from './assets/logo-icon.png';
import { usePageSEO } from './hooks/usePageSEO';
import {
  ArrowRight,
  Check,
  X,
  FileText,
  Brain,
  Target,
  Layout,
  Mail,
  Globe,
  Bot,
  Download,
  BookOpen,
  Send,
  ShieldCheck,
  Award,
  Layers,
  ChevronRight,
  UserCheck,
  Briefcase,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  usePageSEO({
    title: 'Lettrup — Plateforme IA de Création de CV, Lettres & Préparation aux Entretiens',
    description: "Découvrez Lettrup, le copilote IA pour vos candidatures : création de CV compatibles ATS, lettres de motivation sur mesure, simulation d'entretien vocale et portfolios web.",
    canonicalPath: '/',
  });

  const [activeStep, setActiveStep] = useState<number>(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const pipelineSteps = [
    { id: 0, num: '01', title: 'BRAIN-STORMING', icon: Brain, label: 'Analyse IA', desc: 'Extraction automatique des compétences clés et des mots-clés stratégiques de votre profil.' },
    { id: 1, num: '02', title: 'RÉDACTION', icon: FileText, label: 'Texte & Impact', desc: 'Formulations percutantes avec chiffres d\'impact et vocabulaire adapté aux recruteurs.' },
    { id: 2, num: '03', title: 'ATS COMPATIBLE', icon: Target, label: 'Score ATS', desc: 'Vérification instantanée du taux de passage au travers des logiciels de recrutement.' },
    { id: 3, num: '04', title: 'MISE EN PAGE', icon: Layout, label: 'Design Pro', desc: 'Choix parmi nos modèles haute précision optimisés pour une lisibilité parfaite.' },
    { id: 4, num: '05', title: 'LETTRE DE MOTIVATION', icon: Mail, label: 'Sur-Mesure', desc: 'Génération de lettres ciblées pour chaque offre en un clic.' },
    { id: 5, num: '06', title: 'PORTFOLIO WEB', icon: Globe, label: 'Page en Ligne', desc: 'Publication automatique d\'un site web interactif lié à votre CV.' },
    { id: 6, num: '07', title: 'SIMULATEUR IA', icon: Bot, label: 'Entretien', desc: 'Entraînement interactif aux questions pièges posées par les recruteurs.' },
    { id: 7, num: '08', title: 'EXPORT PRO', icon: Download, label: 'Multi-Formats', desc: 'Exportation immédiate en PDF vectoriel, Word ou JSON structuré.' },
  ];

  const features = [
    {
      icon: Brain,
      tag: 'Optimisation IA',
      title: 'Brainstorming & Accroches IA',
      desc: 'Générez des résumés professionnels captivants, des titres percutants et identifiez vos forces cachées en quelques secondes.'
    },
    {
      icon: FileText,
      tag: 'Rédaction & Extraction',
      title: 'Moteur de Rédaction Dynamique',
      desc: 'Rédigez des descriptions d\'expériences quantifiées et orientées résultats, parfaitement adaptées aux attentes du poste.'
    },
    {
      icon: Target,
      tag: 'Structure & ATS',
      title: 'ATS Score Multi-Critères',
      desc: 'Mesurez et améliorez la lisibilité algorithmique de votre CV pour franchir sans effort les filtres automatiques.'
    },
    {
      icon: Layout,
      tag: 'Éditeur & Design',
      title: 'Éditeur de Modèles Pro',
      desc: 'Personnalisez les polices, marges, espacements et couleurs en temps réel avec un rendu haute précision.'
    },
    {
      icon: Mail,
      tag: 'Candidature Ciblée',
      title: 'Lettre de Motivation IA',
      desc: 'Créez des lettres convaincantes et authentiques ajustées à l\'entreprise et au ton souhaité (professionnel, enthousiaste, créatif).'
    },
    {
      icon: Globe,
      tag: 'Visibilité 24/7',
      title: 'Portfolio & Site Web Express',
      desc: 'Transformez vos données de CV en un portfolio en ligne élégant avec votre propre lien personnalisable.'
    },
    {
      icon: Bot,
      tag: 'IA de Posture',
      title: 'Simulateur d\'Entretien',
      desc: 'Préparez vos entretiens avec un coach IA vocal/textuel qui évalue vos réponses selon la méthode STAR.'
    },
    {
      icon: Download,
      tag: 'Exports & Partage',
      title: 'Exports Multi-Formats HD',
      desc: 'Téléchargez vos documents au format PDF haute résolution garanti sans saut de page indésirable.'
    }
  ];

  const comparisonRows = [
    { feat: 'Gestion du pipeline de candidature complet (CV + Lettre + Site)', pilot: true, classic: false, word: false },
    { feat: 'Optimisation ATS & Mots-clés IA en temps réel', pilot: true, classic: false, word: false },
    { feat: 'Génération automatique de Portfolio Web interactif', pilot: true, classic: false, word: false },
    { feat: 'Simulateur d\'entretien IA personnalisé', pilot: true, classic: false, word: false },
    { feat: 'Suivi Kanban des candidatures et relances', pilot: true, classic: false, word: false },
    { feat: 'Traductions multilingues préservant le jargon métier', pilot: true, classic: false, word: false },
    { feat: 'Export PDF vectoriel sans décalage de mise en page', pilot: true, classic: true, word: false },
  ];

  const articles = [
    {
      img: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      badge: 'Guide de Rédaction',
      date: '2026-06-15 • 5 min de lecture',
      title: 'Le Guide Ultime de la Rédaction de CV pour 2026 (Format ATS & Modèles)',
      desc: 'Règles typographiques, mots-clés prioritaires et pièges à éviter pour maximiser vos chances auprès des recruteurs.'
    },
    {
      img: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
      badge: 'Comparatif',
      date: '2026-06-10 • 4 min de lecture',
      title: 'Lettrup vs Canva & Word : Le Comparatif Complet 2026',
      desc: 'Analyse comparative approfondie entre les éditeurs traditionnels et notre plateforme IA tout-en-un.'
    },
    {
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      badge: 'Technique d\'Entretien',
      date: '2026-06-01 • 6 min de lecture',
      title: 'Réussir son Entretien d\'Embauche grâce à la Méthode STAR',
      desc: 'Découvrez l\'art de structurer vos réponses pour convaincre immédiatement le jury lors d\'un entretien.'
    }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#007568] selection:text-white antialiased">

      {/* Top Bar Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoIcon} alt="Lettrup" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">Lettrup</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PRO</span>
            </div>
          </Link>

          {/* Middle Nav Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-full text-xs font-semibold text-slate-600">
            <a href="#pipeline" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Accueil</a>
            <a href="#features" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Fonctionnalités</a>
            <Link to="/pricing" className="px-4 py-2 rounded-full text-tertiary font-bold hover:text-tertiary hover:bg-white transition-colors">Tarifs</Link>
            <Link to="/blog" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Blog & Guides</Link>
            <a href="#comparison" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Comparatif</a>
            <a href="#faq" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">FAQ</a>
          </div>

          {/* Action buttons */}
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

      {/* Hero Header Section */}
      <section className="relative bg-tertiary text-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">

          {/* Copy column — order-2 on desktop so it sits on the right, next to the mockup */}
          <div className="text-center lg:text-left lg:order-2">
            <p className="text-sm font-semibold text-accent mb-6">
              Scanner de profil LinkedIn inclus
            </p>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8">
              Soyez embauché,
              <br />
              <span className="text-accent">pas juste vu.</span>
            </h1>

            <p className="text-base sm:text-lg text-white/75 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              La plupart des outils vous donnent un CV. Lettrup vous donne l'entretien : du scan LinkedIn à la préparation, tout au même endroit.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 mb-6">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-base text-tertiary bg-accent hover:bg-white transition-colors active:scale-95"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pipeline"
                className="font-semibold text-sm text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors"
              >
                Voir comment ça marche
              </a>
            </div>

            <p className="text-xs font-medium text-white/60">
              Pas de carte bancaire requise. Gratuit pour démarrer.
            </p>
          </div>

          {/* Mockup column — order-1 on desktop so it sits on the left; max-w-lg for a larger card */}
          <div className="relative max-w-lg mx-auto w-full lg:order-1">
            <div className="relative bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-[#007568] flex items-center justify-center text-white font-bold text-xl shrink-0">
                  S
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Sophie Martin</div>
                  <div className="text-sm text-slate-400">Product Manager · Paris</div>
                </div>
              </div>

              <div className="space-y-5 mb-7">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-slate-800">Lead PM</div>
                    <div className="text-sm text-slate-400">Doctolib</div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">2022–24</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-slate-800">Product Manager</div>
                    <div className="text-sm text-slate-400">BlaBlaCar</div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">2020–22</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {['Product Strategy', 'Agile', 'Data Analysis', 'Roadmapping'].map((tag) => (
                  <span key={tag} className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-100 text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Match badge */}
            <div className="absolute -top-12 right-2 sm:-top-8 sm:-right-4 flex flex-col items-center leading-none px-4 py-3 sm:px-6 sm:py-4 rounded-lg bg-accent text-tertiary shadow-xl">
              <span className="text-xs font-bold">Match</span>
              <span className="text-3xl sm:text-4xl font-black">94%</span>
            </div>

            {/* ATS ready badge */}
            <div className="absolute -bottom-6 left-4 px-4 py-2.5 rounded-lg bg-primary text-white shadow-xl text-sm font-semibold">
              Score ATS : 97
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Pipeline Steps Section */}
      <section id="pipeline" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-14">
          <h2 className="text-4xl sm:text-5xl font-black text-tertiary tracking-tight leading-[1.1]">
            Un seul pipeline, du premier mot à l'entretien
          </h2>
          <p className="text-base text-slate-600 mt-4">Vos informations sont réutilisées d'une étape à l'autre. Vous ne saisissez rien deux fois.</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-16 items-start">
          {/* Step list */}
          <ol className="divide-y divide-slate-200 border-y border-slate-200">
            {pipelineSteps.map((step) => {
              const isSelected = activeStep === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    aria-current={isSelected ? 'step' : undefined}
                    className={`w-full flex items-baseline gap-5 py-3.5 text-left transition-colors ${
                      isSelected ? 'text-primary' : 'text-slate-500 hover:text-tertiary'
                    }`}
                  >
                    <span className="w-8 text-sm font-bold tabular-nums">{step.num}</span>
                    <span className={`text-lg ${isSelected ? 'font-black' : 'font-semibold'}`}>{step.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Selected step detail */}
          {pipelineSteps[activeStep] && (
            <div className="order-first lg:order-none bg-primary text-white rounded-lg p-8 sm:p-12 lg:sticky lg:top-28">
              <p className="text-8xl sm:text-9xl font-black leading-none text-accent tabular-nums">
                {pipelineSteps[activeStep].num}
              </p>
              <p className="text-sm font-semibold text-white/75 mt-8">{pipelineSteps[activeStep].label}</p>
              <h3 className="text-3xl font-black mt-1">{pipelineSteps[activeStep].title}</h3>
              <p className="text-lg text-white/85 mt-4 leading-relaxed">{pipelineSteps[activeStep].desc}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg font-bold text-sm text-tertiary bg-accent hover:bg-white transition-colors"
              >
                <span>Essayer cette étape</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Grid of 8 Features Section */}
      <section id="features" className="bg-primary-container/60 py-20 lg:py-28">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-tertiary tracking-tight leading-[1.1] max-w-3xl mb-14">
            Huit outils, pensés comme ceux d'un cabinet de recrutement
          </h2>

          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-16">
            {/* Lead feature: the one that decides whether the CV gets read at all */}
            <div className="bg-tertiary text-white rounded-lg p-8 sm:p-10 flex flex-col justify-between lg:min-h-[28rem]">
              <p className="text-sm font-semibold text-accent">{features[2].tag}</p>
              <div>
                <h3 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{features[2].title}</h3>
                <p className="text-lg text-white/80 leading-relaxed">{features[2].desc}</p>
              </div>
            </div>

            {/* The other seven: a plain ruled list, no boxes */}
            <ul className="divide-y divide-tertiary/15 border-y border-tertiary/15 self-start">
              {features.filter((_, i) => i !== 2).map((feat) => (
                <li key={feat.title} className="py-5 grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1">
                  <h3 className="text-lg font-black text-tertiary">{feat.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{feat.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison Table Section ("Pourquoi Choisir Lettrup ?") */}
      <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pourquoi Choisir Lettrup ?
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Comparé aux éditeurs de CV traditionnels et outils génériques.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="py-4 px-6 text-xs font-bold text-slate-500">Fonctionnalité</th>
                <th className="py-4 px-6 text-sm font-black text-white bg-primary text-center">
                  Lettrup Pro
                </th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 text-center">Éditeurs Classiques</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 text-center">Canva / Word</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-800">{row.feat}</td>
                  <td className="py-4 px-6 bg-primary-container/50 text-center">
                    {row.pilot ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white" aria-label="Disponible">
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : (
                      <X size={16} className="mx-auto text-slate-300" aria-label="Non disponible" />
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {row.classic ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600" aria-label="Disponible">
                        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400" aria-label="Non disponible">
                        <X size={12} aria-hidden="true" />
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {row.word ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600" aria-label="Disponible">
                        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400" aria-label="Non disponible">
                        <X size={12} aria-hidden="true" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Blog & Guides Section */}
      <section id="blog" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Derniers Articles & Guides Carrière</h2>
            <p className="text-sm text-slate-500 mt-2">Conseils d'experts et guides pratiques pour booster vos candidatures.</p>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-600 transition-colors shrink-0"
          >
            <span>Voir tous les articles</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((art, i) => (
            <Link key={i} to="/blog" className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-tertiary/30 hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={art.img}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded bg-white/90 backdrop-blur-md text-tertiary border border-tertiary/20">
                  {art.badge}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400">{art.date}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 mb-2 group-hover:text-tertiary transition-colors leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {art.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-tertiary">
                  <span>Lire l'article</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <FAQSection light />

      {/* CTA Bottom Hero Section */}
      <section className="bg-primary text-white py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-10 items-end">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
            Votre prochain CV se décide aujourd'hui.
          </h2>
          <div>
            <p className="text-lg text-white/85 leading-relaxed mb-8">
              Créez votre profil gratuitement, importez votre CV actuel et voyez votre score ATS en quelques secondes.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-base text-tertiary bg-accent hover:bg-white transition-colors active:scale-95"
            >
              <span>Lancer l'éditeur gratuitement</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer light />
    </div>
  );
}
