import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export type GoalSeniority = 'junior' | 'mid' | 'senior' | 'lead';

/** Optional details collected by the card beyond the role and the horizon. */
export interface GoalExtras {
  fieldOfStudy?: string;
  competencies?: string[];
  context?: string;
  seniority: GoalSeniority;
  hoursPerWeek: number;
}

export interface CareerGoalsDefinitionCardProps {
  initialCurrentRole?: string;
  initialTargetRole?: string;
  initialTimeframeMonths?: 3 | 6 | 12;
  initialFieldOfStudy?: string;
  initialCompetencies?: string[];
  initialContext?: string;
  initialSeniority?: GoalSeniority;
  initialHoursPerWeek?: number;
  readinessScore?: number;
  isGenerating?: boolean;
  onGenerateStrategy: (
    currentRole: string,
    targetRole: string,
    timeframeMonths: 3 | 6 | 12,
    extras?: GoalExtras
  ) => void | Promise<void>;
  layoutMode?: 'split' | 'vertical' | 'horizontal';
  className?: string;
}

const SENIORITY_OPTIONS: Array<{ id: GoalSeniority; label: string; years: string }> = [
  { id: 'junior', label: 'Junior', years: '0 à 2 ans' },
  { id: 'mid', label: 'Confirmé', years: '2 à 5 ans' },
  { id: 'senior', label: 'Senior', years: '5 à 8 ans' },
  { id: 'lead', label: 'Responsable', years: '8 ans et plus' },
];

