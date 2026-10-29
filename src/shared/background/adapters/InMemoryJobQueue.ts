import { IJobQueue, Job, JobStatus, JobType } from '../IJobQueue';

export class InMemoryJobQueue implements IJobQueue {
  private jobs = new Map<string, Job>();
  private handlers = new Map<JobType, (data: any) => Promise<any>>();

  public registerHandler(type: JobType, handler: (data: any) => Promise<any>) {
    this.handlers.set(type, handler);
  }

  async enqueue<T, R>(type: JobType, data: T): Promise<Job<T, R>> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const job: Job<T, R> = {
      id,
      type,
      data,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);

    // Asynchronous background execution
    setTimeout(async () => {
      const handler = this.handlers.get(type);
      job.status = 'processing';
      job.updatedAt = new Date().toISOString();

      if (handler) {
        try {
          const res = await handler(data);
          job.result = res;
          job.status = 'completed';
        } catch (err: any) {
          job.error = err.message || 'Error processing job';
          job.status = 'failed';
        }
      } else {
        job.status = 'completed';
      }
      job.updatedAt = new Date().toISOString();
    }, 100);

    return job;
  }

  async getJob<T, R>(jobId: string): Promise<Job<T, R> | null> {
    return (this.jobs.get(jobId) as Job<T, R>) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.updatedAt = new Date().toISOString();
    return true;
  }
}
