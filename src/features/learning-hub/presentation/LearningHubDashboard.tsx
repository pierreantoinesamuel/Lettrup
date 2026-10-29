import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Target,
  ArrowUpRight,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LearningDashboardData } from '../use-cases/GetDashboardUseCase';
import { CareerGoalsDefinitionCard, type GoalExtras } from './CareerGoalsDefinitionCard';

interface LearningHubDashboardProps {
  data: LearningDashboardData;
  onNavigateTab: (tab: 'parcours' | 'goals' | 'tasks' | 'resources' | 'progress' | 'entretien') => void;
  onReanalyze: () => void;
  onToggleTask?: (taskId: string, currentStatus: 'todo' | 'done') => void;
  onSubmitJobLink?: (jobUrl: string) => void;
  onGenerateStrategy?: (
    currentRole: string,
    targetRole: string,
    timeframeMonths: 3 | 6 | 12,
    extras?: GoalExtras
  ) => void | Promise<void>;
  isGeneratingStrategy?: boolean;
}

export const LearningHubDashboard: React.FC<LearningHubDashboardProps> = ({
  data,
  onNavigateTab,
  onReanalyze,
  onToggleTask,
  onSubmitJobLink,
  onGenerateStrategy,
  isGeneratingStrategy = false,
}) => {
  const { activeGoal, report, tasks, stats } = data;
  const [jobLinkInput, setJobLinkInput] = useState(
    'https://candidat.francetravail.fr/offres/recherche/detail/comptable-junior-sage-pme'
  );
  const [isGoalsFormOpen, setIsGoalsFormOpen] = useState(true);

  const currentRole = activeGoal?.currentRole || 'Préparateur de commandes';
  const targetRole = activeGoal?.targetRole || 'Comptable';
  const timeframeMonths = (activeGoal?.timeframeMonths || 6) as 3 | 6 | 12;
  const readiness = stats.readiness || 36;

  const handleTriggerJobPipeline = (e: React.FormEvent) => {
    e.preventDefault();
    const url = jobLinkInput.trim() || 'https://candidat.francetravail.fr/offres/comptable-junior-sage';
    if (onSubmitJobLink) {
      onSubmitJobLink(url);
    } else {
      onNavigateTab('goals');
    }
  };

  const incompleteTasks = tasks.filter((t) => t.status === 'todo');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  // Dual-State SVG Gauge calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, readiness)) / 100) * circumference;

  const transferableSummary =
    report?.summary ||
    `${readiness}% de vos compétences actuelles (rigueur, gestion des flux de stocks, Excel) sont directement transférables au métier de ${targetRole} !`;

  const strengths =
    report?.strengths && report.strengths.length > 0
      ? report.strengths
      : [
          { skill: 'Rigueur & Contrôle des Flux', evidence: 'Inventaires & pointage sans erreur' },
          { skill: 'Gestion des Stocks & Bons de livraison', evidence: 'Traçabilité des réceptions' },
          { skill: 'Bases Excel (Saisie & Tableaux)', evidence: 'Suivi quotidien de données' },
        ];

  return (
    <div className="space-y-10">
      {/* Trajectory: plain heading, the page header above already carries the brand surface */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
            Transition : {currentRole} ➔ {targetRole}
          </h2>
          <p className="mt-2 text-sm text-[#456071]">
            {timeframeMonths} mois, {activeGoal?.hoursPerWeek || 6} h par semaine
            {stats.currentStreakDays > 0 && <>, série de {stats.currentStreakDays} jours</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsGoalsFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 self-start lg:self-auto px-4 py-2.5 rounded-lg text-sm font-bold text-tertiary border border-tertiary/25 hover:border-tertiary hover:bg-white transition-colors cursor-pointer"
        >
          <Target size={15} />
          <span>{isGoalsFormOpen ? 'Masquer les objectifs' : 'Définir vos objectifs'}</span>
          {isGoalsFormOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isGoalsFormOpen && (
        <section aria-label="Définir vos Objectifs">
          <CareerGoalsDefinitionCard
            initialCurrentRole={currentRole}
            initialTargetRole={targetRole}
            initialTimeframeMonths={timeframeMonths}
            initialFieldOfStudy={activeGoal?.fieldOfStudy}
            initialCompetencies={activeGoal?.competencies}
            initialContext={activeGoal?.context}
            initialSeniority={activeGoal?.seniority}
            initialHoursPerWeek={activeGoal?.hoursPerWeek}
            readinessScore={readiness}
            isGenerating={isGeneratingStrategy}
            onGenerateStrategy={onGenerateStrategy || (() => {})}
          />
        </section>
      )}

      {/* The job link itself lives in "Objectifs & CV IA"; this is only the way in */}
      <section className="bg-primary text-white rounded-lg p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="min-w-0">
          <h3 className="text-2xl sm:text-3xl font-black leading-tight">
            Décrochez un poste de {targetRole}
          </h3>
          <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed max-w-xl">
            Collez le lien d&apos;une offre : l&apos;IA prépare un CV et une lettre sur mesure, puis vos fiches réponse STAR.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('goals')}
          className="shrink-0 px-6 py-3.5 bg-accent hover:bg-white text-tertiary rounded-lg text-sm font-black inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>Coller le lien d&apos;une offre</span>
          <ArrowUpRight size={16} />
        </button>
      </section>

      {/* Readiness, starting capital and this week: three columns separated by rules, not three boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-0">
        <section className="lg:col-span-4 lg:pr-10">
          <p className="text-sm font-bold text-[#456071]">Score de préparation</p>
          <p className="mt-2 text-8xl font-black leading-none text-[#007568] tabular-nums">
            {readiness}<span className="text-4xl">%</span>
          </p>
          <div className="mt-6 relative h-3 rounded-full bg-tertiary/10">
            <div
              className="h-full rounded-full bg-[#007568] transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
            />
            <div className="absolute -top-1 h-5 w-0.5 bg-tertiary" style={{ left: '55%' }} aria-hidden="true" />
          </div>
          <p className="mt-2 text-xs text-[#456071]">Repère : 55 % à la fin de la phase 1</p>
          <p className="mt-5 text-sm text-[#456071] leading-relaxed">{transferableSummary}</p>
        </section>

        <section className="lg:col-span-4 lg:px-10 lg:border-l border-tertiary/15">
          <h3 className="text-xl font-black text-tertiary">Votre point de départ</h3>
          <p className="mt-1 text-sm text-[#456071]">
            Votre maîtrise opérationnelle actuelle est le socle de la phase 1.
          </p>
          <ul className="mt-4 divide-y divide-tertiary/10 border-y border-tertiary/10">
            {strengths.map((str, i) => (
              <li key={i} className="py-3 text-sm">
                <span className="font-bold text-tertiary">{str.skill}</span>
                {str.evidence && <p className="text-xs text-[#456071] mt-0.5">{str.evidence}</p>}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onNavigateTab('parcours')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary cursor-pointer"
          >
            Voir ma position sur la S-Curve <ArrowUpRight size={14} />
          </button>
        </section>

        <section className="lg:col-span-4 lg:pl-10 lg:border-l border-tertiary/15">
          <h3 className="text-xl font-black text-tertiary">Cette semaine</h3>
          <p className="mt-1 text-sm text-[#456071]">
            {incompleteTasks.length === 0
              ? 'Tout est fait pour cette semaine.'
              : `${incompleteTasks.length} tâche${incompleteTasks.length > 1 ? 's' : ''} à faire, +150 XP par tâche validée.`}
          </p>
          <ul className="mt-4 divide-y divide-tertiary/10 border-y border-tertiary/10">
            {tasks.slice(0, 4).map((task) => {
              const isDone = task.status === 'done';
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onToggleTask?.(task.id, task.status)}
                    className="w-full flex items-start gap-3 py-3 text-left text-sm cursor-pointer group"
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-[#007568] shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={18} className="text-tertiary/35 group-hover:text-tertiary shrink-0 mt-0.5" />
                    )}
                    <span className="min-w-0">
                      <span className={`block font-semibold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-tertiary'}`}>
                        {task.description}
                      </span>
                      <span className="text-xs text-[#456071]">{task.skill}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary cursor-pointer"
          >
            Ouvrir le Plan Hebdo ({completedTasks.length}/{tasks.length}) <ArrowUpRight size={14} />
          </button>
        </section>
      </div>

      {/* Key figures: one strip, no cards */}
      <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-tertiary/15 border-y border-tertiary/15">
        <div className="py-5 sm:px-6 first:sm:pl-0">
          <dt className="text-sm font-bold text-[#456071]">Compétences de la phase 1</dt>
          <dd className="mt-1 text-3xl font-black text-tertiary tabular-nums">
            {stats.skillsValidated} / {stats.skillsTotal}
            <span className="ml-2 text-sm font-semibold text-[#456071]">paliers validés</span>
          </dd>
        </div>
        <div className="py-5 sm:px-6">
          <dt className="text-sm font-bold text-[#456071]">Niveau et XP</dt>
          <dd className="mt-1 text-3xl font-black text-tertiary tabular-nums">
            Niv. {stats.level}
            <span className="ml-2 text-sm font-semibold text-[#007568]">{stats.xp} XP</span>
          </dd>
        </div>
        <div className="py-5 sm:px-6">
          <dt className="text-sm font-bold text-[#456071]">Cours sélectionnés</dt>
          <dd className="mt-1 text-3xl font-black text-tertiary">
            3
            <button
              type="button"
              onClick={() => onNavigateTab('resources')}
              className="ml-3 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary inline-flex items-center gap-0.5 cursor-pointer"
            >
              Voir le Hub <ArrowUpRight size={13} />
            </button>
          </dd>
        </div>
      </dl>
    </div>
  );
};
