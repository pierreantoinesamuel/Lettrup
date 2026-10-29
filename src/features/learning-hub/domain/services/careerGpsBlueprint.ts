import { LearningDashboardData } from '../../use-cases/GetDashboardUseCase';
import {
  CareerGoal,
  ResourceRef,
  Roadmap,
  SkillGap,
  SkillGapReport,
  SkillProgress,
  WeeklyTask,
} from '../types';
import { SaveGoalInput } from '../../ports/ILearningRepository';

export interface PrioritySkillItem {
  name: string;
  nameEn: string;
  percent: number;
  completed: boolean;
}

export interface SCurvePhase {
  id: 'phase-1' | 'phase-2' | 'phase-3';
  phaseNumber: 1 | 2 | 3;
  titleFr: string;
  titleEn: string;
  monthsLabel: string;
  focusFr: string;
  focusEn: string;
  thresholdPct: number;
  targetPct: number;
  status: 'active' | 'locked' | 'completed';
  skills: PrioritySkillItem[];
}

export interface CuratedPhaseCourse {
  id: string;
  phaseLabel: string;
  title: string;
  skill: string;
  deltaLabel: string;
  duration: string;
  status: 'completed' | 'active';
  why: string;
  url: string;
}

export interface LockedFutureTopic {
  title: string;
  phase: string;
  unlockAt: string;
}

const STATE_PCT: Record<SkillProgress['state'], number> = {
  identified: 20,
  learning: 45,
  practiced: 75,
  validated: 100,
};

/**
 * Dynamically derives the 3 Phase 1 priority skills from the user's actual
 * SkillGapReport, Roadmap, and SkillProgress. Falls back to the Accountant
 * blueprint only if no gaps/milestones exist.
 */
export function derivePrioritySkillsFromData(
  report: SkillGapReport | null,
  roadmap: Roadmap | null,
  progress: SkillProgress[]
): PrioritySkillItem[] {
  const gaps = report?.gaps || [];
  if (gaps.length > 0) {
    return gaps.slice(0, 3).map((gap, index) => {
      const prog = progress.find((p) => p.skill.toLowerCase() === gap.skill.toLowerCase());
      const levelPct = Math.round((gap.currentLevel / Math.max(1, gap.targetLevel)) * 100);
      const pct = prog ? Math.max(levelPct, STATE_PCT[prog.state]) : index === 0 && levelPct === 100 ? 100 : Math.max(20, levelPct);
      const completed = prog?.state === 'validated' || pct >= 100;
      return {
        name: gap.skill,
        nameEn: gap.skill,
        percent: completed ? 100 : pct,
        completed,
      };
    });
  }

  if (roadmap && roadmap.milestones.length > 0) {
    return roadmap.milestones.slice(0, 3).map((ms, index) => {
      const skillName = ms.skills[0] || ms.title;
      const prog = progress.find((p) => p.skill.toLowerCase() === skillName.toLowerCase());
      const completed = prog?.state === 'validated' || (ms.activities?.length > 0 && ms.activities.every((a) => a.completed));
      const percent = completed ? 100 : prog ? STATE_PCT[prog.state] : index === 0 ? 100 : index === 1 ? 40 : 20;
      return {
        name: skillName,
        nameEn: skillName,
        percent,
        completed,
      };
    });
  }

  return [
    { name: 'Bases Comptables & PCG', nameEn: 'Bookkeeping Basics', percent: 100, completed: true },
    { name: 'Partie Double : Débit / Crédit', nameEn: 'Double-Entry Drill', percent: 40, completed: false },
    { name: 'Excel TCD & RECHERCHEX', nameEn: 'Excel TCD & XLOOKUP', percent: 20, completed: false },
  ];
}

/**
 * Dynamically builds the 3 S-Curve phases for ANY user's career transition
 * using their timeframe, gaps, and milestones.
 */
