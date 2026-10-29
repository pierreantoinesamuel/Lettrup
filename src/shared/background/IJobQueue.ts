export type JobType =
  | 'resume-parse'
  | 'ats-score'
  | 'career-strategy'
  | 'pdf-export'
  | 'portfolio-publish'
  | 'interview-score';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job<T = any, R = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  result?: R;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IJobQueue {
  enqueue<T, R>(type: JobType, data: T): Promise<Job<T, R>>;
  getJob<T, R>(jobId: string): Promise<Job<T, R> | null>;
  cancelJob(jobId: string): Promise<boolean>;
}
