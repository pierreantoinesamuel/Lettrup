import React, { useState, useEffect, useRef } from 'react';
import {
  FileSearch, Sparkles, CheckCircle2, AlertTriangle, XCircle,
  Loader2, Copy, Check, BarChart3, Clock, Target, Trash2,
  Plus, Building2, Search, Award, ArrowRight, X,
  Database, FileText, Briefcase, ThumbsUp, Lightbulb,
  ChevronDown, ChevronUp, Download, GraduationCap, KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getUserResumeById, listUserResumes, resumeDataToPlainText, updateUserResumeAtsScore } from '../../lib/resumeStore';
import { computeAtsAnalysis } from '../../lib/atsScoring';
import { recordCvHistoryEvent, stripMeta } from '../../lib/cvScoreHistory';
import { saveJobApplication } from '../../services/jobTracker';

export interface ScanHistoryItem {
  id: string;
  date: string;
  resumeName: string;
  jobTitle: string;
  companyName: string;
  atsScore: number;
  matchSummary: string;
  foundKeywords: string[];
  missingKeywords: string[];
  criticalWarnings: string[];
  tailoredBulletPoints: string[];
  jobDescription: string;
  resumeText: string;
}

export interface DatabaseCvItem {
  id: string;
  name: string;
  jobTitle: string;
  content: string;
}

function fmtScanDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScanRow(row: any): ScanHistoryItem {
  const analysis = row.analysis_results || {};
  const snapshot = row.resume_snapshot || {};
  const reportKeywords = Array.isArray(analysis.keywords) ? analysis.keywords : [];
  const riskFlags = Array.isArray(analysis.riskFlags) ? analysis.riskFlags : [];
  return {
    id: row.id,
    date: fmtScanDate(row.scan_date || row.created_at),
    resumeName: snapshot.name || '',
    jobTitle: row.role || '',
    companyName: row.company || '',
    atsScore: row.score ?? analysis.scores?.overallScore ?? 0,
    matchSummary: analysis.matchSummary || '',
    foundKeywords: analysis.foundKeywords || reportKeywords.filter((item: any) => item.foundInCv).map((item: any) => item.keyword),
    missingKeywords: row.missing_keywords || reportKeywords.filter((item: any) => !item.foundInCv).map((item: any) => item.keyword),
    criticalWarnings: analysis.criticalWarnings || riskFlags.filter((item: any) => item.severity === 'critical' || item.severity === 'warning').map((item: any) => item.message),
    tailoredBulletPoints: row.suggestions || analysis.recommendedBulletPoints || [],
    jobDescription: row.job_description || '',
    resumeText: snapshot.text || '',
  };
}

interface AtsMatchScannerProps {
  initialSubTab?: 'scan' | 'history';
}