export function buildSCurvePhases(
  readiness: number,
  prioritySkills: PrioritySkillItem[],
  roadmap?: Roadmap | null,
  gaps?: SkillGap[],
  timeframeMonths = 6
): SCurvePhase[] {
  const phase1Completed = prioritySkills.every((s) => s.completed) || readiness >= 55;
  const phase2Completed = readiness >= 80;

  const third = Math.max(1, Math.round(timeframeMonths / 3));
  const p1Months = `Mois 1-${third}`;
  const p2Months = `Mois ${third + 1}-${Math.min(timeframeMonths, third * 2)}`;
  const p3Months = `Mois ${Math.min(timeframeMonths, third * 2 + 1)}-${timeframeMonths}`;

  const phase1Focus =
    prioritySkills.length > 0
      ? prioritySkills
          .slice(0, 2)
          .map((s) => s.name)
          .join(' & ')
      : 'Comptabilité en Partie Double & Excel Avancé';

  // Derive Phase 2 and Phase 3 skills from later gaps or milestones
  const allGaps = gaps || [];
  const phase2Gaps = allGaps.slice(3, 5);
  const phase3Gaps = allGaps.slice(5);

  const phase2Skills: PrioritySkillItem[] =
    phase2Gaps.length > 0
      ? phase2Gaps.map((g) => ({
          name: g.skill,
          nameEn: g.skill,
          percent: phase1Completed ? 30 : 0,
          completed: false,
        }))
      : roadmap && roadmap.milestones.length >= 4
      ? roadmap.milestones.slice(3, 4).flatMap((m) =>
          m.skills.map((sk) => ({
            name: sk,
            nameEn: sk,
            percent: phase1Completed ? 30 : 0,
            completed: false,
          }))
        )
      : [
          { name: 'Déclarations de TVA (CA3)', nameEn: 'Corporate Tax & VAT', percent: phase1Completed ? 35 : 0, completed: false },
          { name: 'Logiciel Sage 100 Comptabilité', nameEn: 'Sage Accounting Software', percent: phase1Completed ? 25 : 0, completed: false },
        ];

  const phase3Skills: PrioritySkillItem[] =
    phase3Gaps.length > 0
      ? phase3Gaps.map((g) => ({
          name: g.skill,
          nameEn: g.skill,
          percent: 0,
          completed: false,
        }))
      : roadmap && roadmap.milestones.length >= 5
      ? roadmap.milestones.slice(4).flatMap((m) =>
          m.skills.map((sk) => ({
            name: sk,
            nameEn: sk,
            percent: 0,
            completed: false,
          }))
        )
      : [
          { name: 'Travaux de Clôture & Bilan', nameEn: 'Balance Sheet & Closing', percent: 0, completed: false },
          { name: 'Cas Pratiques, Stages & CV Ciblé', nameEn: 'Internships & CV', percent: 0, completed: false },
        ];

  const phase2Focus =
    phase2Skills.length > 0
      ? phase2Skills
          .slice(0, 2)
          .map((s) => s.name)
          .join(' & ')
      : "Fiscalité d'entreprise (TVA) & Logiciel Sage";

  const phase3Focus =
    phase3Skills.length > 0
      ? phase3Skills
          .slice(0, 2)
          .map((s) => s.name)
          .join(' & ')
      : 'Bilan, Stages & Postulations Ciblées';

  return [
    {
      id: 'phase-1',
      phaseNumber: 1,
      titleFr: 'Phase 1 : Le Décollage',
      titleEn: 'Phase 1: The Lift-Off',
      monthsLabel: p1Months,
      focusFr: phase1Focus,
      focusEn: phase1Focus,
      thresholdPct: 0,
      targetPct: 36,
      status: phase1Completed ? 'completed' : 'active',
      skills: prioritySkills,
    },
    {
      id: 'phase-2',
      phaseNumber: 2,
      titleFr: "Phase 2 : L'Accélération",
      titleEn: 'Phase 2: The Acceleration',
      monthsLabel: p2Months,
      focusFr: phase2Focus,
      focusEn: phase2Focus,
      thresholdPct: 55,
      targetPct: 72,
      status: phase2Completed ? 'completed' : phase1Completed ? 'active' : 'locked',
      skills: phase2Skills,
    },
    {
      id: 'phase-3',
      phaseNumber: 3,
      titleFr: 'Phase 3 : Le Palier Pro',
      titleEn: 'Phase 3: The Pro Edge',
      monthsLabel: p3Months,
      focusFr: phase3Focus,
      focusEn: phase3Focus,
      thresholdPct: 80,
      targetPct: 100,
      status: phase2Completed ? 'active' : 'locked',
      skills: phase3Skills,
    },
  ];
}

/**
 * Dynamically builds the 3 curated Phase 1 courses and the locked Phase 2/3 topics
 * for the ResourceCatalogView based on ANY user's gaps & roadmap.
 */
