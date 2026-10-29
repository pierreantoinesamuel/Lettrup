import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Compass,
  Calendar,
  BookOpen,
  Award,
  Layers3,
  RefreshCw,
  Navigation,
  Mic,
  Lightbulb,
} from 'lucide-react';
import { SupabaseLearningRepository } from '../infrastructure/SupabaseLearningRepository';
import { RemoteLearningAIAdapter } from '../infrastructure/RemoteLearningAIAdapter';
import { GetDashboardUseCase, LearningDashboardData } from '../use-cases/GetDashboardUseCase';
import { CreateSetGoalUseCase } from '../use-cases/CreateSetGoalUseCase';
import { AnalyzeSkillGapUseCase } from '../use-cases/AnalyzeSkillGapUseCase';
import { GenerateRoadmapUseCase } from '../use-cases/GenerateRoadmapUseCase';
import { UpdateProgressUseCase } from '../use-cases/UpdateProgressUseCase';

import { LearningHubDashboard } from './LearningHubDashboard';
import { ParcoursDeFormation } from './ParcoursDeFormation';
import type { GoalExtras } from './CareerGoalsDefinitionCard';
import { CareerGoalsView } from './CareerGoalsView';
import { WeeklyPlanView } from './WeeklyPlanView';
import { ResourceCatalogView } from './ResourceCatalogView';
import { ProgressAnalyticsView } from './ProgressAnalyticsView';
import { EntretienToolView, JobApplicationPipelineState } from './EntretienToolView';
import { SaveGoalInput } from '../ports/ILearningRepository';
import { useAuth } from '../../../contexts/AuthContext';
import { listUserResumes } from '../../../lib/resumeStore';
import { adaptResumeDataToProfile } from '../../../lib/resumeAdapter';
import { resolvePrimaryResume } from '../../../domain/user/PrimaryResume';
import { CareerGoal, SkillLevel, WeeklyTask } from '../domain/types';
import {
  createCustomGoalFallbackData,
  createDefaultCareerGpsData,
  derivePrioritySkillsFromData,
  PrioritySkillItem,
} from '../domain/services/careerGpsBlueprint';

const repo = new SupabaseLearningRepository();
const aiAdapter = new RemoteLearningAIAdapter();

const getDashboardUC = new GetDashboardUseCase(repo);
const createSetGoalUC = new CreateSetGoalUseCase(repo);
const analyzeGapUC = new AnalyzeSkillGapUseCase(repo, aiAdapter);
const generateRoadmapUC = new GenerateRoadmapUseCase(repo, aiAdapter);
const updateProgressUC = new UpdateProgressUseCase(repo);
const loadLearningResources = (skill: string, targetLevel: SkillLevel) =>
  aiAdapter.recommendResources(skill, targetLevel, 'fr');

export type LearningHubTab =
  | 'dashboard'
  | 'parcours'
  | 'goals'
  | 'tasks'
  | 'resources'
  | 'progress'
  | 'entretien';

const DEFAULT_PRIORITY_SKILLS: PrioritySkillItem[] = [
  { name: 'Bases Comptables (PCG)', nameEn: 'Bookkeeping Basics', percent: 100, completed: true },
  { name: 'Partie Double : Débit / Crédit', nameEn: 'Double-Entry Drill', percent: 40, completed: false },
  { name: 'Excel TCD & RECHERCHEX', nameEn: 'Excel TCD & XLOOKUP', percent: 20, completed: false },
];

function parseJobLinkMetadata(
  rawUrl: string,
  targetRole: string
): Pick<JobApplicationPipelineState, 'jobUrl' | 'companyName' | 'jobTitle' | 'sourcePlatform'> {
  const lower = rawUrl.toLowerCase();
  const sourcePlatform = lower.includes('linkedin')
    ? 'LinkedIn'
    : lower.includes('francetravail') || lower.includes('pole-emploi')
    ? 'France Travail'
    : lower.includes('indigo')
    ? 'Indigo Careers'
    : lower.includes('indeed')
    ? 'Indeed'
    : 'Offre Web';

  const companyName = lower.includes('indigo')
    ? 'Groupe Indigo'
    : lower.includes('cabinet')
    ? 'Cabinet Fiduciaire Horizon'
    : lower.includes('linkedin')
    ? 'PME Logistique & Finance'
    : 'Cabinet & PME Partenaire';

  return {
    jobUrl: rawUrl,
    companyName,
    jobTitle: `${targetRole} Junior (H/F)`,
    sourcePlatform,
  };
}

