import React, { useRef, useState } from 'react';
import { Target, CheckCircle2, X, AlertTriangle, Cpu, Sparkles, Layers, FileText, ArrowUpRight } from 'lucide-react';
import { AtsScanApiResponse } from '../../infrastructure/routes/atsScanApi';
import { AtsScanReport } from '../../domain/ats-engine/AtsScanReport';
import { SavedResume } from '../../types';
import { supabase } from '../../lib/supabase';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface AtsScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCv: SavedResume;
}

export default function AtsScannerModal({ isOpen, onClose, baseCv }: AtsScannerModalProps) {
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<AtsScanReport | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleRunScan = async () => {
    if (!jobText.trim()) return;
    setIsScanning(true);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const res = await fetch('/api/ats/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ cvId: baseCv.id, jobOfferText: jobText, jobOfferTitle: jobTitle || 'Poste Cible' }),
      });
      const response: AtsScanApiResponse = await res.json();

      if (response.success && response.report) {
        setReport(response.report as AtsScanReport);
      } else {
        console.error('ATS scan error:', response.error);
      }
    } catch (err) {
      console.error('ATS scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ats-scanner-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-gray-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200">
              <Target size={22} />
            </div>
            <div>
              <h2 id="ats-scanner-modal-title" className="text-lg font-extrabold text-gray-900">Scanner ATS & Optimiseur de CV</h2>
              <p className="text-xs text-gray-500">
                Analyse algorithmique de comptatibilité pour : <span className="font-semibold text-gray-800">{baseCv.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {!report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé du poste (optionnel)</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="ex: Senior Product Designer / Lead Developer"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base font-medium focus:outline-none focus:border-gray-800 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CV Analysé</label>
                  <div className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 flex items-center gap-2">
                    <FileText size={16} className="text-gray-500" />
                    {baseCv.name} ({baseCv.jobTitle})
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texte intégral de l'offre d'emploi <span className="text-[var(--status-red)]">*</span>
                </label>
                <textarea
                  rows={8}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Collez ici la description du poste, les compétences requises, les missions..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-base font-medium focus:outline-none focus:border-gray-800 bg-gray-50 leading-relaxed"
                />
              </div>

              <button
                onClick={handleRunScan}
                disabled={isScanning || !jobText.trim()}
                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Cpu size={18} className="animate-spin" /> Analyse algorithmique ATS en cours...
                  </>
                ) : (
                  <>
                    <Target size={18} /> Lancer le Scan de Compatibilité ATS
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Score Banner */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Overall Big Score Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Score Global ATS</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-5xl font-extrabold tracking-tight">{report.scores.overallScore}</span>
                      <span className="text-lg font-bold text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium mt-3">
                    {report.matchSummary}
                  </p>
                </div>

                {/* Score Breakdown Metrics */}
                <div className="md:col-span-3 grid grid-cols-2 gap-3">
                  <div className="border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Mots-clés Clés</span>
                    <div className="text-xl font-black text-gray-900">{report.scores.keywordMatchScore}%</div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${report.scores.keywordMatchScore}%` }} />
                    </div>
                  </div>

                  <div className="border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Impact & Chiffres</span>
                    <div className="text-xl font-black text-gray-900">{report.scores.impactQuantificationScore}%</div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--status-green)] h-full" style={{ width: `${report.scores.impactQuantificationScore}%` }} />
                    </div>
                  </div>

                  <div className="border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Lisibilité ATS</span>
                    <div className="text-xl font-black text-gray-900">{report.scores.readabilityScore}%</div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--status-purple)] h-full" style={{ width: `${report.scores.readabilityScore}%` }} />
                    </div>
                  </div>

                  <div className="border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Formatage & Structure</span>
                    <div className="text-xl font-black text-gray-900">{report.scores.formattingScore}%</div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--status-orange)] h-full" style={{ width: `${report.scores.formattingScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Keywords Match Status */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={16} /> Mots-clés extraits de l'offre
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold border ${
                        kw.foundInCv
                          ? 'bg-[var(--status-green)]/10 text-[var(--status-green)] border-[var(--status-green)]/30'
                          : 'bg-[var(--status-red)]/10 text-[var(--status-red)] border-[var(--status-red)]/30'
                      }`}
                    >
                      {kw.foundInCv ? <CheckCircle2 size={12} /> : <X size={12} />}
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Risk Flags */}
              {report.riskFlags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-[var(--status-orange)]" /> Avertissements & Corrections Suggérées
                  </h3>
                  <div className="space-y-2">
                    {report.riskFlags.map((risk) => (
                      <div key={risk.id} className="p-3.5 bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--status-orange)]">{risk.message}</span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[var(--status-orange)]/20 text-[var(--status-orange)]">
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--status-orange)] font-medium">{risk.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Bullets */}
              {report.recommendedBulletPoints.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[var(--status-purple)]" /> Recommandations de Puces Chiffrées
                  </h3>
                  <div className="bg-[var(--status-purple)]/10 border border-[var(--status-purple)]/30 p-4 rounded-xl space-y-2">
                    {report.recommendedBulletPoints.map((bp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[var(--status-purple)] font-medium">
                        <ArrowUpRight size={14} className="text-[var(--status-purple)] shrink-0 mt-0.5" />
                        <span>{bp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => setReport(null)}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl"
          >
            {report ? 'Relancer un scan' : 'Fermer'}
          </button>
          <button
            onClick={onClose}
            className="bg-[#0f172a] text-white font-bold text-xs px-5 py-2.5 rounded-full"
          >
            Fermer le scanner
          </button>
        </div>
      </div>
    </div>
  );
}