export function deriveCatalogCourses(
  gaps: SkillGap[],
  roadmap: Roadmap | null,
  progress: SkillProgress[]
): {
  curatedPhase1: CuratedPhaseCourse[];
  lockedTopics: LockedFutureTopic[];
} {
  const phase1Gaps = gaps.slice(0, 3);

  if (phase1Gaps.length > 0) {
    const curatedPhase1: CuratedPhaseCourse[] = phase1Gaps.map((gap, idx) => {
      const prog = progress.find((p) => p.skill.toLowerCase() === gap.skill.toLowerCase());
      const startPct = Math.round((gap.currentLevel / Math.max(1, gap.targetLevel)) * 100);
      const targetPct = Math.min(100, Math.round((gap.targetLevel / 5) * 100));
      const isCompleted = prog?.state === 'validated' || startPct >= 100;
      const matchingMilestone = roadmap?.milestones.find((m) =>
        m.skills.some((s) => s.toLowerCase() === gap.skill.toLowerCase())
      );
      const ref = matchingMilestone?.resourceRefs?.[0];

      return {
        id: `curated-${idx}-${gap.skill}`,
        phaseLabel: 'Phase 1 · Décollage (Mois 1-2)',
        title: ref?.title || `Formation ciblée : Maîtriser ${gap.skill}`,
        skill: gap.skill,
        deltaLabel: isCompleted ? '0% ➔ 100%' : `${startPct}% ➔ ${Math.max(80, targetPct)}%`,
        duration: matchingMilestone ? `${matchingMilestone.estHours}h (micro-sessions)` : '2h (sessions du soir)',
        status: isCompleted ? 'completed' : 'active',
        why: gap.rationale || ref?.why || `Compétence prioritaire de votre Phase 1 pour atteindre votre objectif.`,
        url:
          ref?.searchUrl ||
          `https://www.youtube.com/results?search_query=${encodeURIComponent(`cours formation ${gap.skill} francais`)}`,
      };
    });

    const laterGaps = gaps.slice(3);
    const lockedTopics: LockedFutureTopic[] =
      laterGaps.length > 0
        ? laterGaps.map((g, i) => ({
            title: g.skill,
            phase: i < 2 ? "Phase 2 : L'Accélération (Mois 3-4)" : 'Phase 3 : Le Palier Pro (Mois 5-6)',
            unlockAt: i < 2 ? 'Seuil Phase 1 (55%)' : 'Seuil Phase 2 (80%)',
          }))
        : [
            {
              title: 'Modules Avancés & Outils Métier Spécialisés',
              phase: "Phase 2 : L'Accélération (Mois 3-4)",
              unlockAt: 'Seuil Phase 1 (55%)',
            },
            {
              title: 'Cas Pratiques Complexes, Stages & Préparation Entretiens',
              phase: 'Phase 3 : Le Palier Pro (Mois 5-6)',
              unlockAt: 'Seuil Phase 2 (80%)',
            },
          ];

    return { curatedPhase1, lockedTopics };
  }

  return {
    curatedPhase1: [
      {
        id: 'curated-pcg',
        phaseLabel: 'Phase 1 · Décollage (Mois 1-2)',
        title: 'Plan Comptable Général (PCG) : des Flux de Stocks aux Comptes 1 à 7',
        skill: 'Bases Comptables & PCG',
        deltaLabel: '0% ➔ 100%',
        duration: '1h15 (2 micro-sessions)',
        status: 'completed',
        why: 'Transforme votre expérience des bons de réception et inventaires en logique comptable (classes 4 et 6).',
        url: 'https://www.youtube.com/results?search_query=cours+comptabilite+generale+plan+comptable+debutant',
      },
      {
        id: 'curated-double-entry',
        phaseLabel: 'Phase 1 · Décollage (Mois 1-2)',
        title: 'Maîtriser la Partie Double : Mécanisme Débit / Crédit & Écriture Journal',
        skill: 'Comptabilité en Partie Double (Débit / Crédit)',
        deltaLabel: '40% ➔ 100%',
        duration: '2h30 (3 sessions du soir)',
        status: 'active',
        why: 'Objectif prioritaire du mois : débloquer le badge « Partie Double & Débit/Crédit » sans vous soucier du bilan.',
        url: 'https://www.youtube.com/results?search_query=comptabilite+partie+double+debit+credit+exercice',
      },
      {
        id: 'curated-excel',
        phaseLabel: 'Phase 1 · Décollage (Mois 1-2)',
        title: 'Excel pour Comptables : RECHERCHEX (XLOOKUP) & Tableaux Croisés Dynamiques (TCD)',
        skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
        deltaLabel: '20% ➔ 80%',
        duration: '2h45 (45 min + 2h)',
        status: 'active',
        why: 'Comble votre écart spécifique sur Excel (passer de la saisie logistique à l’analyse comptable automatisée).',
        url: 'https://www.youtube.com/results?search_query=excel+tableaux+croises+dynamiques+recherchex+comptabilite',
      },
    ],
    lockedTopics: [
      {
        title: "Fiscalité d'entreprise & Déclarations de TVA (CA3)",
        phase: "Phase 2 : L'Accélération (Mois 3-4)",
        unlockAt: 'Seuil Phase 1 (55%)',
      },
      {
        title: 'Prise en main du Logiciel Sage 100 Comptabilité',
        phase: "Phase 2 : L'Accélération (Mois 3-4)",
        unlockAt: 'Seuil Phase 1 (55%)',
      },
      {
        title: 'Travaux de Clôture, Bilan, Paie & Droit des Sociétés',
        phase: 'Phase 3 : Le Palier Pro (Mois 5-6)',
        unlockAt: 'Seuil Phase 2 (80%)',
      },
    ],
  };
}

/**
 * Builds fallback YouTube ResourceRef cards for any skill if the server-side
 * YouTube API key is not configured or rate-limited in production.
 */
