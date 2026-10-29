import React from 'react';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { WeeklyTask } from '../domain/types';

interface WeeklyPlanViewProps {
  tasks: WeeklyTask[];
  onToggleTask: (taskId: string, currentStatus: 'todo' | 'done') => void;
  onNavigateAnalytics?: () => void;
}

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  tasks,
  onToggleTask,
  onNavigateAnalytics,
}) => {
  const weeks = Array.from(new Set(tasks.map((t) => t.weekNumber))).sort((a: number, b: number) => a - b);
  const incompleteCount = tasks.filter((t) => t.status === 'todo').length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Heading and the one number that matters: what is left to do */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="min-w-0">
          <h3 className="text-3xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
            Plan d&apos;action hebdomadaire
          </h3>
          <p className="mt-2 text-sm text-[#456071] max-w-xl leading-relaxed">
            Votre plan est découpé en sessions de 30 minutes à 2 heures, à faire après le travail. Chaque tâche validée rapporte 150 XP et rapproche votre score de préparation de 2 points.
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-6xl font-black leading-none text-[#007568] tabular-nums">{incompleteCount}</p>
          <p className="mt-1 text-sm font-bold text-tertiary">
            {incompleteCount === 0
              ? 'tâche restante'
              : `tâche${incompleteCount > 1 ? 's' : ''} restante${incompleteCount > 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-[#456071]">{completedCount} sur {tasks.length} validées</p>
        </div>
      </header>

      {incompleteCount === 0 && tasks.length > 0 && (
        <div className="bg-tertiary rounded-lg p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-2xl font-black text-accent">Toutes les tâches sont faites</h4>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Vous avez gagné {tasks.length * 150} XP sur ce plan. Votre score de préparation en tient compte.
            </p>
          </div>
          {onNavigateAnalytics && (
            <button
              type="button"
              onClick={onNavigateAnalytics}
              className="px-5 py-3 bg-accent hover:bg-white text-tertiary rounded-lg text-sm font-bold shrink-0 transition-colors cursor-pointer"
            >
              Voir mes XP et analytics
            </button>
          )}
        </div>
      )}

      {/* One section per week, tasks as ruled rows */}
      <div className="space-y-10">
        {weeks.map((weekNum) => {
          const weekTasks = tasks.filter((t) => t.weekNumber === weekNum);
          const weekIncomplete = weekTasks.filter((t) => t.status === 'todo').length;
          const allDone = weekIncomplete === 0;

          return (
            <section key={weekNum}>
              <div className="flex items-baseline justify-between gap-4 border-b-2 border-tertiary pb-2">
                <h4 className="text-xl font-black text-tertiary">
                  Semaine {weekNum}
                  <span className="ml-3 text-sm font-semibold text-[#456071]">Phase 1, le décollage</span>
                </h4>
                <span className={`text-sm font-bold ${allDone ? 'text-[#007568]' : 'text-[#456071]'}`}>
                  {allDone
                    ? 'Semaine complète'
                    : `${weekIncomplete} action${weekIncomplete > 1 ? 's' : ''} à faire`}
                </span>
              </div>

              <ul className="divide-y divide-tertiary/10">
                {weekTasks.map((task) => {
                  const isDone = task.status === 'done';
                  return (
                    <li key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id, task.status)}
                        aria-pressed={isDone}
                        className="flex items-start gap-3 text-left min-w-0 flex-1 cursor-pointer group"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-[#007568]" />
                        ) : (
                          <Circle className="w-5 h-5 mt-0.5 shrink-0 text-tertiary/35 group-hover:text-tertiary" />
                        )}
                        <span className="min-w-0">
                          <span
                            className={`block text-sm font-bold leading-relaxed ${
                              isDone ? 'line-through text-slate-400' : 'text-tertiary'
                            }`}
                          >
                            {task.description}
                          </span>
                          <span className="text-xs font-semibold text-[#456071]">{task.skill}</span>
                        </span>
                      </button>

                      {task.resourceRef && (
                        <a
                          href={task.resourceRef.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary self-start sm:self-center ml-8 sm:ml-0"
                        >
                          <span>Ouvrir le cours</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};
