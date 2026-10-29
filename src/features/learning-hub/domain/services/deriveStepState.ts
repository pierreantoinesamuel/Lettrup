import { Milestone, SkillProgress, StepState } from '../types';

export function deriveStepState(
  milestone: Milestone,
  allMilestones: Milestone[],
  progress: SkillProgress[]
): StepState {
  const validatedSkills = new Set(
    progress.filter((p) => p.state === 'validated').map((p) => p.skill.toLowerCase())
  );
  const inProgressSkills = new Set(
    progress.filter((p) => p.state === 'learning' || p.state === 'practiced').map((p) => p.skill.toLowerCase())
  );

  // Check if all skills in this milestone are validated
  const milestoneSkills = milestone.skills.map((s) => s.toLowerCase());
  const allSkillsValidated = milestoneSkills.every((s) => validatedSkills.has(s));

  if (allSkillsValidated && milestoneSkills.length > 0) {
    return 'completed';
  }

  // Check if prerequisites are satisfied
  if (milestone.prerequisites && milestone.prerequisites.length > 0) {
    const prereqMilestones = allMilestones.filter((m) => milestone.prerequisites.includes(m.id));
    const allPrereqsCompleted = prereqMilestones.every((pm) =>
      pm.skills.every((s) => validatedSkills.has(s.toLowerCase()))
    );

    if (!allPrereqsCompleted) {
      return 'locked';
    }
  }

  // Check if any skill in this milestone is currently being learned
  const hasSkillsInProgress = milestoneSkills.some((s) => inProgressSkills.has(s));
  if (hasSkillsInProgress) {
    return 'in_progress';
  }

  return 'new';
}
