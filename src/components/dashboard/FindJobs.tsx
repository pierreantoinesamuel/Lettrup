import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Briefcase, Key, ShieldCheck, Check, Sparkles,
  ExternalLink, BookmarkPlus, BookmarkCheck, RefreshCw, AlertCircle,
  X, Filter, Building2, Calendar, FileText, CheckCircle2, Info,
  Euro, GraduationCap
} from 'lucide-react';
import {
  FranceTravailJob,
  searchFranceTravailJobs,
  getFranceTravailCredentials,
  saveFranceTravailCredentials,
  clearFranceTravailCredentials,
  SALARY_RANGE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  DATE_POSTED_OPTIONS,
} from '../../services/franceTravailService';
import { saveJobApplication, getUserJobApplications } from '../../services/jobTracker';
import { JobStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  FRANCE_TRAVAIL_MAX_PAGES,
  FRANCE_TRAVAIL_MAX_RESULTS,
  FRANCE_TRAVAIL_PAGE_SIZE,
} from '../../domain/constants/franceTravailPagination';

function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const visible = new Set([1, totalPages]);
  const start = currentPage <= 3 ? 2 : currentPage >= totalPages - 2 ? totalPages - 4 : currentPage - 1;
  for (let page = start; page <= Math.min(start + 3, totalPages - 1); page += 1) visible.add(page);
  return Array.from(visible).sort((left, right) => left - right);
}

const STATUS_LABELS: Record<JobStatus, string> = {
  Saved: 'Sauvegardée',
  Applied: 'Postulée',
  Interview: 'En entretien',
  Offer: 'Offre reçue',
  Rejected: 'Refusée',
};

const STATUS_STYLES: Record<JobStatus, string> = {
  Saved: 'bg-slate-100 text-slate-700 border border-slate-200',
  Applied: 'bg-[var(--status-green)]/10 text-[var(--status-green)] border border-[var(--status-green)]/30',
  Interview: 'bg-[var(--status-purple)]/10 text-[var(--status-purple)] border border-[var(--status-purple)]/30',
  Offer: 'bg-blue-500/10 text-blue-600 border border-blue-500/30',
  Rejected: 'bg-[var(--status-red)]/10 text-[var(--status-red)] border border-[var(--status-red)]/30',
};

interface FindJobsProps {
  onNavigateToTab?: (tab: string) => void;
}

