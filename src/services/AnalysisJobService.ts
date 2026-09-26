import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface AnalysisJobRecord {
  analysisId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  resumeHash: string;
  jobDescHash: string;
  result?: any;
  error?: string;
}

export function generateHash(str: string): string {
  let hash = 5381;
  const s = str || '';
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export const ACTIVE_JOB_STORAGE_KEY = 'hireflow_active_analysis_job_id';

class AnalysisJobService {
  /**
   * Check if there is an existing active or recent analysis job in sessionStorage.
   */
  getActiveJobId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  setActiveJobId(jobId: string): void {
    try {
      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, jobId);
    } catch {
      // Storage unavailable
    }
  }

  clearActiveJobId(): void {
    try {
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Safe parser for analysis responses that guards against HTML gateway error pages
   */
  private async parseSafeResponse<T = any>(res: Response, endpointDesc: string): Promise<T> {
    const text = await res.text();
    const isHtml = text.includes('<!DOCTYPE') || text.includes('<!doctype') || text.includes('<html') || text.includes('Cloudflare');

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON
    }

    if (!res.ok) {
      if (parsed && typeof parsed === 'object') {
        const serverError = parsed.error || parsed.message;
        if (serverError) {
          const err: any = new Error(serverError);
          err.code = parsed.code || (res.status === 504 ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UPSTREAM_ERROR');
          err.status = res.status;
          err.diagnostics = parsed.diagnostics;
          throw err;
        }
      }

      if (isHtml || res.status === 520 || res.status === 502 || res.status === 503 || res.status === 524) {
        const err: any = new Error('AI provider is temporarily unavailable. Please try again later.');
        err.code = 'PROVIDER_UPSTREAM_ERROR';
        err.status = res.status;
        throw err;
      }
      if (res.status === 504) {
        const err: any = new Error('Analysis timed out on the AI provider. Please click Retry Analysis to run a fresh audit.');
        err.code = 'PROVIDER_TIMEOUT';
        err.status = 504;
        throw err;
      }
      const msg = text.slice(0, 150).replace(/<[^>]*>/g, '').trim() || `Request failed (HTTP ${res.status})`;
      const err: any = new Error(msg);
      err.status = res.status;
      throw err;
    }

    if (parsed) {
      return parsed as T;
    }

    throw new Error('AI provider returned an invalid response structure.');
  }

  /**
   * Query the status of a specific analysis job from the server.
   * This is a read-only endpoint that never invokes Velona or GLM.
   */
  async getJobStatus(analysisId: string): Promise<{
    analysisId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    timing?: any;
  }> {
    const res = await fetch(`/api/resume/analyze-job/${encodeURIComponent(analysisId)}`);
    if (res.status === 404) {
      return {
        analysisId,
        status: 'failed',
        error: 'Analysis session expired. Please restart analysis.'
      };
    }
    return await this.parseSafeResponse(res, `/api/resume/analyze-job/${analysisId}`);
  }

  /**
   * Cancel an active job.
   */
  async cancelJob(analysisId: string, userId?: string): Promise<void> {
    this.clearActiveJobId();
    try {
      await fetch(`/api/resume/analyze-job/${encodeURIComponent(analysisId)}/cancel`, {
        method: 'POST'
      });
    } catch (e) {
      console.warn('[AnalysisJobService] Cancel endpoint request warning:', e);
    }

    if (userId && db) {
      try {
        const jobRef = doc(db, 'users', userId, 'analysisJobs', analysisId);
        await updateDoc(jobRef, {
          status: 'failed',
          error: 'Cancelled by user',
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        // Silent Firestore warning
      }
    }
  }

  /**
   * Start and poll an asynchronous resume analysis job.
   * Completely decouples the browser from long-running HTTP connections.
   */
  async runAsyncAnalysis({
    userId,
    resumeText,
    jobDesc,
    fileType,
    onProgress,
    signal
  }: {
    userId: string;
    resumeText: string;
    jobDesc?: string;
    fileType?: string;
    onProgress?: (statusText: string) => void;
    signal?: AbortSignal;
  }): Promise<any> {
    const resumeHash = generateHash(resumeText);
    const jobDescHash = generateHash(jobDesc || '');
    const analysisId = `ats_${Date.now()}_${resumeHash.slice(0, 8)}`;

    this.setActiveJobId(analysisId);

    // Persist job tracking document in Firestore
    if (userId && db) {
      try {
        const jobDocRef = doc(db, 'users', userId, 'analysisJobs', analysisId);
        await setDoc(jobDocRef, {
          analysisId,
          userId,
          status: 'processing',
          resumeHash,
          jobDescHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (fsErr) {
        console.warn('[AnalysisJobService] Firestore job document initialization warning:', fsErr);
      }
    }

    onProgress?.('Auditing resume against ATS benchmarks with Velona GLM 5.3 Flash...');

    try {
      // Kick off the background processing job on the backend
      const currentUser = auth.currentUser;
      const startRes = await fetch('/api/resume/analyze-job', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : (currentUser?.uid ? { 'x-user-id': currentUser.uid } : {})),
          ...(currentUser?.email ? { 'x-user-email': currentUser.email } : {})
        },
        body: JSON.stringify({
          analysisId,
          userId: userId || currentUser?.uid,
          userEmail: currentUser?.email,
          resumeText,
          jobDescription: jobDesc,
          fileType: fileType || 'pdf'
        }),
        signal
      });

      const startData = await this.parseSafeResponse(startRes, '/api/resume/analyze-job');
      const effectiveJobId = startData.analysisId || analysisId;

      // Fast-path: When server executes and returns the completed analysis directly in the POST response
      if (startData.status === 'completed' && startData.result) {
        this.clearActiveJobId();
        if (userId && db) {
          try {
            const jobDocRef = doc(db, 'users', userId, 'analysisJobs', effectiveJobId);
            await updateDoc(jobDocRef, {
              status: 'completed',
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            // Ignore doc update error
          }
        }
        return startData.result;
      }

      // Polling loop: every 2 seconds check job status until completed or failed
      // Aligned with backend 48,000ms overall budget (26 polls * 2000ms = 52s)
      const maxPolls = 26;
      const pollIntervalMs = 2000;

      for (let poll = 0; poll < maxPolls; poll++) {
        if (signal?.aborted) {
          await this.cancelJob(effectiveJobId, userId);
          throw new Error('Analysis was cancelled.');
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

        if (signal?.aborted) {
          await this.cancelJob(effectiveJobId, userId);
          throw new Error('Analysis was cancelled.');
        }

        const statusData = await this.getJobStatus(effectiveJobId);

        if (statusData.status === 'completed' && statusData.result) {
          this.clearActiveJobId();

          // Update Firestore job document
          if (userId && db) {
            try {
              const jobDocRef = doc(db, 'users', userId, 'analysisJobs', effectiveJobId);
              await updateDoc(jobDocRef, {
                status: 'completed',
                updatedAt: new Date().toISOString()
              });
            } catch (e) {
              // Ignore doc update error
            }
          }

          return statusData.result;
        }

        if (statusData.status === 'failed') {
          this.clearActiveJobId();

          if (userId && db) {
            try {
              const jobDocRef = doc(db, 'users', userId, 'analysisJobs', effectiveJobId);
              await updateDoc(jobDocRef, {
                status: 'failed',
                error: statusData.error || 'Analysis failed',
                updatedAt: new Date().toISOString()
              });
            } catch (e) {
              // Ignore
            }
          }

          const friendlyMsg = statusData.error || 'Analysis is taking longer than expected. Please retry in a moment.';
          throw new Error(friendlyMsg);
        }

        // Still queued or processing
        onProgress?.('Auditing resume against ATS benchmarks with Velona GLM 5.3 Flash...');
      }

      // Polling limit reached
      this.clearActiveJobId();
      throw new Error('Analysis timed out while awaiting the AI provider response. Please click Retry Analysis to rerun the scan.');
    } catch (err: any) {
      this.clearActiveJobId();
      if (signal?.aborted || err?.name === 'AbortError') {
        throw new Error('Analysis was cancelled.');
      }
      throw err;
    }
  }
}

export const analysisJobService = new AnalysisJobService();
