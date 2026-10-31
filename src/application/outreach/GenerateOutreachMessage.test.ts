import { GenerateOutreachMessageUseCase } from './GenerateOutreachMessage';
import { IAIProvider } from '../../shared/ai/IAIProvider';
import { AIRequest, AIResponse } from '../../shared/ai/types';
import { EntitlementService } from '../billing/EntitlementGate';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

class MockEntitlementService extends EntitlementService {
  constructor() {
    super({} as any);
  }
  override async checkEntitlement(): Promise<{ allowed: boolean }> {
    return { allowed: true };
  }
}

class MockOutreachAIProvider implements IAIProvider {
  readonly name = 'mock-outreach-ai';
  readonly model = 'claude-3-haiku';
  public lastRequest?: AIRequest;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async *stream(): AsyncGenerator<string> {
    yield '';
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    this.lastRequest = request;
    // Generate long mock text for testing length enforcement
    return {
      text: 'Bonjour, Je suis vivement intéressé par le poste de Développeur Full Stack Senior au sein de votre équipe. ' +
        'Avec plus de 6 ans d\'expérience en TypeScript, React et Node.js, j\'ai accompagné plusieurs entreprises dans la mise en place d\'architectures scalables. ' +
        'Je serais ravi d\'échanger avec vous sur vos enjeux techniques actuels. Bien cordialement, Jean Dupont.',
      model: this.model,
      provider: this.name,
    };
  }
}

export function runOutreachApplicationTests() {
  return (async () => {
    let testCount = 0;

    // Test 1: Outreach application generates message and enforces 300 char limit on connection note
    testCount++;
    const mockAi = new MockOutreachAIProvider();
    const mockEntitlement = new MockEntitlementService();
    const useCase = new GenerateOutreachMessageUseCase(mockAi, mockEntitlement);

    const result = await useCase.execute({
      cvSummary: 'Développeur Full Stack 6 ans XP, React, Node.js',
      jobOfferInput: 'Développeur Full Stack Senior chez TechCorp',
      channel: 'linkedin_connection_note',
      language: 'fr',
    }, 'test-user-id');

    assert(result.channel === 'linkedin_connection_note', 'Channel must match input');
    assert(
      result.content.length <= 300,
      `LinkedIn connection note content must be <= 300 chars, got ${result.content.length}`
    );
    assert(
      mockAi.lastRequest?.system?.includes('Maximum 300 characters') === true,
      'System prompt must include max length constraint for connection note'
    );
    assert(
      mockAi.lastRequest?.system?.includes('French') === true,
      'System prompt must specify French register by default'
    );

    // Test 2: Cold email channel allows longer text and includes full details
    testCount++;
    const emailResult = await useCase.execute({
      cvSummary: 'Développeur Full Stack 6 ans XP, React, Node.js',
      jobOfferInput: 'Développeur Full Stack Senior chez TechCorp',
      channel: 'cold_email',
      language: 'fr',
    }, 'test-user-id');

    assert(emailResult.channel === 'cold_email', 'Channel must be cold_email');
    assert(
      emailResult.content.length > 100,
      'Cold email content generated properly'
    );

    return { passed: true, testCount };
  })();
}
