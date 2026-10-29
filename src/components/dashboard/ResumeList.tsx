import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FileText, Search, Trash2, ArrowUpDown, FileUp, CheckCircle2,
  AlertCircle, Loader2, LayoutGrid
} from 'lucide-react';
import { auditResume, parseResumeWithAI } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import {
  listUserResumes,
  createUserResume,
  deleteUserResume,
  duplicateUserResume,
  setPrimaryResume,
  resumeDataToPlainText,
  updateUserResumeAtsScore,
  ResumeListItem,
  FREE_TIER_CV_LIMIT_ERROR,
} from '../../lib/resumeStore';

const FREE_TIER_CV_LIMIT_MESSAGE =
  'Formule Gratuite : 1 CV maximum. Passez à Pro pour créer et enregistrer plusieurs CV.';
import CvTailoringModal from './CvTailoringModal';
import AtsScannerModal from './AtsScannerModal';
import CvCard from './CvCard';
import CvLibrarySkeleton from './CvLibrarySkeleton';

export type ResumeItem = ResumeListItem;

export default function ResumeList() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'created' | 'uploaded' | 'highScore'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [atsBackfillError, setAtsBackfillError] = useState<string | null>(null);

  const [uploadedLastId, setUploadedLastId] = useState<string | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<ResumeItem | null>(null);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [resumeToTailor, setResumeToTailor] = useState<ResumeItem | null>(null);
  const [resumeToScan, setResumeToScan] = useState<ResumeItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const atsAttemptedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!user?.id) {
      setResumes([]);
      setIsLoadingResumes(false);
      return;
    }
    setIsLoadingResumes(true);
    listUserResumes(user.id)
      .then(setResumes)
      .finally(() => setIsLoadingResumes(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const pending = resumes.filter((resume) =>
      resume.type === 'uploaded' && !resume.atsAnalyzed && !atsAttemptedRef.current.has(resume.id)
    );
    if (!pending.length) return;

    const analyzePendingResumes = async () => {
      let failed = 0;
      await Promise.all(pending.map(async (resume) => {
        atsAttemptedRef.current.add(resume.id);
        try {
          const text = resumeDataToPlainText(resume.resumeData);
          const analysis = await auditResume(text);
          await updateUserResumeAtsScore(
            resume.id,
            user.id,
            analysis.atsScore,
            analysis.missingKeywords.length
          );
          setResumes((current) => current.map((item) =>
            item.id === resume.id
              ? { ...item, atsAnalyzed: true, atsScore: analysis.atsScore, keywordsCount: analysis.missingKeywords.length }
              : item
          ));
          if (uploadedLastId === resume.id) {
            setUploadSuccessMsg(`Le CV "${resume.name}" a été importé et analysé par l’ATS (score : ${analysis.atsScore}/100).`);
          }
        } catch (error) {
          failed += 1;
          console.error(`ATS analysis failed for imported CV ${resume.id}:`, error);
        }
      }));
      if (failed > 0) {
        setAtsBackfillError(
          `${failed} CV importé(s) n’ont pas pu être analysés par l’ATS. Réessayez en rechargeant la page.`
        );
      } else {
        setAtsBackfillError(null);
      }
    };
    void analyzePendingResumes();
  }, [user?.id, resumes, uploadedLastId]);

  const confirmDelete = async () => {
    if (!resumeToDelete || !user?.id || isDeletingResume) return;
    setIsDeletingResume(true);
    setDeleteError('');
    try {
      await deleteUserResume(resumeToDelete.id, user.id);
      setResumes((previous) => {
        const remaining = previous.filter((resume) => resume.id !== resumeToDelete.id);
        if (!resumeToDelete.isPrimary || remaining.length === 0) return remaining;
        return remaining.map((resume, index) => ({ ...resume, isPrimary: index === 0 }));
      });
      setResumeToDelete(null);
    } catch (e) {
      console.error('Error deleting resume:', e);
      setDeleteError('La suppression a échoué. Votre CV est conservé ; réessayez.');
    } finally {
      setIsDeletingResume(false);
    }
  };

  const handleDuplicate = async (resume: ResumeItem) => {
    if (!user?.id) return;
    try {
      const created = await duplicateUserResume(resume, user.id, user.plan);
      setResumes(prev => [created, ...prev]);
    } catch (e: any) {
      if (e?.message === FREE_TIER_CV_LIMIT_ERROR) {
        alert(FREE_TIER_CV_LIMIT_MESSAGE);
      } else {
        console.error('Error duplicating resume:', e);
      }
    }
  };

  const handleSetPrimary = async (resume: ResumeItem) => {
    if (!user?.id || resume.isPrimary) return;
    const previousResumes = resumes;
    setResumes(prev => prev.map(r => ({ ...r, isPrimary: r.id === resume.id })));
    try {
      await setPrimaryResume(resume.id, user.id);
    } catch (e) {
      console.error('Error setting primary resume:', e);
      setResumes(previousResumes);
    }
  };

  const handleSetPrimaryById = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (resume) handleSetPrimary(resume);
  };

  const handleDeleteById = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (resume) {
      setDeleteError('');
      setResumeToDelete(resume);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);

    try {
      const { extractTextFromFile, parseAndBuildResumeData } = await import('../../utils/resumeParser');
      const rawText = await extractTextFromFile(file);
      if (!rawText || rawText.trim().length < 15) {
        alert('Aucun texte lisible n’a été trouvé dans ce fichier. Vérifiez qu’il s’agit d’un PDF contenant du texte, d’un DOCX, d’un DOC ou d’un TXT.');
        setIsUploading(false);
        if (e.target) e.target.value = '';
        return;
      }

      const [parsedAI, atsAnalysis] = await Promise.all([
        parseResumeWithAI(rawText),
        auditResume(rawText).catch((error) => {
          console.error('ATS analysis failed for uploaded CV:', error);
          return null;
        }),
      ]);
      const parsedResume = parseAndBuildResumeData(parsedAI);

      const candidateName = parsedResume?.coordonnees?.name || file.name.replace(/\.[^/.]+$/, "");
      const jobTitle = parsedResume?.coordonnees?.jobTitle || 'Importé';

      const created = await createUserResume(
        user.id,
        {
          name: `CV ${candidateName}${jobTitle ? ' - ' + jobTitle : ''}`,
          type: 'uploaded',
          jobTitle,
          resumeData: parsedResume || {},
          meta: {
            template: 'Fichier Importé',
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            ...(atsAnalysis ? {
              atsScore: atsAnalysis.atsScore,
              keywordsCount: atsAnalysis.missingKeywords.length,
            } : {}),
          },
        },
        user.plan
      );

      setResumes(prev => [created, ...prev]);
      setUploadedLastId(created.id);
      setUploadSuccessMsg(atsAnalysis
        ? `Le CV "${file.name}" a été importé et analysé par l’ATS (score : ${atsAnalysis.atsScore}/100).`
        : `Le CV "${file.name}" a été importé, mais l’analyse ATS est indisponible. Rechargez la page pour réessayer.`);
      setAtsBackfillError(atsAnalysis ? null : 'L’analyse ATS de ce CV n’a pas abouti. Rechargez la page pour réessayer.');
    } catch (err: any) {
      if (err?.message === FREE_TIER_CV_LIMIT_ERROR) {
        alert(FREE_TIER_CV_LIMIT_MESSAGE);
      } else {
        console.error('Upload parsing error:', err);
        alert('Une erreur est survenue lors de l\'analyse du CV. Veuillez réessayer avec un fichier PDF, DOCX, DOC ou TXT valide.');
      }
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Filtering
  const filteredResumes = resumes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.template.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'created') return r.type === 'created';
    if (filterType === 'uploaded') return r.type === 'uploaded';
    if (filterType === 'highScore') return r.atsScore >= 85;
    return true;
  });

  // Sorting — default keeps Supabase's updated_at DESC order
  const sortedResumes = [...filteredResumes].sort((a, b) => {
    if (sortBy === 'score') return b.atsScore - a.atsScore;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // KPI derived values
  const analyzedResumes = resumes.filter(r => r.atsAnalyzed);
  const avgAts = analyzedResumes.length > 0
    ? Math.round(analyzedResumes.reduce((acc, r) => acc + r.atsScore, 0) / analyzedResumes.length)
    : 0;
  const analyzedCount = analyzedResumes.length;
  const uploadedCount = resumes.filter(r => r.type === 'uploaded').length;
  const firstName = (user?.name || 'Thomas').trim().split(/\s+/)[0] || 'Thomas';
  const mobileProfileScore = analyzedCount > 0 ? avgAts : 78;
  const mobileGaugeRadius = 32;
  const mobileGaugeCircumference = 2 * Math.PI * mobileGaugeRadius;
  const mobileGaugeOffset =
    mobileGaugeCircumference - (Math.min(100, Math.max(0, mobileProfileScore)) / 100) * mobileGaugeCircumference;

  return (
    <div className="space-y-5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.text,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
      />

      {/* ── Mobile Activity & Profile Score Card (11. Vue mobile) ─────────── */}
      <div className="md:hidden space-y-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#102d3e]">
            Bonjour {firstName}           </h2>
          <p className="text-xs text-[#456071] mt-0.5">
            Voici votre activité du jour.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#dce7ed] rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-[#102d3e] leading-none">{resumes.length || 3}</p>
              <p className="text-xs font-semibold text-[#456071] mt-1">CV créés</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#d2f3eb] text-[#007568] flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('nav-to-tracker'))}
            className="bg-white border border-[#dce7ed] rounded-lg p-3.5 flex items-center justify-between text-left"
          >
            <div>
              <p className="text-2xl font-black text-[#102d3e] leading-none">{analyzedCount || 5}</p>
              <p className="text-xs font-semibold text-[#456071] mt-1">Candidatures</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#d2f3eb] text-[#007568] flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </button>
        </div>

        <div className="bg-white border border-[#dce7ed] rounded-lg p-4 space-y-3">
          <p className="text-xs font-extrabold text-[#102d3e]">Votre score de profil</p>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={mobileGaugeRadius} fill="none" stroke="#e6eff4" strokeWidth="7" />
                <circle
                  cx="40"
                  cy="40"
                  r={mobileGaugeRadius}
                  fill="none"
                  stroke="#007568"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={mobileGaugeCircumference}
                  strokeDashoffset={mobileGaugeOffset}
                />
              </svg>
              <span className="absolute text-base font-black text-[#102d3e]">{mobileProfileScore}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#007568]">Bon profil !</p>
              <p className="text-xs text-[#456071] mt-0.5 leading-snug">
                Quelques éléments peuvent encore faire la différence.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'ats-scanner' } }))}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#007568] hover:underline"
              >
                Voir les recommandations →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black text-tertiary leading-tight tracking-tight">Mes CV</h1>
          <p className="text-sm text-[#456071] mt-2 max-w-xl">
            Retrouvez l'ensemble de vos CVs créés et importés avec leur score d'optimisation ATS et leur date de création.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            to="/builder"
            className="flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-lg bg-tertiary hover:bg-[#093b50] text-white transition-colors"
          >
            <Plus size={16} /> Créer un nouveau CV
          </Link>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-lg border border-tertiary/25 bg-transparent text-tertiary hover:border-tertiary transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FileUp size={16} />
            {isUploading ? 'Import...' : 'Importer un document (PDF/DOCX/DOC/TXT)'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-tertiary/10 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-[#456071]">Total CV</p>
          <p className="text-4xl font-black text-tertiary mt-1 leading-none tabular-nums">{resumes.length}</p>
        </div>
        <div className="bg-tertiary rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-white/75">Score ATS moyen</p>
          <p className="text-4xl font-black text-accent mt-1 leading-none tabular-nums">{analyzedCount > 0 ? `${avgAts}%` : '—'}</p>
        </div>
        <div className="bg-white border border-tertiary/10 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-[#456071]">CV optimisés</p>
          <p className="text-4xl font-black text-tertiary mt-1 leading-none tabular-nums">{analyzedCount}</p>
        </div>
        <div className="bg-white border border-tertiary/10 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-[#456071]">CV importés</p>
          <p className="text-4xl font-black text-tertiary mt-1 leading-none tabular-nums">{uploadedCount}</p>
        </div>
      </div>

      {/* ── Success Banner ─────────────────────────────────────────────────── */}
      {uploadSuccessMsg && (
        <div role="status" className={`rounded-lg p-4 text-xs font-bold flex items-center justify-between gap-3 ${
          uploadSuccessMsg.includes('ATS est indisponible')
            ? 'bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 text-[#7c3f00]'
            : 'bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 text-[var(--status-green)]'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            {uploadedLastId && (
              <Link
                to={`/builder?id=${uploadedLastId}`}
                className="bg-[var(--status-green)] text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0"
              >
                Ouvrir →
              </Link>
            )}
            <button onClick={() => setUploadSuccessMsg(null)} className="font-bold text-sm px-1">✕</button>
          </div>
        </div>
      )}
      {atsBackfillError && (
        <div role="alert" className="bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 text-[#7c3f00] rounded-lg p-4 text-sm font-semibold">
          {atsBackfillError}
        </div>
      )}

      {/* ── Search & Filter Toolbar ─────────────────────────────────────────── */}
      <div className="bg-white border border-tertiary/10 rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un CV..."
            className="w-full pl-8 pr-3 py-2 bg-[#edf3f6] border border-[#c3d3dd] rounded-full text-sm font-medium focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/10 focus:bg-white transition-all"
          />
        </div>

        {/* Filter tabs + sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#edf3f6] p-0.5 rounded-full flex items-center text-xs font-bold text-[#456071] shrink-0">
            {(
              [
                { key: 'all', label: `Tous (${resumes.length})` },
                { key: 'created', label: 'Créés' },
                { key: 'uploaded', label: 'Importés' },
              ] as { key: typeof filterType; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${filterType === key ? 'bg-white text-[#007568]' : 'hover:text-[#102d3e]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#edf3f6] border border-[#c3d3dd] rounded-full px-3 py-1 text-xs font-semibold text-[#456071] shrink-0">
            <ArrowUpDown size={12} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs"
            >
              <option value="date">Récent</option>
              <option value="score">Score ATS</option>
              <option value="name">Nom</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {isLoadingResumes ? (
        <CvLibrarySkeleton count={8} />
      ) : (
        <>
          {resumes.length === 0 ? (
            /* Empty state — no CVs at all */
            <div className="bg-white border border-[#c3d3dd] rounded-lg p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-[#edf3f6] text-[#007568] rounded-lg flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#102d3e]">Aucun CV</h3>
                <p className="text-xs text-[#456071] max-w-xs mx-auto">
                  Créez votre premier CV en ligne ou importez un document existant pour commencer.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/builder"
                  className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-lg bg-tertiary hover:bg-[#093b50] text-white transition-colors"
                >
                  <Plus size={14} /> Créer un CV
                </Link>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border border-[#c3d3dd] text-[#456071] hover:bg-[#edf3f6] transition-colors"
                >
                  <FileUp size={14} /> Importer un CV
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {/* Create card — always first */}
              <div className="border-2 border-dashed border-[#c3d3dd] rounded-lg p-5 flex flex-col items-center justify-center bg-white hover:border-[#007568] transition-all group min-h-[280px]">
                <div className="w-10 h-10 bg-[#edf3f6] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#007568] transition-colors">
                  <Plus className="text-[#456071] group-hover:text-white transition-colors" size={20} />
                </div>
                <span className="font-extrabold text-sm text-[#102d3e] text-center">Nouveau CV</span>
                <p className="text-xs text-[#456071]/70 text-center mt-1 mb-4 max-w-[160px]">
                  Créez en ligne ou importez un document.
                </p>
                <div className="flex flex-col w-full gap-2">
                  <Link
                    to="/builder"
                    className="w-full bg-tertiary hover:bg-[#093b50] text-white font-bold text-sm py-2.5 rounded-lg text-center transition-colors"
                  >
                    Créer en ligne
                  </Link>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#edf3f6] hover:bg-[#dce8ee] text-[#456071] font-bold text-xs py-2 rounded-xl text-center transition-colors"
                  >
                    Importer un fichier
                  </button>
                </div>
              </div>

              {/* CV cards */}
              {sortedResumes.map((resume) => (
                <CvCard
                  key={resume.id}
                  resume={resume}
                  onSetPrimary={handleSetPrimaryById}
                  onTailor={(r) => setResumeToTailor(r)}
                  onScan={(r) => setResumeToScan(r)}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteById}
                />
              ))}
            </div>
          )}

          {/* No results after filter */}
          {resumes.length > 0 && sortedResumes.length === 0 && (
            <div className="bg-white border border-[#c3d3dd] rounded-lg p-10 text-center space-y-3">
              <div className="w-10 h-10 bg-[#edf3f6] text-[#456071] rounded-xl flex items-center justify-center mx-auto">
                <Search size={20} />
              </div>
              <h3 className="text-sm font-extrabold text-[#102d3e]">Aucun CV trouvé</h3>
              <p className="text-xs text-[#456071]">Aucun document ne correspond aux filtres actifs.</p>
              <button
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                className="text-xs font-bold text-[#007568] hover:underline cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Deletion Confirmation Modal ─────────────────────────────────────── */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[var(--status-red)]/10 text-[var(--status-red)] rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Supprimer ce CV ?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer définitivement le CV <span className="font-bold text-slate-900">« {resumeToDelete.name} »</span> ?
                </p>
                <p className="text-xs text-[var(--status-red)] font-semibold pt-1">
                  Cette action supprimera également toutes ses données enregistrées et est irréversible.
                </p>
                {deleteError && <p role="alert" className="text-xs font-bold text-[var(--status-red)] pt-2">{deleteError}</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => !isDeletingResume && setResumeToDelete(null)}
                disabled={isDeletingResume}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeletingResume}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--status-red)] hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingResume ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeletingResume ? 'Suppression…' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tailor Modal ───────────────────────────────────────────────────── */}
      {resumeToTailor && (
        <CvTailoringModal
          isOpen={!!resumeToTailor}
          onClose={() => setResumeToTailor(null)}
          baseCv={{ id: resumeToTailor.id, name: resumeToTailor.name, jobTitle: resumeToTailor.jobTitle, data: resumeToTailor.resumeData }}
          onSaveTailoredCv={() => {
            if (user?.id) listUserResumes(user.id).then(setResumes);
          }}
        />
      )}

      {/* ── ATS Scanner Modal ─────────────────────────────────────────────── */}
      {resumeToScan && (
        <AtsScannerModal
          isOpen={!!resumeToScan}
          onClose={() => setResumeToScan(null)}
          baseCv={{ id: resumeToScan.id, name: resumeToScan.name, jobTitle: resumeToScan.jobTitle, data: resumeToScan.resumeData }}
        />
      )}
    </div>
  );
}
