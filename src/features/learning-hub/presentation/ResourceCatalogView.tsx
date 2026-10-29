import React, { useEffect, useState } from 'react';
import { ExternalLink, ThumbsUp, ThumbsDown, Loader2, AlertCircle, Lock, CheckCircle2 } from 'lucide-react';
import { ResourceRef, SkillGap, ResourceProvider, Roadmap, SkillProgress } from '../domain/types';
import {
  buildFallbackResourcesForSkill,
  deriveCatalogCourses,
} from '../domain/services/careerGpsBlueprint';

interface ResourceCatalogViewProps {
  gaps: SkillGap[];
  roadmap?: Roadmap | null;
  progress?: SkillProgress[];
  onLoadResources: (skill: string, targetLevel: SkillGap['targetLevel']) => Promise<ResourceRef[]>;
  onFeedback?: (skill: string, provider: ResourceProvider, rating: 'up' | 'down') => void;
  onReanalyze?: () => void;
  readiness?: number;
}

export const ResourceCatalogView: React.FC<ResourceCatalogViewProps> = ({
  gaps,
  roadmap = null,
  progress = [],
  onLoadResources,
  onFeedback,
  onReanalyze,
  readiness = 36,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string>(gaps[0]?.skill || '');
  const [ratedMap, setRatedMap] = useState<Record<string, 'up' | 'down'>>({});
  const [resources, setResources] = useState<ResourceRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (gaps.length > 0 && !gaps.some((g) => g.skill === selectedSkill)) {
      setSelectedSkill(gaps[0].skill);
    }
  }, [gaps, selectedSkill]);

  const currentGap = gaps.find((g) => g.skill === selectedSkill) || gaps[0];
  const { curatedPhase1, lockedTopics } = deriveCatalogCourses(gaps, roadmap, progress);

  useEffect(() => {
    if (!currentGap) {
      setResources([]);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setLoadError('');
    onLoadResources(currentGap.skill, currentGap.targetLevel)
      .then((nextResources) => {
        if (!isCurrent) return;
        if (nextResources && nextResources.length > 0) {
          setResources(nextResources);
        } else {
          setResources(buildFallbackResourcesForSkill(currentGap.skill, roadmap));
        }
      })
      .catch((error) => {
        if (!isCurrent) return;
        const fallback = buildFallbackResourcesForSkill(currentGap.skill, roadmap);
        if (fallback.length > 0) {
          setResources(fallback);
          setLoadError('');
        } else {
          setResources([]);
          setLoadError(error instanceof Error ? error.message : 'Impossible de charger les ressources.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [currentGap?.skill, currentGap?.targetLevel, onLoadResources, roadmap]);

  const handleRate = (provKey: ResourceProvider, rating: 'up' | 'down') => {
    setRatedMap((prev) => ({ ...prev, [`${selectedSkill}-${provKey}`]: rating }));
    if (onFeedback) onFeedback(selectedSkill, provKey, rating);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* The few courses worth doing now */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-3xl sm:text-4xl font-black text-tertiary tracking-tight leading-tight">
              {curatedPhase1.length} formations pour la phase 1
            </h3>
            <p className="mt-2 text-sm text-[#456071] max-w-2xl leading-relaxed">
              Plutôt que des centaines de cours, seules les formations utiles à votre phase 1 sont affichées. Le reste attend que vous en ayez besoin.
            </p>
          </div>
          {onReanalyze && (
            <button
              type="button"
              onClick={onReanalyze}
              className="shrink-0 self-start md:self-auto text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary cursor-pointer"
            >
              Régénérer le parcours
            </button>
          )}
        </div>

        <ol className="mt-6 divide-y divide-tertiary/10 border-y-2 border-tertiary">
          {curatedPhase1.map((course, idx) => {
            const isCompleted = course.status === 'completed';
            return (
              <li key={course.id} className="py-5 grid grid-cols-1 md:grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-4 gap-y-3 md:items-center">
                <span className="text-2xl font-black tabular-nums text-[#007568]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#456071]">
                    {course.phaseLabel} · objectif {course.deltaLabel} · {course.duration}
                  </p>
                  <h4 className="mt-0.5 text-lg font-black text-tertiary leading-snug">{course.title}</h4>
                  <p className="mt-1 text-sm text-[#244354] leading-relaxed">{course.why}</p>
                </div>
                <div className="flex items-center gap-4 md:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedSkill(course.skill)}
                    className="text-sm font-bold text-tertiary underline underline-offset-4 hover:text-[#007568] cursor-pointer"
                  >
                    Voir les vidéos
                  </button>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                      isCompleted
                        ? 'bg-primary-container text-tertiary hover:bg-primary-container/70'
                        : 'bg-tertiary text-white hover:bg-[#093b50]'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#007568]" /> Acquis
                      </>
                    ) : (
                      'Étudier'
                    )}
                  </a>
                </div>
              </li>
            );
          })}
        </ol>

        {lockedTopics.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-bold text-[#456071]">
              Plus tard : modules des phases 2 et 3 (score actuel {readiness}%)
            </p>
            <ul className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
              {lockedTopics.map((item) => (
                <li key={item.title} className="flex items-start gap-2 text-sm text-slate-500">
                  <Lock className="w-3.5 h-3.5 mt-1 shrink-0" />
                  <span>
                    {item.title}
                    <span className="block text-xs">
                      {item.phase}, débloqué à {item.unlockAt}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Videos by skill */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-black text-tertiary">Vidéos par compétence</h3>
          <p className="mt-1 text-sm text-[#456071]">
            Vidéos YouTube choisies selon la compétence et le niveau visé sur votre courbe.
          </p>
        </div>

        <div role="tablist" aria-label="Compétences" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-tertiary/15">
          {gaps.map((gap) => {
            const isSelected = gap.skill === selectedSkill;
            const isLockedPhase = gap.currentLevel === 0 && gap.priority !== 'critical' && readiness < 55;
            return (
              <button
                key={gap.skill}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedSkill(gap.skill)}
                className={`-mb-px pb-2.5 pt-1 text-sm border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-tertiary text-tertiary font-black'
                    : isLockedPhase
                    ? 'border-transparent text-slate-400 hover:text-tertiary font-semibold'
                    : 'border-transparent text-[#456071] hover:text-tertiary font-semibold'
                }`}
              >
                {isLockedPhase && <Lock className="w-3 h-3" />}
                <span>{gap.skill}</span>
              </button>
            );
          })}
        </div>

        {currentGap && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xl font-black text-tertiary">{currentGap.skill}</h4>
                <p className="text-sm text-[#456071] max-w-2xl">{currentGap.rationale}</p>
              </div>
              <p className="text-sm font-bold text-tertiary shrink-0">Niveau visé : {currentGap.targetLevel} sur 5</p>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm font-semibold text-[#456071]">
                <Loader2 size={18} className="animate-spin" /> Recherche de vidéos pertinentes...
              </div>
            ) : loadError ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-[#fff1df] p-4 text-sm text-amber-900">
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> {loadError}
              </div>
            ) : resources.length === 0 ? (
              <p className="py-6 text-sm text-[#456071]">Aucune vidéo pertinente trouvée pour cette compétence.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                {resources.map((resource) => {
                  const rating = ratedMap[`${selectedSkill}-${resource.provider}`];
                  return (
                    <article key={resource.searchUrl}>
                      {resource.thumbnailUrl && (
                        <img
                          src={resource.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full object-cover rounded-lg"
                        />
                      )}
                      <p className="mt-3 text-xs font-semibold text-[#456071]">
                        YouTube{resource.channelName ? `, ${resource.channelName}` : ''}
                      </p>
                      <h5 className="mt-0.5 line-clamp-2 text-base font-black text-tertiary leading-snug">
                        {resource.title}
                      </h5>
                      <p className="mt-1 line-clamp-3 text-sm text-[#244354]">{resource.why}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <a
                          href={resource.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#007568] underline underline-offset-4 hover:text-tertiary"
                        >
                          Voir la vidéo <ExternalLink size={13} />
                        </a>
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            type="button"
                            aria-label="Ressource utile"
                            aria-pressed={rating === 'up'}
                            onClick={() => handleRate(resource.provider, 'up')}
                            className={`p-1.5 rounded hover:bg-white ${rating === 'up' ? 'text-[#007568]' : ''}`}
                          >
                            <ThumbsUp size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Ressource non pertinente"
                            aria-pressed={rating === 'down'}
                            onClick={() => handleRate(resource.provider, 'down')}
                            className={`p-1.5 rounded hover:bg-white ${rating === 'down' ? 'text-[var(--status-red)]' : ''}`}
                          >
                            <ThumbsDown size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
