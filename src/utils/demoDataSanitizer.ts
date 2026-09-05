import { db } from '../lib/firebase';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * Utility to identify, filter, and sanitize legacy demo / placeholder data.
 * Specific known demo values:
 * - "Software Engineer" (when used as automatic fallback / unrequested default)
 * - "AI Engineer at Glean"
 * - The Glean skills string: "LLM, RAG pipelines, enterprise search, evaluation tooling, Python, vector databases, embeddings, prompt engineering, retrieval, fine-tuning"
 */

export const KNOWN_DEMO_ROLE_STRINGS = [
  'software engineer',
  'ai engineer at glean',
  'glean',
];

export function isDemoRole(role?: string | null): boolean {
  if (!role) return false;
  const trimmed = role.trim().toLowerCase();
  if (trimmed === 'software engineer') return true;
  if (trimmed === 'ai engineer at glean') return true;
  if (trimmed.includes('glean')) return true;
  return false;
}

export function isDemoSkills(skills?: string | string[] | null): boolean {
  if (!skills) return false;
  const str = Array.isArray(skills) ? skills.join(', ') : skills;
  const lower = str.toLowerCase();
  
  // Check for the exact known Glean skills phrases
  const hasRag = lower.includes('rag pipeline');
  const hasSearch = lower.includes('enterprise search');
  const hasEval = lower.includes('evaluation tooling');
  const hasGlean = lower.includes('glean');

  if (hasGlean) return true;
  if (hasRag && (hasSearch || hasEval)) return true;
  if (hasSearch && lower.includes('vector databases') && lower.includes('prompt engineering')) return true;

  return false;
}

/**
 * Sanitize browser storage from known legacy demo values
 */
export function sanitizeBrowserStorage(): void {
  try {
    // Check localStorage
    const localKeys = ['job_finder_user_query', 'recent_searches', 'last_search_role'];
    for (const key of localKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        if (isDemoRole(val) || isDemoSkills(val)) {
          localStorage.removeItem(key);
        }
      }
    }

    // Check sessionStorage
    const sessionKeys = ['job_finder_user_query', 'last_search_role'];
    for (const key of sessionKeys) {
      const val = sessionStorage.getItem(key);
      if (val) {
        if (isDemoRole(val) || isDemoSkills(val)) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    console.warn('Storage sanitation warning:', e);
  }
}

/**
 * Clean up legacy demo records from Firestore for the active user
 * Preserves all real user-created data!
 */
export async function sanitizeUserFirestoreData(userId: string): Promise<void> {
  if (!userId) return;

  try {
    // 1. Check resumes for the specific Glean demo resume
    const resumeSnap = await getDocs(collection(db, 'users', userId, 'resumes'));
    for (const d of resumeSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.jobDesc) || 
        isDemoRole(data.targetRole) || 
        isDemoSkills(data.analysis?.missingKeywords) ||
        (typeof data.jobDesc === 'string' && data.jobDesc.toLowerCase().includes('glean'));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'resumes', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo resume:', err);
        }
      }
    }

    // 2. Check learningPaths for demo path
    const lpSnap = await getDocs(collection(db, 'users', userId, 'learningPaths'));
    for (const d of lpSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.targetRole) || 
        isDemoSkills(data.skillsStr) ||
        (typeof data.targetRole === 'string' && data.targetRole.toLowerCase().includes('glean'));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'learningPaths', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo learning path:', err);
        }
      }
    }
  } catch (err) {
    console.warn('User Firestore sanitation notice:', err);
  }
}
