import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { SaveGoalInput } from '../ports/ILearningRepository';

export interface GoalSettingFormProps {
  initialValues?: {
    targetRole?: string;
    currentRole?: string;
    fieldOfStudy?: string;
    competencies?: string[];
    context?: string;
    seniority?: 'junior' | 'mid' | 'senior' | 'lead';
    timeframeMonths?: 1 | 3 | 6 | 12;
    hoursPerWeek?: number;
    strategyId?: string;
  };
  onSaveGoal: (input: SaveGoalInput) => Promise<void>;
  onSuccess?: () => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

const SENIORITY_OPTIONS: Array<{
  id: 'junior' | 'mid' | 'senior' | 'lead';
  label: string;
  years: string;
  description: string;
}> = [
  { id: 'junior', label: 'Junior', years: '0 à 2 ans', description: 'Je découvre le métier et j’acquiers les bases.' },
  { id: 'mid', label: 'Confirmé', years: '2 à 5 ans', description: 'Je travaille en autonomie sur des missions complètes.' },
  { id: 'senior', label: 'Senior', years: '5 à 8 ans', description: 'Je maîtrise le métier et je prends les décisions.' },
  { id: 'lead', label: 'Responsable', years: '8 ans et plus', description: 'J’encadre une équipe et je porte la stratégie.' },
];

const TIMEFRAME_OPTIONS: Array<{
  months: 1 | 3 | 6 | 12;
  label: string;
  desc: string;
}> = [
  { months: 1, label: '1 mois', desc: 'Objectif urgent, préparation immédiate' },
  { months: 3, label: '3 mois', desc: 'Révision rapide des compétences clés' },
  { months: 6, label: '6 mois', desc: 'Progression équilibrée, recommandé' },
  { months: 12, label: '12 mois', desc: 'Reconversion complète' },
];

const fieldClass =
  'w-full px-4 py-3 bg-white border border-tertiary/20 rounded-lg text-sm text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors';
const labelClass = 'block text-sm font-bold text-tertiary';

export const GoalSettingForm: React.FC<GoalSettingFormProps> = ({
  initialValues,
  onSaveGoal,
  onSuccess,
  className = '',
  title = 'Définir un nouvel objectif',
  subtitle = 'L’IA construit votre plan de formation sur mesure et repère les compétences qu’il vous reste à acquérir.',
}) => {
  const [targetRole, setTargetRole] = useState(initialValues?.targetRole || '');
  const [currentRole, setCurrentRole] = useState(initialValues?.currentRole || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(initialValues?.fieldOfStudy || '');
  const [competencies, setCompetencies] = useState((initialValues?.competencies || []).join(', '));
  const [context, setContext] = useState(initialValues?.context || '');
  const [seniority, setSeniority] = useState<'junior' | 'mid' | 'senior' | 'lead'>(
    initialValues?.seniority || 'junior'
  );
  const [timeframeMonths, setTimeframeMonths] = useState<3 | 6 | 12>(
    initialValues?.timeframeMonths || 6
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(initialValues?.hoursPerWeek || 10);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setErrorMsg('Veuillez saisir un intitulé de poste cible.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await onSaveGoal({
        targetRole: targetRole.trim(),
        currentRole: currentRole.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
        competencies: competencies.split(',').map((item) => item.trim()).filter(Boolean),
        context: context.trim() || undefined,
        seniority,
        timeframeMonths,
        hoursPerWeek,
        strategyId: initialValues?.strategyId,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to save goal:', err);
      setErrorMsg('Erreur lors de l\'enregistrement de l\'objectif. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white p-6 md:p-10 rounded-lg border border-tertiary/10 space-y-10 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-tertiary tracking-tight">{title}</h3>
          {subtitle && <p className="mt-2 text-sm text-[#456071] max-w-xl leading-relaxed">{subtitle}</p>}
        </div>

        {savedSuccess && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] shrink-0">
            <Check size={16} /> Objectif enregistré
          </span>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="px-4 py-3 bg-[var(--status-red)]/10 text-[var(--status-red)] text-sm font-semibold rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="learning-target-role" className={labelClass}>Poste visé</label>
          <input
            id="learning-target-role"
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            required
            placeholder="ex : Comptable, Chargé de recrutement, Développeur web"
            className={`${fieldClass} font-semibold`}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="learning-current-role" className={labelClass}>Votre rôle actuel</label>
          <input id="learning-current-role" type="text" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="ex : Assistante administrative" className={fieldClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="learning-field" className={labelClass}>Domaine ou formation</label>
          <input id="learning-field" type="text" value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="ex : Droit, Marketing, Mécanique" className={fieldClass} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="learning-competencies" className={labelClass}>Compétences et savoir-faire</label>
          <input id="learning-competencies" type="text" value={competencies} onChange={(e) => setCompetencies(e.target.value)} placeholder="Séparez-les par des virgules : négociation, Excel, analyse financière" className={fieldClass} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="learning-context" className={labelClass}>Contexte ou objectif personnel</label>
          <textarea id="learning-context" value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="Décrivez votre projet, vos contraintes ou le type de poste recherché." className={`${fieldClass} resize-none`} />
        </div>
      </div>

      <fieldset>
        <legend className={`${labelClass} mb-3`}>Niveau visé</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SENIORITY_OPTIONS.map((option) => {
            const isSelected = seniority === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setSeniority(option.id)}
                aria-pressed={isSelected}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-tertiary bg-primary-container/50'
                    : 'border-tertiary/15 bg-white hover:border-tertiary/40'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`text-base text-tertiary ${isSelected ? 'font-black' : 'font-bold'}`}>{option.label}</span>
                  <span className="text-xs text-[#456071]">{option.years}</span>
                </span>
                <span className="mt-1 block text-xs text-[#456071] leading-snug">{option.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <fieldset>
          <legend className={`${labelClass} mb-3`}>Horizon</legend>
          <div className="divide-y divide-tertiary/10 border-y border-tertiary/10">
            {TIMEFRAME_OPTIONS.map((tf) => {
              const isSelected = timeframeMonths === tf.months;
              return (
                <button
                  type="button"
                  key={tf.months}
                  onClick={() => setTimeframeMonths(tf.months as 3 | 6 | 12)}
                  aria-pressed={isSelected}
                  className={`w-full py-3 px-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-container/50' : 'hover:bg-[#f3f7fa]'
                  }`}
                >
                  <span>
                    <span className={`block text-base text-tertiary ${isSelected ? 'font-black' : 'font-bold'}`}>{tf.label}</span>
                    <span className="block text-xs text-[#456071]">{tf.desc}</span>
                  </span>
                  {isSelected && <Check size={18} className="text-[#007568] shrink-0" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col justify-between gap-6">
          <div>
            <label htmlFor="learning-hours" className={`${labelClass} mb-3`}>Disponibilité par semaine</label>
            <p className="text-4xl font-black text-[#007568] tabular-nums leading-none">
              {hoursPerWeek}<span className="text-lg font-bold text-tertiary"> h</span>
            </p>
            <input
              id="learning-hours"
              type="range"
              min={2}
              max={30}
              step={1}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="mt-4 w-full accent-[#007568] cursor-pointer"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#456071]">
              <span>2 h, léger</span>
              <span>10 h, recommandé</span>
              <span>30 h, intensif</span>
            </div>
          </div>

          <p className="bg-primary-container/50 rounded-lg px-4 py-3 text-sm text-tertiary">
            À {hoursPerWeek} h par semaine pendant {timeframeMonths} mois, vous investirez environ{' '}
            <strong>{hoursPerWeek * 4 * timeframeMonths} heures</strong> de formation.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full sm:w-auto px-8 py-3.5 bg-tertiary hover:bg-[#093b50] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Enregistrement et génération du parcours...' : 'Enregistrer et régénérer le parcours'}
      </button>
    </form>
  );
};
