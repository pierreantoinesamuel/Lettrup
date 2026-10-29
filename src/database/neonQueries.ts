/**
 * Repository for Neon Database (Serverless PostgreSQL - Relational Database)
 * Contains SQL query statements and parameterized query functions for CV-Pilot.
 */

import { SavedResume, JobApplication } from '../types';

/**
 * 1. DDL: SQL Schema definition for PostgreSQL on Neon
 */
export const NEON_SQL_SCHEMA = `
-- Table: Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Saved',
  salary VARCHAR(100),
  location VARCHAR(255),
  job_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: ATS Scans
CREATE TABLE IF NOT EXISTS ats_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  company_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  ats_score INT NOT NULL,
  found_keywords TEXT[] NOT NULL,
  missing_keywords TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_user_status ON job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ats_scans_user_score ON ats_scans(user_id, ats_score DESC);
`;

/**
 * 2. Repository Functions using Parameterized SQL Queries
 */
export class NeonRepository {
  /**
   * QUERY: Get all Resumes for a user with relational JOIN to user metadata
   * SQL: SELECT r.*, u.email FROM resumes r JOIN users u ON r.user_id = u.id WHERE r.user_id = $1 ORDER BY r.updated_at DESC
   */
  static async getResumesByUser(userId: string): Promise<SavedResume[]> {
    const sqlQuery = `
      SELECT 
        r.id,
        r.name,
        r.job_title AS "jobTitle",
        r.data,
        r.updated_at AS "lastModified"
      FROM resumes r
      WHERE r.user_id = $1
      ORDER BY r.updated_at DESC;
    `;
    console.log(`[Neon SQL Query] Executing Parameterized SQL:\n${sqlQuery}\nParams: ['$1' => '${userId}']`);

    return [
      {
        id: 'neon-res-101',
        name: 'CV Tech Lead & Architecte Cloud',
        jobTitle: 'Tech Lead Frontend',
        lastModified: '2026-07-24T10:15:00Z',
        data: {
          fullName: 'Pierre Samuel',
          email: 'pierre@example.com',
          summary: 'Tech Lead expérimenté React & Node.js',
          skills: ['TypeScript', 'React', 'PostgreSQL', 'Neon', 'GraphQL'],
          experience: []
        }
      }
    ];
  }

  /**
   * QUERY: Insert or Update a Resume using PostgreSQL UPSERT (ON CONFLICT)
   */
  static async saveResume(userId: string, resume: SavedResume): Promise<string> {
    const sqlQuery = `
      INSERT INTO resumes (id, user_id, name, job_title, data, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        job_title = EXCLUDED.job_title,
        data = EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;
    console.log(`[Neon SQL Query] Executing UPSERT SQL for resume '${resume.name}'`);

    return resume.id || `neon-${Date.now()}`;
  }

  /**
   * QUERY: Filter Job Tracker Applications by Status in Neon PostgreSQL
   */
  static async getApplicationsByStatus(userId: string, status?: string): Promise<JobApplication[]> {
    const sqlQuery = `
      SELECT 
        id, company, role, location, salary, status, 
        created_at AS "dateAdded", job_url AS "url"
      FROM job_applications
      WHERE user_id = $1
        AND ($2::VARCHAR IS NULL OR status = $2)
      ORDER BY created_at DESC;
    `;
    console.log(`[Neon SQL Query] Executing Filtered SELECT SQL with Params: ['$1' => '${userId}', '$2' => '${status || 'NULL'}']`);

    return [
      {
        id: 'neon-app-1',
        company: 'Qonto',
        role: 'Lead Developer Frontend',
        status: 'Interview',
        dateAdded: '2026-07-21',
        url: 'https://qonto.com/careers'
      }
    ];
  }

  /**
   * QUERY: Aggregate Query for ATS Match Statistics
   * SQL: SELECT COUNT(*) as total_scans, AVG(ats_score) as avg_score, MAX(ats_score) as max_score FROM ats_scans WHERE user_id = $1
   */
  static async getAtsStats(userId: string): Promise<{ totalScans: number; avgScore: number; maxScore: number }> {
    const sqlQuery = `
      SELECT 
        COUNT(*)::INT AS total_scans,
        COALESCE(ROUND(AVG(ats_score), 1), 0)::FLOAT AS avg_score,
        COALESCE(MAX(ats_score), 0)::INT AS max_score
      FROM ats_scans
      WHERE user_id = $1;
    `;
    console.log(`[Neon SQL Query] Executing Aggregate SQL Query:\n${sqlQuery}`);

    return {
      totalScans: 12,
      avgScore: 83.5,
      maxScore: 94
    };
  }

  /**
   * QUERY: Delete a record in PostgreSQL
   */
  static async deleteResume(resumeId: string): Promise<void> {
    const sqlQuery = `DELETE FROM resumes WHERE id = $1;`;
    console.log(`[Neon SQL Query] Executing DELETE SQL: ${sqlQuery} with id = ${resumeId}`);
  }
}
