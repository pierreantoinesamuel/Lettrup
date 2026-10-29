import React, { useEffect, useState } from 'react';
import { 
  Compass, Target, TrendingUp, CheckSquare, BookOpen, Sparkles, 
  ChevronRight, Award, Zap, Loader2, Plus, Trash2, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SupabaseLearningRepository } from '../../features/learning-hub/infrastructure/SupabaseLearningRepository';
import { RemoteLearningAIAdapter } from '../../features/learning-hub/infrastructure/RemoteLearningAIAdapter';
import { AnalyzeSkillGapUseCase } from '../../features/learning-hub/use-cases/AnalyzeSkillGapUseCase';
import { GenerateRoadmapUseCase } from '../../features/learning-hub/use-cases/GenerateRoadmapUseCase';
import { listUserResumes } from '../../lib/resumeStore';
import { adaptResumeDataToProfile } from '../../lib/resumeAdapter';
import { resolvePrimaryResume } from '../../domain/user/PrimaryResume';
import type { CareerGoal, Roadmap, SkillGapReport } from '../../features/learning-hub/domain/types';

const learningRepository = new SupabaseLearningRepository();
const learningAI = new RemoteLearningAIAdapter();
const analyzeSkillGaps = new AnalyzeSkillGapUseCase(learningRepository, learningAI);
const generateRoadmap = new GenerateRoadmapUseCase(learningRepository, learningAI);

