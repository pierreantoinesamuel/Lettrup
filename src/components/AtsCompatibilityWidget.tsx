import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, Sparkles, ChevronDown, ChevronUp,
  FileText, Target, BarChart2, Lightbulb, Search, Plus, Layers, ShieldCheck, Flag, ArrowRight
} from 'lucide-react';

import { computeAtsAnalysis } from '../lib/atsScoring';
import type { AtsAnalysis } from '../lib/atsScoring';
import { ATSControllerAgent, ATSControllerReport } from '../features/ats-engine/domain/services/ATSControllerAgent';

export type { AtsCheckResult, AtsAnalysis } from '../lib/atsScoring';

interface AtsCompatibilityWidgetProps {
  data: any; // ResumeData
  templateId: string;
  onAddSkill?: (skill: string) => void;
  onApplyAiFix?: (prompt: string) => void;
}

export const AtsCompatibilityWidget: React.FC<AtsCompatibilityWidgetProps> = ({
  data,
  templateId,
  onAddSkill,
  onApplyAiFix
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'agent' | 'categories' | 'job_match'>('agent');
  const [jobDescription, setJobDescription] = useState('');
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [isMatchingKeywords, setIsMatchingKeywords] = useState(false);

  // Dynamic audit via ATS Controller Agent (Benchmark France + ATS)
  const report: ATSControllerReport = useMemo(() => ATSControllerAgent.audit(data, templateId), [data, templateId]);
  const analysis: AtsAnalysis = report.analysis;

  // Handle Job Keyword Extractor
  const handleExtractKeywords = () => {
    if (!jobDescription.trim()) return;
    setIsMatchingKeywords(true);

    setTimeout(() => {
      const words = jobDescription
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 3);

      const stopWords = new Set(['avec', 'dans', 'pour', 'plus', 'votre', 'notre', 'nous', 'vous', 'sont', 'cette', 'tout', 'tous', 'fait', 'être', 'avoir', 'aussi', 'ainsi', 'chez', 'entre', 'sous', 'comme', 'leurs', 'poste', 'équipe', 'missions']);
      
      const freqMap: Record<string, number> = {};
      words.forEach(w => {
        const lower = w.toLowerCase();
        if (!stopWords.has(lower) && !/^\d+$/.test(lower)) {
          freqMap[w] = (freqMap[w] || 0) + 1;
        }
      });

      const sorted = Object.keys(freqMap)
        .sort((a, b) => freqMap[b] - freqMap[a])
        .slice(0, 12);

      setTargetKeywords(sorted);
      setIsMatchingKeywords(false);
    }, 400);
  };

  const currentCvText = useMemo(() => {
    return JSON.stringify(data).toLowerCase();
  }, [data]);

  const matchedKeywords = targetKeywords.filter(kw => currentCvText.includes(kw.toLowerCase()));

  const colorStyles = {
    green: { bg: 'bg-[var(--status-green)]', text: 'text-[var(--status-green)]', border: 'border-[var(--status-green)]/30', lightBg: 'bg-[var(--status-green)]/10' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', lightBg: 'bg-blue-50' },
    yellow: { bg: 'bg-[var(--status-orange)]', text: 'text-[var(--status-orange)]', border: 'border-[var(--status-orange)]/30', lightBg: 'bg-[var(--status-orange)]/10' },
    red: { bg: 'bg-[var(--status-red)]', text: 'text-[var(--status-red)]', border: 'border-[var(--status-red)]/30', lightBg: 'bg-[var(--status-red)]/10' },
  }[analysis.statusColor];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
      {/* Top Header Widget Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Circular score display */}
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm ${
              analysis.statusColor === 'green' ? 'border-[var(--status-green)] text-[var(--status-green)] bg-[var(--status-green)]/10' :
              analysis.statusColor === 'blue' ? 'border-blue-500 text-blue-800 bg-blue-50' :
              analysis.statusColor === 'yellow' ? 'border-[var(--status-orange)] text-[var(--status-orange)] bg-[var(--status-orange)]/10' :
              'border-[var(--status-red)] text-[var(--status-red)] bg-[var(--status-red)]/10'
            }`}>
              {analysis.overallScore}%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-gray-900">Agent Contrôleur ATS & Marché France</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorStyles.lightBg} ${colorStyles.text} ${colorStyles.border} border`}>
                {analysis.statusLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Benchmark Apec & ATS (Workday, Welcome to the Jungle, Taleo)</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-0.5">
                <ShieldCheck size={13} /> Conforme critères France
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-xs font-semibold hidden sm:inline">
            {isOpen ? 'Masquer' : 'Ouvrir l\'audit'}
          </span>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Report Panel */}
      {isOpen && (
        <div className="border-t border-gray-200 bg-gray-50/60 p-4 sm:p-5 space-y-5 animate-fadeIn">
          {/* Navigation Tabs inside Widget */}
          <div className="flex border-b border-gray-200 gap-2 pb-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'agent'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <ShieldCheck size={14} />
              Audit Critique Marché France
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'categories'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <BarChart2 size={14} />
              Détail des 5 Piliers ({analysis.overallScore}/100)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('job_match')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'job_match'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <Target size={14} />
              Scanner une Offre Cible
            </button>
          </div>

          {/* TAB 1: Audit Critique Marché France */}
          {activeTab === 'agent' && (
            <div className="space-y-4">
              {/* Summary table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/80 text-gray-700 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Critère</th>
                      <th className="py-2.5 px-3 text-center">Barème</th>
                      <th className="py-2.5 px-3">Analyse Marché France (Apec, Recruteurs, Cabinets)</th>
                      <th className="py-2.5 px-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.criteresFrance.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {c.status === 'pass' && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                            {c.status === 'warn' && <AlertTriangle size={14} className="text-amber-600 shrink-0" />}
                            {c.status === 'fail' && <XCircle size={14} className="text-rose-600 shrink-0" />}
                            <span>{c.critere}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-600 whitespace-nowrap">
                          {c.scoreObtenu} / {c.bareme}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 leading-relaxed text-[11px]">
                          {c.analyse}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            c.verdict === 'Valide à 100%' ? 'bg-emerald-100 text-emerald-800' :
                            c.verdict.startsWith('Valide') ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {c.verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Spécificités françaises manquantes */}
              <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Flag size={15} className="text-indigo-600" />
                    <span>Contrôle des Spécificités Françaises Indispensables</span>
                  </div>
                  <span className="text-[11px] text-indigo-700 font-semibold">Référentiel Cabinets France</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  {/* Langues CECRL */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    report.specificitesManquantes.languagesCefr.passed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}>
                    {report.specificitesManquantes.languagesCefr.passed ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-bold">Langues vivantes (Anglais)</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">{report.specificitesManquantes.languagesCefr.recommendation}</p>
                    </div>
                  </div>

                  {/* Permis / Mobilité */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    report.specificitesManquantes.mobilityPermis.passed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}>
                    {report.specificitesManquantes.mobilityPermis.passed ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-bold">Mobilité & Permis B</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">{report.specificitesManquantes.mobilityPermis.recommendation}</p>
                    </div>
                  </div>

                  {/* Preuves chiffrées */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    report.specificitesManquantes.metricsAndKpis.passed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}>
                    {report.specificitesManquantes.metricsAndKpis.passed ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-bold">Résultats & KPIs chiffrés</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">{report.specificitesManquantes.metricsAndKpis.recommendation}</p>
                    </div>
                  </div>

                  {/* Diplômes */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    report.specificitesManquantes.degreeRecognition.passed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50/60 border-blue-200 text-blue-900'
                  }`}>
                    {report.specificitesManquantes.degreeRecognition.passed ? <CheckCircle2 size={14} className="text-blue-600 shrink-0 mt-0.5" /> : <Lightbulb size={14} className="text-blue-600 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-bold">Niveau d'études & Certifications</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">{report.specificitesManquantes.degreeRecognition.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions d'optimisation prioritaires 1-clic */}
              {onApplyAiFix && report.priorityFixes.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Sparkles size={16} className="text-amber-400" />
                      <span>Actions Prioritaires recommandées par l'Agent ATS</span>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full">
                      Gain potentiel jusqu'à +{report.priorityFixes.reduce((acc, f) => acc + f.potentialGain, 0)} pts
                    </span>
                  </div>

                  <div className="space-y-2">
                    {report.priorityFixes.slice(0, 3).map((fix) => (
                      <div key={fix.id} className="flex items-center justify-between gap-3 bg-white/10 hover:bg-white/15 p-2.5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                            +{fix.potentialGain}
                          </span>
                          <span className="font-medium text-slate-200">{fix.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplyAiFix(fix.actionPrompt)}
                          className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-[11px] px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 shrink-0"
                        >
                          <span>Appliquer</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Progress Breakdown Bars */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.categories.map((cat, i) => (
                <div key={i} className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800 mb-1.5">
                    <span>{cat.category}</span>
                    <span className={cat.score >= 80 ? 'text-[var(--status-green)]' : cat.score >= 50 ? 'text-[var(--status-orange)]' : 'text-[var(--status-red)]'}>
                      {cat.score}% ({Math.round((cat.score / 100) * cat.maxPoints)}/{cat.maxPoints} pts)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        cat.score >= 80 ? 'bg-[var(--status-green)]' : cat.score >= 50 ? 'bg-[var(--status-orange)]' : 'bg-[var(--status-red)]'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {cat.checks.map((chk) => (
                      <div key={chk.id} className="text-[11px] flex items-start gap-1.5 text-gray-700 leading-tight">
                        {chk.status === 'pass' && <CheckCircle2 size={13} className="text-[var(--status-green)] shrink-0 mt-0.5" />}
                        {chk.status === 'warn' && <AlertTriangle size={13} className="text-[var(--status-orange)] shrink-0 mt-0.5" />}
                        {chk.status === 'fail' && <XCircle size={13} className="text-[var(--status-red)] shrink-0 mt-0.5" />}
                        <div>
                          <span>{chk.label}</span>
                          {chk.suggestion && (
                            <p className="text-[10px] text-gray-500 italic mt-0.5 font-sans">
                              💡 {chk.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Job Description Keyword Matcher */}
          {activeTab === 'job_match' && (
            <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Target size={16} className="text-blue-600" />
                <span>Comparateur de Mots-clés avec une Offre d'Emploi</span>
              </div>
              <p className="text-xs text-gray-600">
                Collez l'intitulé ou la description de l'offre visée pour vérifier que votre CV contient les mots-clés stratégiques.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Collez le texte de l'annonce d'emploi ici..."
                  rows={2}
                  className="flex-1 text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleExtractKeywords}
                  disabled={isMatchingKeywords || !jobDescription.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Search size={14} />
                  {isMatchingKeywords ? 'Analyse...' : 'Comparer'}
                </button>
              </div>

              {targetKeywords.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">
                      Mots-clés détectés dans l'offre ({matchedKeywords.length}/{targetKeywords.length} présents)
                    </span>
                    <span className="text-blue-700 font-semibold">
                      Match: {Math.round((matchedKeywords.length / targetKeywords.length) * 100)}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {targetKeywords.map((kw, i) => {
                      const isMatched = currentCvText.includes(kw.toLowerCase());
                      return (
                        <span
                          key={i}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            isMatched 
                              ? 'bg-[var(--status-green)]/10 text-[var(--status-green)] border-[var(--status-green)]/30'
                              : 'bg-[var(--status-red)]/10 text-[var(--status-red)] border-[var(--status-red)]/30'
                          }`}
                        >
                          {isMatched ? <CheckCircle2 size={11} className="text-[var(--status-green)]" /> : <XCircle size={11} className="text-[var(--status-red)]" />}
                          {kw}
                          {!isMatched && onAddSkill && (
                            <button
                              type="button"
                              onClick={() => onAddSkill(kw)}
                              title="Ajouter aux compétences"
                              className="ml-1 text-[var(--status-red)] hover:text-black hover:bg-[var(--status-red)]/20 rounded p-0.5 transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