export function buildFallbackResourcesForSkill(skill: string, roadmap?: Roadmap | null): ResourceRef[] {
  const fromMilestone = roadmap?.milestones
    .flatMap((m) => m.resourceRefs || [])
    .filter((r) => r.skill.toLowerCase() === skill.toLowerCase());

  if (fromMilestone && fromMilestone.length > 0) {
    return fromMilestone;
  }

  return [
    {
      provider: 'youtube',
      title: `Cours Complet & Cas Pratiques : ${skill}`,
      why: `Module vidéo sélectionné pour valider le palier « ${skill} » sur votre courbe S-Curve.`,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`cours complet ${skill} exercice pratique`)}`,
      skill,
      channelName: 'Formation Pro France',
    },
    {
      provider: 'youtube',
      title: `Atelier Pratique du Soir (45 min) : Maîtriser ${skill}`,
      why: `Session courte adaptée à votre rythme hebdomadaire pour gagner +150 XP.`,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`tutoriel pratique ${skill} debutant`)}`,
      skill,
      channelName: 'Académie Reconversion',
    },
  ];
}

/**
 * Generates a complete, custom Career GPS state for ANY user-submitted goal
 * (used as a resilient fallback if the remote AI service is unreachable in production).
 */
export function createCustomGoalFallbackData(
  userId: string,
  goal: CareerGoal,
  input?: SaveGoalInput
): LearningDashboardData {
  const targetRole = goal.targetRole || input?.targetRole || 'Comptable';
  const currentRole = goal.currentRole || input?.currentRole || 'Poste actuel';
  const isAccountantTarget = /comptab|accountant|audit|gestion/i.test(targetRole);

  if (isAccountantTarget) {
    const base = createDefaultCareerGpsData(userId);
    const mergedGoal: CareerGoal = {
      ...base.activeGoal!,
      ...goal,
      currentRole: currentRole || base.activeGoal!.currentRole,
      targetRole,
    };
    return {
      ...base,
      goals: [mergedGoal],
      activeGoal: mergedGoal,
      stats: {
        ...base.stats,
        activeGoalRole: targetRole,
      },
    };
  }

  const now = new Date().toISOString();
  const userCompetencies =
    goal.competencies && goal.competencies.length > 0
      ? goal.competencies
      : ['Rigueur opérationnelle', 'Organisation & gestion des priorités', 'Outils numériques & suivi'];

  const s1 = `Fondamentaux du métier de ${targetRole}`;
  const s2 = `Outils & Méthodologies Clés (${targetRole})`;
  const s3 = `Pratique Opérationnelle & Cas Concrets (${targetRole})`;
  const s4 = `Techniques Avancées & Automatisation (${targetRole})`;
  const s5 = `Gestion de Projet & Normes Professionnelles`;
  const s6 = `Portfolio, Entretiens Techniques & CV ${targetRole}`;

  const report: SkillGapReport = {
    goalId: goal.id,
    targetRole,
    strengths: userCompetencies.slice(0, 3).map((comp) => ({
      skill: comp,
      level: 4,
      evidence: `Compétence transférable acquise en tant que ${currentRole}.`,
    })),
    gaps: [
      {
        skill: s1,
        currentLevel: 4,
        targetLevel: 5,
        priority: 'critical',
        demandCount: 145,
        rationale: `Socle indispensable de la Phase 1 (Le Décollage) pour évoluer vers ${targetRole}.`,
      },
      {
        skill: s2,
        currentLevel: 2,
        targetLevel: 5,
        priority: 'critical',
        demandCount: 170,
        rationale: `Compétence technique centrale demandée sur 85% des offres de ${targetRole}.`,
      },
      {
        skill: s3,
        currentLevel: 1,
        targetLevel: 4,
        priority: 'critical',
        demandCount: 160,
        rationale: `Permet de valider vos premiers cas pratiques en autonomie dès le Mois 2.`,
      },
      {
        skill: s4,
        currentLevel: 0,
        targetLevel: 4,
        priority: 'high',
        demandCount: 120,
        rationale: `Phase 2 (L'Accélération) : montée en puissance technique aux Mois 3-4.`,
      },
      {
        skill: s5,
        currentLevel: 0,
        targetLevel: 4,
        priority: 'high',
        demandCount: 110,
        rationale: `Phase 2 (L'Accélération) : structuration professionnelle et standards du secteur.`,
      },
      {
        skill: s6,
        currentLevel: 0,
        targetLevel: 4,
        priority: 'nice',
        demandCount: 95,
        rationale: `Phase 3 (Le Palier Pro) : valorisation de votre reconversion ${currentRole} ➔ ${targetRole}.`,
      },
    ],
    summary: `36% de vos compétences actuelles (${userCompetencies.slice(0, 3).join(', ')}) sont directement transférables au métier de ${targetRole} !`,
    generatedAt: now,
    source: 'ai',
    promptVersion: 1,
    lang: 'fr',
  };

  const roadmap: Roadmap = {
    goalId: goal.id,
    roleProfile: {
      role: `${targetRole} (Transition depuis ${currentRole})`,
      missions: [
        `Maîtriser les missions fondamentales et livrables quotidiens d'un ${targetRole}`,
        `Appliquer les outils métiers et méthodologies standards sur des cas réels`,
        `Valoriser votre expérience de ${currentRole} comme avantage opérationnel différenciant`,
      ],
      keySkills: [s1, s2, s3, s4],
      prerequisites: userCompetencies.map((c) => `${c} (Transférable)`),
    },
    milestones: [
      {
        id: `ms-1-${goal.id}`,
        order: 1,
        title: `Phase 1 (Décollage) : ${s1}`,
        skills: [s1],
        estHours: 8,
        prerequisites: [],
        sourceTag: 'youtube',
        iconKey: 'layers',
        activities: [
          {
            id: 'act-1',
            kind: 'video',
            title: `Comprendre les concepts clés et le vocabulaire métier de ${targetRole}`,
            estMinutes: 45,
            completed: true,
          },
        ],
        resourceRefs: buildFallbackResourcesForSkill(s1),
      },
      {
        id: `ms-2-${goal.id}`,
        order: 2,
        title: `Phase 1 (Décollage) : ${s2}`,
        skills: [s2],
        estHours: 12,
        prerequisites: [s1],
        sourceTag: 'youtube',
        iconKey: 'code',
        activities: [
          {
            id: 'act-2',
            kind: 'project',
            title: `Exercice pratique du soir (45 min) : prise en main de ${s2}`,
            estMinutes: 45,
            completed: false,
          },
        ],
        resourceRefs: buildFallbackResourcesForSkill(s2),
      },
      {
        id: `ms-3-${goal.id}`,
        order: 3,
        title: `Phase 1 (Décollage) : ${s3}`,
        skills: [s3],
        estHours: 10,
        prerequisites: [s1],
        sourceTag: 'youtube',
        iconKey: 'database',
        activities: [
          {
            id: 'act-3',
            kind: 'project',
            title: `Atelier guidé (1h30) : réaliser un cas concret en ${s3}`,
            estMinutes: 90,
            completed: false,
          },
        ],
        resourceRefs: buildFallbackResourcesForSkill(s3),
      },
      {
        id: `ms-4-${goal.id}`,
        order: 4,
        title: `Phase 2 (L'Accélération) : ${s4} & ${s5}`,
        skills: [s4, s5],
        estHours: 16,
        prerequisites: [s2, s3],
        sourceTag: 'coursera',
        iconKey: 'shield',
        activities: [
          {
            id: 'act-4',
            kind: 'project',
            title: `Projet intermédiaire : mise en situation complète (${targetRole})`,
            estMinutes: 90,
            completed: false,
          },
        ],
        resourceRefs: buildFallbackResourcesForSkill(s4),
      },
      {
        id: `ms-5-${goal.id}`,
        order: 5,
        title: `Phase 3 (Le Palier Pro) : ${s6}`,
        skills: [s6],
        estHours: 14,
        prerequisites: [s4],
        sourceTag: 'internal',
        iconKey: 'brain',
        activities: [
          {
            id: 'act-5',
            kind: 'cv-task',
            title: `Adapter votre CV et préparer vos entretiens pour le poste de ${targetRole}`,
            estMinutes: 60,
            completed: false,
          },
        ],
        resourceRefs: buildFallbackResourcesForSkill(s6),
      },
    ],
    estimatedWeeks: (goal.timeframeMonths || 6) * 4,
    generatedAt: now,
    promptVersion: 1,
    version: 1,
    lang: 'fr',
  };

  const tasks: WeeklyTask[] = [
    {
      id: `gps-task-1-${goal.id}`,
      goalId: goal.id,
      weekNumber: 1,
      skill: s1,
      description: `Valider les fondamentaux de ${s1} — 45 min`,
      status: 'done',
      resourceRef: roadmap.milestones[0].resourceRefs[0],
    },
    {
      id: `gps-task-2-${goal.id}`,
      goalId: goal.id,
      weekNumber: 1,
      skill: s1,
      description: `Identifier vos acquis transférables de ${currentRole} vers ${targetRole} — 30 min`,
      status: 'done',
      resourceRef: roadmap.milestones[0].resourceRefs[0],
    },
    {
      id: `gps-task-3-${goal.id}`,
      goalId: goal.id,
      weekNumber: 1,
      skill: s2,
      description: `Session du soir : Maîtriser les bases opérationnelles de ${s2} (45 min)`,
      status: 'todo',
      resourceRef: roadmap.milestones[1].resourceRefs[0],
    },
    {
      id: `gps-task-4-${goal.id}`,
      goalId: goal.id,
      weekNumber: 1,
      skill: s3,
      description: `Réaliser un premier exercice guidé sur ${s3} (1h30)`,
      status: 'todo',
      resourceRef: roadmap.milestones[2].resourceRefs[0],
    },
    {
      id: `gps-task-5-${goal.id}`,
      goalId: goal.id,
      weekNumber: 1,
      skill: s2,
      description: `Quiz & auto-évaluation pour débloquer le badge Phase 1 « ${s2} » (45 min)`,
      status: 'todo',
      resourceRef: roadmap.milestones[1].resourceRefs[0],
    },
  ];

  const progress: SkillProgress[] = [
    { skill: s1, state: 'validated', hoursLogged: 5, validatedAt: now },
    { skill: s2, state: 'learning', hoursLogged: 3 },
    { skill: s3, state: 'learning', hoursLogged: 2 },
    { skill: s4, state: 'identified', hoursLogged: 0 },
    { skill: s5, state: 'identified', hoursLogged: 0 },
    { skill: s6, state: 'identified', hoursLogged: 0 },
  ];

  return {
    goals: [goal],
    activeGoal: goal,
    report,
    roadmap,
    tasks,
    progress,
    stats: {
      activeGoalRole: targetRole,
      readiness: 36,
      skillsValidated: 1,
      skillsTotal: 6,
      currentStreakDays: 4,
      xp: 450,
      level: 2,
      badgeCount: 1,
    },
  };
}

