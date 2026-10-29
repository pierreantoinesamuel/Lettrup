import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Copy,
  Check,
  Volume2,
  Download,
  CheckCircle2,
  ExternalLink,
  ArrowUpRight,
  Bookmark,
} from 'lucide-react';

export interface JobApplicationPipelineState {
  jobUrl: string;
  companyName: string;
  jobTitle: string;
  sourcePlatform: string;
  analyzedAt: string;
  interviewUnlocked: boolean;
  interviewConfidenceScore: number;
  practicedQuestionsCount: number;
}

export interface EntretienToolViewProps {
  currentRole: string;
  targetRole: string;
  readiness: number;
  pipeline: JobApplicationPipelineState;
  onPracticeComplete: (xpEarned: number, confidenceBoost: number) => void;
  onGoToJobFactory: () => void;
  onNavigateToInterviewSimulator?: () => void;
}

export interface StarFlashcardItem {
  id: string;
  category: string;
  title: string;
  recruiterContext: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  sampleAnswer: string;
}

export const EntretienToolView: React.FC<EntretienToolViewProps> = ({
  currentRole,
  targetRole,
  readiness: _readiness,
  pipeline,
  onPracticeComplete,
  onGoToJobFactory,
  onNavigateToInterviewSimulator,
}) => {
  const [, setSearchParams] = useSearchParams();
  const [activeMode, setActiveMode] = useState<'career' | 'job-post'>('career');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('star-anomaly-prevention');
  const [activeCardLetter, setActiveCardLetter] = useState<'S' | 'T' | 'A' | 'R' | null>('S');
  const [copied, setCopied] = useState(false);
  const [memorizedMap, setMemorizedMap] = useState<Record<string, boolean>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Custom Job Post Overrides
  const [customCompany, setCustomCompany] = useState(pipeline.companyName || 'Cabinet & PME Partenaire');
  const [customJobTitle, setCustomJobTitle] = useState(pipeline.jobTitle || `${targetRole} Junior (H/F)`);

  const effectiveCurrentRole = currentRole || 'Préparateur de commandes';
  const effectiveTargetRole = targetRole || 'COMPTABLE';

  // 1. STAR Scenarios for Mode "Objectif Carrière" (Transition globale)
  const careerScenarios: StarFlashcardItem[] = [
    {
      id: 'star-anomaly-prevention',
      category: 'Rigueur & Détection d’Écarts',
      title: 'Contrôle Documentaire & Détection d’Anomalies Chiffrées',
      recruiterContext: `« Racontez-moi une situation où votre rigueur a permis d'éviter une anomalie financière ou opérationnelle. »`,
      situation: `Lors d'une réception fournisseur importante en tant que ${effectiveCurrentRole}, le bon de livraison affichait 240 unités facturées.`,
      task: `Vérifier la conformité physique et documentaire avant validation dans le système et empêcher tout paiement indu ou écriture erronée.`,
      action: `En croisant rigoureusement les références sur Excel (RECHERCHEX / TCD) et en appliquant la rigueur du contrôle de flux, j'ai repéré un doublon de ligne et un écart de conditionnement de 40 unités avant que la facture ne parte en paiement.`,
      result: `Économie directe de plusieurs milliers d'euros d'avoirs fournisseurs, 0% d'écart toléré et création d'une procédure de double-contrôle directement transférable au lettrage et au rapprochement bancaire.`,
      sampleAnswer: `« Lors d'un contrôle de réception, j'ai détecté sur Excel un écart entre le bon de commande initial et le bon de livraison fournisseur avant sa validation. Cette habitude de ne jamais valider un chiffre sans pièce justificative est exactement celle que j'apporte pour le rapprochement bancaire et le contrôle des factures fournisseurs. »`,
    },
    {
      id: 'star-career-pivot-trust',
      category: 'Légitimité & Confiance Reconversion',
      title: 'Transposer la Gestion des Flux Physiques vers les Flux Financiers',
      recruiterContext: `« Vous étiez ${effectiveCurrentRole.toLowerCase()}, pourquoi devrions-nous vous faire confiance sur la tenue de nos comptes et la clôture de nos bilans ? »`,
      situation: `En logistique en tant que ${effectiveCurrentRole}, je gérais quotidiennement des centaines de mouvements physiques et d'inventaires où chaque article a une valeur chiffrée.`,
      task: `Prouver que la discipline d'inventaire et la fiabilité documentaire sont les mêmes fondations que la comptabilité d'entreprise.`,
      action: `J'ai validé le Plan Comptable Général (Classes 1 à 7), la Partie Double (Débit/Crédit) et la modélisation sur Excel pour traduire immédiatement chaque opération en écriture juste.`,
      result: `Zéro anomalie de stock sur mes 12 derniers mois et une capacité démontrée à lettrer les comptes fournisseurs (401) et clients (411) sans confusion dès le premier jour.`,
      sampleAnswer: `« En logistique comme en comptabilité, une erreur de saisie se traduit immédiatement par un écart financier. Mon métier de ${effectiveCurrentRole.toLowerCase()} m'a inculqué une intolérance totale à l'écart non justifié. En y ajoutant ma maîtrise de la partie double et du PCG, je sécurise la saisie de vos journaux dès ma prise de poste. »`,
    },
    {
      id: 'star-scurve-acceleration',
      category: 'Courbe d’Apprentissage S-Curve',
      title: 'Montée en Compétences Rapide & Autonomie Immédiate',
      recruiterContext: `« Vous n'avez pas 5 ans d'expérience classique en cabinet. Comment garantissez-vous d'être rentable dès la première semaine ? »`,
      situation: `Une PME ou un cabinet a besoin de collaborateurs capables de saisir, vérifier et lettrer sans mobiliser un responsable à chaque ligne.`,
      task: `Sécuriser la saisie des opérations courantes (Achats, Ventes, Rapprochements bancaires) pour soulager immédiatement les profils seniors.`,
      action: `Grâce à mon parcours S-Curve structuré, mes socles techniques fondamentaux (PCG, lettrage, TVA, Excel avancé) sont validés par des études de cas pratiques.`,
      result: `Prise en charge autonome des tâches répétitives dès J+1, me permettant de monter en autonomie sur vos logiciels internes sans ralentir l'équipe.`,
      sampleAnswer: `« Ce qui prend du temps aux seniors, ce n'est pas d'expliquer le logiciel, c'est de corriger des erreurs d'imputation élémentaires. Mes bases en partie double et sur tableur sont solides et vérifiées. Je suis opérationnel sur le traitement courant dès le jour 1, tout en continuant à enrichir mes compétences sur vos outils spécifiques. »`,
    },
  ];

  // 2. STAR Scenarios for Mode "Offre d'Emploi" (Job Post ciblé)
  const jobPostScenarios: StarFlashcardItem[] = [
    {
      id: 'star-job-custom-match',
      category: `Offre Spécifique · ${customCompany}`,
      title: `Adéquation Directe au Poste de ${customJobTitle}`,
      recruiterContext: `« Pourquoi postulez-vous spécifiquement chez ${customCompany} pour ce poste de ${customJobTitle} ? »`,
      situation: `L'offre d'emploi publiée par ${customCompany} insiste sur la précision de saisie, le sens du détail et la fiabilité sous contrainte de délais de clôture.`,
      task: `Démontrer que mon profil hybride (${effectiveCurrentRole} ➔ ${effectiveTargetRole}) répond exactement aux exigences de ce poste.`,
      action: `J'ai analysé les exigences de votre offre et structuré mes acquis pour répondre immédiatement aux besoins de facturation, de lettrage et de contrôle de pièces.`,
      result: `Un collaborateur motivé, déjà rodé aux cadences opérationnelles et rigoureusement formé aux normes comptables attendues par ${customCompany}.`,
      sampleAnswer: `« Votre offre chez ${customCompany} recherche un profil capable de garantir une fiabilité absolue sur le traitement des écritures. En tant qu'ancien ${effectiveCurrentRole.toLowerCase()}, j'ai toujours eu pour règle d'or de vérifier la concordance entre pièce physique et système. C'est cette vigilance concrète que j'apporte à votre équipe comptable. »`,
    },
    {
      id: 'star-software-tva-gap',
      category: `Écart Technique · Logiciels & Outils`,
      title: `Compensation de l'Écart Logiciel (Sage / ERP & TVA)`,
      recruiterContext: `« Votre profil mentionne encore un écart sur certains logiciels de gestion ou de télédéclaration. Comment allez-vous combler ce besoin ? »`,
      situation: `L'offre chez ${customCompany} demande la pratique d'outils comme Sage ou un ERP de gestion financière.`,
      task: `Démontrer qu'un logiciel n'est qu'une interface et que la maîtrise conceptuelle des journaux et de la logique Débit/Crédit est déjà acquise.`,
      action: `Je maîtrise les fondations universelles du PCG et les fonctions clés d'Excel (RECHERCHEX, TCD), et je consacre plusieurs heures par semaine à l'apprentissage ciblé de l'outil.`,
      result: `Capacité à naviguer et saisir dans votre environnement dès ma première semaine sans hésiter sur les imputations de comptes ou les ventilations de TVA.`,
      sampleAnswer: `« L'interface d'un logiciel s'apprend en quelques jours dès lors qu'on comprend parfaitement ce qui se passe derrière chaque écriture. J'ai validé la mécanique de la partie double et la fiscalité de base. Je suis immédiatement autonome sur la saisie et je maîtrise vos raccourcis logiciels en moins de deux semaines. »`,
    },
  ];

  const activeScenarios = activeMode === 'career' ? careerScenarios : jobPostScenarios;
  const currentScenario =
    activeScenarios.find((s) => s.id === selectedScenarioId) || activeScenarios[0];

  const isCurrentMemorized = Boolean(memorizedMap[currentScenario.id]);

  const handleCopyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(currentScenario.sampleAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleSpeakAnswer = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentScenario.sampleAnswer);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadCard = () => {
    const text = `====================================================================
FICHE RÉPONSE & FLASHCARD STAR — ${currentScenario.title.toUpperCase()}
Mode : ${activeMode === 'career' ? 'OBJECTIF CARRIÈRE' : `OFFRE D'EMPLOI (${customCompany.toUpperCase()})`}
Contexte : ${effectiveCurrentRole} ➔ ${effectiveTargetRole}
====================================================================

QUESTION DU RECRUTEUR :
${currentScenario.recruiterContext}

STRUCTURE DE RÉPONSE (MÉTHODE S.T.A.R.) :
• [S] Situation (Votre contexte de départ) :
  ${currentScenario.situation}

• [T] Tâche (L'exigence critique) :
  ${currentScenario.task}

• [A] Action (Votre compétence S-Curve) :
  ${currentScenario.action}

• [R] Résultat (La preuve mesurable) :
  ${currentScenario.result}

RÉPONSE CLÉ-EN-MAIN À MÉMORISER :
${currentScenario.sampleAnswer}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fiche_STAR_${currentScenario.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleMemorized = () => {
    const nextState = !isCurrentMemorized;
    setMemorizedMap((prev) => ({
      ...prev,
      [currentScenario.id]: nextState,
    }));

    if (nextState) {
      onPracticeComplete(150, 10);
    }
  };

  const handleGoToNavbarInterview = () => {
    if (onNavigateToInterviewSimulator) {
      onNavigateToInterviewSimulator();
    } else {
      setSearchParams({ tab: 'interview' });
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Heading, mode switch and the link out to the voice simulator */}
      <header className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
              Fiches réponse, méthode STAR
            </h2>
            <p className="mt-2 text-sm text-[#456071] max-w-2xl leading-relaxed">
              Préparez des réponses structurées pour {effectiveCurrentRole} ➔ {effectiveTargetRole}. Pour vous entraîner avec le micro, le simulateur vocal est dans le menu latéral.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoToNavbarInterview}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary cursor-pointer self-start lg:self-auto"
          >
            Ouvrir le simulateur d&apos;entretien <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div role="tablist" aria-label="Mode de préparation" className="flex gap-6 border-b border-tertiary/15">
          {([
            { id: 'career', label: 'Reconversion', sub: `${effectiveCurrentRole} ➔ ${effectiveTargetRole}` },
            { id: 'job-post', label: 'Offre d’emploi', sub: customCompany },
          ] as const).map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveMode(mode.id);
                  setSelectedScenarioId(
                    mode.id === 'career' ? careerScenarios[0].id : jobPostScenarios[0].id
                  );
                }}
                className={`-mb-px pb-3 text-left border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-tertiary text-tertiary'
                    : 'border-transparent text-[#456071] hover:text-tertiary'
                }`}
              >
                <span className="block text-base font-black">{mode.label}</span>
                <span className="block text-xs">{mode.sub}</span>
              </button>
            );
          })}
        </div>
      </header>

      {activeMode === 'job-post' && (
        <section aria-label="Paramètres de l'offre">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-xl font-black text-tertiary">L&apos;offre visée</h3>
            {pipeline.jobUrl && (
              <a
                href={pipeline.jobUrl.startsWith('http') ? pipeline.jobUrl : `https://${pipeline.jobUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary inline-flex items-center gap-1"
              >
                Lien source ({pipeline.sourcePlatform}) <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise ou cabinet recruteur</label>
              <input
                type="text"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                placeholder="ex : Cabinet Fiduciaire Horizon"
                className="w-full text-sm font-medium px-3 py-2.5 rounded-lg border border-tertiary/20 bg-white text-tertiary focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé exact du poste</label>
              <input
                type="text"
                value={customJobTitle}
                onChange={(e) => setCustomJobTitle(e.target.value)}
                placeholder="ex : Comptable Fournisseurs Junior (H/F)"
                className="w-full text-sm font-medium px-3 py-2.5 rounded-lg border border-tertiary/20 bg-white text-tertiary focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20"
              />
            </div>
          </div>
        </section>
      )}

      {/* Scenario picker: a plain numbered list, not a row of pills */}
      <section aria-label="Thèmes d'argumentation">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xl font-black text-tertiary">Choisissez un thème</h3>
          <span className="text-sm text-[#456071]">{activeScenarios.length} scénarios</span>
        </div>
        <ol className="divide-y divide-tertiary/10 border-y border-tertiary/10">
          {activeScenarios.map((sc, idx) => {
            const isSelected = sc.id === currentScenario.id;
            const isMem = Boolean(memorizedMap[sc.id]);
            return (
              <li key={sc.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setActiveCardLetter('S');
                  }}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`w-full flex items-baseline gap-4 py-3 px-2 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-container/50' : 'hover:bg-white'
                  }`}
                >
                  <span className="w-6 text-sm font-black tabular-nums text-[#007568]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-base text-tertiary ${isSelected ? 'font-black' : 'font-semibold'}`}>
                      {sc.title}
                    </span>
                    <span className="block text-xs text-[#456071]">{sc.category}</span>
                  </span>
                  {isMem && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#007568]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mémorisé
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The recruiter's question: the one dark surface on this tab */}
      <section className="bg-tertiary text-white rounded-lg p-6 sm:p-8" aria-label="Question du recruteur">
        <p className="text-sm font-semibold text-accent">
          Question du recruteur · {activeMode === 'career' ? 'reconversion' : customCompany}
        </p>
        <p className="mt-3 text-xl sm:text-2xl font-black leading-snug">
          {currentScenario.recruiterContext}
        </p>
      </section>

      {/* STAR answer sheet */}
      <section className="space-y-6" aria-label="Fiche réponse STAR">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-tertiary">Structurez votre réponse</h3>
            <p className="mt-1 text-sm text-[#456071]">
              Touchez une étape pour la mettre en avant, puis mémorisez la fiche.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={handleSpeakAnswer}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-tertiary underline underline-offset-4 hover:text-[#007568] cursor-pointer"
              title="Écouter la réponse avec la synthèse vocale"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isPlayingAudio ? 'Arrêter la lecture' : 'Écouter'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCard}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-tertiary underline underline-offset-4 hover:text-[#007568] cursor-pointer"
              title="Télécharger cette fiche en .txt"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger</span>
            </button>
            <button
              type="button"
              onClick={handleToggleMemorized}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isCurrentMemorized
                  ? 'bg-[#007568] text-white'
                  : 'bg-tertiary text-white hover:bg-[#093b50]'
              }`}
            >
              {isCurrentMemorized ? (
                <>
                  <Check className="w-4 h-4" /> Fiche mémorisée (+150 XP)
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" /> Marquer comme mémorisée
                </>
              )}
            </button>
          </div>
        </div>

        {/* S, T, A, R: one color, the letter does the work */}
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {[
            { letter: 'S' as const, label: 'Situation', hint: 'votre contexte de départ', content: currentScenario.situation },
            { letter: 'T' as const, label: 'Tâche', hint: 'l’exigence critique', content: currentScenario.task },
            { letter: 'A' as const, label: 'Action', hint: 'votre compétence', content: currentScenario.action },
            { letter: 'R' as const, label: 'Résultat', hint: 'la preuve mesurable', content: currentScenario.result },
          ].map((card) => {
            const isSelected = activeCardLetter === card.letter;
            return (
              <div key={card.letter} className="border-t-2 border-tertiary/15">
                <button
                  type="button"
                  onClick={() => setActiveCardLetter(isSelected ? null : card.letter)}
                  aria-pressed={isSelected}
                  className={`w-full text-left py-4 px-2 flex gap-4 transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-container/50' : 'hover:bg-white'
                  }`}
                >
                  <span className="text-5xl font-black leading-none text-[#007568] w-10 shrink-0">{card.letter}</span>
                  <span className="min-w-0">
                    <dt className="text-sm font-black text-tertiary">
                      {card.label} <span className="font-medium text-[#456071]">({card.hint})</span>
                    </dt>
                    <dd className="mt-1 text-sm text-[#244354] leading-relaxed">{card.content}</dd>
                  </span>
                </button>
              </div>
            );
          })}
        </dl>

        {/* Ready-to-learn answer */}
        <div className="bg-primary-container/60 rounded-lg p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h4 className="text-xl font-black text-tertiary">Réponse à mémoriser</h4>
            <button
              type="button"
              onClick={handleCopyAnswer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-sm font-bold text-tertiary hover:bg-tertiary hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copié
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copier la réponse
                </>
              )}
            </button>
          </div>
          <p className="text-base sm:text-lg text-tertiary leading-relaxed">{currentScenario.sampleAnswer}</p>
          <p className="mt-4 text-sm text-[#456071]">
            Récitez cette réponse trois fois à voix haute pour ancrer vos réflexes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#456071]">
          <span>Pour un autre poste, ajustez vos objectifs dans l&apos;Usine CV.</span>
          <button
            type="button"
            onClick={onGoToJobFactory}
            className="shrink-0 inline-flex items-center gap-1.5 font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary cursor-pointer self-start sm:self-auto"
          >
            Usine CV et lettre IA <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
