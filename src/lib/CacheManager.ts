type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, durationMs: number): void {
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt: timestamp + durationMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  generateResumeKey(resumeText: string, jobDesc: string): string {
    const rPart = resumeText.slice(0, 100).replace(/\s+/g, '');
    const jPart = jobDesc.slice(0, 50).replace(/\s+/g, '');
    return `resume_${rPart}_${jPart}`;
  }

  generateJobKey(role: string, location: string): string {
    return `job_${role.toLowerCase().trim()}_${location.toLowerCase().trim()}`;
  }

  generateInterviewKey(role: string, difficulty: string = 'standard'): string {
    return `interview_${role.toLowerCase().trim()}_${difficulty.toLowerCase().trim()}`;
  }
}

export const cacheManager = new CacheManager();
