import { recommendTemplatesForRole, TemplateRecommendationCandidate } from './templateRecommendation';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runTemplateRecommendationTests() {
  const templates: TemplateRecommendationCandidate[] = [
    { id: 'creative', name: 'Creative', categories: ['modern'], description: 'Portfolio coloré', candidateRole: 'Designer graphique' },
    { id: 'accounting', name: 'Comptabilité', categories: ['professional', 'ats'], description: 'CV comptable structuré', candidateRole: 'Comptable' },
    { id: 'general', name: 'Classic', categories: ['professional', 'ats'], description: 'Mise en page sobre', candidateRole: 'Profil professionnel' },
  ];

  const matched = recommendTemplatesForRole('Comptable', templates);
  assert(matched[0].template.id === 'accounting', 'Role-specific templates should rank before generic layouts');
  assert(matched[0].reasons.includes('Compatible ATS'), 'Recommendations should explain ATS suitability');

  const fallback = recommendTemplatesForRole('Astronaute', templates);
  assert(fallback[0].template.id === 'accounting', 'Unmatched roles should fall back to ATS-friendly professional templates');
  assert(fallback.length === 3, 'Recommendation count should stay bounded');

  return { testCount: 3 };
}