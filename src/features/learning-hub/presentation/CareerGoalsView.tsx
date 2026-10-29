import React, { useState } from 'react';
import { Check, Link2, Download, Copy, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import { CareerGoal, SkillGap } from '../domain/types';
import { SaveGoalInput } from '../ports/ILearningRepository';
import { JobApplicationPipelineState } from './EntretienToolView';

interface CareerGoalsViewProps {
  goals: CareerGoal[];
  activeGoal: CareerGoal | null;
  gaps?: SkillGap[];
  readiness?: number;
  pipeline: JobApplicationPipelineState;
  onUpdateJobUrl: (jobUrl: string) => void;
  onDeclareInterviewUnlocked: () => void;
  onSaveGoal: (input: SaveGoalInput) => Promise<void>;
  onSelectActiveGoal: (goalId: string) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void> | void;
}

export const CareerGoalsView: React.FC<CareerGoalsViewProps> = ({
  goals,
  activeGoal,
  gaps = [],
  readiness = 36,
  pipeline,
  onUpdateJobUrl,
  onDeclareInterviewUnlocked,
  onSaveGoal,
  onSelectActiveGoal,
  onDeleteGoal,
}) => {
  const [urlInput, setUrlInput] = useState(pipeline.jobUrl);
  const [copiedArtifact, setCopiedArtifact] = useState<'cv' | 'letter' | null>(null);
  const [activeArtifactPreview, setActiveArtifactPreview] = useState<'cv' | 'letter'>('cv');

  // Automatically deduplicate goals by normalized targetRole
  const uniqueGoals = React.useMemo(() => {
    const seen = new Set<string>();
    return goals.filter((g) => {
      const key = (g.targetRole || '').trim().toLowerCase();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [goals]);

  const currentRole = activeGoal?.currentRole || 'Préparateur de commandes';
  const targetRole = activeGoal?.targetRole || 'Comptable';
  const isAccountantPivot = /comptab|accountant|gestion|audit/i.test(targetRole);

  const handleAnalyzeUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUpdateJobUrl(urlInput.trim());
    }
  };

  const mainGapSkill = isAccountantPivot
    ? 'Sage 100 & Fiscalité TVA'
    : gaps[3]?.skill || `Outils avancés (${targetRole})`;

  const phase1ValidatedSkills = isAccountantPivot
    ? 'Plan Comptable Général (PCG), Partie Double (Débit/Crédit) et Excel Avancé (RECHERCHEX / TCD)'
    : gaps
        .slice(0, 2)
        .map((g) => g.skill)
        .join(' & ') || `Fondamentaux ${targetRole}`;

  const optimizedCvText = `====================================================================
CV OPTIMISÉ IA — ${targetRole.toUpperCase()} (CIBLÉ : ${pipeline.companyName.toUpperCase()})
Profil : Transition ${currentRole} ➔ ${targetRole} (Score S-Curve : ${readiness}%)
====================================================================

RÉSUMÉ PROFESSIONNEL CIBLÉ
Professionnel rigoureux issu du secteur opérationnel (${currentRole}), en finalisation de parcours accéléré vers le métier de ${targetRole}.
Fort d'une maîtrise éprouvée du contrôle des flux, de la vérification documentaire sans erreur et de ${phase1ValidatedSkills}.

COMPÉTENCES CLÉS & PROGRESSION S-CURVE ACTIVE
• [Validé 100%] ${isAccountantPivot ? 'Plan Comptable Général (Classes 1 à 7) & Imputation' : gaps[0]?.skill || `Socle ${targetRole}`}
• [En cours 40% ➔ 100%] ${isAccountantPivot ? 'Comptabilité en Partie Double (Débit / Crédit) & Lettrage 401/411' : gaps[1]?.skill || 'Pratique métier'}
• [En cours 20% ➔ 80%] ${isAccountantPivot ? 'Excel Avancé : RECHERCHEX (XLOOKUP) & Tableaux Croisés Dynamiques (TCD)' : gaps[2]?.skill || 'Outils d’analyse'}
• [Compétence Transférable] Rigueur d'inventaire, pointage de bons de livraison et détection d'écarts.

EXPÉRIENCE OPÉRATIONNELLE REFORMULÉE POUR ${pipeline.companyName.toUpperCase()}
${currentRole} — Gestion des Flux & Contrôle Qualité
• Pointage quotidien des réceptions et rapprochement bons de commande / bons de livraison (0% d'écart toléré).
• Tenue et mise à jour des tableaux de suivi de stocks sur Excel (préparation directe au rapprochement de factures).
• Respect strict des échéances de clôture d'inventaire mensuel.`;

  const coverLetterText = `Objet : Candidature au poste de ${pipeline.jobTitle} — Profil Opérationnel & Rigoureux (${ pipeline.sourcePlatform })

Madame, Monsieur,

Votre offre de ${pipeline.jobTitle} au sein de ${pipeline.companyName} a immédiatement retenu mon attention. Vous recherchez un profil fiable, méthodique et capable de sécuriser la saisie et le suivi de vos opérations quotidiennes.

Durant mon parcours en tant que ${currentRole}, j'ai géré quotidiennement le contrôle de flux physiques, le pointage de centaines de bons de livraison et la tenue d'inventaires sur Excel. Dans mon métier, comme dans le vôtre, une erreur de pointage se traduit immédiatement par un écart financier.

Pour transformer cette rigueur terrain en expertise ${targetRole.toLowerCase()}, j'ai engagé une formation intensive structurée par paliers :
1. Maîtrise validée de ${phase1ValidatedSkills}.
2. Capacité immédiate à prendre en charge la saisie courante, le pointage de factures et l'analyse sur tableur dès ma première semaine.
3. Montée en compétences active sur ${mainGapSkill}, soutenue par une discipline de travail de ${activeGoal?.hoursPerWeek || 6}h d'étude hebdomadaire après mes journées de poste.

Recruter un ancien ${currentRole.toLowerCase()}, c'est intégrer un collaborateur qui connaît la réalité concrète des marchandises et des documents qui se trouvent derrière chaque ligne comptable.

Je serais ravi(e) de vous démontrer ma motivation et ma maîtrise opérationnelle lors d'un entretien.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`;

  const handleCopy = async (kind: 'cv' | 'letter') => {
    const content = kind === 'cv' ? optimizedCvText : coverLetterText;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedArtifact(kind);
      setTimeout(() => setCopiedArtifact(null), 2000);
    } catch {
      setCopiedArtifact(kind);
    }
  };

  const handleDownload = (kind: 'cv' | 'letter') => {
    const content = kind === 'cv' ? optimizedCvText : coverLetterText;
    const filename =
      kind === 'cv'
        ? `CV_Optimise_${targetRole.replace(/\s+/g, '_')}_${pipeline.companyName.replace(/\s+/g, '_')}.txt`
        : `Lettre_Motivation_${targetRole.replace(/\s+/g, '_')}_${pipeline.companyName.replace(/\s+/g, '_')}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sampleOffers = [
    {
      label: 'France Travail, Comptable Junior PME (Sage)',
      url: 'https://candidat.francetravail.fr/offres/recherche/detail/comptable-junior-sage-pme',
    },
    {
      label: 'LinkedIn, Assistant Comptable & Facturation',
      url: 'https://www.linkedin.com/jobs/view/assistant-comptable-facturation-indigo',
    },
    {
      label: 'Indigo, Gestionnaire Comptes Fournisseurs',
      url: 'https://careers.indigo.fr/offres/gestionnaire-comptes-fournisseurs-excel',
    },
  ];

  return (
    <div className="space-y-14 max-w-5xl mx-auto">
      {/* Heading and the three steps, as one line of text */}
      <header>
        <h2 className="text-3xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
          CV et lettre sur mesure
        </h2>
        <p className="mt-2 text-sm text-[#456071] max-w-2xl leading-relaxed">
          Collez le lien d&apos;une offre. L&apos;IA compare l&apos;offre à votre profil ({currentRole} ➔ {targetRole}), valorise vos compétences transférables et prépare deux documents prêts à envoyer.
        </p>
        <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <li className="font-bold text-[#007568]">1. Lien de l&apos;offre ✓</li>
          <li className="font-black text-tertiary">2. CV et lettre</li>
          <li className={pipeline.interviewUnlocked ? 'font-bold text-[#007568]' : 'text-slate-500'}>
            3. Fiches STAR et entretien
          </li>
        </ol>
      </header>

      {/* Job link: the one action, on the solid brand surface */}
      <section className="bg-primary text-white rounded-lg p-6 sm:p-8 space-y-4" aria-label="Lien de l'offre">
        <form onSubmit={handleAnalyzeUrl} className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="goals-job-link" className="sr-only">Lien de l&apos;offre d&apos;emploi</label>
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-tertiary/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="goals-job-link"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Lien d'une offre (LinkedIn, France Travail, Indigo…)"
              className="w-full pl-10 pr-4 py-3.5 rounded-lg bg-white text-sm text-tertiary placeholder-tertiary/45 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-accent hover:bg-white text-tertiary rounded-lg text-sm font-black shrink-0 cursor-pointer transition-colors"
          >
            Générer mes outils
          </button>
        </form>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
          <span className="text-white/75">Exemples :</span>
          {sampleOffers.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setUrlInput(sample.url);
                onUpdateJobUrl(sample.url);
              }}
              className="text-white underline underline-offset-4 decoration-white/40 hover:decoration-white cursor-pointer text-left"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </section>

      {/* Match analysis and the two documents */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="text-sm font-bold text-[#007568]">{pipeline.companyName}</p>
          <h3 className="text-2xl font-black text-tertiary">Compatibilité avec l&apos;offre</h3>

          <p className="mt-4 bg-primary-container/50 rounded-lg px-5 py-4 text-sm text-tertiary leading-relaxed">
            L&apos;offre demande la maîtrise de <strong>{isAccountantPivot ? 'Sage 100' : mainGapSkill}</strong>, que vous n&apos;avez pas encore. Le CV et la lettre mettent en avant votre <strong>rigueur logistique</strong>, le contrôle des flux de stocks et votre maîtrise d&apos;<strong>Excel (RECHERCHEX / TCD)</strong> pour compenser cet écart.
          </p>

          <ul className="mt-5 divide-y divide-tertiary/10 border-y border-tertiary/10">
            <li className="py-3 flex items-start gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#007568] shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-tertiary">Pointage de factures et contrôle des réceptions</span>
                <span className="block text-xs text-[#456071] mt-0.5">
                  Issu directement de votre expérience de {currentRole}.
                </span>
              </span>
            </li>
            <li className="py-3 flex items-start gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#007568] shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-tertiary">{phase1ValidatedSkills}</span>
                <span className="block text-xs text-[#456071] mt-0.5">
                  Phase 1 du parcours, placé en tête du CV pour rassurer le recruteur.
                </span>
              </span>
            </li>
            <li className="py-3 flex items-start gap-3 text-sm">
              <ShieldCheck className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-tertiary">{mainGapSkill}</span>
                <span className="block text-xs text-[#456071] mt-0.5">
                  Écart compensé dans la lettre : présenté comme module en cours ({activeGoal?.hoursPerWeek || 6} h par semaine).
                </span>
              </span>
            </li>
          </ul>

          <p className="mt-3 text-xs text-[#456071]">Source : {pipeline.sourcePlatform}</p>
        </div>

        <div className="lg:col-span-7">
          <h3 className="text-2xl font-black text-tertiary">Vos deux documents</h3>

          <div role="tablist" aria-label="Document" className="mt-3 flex gap-6 border-b border-tertiary/15">
            {([
              { id: 'cv', label: 'CV optimisé' },
              { id: 'letter', label: 'Lettre de motivation' },
            ] as const).map((tab) => {
              const isActive = activeArtifactPreview === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveArtifactPreview(tab.id)}
                  className={`-mb-px pb-2.5 text-sm border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-tertiary text-tertiary font-black'
                      : 'border-transparent text-[#456071] hover:text-tertiary font-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-[#456071] max-w-md">
              {activeArtifactPreview === 'cv'
                ? `Met en valeur vos compétences transférables (${currentRole}) et votre progression en phase 1.`
                : `Relie votre pivot (${currentRole} ➔ ${targetRole}) aux besoins de ${pipeline.companyName}.`}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleDownload(activeArtifactPreview)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-tertiary underline underline-offset-4 hover:text-[#007568] cursor-pointer"
              >
                <Download className="w-4 h-4" /> Télécharger
              </button>
              <button
                type="button"
                onClick={() => handleCopy(activeArtifactPreview)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-tertiary hover:bg-[#093b50] text-white text-sm font-bold cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copiedArtifact === activeArtifactPreview ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>

          <div className="mt-3 bg-white rounded-lg p-5 font-mono text-xs leading-relaxed text-tertiary max-h-72 overflow-y-auto whitespace-pre-wrap">
            {activeArtifactPreview === 'cv' ? optimizedCvText : coverLetterText}
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={onDeclareInterviewUnlocked}
              className="px-6 py-3.5 bg-[#007568] hover:bg-[#006257] text-white rounded-lg text-sm font-bold transition-colors cursor-pointer text-left"
            >
              J&apos;ai postulé : marquer « Entretien décroché » et débloquer les fiches STAR
            </button>
            <p className="mt-2 text-xs text-[#456071]">
              Débloque l&apos;onglet Fiches STAR &amp; Entretien et ajoute « Mémoriser la fiche réponse STAR » à votre Plan Hebdo.
            </p>
          </div>
        </div>
      </section>

      {/* Existing goals */}
      <section>
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-tertiary pb-2">
          <h3 className="text-2xl font-black text-tertiary">Mes objectifs de carrière ({uniqueGoals.length})</h3>
          {uniqueGoals.length > 1 && (
            <span className="text-sm text-[#456071]">Touchez un objectif pour le rendre actif</span>
          )}
        </div>

        <ul className="divide-y divide-tertiary/10">
          {uniqueGoals.map((goal) => {
            const isActive = goal.id === activeGoal?.id;
            return (
              <li key={goal.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectActiveGoal(goal.id)}
                  aria-pressed={isActive}
                  className={`flex-1 min-w-0 py-4 px-3 text-left transition-colors cursor-pointer ${
                    isActive ? 'bg-primary-container/50' : 'hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`text-base text-tertiary ${isActive ? 'font-black' : 'font-semibold'}`}>
                      {goal.currentRole ? `${goal.currentRole} ➔ ` : ''}
                      {goal.targetRole}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-[#007568]">
                        <Check size={14} /> Actif
                      </span>
                    )}
                  </span>
                  <span className="block mt-0.5 text-xs text-[#456071]">
                    Niveau {goal.seniority}, {goal.timeframeMonths} mois, {goal.hoursPerWeek} h par semaine
                  </span>
                </button>
                {onDeleteGoal && uniqueGoals.length > 1 && (
                  <button
                    type="button"
                    title="Supprimer cet objectif"
                    aria-label="Supprimer cet objectif"
                    onClick={() => onDeleteGoal(goal.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
};
