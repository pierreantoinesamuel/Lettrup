import { Milestone } from '../types';
import { LearningCycleDependencyError } from '../errors';

export class SkillDependencyResolver {
  /**
   * Validates that the milestone graph has no circular dependencies,
   * and returns the milestones sorted in valid dependency execution order.
   */
  public static sortAndValidate(milestones: Milestone[]): Milestone[] {
    const map = new Map<string, Milestone>();
    milestones.forEach((m) => map.set(m.id, m));

    const visited = new Set<string>();
    const inStack = new Set<string>();
    const sorted: Milestone[] = [];

    function dfs(nodeId: string, path: string[]) {
      if (inStack.has(nodeId)) {
        throw new LearningCycleDependencyError(
          `Cycle detected in roadmap milestones: ${[...path, nodeId].join(' -> ')}`
        );
      }
      if (visited.has(nodeId)) return;

      inStack.add(nodeId);
      visited.add(nodeId);

      const m = map.get(nodeId);
      if (m && m.prerequisites) {
        for (const prereqId of m.prerequisites) {
          if (map.has(prereqId)) {
            dfs(prereqId, [...path, nodeId]);
          }
        }
      }

      inStack.delete(nodeId);
      sorted.push(m || { id: nodeId, order: 0, title: nodeId, skills: [], estHours: 0, prerequisites: [], resourceRefs: [], sourceTag: 'youtube' });
    }

    for (const m of milestones) {
      if (!visited.has(m.id)) {
        dfs(m.id, []);
      }
    }

    // Re-assign order based on sorted sequence
    return sorted.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
  }
}