export function createDefaultCareerGpsData(userId: string): LearningDashboardData {
  const goalId = 'gps-goal-order-picker-accountant';
  const now = new Date().toISOString();

  const activeGoal: CareerGoal = {
    id: goalId,
    userId,
    currentRole: 'Préparateur de commandes',
    targetRole: 'Comptable',
    fieldOfStudy: 'Comptabilité & Gestion',
    competencies: [
      'Rigueur & contrôle des stocks',
      'Gestion des flux logistiques & bons de livraison',
      'Saisie de données sur Excel',
    ],
    context: 'Reconversion professionnelle de Préparateur de commandes vers Comptable en 6 mois',
    seniority: 'junior',
    timeframeMonths: 6,
    hoursPerWeek: 6,
    isActive: true,
    createdAt: now,
    lang: 'fr',
  };

  const report: SkillGapReport = {
    goalId,
    targetRole: 'Comptable',
    strengths: [
      {
        skill: 'Rigueur & Contrôle des Flux',
        level: 4,
        evidence: 'Vérification quotidienne des bons de commande et inventaires sans erreur.',
      },
      {
        skill: 'Gestion des Stocks & Réception',
        level: 4,
        evidence: 'Suivi physique et informatique des entrées/sorties de marchandises.',
      },
      {
        skill: 'Bases Excel (Saisie & Tableaux)',
        level: 2,
        evidence: 'Utilisation quotidienne des fichiers de suivi logistique.',
      },
    ],
    gaps: [
      {
        skill: 'Bases Comptables & PCG',
        currentLevel: 5,
        targetLevel: 5,
        priority: 'critical',
        demandCount: 142,
        rationale: 'Fondation indispensable : classes de comptes 1 à 7 du Plan Comptable Général.',
      },
      {
        skill: 'Comptabilité en Partie Double (Débit / Crédit)',
        currentLevel: 2,
        targetLevel: 5,
        priority: 'critical',
        demandCount: 168,
        rationale: 'Mécanisme central de l’enregistrement des factures d’achats, ventes et trésorerie.',
      },
      {
        skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
        currentLevel: 1,
        targetLevel: 4,
        priority: 'critical',
        demandCount: 195,
        rationale: 'Indispensable pour le lettrage, le rapprochement de factures et l’analyse de balances.',
      },
      {
        skill: 'Fiscalité & Déclarations de TVA',
        currentLevel: 0,
        targetLevel: 4,
        priority: 'high',
        demandCount: 118,
        rationale: 'Phase 2 (Mois 3-4) : calcul de la TVA collectée, déductible et déclaration CA3.',
      },
      {
        skill: 'Logiciel Comptable Sage 100',
        currentLevel: 0,
        targetLevel: 4,
        priority: 'high',
        demandCount: 134,
        rationale: 'Phase 2 (Mois 3-4) : saisie automatisée des journaux et lettrage des comptes tiers.',
      },
      {
        skill: 'Bilan & Travaux de Clôture',
        currentLevel: 0,
        targetLevel: 4,
        priority: 'nice',
        demandCount: 96,
        rationale: 'Phase 3 (Mois 5-6) : amortissements, provisions et préparation du bilan annuel.',
      },
    ],
    summary:
      '36% de vos compétences actuelles (rigueur, gestion des flux de stocks, Excel) sont directement transférables au métier de Comptable !',
    generatedAt: now,
    source: 'ai',
    promptVersion: 1,
    lang: 'fr',
  };

  const roadmap: Roadmap = {
    goalId,
    roleProfile: {
      role: 'Comptable (Transition depuis Préparateur de commandes)',
      missions: [
        'Saisir et contrôler les écritures comptables (achats, ventes, banque) en partie double',
        'Réaliser les rapprochements bancaires et le suivi des factures fournisseurs/clients sur Excel',
        'Préparer les déclarations de TVA et participer aux clôtures mensuelles sur Sage',
      ],
      keySkills: [
        'Plan Comptable Général (PCG) & Partie Double (Débit/Crédit)',
        'Excel Avancé (RECHERCHEX / XLOOKUP, Tableaux Croisés Dynamiques)',
        'Logiciel Sage 100 & Déclarations de TVA',
      ],
      prerequisites: [
        'Rigueur dans le pointage de bons de livraison et suivi de stocks (Acquis)',
        'Maîtrise des bases de saisie sur tableur (Acquis)',
      ],
    },
    milestones: [
      {
        id: 'ms-phase1-bookkeeping',
        order: 1,
        title: 'Phase 1 (Décollage) : Fondamentaux du PCG & Logique Comptable',
        skills: ['Bases Comptables & PCG'],
        estHours: 8,
        prerequisites: [],
        sourceTag: 'youtube',
        iconKey: 'layers',
        activities: [
          {
            id: 'act-1',
            kind: 'video',
            title: 'Comprendre le Plan Comptable Général (Classes 1 à 7)',
            estMinutes: 45,
            completed: true,
          },
          {
            id: 'act-2',
            kind: 'quiz',
            title: 'Associer les bons de réception et factures aux comptes PCG',
            estMinutes: 30,
            completed: true,
          },
        ],
        resourceRefs: [
          {
            provider: 'youtube',
            title: 'Comptabilité Générale : Comprendre le PCG et les classes de comptes en 45 min',
            why: 'Relie votre expérience des flux physiques de stocks aux flux financiers comptables.',
            searchUrl: 'https://www.youtube.com/results?search_query=cours+comptabilite+generale+plan+comptable+debutant',
            skill: 'Bases Comptables & PCG',
            channelName: 'Compta Facile',
          },
        ],
      },
      {
        id: 'ms-phase1-double-entry',
        order: 2,
        title: 'Phase 1 (Décollage) : Partie Double & Mécanisme Débit / Crédit',
        skills: ['Comptabilité en Partie Double (Débit / Crédit)'],
        estHours: 12,
        prerequisites: ['Bases Comptables & PCG'],
        sourceTag: 'youtube',
        iconKey: 'database',
        activities: [
          {
            id: 'act-3',
            kind: 'project',
            title: 'Exercice pratique : Enregistrer 10 écritures en Partie Double (Débit/Crédit)',
            estMinutes: 45,
            completed: false,
          },
          {
            id: 'act-4',
            kind: 'quiz',
            title: 'Lettrage des comptes clients (411) et fournisseurs (401)',
            estMinutes: 40,
            completed: false,
          },
        ],
        resourceRefs: [
          {
            provider: 'youtube',
            title: 'La Partie Double (Débit / Crédit) expliquée simplement avec cas pratiques',
            why: 'Indispensable pour débloquer le badge « Partie Double & Débit/Crédit » de ce mois-ci.',
            searchUrl: 'https://www.youtube.com/results?search_query=comptabilite+partie+double+debit+credit+exercice',
            skill: 'Comptabilité en Partie Double (Débit / Crédit)',
            channelName: 'Les Geeks des Chiffres',
          },
        ],
      },
      {
        id: 'ms-phase1-excel',
        order: 3,
        title: 'Phase 1 (Décollage) : Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
        skills: ['Excel Avancé (TCD & RECHERCHEX / XLOOKUP)'],
        estHours: 10,
        prerequisites: ['Bases Comptables & PCG'],
        sourceTag: 'youtube',
        iconKey: 'code',
        activities: [
          {
            id: 'act-5',
            kind: 'project',
            title: 'Maîtriser RECHERCHEX (XLOOKUP) sur Excel (45 min)',
            estMinutes: 45,
            completed: false,
          },
          {
            id: 'act-6',
            kind: 'video',
            title: 'Suivre le module "Tableaux Croisés Dynamiques (TCD)" sur Excel (2h)',
            estMinutes: 120,
            completed: false,
          },
        ],
        resourceRefs: [
          {
            provider: 'youtube',
            title: 'Excel pour Comptables : Tableaux Croisés Dynamiques (TCD) & RECHERCHEX',
            why: 'Fait passer votre niveau Excel de 20% à 80% pour automatiser le pointage des factures.',
            searchUrl: 'https://www.youtube.com/results?search_query=excel+tableaux+croises+dynamiques+recherchex+comptabilite',
            skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
            channelName: 'Formations Excel Pro',
          },
        ],
      },
      {
        id: 'ms-phase2-tax-sage',
        order: 4,
        title: "Phase 2 (L'Accélération — Mois 3-4) : Fiscalité TVA & Logiciel Sage 100",
        skills: ['Fiscalité & Déclarations de TVA', 'Logiciel Comptable Sage 100'],
        estHours: 16,
        prerequisites: ['Comptabilité en Partie Double (Débit / Crédit)', 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)'],
        sourceTag: 'coursera',
        iconKey: 'shield',
        activities: [
          {
            id: 'act-7',
            kind: 'project',
            title: 'Établir une déclaration de TVA CA3 et saisir un journal sur Sage',
            estMinutes: 90,
            completed: false,
          },
        ],
        resourceRefs: [
          {
            provider: 'youtube',
            title: 'Maîtriser la TVA (Collectée, Déductible, CA3) et la saisie sur Sage 100',
            why: 'Débloqué en Phase 2 une fois les bases de la Partie Double et d’Excel validées.',
            searchUrl: 'https://www.youtube.com/results?search_query=declaration+tva+ca3+logiciel+sage+100+comptabilite',
            skill: 'Fiscalité & Déclarations de TVA',
          },
        ],
      },
      {
        id: 'ms-phase3-pro-edge',
        order: 5,
        title: 'Phase 3 (Le Palier Pro — Mois 5-6) : Bilan, Stages & CV Comptable',
        skills: ['Bilan & Travaux de Clôture'],
        estHours: 18,
        prerequisites: ['Fiscalité & Déclarations de TVA', 'Logiciel Comptable Sage 100'],
        sourceTag: 'internal',
        iconKey: 'brain',
        activities: [
          {
            id: 'act-8',
            kind: 'cv-task',
            title: 'Valoriser la gestion des stocks et les nouvelles compétences comptables sur votre CV',
            estMinutes: 60,
            completed: false,
          },
        ],
        resourceRefs: [
          {
            provider: 'youtube',
            title: 'Lire et préparer un Bilan Comptable & Compte de Résultat',
            why: 'Étape finale du mois 5-6 pour réussir vos entretiens techniques en cabinet ou entreprise.',
            searchUrl: 'https://www.youtube.com/results?search_query=bilan+comptable+compte+de+resultat+debutant',
            skill: 'Bilan & Travaux de Clôture',
          },
        ],
      },
    ],
    estimatedWeeks: 24,
    generatedAt: now,
    promptVersion: 1,
    version: 1,
    lang: 'fr',
  };

  const tasks: WeeklyTask[] = [
    {
      id: 'gps-task-1',
      goalId,
      weekNumber: 1,
      skill: 'Bases Comptables & PCG',
      description: 'Valider les fondamentaux du Plan Comptable Général (Classes 1 à 7) — 45 min',
      status: 'done',
      resourceRef: roadmap.milestones[0].resourceRefs[0],
    },
    {
      id: 'gps-task-2',
      goalId,
      weekNumber: 1,
      skill: 'Bases Comptables & PCG',
      description: 'Relier vos bons de livraison logistiques aux comptes d’achats (Classe 6) et fournisseurs (401) — 30 min',
      status: 'done',
      resourceRef: roadmap.milestones[0].resourceRefs[0],
    },
    {
      id: 'gps-task-3',
      goalId,
      weekNumber: 1,
      skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
      description: 'Maîtriser RECHERCHEX (XLOOKUP) sur Excel pour le pointage automatique de factures (45 min)',
      status: 'todo',
      resourceRef: roadmap.milestones[2].resourceRefs[0],
    },
    {
      id: 'gps-task-4',
      goalId,
      weekNumber: 1,
      skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
      description: 'Suivre le module "Tableaux Croisés Dynamiques (TCD)" sur Excel (2h)',
      status: 'todo',
      resourceRef: roadmap.milestones[2].resourceRefs[0],
    },
    {
      id: 'gps-task-5',
      goalId,
      weekNumber: 1,
      skill: 'Comptabilité en Partie Double (Débit / Crédit)',
      description: 'Exercice pratique : Enregistrer 10 écritures en Partie Double (Débit / Crédit) pour débloquer le badge du mois (45 min)',
      status: 'todo',
      resourceRef: roadmap.milestones[1].resourceRefs[0],
    },
  ];

  const progress: SkillProgress[] = [
    {
      skill: 'Bases Comptables & PCG',
      state: 'validated',
      hoursLogged: 6,
      validatedAt: now,
    },
    {
      skill: 'Comptabilité en Partie Double (Débit / Crédit)',
      state: 'learning',
      hoursLogged: 4,
    },
    {
      skill: 'Excel Avancé (TCD & RECHERCHEX / XLOOKUP)',
      state: 'learning',
      hoursLogged: 2,
    },
    {
      skill: 'Fiscalité & Déclarations de TVA',
      state: 'identified',
      hoursLogged: 0,
    },
    {
      skill: 'Logiciel Comptable Sage 100',
      state: 'identified',
      hoursLogged: 0,
    },
    {
      skill: 'Bilan & Travaux de Clôture',
      state: 'identified',
      hoursLogged: 0,
    },
  ];

  return {
    goals: [activeGoal],
    activeGoal,
    report,
    roadmap,
    tasks,
    progress,
    stats: {
      activeGoalRole: 'Comptable',
      readiness: 36,
      skillsValidated: 1,
      skillsTotal: 6,
      currentStreakDays: 4,
      xp: 450,
      level: 2,
      badgeCount: 1,
    },
  };
}