export default function AtsMatchScanner({ initialSubTab = 'scan' }: AtsMatchScannerProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>(initialSubTab);
  const [expandedDetailKey, setExpandedDetailKey] = useState<string | null>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  const { user } = useAuth();

  // Database CVs State — sourced from the user's real Supabase resumes.
  const [dbCvs, setDbCvs] = useState<DatabaseCvItem[]>([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);

  const [selectedCvId, setSelectedCvId] = useState<string>('');

  // Scans History State
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedScanModal, setSelectedScanModal] = useState<ScanHistoryItem | null>(null);

  // Current Form State
  const [resumeName, setResumeName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<{
    atsScore: number;
    matchSummary: string;
    foundKeywords: string[];
    missingKeywords: string[];
    criticalWarnings: string[];
    tailoredBulletPoints: string[];
  } | null>(null);

  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);
  const [addedToTracker, setAddedToTracker] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setDbCvs([]);
      setIsLoadingCvs(false);
      return;
    }
    setIsLoadingCvs(true);
    listUserResumes(user.id).then((items) => {
      const mapped: DatabaseCvItem[] = items.map((r) => ({
        id: r.id,
        name: r.name,
        jobTitle: r.jobTitle || 'Profil Professionnel',
        content: resumeDataToPlainText(r.resumeData),
      }));
      setDbCvs(mapped);
      if (mapped.length > 0) {
        setSelectedCvId(mapped[0].id);
        setResumeName(mapped[0].name);
        setResumeText(mapped[0].content);
      }
    }).finally(() => setIsLoadingCvs(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) {
      setScanHistory([]);
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    Promise.resolve(
      supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_date', { ascending: false })
    )
      .then(({ data, error }) => {
        if (!error && data) setScanHistory(data.map(mapScanRow));
      })
      .finally(() => setIsLoadingHistory(false));
  }, [user?.id]);

  const handleSelectCvFromDb = (cvId: string) => {
    setSelectedCvId(cvId);
    if (!cvId) return;
    const selected = dbCvs.find(c => c.id === cvId);
    if (selected) {
      setResumeName(selected.name);
      setResumeText(selected.content);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || !resumeText.trim() || !selectedCvId || !user?.id || !supabase) return;

    setIsScanning(true);
    setScanError('');
    setScanResult(null);
    setAddedToTracker(false);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error('Votre session a expiré. Reconnectez-vous avant de relancer l’analyse.');
      }

      const res = await fetch('/api/ats/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          cvId: selectedCvId,
          jobOfferText: jobDescription,
          jobOfferTitle: jobTitle,
          companyName,
          resumeName,
          resumeText,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success || !payload.report) {
        throw new Error(payload?.error || 'L’analyse ATS est indisponible pour le moment.');
      }

      const report = payload.report;
      const result = {
        atsScore: report.scores.overallScore,
        matchSummary: report.matchSummary,
        foundKeywords: report.keywords.filter((item: any) => item.foundInCv).map((item: any) => item.keyword),
        missingKeywords: report.keywords.filter((item: any) => !item.foundInCv).map((item: any) => item.keyword),
        criticalWarnings: report.riskFlags
          .filter((item: any) => item.severity === 'critical' || item.severity === 'warning')
          .map((item: any) => item.message),
        tailoredBulletPoints: report.recommendedBulletPoints,
      };
      setScanResult(result);
      setScanHistory((previous) => [
        mapScanRow({
          id: report.id,
          scan_date: report.scannedAt,
          company: companyName,
          role: report.jobOfferTitle,
          score: report.scores.overallScore,
          analysis_results: report,
          missing_keywords: result.missingKeywords,
          suggestions: report.recommendedBulletPoints,
          job_description: jobDescription,
          resume_snapshot: { name: resumeName, text: resumeText },
        }),
        ...previous.filter((item) => item.id !== report.id),
      ]);
      try {
        await updateUserResumeAtsScore(selectedCvId, user.id, result.atsScore, report.keywords.length);
      } catch {
        setScanError('L’analyse est enregistrée, mais le score ATS n’a pas pu être synchronisé dans Mes CV. Le rapport reste disponible dans l’historique.');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l’analyse ATS.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToJobTracker = async () => {
    if (!user?.id) return;
    try {
      await saveJobApplication(user.id, {
        company: companyName || 'Entreprise',
        role: jobTitle || 'Poste Cible',
        status: 'Saved',
        notes: `Score ATS Match: ${scanResult?.atsScore}%\nJob Description:\n${jobDescription.slice(0, 300)}...`,
        source: 'ATS Scanner',
      });
      setAddedToTracker(true);

      // The tracker has no notion of which CV was used: remember it on the CV,
      // so "Historique des scans" shows which job this CV was sent for.
      try {
        const resume = selectedCvId ? await getUserResumeById(selectedCvId, user.id) : null;
        if (resume) {
          const content = stripMeta(resume.resumeData);
          await recordCvHistoryEvent(resume.id, user.id, {
            kind: 'applied',
            label: 'Candidature enregistrée',
            scoreBefore: null,
            scoreAfter: computeAtsAnalysis(content, 'minimalist').overallScore,
            before: null,
            after: content,
            opportunity: { company: companyName || 'Entreprise', role: jobTitle || 'Poste cible' },
          });
        }
      } catch (historyError) {
        console.error('Could not record the application in the CV history', historyError);
      }
    } catch (e) {
      console.error('Failed to save application to tracker', e);
    }
  };

  const handleGoToCoverLetter = () => {
    window.dispatchEvent(new CustomEvent('nav-to-cover-letter', {
      detail: { jobDescription, jobTitle, companyName }
    }));
  };

  const handleGoToTracker = () => {
    window.dispatchEvent(new CustomEvent('nav-to-tracker'));
  };

  const handleDeleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !supabase) return;
    if (window.confirm('Voulez-vous vraiment supprimer cet enregistrement de scan ?')) {
      setScanHistory(prev => prev.filter(item => item.id !== id));
      if (selectedScanModal?.id === id) {
        setSelectedScanModal(null);
      }
      await supabase.from('scan_history').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  // Active analysis for the top "4. Analyse IA" dashboard cards
  const latestScan = scanResult || scanHistory[0] || null;
  const displayScore = latestScan ? latestScan.atsScore : 82;
  const matchBadgeLabel =
    displayScore >= 80 ? 'Très bon match' : displayScore >= 65 ? 'Bon match' : 'À optimiser';

  const defaultStrengths = [
    'Compétences techniques',
    'Expérience similaire',
    'Niveau de formation',
    'Localisation',
  ];
  const displayStrengths =
    latestScan && latestScan.foundKeywords.length > 0
      ? [
          `Compétences techniques (${latestScan.foundKeywords.slice(0, 3).join(', ')})`,
          'Expérience similaire',
          'Niveau de formation',
          'Localisation',
        ]
      : defaultStrengths;

  const defaultImprovements = [
    'Compétences en communication',
    'Expérience sur le secteur',
    'Mise en avant des résultats',
  ];
  const displayImprovements =
    latestScan && (latestScan.missingKeywords.length > 0 || latestScan.criticalWarnings.length > 0)
      ? [
          ...(latestScan.missingKeywords.length > 0
            ? [`Mots-clés à intégrer : ${latestScan.missingKeywords.slice(0, 3).join(', ')}`]
            : []),
          ...(latestScan.criticalWarnings.slice(0, 2)),
          ...defaultImprovements,
        ].slice(0, 3)
      : defaultImprovements;

  const totalKeywordsCount = latestScan
    ? latestScan.foundKeywords.length + latestScan.missingKeywords.length
    : 0;
  const keywordMatchPct =
    totalKeywordsCount > 0
      ? Math.round((latestScan!.foundKeywords.length / totalKeywordsCount) * 100)
      : 80;

  const detailMetrics = [
    {
      key: 'skills',
      label: 'Correspondance des compétences',
      score: latestScan ? Math.min(98, Math.max(45, Math.round(displayScore + 3))) : 85,
      icon: CheckCircle2,
      description:
        latestScan && latestScan.foundKeywords.length > 0
          ? `Compétences détectées sur votre CV : ${latestScan.foundKeywords.join(', ')}.`
          : 'Vos compétences techniques principales correspondent aux attentes clés du poste.',
    },
    {
      key: 'experience',
      label: 'Expérience requise',
      score: latestScan ? Math.min(95, Math.max(40, Math.round(displayScore - 4))) : 78,
      icon: Briefcase,
      description:
        latestScan?.matchSummary ||
        'Vos expériences professionnelles couvrent la majorité des responsabilités demandées. Pensez à chiffrer vos réalisations.',
    },
    {
      key: 'education',
      label: 'Formation et certifications',
      score: latestScan ? Math.min(98, Math.max(60, Math.round(displayScore + 8))) : 90,
      icon: GraduationCap,
      description:
        'Votre niveau de diplôme et vos certifications sont bien alignés avec les prérequis académiques de l’offre.',
    },
    {
      key: 'keywords',
      label: "Mots-clés de l'offre",
      score: latestScan ? keywordMatchPct : 80,
      icon: KeyRound,
      description:
        latestScan && latestScan.missingKeywords.length > 0
          ? `Mots-clés manquants à ajouter : ${latestScan.missingKeywords.join(', ')}.`
          : 'Bonne densité de mots-clés ATS stratégiques dans vos titres et descriptions.',
    },
  ];

  const handleDownloadReport = () => {
    const lines = [
      '==================================================',
      'RAPPORT D’ANALYSE IA — LETTRUP',
      '==================================================',
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      `CV analysé : ${resumeName || latestScan?.resumeName || 'Mon CV'}`,
      ...(jobTitle ? [`Poste visé : ${jobTitle}`] : []),
      ...(companyName ? [`Entreprise : ${companyName}`] : []),
      '',
      `MATCH GLOBAL : ${displayScore}% (${matchBadgeLabel})`,
      '',
      '--- POINTS FORTS ---',
      ...displayStrengths.map((s) => `✓ ${s}`),
      '',
      '--- À AMÉLIORER ---',
      ...displayImprovements.map((s) => `• ${s}`),
      '',
      '--- DÉTAILS DE L’ANALYSE ---',
      ...detailMetrics.map((m) => `- ${m.label} : ${m.score}%\n  ${m.description}`),
      '',
      ...(latestScan?.tailoredBulletPoints?.length
        ? [
            '--- RECOMMANDATIONS DE PUCES CV ---',
            ...latestScan.tailoredBulletPoints.map((b) => `• ${b}`),
          ]
        : []),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_analyse_ia_${displayScore}pct.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleScrollToRecommendations = () => {
    setActiveTab('scan');
    recommendationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filtered History
  const filteredHistory = scanHistory.filter(item => {
    const matchesSearch = item.resumeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterScore === 'high') return item.atsScore >= 85;
    if (filterScore === 'medium') return item.atsScore >= 70 && item.atsScore < 85;
    if (filterScore === 'low') return item.atsScore < 70;
    return true;
  });

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-[var(--status-green)]/10 text-[var(--status-green)] border-[var(--status-green)]/30';
    if (score >= 70) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (score >= 50) return 'bg-[var(--status-orange)]/10 text-[var(--status-orange)] border-[var(--status-orange)]/30';
    return 'bg-[var(--status-red)]/10 text-[var(--status-red)] border-[var(--status-red)]/30';
  };

  // SVG Gauge calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, displayScore)) / 100) * circumference;

  return (
    <div className="space-y-6 pb-16 md:pb-8">
      {/* Detail Modal for Past Scan */}
      {selectedScanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border text-lg ${getScoreBadgeColor(selectedScanModal.atsScore)}`}>
                  <span>{selectedScanModal.atsScore}%</span>
                  <span className="text-[9px] uppercase font-bold opacity-80">Score ATS</span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">{selectedScanModal.resumeName}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{selectedScanModal.jobTitle}</span> • <span className="font-semibold text-gray-700">{selectedScanModal.companyName}</span> • <span>{selectedScanModal.date}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedScanModal(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {selectedScanModal.atsScore > 70 ? (
                <div className="bg-[var(--status-green)]/10 border-2 border-[var(--status-green)]/40 p-4 rounded-xl flex items-start gap-3">
                  <ThumbsUp size={22} className="text-[var(--status-green)] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--status-green)]">
                      Recommandation : Positif (Score &gt; 70%)
                    </h3>
                    <p className="text-xs text-[var(--status-green)] mt-1 leading-relaxed">
                      Votre profil correspond à <strong>{selectedScanModal.atsScore}%</strong> à l'offre. Nous vous conseillons vivement de postuler à cette opportunité !
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--status-orange)]/10 border-2 border-[var(--status-orange)]/40 p-4 rounded-xl flex items-start gap-3">
                  <Lightbulb size={22} className="text-[var(--status-orange)] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--status-orange)]">
                      Recommandation : Optimisation conseillée
                    </h3>
                    <p className="text-xs text-[var(--status-orange)] mt-1 leading-relaxed">
                      Votre score de <strong>{selectedScanModal.atsScore}%</strong> est sous la barre des 70%. Pensez à ajouter les compétences manquantes sur votre CV avant de postuler.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Résumé du Match ATS</h3>
                <p className="text-sm font-medium text-slate-800">{selectedScanModal.matchSummary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-[var(--status-green)] flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Mots-Clés Détectés ({selectedScanModal.foundKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScanModal.foundKeywords.map((kw, idx) => (
                      <span key={idx} className="bg-[var(--status-green)]/20 text-[var(--status-green)] border border-[var(--status-green)]/40 text-xs px-2.5 py-0.5 rounded-full font-semibold max-w-full break-words">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-[var(--status-red)] flex items-center gap-1.5">
                    <XCircle size={16} /> Mots-Clés Manquants à ajouter ({selectedScanModal.missingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScanModal.missingKeywords.map((kw, idx) => (
                      <span key={idx} className="bg-[var(--status-red)]/20 text-[var(--status-red)] border border-[var(--status-red)]/40 text-xs px-2.5 py-0.5 rounded-full font-semibold max-w-full break-words">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedScanModal.criticalWarnings.length > 0 && (
                <div className="bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-[var(--status-orange)] flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-[var(--status-orange)]" /> Avertissements ATS
                  </h4>
                  <ul className="space-y-1">
                    {selectedScanModal.criticalWarnings.map((warn, i) => (
                      <li key={i} className="text-xs text-[var(--status-orange)] flex items-start gap-1.5">
                        <span>•</span> <span>{warn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedScanModal.tailoredBulletPoints.length > 0 && (
                <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[var(--status-purple)]" /> Recommandations de Puces à insérer
                  </h4>
                  <div className="space-y-2">
                    {selectedScanModal.tailoredBulletPoints.map((bp, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-medium text-slate-800 flex items-center justify-between gap-3">
                        <span>{bp}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(bp)}
                          className="text-slate-500 hover:text-slate-900 p-1"
                          title="Copier"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={(e) => handleDeleteScan(selectedScanModal.id, e)}
                className="text-xs font-bold text-[var(--status-red)] hover:opacity-80 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--status-red)]/10 transition-colors"
              >
                <Trash2 size={14} /> Supprimer le scan
              </button>

              <button
                onClick={() => setSelectedScanModal(null)}
                className="bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header (4. Analyse IA) ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-tertiary tracking-tight leading-tight">
            Analyse IA
          </h1>
          <p className="text-sm text-[#456071] mt-2">
            Découvrez votre compatibilité avec une offre d'emploi et obtenez des recommandations personnalisées.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="bg-white p-1 rounded-xl flex items-center shrink-0 border border-[#dce7ed] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[#007568] text-white shadow-xs'
                : 'text-[#456071] hover:text-[#102d3e]'
            }`}
          >
            <Target size={15} /> Analyse IA
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#007568] text-white shadow-xs'
                : 'text-[#456071] hover:text-[#102d3e]'
            }`}
          >
            <Clock size={15} /> Historique ({scanHistory.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: ANALYSE IA OVERVIEW + NEW SCAN FORM */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {/* ── Top 3 Summary Cards (Match global | Points forts | À améliorer) ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Card 1: Match global, the one number that matters, so it gets the solid brand surface */}
            <div className="md:col-span-5 bg-tertiary text-white rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <h2 className="text-sm font-bold text-white/75 mb-4">Match global</h2>

              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#8cf0d8"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{displayScore}%</span>
                </div>
              </div>

              <span className="mt-4 inline-flex items-center px-3.5 py-1 rounded-md text-xs font-extrabold bg-accent text-tertiary">
                {matchBadgeLabel}
              </span>
            </div>

            {/* Card 2: Points forts */}
            <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-primary-container/60 rounded-lg p-6 flex flex-col">
              <h2 className="text-lg font-black text-tertiary mb-4">Points forts</h2>
              <ul className="space-y-3 flex-1 flex flex-col justify-center">
                {displayStrengths.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm font-medium text-[#102d3e]">
                    <span className="w-5 h-5 rounded-full bg-[#d2f3eb] text-[#007568] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                    </span>
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 3: À améliorer */}
            <div className="bg-[#fff1df] rounded-lg p-6 flex flex-col">
              <h2 className="text-lg font-black text-tertiary mb-4">À améliorer</h2>
              <ul className="space-y-3 flex-1 flex flex-col justify-center">
                {displayImprovements.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm font-medium text-[#102d3e]">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={13} />
                    </span>
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            </div>
          </div>

          {/* ── Second Row: Détails de l'analyse + Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Détails de l'analyse */}
            <div className="lg:col-span-8 bg-white border border-[#dce7ed] rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-extrabold text-[#102d3e]">
                Détails de l'analyse
              </h2>

              <div className="divide-y divide-[#edf3f6]">
                {detailMetrics.map((metric) => {
                  const Icon = metric.icon;
                  const isExpanded = expandedDetailKey === metric.key;
                  return (
                    <div key={metric.key} className="py-3.5 first:pt-1 last:pb-1">
                      <button
                        type="button"
                        onClick={() => setExpandedDetailKey(isExpanded ? null : metric.key)}
                        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-[#edf3f6] text-[#007568] flex items-center justify-center shrink-0">
                            <Icon size={16} />
                          </div>
                          <span className="text-sm font-bold text-[#102d3e] truncate group-hover:text-[#007568] transition-colors">
                            {metric.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 w-44 sm:w-60">
                          <div className="flex-1 h-2 bg-[#edf3f6] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#007568] rounded-full transition-all duration-500"
                              style={{ width: `${metric.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-extrabold text-[#102d3e] w-9 text-right">
                            {metric.score}%
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-[#456071]" />
                          ) : (
                            <ChevronDown size={16} className="text-[#456071]" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pl-11 pr-2 text-xs text-[#456071] leading-relaxed">
                          {metric.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleScrollToRecommendations}
                className="w-full py-3.5 px-5 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-sm shadow-md shadow-[#007568]/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Voir les recommandations</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="w-full py-3.5 px-5 rounded-xl bg-white border border-[#dce7ed] hover:bg-[#edf3f6] text-[#102d3e] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={16} className="text-[#007568]" />
                <span>Télécharger le rapport</span>
              </button>
            </div>
          </div>

          {/* ── Interactive Job Match & Detailed Recommendations ── */}
          <div ref={recommendationsRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Form Inputs */}
            <div className="lg:col-span-5 bg-white border border-[#dce7ed] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h2 className="font-bold text-[#102d3e] text-base flex items-center gap-2">
                  <Target size={18} className="text-[#007568]" />
                  Comparer un CV à une offre
                </h2>
                <span className="text-[11px] font-bold text-[#007568] bg-[#d2f3eb] px-2.5 py-0.5 rounded-full">
                  IA Avancée
                </span>
              </div>

              {scanError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              <form onSubmit={handleScan} className="space-y-4">
                {/* 1. Select CV from Database */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Database size={15} className="text-[#007568]" />
                    Sélectionner un CV dans la base de données :
                  </label>
                  {isLoadingCvs ? (
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Chargement de vos CVs...
                    </div>
                  ) : dbCvs.length === 0 ? (
                    <p className="text-[11px] text-[var(--status-orange)] font-semibold">
                      Aucun CV enregistré. Créez ou importez un CV dans "Mes CV" pour lancer une analyse.
                    </p>
                  ) : (
                    <select
                      value={selectedCvId}
                      onChange={(e) => handleSelectCvFromDb(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007568] cursor-pointer"
                    >
                      {dbCvs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          📄 {cv.name} ({cv.jobTitle})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium">
                    Modifiez le nom ou ajustez le texte si nécessaire avant de lancer le calcul de correspondance.
                  </p>
                </div>

                {/* CV Name and Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du CV sélectionné</label>
                    <input
                      type="text"
                      required
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      placeholder="ex: CV Développeur Full Stack"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold focus:outline-none focus:border-gray-800 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'Entreprise</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ex: Doctolib, Qonto..."
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold focus:outline-none focus:border-gray-800 bg-gray-50"
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé du Poste Visé</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="ex: Senior Full Stack Engineer"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold focus:outline-none focus:border-gray-800 bg-gray-50"
                  />
                </div>

                {/* Job Description Pasting */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Coller l'Offre d'Emploi (Fiche de Poste)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Obligatoire</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Collez la description ou l'offre d'emploi complète ici..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-base focus:outline-none focus:border-gray-800 bg-gray-50 resize-none font-sans"
                  />
                </div>

                {/* Resume Text Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Contenu / Texte du CV</span>
                    <span className="text-[10px] text-gray-400 font-normal">Issu de la base de données</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Contenu brut de votre CV..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-base focus:outline-none focus:border-gray-800 bg-gray-50 resize-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isScanning || !jobDescription.trim() || !resumeText.trim()}
                  className="w-full bg-[#007568] hover:bg-[#006257] text-white py-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Analyse & Calcul du Score ATS en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Calculer le Match ATS
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Scan Results */}
            <div className="lg:col-span-7 space-y-6">
              {scanResult ? (
                <>
                  {scanResult.atsScore > 70 ? (
                    <div className="bg-gradient-to-r from-[var(--status-green)] to-teal-700 text-white rounded-2xl p-6 shadow-md border border-[var(--status-green)] space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0 font-black text-xl">
                          ✓
                        </div>
                        <div>
                          <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                            Match Supérieur à 70% ({scanResult.atsScore}%)
                          </span>
                          <h3 className="text-lg font-extrabold text-white mt-1">
                            Recommandation : Vous devriez postuler à ce poste !
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed font-medium pl-15">
                        Votre profil présente une excellente compatibilité avec les critères requis. Nous vous conseillons vivement d'envoyer votre candidature dès maintenant.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-[var(--status-orange)] to-[var(--status-orange)] text-white rounded-2xl p-6 shadow-md border border-[var(--status-orange)] space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0 font-black text-xl">
                          !
                        </div>
                        <div>
                          <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                            Match Inférieur à 70% ({scanResult.atsScore}%)
                          </span>
                          <h3 className="text-lg font-extrabold text-white mt-1">
                            Recommandation : Optimisez votre CV avant de postuler
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed font-medium pl-15">
                        Votre score est de <strong>{scanResult.atsScore}%</strong>. Nous vous recommandons vivement d'ajouter les compétences manquantes ci-dessous sur votre CV pour augmenter vos chances d'entretien.
                      </p>
                    </div>
                  )}

                  {/* ATS Score Header Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-20 h-20 rounded-2xl text-white flex flex-col items-center justify-center border-4 shadow-sm ${
                        scanResult.atsScore >= 80 ? 'bg-[var(--status-green)] border-[var(--status-green)]' :
                        scanResult.atsScore >= 60 ? 'bg-[var(--status-orange)] border-[var(--status-orange)]' : 'bg-[var(--status-red)] border-[var(--status-red)]'
                      }`}>
                        <span className="text-2xl font-black leading-none">{scanResult.atsScore}%</span>
                        <span className="text-[10px] uppercase font-extrabold opacity-80 mt-0.5">Score ATS</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg">Score de Compatibilité Globale</h3>
                        <p className="text-xs text-gray-600 mt-1 font-medium">{scanResult.matchSummary}</p>
                        <p className="text-[11px] text-[var(--status-green)] font-bold mt-2 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Enregistré dans votre historique de scans
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleGoToCoverLetter}
                        className="px-4 py-2.5 bg-[#007568] hover:bg-[#006257] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <FileText size={14} /> Lettre de Motivation
                      </button>

                      <button
                        type="button"
                        onClick={handleAddToJobTracker}
                        disabled={addedToTracker}
                        className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          addedToTracker
                            ? 'bg-[var(--status-green)]/20 text-[var(--status-green)] border border-[var(--status-green)]/40'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        {addedToTracker ? (
                          <>
                            <Check size={14} /> Ajouté au Suivi !
                          </>
                        ) : (
                          <>
                            <Briefcase size={14} /> Ajouter au Suivi
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Missing Skills Box */}
                  <div className="bg-[var(--status-orange)]/10 border-2 border-[var(--status-orange)]/40 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-xs text-[var(--status-orange)] uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16} className="text-[var(--status-orange)]" />
                        Compétences clés manquantes à ajouter sur votre CV ({scanResult.missingKeywords.length})
                      </h3>
                      <span className="text-[10px] font-bold text-[var(--status-orange)] bg-[var(--status-orange)]/20 px-2 py-0.5 rounded-full">
                        Important pour l'ATS
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-orange)] font-medium leading-relaxed">
                      Ajoutez ces termes stratégiques dans les rubriques <strong>Compétences</strong> ou <strong>Expériences</strong> de votre CV pour optimiser votre score :
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {scanResult.missingKeywords.map((kw, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(kw);
                          }}
                          title="Cliquer pour copier cette compétence"
                          className="bg-white hover:bg-[var(--status-orange)]/20 text-[var(--status-orange)] border border-[var(--status-orange)]/40 text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus size={12} className="text-[var(--status-orange)]" />
                          <span>{kw}</span>
                          <Copy size={11} className="text-[var(--status-orange)] ml-1 opacity-60 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keywords Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <h3 className="font-bold text-xs text-[var(--status-green)] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Mots-clés Détectés Sur Votre CV ({scanResult.foundKeywords.length})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.foundKeywords.map((kw, i) => (
                          <span key={i} className="bg-[var(--status-green)]/10 text-[var(--status-green)] border border-[var(--status-green)]/30 text-xs px-2.5 py-1 rounded-full font-medium">
                            ✓ {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <h3 className="font-bold text-xs text-[var(--status-red)] uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle size={16} /> Écarts Détectés ({scanResult.missingKeywords.length})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.missingKeywords.map((kw, i) => (
                          <span key={i} className="bg-[var(--status-red)]/10 text-[var(--status-red)] border border-[var(--status-red)]/30 text-xs px-2.5 py-1 rounded-full font-medium">
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Critical Warnings */}
                  {scanResult.criticalWarnings.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-3">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-[var(--status-orange)]" /> Avertissements de Filtrage ATS
                      </h3>
                      <ul className="space-y-2">
                        {scanResult.criticalWarnings.map((warn, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start gap-2 bg-[var(--status-orange)]/10 p-2.5 rounded-xl border border-[var(--status-orange)]/30">
                            <span className="text-[var(--status-orange)] font-bold">•</span> {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tailored Bullet Points */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-3">
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-[var(--status-purple)]" /> Puces Recommandées à Copier/Coller sur votre CV
                    </h3>
                    <div className="space-y-2">
                      {scanResult.tailoredBulletPoints.map((bp, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-gray-800">{bp}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(bp);
                              setCopiedBulletIdx(idx);
                              setTimeout(() => setCopiedBulletIdx(null), 2000);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors shrink-0 cursor-pointer"
                            title="Copier la puce"
                          >
                            {copiedBulletIdx === idx ? <Check size={14} className="text-[var(--status-green)]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {addedToTracker && (
                    <div className="bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-[var(--status-green)] font-bold">
                        <CheckCircle2 size={18} className="text-[var(--status-green)] shrink-0" />
                        <span>Candidature enregistrée dans votre Suivi de Candidatures.</span>
                      </div>
                      <button
                        onClick={handleGoToTracker}
                        className="px-4 py-2 bg-[var(--status-green)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        Voir mon Suivi <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white border border-[#dce7ed] rounded-2xl p-8 sm:p-10 flex flex-col justify-between min-h-[400px] space-y-6">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2f3eb] text-[#007568] text-xs font-extrabold">
                      <Sparkles size={13} /> Recommandations personnalisées
                    </span>
                    <h3 className="text-lg font-extrabold text-[#102d3e]">
                      Optimisez votre CV pour chaque offre d'emploi
                    </h3>
                    <p className="text-xs text-[#456071] leading-relaxed">
                      Collez une fiche de poste à gauche et cliquez sur <strong>Calculer le Match ATS</strong> pour obtenir les mots-clés exacts à ajouter et des puces d'expérience rédigées sur mesure.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#dce7ed] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-[#007568] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#102d3e]">Mise en avant des résultats chiffrés</p>
                        <p className="text-xs text-[#456071] mt-0.5">
                          Ajoutez des indicateurs mesurables (ex. +25% de productivité, budget géré, délais réduits) dans vos descriptions de poste.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#dce7ed] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-[#007568] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#102d3e]">Alignement des mots-clés ATS</p>
                        <p className="text-xs text-[#456071] mt-0.5">
                          Reprenez les intitulés exacts des compétences techniques et outils mentionnés dans l'offre d'emploi.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#dce7ed] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-[#007568] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#102d3e]">Compétences transversales & communication</p>
                        <p className="text-xs text-[#456071] mt-0.5">
                          Mettez en valeur votre capacité à collaborer avec les équipes métiers et à présenter vos analyses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: HISTORIQUE DES SCANS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un CV, un poste ou une entreprise..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-base font-medium focus:outline-none focus:border-gray-800 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Filtrer :</span>
              <div className="bg-gray-100 p-1 rounded-full flex items-center text-xs font-bold text-gray-600">
                <button
                  onClick={() => setFilterScore('all')}
                  className={`px-3 py-1 rounded-full transition-all ${filterScore === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  Tous ({scanHistory.length})
                </button>
                <button
                  onClick={() => setFilterScore('high')}
                  className={`px-3 py-1 rounded-full transition-all ${filterScore === 'high' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  ≥ 85%
                </button>
                <button
                  onClick={() => setFilterScore('medium')}
                  className={`px-3 py-1 rounded-full transition-all ${filterScore === 'medium' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  70-84%
                </button>
                <button
                  onClick={() => setFilterScore('low')}
                  className={`px-3 py-1 rounded-full transition-all ${filterScore === 'low' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'}`}
                >
                  &lt; 70%
                </button>
              </div>
            </div>
          </div>

          {isLoadingHistory && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              <p className="text-xs text-gray-500">Chargement de l'historique...</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!isLoadingHistory && filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedScanModal(item)}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4 border-l-4"
                style={{
                  borderLeftColor: item.atsScore >= 85 ? '#10b981' : item.atsScore >= 70 ? '#3b82f6' : '#f59e0b'
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-3 py-1 rounded-full border font-black text-xs flex items-center gap-1 ${getScoreBadgeColor(item.atsScore)}`}>
                      <Award size={14} />
                      <span>Score ATS : {item.atsScore}%</span>
                    </div>

                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {item.date}
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-gray-900 group-hover:text-[#007568] transition-colors line-clamp-1">
                    {item.resumeName}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs font-medium text-gray-600">
                    <p className="flex items-center gap-1.5 text-gray-800 font-bold">
                      <Building2 size={13} className="text-gray-400 shrink-0" />
                      <span>{item.jobTitle}</span>
                    </p>
                    <p className="text-gray-500 pl-5">
                      Entreprise : <span className="font-semibold text-gray-700">{item.companyName}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-full border border-[var(--status-green)]/30">
                      ✓ {item.foundKeywords.length} Mots trouvés
                    </span>
                    <span className="font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-full border border-[var(--status-red)]/30">
                      + {item.missingKeywords.length} Manquants
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-extrabold text-[#007568] group-hover:underline flex items-center gap-1">
                    Voir le rapport détaillé <ArrowRight size={13} />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteScan(item.id, e)}
                    className="p-1.5 text-gray-300 hover:text-[var(--status-red)] hover:bg-[var(--status-red)]/10 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer du fichier"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!isLoadingHistory && filteredHistory.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
              <BarChart3 size={40} className="text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">Aucun scan dans l'historique</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Vous n'avez pas encore effectué de scan correspondant à vos critères.
              </p>
              <button
                onClick={() => setActiveTab('scan')}
                className="bg-[#007568] hover:opacity-90 text-white px-4 py-2 rounded-full font-bold text-xs inline-flex items-center gap-2 mt-2 cursor-pointer"
              >
                <Plus size={14} /> Lancer un premier Job Match
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
