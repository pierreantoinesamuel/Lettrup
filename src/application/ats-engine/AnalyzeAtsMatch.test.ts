import { parseAtsAnalysisResponse } from './AnalyzeAtsMatch';
import { ATSAIEngine } from '../../features/ats-engine/infrastructure/ai/ATSAIEngine';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export async function runAtsAnalysisValidationTests() {
  let testCount = 0;
  const validReport = {
    keywordScore: 80,
    impactScore: 65,
    formattingScore: 90,
    readabilityScore: 85,
    matchSummary: 'Correspondance solide sur les compétences principales.',
    keywords: [{ keyword: 'TypeScript', category: 'hard_skill', foundInCv: true, frequencyInJobOffer: 2 }],
    riskFlags: [{ category: 'impact', severity: 'warning', message: 'Peu de résultats quantifiés.', recommendation: 'Ajoutez des métriques vérifiables.' }],
    recommendedBulletPoints: ['Décrivez un résultat mesurable réellement obtenu.'],
  };

  testCount++;
  const parsed = parseAtsAnalysisResponse(`\`\`\`json\n${JSON.stringify(validReport)}\n\`\`\``);
  assert(parsed.keywordScore === 80, 'Valid AI score breakdowns should parse');
  assert(parsed.riskFlags[0].id === 'risk-1', 'Missing AI risk IDs should receive a stable report-local identifier');

  testCount++;
  let incompleteReportRejected = false;
  try {
    parseAtsAnalysisResponse(JSON.stringify({ ...validReport, keywordScore: undefined }));
  } catch {
    incompleteReportRejected = true;
  }
  assert(incompleteReportRejected, 'Incomplete AI scores must be rejected instead of replaced with fabricated defaults');

  testCount++;
  const failingRegistry = {
    getFor: async () => ({ complete: async () => { throw new Error('provider unavailable'); } }),
  } as unknown as AIProviderRegistry;
  const engine = new ATSAIEngine(failingRegistry);
  let providerFailureRejected = false;
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    await engine.analyzeJobMatch('A valid job description', 'A valid resume');
  } catch {
    providerFailureRejected = true;
  } finally {
    console.warn = originalWarn;
  }
  assert(providerFailureRejected, 'Provider failures must reject without returning a synthetic ATS score');

  return { testCount };
}