export default function CareerStrategyView() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [timeframe, setTimeframe] = useState('6 mois');
  const [activeGoal, setActiveGoal] = useState<CareerGoal | null>(null);
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [strategyError, setStrategyError] = useState('');
  const [strategy, setStrategy] = useState<{
    targetTitle: string;
    readinessScore: number;
    skillGaps: { skill: string; currentLevel: number; requiredLevel: number; category: string }[];
    actionItems: { id: string; title: string; completed: boolean; timeframe: string }[];
    milestones: { title: string; date: string; description: string }[];
  }>({ targetTitle: '', readinessScore: 0, skillGaps: [], actionItems: [], milestones: [] });

  const syncFromLearningHub = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const learning = await learningRepository.getActiveGoal(user.id);
      setActiveGoal(learning);
      if (!learning) return;
      const [nextReport, nextRoadmap, resumes, tasks] = await Promise.all([
        learningRepository.getLatestReport(user.id, learning.id),
        learningRepository.getRoadmap(user.id, learning.id),
        listUserResumes(user.id),
        learningRepository.listTasks(user.id, learning.id),
      ]);
      const primary = resolvePrimaryResume(resumes);
      const profile = primary ? adaptResumeDataToProfile(primary.resumeData) : null;
      setReport(nextReport);
      setRoadmap(nextRoadmap);
      setCurrentRole(learning.currentRole || profile?.experience[0]?.role || user.targetTitle || '');
      setTargetRole(learning.targetRole);
      setTimeframe(`${learning.timeframeMonths} mois`);
      setStrategy({
        targetTitle: learning.targetRole,
        readinessScore: nextReport
          ? Math.round((nextReport.strengths.length / Math.max(1, nextReport.strengths.length + nextReport.gaps.length)) * 100)
          : 0,
        skillGaps: (nextReport?.gaps || []).map((gap) => ({ skill: gap.skill, currentLevel: gap.currentLevel * 20, requiredLevel: gap.targetLevel * 20, category: gap.priority })),
        actionItems: tasks.map((task) => ({
          id: task.id,
          title: task.description,
          completed: task.status === 'done',
          timeframe: `Semaine ${task.weekNumber}`,
        })),
        milestones: (nextRoadmap?.milestones || []).map((milestone) => ({ title: milestone.title, date: `Étape ${milestone.order}`, description: `Compétences : ${milestone.skills.join(', ')}` })),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { syncFromLearningHub(); }, [user?.id]);

  const toggleActionItem = async (id: string) => {
    if (!user?.id) return;
    const item = strategy.actionItems.find((action) => action.id === id);
    if (!item) return;
    try {
      await learningRepository.setTaskStatus(user.id, id, item.completed ? 'todo' : 'done');
      setStrategy((current) => ({
        ...current,
        actionItems: current.actionItems.map((action) => action.id === id
          ? { ...action, completed: !action.completed }
          : action),
      }));
    } catch {
      setStrategyError('Impossible de mettre à jour cette action. Réessayez.');
    }
  };

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setStrategyError('Connectez-vous pour générer votre stratégie.');
      return;
    }

    const timeframeMonths = Number.parseInt(timeframe, 10);
    if (!targetRole.trim() || ![3, 6, 12].includes(timeframeMonths)) {
      setStrategyError('Indiquez un poste cible et un horizon de 3, 6 ou 12 mois.');
      return;
    }

    setIsGenerating(true);
    setStrategyError('');
    let goalSaved = false;
    try {
      const resumes = await listUserResumes(user.id);
      const primary = resolvePrimaryResume(resumes);
      const profile = primary ? adaptResumeDataToProfile(primary.resumeData) : null;
      const currentRoleValue = currentRole.trim() || profile?.experience[0]?.role || user.targetTitle || '';
      const competencies = Array.from(new Set([...(user.skills || []), ...(profile?.skills || [])])).filter(Boolean);

      if (!currentRoleValue) {
        throw new Error('Ajoutez votre poste actuel ou renseignez-le dans votre profil avant de continuer.');
      }
      if (competencies.length === 0) {
        throw new Error('Ajoutez des compétences à votre profil ou à votre CV pour analyser les écarts.');
      }

      const goal = await learningRepository.saveGoal(user.id, {
        currentRole: currentRoleValue,
        targetRole: targetRole.trim(),
        timeframeMonths: timeframeMonths as 3 | 6 | 12,
        hoursPerWeek: activeGoal?.hoursPerWeek || 5,
        competencies,
        seniority: activeGoal?.seniority || 'mid',
        lang: 'fr',
      });
      goalSaved = true;

      const nextReport = await analyzeSkillGaps.execute(user.id, {
        goalId: goal.id,
        targetRole: goal.targetRole,
        currentRole: goal.currentRole,
        seniority: goal.seniority,
        currentSkills: competencies.map((skill) => ({ skill, evidence: 'Compétence déclarée dans le profil ou le CV principal.' })),
        competencies,
        lang: 'fr',
      }, true);

      await generateRoadmap.execute(user.id, {
        report: nextReport,
        hoursPerWeek: goal.hoursPerWeek,
        timeframeMonths: goal.timeframeMonths,
        lang: 'fr',
      }, true);

      await syncFromLearningHub();
    } catch (error) {
      if (goalSaved) await syncFromLearningHub().catch(() => undefined);
      setStrategyError(error instanceof Error ? error.message : 'Impossible de générer la stratégie pour le moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with dark blue gradient */}
      <div className="bg-[#062b3b] text-white p-6 sm:p-8 rounded-3xl border border-white/[0.07] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--status-orange)]/20 border border-[var(--status-orange)]/40 text-[var(--status-orange)] text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Compass size={14} />
            ORIENTATION & PLAN DE CARRIÈRE
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 mb-2">
            Stratégie de Carrière & Évolution
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Cartographiez vos objectifs professionnels, identifiez vos lacunes de compétences et passez à l'action.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Setup & Readiness Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Target size={16} className="text-indigo-600" /> Définir vos Objectifs
              </h2>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                AI Career Engine
              </span>
            </div>

            <form onSubmit={handleGenerateStrategy} className="space-y-3.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste Actuel</label>
                <input
                  type="text"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="ex: Développeur Full Stack Mid"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base font-medium focus:outline-none focus:border-indigo-600 focus:bg-white bg-gray-50/80 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste Cible Souhaité</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="ex: Head of Engineering / VP Tech"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base font-medium focus:outline-none focus:border-indigo-600 focus:bg-white bg-gray-50/80 transition-all text-gray-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">Horizon Temporel</label>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {timeframe}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['3 mois', '6 mois', '12 mois'].map((tf) => {
                    const isSelected = timeframe === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-[#007568] hover:opacity-90 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all mt-3 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Analyse IA en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-[var(--status-orange)]" /> Générer la stratégie
                  </>
                )}
              </button>
              {strategyError && <p role="alert" className="text-xs font-semibold text-red-600">{strategyError}</p>}
            </form>
          </div>

          {!isLoading && !activeGoal && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-sm text-indigo-900">
              Créez d’abord un parcours personnalisé dans le Learning Hub. Cette page affichera ensuite automatiquement votre CV, vos écarts de compétences et vos étapes de progression.
            </div>
          )}

          {/* Readiness Score */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Score de Préparation Cible</span>
            <div className="text-4xl font-extrabold text-gray-900">{strategy.readinessScore} %</div>
            <p className="text-xs text-gray-500">
              Basé sur votre profil actuel comparé aux exigences du marché pour le poste de <span className="font-semibold text-gray-700">{strategy.targetTitle}</span>.
            </p>
          </div>
        </div>

        {/* Right Column: Skill Gaps & Action Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Skill Gaps Breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Analyse des Écarts de Compétences
            </h2>

            <div className="space-y-4">
              {strategy.skillGaps.map((sg, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800">{sg.skill}</span>
                    <span className="text-gray-500 font-medium">Niveau {sg.currentLevel}% / {sg.requiredLevel}% Requis</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: `${sg.currentLevel}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items Roadmap */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <CheckSquare size={18} className="text-[var(--status-green)]" /> Plan d'Action Recommandé
            </h2>

            <div className="space-y-2">
              {strategy.actionItems.map((act) => (
                <div
                  key={act.id}
                  onClick={() => toggleActionItem(act.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    act.completed ? 'bg-gray-50 border-gray-200 text-gray-400 line-through' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={act.completed}
                    onChange={() => {}}
                    className="rounded text-gray-900 focus:ring-gray-900 cursor-pointer"
                  />
                  <div className="flex-1 text-xs font-semibold">{act.title}</div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                    {act.timeframe}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Target size={18} className="text-[var(--status-purple)]" /> Jalons d'Évolution
            </h2>

            <div className="relative border-l-2 border-gray-200 ml-3 pl-6 space-y-6">
              {strategy.milestones.map((ms, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-gray-900 border-2 border-white shadow-sm" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase">{ms.date}</span>
                  <h4 className="font-bold text-sm text-gray-900 mt-0.5">{ms.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{ms.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
