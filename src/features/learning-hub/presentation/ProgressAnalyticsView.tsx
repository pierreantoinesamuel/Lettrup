import React, { useState } from 'react';
import { SkillProgress, LearningStats, SkillGap } from '../domain/types';

interface ProgressAnalyticsViewProps {
  stats: LearningStats;
  progress: SkillProgress[];
  gaps: SkillGap[];
  onAdvanceSkill: (skill: string, newState: 'identified' | 'learning' | 'practiced' | 'validated') => void;
  onSimulateStudyXp?: (skillName: string) => void;
}

const STATE_TO_PCT: Record<SkillProgress['state'], number> = {
  identified: 15,
  learning: 45,
  practiced: 75,
  validated: 100,
};

const STATE_LABELS = {
  identified: 'Identifiée',
  learning: 'En cours',
  practiced: 'Pratiquée',
  validated: 'Validée',
} as const;

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({
  stats,
  progress,
  gaps,
  onAdvanceSkill,
  onSimulateStudyXp,
}) => {
  // Only set after a real action: nothing is claimed before the user has done anything
  const [recentRewardToast, setRecentRewardToast] = useState<string | null>(null);
  const [skillBoostMap, setSkillBoostMap] = useState<Record<string, number>>({});

  const getSkillPercentage = (gap: SkillGap): number => {
    const prog = progress.find((p) => p.skill.toLowerCase() === gap.skill.toLowerCase());
    const baseFromLevel = Math.round((gap.currentLevel / Math.max(gap.targetLevel, 1)) * 100);
    const statePct = prog ? STATE_TO_PCT[prog.state] : baseFromLevel;
    const raw = Math.max(baseFromLevel, statePct) + (skillBoostMap[gap.skill] || 0);
    return Math.min(100, raw);
  };

  const handleBoostSkill = (skillName: string) => {
    setSkillBoostMap((prev) => ({
      ...prev,
      [skillName]: Math.min(100, (prev[skillName] || 0) + 15),
    }));
    setRecentRewardToast(
      `Session d'étude sur « ${skillName} » : +150 XP, et votre score global gagne 2 points.`
    );
    if (onSimulateStudyXp) {
      onSimulateStudyXp(skillName);
    }
  };

  // Build up to 6 axes for the SVG Radar Chart
  const radarSkills = (gaps.length > 0 ? gaps : [
    { skill: 'Bases PCG', currentLevel: 5, targetLevel: 5, priority: 'critical' as const, demandCount: 140, rationale: '' },
    { skill: 'Partie Double', currentLevel: 2, targetLevel: 5, priority: 'critical' as const, demandCount: 168, rationale: '' },
    { skill: 'Excel (TCD/XLOOKUP)', currentLevel: 1, targetLevel: 4, priority: 'critical' as const, demandCount: 195, rationale: '' },
    { skill: 'Fiscalité & TVA', currentLevel: 0, targetLevel: 4, priority: 'high' as const, demandCount: 118, rationale: '' },
    { skill: 'Logiciel Sage 100', currentLevel: 0, targetLevel: 4, priority: 'high' as const, demandCount: 134, rationale: '' },
    { skill: 'Bilan & Clôture', currentLevel: 0, targetLevel: 4, priority: 'nice' as const, demandCount: 96, rationale: '' },
  ]).slice(0, 6);

  const cx = 150;
  const cy = 145;
  const maxR = 92;
  const count = radarSkills.length;

  const pointAt = (index: number, pct: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (pct / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const targetPolygon = radarSkills
    .map((_, idx) => {
      const p = pointAt(idx, 100);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const currentPolygon = radarSkills
    .map((g, idx) => {
      const pct = Math.max(12, getSkillPercentage(g));
      const p = pointAt(idx, pct);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const targetRole = stats.activeGoalRole || 'Comptable';

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {recentRewardToast && (
        <p role="status" className="bg-primary-container/60 rounded-lg px-5 py-4 text-sm font-bold text-tertiary">
          {recentRewardToast}
        </p>
      )}

      {/* The four numbers, in one strip */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-6 border-y-2 border-tertiary py-6">
        <div className="md:pr-6">
          <dt className="text-sm font-bold text-[#456071]">Score de préparation</dt>
          <dd className="mt-1 text-5xl font-black leading-none text-[#007568] tabular-nums">{stats.readiness}%</dd>
          <p className="mt-2 text-xs text-[#456071]">Cible : {targetRole}</p>
        </div>
        <div className="md:px-6 md:border-l border-tertiary/15">
          <dt className="text-sm font-bold text-[#456071]">Niveau</dt>
          <dd className="mt-1 text-5xl font-black leading-none text-tertiary tabular-nums">{stats.level}</dd>
          <p className="mt-2 text-xs text-[#456071]">{stats.xp} XP cumulés, +150 par tâche</p>
        </div>
        <div className="md:px-6 md:border-l border-tertiary/15">
          <dt className="text-sm font-bold text-[#456071]">Série en cours</dt>
          <dd className="mt-1 text-5xl font-black leading-none text-tertiary tabular-nums">
            {stats.currentStreakDays}
            <span className="ml-1 text-xl font-bold">j</span>
          </dd>
          <p className="mt-2 text-xs text-[#456071]">jours consécutifs</p>
        </div>
        <div className="md:pl-6 md:border-l border-tertiary/15">
          <dt className="text-sm font-bold text-[#456071]">Badges</dt>
          <dd className="mt-1 text-5xl font-black leading-none text-tertiary tabular-nums">{stats.badgeCount}</dd>
          <p className="mt-2 text-xs text-[#456071]">débloqué{stats.badgeCount > 1 ? 's' : ''}</p>
        </div>
      </dl>

      {/* Radar and per-skill progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <h3 className="text-2xl font-black text-tertiary">Empreinte de compétences</h3>
          <p className="mt-1 text-sm text-[#456071]">
            Votre progression vers le profil cible de {targetRole}.
          </p>

          <div className="mt-4 flex items-center justify-center">
            <svg
              viewBox="0 0 300 290"
              className="w-full max-w-[320px] h-auto overflow-visible"
              role="img"
              aria-label={`Radar de compétences vers le profil ${targetRole}`}
            >
              {[25, 50, 75, 100].map((ringPct) => {
                const pts = radarSkills
                  .map((_, idx) => {
                    const p = pointAt(idx, ringPct);
                    return `${p.x},${p.y}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={ringPct}
                    points={pts}
                    fill="none"
                    stroke="#dce7ed"
                    strokeWidth="1"
                    strokeDasharray={ringPct === 100 ? undefined : '3 3'}
                  />
                );
              })}

              {radarSkills.map((g, idx) => {
                const outer = pointAt(idx, 100);
                const labelPos = pointAt(idx, 122);
                const shortLabel = g.skill.length > 18 ? `${g.skill.slice(0, 16)}…` : g.skill;
                return (
                  <g key={g.skill}>
                    <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#dce7ed" strokeWidth="1" />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-[#0b4056] text-xs font-bold"
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}

              <polygon
                points={targetPolygon}
                fill="none"
                stroke="#0b4056"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              <polygon
                points={currentPolygon}
                fill="rgba(0, 117, 104, 0.25)"
                stroke="#007568"
                strokeWidth="2.5"
              />

              {radarSkills.map((g, idx) => {
                const pct = Math.max(12, getSkillPercentage(g));
                const p = pointAt(idx, pct);
                return (
                  <circle key={g.skill} cx={p.x} cy={p.y} r="4" fill="#007568" stroke="#ffffff" strokeWidth="1.5" />
                );
              })}
            </svg>
          </div>

          <p className="mt-2 flex items-center justify-center gap-6 text-xs font-semibold text-[#456071]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#007568]/40 border border-[#007568] inline-block" /> Votre niveau
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-tertiary inline-block" /> Cible (100%)
            </span>
          </p>
        </div>

        <div className="lg:col-span-7">
          <h3 className="text-2xl font-black text-tertiary">Progression par compétence</h3>
          <p className="mt-1 text-sm text-[#456071]">
            Une tâche ou une heure d&apos;étude validée ajoute 150 XP et fait monter la barre.
          </p>

          <ul className="mt-4 divide-y divide-tertiary/10 border-y border-tertiary/10">
            {gaps.map((gap) => {
              const pct = getSkillPercentage(gap);
              const isFull = pct >= 100;
              return (
                <li key={gap.skill} className="py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0">
                      <span className="text-base font-bold text-tertiary">{gap.skill}</span>
                      <span className="ml-2 text-xs text-[#456071]">
                        niveau {gap.currentLevel} sur {gap.targetLevel}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-lg font-black tabular-nums text-tertiary">{pct}%</span>
                      {!isFull && (
                        <button
                          type="button"
                          onClick={() => handleBoostSkill(gap.skill)}
                          className="px-2.5 py-1 rounded-md bg-tertiary hover:bg-[#093b50] text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          +150 XP
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 w-full h-2 bg-tertiary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#007568] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Manual validation by stage */}
      <section>
        <h3 className="text-2xl font-black text-tertiary">Validation par palier</h3>
        <p className="mt-1 text-sm text-[#456071] max-w-2xl">
          Faites évoluer le statut de vos {gaps.length} compétences au fil de votre apprentissage pour débloquer les phases suivantes.
        </p>

        <ul className="mt-4 divide-y divide-tertiary/10 border-y border-tertiary/10">
          {gaps.map((gap) => {
            const prog = progress.find((p) => p.skill.toLowerCase() === gap.skill.toLowerCase());
            const state = prog?.state || 'identified';

            return (
              <li key={gap.skill} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-tertiary">{gap.skill}</h4>
                  <span className="text-xs text-[#456071]">
                    Niveau {gap.currentLevel} sur 5, cible {gap.targetLevel} sur 5
                  </span>
                </div>

                <div role="group" aria-label={`Statut de ${gap.skill}`} className="flex rounded-lg border border-tertiary/20 overflow-hidden self-start lg:self-auto shrink-0">
                  {(['identified', 'learning', 'practiced', 'validated'] as const).map((st) => {
                    const isCurrent = state === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onAdvanceSkill(gap.skill, st)}
                        aria-pressed={isCurrent}
                        className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors border-l border-tertiary/20 first:border-l-0 cursor-pointer ${
                          isCurrent
                            ? 'bg-tertiary text-white'
                            : 'bg-white text-tertiary hover:bg-primary-container/50'
                        }`}
                      >
                        {STATE_LABELS[st]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
