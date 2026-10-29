import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSearch, Loader2, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { auditResume } from '../../services/geminiService';
import { listUserResumes, resumeDataToPlainText, ResumeListItem } from '../../lib/resumeStore';

type AuditResult = Awaited<ReturnType<typeof auditResume>>;

export default function ProfileAnalysisView() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);

  const selectedResume = useMemo(() => resumes.find((resume) => resume.id === selectedId), [resumes, selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setResumes([]); setLoadingList(false); return; }
    setLoadingList(true);
    listUserResumes(user.id)
      .then((items) => {
        if (cancelled) return;
        setResumes(items);
        setSelectedId(items.find((item) => item.isPrimary)?.id || items[0]?.id || '');
      })
      .catch(() => { if (!cancelled) setError('Impossible de charger vos CV. Réessayez dans un instant.'); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const runAnalysis = async () => {
    if (!selectedResume) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const resumeText = resumeDataToPlainText(selectedResume.resumeData);
      if (!resumeText.trim()) throw new Error('Ce CV ne contient pas de texte exploitable. Choisissez un autre CV ou complétez son contenu.');
      setResult(await auditResume(resumeText));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’analyse n’a pas abouti. Réessayez.");
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreTone = !result ? '' : result.atsScore >= 75 ? 'text-emerald-600' : result.atsScore >= 50 ? 'text-amber-600' : 'text-rose-600';
  const recommendations = result ? [
    ...result.improvements,
    ...result.missingKeywords.map((keyword) => `Ajoutez « ${keyword} » si cette compétence correspond à votre expérience.`),
  ] : [];

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold text-[#007568]">Diagnostic de CV</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-tertiary sm:text-5xl">Analyse de CV</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607786]">Obtenez un score de compatibilité, les points forts de votre CV et des améliorations concrètes.</p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <label className="sr-only" htmlFor="analysis-resume">CV à analyser</label>
        <select id="analysis-resume" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setResult(null); }} disabled={loadingList || !resumes.length} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d4e1e7] bg-white px-3 text-sm font-semibold text-[#244354] sm:w-56 sm:flex-none">
          {loadingList ? <option value="">Chargement des CV…</option> : resumes.length ? resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}</option>) : <option value="">Aucun CV disponible</option>}
        </select>
        <button type="button" onClick={runAnalysis} disabled={!selectedResume || analyzing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#007568] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#006257] disabled:cursor-not-allowed disabled:opacity-50">
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {analyzing ? 'Analyse…' : 'Analyser'}
        </button>
      </div>
    </header>

    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}

    {!loadingList && !resumes.length ? <section className="rounded-2xl border border-dashed border-[#c9d9e0] bg-white p-8 text-center">
      <FileSearch size={30} className="mx-auto text-[#007568]" />
      <h2 className="mt-3 font-bold text-[#102d3e]">Ajoutez un CV pour commencer</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Créez ou importez votre CV dans « Mes CV », puis revenez ici pour lancer l’analyse.</p>
    </section> : null}

    {!result && (loadingList || resumes.length > 0) && <div className="grid gap-4 md:grid-cols-3">
      <section className="rounded-lg bg-primary-container/60 p-6 md:col-span-2">
        <h2 className="text-2xl font-black text-tertiary">Votre CV, passé au crible</h2>
        <p className="mt-1 text-sm text-[#456071]">Lancez l’analyse pour afficher votre diagnostic.</p>
        <ol className="mt-6 divide-y divide-tertiary/15 border-y border-tertiary/15">{['Structure et lisibilité', 'Compétences mises en avant', 'Mots-clés présents', 'Pistes d’amélioration'].map((item, index) => <li key={item} className="flex min-h-11 items-baseline gap-4 py-3 text-sm font-semibold text-tertiary"><span className="w-6 font-black tabular-nums text-[#007568]">{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ol>
      </section>
      <aside className="rounded-lg bg-tertiary p-6 text-white"><h2 className="text-2xl font-black text-accent">Des conseils ciblés</h2><p className="mt-3 text-sm leading-6 text-white/80">Sélectionnez l’un de vos CV. Le diagnostic met en évidence ce qui fonctionne et ce qui mérite votre attention.</p></aside>
    </div>}

    {result && <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.6fr)]">
      <section className="rounded-lg bg-tertiary p-6 text-white">
        <p className="text-sm font-bold text-white/75">Score ATS</p>
        <div className="mt-5 text-7xl font-black leading-none tracking-tight text-accent">{result.atsScore}<span className="text-3xl">%</span></div>
        <p className="mt-4 text-sm leading-6 text-white/80">{result.summary || 'Votre analyse est prête. Consultez les points forts et les pistes d’amélioration.'}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${result.atsScore}%` }} /></div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg bg-primary-container/60 p-6"><h2 className="flex items-center gap-2 text-lg font-black text-tertiary"><CheckCircle2 size={18} className="text-[#007568]" />Points forts</h2><ul className="mt-4 space-y-3">{(result.strengths.length ? result.strengths : ['Aucun point fort détaillé pour cette analyse.']).map((item, index) => <li key={index} className="text-sm leading-5 text-[#244354]">{item}</li>)}</ul></section>
        <section className="rounded-lg bg-[#fff1df] p-6"><h2 className="flex items-center gap-2 text-lg font-black text-tertiary"><Target size={18} className="text-amber-600" />À améliorer</h2><ul className="mt-4 space-y-3">{(recommendations.length ? recommendations : ['Aucune amélioration prioritaire détectée.']).map((item, index) => <li key={index} className="text-sm leading-5 text-[#244354]">{item}</li>)}</ul></section>
      </div>
    </div>}
  </div>;
}
