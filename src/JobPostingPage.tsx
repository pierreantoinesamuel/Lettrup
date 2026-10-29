import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sparkles, MapPin, Briefcase, Calendar, ArrowLeft, CheckCircle2, Share2, ShieldCheck, Zap } from 'lucide-react';
import Footer from './components/Footer';
import { getActiveJobById } from './services/jobPostingService';
import { usePageSEO } from './hooks/usePageSEO';

interface JobDetails {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  datePosted: string;
  description: string;
  requirements: string[];
  skills: string[];
}

const JOBS_DATABASE: Record<string, JobDetails> = {
  'job-101': {
    id: 'job-101',
    title: 'Développeur Full Stack Senior (React / Node.js)',
    company: 'TechCorp Solutions',
    location: 'Paris, France (Hybride)',
    type: 'CDI - Temps plein',
    salary: '55 000 € - 68 000 € / an',
    datePosted: '2026-07-20',
    description: `TechCorp Solutions recherche un Développeur Full Stack Senior pour piloter la création et l'évolution de nos architectures web SaaS B2B. Vous rejoindrez une équipe passionnée de 12 ingénieurs en forte croissance.\n\nVos missions principales :\n- Concevoir des interfaces utilisateurs réactives et accessibles sous React & TypeScript\n- Développer des API REST & GraphQL robustes sous Node.js / Express\n- Participer à l'optimisation des performances, des pipelines CI/CD et des tests automatisés\n- Collaborer directement avec l'équipe Produit & Design`,
    requirements: [
      'Plus de 5 ans d\'expérience professionnelle en développement web Full Stack',
      'Maîtrise approfondie de React, TypeScript, Node.js et des bases de données SQL/NoSQL',
      'Expérience confirmée sur les architectures microservices et Docker',
      'Aptitude au travail en équipe Agile/Scrum et sensibilité à la qualité de code'
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Docker', 'CI/CD']
  },
  'job-102': {
    id: 'job-102',
    title: 'Product Manager IA & SaaS',
    company: 'InnoData France',
    location: 'Lyon, France',
    type: 'CDI - Temps plein',
    salary: '50 000 € - 62 000 € / an',
    datePosted: '2026-07-22',
    description: `InnoData recherche un Product Manager passionné par l'intelligence artificielle pour concevoir la roadmap produit et superviser la livraison des fonctionnalités GenAI de notre suite d'outils B2B.\n\nVos missions :\n- Définir la vision produit et prioriser le backlog avec les équipes techniques\n- Réaliser des interviews utilisateurs et analyser l'usage produit\n- Rédiger les spécifications fonctionnelles pour les fonctionnalités d'IA générative`,
    requirements: [
      '3+ ans d\'expérience comme Product Manager sur un produit SaaS B2B',
      'Compréhension des modèles LLM et de l\'intégration des API d\'IA',
      'Excellentes capacités d\'analyse, de communication et de gestion des parties prenantes'
    ],
    skills: ['Product Management', 'IA Générative', 'Roadmap', 'Agile/Scrum', 'UX/UI']
  }
};

export default function JobPostingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // JOBS_DATABASE only has the 2 demo postings — every real recruiter job
  // (from the `jobs` table) needs a live fetch (SEO audit follow-up,
  // 2026-08-12: these previously always rendered the generic fallback below).
  const [realJob, setRealJob] = useState<JobDetails | null>(null);

  useEffect(() => {
    if (!id || JOBS_DATABASE[id]) return;
    let cancelled = false;
    getActiveJobById(id).then((fetched) => {
      if (!cancelled) setRealJob(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const job = (id && JOBS_DATABASE[id]) || realJob || {
    id: id || 'custom',
    title: 'Offre d\'emploi Recrutement Tech',
    company: 'Entreprise Partenaire',
    location: 'Paris / Télétravail',
    type: 'CDI - Temps plein',
    salary: 'Selon profil',
    datePosted: new Date().toISOString().split('T')[0],
    description: 'Poste stratégique pour accompagner la croissance de l\'entreprise. Utilisez Lettrup pour adapter instantanément votre CV à la fiche de poste.',
    requirements: [
      'Expérience significative dans le domaine d\'activité',
      'Maîtrise des outils digitaux et du travail en équipe',
      'Capacité d\'adaptation et rigueur professionnelle'
    ],
    skills: ['Communication', 'Résolution de problèmes', 'Gestion de projet']
  };

  usePageSEO({
    title: `${job.title} chez ${job.company} — Offre d'Emploi | Lettrup`,
    description: job.description,
    canonicalPath: `/job/${job.id}`,
  });

  const handleTailorWithJob = () => {
    // Navigate to builder with job context
    navigate('/builder', { state: { targetJobTitle: job.title, targetJobDesc: job.description } });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900">Lettrup</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">JOBS</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/blog"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
            >
              Conseils Candidature
            </Link>
            <button
              onClick={handleTailorWithJob}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
            >
              <Zap size={14} className="text-white" />
              <span>Adapter mon CV pour cette offre</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft size={14} />
          Retour à l'accueil
        </Link>

        {/* Job Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-mono font-semibold">
                <span>Offre Vérifiée ATS</span>
                <ShieldCheck size={14} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{job.title}</h1>
              <p className="text-sm font-semibold text-sky-600">{job.company}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{job.location}</span>
                <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" />{job.type}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" />Publié le {job.datePosted}</span>
                {job.salary && <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-medium">{job.salary}</span>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
              <button
                onClick={handleTailorWithJob}
                className="w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} className="text-white" />
                <span>Optimiser mon CV à 98% ATS</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText?.(window.location.href);
                  alert('Lien de l\'offre copié dans le presse-papier !');
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 size={14} />
                <span>Partager l'offre</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Description du Poste</h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line space-y-3">
                {job.description}
              </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Profil Recherché & Prérequis</h2>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-sky-50 to-white border border-sky-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sky-600">
                <Zap size={18} />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Copilote IA Lettrup</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Notre intelligence artificielle analyse le texte de cette offre pour extraire les mots-clés ATS essentiels et adapter votre CV automatiquement.
              </p>
              <button
                onClick={handleTailorWithJob}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10"
              >
                <span>Lancer l'adaptation instantanée</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compétences Clés Clés Extraites</h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.skills.map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer light />
    </div>
  );
}
