import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export interface QuestionTipResult {
  question: string;
  tips: string[];
}

export interface QuestionAnalysisResult {
  question_id: number;
  is_relevant: boolean;
  relevance_explanation: string;
  scores: {
    star_structure: number;
    technical_expertise: number;
    clarity: number;
    posture_confidence: number;
  };
  overall_question_score: number;
  feedback_strengths: string[];
  feedback_improvements: string[];
}

export interface InterviewAnalysisResult {
  questionResults: QuestionAnalysisResult[];
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: string[];
}

export class InterviewAIEngine {
  private registry = AIProviderRegistry.getInstance();

  async getInterviewQuestion(
    jobTitle: string,
    category: string,
    difficulty: string
  ): Promise<QuestionTipResult> {
    const provider = await this.registry.getFor('interview');
    const prompt = AI_PROMPTS.interview.getQuestion(jobTitle, category, difficulty);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    try {
      return JSON.parse(res.text);
    } catch {
      return {
        question: `Comment gérez-vous la résolution d'incidents complexes en tant que ${jobTitle} ?`,
        tips: [
          'Utilisez la structure STAR (Situation, Tâche, Action, Résultat).',
          'Mentionnez vos réflexes d\'analyse d\'impact et de communication d\'équipe.',
          'Quantifiez les bénéfices de la solution mise en place.',
        ],
      };
    }
  }

  async generateInterviewQuestions(
    role: string,
    seniority: string,
    count: number = 5,
    jobDescription = '',
    company = '',
    interviewType = '',
    language: 'en' | 'fr' = 'fr'
  ): Promise<any[]> {
    const provider = await this.registry.getFor('interview');
    const prompt = AI_PROMPTS.interview.generateList(
      role,
      seniority,
      count,
      jobDescription,
      company,
      interviewType,
      language
    );
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    try {
      return JSON.parse(res.text);
    } catch {
      return [
        {
          id: 'q1',
          question: `Pouvez-vous décrire un projet récent où vous avez dû convaincre des parties prenantes exigeantes ?`,
          category: 'Comportemental',
        },
      ];
    }
  }

  async analyzeInterviewSession(
    transcript: { question: string; answer: string }[]
  ): Promise<InterviewAnalysisResult> {
    const provider = await this.registry.getFor('interview');
    const prompt = AI_PROMPTS.interview.analyzeSession(transcript);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });

    try {
      const parsed = JSON.parse(res.text);
      if (!parsed.questionResults || !Array.isArray(parsed.questionResults)) {
        throw new Error('Missing questionResults array');
      }
      return parsed as InterviewAnalysisResult;
    } catch (err) {
      const detail = err instanceof Error ? err.message : res.text?.slice(0, 200);
      throw new Error(`Interview analysis failed: ${detail}`);
    }
  }

  async *streamInterviewFeedback(transcript: string): AsyncGenerator<string> {
    const provider = await this.registry.getFor('interview');
    const generator = provider.stream({
      prompt: `Analyse en continu la réponse d'entretien suivante et donne un retour formatif immédiat :\n\n${transcript}`,
    });

    for await (const chunk of generator) {
      yield chunk;
    }
  }
}

export const interviewAIEngine = new InterviewAIEngine();