export default function FindJobs({ onNavigateToTab }: FindJobsProps) {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user';

  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [contractType, setContractType] = useState('Tous');
  const [salaryRange, setSalaryRange] = useState('Tous');
  const [educationLevel, setEducationLevel] = useState('Tous');
  const [datePosted, setDatePosted] = useState('Tous');
  const [jobs, setJobs] = useState<FranceTravailJob[]>([]);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<FranceTravailJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedStatusByJobId, setTrackedStatusByJobId] = useState<Map<string, JobStatus>>(new Map());
  const [trackedStatusByCompanyRole, setTrackedStatusByCompanyRole] = useState<Map<string, JobStatus>>(new Map());

  // Credentials & Modal State
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isLiveApiActive, setIsLiveApiActive] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  // Load API Credentials & Initial Search
  useEffect(() => {
    const creds = getFranceTravailCredentials();
    setClientIdInput(creds.clientId);
    setClientSecretInput(creds.clientSecret);
    setHasCredentials(Boolean(creds.clientId && creds.clientSecret));

    performSearch('', '', 'Tous', 'Tous', 'Tous', 'Tous');
  }, []);

  // Load the user's already-tracked applications so re-visited offers show their real status
  // instead of resetting to "not saved" every time this tab remounts.
  useEffect(() => {
    if (!user?.id) return;
    getUserJobApplications(user.id).then((apps) => {
      const byJobId = new Map<string, JobStatus>();
      const byCompanyRole = new Map<string, JobStatus>();
      for (const app of apps) {
        if (app.job_id) byJobId.set(app.job_id, app.status);
        byCompanyRole.set(`${app.company.toLowerCase()}|${app.role.toLowerCase()}`, app.status);
      }
      setTrackedStatusByJobId(byJobId);
      setTrackedStatusByCompanyRole(byCompanyRole);
    }).catch((e) => console.error('Error loading tracked applications:', e));
  }, [user?.id]);

  const getTrackedStatus = (job: FranceTravailJob): JobStatus | undefined =>
    trackedStatusByJobId.get(job.id) ?? trackedStatusByCompanyRole.get(`${job.company.toLowerCase()}|${job.title.toLowerCase()}`);

  const performSearch = async (
    kw = keywords,
    loc = location,
    ct = contractType,
    sal = salaryRange,
    edu = educationLevel,
    date = datePosted,
    page = 1
  ) => {
    setIsLoading(true);
    setCurrentPage(page);
    try {
      const res = await searchFranceTravailJobs({
        keywords: kw,
        location: loc,
        contractType: ct,
        salaryRange: sal,
        educationLevel: edu,
        datePosted: date,
        page,
      });
      setJobs(res.jobs);
      setTotalJobs(res.total);
      setIsLiveApiActive(res.isLiveApi);
      if (res.errorNotice) {
        setStatusNotice(res.errorNotice);
      }
      if (res.jobs.length > 0) {
        setSelectedJob(res.jobs[0]);
      } else {
        setSelectedJob(null);
      }
    } catch (e) {
      console.error('Search error:', e);
      toast.error('Erreur lors de la recherche d\'offres.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const totalPages = Math.min(
    FRANCE_TRAVAIL_MAX_PAGES,
    Math.max(1, Math.ceil((totalJobs ?? jobs.length) / FRANCE_TRAVAIL_PAGE_SIZE))
  );
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) return;
    performSearch(keywords, location, contractType, salaryRange, educationLevel, datePosted, page);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIdInput.trim() || !clientSecretInput.trim()) {
      toast.warning('Veuillez remplir le Client ID et le Client Secret.');
      return;
    }
    saveFranceTravailCredentials(clientIdInput, clientSecretInput);
    setHasCredentials(true);
    setIsCredentialsModalOpen(false);
    toast.success('Clés API France Travail enregistrées avec succès !');
    performSearch();
  };

  const handleClearCredentials = () => {
    clearFranceTravailCredentials();
    setClientIdInput('');
    setClientSecretInput('');
    setHasCredentials(false);
    setIsCredentialsModalOpen(false);
    toast.info('Clés API réinitialisées. Mode démonstration activé.');
    performSearch();
  };

  const handleSaveToTracker = async (job: FranceTravailJob) => {
    try {
      await saveJobApplication(userId, {
        company: job.company,
        role: job.title,
        location: job.location,
        salary: job.salary,
        url: job.url,
        status: 'Saved',
        notes: `Offre enregistrée depuis la recherche France Travail (${job.contractType}). Référence: ${job.id}`,
        job_id: job.id,
        is_internal: false,
      });
      setTrackedStatusByJobId((prev) => new Map(prev).set(job.id, 'Saved'));
      toast.success(`Offre "${job.title}" ajoutée à votre Suivi de Candidatures !`);
    } catch (err: any) {
      if (err.message?.includes('already in your tracker')) {
        toast.info('Cette offre est déjà enregistrée dans votre suivi.');
        setTrackedStatusByJobId((prev) => new Map(prev).set(job.id, getTrackedStatus(job) || 'Saved'));
      } else {
        toast.error('Impossible d\'ajouter à votre suivi.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Top Banner & Header */}
      <div className="bg-tertiary text-white rounded-lg p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent mb-3">
              <Building2 size={14} />
              Offres France Travail
            </p>

            <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-[1.1] mb-3">
              Trouver un emploi en France
            </h1>
            <p className="text-sm sm:text-base text-white/75 max-w-2xl leading-relaxed">
              Explorez en temps réel les offres d'emploi officielles publiées en France. 
              Enregistrez vos opportunités directement dans votre Suivi de Candidatures.
            </p>
          </div>

          {/* Candidate Guidance Card */}
          <div className="bg-white/10 rounded-lg p-5 shrink-0 flex flex-col justify-between gap-3 max-w-xs w-full">
            <div>
              <p className="text-accent font-bold text-sm mb-2">Comment ça marche</p>
              <p className="text-sm text-white/80 leading-snug">
                Sélectionnez une offre pour analyser sa correspondance avec votre CV et préparer votre candidature sur mesure.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice Banner */}
      {statusNotice && (
        <div className="bg-primary-container/50 rounded-lg px-5 py-4 flex items-start gap-3 text-sm text-tertiary">
          <Info size={18} className="text-[#007568] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Conseil : </span>
            {statusNotice}
          </div>
        </div>
      )}

      {/* Search Form Card */}
      <div className="bg-white rounded-lg border border-tertiary/10 p-5 sm:p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Keywords */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Poste, compétences, mot-clé (ex: React, Chef de projet)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors font-medium"
              />
            </div>

            {/* Location */}
            <div className="md:col-span-4 relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ville, département (ex: Paris, Lyon, 75, 69)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors font-medium"
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-full min-h-[44px] px-5 py-3 rounded-lg bg-tertiary hover:bg-[#093b50] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Search size={18} className="text-white" />
                    <span>Rechercher</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Pills Row (Salaire / Type de contrat / Niveau d'études / Dates) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Euro size={14} className="text-[#007568] shrink-0" />
              <select
                id="salary-select"
                aria-label="Salaire"
                value={salaryRange}
                onChange={(e) => {
                  const val = e.target.value;
                  setSalaryRange(val);
                  performSearch(keywords, location, contractType, val, educationLevel, datePosted);
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary font-semibold focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors cursor-pointer"
              >
                {SALARY_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#007568] shrink-0" />
              <select
                id="contract-select"
                aria-label="Type de contrat"
                value={contractType}
                onChange={(e) => {
                  const val = e.target.value;
                  setContractType(val);
                  performSearch(keywords, location, val, salaryRange, educationLevel, datePosted);
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary font-semibold focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors cursor-pointer"
              >
                <option value="Tous">Tous les contrats en France</option>
                <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                <option value="Alternance">Alternance / Apprentissage</option>
                <option value="Interim">Intérim / Mission Temporaire</option>
                <option value="Stage">Stage / Immersion Professionnelle</option>
                <option value="Freelance">Freelance / Indépendant</option>
                <option value="Saisonnier">Saisonnier / Job Étudiant</option>
                <option value="Fonction Publique">Fonction Publique</option>
                <option value="Franchise">Franchise / Associé</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <GraduationCap size={14} className="text-[#007568] shrink-0" />
              <select
                id="education-select"
                aria-label="Niveau d'études"
                value={educationLevel}
                onChange={(e) => {
                  const val = e.target.value;
                  setEducationLevel(val);
                  performSearch(keywords, location, contractType, salaryRange, val, datePosted);
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary font-semibold focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors cursor-pointer"
              >
                {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#007568] shrink-0" />
              <select
                id="date-select"
                aria-label="Dates"
                value={datePosted}
                onChange={(e) => {
                  const val = e.target.value;
                  setDatePosted(val);
                  performSearch(keywords, location, contractType, salaryRange, educationLevel, val);
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-tertiary/20 text-base text-tertiary font-semibold focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors cursor-pointer"
              >
                {DATE_POSTED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Layout: Master List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Job Feed List */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium shrink-0">
            <span>
              {totalJobs ?? jobs.length} offre{(totalJobs ?? jobs.length) > 1 ? 's' : ''} disponible{(totalJobs ?? jobs.length) > 1 ? 's' : ''}
              {totalJobs !== null && totalJobs > jobs.length ? ` · ${jobs.length} affichées` : ''}
            </span>
            <span className="font-semibold text-slate-700">Source : France Travail</span>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>Page {currentPage} sur {totalPages} · {FRANCE_TRAVAIL_PAGE_SIZE} offres par page</span>
                {(totalJobs || 0) > FRANCE_TRAVAIL_MAX_RESULTS && (
                  <span className="text-slate-500">Affichage limité aux {FRANCE_TRAVAIL_MAX_RESULTS.toLocaleString('fr-FR')} premières offres</span>
                )}
              </div>
              <nav aria-label="Pages des offres France Travail" className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="Page précédente"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Précédent
                </button>
                {visiblePages.map((page, index) => {
                  const previousPage = visiblePages[index - 1];
                  return (
                    <React.Fragment key={page}>
                      {previousPage !== undefined && page - previousPage > 1 && (
                        <span aria-hidden="true" className="px-1 text-xs text-slate-400">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => goToPage(page)}
                        disabled={isLoading}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                        className={`min-w-8 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${page === currentPage ? 'border-[#007568] bg-[#007568] text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'} disabled:opacity-60`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  aria-label="Page suivante"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Suivant
                </button>
              </nav>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
              <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Aucune offre trouvée</p>
              <p className="text-xs text-slate-400 mt-1">
                Ajustez vos mots-clés ou modifiez le filtre de localisation.
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const trackedStatus = getTrackedStatus(job);

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#007568] text-white border-[#007568] scale-[1.01]'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Meta Tags */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            isSelected
                              ? 'bg-[var(--status-orange)] text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {job.contractType}
                        </span>

                        <span className={`text-xs font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          {job.publicationDate}
                        </span>
                      </div>

                      {/* Title & Company */}
                      <h3 className={`text-sm font-bold leading-snug mb-1 line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {job.title}
                      </h3>
                      
                      <p className={`text-xs font-semibold mb-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                        {job.company}
                      </p>

                      {/* Location & Salary */}
                      <div className={`flex items-center gap-3 text-xs mb-3 min-w-0 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className={`pt-3 border-t flex items-center justify-between text-xs font-bold ${
                      isSelected ? 'border-white/20' : 'border-slate-100'
                    }`}>
                      <span className={isSelected ? 'text-[var(--status-orange)]' : 'text-[#007568]'}>
                        {job.salary}
                      </span>

                      {trackedStatus && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            isSelected ? 'bg-white/10 text-white border border-white/20' : STATUS_STYLES[trackedStatus]
                          }`}
                        >
                          <CheckCircle2 size={12} /> {STATUS_LABELS[trackedStatus]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Offer Inspector */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto custom-scrollbar">

              {/* Header Details */}
              <div className="pb-6 border-b border-slate-100">
                <div className="flex lg:hidden items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Détail de l'offre</span>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="text-xs font-bold text-[#007568] hover:underline flex items-center gap-1"
                  >
                    ← Retour aux offres
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-[#007568] text-white text-xs font-extrabold">
                    {selectedJob.contractType}
                  </span>
                  {selectedJob.remoteOption && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      {selectedJob.remoteOption}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2">
                  {selectedJob.title}
                </h2>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap mb-4">
                  <span className="font-bold text-slate-900">{selectedJob.company}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-slate-400" />
                    {selectedJob.location}
                  </span>
                  <span>•</span>
                  <span className="font-bold text-[var(--status-orange)]">{selectedJob.salary}</span>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToTracker(selectedJob)}
                    disabled={!!getTrackedStatus(selectedJob)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      getTrackedStatus(selectedJob)
                        ? 'bg-[var(--status-green)]/10 text-[var(--status-green)] border border-[var(--status-green)]/30 cursor-default'
                        : 'bg-[#007568] hover:bg-[#006257] text-white active:scale-95'
                    }`}
                  >
                    {getTrackedStatus(selectedJob) ? (
                      <>
                        <BookmarkCheck size={16} />
                        <span>Déjà dans le suivi · {STATUS_LABELS[getTrackedStatus(selectedJob)!]}</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={16} className="text-[var(--status-orange)]" />
                        <span>Ajouter au Suivi Candidatures</span>
                      </>
                    )}
                  </button>

                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <span>Voir sur France Travail</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Requirements & Competences */}
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-400">
                    COMPÉTENCES ET PRÉ-REQUIS EXIGÉS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={13} className="text-[var(--status-orange)]" />
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400">
                  DESCRIPTION COMPLÈTE DU POSTE
                </h4>
                <div className="p-5 rounded-lg bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                  {selectedJob.description}
                </div>
              </div>

              {/* Footer Meta info */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Réf. France Travail : {selectedJob.id}</span>
                <span>Publiée : {selectedJob.publicationDate}</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-slate-400">
              <Info size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Sélectionnez une offre d'emploi</p>
              <p className="text-xs mt-1">Cliquez sur une offre à gauche pour consulter sa fiche détaillée.</p>
            </div>
          )}
        </div>
      </div>

      {/* France Travail Credentials Modal */}
      {isCredentialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007568] border border-blue-400/30 flex items-center justify-center text-[var(--status-orange)]">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Clés API France Travail
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuration des accès partenaire
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 text-xs text-[var(--status-orange)] leading-relaxed space-y-1">
              <p className="font-bold">Comment obtenir vos identifiants France Travail ?</p>
              <p className="text-xs text-[var(--status-orange)]">
                Rendez-vous sur l'Espace Développeurs de France Travail (<code>espace-developpeurs.francetravail.fr</code>), 
                créez un compte Partenaire et souscrivez à l'API "Offres d'emploi v2".
              </p>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Client ID (Clé API)
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="ex: PAR_offresdemploiv2_..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base font-mono text-slate-800 outline-none focus:border-[#007568] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base font-mono text-slate-800 outline-none focus:border-[#007568] transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                {hasCredentials && (
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="px-4 py-2.5 rounded-xl border border-[var(--status-red)]/30 text-[var(--status-red)] hover:bg-[var(--status-red)]/10 text-xs font-bold transition-colors mr-auto"
                  >
                    Effacer mes clés
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-xs transition-all active:scale-95"
                >
                  Enregistrer mes clés API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