export const LearningHubView: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<LearningHubTab>('dashboard');
  const [data, setData] = useState<LearningDashboardData | null>(null);
  const [prioritySkills, setPrioritySkills] = useState<PrioritySkillItem[]>(DEFAULT_PRIORITY_SKILLS);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [jobPipeline, setJobPipeline] = useState<JobApplicationPipelineState>({
    jobUrl: 'https://candidat.francetravail.fr/offres/recherche/detail/comptable-junior-sage-pme',
    companyName: 'Cabinet & PME Partenaire',
    jobTitle: 'Comptable Junior (H/F)',
    sourcePlatform: 'France Travail',
    analyzedAt: new Date().toISOString(),
    interviewUnlocked: false,
    interviewConfidenceScore: 42,
    practicedQuestionsCount: 0,
  });

  const userId = user?.id;

  const applyDashboardData = (nextData: LearningDashboardData) => {
    setData(nextData);
    setPrioritySkills(
      derivePrioritySkillsFromData(nextData.report, nextData.roadmap, nextData.progress)
    );
    const role = nextData.activeGoal?.targetRole || 'Comptable';
    setJobPipeline((prev) => ({
      ...prev,
      jobTitle: `${role} Junior (H/F)`,
    }));
  };

  const loadData = async () => {
    const effectiveUserId = userId || 'gps-demo-user';
    setLoading(true);
    try {
      if (userId) {
        const res = await getDashboardUC.execute(userId);
        if (res.activeGoal && res.roadmap) {
          applyDashboardData(res);
          return;
        }
        if (res.activeGoal && !res.roadmap) {
          const fallbackForGoal = createCustomGoalFallbackData(userId, res.activeGoal);
          applyDashboardData({
            ...fallbackForGoal,
            goals: res.goals.length > 0 ? res.goals : fallbackForGoal.goals,
          });
          return;
        }
      }
      applyDashboardData(createDefaultCareerGpsData(effectiveUserId));
    } catch (e) {
      console.error('Failed to load learning hub data, using Career GPS blueprint:', e);
      applyDashboardData(createDefaultCareerGpsData(effectiveUserId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  const handleResetToCareerGpsPreset = () => {
    const effectiveUserId = userId || 'gps-demo-user';
    applyDashboardData(createDefaultCareerGpsData(effectiveUserId));
  };

  const handleSubmitJobLink = (jobUrl: string) => {
    const role = data?.activeGoal?.targetRole || 'Comptable';
    const meta = parseJobLinkMetadata(jobUrl, role);
    setJobPipeline((prev) => ({
      ...prev,
      ...meta,
      analyzedAt: new Date().toISOString(),
    }));
    setActiveTab('goals');
  };

  const handleDeclareInterviewUnlocked = () => {
    setJobPipeline((prev) => ({
      ...prev,
      interviewUnlocked: true,
    }));

    // Dynamically inject "Pratiquer 15 mins de Pitch Entretien" into Plan Hebdo
    setData((prev) => {
      if (!prev) return prev;
      const interviewTaskId = 'gps-task-interview-pitch';
      const alreadyExists = prev.tasks.some((t) => t.id === interviewTaskId);
      if (alreadyExists) return prev;

      const interviewTask: WeeklyTask = {
        id: interviewTaskId,
        goalId: prev.activeGoal?.id || 'gps-goal-order-picker-accountant',
        weekNumber: 1,
        skill: `Fiches STAR & Entretien (${jobPipeline.companyName})`,
        description: `💡 Mémoriser la Fiche Réponse STAR : argumenter votre transition ${
          prev.activeGoal?.currentRole || 'Préparateur de commandes'
        } ➔ ${prev.activeGoal?.targetRole || 'Comptable'}`,
        status: 'todo',
      };

      return {
        ...prev,
        tasks: [interviewTask, ...prev.tasks],
      };
    });

    setActiveTab('entretien');
  };

  const handleInterviewPracticeComplete = (xpEarned: number, confidenceBoost: number) => {
    setJobPipeline((prev) => ({
      ...prev,
      interviewConfidenceScore: Math.min(100, prev.interviewConfidenceScore + confidenceBoost),
      practicedQuestionsCount: prev.practicedQuestionsCount + 1,
    }));

    setData((prev) => {
      if (!prev) return prev;
      const nextXp = prev.stats.xp + xpEarned;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          xp: nextXp,
          level: Math.max(1, Math.floor(nextXp / 250) + 1),
          readiness: Math.min(100, prev.stats.readiness + 2),
        },
      };
    });
  };

  const handleTogglePrioritySkill = (skillName: string) => {
    setPrioritySkills((prev) => {
      const next = prev.map((s) => {
        if (s.name !== skillName) return s;
        const nextCompleted = !s.completed;
        return {
          ...s,
          completed: nextCompleted,
          percent: nextCompleted ? 100 : s.name.includes('Partie Double') ? 40 : 25,
        };
      });

      const completedCount = next.filter((s) => s.completed).length;
      const newReadiness = Math.min(100, 30 + completedCount * 8);
      setData((curr) =>
        curr
          ? {
              ...curr,
              stats: {
                ...curr.stats,
                readiness: Math.max(curr.stats.readiness, newReadiness),
                xp: curr.stats.xp + 150,
              },
            }
          : curr
      );
      return next;
    });
  };

  const handleSaveGoal = async (input: SaveGoalInput, shouldSwitchTab: boolean = true) => {
    const effectiveUserId = userId || 'gps-demo-user';
    setAnalyzing(true);
    let savedGoal: CareerGoal | null = null;

    try {
      if (userId) {
        savedGoal = await createSetGoalUC.execute(userId, input);
        const resumes = await listUserResumes(userId);
        const primaryProfile = resolvePrimaryResume(resumes)
          ? adaptResumeDataToProfile(resolvePrimaryResume(resumes)!.resumeData)
          : null;
        const skills = Array.from(new Set([...(user?.skills || []), ...(primaryProfile?.skills || [])]));
        const currentSkills = skills.map((skill) => ({
          skill,
          evidence: 'Compétence déclarée dans votre profil',
        }));

        const report = await analyzeGapUC.execute(
          userId,
          {
            goalId: savedGoal.id,
            targetRole: savedGoal.targetRole,
            seniority: savedGoal.seniority,
            currentSkills:
              currentSkills.length > 0
                ? currentSkills
                : [{ skill: 'À évaluer', evidence: 'Aucune compétence renseignée' }],
            currentRole: savedGoal.currentRole || primaryProfile?.experience[0]?.role || user?.targetTitle,
            fieldOfStudy: savedGoal.fieldOfStudy,
            competencies: savedGoal.competencies,
            context: savedGoal.context,
            lang: 'fr',
          },
          true
        );

        await generateRoadmapUC.execute(userId, {
          report,
          hoursPerWeek: savedGoal.hoursPerWeek,
          timeframeMonths: savedGoal.timeframeMonths,
          lang: 'fr',
        });

        await loadData();
        if (shouldSwitchTab) {
          setActiveTab('parcours');
        }
        return;
      }
    } catch (err) {
      console.warn('AI pipeline or Supabase failed when saving goal; applying resilient custom GPS fallback:', err);
    } finally {
      setAnalyzing(false);
    }

    const fallbackGoal: CareerGoal = savedGoal || {
      id: `gps-custom-${Date.now()}`,
      userId: effectiveUserId,
      targetRole: input.targetRole,
      currentRole: input.currentRole,
      fieldOfStudy: input.fieldOfStudy,
      competencies: input.competencies || [],
      context: input.context,
      seniority: input.seniority || 'junior',
      timeframeMonths: input.timeframeMonths,
      hoursPerWeek: input.hoursPerWeek,
      isActive: true,
      createdAt: new Date().toISOString(),
      lang: input.lang || 'fr',
    };

    const customData = createCustomGoalFallbackData(effectiveUserId, fallbackGoal, input);
    if (userId && savedGoal && customData.report && customData.roadmap) {
      try {
        await repo.saveReport(userId, customData.report);
        await repo.saveRoadmap(userId, customData.roadmap);
        await repo.upsertTasks(userId, savedGoal.id, customData.tasks);
      } catch (persistErr) {
        console.warn('Could not persist fallback roadmap to Supabase:', persistErr);
      }
    }
    applyDashboardData(customData);
    if (shouldSwitchTab) {
      setActiveTab('parcours');
    }
  };

  const handleGenerateStrategy = async (
    cRole: string,
    tRole: string,
    tf: 3 | 6 | 12,
    extras?: GoalExtras
  ) => {
    await handleSaveGoal(
      {
        currentRole: cRole,
        targetRole: tRole,
        timeframeMonths: tf,
        hoursPerWeek: extras?.hoursPerWeek ?? (data?.activeGoal?.hoursPerWeek || 6),
        seniority: extras?.seniority ?? (data?.activeGoal?.seniority || 'junior'),
        fieldOfStudy: extras?.fieldOfStudy,
        competencies: extras?.competencies,
        context: extras?.context,
        lang: 'fr',
      },
      false
    );
  };

  const handleSelectActiveGoal = async (goalId: string) => {
    if (!userId) return;
    try {
      await repo.setActiveGoal(userId, goalId);
      await loadData();
    } catch (e) {
      console.error('Failed to switch active goal:', e);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (userId) {
      try {
        await repo.deleteGoal(userId, goalId);
        await loadData();
      } catch (e) {
        console.error('Failed to delete goal:', e);
      }
    } else {
      setData((prev) => {
        if (!prev) return prev;
        const nextGoals = prev.goals.filter((g) => g.id !== goalId);
        return {
          ...prev,
          goals: nextGoals,
        };
      });
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: 'todo' | 'done') => {
    const next = currentStatus === 'todo' ? 'done' : 'todo';
    const xpDelta = next === 'done' ? 150 : -150;
    const readinessDelta = next === 'done' ? 2 : -2;

    setData((prev) => {
      if (!prev) return prev;
      const updatedTasks = prev.tasks.map((t) => (t.id === taskId ? { ...t, status: next } : t));
      const nextXp = Math.max(0, prev.stats.xp + xpDelta);
      const nextReadiness = Math.max(10, Math.min(100, prev.stats.readiness + readinessDelta));
      return {
        ...prev,
        tasks: updatedTasks,
        stats: {
          ...prev.stats,
          xp: nextXp,
          level: Math.max(1, Math.floor(nextXp / 250) + 1),
          readiness: nextReadiness,
        },
      };
    });

    if (userId && !taskId.startsWith('gps-task-')) {
      try {
        await repo.setTaskStatus(userId, taskId, next);
      } catch (e) {
        console.error('Failed to persist task status:', e);
      }
    }
  };

  const handleAdvanceSkill = async (
    skill: string,
    newState: 'identified' | 'learning' | 'practiced' | 'validated'
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.progress.some((p) => p.skill.toLowerCase() === skill.toLowerCase());
      const nextProgress = exists
        ? prev.progress.map((p) =>
            p.skill.toLowerCase() === skill.toLowerCase()
              ? { ...p, state: newState, validatedAt: newState === 'validated' ? new Date().toISOString() : p.validatedAt }
              : p
          )
        : [
            ...prev.progress,
            {
              skill,
              state: newState,
              hoursLogged: 4,
              validatedAt: newState === 'validated' ? new Date().toISOString() : undefined,
            },
          ];

      const validatedCount = nextProgress.filter((p) => p.state === 'validated').length;
      const nextData: LearningDashboardData = {
        ...prev,
        progress: nextProgress,
        stats: {
          ...prev.stats,
          skillsValidated: validatedCount,
          badgeCount: Math.max(prev.stats.badgeCount, validatedCount),
          xp: prev.stats.xp + (newState === 'validated' ? 150 : 50),
          readiness: Math.min(100, prev.stats.readiness + (newState === 'validated' ? 4 : 1)),
        },
      };
      setPrioritySkills(derivePrioritySkillsFromData(nextData.report, nextData.roadmap, nextProgress));
      return nextData;
    });

    if (userId && data?.activeGoal && !data.activeGoal.id.startsWith('gps-')) {
      try {
        await updateProgressUC.execute(userId, data.activeGoal.id, {
          skill,
          state: newState,
          hoursLogged: 4,
          validatedAt: newState === 'validated' ? new Date().toISOString() : undefined,
        });
      } catch (e) {
        console.error('Failed to persist skill progress:', e);
      }
    }
  };

  const handleSimulateStudyXp = () => {
    setData((prev) => {
      if (!prev) return prev;
      const nextXp = prev.stats.xp + 150;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          xp: nextXp,
          level: Math.max(1, Math.floor(nextXp / 250) + 1),
          readiness: Math.min(100, prev.stats.readiness + 2),
        },
      };
    });
  };

  const handleReanalyze = async () => {
    if (!data?.activeGoal) return;
    if (!userId || data.activeGoal.id.startsWith('gps-')) {
      setAnalyzing(true);
      setTimeout(() => {
        if (data.activeGoal && data.activeGoal.id !== 'gps-goal-order-picker-accountant') {
          applyDashboardData(createCustomGoalFallbackData(userId || 'gps-demo-user', data.activeGoal));
        } else {
          handleResetToCareerGpsPreset();
        }
        setAnalyzing(false);
      }, 450);
      return;
    }

    setAnalyzing(true);
    try {
      const report = await analyzeGapUC.execute(
        userId,
        {
          goalId: data.activeGoal.id,
          targetRole: data.activeGoal.targetRole,
          seniority: data.activeGoal.seniority,
          currentSkills: (user?.skills || []).map((skill) => ({
            skill,
            evidence: 'Compétence déclarée dans votre profil',
          })),
          currentRole: data.activeGoal.currentRole || user?.targetTitle,
          fieldOfStudy: data.activeGoal.fieldOfStudy,
          competencies: data.activeGoal.competencies,
          context: data.activeGoal.context,
          lang: 'fr',
        },
        true
      );

      await generateRoadmapUC.execute(userId, {
        report,
        hoursPerWeek: data.activeGoal.hoursPerWeek,
        timeframeMonths: data.activeGoal.timeframeMonths,
        lang: 'fr',
      });

      await loadData();
    } catch (err) {
      console.warn('AI reanalyze failed in production, using custom goal fallback:', err);
      applyDashboardData(createCustomGoalFallbackData(userId, data.activeGoal));
    } finally {
      setAnalyzing(false);
    }
  };

  if (authLoading || loading || analyzing) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4 my-8">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-spin">
          <RefreshCw size={28} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {analyzing
            ? 'Analyse IA & Génération du Parcours S-Curve...'
            : 'Chargement de votre GPS de Carrière...'}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          L&apos;agent ForgeBot segmente votre transition en 3 phases S-Curve et calibre vos micro-tâches hebdomadaires.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const incompleteTasksCount = data.tasks.filter((t) => t.status === 'todo').length;
  const currentRole = data.activeGoal?.currentRole || 'Préparateur de commandes';
  const targetRole = data.activeGoal?.targetRole || 'Comptable';
  const timeframeMonths = data.activeGoal?.timeframeMonths || 6;

  return (
    <div className="space-y-6">
      {/* Top Header & Career GPS Navigation Bar */}
      <div className="bg-tertiary text-white rounded-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-semibold text-accent">
              {currentRole} ➔ {targetRole} ({timeframeMonths} mois) · Prêt à {data.stats.readiness}%
            </p>
            <h1 className="text-3xl sm:text-5xl font-black leading-[1.1] tracking-tight">
              Hub de Formation &amp; Acquisition d&apos;Emploi
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.activeGoal?.id !== 'gps-goal-order-picker-accountant' && (
              <button
                type="button"
                onClick={handleResetToCareerGpsPreset}
                className="px-3.5 py-2.5 text-white/80 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white text-xs font-bold transition-colors cursor-pointer"
              >
                Exemple : Préparateur ➔ Comptable
              </button>
            )}
            <button
              type="button"
              onClick={handleReanalyze}
              className="px-5 py-3 bg-accent hover:bg-white text-tertiary rounded-lg text-sm font-bold transition-colors cursor-pointer"
            >
              Régénérer le parcours IA
            </button>
          </div>
        </div>

        {/* Navigation Tabs mapped to the Updated Site Architecture */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/15 pt-4">
          {[
            {
              id: 'dashboard',
              label: "Vue d'Ensemble",
              icon: LayoutDashboard,
              badge: `${data.stats.readiness}%`,
            },
            {
              id: 'parcours',
              label: 'Parcours S-Curve',
              icon: Layers3,
              badge: 'Phase 1',
            },
            {
              id: 'goals',
              label: 'Objectifs & CV IA',
              icon: Compass,
              badge: 'Offre ➔ CV',
            },
            {
              id: 'tasks',
              label: 'Plan Hebdo',
              icon: Calendar,
              badge: incompleteTasksCount === 0 ? '✓ 0' : `${incompleteTasksCount}`,
              highlightBadge: incompleteTasksCount > 0,
            },
            {
              id: 'entretien',
              label: 'Fiches STAR & Entretien',
              icon: Lightbulb,
              badge: 'Méthode STAR',
              highlightBadge: true,
            },
            {
              id: 'resources',
              label: 'Hub Formation',
              icon: BookOpen,
              badge: '3 cours IA',
            },
            {
              id: 'progress',
              label: 'Analytics & XP',
              icon: Award,
              badge: `${data.stats.xp} XP`,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LearningHubTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent text-tertiary'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-tertiary text-white'
                        : tab.highlightBadge
                        ? 'bg-amber-400 text-tertiary'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab View Content */}
      <div className="transition-all duration-300">
        {activeTab === 'dashboard' && (
          <LearningHubDashboard
            data={data}
            onNavigateTab={(t) => setActiveTab(t)}
            onReanalyze={handleReanalyze}
            onToggleTask={handleToggleTask}
            onSubmitJobLink={handleSubmitJobLink}
            onGenerateStrategy={handleGenerateStrategy}
            isGeneratingStrategy={analyzing}
          />
        )}

        {activeTab === 'parcours' && (
          <ParcoursDeFormation
            roadmap={data.roadmap}
            progress={data.progress}
            gaps={data.report?.gaps}
            targetRole={targetRole}
            currentRole={currentRole}
            timeframeMonths={timeframeMonths}
            readiness={data.stats.readiness}
            prioritySkills={prioritySkills}
            onTogglePrioritySkill={handleTogglePrioritySkill}
            onStartLearning={() => setActiveTab('tasks')}
          />
        )}

        {activeTab === 'goals' && (
          <CareerGoalsView
            goals={data.goals}
            activeGoal={data.activeGoal}
            gaps={data.report?.gaps}
            readiness={data.stats.readiness}
            pipeline={jobPipeline}
            onUpdateJobUrl={handleSubmitJobLink}
            onDeclareInterviewUnlocked={handleDeclareInterviewUnlocked}
            onSaveGoal={handleSaveGoal}
            onSelectActiveGoal={handleSelectActiveGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'tasks' && (
          <WeeklyPlanView
            tasks={data.tasks}
            onToggleTask={handleToggleTask}
            onNavigateAnalytics={() => setActiveTab('progress')}
          />
        )}

        {activeTab === 'entretien' && (
          <EntretienToolView
            currentRole={currentRole}
            targetRole={targetRole}
            readiness={data.stats.readiness}
            pipeline={jobPipeline}
            onPracticeComplete={handleInterviewPracticeComplete}
            onGoToJobFactory={() => setActiveTab('goals')}
          />
        )}

        {activeTab === 'resources' && (
          <ResourceCatalogView
            gaps={data.report?.gaps || []}
            roadmap={data.roadmap}
            progress={data.progress}
            onLoadResources={loadLearningResources}
            onReanalyze={handleReanalyze}
            readiness={data.stats.readiness}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressAnalyticsView
            stats={data.stats}
            progress={data.progress}
            gaps={data.report?.gaps || []}
            onAdvanceSkill={handleAdvanceSkill}
            onSimulateStudyXp={handleSimulateStudyXp}
          />
        )}
      </div>
    </div>
  );
};