const fieldClass =
  'w-full border border-tertiary/20 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 bg-white text-tertiary placeholder:text-slate-400';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export const CareerGoalsDefinitionCard: React.FC<CareerGoalsDefinitionCardProps> = ({
  initialCurrentRole = 'Préparateur de commandes',
  initialTargetRole = 'COMPTABLE',
  initialTimeframeMonths = 6,
  initialFieldOfStudy = '',
  initialCompetencies = [],
  initialContext = '',
  initialSeniority = 'junior',
  initialHoursPerWeek = 10,
  readinessScore = 36,
  isGenerating = false,
  onGenerateStrategy,
  layoutMode = 'split',
  className = '',
}) => {
  const [currentRole, setCurrentRole] = useState(initialCurrentRole);
  const [targetRole, setTargetRole] = useState(initialTargetRole);
  const [timeframeMonths, setTimeframeMonths] = useState<3 | 6 | 12>(initialTimeframeMonths);
  const [fieldOfStudy, setFieldOfStudy] = useState(initialFieldOfStudy);
  const [competencies, setCompetencies] = useState(initialCompetencies.join(', '));
  const [context, setContext] = useState(initialContext);
  const [seniority, setSeniority] = useState<GoalSeniority>(initialSeniority);
  const [hoursPerWeek, setHoursPerWeek] = useState(initialHoursPerWeek);
  const [error, setError] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (initialCurrentRole) setCurrentRole(initialCurrentRole);
  }, [initialCurrentRole]);

  useEffect(() => {
    if (initialTargetRole) setTargetRole(initialTargetRole);
  }, [initialTargetRole]);

  useEffect(() => {
    if (initialTimeframeMonths) setTimeframeMonths(initialTimeframeMonths);
  }, [initialTimeframeMonths]);

  useEffect(() => {
    setFieldOfStudy(initialFieldOfStudy);
  }, [initialFieldOfStudy]);

  useEffect(() => {
    setCompetencies(initialCompetencies.join(', '));
    // The array identity changes on every render; its content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCompetencies.join('|')]);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  useEffect(() => {
    setSeniority(initialSeniority);
  }, [initialSeniority]);

  useEffect(() => {
    setHoursPerWeek(initialHoursPerWeek);
  }, [initialHoursPerWeek]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError('Veuillez indiquer un poste cible souhaité.');
      return;
    }
    setError('');
    try {
      await onGenerateStrategy(
        currentRole.trim() || 'Préparateur de commandes',
        targetRole.trim() || 'COMPTABLE',
        timeframeMonths,
        {
          fieldOfStudy: fieldOfStudy.trim() || undefined,
          competencies: competencies.split(',').map((item) => item.trim()).filter(Boolean),
          context: context.trim() || undefined,
          seniority,
          hoursPerWeek,
        }
      );
      setHasGenerated(true);
      setTimeout(() => setHasGenerated(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération de la stratégie.');
    }
  };

  const timeframeLabel = `${timeframeMonths} mois`;
  const totalHours = hoursPerWeek * 4 * timeframeMonths;

  const formContent = (
    <div className="bg-white rounded-lg p-6 space-y-5">
      <h2 className="text-xl font-black text-tertiary">Définir vos objectifs</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label htmlFor="goal-current-role" className={labelClass}>Poste Actuel</label>
            <input
              id="goal-current-role"
              type="text"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="ex: Préparateur de commandes"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="goal-target-role" className={labelClass}>Poste Cible Souhaité</label>
            <input
              id="goal-target-role"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="ex: COMPTABLE"
              className={`${fieldClass} font-bold`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="goal-field" className={labelClass}>Domaine ou formation</label>
            <input
              id="goal-field"
              type="text"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="ex: Droit, Marketing, Mécanique"
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="goal-competencies" className={labelClass}>Compétences et savoir-faire</label>
            <input
              id="goal-competencies"
              type="text"
              value={competencies}
              onChange={(e) => setCompetencies(e.target.value)}
              placeholder="Séparez-les par des virgules : négociation, Excel, analyse financière"
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="goal-context" className={labelClass}>Contexte ou objectif personnel</label>
            <textarea
              id="goal-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="Décrivez votre projet, vos contraintes ou le type de poste recherché."
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>

        <div>
          <p className={labelClass}>Niveau visé</p>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {SENIORITY_OPTIONS.map((option) => {
              const isSelected = seniority === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSeniority(option.id)}
                  aria-pressed={isSelected}
                  className={`py-2 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-tertiary text-white border-tertiary'
                      : 'bg-white text-tertiary border-tertiary/20 hover:border-tertiary'
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className={`block text-xs ${isSelected ? 'text-white/75' : 'text-[#456071]'}`}>{option.years}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={`${labelClass} mb-1.5`}>
            Horizon : {timeframeLabel}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([3, 6, 12] as const).map((months) => {
              const isSelected = timeframeMonths === months;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => setTimeframeMonths(months)}
                  aria-pressed={isSelected}
                  className={`py-2 px-2 text-sm font-bold rounded-lg border text-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-tertiary text-white border-tertiary'
                      : 'bg-white text-tertiary border-tertiary/20 hover:border-tertiary'
                  }`}
                >
                  {months} mois
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="goal-hours" className={labelClass}>
            Disponibilité : {hoursPerWeek} h par semaine
          </label>
          <input
            id="goal-hours"
            type="range"
            min={2}
            max={30}
            step={1}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            className="w-full accent-[#007568] cursor-pointer"
          />
          <div className="flex items-center justify-between text-xs text-[#456071]">
            <span>2 h, léger</span>
            <span>10 h, recommandé</span>
            <span>30 h, intensif</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-[#007568] hover:bg-[#006257] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-3 cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Analyse en cours...
            </>
          ) : hasGenerated ? (
            <>
              <CheckCircle2 size={15} /> Stratégie synchronisée
            </>
          ) : (
            'Générer la stratégie'
          )}
        </button>

        {error && (
          <p role="alert" className="text-xs font-semibold text-red-600 pt-1">
            {error}
          </p>
        )}
      </form>
    </div>
  );

  const readinessContent = (
    <div className="bg-tertiary text-white rounded-lg p-6 flex flex-col justify-center">
      <p className="text-sm font-bold text-white/75">Score de préparation cible</p>
      <p className="mt-2 text-7xl font-black leading-none text-accent tabular-nums">
        {readinessScore}<span className="text-3xl">%</span>
      </p>
      <p className="mt-4 text-sm text-white/80 leading-relaxed">
        Basé sur votre profil actuel comparé aux exigences du marché pour le poste de{' '}
        <span className="font-bold text-white">{targetRole.trim() || 'COMPTABLE'}</span>.
      </p>
      <p className="mt-6 pt-4 border-t border-white/15 text-sm text-white/80 leading-relaxed">
        À {hoursPerWeek} h par semaine pendant {timeframeMonths} mois, vous investirez environ{' '}
        <span className="font-bold text-white">{totalHours} heures</span> de formation.
      </p>
    </div>
  );

  if (layoutMode === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {formContent}
        {readinessContent}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch ${className}`}>
      <div className="md:col-span-7">{formContent}</div>
      <div className="md:col-span-5 flex flex-col justify-stretch">{readinessContent}</div>
    </div>
  );
};
