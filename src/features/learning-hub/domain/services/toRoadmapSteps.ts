import { Roadmap, RoadmapStep, SkillProgress } from '../types';
import { deriveStepState } from './deriveStepState';

export function toRoadmapSteps(roadmap: Roadmap, progress: SkillProgress[]): RoadmapStep[] {
  return roadmap.milestones.map((m) => {
    const state = deriveStepState(m, roadmap.milestones, progress);
    return {
      milestoneId: m.id,
      order: m.order,
      title: m.title,
      state,
      sourceTag: m.sourceTag || 'youtube',
      iconKey: m.iconKey,
      skills: m.skills,
      estHours: m.estHours,
      activitiesCount: m.activities ? m.activities.length : m.skills.length,
    };
  });
}
