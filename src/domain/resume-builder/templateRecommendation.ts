export interface TemplateRecommendationCandidate {
  id: string;
  name: string;
  categories: readonly string[];
  description: string;
  candidateRole: string;
}

export interface TemplateRecommendation<T> {
  template: T;
  reasons: string[];
}

const STOP_WORDS = new Set(['avec', 'pour', 'dans', 'des', 'les', 'une', 'aux', 'the', 'and', 'for', 'from']);

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

export function recommendTemplatesForRole<T extends TemplateRecommendationCandidate>(
  role: string,
  candidates: T[],
  limit = 3
): TemplateRecommendation<T>[] {
  const roleTokens = tokenize(role);
  return candidates
    .map((template, index) => {
      const roleMatches = [...roleTokens].filter((token) => tokenize(template.candidateRole).has(token)).length;
      const descriptionMatches = [...roleTokens].filter((token) => tokenize(template.description).has(token)).length;
      const atsFriendly = template.categories.includes('ats');
      const professional = template.categories.includes('professional');
      const reasons: string[] = [];
      if (roleMatches > 0 || descriptionMatches > 0) reasons.push('Correspond à votre secteur');
      if (atsFriendly) reasons.push('Compatible ATS');
      if (professional) reasons.push('Présentation professionnelle');

      return {
        template,
        index,
        score: roleMatches * 4 + descriptionMatches + (atsFriendly ? 2 : 0) + (professional ? 1 : 0),
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map(({ template, reasons }) => ({
      template,
      reasons: reasons.length > 0 ? reasons : ['Mise en page polyvalente'],
    }));
}