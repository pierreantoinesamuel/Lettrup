import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export class CoverLetterAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async generateCoverLetter(
    resumeText: string,
    jobDescription: string,
    companyName: string
  ): Promise<string> {
    const provider = await this.registry.getFor('cover-letter');
    const prompt = AI_PROMPTS.coverLetter.generate(resumeText, jobDescription, companyName);
    const res = await provider.complete({ prompt });
    return res.text;
  }

  async generateCoverLetterAdvanced(
    resumeText: string,
    jobDescription: string,
    companyName: string,
    tone: string = 'professionnel'
  ): Promise<string> {
    const provider = await this.registry.getFor('cover-letter');
    const prompt = AI_PROMPTS.coverLetter.generate(resumeText, jobDescription, companyName, tone);
    const res = await provider.complete({ prompt });
    return res.text;
  }

  async reformatCoverLetter(content: string, layoutStyle: string): Promise<string> {
    const provider = await this.registry.getFor('cover-letter');
    const prompt = AI_PROMPTS.coverLetter.reformat(content, layoutStyle);
    const res = await provider.complete({ prompt });
    return res.text;
  }
}

export const coverLetterAIEngine = new CoverLetterAIEngine();
