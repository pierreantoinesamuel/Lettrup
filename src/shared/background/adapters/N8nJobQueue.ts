import { IJobQueue, Job, JobType } from '../IJobQueue';

export class N8nJobQueue implements IJobQueue {
  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl =
      webhookUrl ||
      (typeof process !== 'undefined' && process.env?.N8N_WEBHOOK_URL) ||
      'https://n8n.example.com/webhook/cvpilot-queue';
  }

  async enqueue<T, R>(type: JobType, data: T): Promise<Job<T, R>> {
    const id = `n8n_job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const job: Job<T, R> = {
      id,
      type,
      data,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    try {
      fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, type, payload: data }),
      }).catch((err) => console.warn('N8n webhook notification soft failure:', err));
    } catch (e) {
      console.warn('Failed to post to n8n webhook', e);
    }

    return job;
  }

  async getJob<T, R>(jobId: string): Promise<Job<T, R> | null> {
    return {
      id: jobId,
      type: 'ats-score',
      data: {} as T,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    return true;
  }
}
