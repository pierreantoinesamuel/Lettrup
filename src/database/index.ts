/**
 * Database Module Root (CV-Pilot / Career Platform)
 * Provides query implementations for both NoSQL (Firebase Firestore)
 * and Relational SQL (Neon Serverless PostgreSQL).
 */

export * from './firebaseQueries';
export * from './neonQueries';

import { FirebaseRepository } from './firebaseQueries';
import { NeonRepository } from './neonQueries';
import { SavedResume, JobApplication } from '../types';

/**
 * Unified Database Interface Abstraction
 * Allows switching seamlessly between Firebase (NoSQL) and Neon (SQL).
 */
export interface IDatabaseRepository {
  getResumesByUser(userId: string): Promise<SavedResume[]>;
  saveResume(userId: string, resume: SavedResume): Promise<string>;
  getApplicationsByStatus(userId: string, status?: string): Promise<JobApplication[]>;
  deleteResume(resumeId: string): Promise<void>;
}

/**
 * Factory helper to select active database provider based on environment config
 */
export function getDatabaseProvider(provider: 'firebase' | 'neon' = 'firebase'): IDatabaseRepository {
  if (provider === 'neon') {
    return NeonRepository;
  }
  return FirebaseRepository;
}
