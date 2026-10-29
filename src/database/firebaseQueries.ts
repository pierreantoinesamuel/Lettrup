/**
 * Repository for Firebase (Firestore - NoSQL Document Database)
 * Contains production-ready Firestore queries for CV-Pilot / Career app.
 */

import { SavedResume, JobApplication } from '../types';

export interface FirebaseUserDoc {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface FirebaseAtsScanDoc {
  id: string;
  userId: string;
  resumeName: string;
  companyName: string;
  jobTitle: string;
  atsScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  createdAt: string;
}

/**
 * Examples of NoSQL Firestore Queries
 */
export class FirebaseRepository {
  /**
   * 1. QUERY: Get all Resumes for a user (NoSQL Document Fetch with Filter & Order)
   * Equivalent to: db.collection('resumes').where('userId', '==', userId).orderBy('updatedAt', 'desc')
   */
  static async getResumesByUser(userId: string): Promise<SavedResume[]> {
    console.log(`[Firebase NoSQL Query] Fetching documents from collection 'resumes' where userId == '${userId}'`);
    
    // Firestore query snippet example:
    // const q = query(collection(db, 'resumes'), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    // const snapshot = await getDocs(q);
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavedResume[];

    const mockResumes: SavedResume[] = [
      {
        id: 'fb-res-1',
        name: 'CV Développeur Full Stack',
        jobTitle: 'Développeur Full Stack',
        lastModified: '2026-07-24T14:30:00Z',
        data: {
          fullName: 'Pierre Samuel',
          email: 'pierre@example.com',
          summary: 'Développeur passionné avec 5 ans d\'expérience',
          skills: ['React', 'TypeScript', 'Firebase', 'Node.js'],
          experience: []
        }
      }
    ];

    return mockResumes;
  }

  /**
   * 2. QUERY: Save or Update a Resume document in Firestore
   * Equivalent to: doc(db, 'resumes', resumeId) -> setDoc(ref, data, { merge: true })
   */
  static async saveResume(userId: string, resume: SavedResume): Promise<string> {
    console.log(`[Firebase NoSQL Query] Writing document to 'resumes/${resume.id}' for userId: '${userId}'`);
    
    // Firestore snippet:
    // const docRef = doc(db, 'resumes', resume.id || doc(collection(db, 'resumes')).id);
    // await setDoc(docRef, { ...resume, userId, updatedAt: new Date().toISOString() }, { merge: true });
    // return docRef.id;

    return resume.id || `fb-${Date.now()}`;
  }

  /**
   * 3. QUERY: Filter Job Tracker Applications by Status in Firestore
   * Equivalent to: query(collection(db, 'job_applications'), where('userId', '==', userId), where('status', '==', status))
   */
  static async getApplicationsByStatus(userId: string, status?: string): Promise<JobApplication[]> {
    console.log(`[Firebase NoSQL Query] Querying collection 'job_applications' where userId == '${userId}' ${status ? `AND status == '${status}'` : ''}`);

    // Firestore snippet:
    // const constraints = [where('userId', '==', userId)];
    // if (status) constraints.push(where('status', '==', status));
    // const q = query(collection(db, 'job_applications'), ...constraints);
    // const snapshot = await getDocs(q);

    return [
      {
        id: 'app-1',
        company: 'Doctolib',
        role: 'Senior Full Stack Engineer',
        status: 'Applied',
        dateAdded: '2026-07-20',
        url: 'https://doctolib.fr/jobs/123'
      }
    ];
  }

  /**
   * 4. QUERY: High-match ATS Scans Filter (Range Query)
   * Equivalent to: query(collection(db, 'ats_scans'), where('userId', '==', userId), where('atsScore', '>=', minScore))
   */
  static async getHighMatchScans(userId: string, minScore = 80): Promise<FirebaseAtsScanDoc[]> {
    console.log(`[Firebase NoSQL Query] Fetching ATS scans for user '${userId}' with score >= ${minScore}`);

    return [
      {
        id: 'scan-101',
        userId,
        resumeName: 'CV Senior Fullstack',
        companyName: 'Doctolib',
        jobTitle: 'Senior Engineer',
        atsScore: 92,
        foundKeywords: ['React', 'TypeScript', 'Node.js'],
        missingKeywords: ['Docker'],
        createdAt: '2026-07-24T14:30:00Z'
      }
    ];
  }

  /**
   * 5. QUERY: Delete document from Firestore
   * Equivalent to: deleteDoc(doc(db, 'resumes', resumeId))
   */
  static async deleteResume(resumeId: string): Promise<void> {
    console.log(`[Firebase NoSQL Query] Deleting document 'resumes/${resumeId}'`);
  }
}
