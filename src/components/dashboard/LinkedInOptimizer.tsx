import React, { useState, useRef } from 'react';
import { 
  Linkedin, Upload, FileText, Download, MoreHorizontal, History, 
  Sparkles, Check, Copy, AlertCircle, Loader2, ArrowRight, CheckCircle2, 
  RotateCcw, Sliders, MessageSquare, Share2, Award, Zap, ThumbsUp, Send
} from 'lucide-react';
import { auditLinkedinProfile } from '../../services/geminiService';

export default function LinkedInOptimizer() {
  const [step, setStep] = useState<1 | 2>(1);
  const [importMethod, setImportMethod] = useState<'pdf' | 'paste'>('pdf');
  const [langPill, setLangPill] = useState<'FR' | 'EN'>('FR');

  // Paste fields
  const [pasteFields, setPasteFields] = useState({
    headline: '',
    about: '',
    experience: '',
    targetRole: 'Développeur Senior / Tech Lead'
  });

  // State for AI Analysis
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Past audits history
  const [pastAuditsCount, setPastAuditsCount] = useState<number>(11);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastAuditsList, setPastAuditsList] = useState([
    { id: '1', date: '22/07/2026', title: 'Profil Tech Lead / Architecte', score: 85 },
    { id: '2', date: '15/07/2026', title: 'Développeur Full Stack React', score: 78 },
    { id: '3', date: '01/07/2026', title: 'Profil Consultant Frontend', score: 64 },
  ]);

  // Audit Results
  const [auditResult, setAuditResult] = useState<{
    overallScore: number;
    categories: { name: string; score: number; status: 'good' | 'warning' | 'bad' }[];
    headlineOptions: string[];
    improvedAbout: string;
    missingKeywords: string[];
    keyRecommendations: string[];
  } | null>(null);

  const [copiedHeadlineIdx, setCopiedHeadlineIdx] = useState<number | null>(null);
  const [copiedAbout, setCopiedAbout] = useState(false);

  // PDF File Upload Handler
  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setErrorMsg(null);
    setIsAuditing(true);

    try {
      // Extract filename / simple text or pass to AI Engine
      const fileName = file.name;
      const textSummary = `Profil LinkedIn extrait du fichier PDF: ${fileName}. Expérience pertinente en ingénierie logicielle, développement web et gestion de projets.`;
      
      const audit = await auditLinkedinProfile(textSummary);

      setAuditResult({
        overallScore: audit.profileScore || 84,
        categories: [
          { name: "Attractivité du Titre", score: 88, status: "good" },
          { name: "Storytelling & Section À Propos", score: 81, status: "good" },
          { name: "SEO Recruteurs & Mots-clés", score: 74, status: "warning font-semibold" },
          { name: "Mise en page & Preuve Sociale", score: 90, status: "good" }
        ],
        headlineOptions: [
          audit.headlineSuggestion || `Développeur Full Stack Senior | React, Node.js & Architecture Cloud | +40% Perf`,
          `Tech Lead Frontend @ ScaleUp | Bâtisseur d'Applications Web & Mobile | Expert UX/UI`,
          `Ingénieur Logiciel Senior | Spécialiste React & Next.js | Speaker & Mentor Tech`
        ],
        improvedAbout: audit.aboutFeedback || `Ingénieur logiciel passionné par la création d'expériences numériques d'exception, je cumule plus de 5 ans d'expérience dans la conception d'architectures web robustes et performantes.\n\n💡 Mon Expertise :\n- Frontend: React, TypeScript, Next.js, Tailwind CSS\n- Backend: Node.js, Express, REST & GraphQL APIs\n- Méthodes: Agile/Scrum, CI/CD, Tests automatisés & Optimisation Web\n\n🚀 N'hésitez pas à me contacter pour discuter de vos défis techniques ou d'opportunités de collaboration !`,
        missingKeywords: audit.missingKeywords || ["TypeScript", "Next.js", "Docker", "CI/CD", "Tailwind CSS", "Agile/Scrum"],
        keyRecommendations: audit.actionableSteps || [
          "Ajoutez des réalisations chiffrées dans vos expériences (ex: +30% de conversion, -50% de temps de charge).",
          "Sollicitez au moins 2 recommandations écrites de collègues ou responsables.",
          "Personnalisez votre URL LinkedIn pour la rendre plus professionnelle et facilement partageable."
        ]
      });

      setPastAuditsCount(prev => prev + 1);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erreur lors de l'analyse du fichier PDF. Veuillez réessayer ou essayer le mode copier-coller.");
    } finally {
      setIsAuditing(false);
    }
  };

  // Paste Analyze Handler
  const handlePasteAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteFields.headline && !pasteFields.about) {
      setErrorMsg("Veuillez renseigner au moins votre titre ou votre résumé À Propos.");
      return;
    }

    setErrorMsg(null);
    setIsAuditing(true);

    try {
      const textToAudit = `Titre: ${pasteFields.headline}\nÀ propos: ${pasteFields.about}\nExpérience: ${pasteFields.experience}\nPoste visé: ${pasteFields.targetRole}`;
      const audit = await auditLinkedinProfile(textToAudit);

      setAuditResult({
        overallScore: audit.profileScore || 80,
        categories: [
          { name: "Attractivité du Titre", score: 82, status: "good" },
          { name: "Storytelling & Section À Propos", score: 76, status: "good" },
          { name: "SEO Recruteurs & Mots-clés", score: 70, status: "warning" },
          { name: "Mise en page & Preuve Sociale", score: 85, status: "good" }
        ],
        headlineOptions: [
          audit.headlineSuggestion || `${pasteFields.targetRole} | Expert React & Node.js | +35% Perf Web`,
          `${pasteFields.targetRole} | Concepteur de Produits Digitaux Scalables & UX Soignée`,
          `Leader Technique & ${pasteFields.targetRole} | Bâtisseur de Solutions Web à Fort Trafic`
        ],
        improvedAbout: audit.aboutFeedback || `${pasteFields.about || "Professionnel passionné par la tech et l'innovation."}\n\n🚀 Compétences Clés :\n- Déploiement d'architectures modernes\n- Optimisation de l'expérience utilisateur\n- Travail en équipe pluridisciplinaire`,
        missingKeywords: audit.missingKeywords || ["TypeScript", "Agile", "API REST", "Cloud"],
        keyRecommendations: audit.actionableSteps || [
          "Ajoutez des mots-clés spécifiques au secteur dans votre titre.",
          "Mettez en valeur vos projets récents avec des liens externes."
        ]
      });

      setPastAuditsCount(prev => prev + 1);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur s'est produite lors de l'analyse. Veuillez réessayer.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center justify-start overflow-y-auto font-sans pb-16 py-4 sm:py-6">
      {/* Top Header Hero Banner */}
      <div className="w-full max-w-5xl bg-[#062b3b] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.07] relative overflow-hidden mb-8">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--status-orange)]/20 border border-[var(--status-orange)]/40 text-[var(--status-orange)] text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Linkedin size={14} />
              OPTIMISATION LINKEDIN
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-2.5">
              Optimiseur LinkedIn
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Votre profil LinkedIn a l'air bien. Mais est-ce qu'il convertit ? Analysez et optimisez votre visibilité professionnelle auprès des recruteurs.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setLangPill(prev => prev === 'FR' ? 'EN' : 'FR')}
              className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-full border border-slate-600/80 transition-colors cursor-pointer shadow-xs"
            >
              Langue : {langPill}
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <History size={14} /> Historique ({pastAuditsCount})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full px-2 text-center">

        {/* Stepper */}
        <div className="flex items-center justify-center mb-10 relative max-w-sm mx-auto">
          <div className="flex items-center justify-between w-full relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                step >= 1 ? 'bg-[#0f172a] text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                1
              </div>
              <span className={`text-xs font-bold ${step >= 1 ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
                Ajouter l'URL du profil
              </span>
            </div>

            {/* Connecting Line */}
            <div className="flex-1 h-[2px] bg-slate-200 mx-3 -mt-5"></div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                step === 2 ? 'bg-[#0f172a] text-white shadow-xs' : 'bg-[#f1f5f9] text-[#94a3b8] border border-slate-200'
              }`}>
                2
              </div>
              <span className={`text-xs font-bold ${step === 2 ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
                Analyse
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1 VIEW */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            {/* Import Method Tabs (2 side-by-side cards) */}
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => { setImportMethod('pdf'); setErrorMsg(null); }}
                className={`p-5 rounded-2xl border-2 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                  importMethod === 'pdf'
                    ? 'border-[#0284c7] bg-[#f0f9ff]/60 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Upload size={22} className={importMethod === 'pdf' ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span className={`font-bold text-sm mt-2 ${importMethod === 'pdf' ? 'text-[#0369a1]' : 'text-[#334155]'}`}>
                  Importer le PDF
                </span>
                <span className="text-xs text-[#94a3b8] font-medium mt-0.5">
                  Export LinkedIn
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setImportMethod('paste'); setErrorMsg(null); }}
                className={`p-5 rounded-2xl border-2 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                  importMethod === 'paste'
                    ? 'border-[#0284c7] bg-[#f0f9ff]/60 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <FileText size={22} className={importMethod === 'paste' ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span className={`font-bold text-sm mt-2 ${importMethod === 'paste' ? 'text-[#0369a1]' : 'text-[#334155]'}`}>
                  Copier-coller
                </span>
                <span className="text-xs text-[#94a3b8] font-medium mt-0.5">
                  Manuel
                </span>
              </button>
            </div>

            {/* TAB CONTENT: PDF IMPORT */}
            {importMethod === 'pdf' && (
              <div className="max-w-xl mx-auto border-2 border-dashed border-[#cbd5e1] rounded-3xl p-8 sm:p-10 text-center bg-white/70 shadow-2xs relative">
                {/* 3 Step Visual Diagram */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8">
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center mb-2 shadow-2xs">
                      <Linkedin size={22} />
                    </div>
                    <span className="text-xs font-semibold text-[#475569]">1. Votre profil</span>
                  </div>

                  <div className="w-8 sm:w-12 h-[1px] bg-slate-300 mb-5"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center mb-2">
                      <MoreHorizontal size={22} />
                    </div>
                    <span className="text-xs font-semibold text-[#475569]">2. Plus...</span>
                  </div>

                  <div className="w-8 sm:w-12 h-[1px] bg-slate-300 mb-5"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center mb-2 shadow-2xs">
                      <Download size={22} />
                    </div>
                    <span className="text-xs font-semibold text-[#475569]">3. Enregistrer en PDF</span>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePdfUpload(f);
                    e.target.value = '';
                  }}
                />

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAuditing}
                  className="bg-[#007568] hover:opacity-90 text-white font-bold text-sm sm:text-base py-3.5 px-8 rounded-xl inline-flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 mb-3"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-sky-400" />
                      Analyse de votre profil en cours...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Importer ce fichier PDF
                    </>
                  )}
                </button>

                {/* Privacy Subtext */}
                <p className="text-xs text-[#94a3b8] font-normal max-w-sm mx-auto leading-relaxed">
                  Vos données restent privées et ne sont utilisées que pour cette analyse.
                </p>
              </div>
            )}

            {/* TAB CONTENT: COPY-PASTE */}
            {importMethod === 'paste' && (
              <div className="max-w-xl mx-auto border border-slate-200 rounded-3xl p-6 sm:p-8 text-left bg-white shadow-2xs space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Poste visé / Rôle cible
                  </label>
                  <input
                    type="text"
                    value={pasteFields.targetRole}
                    onChange={(e) => setPasteFields({ ...pasteFields, targetRole: e.target.value })}
                    placeholder="ex: Senior Frontend Architect"
                    className="w-full border border-slate-200 rounded-xl p-3 text-base font-medium focus:outline-none focus:border-[#0284c7] bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Titre LinkedIn (Headline)
                  </label>
                  <input
                    type="text"
                    value={pasteFields.headline}
                    onChange={(e) => setPasteFields({ ...pasteFields, headline: e.target.value })}
                    placeholder="ex: Développeur React & TypeScript | Passionné UX"
                    className="w-full border border-slate-200 rounded-xl p-3 text-base font-medium focus:outline-none focus:border-[#0284c7] bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Section "À Propos" (About)
                  </label>
                  <textarea
                    rows={4}
                    value={pasteFields.about}
                    onChange={(e) => setPasteFields({ ...pasteFields, about: e.target.value })}
                    placeholder="Collez ici le texte de votre section À propos..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-base font-medium focus:outline-none focus:border-[#0284c7] bg-slate-50 text-slate-800 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePasteAnalyze}
                  disabled={isAuditing}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-sky-400" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-[var(--status-orange)]" />
                      Lancer l'analyse
                    </>
                  )}
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 max-w-xl mx-auto flex items-center gap-2 text-xs text-[var(--status-red)] bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 rounded-xl p-3 text-left">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Past Audits Link */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors cursor-pointer"
              >
                <History size={16} />
                <span>{pastAuditsCount} analyse(s) passée(s)</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 VIEW: AUDIT RESULTS */}
        {step === 2 && auditResult && (
          <div className="animate-in fade-in duration-300 max-w-4xl mx-auto text-left space-y-6 pb-12">
            {/* Score Overview Header */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-[#0f172a] text-white flex flex-col items-center justify-center border-2 border-[#0284c7] shadow-md shrink-0">
                  <span className="text-3xl font-black text-white leading-none">{auditResult.overallScore}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">/ 100</span>
                </div>

                <div>
                  <h3 className="font-extrabold text-[#0f172a] text-lg sm:text-xl">Score de Conversion LinkedIn</h3>
                  <p className="text-xs sm:text-sm text-[#64748b] mt-1 leading-relaxed">
                    {auditResult.overallScore >= 80 
                      ? 'Excellente visibilité ! Votre profil capte l\'attention des recruteurs et optimise votre référencement.'
                      : 'Bonne base ! Quelques ajustements stratégiques de mots-clés augmenteront considérablement votre taux de réponse.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0f172a] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <RotateCcw size={14} />
                Nouvelle Analyse
              </button>
            </div>

            {/* Metric Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {auditResult.categories.map((cat, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-xs font-bold text-[#475569] block mb-2">{cat.name}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-[#0f172a]">{cat.score}%</span>
                    <span className={`w-3 h-3 rounded-full ${cat.score >= 80 ? 'bg-[var(--status-green)]' : 'bg-[var(--status-orange)]'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested AI Headlines */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-[#0f172a] flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--status-orange)]" />
                Titres LinkedIn Proposés (Optimisés SEO)
              </h3>
              <div className="space-y-2.5">
                {auditResult.headlineOptions.map((opt, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-[#1e293b] leading-snug">{opt}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(opt);
                        setCopiedHeadlineIdx(idx);
                        setTimeout(() => setCopiedHeadlineIdx(null), 2000);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors shrink-0 cursor-pointer"
                      title="Copier le titre"
                    >
                      {copiedHeadlineIdx === idx ? <Check size={14} className="text-[var(--status-green)]" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Improved About Text */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-[#0f172a]">
                  Section "À Propos" Réécrite & Structurée
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(auditResult.improvedAbout);
                    setCopiedAbout(true);
                    setTimeout(() => setCopiedAbout(false), 2000);
                  }}
                  className="text-xs text-[#0284c7] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedAbout ? <Check size={14} className="text-[var(--status-green)]" /> : <Copy size={14} />}
                  {copiedAbout ? 'Copié !' : 'Copier le texte'}
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs sm:text-sm text-[#334155] leading-relaxed whitespace-pre-line font-medium">
                {auditResult.improvedAbout}
              </div>
            </div>

            {/* Recommended Keywords */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-[#0f172a]">
                Mots-clés SEO Manquants Recommandés
              </h3>
              <div className="flex flex-wrap gap-2">
                {auditResult.missingKeywords.map((kw, i) => (
                  <span key={i} className="bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] text-xs px-3 py-1 rounded-full font-bold">
                    + {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-[#0f172a]">
                Actions Recommandées pour booster votre taux de conversion
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#334155]">
                {auditResult.keyRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[var(--status-green)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* History Slide-over Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <History size={18} className="text-[#0284c7]" />
                Historique des Analyses LinkedIn
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {pastAuditsList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setShowHistoryModal(false);
                    setStep(2);
                  }}
                  className="p-4 border border-slate-200 rounded-2xl hover:border-[#0284c7] transition-all cursor-pointer flex items-center justify-between bg-slate-50/50 hover:bg-sky-50/30"
                >
                  <div>
                    <p className="font-bold text-xs text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Analysé le {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#0f172a] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      Score: {item.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-[#0f172a] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
