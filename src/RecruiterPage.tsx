import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import {
  Briefcase,
  Users,
  Search,
  Send,
  Plus,
  CheckCircle,
  Clock,
  Building,
  Target,
  Sparkles,
  LogOut,
  ChevronRight,
  TrendingUp,
  Mail,
  Filter,
  UserCheck,
  AlertCircle,
  X,
  ChevronDown,
  Award,
  Laptop,
  Check
} from 'lucide-react';
import { GenerateOutreachApiResponse } from './infrastructure/routes/outreachApi';
import { supabase } from './lib/supabase';
import {
  PipelineStatus,
  RecruiterApplication,
  RecruiterJob,
  CreateJobInput,
  listRecruiterJobs,
  listRecruiterApplications,
  createJob,
  updatePipelineStatus,
} from './lib/recruiterApi';

export type { PipelineStatus, RecruiterApplication, RecruiterJob };

type RecruiterTab = 'overview' | 'jobs' | 'post-job' | 'applications';

export const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, { label: string; colorClass: string }> = {
  nouveau: {
    label: 'Nouveau',
    colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  },
  en_revision: {
    label: 'En Révision',
    colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  },
  entretien_planifie: {
    label: 'Entretien Planifié',
    colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  offre_envoyee: {
    label: 'Offre Envoyée',
    colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  engage: {
    label: 'Engagé / Recruté',
    colorClass: 'bg-green-500/10 text-green-400 border-green-500/30'
  },
  refuse: {
    label: 'Refusé',
    colorClass: 'bg-red-500/10 text-red-400 border-red-500/30'
  }
};

export default function RecruiterPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<RecruiterTab>('overview');
  const [jobsList, setJobsList] = useState<RecruiterJob[]>([]);
  const [applicationsList, setApplicationsList] = useState<RecruiterApplication[]>([]);

  const refreshRecruiterData = async () => {
    if (!user) return;
    const [jobsData, applicationsData] = await Promise.all([
      listRecruiterJobs(user.id),
      listRecruiterApplications(user.id),
    ]);
    setJobsList(jobsData);
    setApplicationsList(applicationsData);
  };

  useEffect(() => {
    refreshRecruiterData();
  }, [user?.id]);

  // Filter State for Applications
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appJobFilter, setAppJobFilter] = useState('all');

  // Structured Job Submission Form State
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState(user?.companyName || 'Tech Corp France');
  const [contractType, setContractType] = useState('CDI');
  const [remotePolicy, setRemotePolicy] = useState('Hybride (2-3j/sem)');
  const [jobLocation, setJobLocation] = useState('Paris (75)');
  const [experienceLevel, setExperienceLevel] = useState('Senior (5-8 ans)');
  const [salaryRange, setSalaryRange] = useState('55K€ - 68K€');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('React, TypeScript, Node.js, Tailwind CSS, PostgreSQL');
  const [descriptionText, setDescriptionText] = useState('');
  const [benefitsText, setBenefitsText] = useState('Tickets-restaurant 10€, Mutuelle 100%, RTT, Pass Navigo 50%.');
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [postSuccessMessage, setPostSuccessMessage] = useState('');
  const [postErrorMessage, setPostErrorMessage] = useState('');

  // Outreach Contact Modal State
  const [contactModalApp, setContactModalApp] = useState<RecruiterApplication | null>(null);
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'linkedin_inmail' | 'linkedin_connection_note'>('email');
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState('');

  // Handle Pipeline Status Change for a Candidate
  const handleUpdatePipelineStatus = async (appId: string, newStatus: PipelineStatus) => {
    setApplicationsList(prev => prev.map(app => {
      if (app.id === appId) {
        return { ...app, pipelineStatus: newStatus };
      }
      return app;
    }));
    await updatePipelineStatus(appId, newStatus);
  };

  // Handle New Structured Job Submission
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostErrorMessage('');
    setPostSuccessMessage('');

    if (!jobTitle.trim() || !descriptionText.trim()) {
      setPostErrorMessage('Veuillez remplir au minimum l\'intitulé et la description du poste.');
      return;
    }

    if (!user) {
      setPostErrorMessage('Vous devez être connecté pour publier une offre.');
      return;
    }

    setIsSubmittingJob(true);

    try {
      const skillsArray = requiredSkillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const input: CreateJobInput = {
        title: jobTitle,
        company: companyName,
        location: jobLocation,
        contractType,
        remotePolicy,
        experienceLevel,
        salaryRange,
        requiredSkills: skillsArray,
        descriptionText,
        benefitsText,
      };

      const newRecruiterJob = await createJob(user.id, input);

      setJobsList(prev => [newRecruiterJob, ...prev]);
      setPostSuccessMessage('Offre d\'emploi publiée avec succès ! Elle est désormais active et indexée pour le matching ATS.');
      setJobTitle('');
      setDescriptionText('');
      setTimeout(() => setPostSuccessMessage(''), 4000);
    } catch (err: any) {
      setPostErrorMessage(err.message || 'Erreur lors de la publication de l\'offre.');
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // Handle Candidate Outreach Generation
  const handleGenerateOutreachForApp = async (app: RecruiterApplication) => {
    setIsGeneratingOutreach(true);
    setGeneratedOutreach('');

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          jobOfferInput: `${app.jobTitle} chez ${user?.companyName || 'Tech Corp France'}`,
          channel: outreachChannel,
          cvSummary: `Candidat : ${app.candidateName}, Score ATS : ${app.matchScore}%, Profil : ${app.candidateRole}`,
          language: 'fr',
        }),
      });
      const response: GenerateOutreachApiResponse = await res.json();

      if (response.success && response.content) {
        setGeneratedOutreach(response.content);
      } else {
        throw new Error(response.error || 'Échec de la génération du message.');
      }
    } catch (err) {
      setGeneratedOutreach(
        `Bonjour ${app.candidateName},\n\nJ'ai consulté votre candidature et votre CV pour le poste de "${app.jobTitle}" avec beaucoup d'intérêt (Score ATS : ${app.matchScore}%).\n\nVotre profil correspond à nos attentes. Seriez-vous disponible pour un court entretien téléphonique de 15 minutes cette semaine ?\n\nBien cordialement,\n${user?.name || 'Sarah Jenkins'}\n${user?.companyName || 'Tech Corp France'}`
      );
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  // Filtered Applications
  const filteredApplications = applicationsList.filter(app => {
    const matchesSearch = app.candidateName.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                          app.jobTitle.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                          app.candidateRole.toLowerCase().includes(appSearchQuery.toLowerCase());
    const matchesJob = appJobFilter === 'all' || app.jobId === appJobFilter;
    return matchesSearch && matchesJob;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      {/* Recruiter Sidebar */}
      <aside className="w-full md:w-64 bg-[#0d1424] border-r border-slate-800 flex flex-col shrink-0">
        {/* Branding & Recruiter Badge */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-lg flex items-center justify-center shadow-inner">
              R
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white block leading-none">Lettrup</span>
              <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">ESPACE RECRUTEUR</span>
            </div>
          </Link>
        </div>

        {/* Recruiter Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
            Gestion RH & Sourcing
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp size={17} />
            <span>Vue d'ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab('post-job')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'post-job'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Plus size={17} />
            <span>Publier une Offre</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Briefcase size={17} />
            <span>Mes Offres ({jobsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users size={17} />
            <span>Suivi des Candidatures ({applicationsList.length})</span>
          </button>
        </nav>

        {/* Account Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090e1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center">
                {user?.name?.charAt(0) || 'R'}
              </div>
              <div className="truncate text-xs">
                <div className="font-bold text-white truncate">{user?.name || 'Sarah Jenkins'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.companyName || 'Tech Corp France'}</div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top Recruiter Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Espace Recruteur & Talent Acquisition
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                PRO RECRUITER
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Publiez vos offres, consultez les scores de matching des candidats et gérez vos candidatures en direct.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('post-job')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Nouvelle Offre d'Emploi</span>
          </button>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold">Offres Actives</span>
                  <Briefcase size={18} className="text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{jobsList.filter(j => j.status === 'active').length}</div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span>Indexées dans le moteur ATS</span>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold">Candidatures Reçues</span>
                  <Users size={18} className="text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{applicationsList.length}</div>
                <div className="text-[11px] text-slate-400 mt-2 text-emerald-400">
                  +5 nouvelles candidatures
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold">Score Moyen Job Match</span>
                  <Target size={18} className="text-purple-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {Math.round(applicationsList.reduce((acc, a) => acc + a.matchScore, 0) / (applicationsList.length || 1))}%
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Matching CV automatique
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-semibold">Candidats Qualifiés</span>
                  <Award size={18} className="text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {applicationsList.filter(a => a.matchScore >= 85).length}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 text-emerald-400">
                  Score ATS &gt; 85%
                </div>
              </div>
            </div>

            {/* AUTOMATIC RESUME MATCHING SCORES BOARD */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-400" />
                    Scores de Matching Automatique des CV Candidats
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyse sémantique automatique du CV de chaque candidat par rapport à vos fiches de postes.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Voir toutes les candidatures ({applicationsList.length}) <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applicationsList.map(app => (
                  <div key={app.id} className="bg-[#090e1a] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-base">{app.candidateName}</h4>
                        <div className="text-xs text-amber-400 font-medium">{app.candidateRole}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{app.jobTitle}</div>
                      </div>

                      {/* Matching Score Badge */}
                      <div className="text-right shrink-0">
                        <div className={`px-3 py-1 rounded-xl border text-sm font-black font-mono inline-flex items-center gap-1.5 ${
                          app.matchScore >= 90
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : app.matchScore >= 80
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          <span>{app.matchScore}%</span>
                          <span className="text-[10px] font-normal uppercase">Match</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{app.matchGrade}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            app.matchScore >= 90 ? 'bg-emerald-400' : app.matchScore >= 80 ? 'bg-blue-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${app.matchScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Key skills matched */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {app.keyMatchingSkills.slice(0, 4).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-medium border border-slate-700">
                          ✓ {skill}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Status & Quick Contact */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Statut :</span>
                        <select
                          value={app.pipelineStatus}
                          onChange={(e) => handleUpdatePipelineStatus(app.id, e.target.value as PipelineStatus)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-hidden cursor-pointer ${PIPELINE_STATUS_CONFIG[app.pipelineStatus].colorClass}`}
                        >
                          {Object.entries(PIPELINE_STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key} className="bg-[#0f172a] text-slate-100">
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          setContactModalApp(app);
                          handleGenerateOutreachForApp(app);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={12} />
                        <span>Contacter</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Posted Jobs Preview */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">Vos Offres d'Emploi Actives</h3>
                  <p className="text-xs text-slate-400">Gestion et suivi de vos publications</p>
                </div>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Voir tout ({jobsList.length}) <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {jobsList.map(job => (
                  <div key={job.id} className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{job.title}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {job.status === 'active' ? 'Active' : 'En révision'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Building size={13} /> {job.company}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">{job.salaryRange}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      {job.applicationsCount || 5} candidatures reçues
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POST A JOB */}
        {activeTab === 'post-job' && (
          <div className="max-w-4xl mx-auto bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="text-amber-400" size={22} />
                Publier une Nouvelle Offre d'Emploi
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Complétez les critères de votre offre. Elle sera instantanément indexée pour le calcul de matching sémantique ATS.
              </p>
            </div>

            {postSuccessMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                <span>{postSuccessMessage}</span>
              </div>
            )}

            {postErrorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{postErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePostJob} className="space-y-6">
              {/* Row 1: Title & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Intitulé du Poste *</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Développeur Full Stack Senior React / Node.js"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Nom de l'Entreprise *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Tech Corp France"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Contract, Remote Policy & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Type de Contrat</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="CDI">CDI (Temps Plein)</option>
                    <option value="CDD">CDD</option>
                    <option value="Freelance / Indépendant">Freelance / Indépendant</option>
                    <option value="Stage">Stage</option>
                    <option value="Alternance">Alternance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Politique Télétravail</label>
                  <select
                    value={remotePolicy}
                    onChange={(e) => setRemotePolicy(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="Hybride (2-3j/sem)">Hybride (2-3 jours/semaine)</option>
                    <option value="Télétravail 100%">Télétravail 100% (Remote)</option>
                    <option value="Sur site">Sur site uniquement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Localisation</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="Ex: Paris (75) ou Lyon (69)"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Experience Level, Salary & Required Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Niveau d'Expérience Exigé</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="Junior (0-2 ans)">Junior (0-2 ans)</option>
                    <option value="Confirmé (2-5 ans)">Confirmé (2-5 ans)</option>
                    <option value="Senior (5-8 ans)">Senior (5-8 ans)</option>
                    <option value="Lead / Expert (8+ ans)">Lead / Expert (8+ ans)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Fourchette Salariale Annuelle</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="Ex: 55K€ - 68K€"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Required ATS Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Mots-clés & Compétences Clés ATS (séparés par des virgules) *
                </label>
                <input
                  type="text"
                  value={requiredSkillsInput}
                  onChange={(e) => setRequiredSkillsInput(e.target.value)}
                  placeholder="Ex: React, TypeScript, Node.js, Tailwind, PostgreSQL, Docker"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                  required
                />
              </div>

              {/* Description & Benefits */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Description Détaillée & Responsabilités du Poste *</label>
                <textarea
                  rows={6}
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  placeholder="Missions principales, contexte de l'équipe, défis techniques et profil recherché..."
                  className="w-full p-4 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden font-mono leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Avantages & Benefits (Optionnel)</label>
                <input
                  type="text"
                  value={benefitsText}
                  onChange={(e) => setBenefitsText(e.target.value)}
                  placeholder="Ex: Tickets-restaurant, Mutuelle 100%, RTT, Pass Navigo..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingJob}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingJob ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Publication en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Publier et Analyser l'Offre</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: JOBS LIST (MES OFFRES - Without "Lancer Matching Candidat") */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Toutes vos Offres Publiées</h2>
              <span className="text-xs text-slate-400">{jobsList.length} offres enregistrées</span>
            </div>

            <div className="space-y-4">
              {jobsList.map(job => (
                <div key={job.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white">{job.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {job.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-200">{job.company}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{job.contractType}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{job.remotePolicy}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{job.salaryRange}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-slate-300 font-bold">{job.applicationsCount} Candidatures</div>
                      <div className="text-[10px] text-slate-400">Publiée le {job.createdAt}</div>
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-[#090e1a] p-4 rounded-xl border border-slate-800/80 font-mono">
                    {job.descriptionText}
                  </p>

                  {job.benefitsText && (
                    <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/50 flex items-center gap-2">
                      <Award size={14} className="text-amber-400 shrink-0" />
                      <span><strong>Avantages :</strong> {job.benefitsText}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: APPLICATIONS TRACKING (SUIVI DES CANDIDATURES REÇUES) */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-amber-400" />
                    Suivi des Candidatures Reçues
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Gérez et modifiez les statuts du pipeline de recrutement pour vos candidats qualifiés.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={appSearchQuery}
                      onChange={(e) => setAppSearchQuery(e.target.value)}
                      placeholder="Rechercher candidat ou poste..."
                      className="pl-9 pr-3 py-2 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden w-60"
                    />
                  </div>

                  {/* Filter by Job */}
                  <select
                    value={appJobFilter}
                    onChange={(e) => setAppJobFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
                  >
                    <option value="all">Toutes les offres</option>
                    {jobsList.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Applications Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="p-3">Candidat</th>
                      <th className="p-3">Poste Cible</th>
                      <th className="p-3">Score Matching CV</th>
                      <th className="p-3">STATUT PIPELINE</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredApplications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{app.candidateName}</div>
                          <div className="text-[11px] text-slate-400">{app.candidateEmail}</div>
                          <div className="text-[10px] text-amber-400">{app.candidateRole}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-medium text-slate-200">{app.jobTitle}</div>
                          <div className="text-[10px] text-slate-500">Reçu le {app.appliedAt}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-md font-bold font-mono text-xs border ${
                              app.matchScore >= 90
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : app.matchScore >= 80
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {app.matchScore}%
                            </span>
                            <span className="text-[11px] text-slate-400">{app.matchGrade}</span>
                          </div>
                        </td>

                        {/* Interactive Pipeline Status Dropdown */}
                        <td className="p-3">
                          <select
                            value={app.pipelineStatus}
                            onChange={(e) => handleUpdatePipelineStatus(app.id, e.target.value as PipelineStatus)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-hidden cursor-pointer shadow-inner ${PIPELINE_STATUS_CONFIG[app.pipelineStatus].colorClass}`}
                          >
                            {Object.entries(PIPELINE_STATUS_CONFIG).map(([key, config]) => (
                              <option key={key} value={key} className="bg-[#0f172a] text-slate-100 font-medium">
                                {config.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setContactModalApp(app);
                              handleGenerateOutreachForApp(app);
                            }}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-300 rounded-xl cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            <Send size={12} />
                            <span>Contacter</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OUTREACH CONTACT MODAL */}
        {contactModalApp && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
              <button
                onClick={() => setContactModalApp(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Send size={18} className="text-amber-400" />
                  Prise de Contact IA - {contactModalApp.candidateName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Message d'approche généré sur-mesure pour le poste : <span className="text-slate-200 font-semibold">{contactModalApp.jobTitle}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Canal de Communication</label>
                <select
                  value={outreachChannel}
                  onChange={(e) => {
                    const ch = e.target.value as any;
                    setOutreachChannel(ch);
                    if (contactModalApp) handleGenerateOutreachForApp(contactModalApp);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090e1a] border border-slate-800 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="email">E-mail Recrutement Formalisé</option>
                  <option value="linkedin_inmail">LinkedIn InMail / Message Direct</option>
                  <option value="linkedin_connection_note">Note de Connexion LinkedIn (&lt;300 car.)</option>
                </select>
              </div>

              {isGeneratingOutreach ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Génération du message d'approche par l'IA en cours...</p>
                </div>
              ) : (
                <div className="bg-[#090e1a] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-amber-400">Message Personnalisé Prêt</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedOutreach);
                        alert('Message copié dans le presse-papier !');
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
                    >
                      Copier le Texte
                    </button>
                  </div>
                  <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                    {generatedOutreach}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setContactModalApp(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
