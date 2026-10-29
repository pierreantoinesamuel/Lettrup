import { Roadmap, WeeklyTask } from '../types';

export function deriveWeeklyPlan(roadmap: Roadmap, hoursPerWeek: number): WeeklyTask[] {
  const tasks: WeeklyTask[] = [];
  let currentWeek = 1;
  let currentWeekHours = 0;

  roadmap.milestones.forEach((milestone, idx) => {
    milestone.skills.forEach((skill, sIdx) => {
      const resourceRef = milestone.resourceRefs ? milestone.resourceRefs[sIdx % milestone.resourceRefs.length] : undefined;
      const estimatedHoursForSkill = Math.max(2, Math.round(milestone.estHours / milestone.skills.length));

      if (currentWeekHours + estimatedHoursForSkill > hoursPerWeek && currentWeekHours > 0) {
        currentWeek++;
        currentWeekHours = 0;
      }

      tasks.push({
        id: `wt-${roadmap.goalId}-${milestone.id}-${sIdx}`,
        goalId: roadmap.goalId,
        weekNumber: currentWeek,
        skill,
        description: `Maitriser ${skill} : suivre le module ${milestone.title}`,
        resourceRef,
        status: 'todo',
      });

      currentWeekHours += estimatedHoursForSkill;
    });
  });

  return tasks;
}
