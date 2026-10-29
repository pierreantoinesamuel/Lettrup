import React, { useState } from 'react';
import { CheckCircle2, Circle, Lock, ExternalLink, ChevronRight } from 'lucide-react';
import { Roadmap, SkillGap, SkillProgress, StepState } from '../domain/types';
import { toRoadmapSteps } from '../domain/services/toRoadmapSteps';
import { forgeBotMessage } from '../domain/services/forgeBotMessage';
import { buildSCurvePhases } from '../domain/services/careerGpsBlueprint';

interface ParcoursDeFormationProps {
  roadmap: Roadmap | null;
  progress: SkillProgress[];
  gaps?: SkillGap[];
  targetRole: string;
  currentRole?: string;
  timeframeMonths?: number;
  readiness?: number;
  prioritySkills?: { name: string; nameEn: string; percent: number; completed: boolean }[];
  onTogglePrioritySkill?: (skillName: string) => void;
  onSelectMilestone?: (milestoneId: string) => void;
  onStartLearning?: () => void;
}

export const ParcoursDeFormation: React.FC<ParcoursDeFormationProps> = ({
  roadmap,
  progress,
  gaps,
  targetRole,
  currentRole = 'Préparateur de commandes',
  timeframeMonths = 6,
  readiness = 36,
  prioritySkills,
  onTogglePrioritySkill,
  onSelectMilestone,
  onStartLearning,
}) => {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    roadmap?.milestones[0]?.id || null
  );

  const defaultPrioritySkills = [
    { name: 'Bases Comptables & PCG', nameEn: 'Bookkeeping Basics', percent: 100, completed: true },
    { name: 'Partie Double : Débit/Crédit', nameEn: 'Double-Entry Drill', percent: 40, completed: false },
    { name: 'Excel TCD & RECHERCHEX', nameEn: 'Excel TCD & XLOOKUP', percent: 20, completed: false },
  ];

  const activePrioritySkills = prioritySkills && prioritySkills.length > 0 ? prioritySkills : defaultPrioritySkills;
  const phases = buildSCurvePhases(readiness, activePrioritySkills, roadmap, gaps, timeframeMonths);
  const phase1UnlockedCount = activePrioritySkills.filter((s) => s.completed).length;
  const truncateSvgText = (text: string, max = 36) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

  if (!roadmap) {
    return (
      <div className="py-16 max-w-xl">
        <h3 className="text-2xl font-black text-tertiary">Construction de votre parcours</h3>
        <p className="mt-2 text-sm text-[#456071] leading-relaxed">
          L&apos;analyse de vos compétences est en cours. Votre trajectoire de formation s&apos;affichera ici dans un instant.
        </p>
      </div>
    );
  }

  const steps = toRoadmapSteps(roadmap, progress);
  const activeStep = steps.find((s) => s.state === 'in_progress' || s.state === 'new') || steps[0];
  const botMessage = forgeBotMessage({ role: targetRole, nextStep: activeStep });

  const selectedMilestone = roadmap.milestones.find((m) => m.id === selectedMilestoneId) || roadmap.milestones[0];

  const statusLabel = (state: StepState) => {
    switch (state) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#007568]">
            <CheckCircle2 className="w-4 h-4" /> Validé
          </span>
        );
      case 'in_progress':
        return <span className="text-sm font-black text-tertiary">En cours</span>;
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
            <Lock className="w-3.5 h-3.5" /> Verrouillé
          </span>
        );
      case 'new':
      default:
        return <span className="text-sm font-semibold text-[#007568]">Nouveau</span>;
    }
  };

  // Compute user marker position along the SVG S-Curve (viewBox 0 0 800 280)
  const clampedReadiness = Math.min(100, Math.max(10, readiness));
  const userX = Math.round(90 + (clampedReadiness / 100) * 610);
  // Sigmoid-like Y mapping from 235 (0%) to 45 (100%)
  const tNorm = clampedReadiness / 100;
  const sCurveFactor = 1 / (1 + Math.exp(-8 * (tNorm - 0.48)));
  const userY = Math.round(238 - sCurveFactor * 195);

  const remainingSkills = activePrioritySkills.filter((s) => !s.completed);

  return (
    <div className="space-y-12">
      {/* Trajectory */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
              Votre trajectoire
            </h2>
            <p className="mt-2 text-sm text-[#456071] max-w-2xl leading-relaxed">
              Le début demande de poser les fondations. Vient ensuite une accélération rapide vers l&apos;autonomie professionnelle.
            </p>
          </div>
          <p className="text-sm font-semibold text-tertiary lg:text-right">
            {targetRole} <span className="font-normal text-[#456071]">(depuis {currentRole})</span>
            <br />
            <span className="font-normal text-[#456071]">{timeframeMonths} mois, prêt à {readiness}%</span>
          </p>
        </div>

        <p className="bg-primary-container/50 rounded-lg px-5 py-4 text-sm text-tertiary leading-relaxed">
          <strong>Une chose à la fois.</strong> Ne pensez pas à {phases[2]?.focusFr || 'Bilan & Paie'} pour l&apos;instant. Ce mois-ci, votre seul but est de débloquer{' '}
          <strong>« {remainingSkills[0]?.name || activePrioritySkills[0]?.name} »</strong>
          {remainingSkills[1] && (
            <>
              {' '}et <strong>« {remainingSkills[1].name} »</strong>
            </>
          )}
          .
        </p>

        <div className="bg-white rounded-lg p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[640px]">
            <svg viewBox="0 0 800 280" className="w-full h-auto select-none" role="img" aria-label={`Courbe de progression : vous êtes à ${readiness}% de préparation`}>
              {/* Grid */}
              <line x1="70" y1="45" x2="750" y2="45" stroke="#e2ecf1" strokeDasharray="4 4" />
              <text x="58" y="49" textAnchor="end" className="fill-[#456071] text-xs font-bold">100%</text>

              <line x1="70" y1="110" x2="750" y2="110" stroke="#e2ecf1" strokeDasharray="4 4" />
              <text x="58" y="114" textAnchor="end" className="fill-[#456071] text-xs font-bold">72%</text>

              <line x1="70" y1={userY} x2={userX} y2={userY} stroke="#007568" strokeWidth="2" strokeDasharray="5 4" />
              <text x="58" y={userY + 4} textAnchor="end" className="fill-[#007568] text-[12px] font-black">{readiness}%</text>

              <line x1="70" y1="238" x2="750" y2="238" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="58" y="242" textAnchor="end" className="fill-[#456071] text-xs font-bold">0%</text>
              <line x1="70" y1="25" x2="70" y2="238" stroke="#cbd5e1" strokeWidth="1.5" />

              {[
                { x: 110, label: 'Mois 1' },
                { x: 235, label: 'Mois 2' },
                { x: 365, label: 'Mois 3' },
                { x: 495, label: 'Mois 4' },
                { x: 615, label: 'Mois 5' },
                { x: 725, label: 'Mois 6' },
              ].map((m) => (
                <g key={m.label}>
                  <line x1={m.x} y1="238" x2={m.x} y2="244" stroke="#94a3b8" strokeWidth="1.5" />
                  <text x={m.x} y="262" textAnchor="middle" className="fill-[#456071] text-xs font-bold">
                    {m.label}
                  </text>
                </g>
              ))}

              {/* Future trajectory (phases 2 and 3) */}
              <path
                d="M 80 235 C 210 232, 290 200, 390 135 C 490 70, 580 48, 730 45"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="8 6"
              />

              {/* Active phase 1 */}
              <path d="M 80 235 C 145 234, 200 218, 265 185 L 265 238 L 80 238 Z" fill="#007568" fillOpacity="0.12" />
              <path d="M 80 235 C 145 234, 200 218, 265 185" fill="none" stroke="#007568" strokeWidth="7" strokeLinecap="round" />

              <g transform="translate(115, 194)">
                <rect x="0" y="0" width="235" height="38" rx="4" fill="#ffffff" stroke="#007568" strokeWidth="2" />
                <text x="10" y="15" className="fill-[#007568] text-xs font-black">
                  Phase 1 : Le Décollage, {phases[0]?.monthsLabel || 'Mois 1-2'}
                </text>
                <text x="10" y="29" className="fill-[#102d3e] text-xs font-semibold">
                  {truncateSvgText(phases[0]?.focusFr || 'Partie Double & Excel Avancé', 34)}
                </text>
              </g>

              {/* Phase 2 */}
              <g transform="translate(355, 122)" opacity={phases[1].status === 'locked' ? 0.7 : 1}>
                <rect x="0" y="0" width="245" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="10" y="16" className="fill-[#475569] text-xs font-extrabold">
                  Phase 2 : L&apos;Accélération, {phases[1]?.monthsLabel || 'Mois 3-4'}
                </text>
                <text x="10" y="30" className="fill-[#64748b] text-xs font-medium">
                  {truncateSvgText(phases[1]?.focusFr || 'Fiscalité (TVA) & Logiciel Sage', 36)}
                </text>
              </g>
              <circle cx="420" cy="115" r="6" fill="#94a3b8" />

              {/* Phase 3 */}
              <g transform="translate(505, 52)" opacity={phases[2].status === 'locked' ? 0.7 : 1}>
                <rect x="0" y="0" width="235" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="10" y="16" className="fill-[#475569] text-xs font-extrabold">
                  Phase 3 : Le Palier Pro, {phases[2]?.monthsLabel || 'Mois 5-6'}
                </text>
                <text x="10" y="30" className="fill-[#64748b] text-xs font-medium">
                  {truncateSvgText(phases[2]?.focusFr || 'Bilan, Stages & Optimisation CV', 34)}
                </text>
              </g>
              <circle cx="715" cy="46" r="6" fill="#94a3b8" />

              {/* You are here */}
              <g transform={`translate(${userX}, ${userY})`}>
                <circle cx="0" cy="0" r="8" fill="#007568" stroke="#ffffff" strokeWidth="3" />
                <g transform="translate(14, -22)">
                  <rect x="0" y="0" width="148" height="26" rx="4" fill="#0b4056" />
                  <text x="74" y="17" textAnchor="middle" className="fill-white text-xs font-black">
                    Vous êtes ici ({readiness}%)
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Priority skills of the current phase */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b-2 border-tertiary pb-2">
          <div>
            <h3 className="text-2xl font-black text-tertiary">Validez 3 compétences pour débloquer la phase 2</h3>
            <p className="mt-1 text-sm text-[#456071]">
              Touchez une compétence pour enregistrer une session de pratique (+20 % par validation).
            </p>
          </div>
          <p className="text-2xl font-black text-[#007568] tabular-nums shrink-0">{phase1UnlockedCount}/3</p>
        </div>
        <ul className="divide-y divide-tertiary/10">
          {activePrioritySkills.map((item) => (
            <li key={item.name}>
              <button
                type="button"
                onClick={() => onTogglePrioritySkill?.(item.name)}
                aria-pressed={item.completed}
                className="w-full py-4 flex items-center gap-4 text-left cursor-pointer group"
              >
                {item.completed ? (
                  <CheckCircle2 size={22} className="text-[#007568] shrink-0" />
                ) : (
                  <Circle size={22} className="text-tertiary/35 group-hover:text-tertiary shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-tertiary">{item.name}</span>
                  <span className="block text-xs text-[#456071]">{item.nameEn}</span>
                </span>
                <span className="w-28 hidden sm:block h-2 rounded-full bg-tertiary/10 overflow-hidden">
                  <span className="block h-full bg-[#007568]" style={{ width: `${item.percent}%` }} />
                </span>
                <span className="w-12 text-right text-lg font-black text-tertiary tabular-nums">{item.percent}%</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Target job profile and the coach's next step */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-7">
          <p className="text-sm font-bold text-[#007568]">Fiche métier cible</p>
          <h3 className="text-3xl font-black text-tertiary tracking-tight">{roadmap.roleProfile.role}</h3>
          <p className="mt-1 text-sm text-[#456071]">Environ {roadmap.estimatedWeeks} semaines de parcours</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Missions clés', items: roadmap.roleProfile.missions },
              { title: 'Compétences clés', items: roadmap.roleProfile.keySkills },
              { title: 'Socle transférable', items: roadmap.roleProfile.prerequisites },
            ].map((col) => (
              <div key={col.title} className="border-t-2 border-tertiary pt-3">
                <h4 className="text-sm font-black text-tertiary mb-2">{col.title}</h4>
                <ul className="space-y-1.5 text-sm text-[#244354] leading-snug">
                  {col.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-5 bg-tertiary text-white rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-accent">ForgeBot, votre coach GPS</p>
            <p className="mt-3 text-lg font-bold leading-snug">{botMessage}</p>
          </div>
          <p className="text-sm text-white/75">
            Progression : {steps.filter((s) => s.state === 'completed').length} module
            {steps.filter((s) => s.state === 'completed').length > 1 ? 's' : ''} sur {steps.length}
          </p>
        </aside>
      </section>

      {/* Modules */}
      <section className="space-y-8">
        <div>
          <h3 className="text-2xl font-black text-tertiary">Modules du parcours ({steps.length} étapes)</h3>
          <p className="mt-1 text-sm text-[#456071]">
            Les modules des phases 2 et 3 restent verrouillés tant que les prérequis de la phase 1 ne sont pas validés.
          </p>
        </div>

        <ol className="divide-y divide-tertiary/10 border-y border-tertiary/10">
          {steps.map((step) => {
            const isSelected = selectedMilestoneId === step.milestoneId;
            return (
              <li key={step.milestoneId}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMilestoneId(step.milestoneId);
                    if (onSelectMilestone) onSelectMilestone(step.milestoneId);
                  }}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`w-full flex items-center gap-4 py-4 px-3 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-container/50' : 'hover:bg-white'
                  } ${step.state === 'locked' && !isSelected ? 'opacity-70' : ''}`}
                >
                  <span className="w-8 text-lg font-black tabular-nums text-[#007568]">
                    {String(step.order).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-base text-tertiary ${isSelected ? 'font-black' : 'font-semibold'}`}>
                      {step.title}
                    </span>
                    <span className="block text-xs text-[#456071]">
                      {step.sourceTag} · {step.estHours} h
                    </span>
                  </span>
                  <span className="shrink-0">{statusLabel(step.state)}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {selectedMilestone && (
          <div>
            <p className="text-sm font-bold text-[#007568]">Étape {selectedMilestone.order}, {selectedMilestone.estHours} heures estimées</p>
            <h4 className="text-2xl font-black text-tertiary">{selectedMilestone.title}</h4>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h5 className="text-sm font-black text-tertiary border-b-2 border-tertiary pb-2">
                  Activités de formation ({selectedMilestone.activities?.length || selectedMilestone.skills.length})
                </h5>
                <ul className="divide-y divide-tertiary/10">
                  {selectedMilestone.activities
                    ? selectedMilestone.activities.map((act) => (
                        <li key={act.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <CheckCircle2
                              size={16}
                              className={act.completed ? 'text-[#007568] shrink-0' : 'text-tertiary/25 shrink-0'}
                            />
                            <span className={act.completed ? 'line-through text-slate-400' : 'font-medium text-tertiary'}>
                              {act.title}
                            </span>
                          </span>
                          <span className="text-xs text-[#456071] shrink-0">{act.kind}</span>
                        </li>
                      ))
                    : selectedMilestone.skills.map((sk, idx) => (
                        <li key={idx} className="py-3 text-sm text-tertiary">
                          Module de pratique : <span className="font-bold text-[#007568]">{sk}</span>
                        </li>
                      ))}
                </ul>
              </div>

              <div>
                <h5 className="text-sm font-black text-tertiary border-b-2 border-tertiary pb-2">
                  Ressources recommandées
                </h5>
                <ul className="divide-y divide-tertiary/10">
                  {selectedMilestone.resourceRefs.map((res, idx) => (
                    <li key={idx}>
                      <a
                        href={res.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 flex items-center justify-between gap-3 text-sm group"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-tertiary truncate group-hover:text-[#007568]">
                            {res.title}
                          </span>
                          <span className="block text-xs text-[#456071] truncate">{res.why}</span>
                        </span>
                        <ExternalLink size={14} className="text-[#007568] shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onStartLearning}
          className="px-8 py-3.5 bg-[#007568] hover:bg-[#006257] text-white text-base font-bold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Passer à l&apos;action dans mon Plan Hebdo</span>
          <ChevronRight size={18} />
        </button>
      </section>
    </div>
  );
};
