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
  'sarvam',
  'sarvam ai',
  'product intern, agentic ai at sarvam ai',
  'product intern',
  'agentic ai',
  'target organization',
];

export function isDemoRole(role?: string | null): boolean {
  if (!role) return false;
  const trimmed = role.trim().toLowerCase();
  if (trimmed === 'software engineer') return true;
  if (trimmed === 'ai engineer at glean') return true;
  if (trimmed.includes('glean')) return true;
  if (trimmed.includes('sarvam')) return true;
  if (trimmed.includes('target organization')) return true;
  if (trimmed.includes('product intern') && trimmed.includes('agentic')) return true;
  if (trimmed.includes('agentic ai')) return true;
  if (trimmed === 'sample job' || trimmed === 'demo role' || trimmed === 'sample role') return true;
  return false;
}

export function isDemoSkills(skills?: string | string[] | null): boolean {
  if (!skills) return false;
  const str = Array.isArray(skills) ? skills.join(', ') : skills;
  const lower = str.toLowerCase();
  
  // Check for known demo/sample phrases
  if (lower.includes('glean')) return true;
  if (lower.includes('sarvam')) return true;
  if (lower.includes('target organization')) return true;
  if (lower.includes('indic language') || lower.includes('indic')) return true;
  if (lower.includes('enterprise copilot') || (lower.includes('copilot') && lower.includes('enterprise'))) return true;

  const hasRag = lower.includes('rag pipeline');
  const hasSearch = lower.includes('enterprise search');
  const hasEval = lower.includes('evaluation tooling');
  if (hasRag && (hasSearch || hasEval)) return true;
  if (hasSearch && lower.includes('vector databases') && lower.includes('prompt engineering')) return true;

  return false;
}

/**
 * Sanitize browser storage from known legacy demo values
 */
export function sanitizeBrowserStorage(): void {
  try {
    const keysToCheck = [
      'job_finder_user_query',
      'recent_searches',
      'last_search_role',
      'ai_hireflow_current_active_job',
      'learning_path_target_role',
      'learning_path_skills',
      'learning_path_roadmap',
      'learning_path_active_job_key',
      'campus_prep_search_query',
      'campus_prep_company_prep',
      'interview_sim_job_desc',
      'interview_sim_questions',
      'interview_simulator_job_desc'
    ];

    // Check localStorage
    for (const key of keysToCheck) {
      const val = localStorage.getItem(key);
      if (val) {
        if (isDemoRole(val) || isDemoSkills(val) || val.toLowerCase().includes('sarvam') || val.toLowerCase().includes('target organization')) {
          localStorage.removeItem(key);
        } else {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null) {
              const strRep = JSON.stringify(parsed).toLowerCase();
              if (
                strRep.includes('sarvam') || 
                strRep.includes('target organization') || 
                strRep.includes('indic language') || 
                strRep.includes('enterprise copilot') || 
                isDemoRole(parsed.title || parsed.role || parsed.companyName) || 
                isDemoSkills(parsed.skills || parsed.skillsGained)
              ) {
                localStorage.removeItem(key);
              }
            }
          } catch {}
        }
      }
    }

    // Check sessionStorage
    for (const key of keysToCheck) {
      const val = sessionStorage.getItem(key);
      if (val) {
        if (isDemoRole(val) || isDemoSkills(val) || val.toLowerCase().includes('sarvam') || val.toLowerCase().includes('target organization')) {
          sessionStorage.removeItem(key);
        } else {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null) {
              const strRep = JSON.stringify(parsed).toLowerCase();
              if (
                strRep.includes('sarvam') || 
                strRep.includes('target organization') || 
                strRep.includes('indic language') || 
                strRep.includes('enterprise copilot') || 
                isDemoRole(parsed.title || parsed.role || parsed.companyName) || 
                isDemoSkills(parsed.skills || parsed.skillsGained)
              ) {
                sessionStorage.removeItem(key);
              }
            }
          } catch {}
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
    // 1. Check resumes for demo resumes
    const resumeSnap = await getDocs(collection(db, 'users', userId, 'resumes'));
    for (const d of resumeSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.jobDesc) || 
        isDemoRole(data.targetRole) || 
        isDemoRole(data.title) ||
        isDemoSkills(data.analysis?.missingKeywords) ||
        isDemoSkills(data.missingKeywords) ||
        (typeof data.jobDesc === 'string' && (data.jobDesc.toLowerCase().includes('glean') || data.jobDesc.toLowerCase().includes('sarvam') || data.jobDesc.toLowerCase().includes('target organization'))) ||
        (typeof data.targetRole === 'string' && (data.targetRole.toLowerCase().includes('glean') || data.targetRole.toLowerCase().includes('sarvam') || data.targetRole.toLowerCase().includes('target organization')));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'resumes', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo resume:', err);
        }
      }
    }

    // 2. Check learningPaths for demo paths
    const lpSnap = await getDocs(collection(db, 'users', userId, 'learningPaths'));
    for (const d of lpSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.targetRole) || 
        isDemoRole(data.role) ||
        isDemoSkills(data.skillsStr) ||
        isDemoSkills(data.skills) ||
        (typeof data.targetRole === 'string' && (data.targetRole.toLowerCase().includes('glean') || data.targetRole.toLowerCase().includes('sarvam') || data.targetRole.toLowerCase().includes('indic') || data.targetRole.toLowerCase().includes('copilot') || data.targetRole.toLowerCase().includes('target organization'))) ||
        (typeof data.skillsStr === 'string' && (data.skillsStr.toLowerCase().includes('indic') || data.skillsStr.toLowerCase().includes('copilot')));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'learningPaths', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo learning path:', err);
        }
      }
    }

    // 3. Check tracked jobs for demo jobs
    const jobsSnap = await getDocs(collection(db, 'users', userId, 'jobs'));
    for (const d of jobsSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.role) || 
        isDemoRole(data.company) ||
        (typeof data.company === 'string' && (data.company.toLowerCase().includes('sarvam') || data.company.toLowerCase().includes('glean') || data.company.toLowerCase().includes('target organization'))) ||
        (typeof data.role === 'string' && (data.role.toLowerCase().includes('sarvam') || data.role.toLowerCase().includes('glean') || data.role.toLowerCase().includes('target organization')));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'jobs', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo job:', err);
        }
      }
    }

    // 4. Check simulations for demo simulations
    const simSnap = await getDocs(collection(db, 'users', userId, 'simulations'));
    for (const d of simSnap.docs) {
      const data = d.data();
      const isDemo = 
        isDemoRole(data.role) ||
        (typeof data.role === 'string' && (data.role.toLowerCase().includes('sarvam') || data.role.toLowerCase().includes('target organization') || data.role.toLowerCase().includes('glean')));

      if (isDemo) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'simulations', d.id));
        } catch (err) {
          console.warn('Failed to delete legacy demo simulation:', err);
        }
      }
    }
  } catch (err) {
    console.warn('User Firestore sanitation notice:', err);
  }
}
