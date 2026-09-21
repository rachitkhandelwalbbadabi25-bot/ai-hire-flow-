/**
 * Real Job Discovery Service for AI HireFlow
 * 
 * Sourcing & Aggregation Engine for REAL job postings from verified external providers:
 * - Arbeitnow Official API (https://www.arbeitnow.com/api/job-board-api)
 * - RemoteOK Official API (https://remoteok.com/api)
 * - Remotive Official API (https://remotive.com/api/remote-jobs)
 * - Optional: Adzuna API (if ADZUNA_APP_ID & ADZUNA_APP_KEY configured)
 * - Optional: JSearch / RapidAPI (if JSEARCH_API_KEY / RAPIDAPI_KEY configured)
 * 
 * CRITICAL RULE:
 * Every job must represent a verified, live listing from a genuine source.
 * AI (Velona / GLM 5.3 Flash) is strictly used as a matching and ranking layer,
 * NEVER as a job listing generator.
 */

export interface RealJobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  datePosted: string;
  source: string;
  retrievedAt: string;
  jobType?: string;
  isRemote?: boolean;
  tags?: string[];
  matchScore?: number;
  roleTier?: 'safe' | 'stretch' | 'reach' | string;
  matchExplanation?: string;
  isPoorFit?: boolean;
}

interface ProviderCache {
  jobs: RealJobListing[];
  timestamp: number;
}

// In-memory cache for external feeds (10 minute TTL to comply with rate limits and minimize latency)
const CACHE_TTL_MS = 10 * 60 * 1000;
let arbeitnowCache: ProviderCache | null = null;
let remoteokCache: ProviderCache | null = null;
let remotiveCache: ProviderCache | null = null;

const USER_AGENT = 'AIHireFlow-JobDiscovery/1.0 (+https://www.aihireflow.in; contact@aihireflow.in)';

/**
 * Strips HTML tags and unescapes common entities safely
 */
export function stripHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats timestamps or dates into human-readable relative or short date format
 */
export function formatRelativeDate(input: string | number | undefined): string {
  if (!input) return 'Recently posted';

  try {
    let dateMs: number;
    if (typeof input === 'number') {
      // Epoch seconds vs milliseconds
      dateMs = input > 1e11 ? input : input * 1000;
    } else {
      const parsed = Date.parse(input);
      if (isNaN(parsed)) return 'Recently posted';
      dateMs = parsed;
    }

    const now = Date.now();
    const diffSec = Math.floor((now - dateMs) / 1000);

    if (diffSec < 0) return 'Just now';
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / (86400 * 7))}w ago`;
    return `${Math.floor(diffSec / (86400 * 30))}mo ago`;
  } catch {
    return 'Recently posted';
  }
}

/**
 * Fetches real job listings from Arbeitnow API
 */
async function fetchArbeitnowJobs(): Promise<RealJobListing[]> {
  const now = Date.now();
  if (arbeitnowCache && (now - arbeitnowCache.timestamp < CACHE_TTL_MS)) {
    return arbeitnowCache.jobs;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[JobDiscovery] Arbeitnow returned status ${res.status}`);
      return arbeitnowCache?.jobs || [];
    }

    const data: any = await res.json();
    const rawList = Array.isArray(data?.data) ? data.data : [];
    const retrievedAt = new Date().toISOString();

    const normalized: RealJobListing[] = rawList.map((item: any) => {
      const plainDesc = stripHtml(item.description || '');
      const fullDesc = plainDesc 
        ? (plainDesc.length > 5000 ? plainDesc.slice(0, 5000) + '...' : plainDesc)
        : 'No job description was provided by the source listing. Refer to the official posting link for full requirements.';
      const isRemote = Boolean(item.remote);
      const loc = item.location ? item.location.trim() : (isRemote ? 'Remote' : 'Location not specified');
      const jobTypes = Array.isArray(item.job_types) ? item.job_types.join(', ') : undefined;

      return {
        id: `arbeitnow-${item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.title || 'Software Engineer').trim(),
        company: (item.company_name || 'Hiring Enterprise').trim(),
        location: loc,
        link: item.url || 'https://www.arbeitnow.com/',
        description: fullDesc,
        datePosted: formatRelativeDate(item.created_at),
        source: 'Arbeitnow',
        retrievedAt,
        jobType: jobTypes,
        isRemote,
        tags: Array.isArray(item.tags) ? item.tags : []
      };
    }).filter(j => j.title && j.link);

    arbeitnowCache = { jobs: normalized, timestamp: now };
    return normalized;
  } catch (err: any) {
    console.warn('[JobDiscovery] Failed to fetch Arbeitnow:', err.message);
    return arbeitnowCache?.jobs || [];
  }
}

/**
 * Fetches real job listings from RemoteOK API
 */
async function fetchRemoteOKJobs(): Promise<RealJobListing[]> {
  const now = Date.now();
  if (remoteokCache && (now - remoteokCache.timestamp < CACHE_TTL_MS)) {
    return remoteokCache.jobs;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[JobDiscovery] RemoteOK returned status ${res.status}`);
      return remoteokCache?.jobs || [];
    }

    const data: any = await res.json();
    const rawList = Array.isArray(data) ? data.slice(1) : []; // Index 0 is legal/meta disclaimer
    const retrievedAt = new Date().toISOString();

    const normalized: RealJobListing[] = rawList.map((item: any) => {
      const plainDesc = stripHtml(item.description || '');
      const fullDesc = plainDesc 
        ? (plainDesc.length > 5000 ? plainDesc.slice(0, 5000) + '...' : plainDesc)
        : 'No job description was provided by the source listing. Refer to the official posting link for full requirements.';
      const directUrl = item.apply_url || item.url || (item.slug ? `https://remoteok.com/remote-jobs/${item.slug}` : '');

      return {
        id: `remoteok-${item.id || item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.position || 'Software Engineer').trim(),
        company: (item.company || 'Tech Company').trim(),
        location: (item.location || 'Remote / Worldwide').trim(),
        link: directUrl || 'https://remoteok.com/',
        description: fullDesc,
        datePosted: formatRelativeDate(item.epoch || item.date),
        source: 'RemoteOK',
        retrievedAt,
        jobType: 'Full-time',
        isRemote: true,
        tags: Array.isArray(item.tags) ? item.tags : []
      };
    }).filter(j => j.title && j.link);

    remoteokCache = { jobs: normalized, timestamp: now };
    return normalized;
  } catch (err: any) {
    console.warn('[JobDiscovery] Failed to fetch RemoteOK:', err.message);
    return remoteokCache?.jobs || [];
  }
}

/**
 * Fetches real job listings from Remotive API
 */
async function fetchRemotiveJobs(query?: string): Promise<RealJobListing[]> {
  const now = Date.now();
  if (remotiveCache && (now - remotiveCache.timestamp < CACHE_TTL_MS)) {
    return remotiveCache.jobs;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const url = query 
      ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`
      : 'https://remotive.com/api/remote-jobs?limit=50';

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[JobDiscovery] Remotive returned status ${res.status}`);
      return remotiveCache?.jobs || [];
    }

    const data: any = await res.json();
    const rawList = Array.isArray(data?.jobs) ? data.jobs : [];
    const retrievedAt = new Date().toISOString();

    const normalized: RealJobListing[] = rawList.map((item: any) => {
      const plainDesc = stripHtml(item.description || '');
      const fullDesc = plainDesc 
        ? (plainDesc.length > 5000 ? plainDesc.slice(0, 5000) + '...' : plainDesc)
        : 'No job description was provided by the source listing. Refer to the official posting link for full requirements.';
      const loc = item.candidate_required_location ? item.candidate_required_location.trim() : 'Remote / Worldwide';
      const jobType = item.job_type ? item.job_type.replace(/_/g, ' ') : 'Full-time';

      return {
        id: `remotive-${item.id || Math.random().toString(36).slice(2)}`,
        title: (item.title || 'Developer').trim(),
        company: (item.company_name || 'Remote Enterprise').trim(),
        location: loc,
        link: item.url || 'https://remotive.com/',
        description: fullDesc,
        datePosted: formatRelativeDate(item.publication_date),
        source: 'Remotive',
        retrievedAt,
        jobType,
        isRemote: true,
        tags: Array.isArray(item.tags) ? item.tags : []
      };
    }).filter(j => j.title && j.link);

    remotiveCache = { jobs: normalized, timestamp: now };
    return normalized;
  } catch (err: any) {
    console.warn('[JobDiscovery] Failed to fetch Remotive:', err.message);
    return remotiveCache?.jobs || [];
  }
}

/**
 * Searches and scores REAL jobs from all verified external sources
 */
export async function searchRealJobs({
  query,
  location = '',
  limit = 12
}: {
  query: string;
  location?: string;
  limit?: number;
}): Promise<RealJobListing[]> {
  const cleanQuery = (query || '').trim().toLowerCase();
  const cleanLoc = (location || '').trim().toLowerCase();

  // Concurrent fetch from verified real feeds
  const [arbeitnowRes, remoteokRes, remotiveRes] = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchRemoteOKJobs(),
    fetchRemotiveJobs(cleanQuery || undefined)
  ]);

  const allJobs: RealJobListing[] = [];
  if (arbeitnowRes.status === 'fulfilled') allJobs.push(...arbeitnowRes.value);
  if (remoteokRes.status === 'fulfilled') allJobs.push(...remoteokRes.value);
  if (remotiveRes.status === 'fulfilled') allJobs.push(...remotiveRes.value);

  if (allJobs.length === 0) {
    // If all providers failed or were empty, throw explicit provider error
    throw new Error('Real job providers are currently unreachable. Please try again in a moment.');
  }

  // Common stop words and generic filler words to exclude from token matching
  const stopWords = new Set([
    'and', 'or', 'the', 'in', 'at', 'for', 'with', 'to', 'of', 'a', 'an',
    'role', 'roles', 'job', 'jobs', 'position', 'positions', 'career', 'opportunity', 'opportunities',
    'hiring', 'looking', 'wanted', 'need', 'needed'
  ]);
  const queryTokens = cleanQuery
    .split(/[\s,/\-_]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !stopWords.has(t));

  const isRemoteRequested = cleanLoc.includes('remote') || cleanLoc.includes('worldwide') || cleanLoc.includes('anywhere');

  // Score each REAL job based on query and location matching
  const scoredJobs: Array<{ job: RealJobListing; score: number }> = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const job of allJobs) {
    // Deduplication by URL
    if (job.link && seenUrls.has(job.link.toLowerCase())) continue;
    seenUrls.add(job.link.toLowerCase());

    // Deduplication by normalized company + title
    const key = `${job.company.toLowerCase()}:${job.title.toLowerCase()}`;
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    const titleLower = job.title.toLowerCase();
    const descLower = job.description.toLowerCase();
    const companyLower = job.company.toLowerCase();
    const jobLocLower = job.location.toLowerCase();
    const tagsLower = (job.tags || []).map(t => t.toLowerCase());

    let score = 0;

    // 1. Title Scoring
    if (cleanQuery && titleLower.includes(cleanQuery)) {
      score += 120; // Exact phrase match in title
    } else if (queryTokens.length > 0) {
      const matchedTokensInTitle = queryTokens.filter(token => titleLower.includes(token));
      if (matchedTokensInTitle.length === queryTokens.length) {
        score += 80; // All tokens present in title
      } else {
        score += matchedTokensInTitle.length * 25;
      }
    }

    // 2. Tags Scoring
    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        if (tagsLower.some(t => t.includes(token))) {
          score += 15;
        }
      }
    }

    // 3. Company Scoring
    if (cleanQuery && companyLower.includes(cleanQuery)) {
      score += 20;
    }

    // 4. Description Scoring
    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        if (descLower.includes(token)) {
          score += 5;
        }
      }
    }

    // 5. Location Scoring & Filtering
    if (cleanLoc) {
      if (isRemoteRequested) {
        if (job.isRemote || jobLocLower.includes('remote') || jobLocLower.includes('worldwide')) {
          score += 35;
        }
      } else {
        const locTokens = cleanLoc
          .split(/[\s,/\-_]+/)
          .map(t => t.trim())
          .filter(t => t.length > 2 && !stopWords.has(t));

        let locMatched = false;
        for (const locToken of locTokens) {
          if (jobLocLower.includes(locToken)) {
            score += 40;
            locMatched = true;
          }
        }
        // If user searched for a specific country or city and job has an explicit, non-remote location that doesn't match, penalize
        if (!locMatched && !job.isRemote && !jobLocLower.includes('remote')) {
          score -= 30;
        }
      }
    }

    // If a query was specified, ensure meaningful relevance (score >= 15 ensures at least tag or title alignment)
    if (queryTokens.length > 0 && score < 15) {
      continue;
    } else if (cleanQuery && score <= 0) {
      continue;
    }

    scoredJobs.push({ job, score });
  }

  // Sort by score descending
  scoredJobs.sort((a, b) => b.score - a.score);

  return scoredJobs.slice(0, limit).map(item => item.job);
}

/**
 * Computes heuristic match score based on candidate profile keywords vs job title and tags
 */
export function applySingleHeuristicScore(job: RealJobListing, profileText?: string): RealJobListing {
  const profileLower = (profileText || '').toLowerCase();
  const titleWords = job.title.toLowerCase().split(/[\s,/\-_]+/).filter(w => w.length > 2);
  let matchPoints = 72;

  if (profileLower) {
    for (const w of titleWords) {
      if (profileLower.includes(w)) matchPoints += 5;
    }
    for (const t of job.tags || []) {
      if (profileLower.includes(t.toLowerCase())) matchPoints += 4;
    }
  }

  const score = Math.min(96, Math.max(62, matchPoints));
  const roleTier = score >= 85 ? 'safe' : (score >= 75 ? 'stretch' : 'reach');
  const explanation = profileText 
    ? `Verified opening matching your background in ${job.tags?.[0] || job.title.split(' ')[0] || 'technology'}.`
    : `Verified live opening at ${job.company} from ${job.source}.`;

  return {
    ...job,
    matchScore: score,
    roleTier,
    matchExplanation: explanation
  };
}

export function applyHeuristicScores(jobs: RealJobListing[], profileText?: string): RealJobListing[] {
  return jobs.map(j => applySingleHeuristicScore(j, profileText));
}

/**
 * Uses Velona (z-ai/glm-5.3-flash) strictly as a semantic matching layer to score and rank REAL jobs.
 * Velona does NOT invent or alter titles, companies, links, or locations.
 */
export async function rankAndScoreJobsWithAI({
  jobs,
  candidateProfile,
  callVelona
}: {
  jobs: RealJobListing[];
  candidateProfile?: string;
  callVelona?: (args: any) => Promise<{ text?: string; content?: string; [key: string]: any }>;
}): Promise<RealJobListing[]> {
  if (!jobs || jobs.length === 0) return [];
  if (!candidateProfile || !callVelona) {
    return applyHeuristicScores(jobs, candidateProfile);
  }

  try {
    const jobSummaries = jobs.map((j, idx) => ({
      index: idx,
      title: j.title,
      company: j.company,
      location: j.location,
      tags: j.tags?.slice(0, 5) || []
    }));

    const prompt = `You are the candidate matching engine for AI HireFlow.
Compare the candidate's skills and background against these REAL job openings.

Candidate Background:
${candidateProfile.slice(0, 1000)}

Real Job Openings to Evaluate:
${JSON.stringify(jobSummaries, null, 2)}

Instructions:
1. For each job, evaluate how candidate skills align with the role.
2. Output a JSON array with one object per job:
[
  {
    "index": 0,
    "matchScore": 85,
    "roleTier": "safe",
    "matchExplanation": "One concise sentence under 15 words explaining candidate skill fit."
  }
]
IMPORTANT: Return raw JSON only. Do NOT modify or output job titles, companies, or links.`;

    const velonaResponse = await callVelona({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 800,
      operation: 'job_match'
    });

    const rawContent = velonaResponse?.content || velonaResponse?.text || '';
    const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    const scoreMap = new Map<number, any>();
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item?.index === 'number') {
          scoreMap.set(item.index, item);
        }
      }
    }

    return jobs.map((job, idx) => {
      const aiScore = scoreMap.get(idx);
      if (aiScore) {
        const score = typeof aiScore.matchScore === 'number' ? Math.max(50, Math.min(99, Math.round(aiScore.matchScore))) : 80;
        const tier = ['safe', 'stretch', 'reach'].includes(aiScore.roleTier) ? aiScore.roleTier : (score >= 85 ? 'safe' : score >= 75 ? 'stretch' : 'reach');
        const explanation = typeof aiScore.matchExplanation === 'string' && aiScore.matchExplanation.trim()
          ? aiScore.matchExplanation.trim()
          : `Verified opening at ${job.company} matching candidate skillset.`;

        return {
          ...job,
          matchScore: score,
          roleTier: tier,
          matchExplanation: explanation
        };
      }

      return applySingleHeuristicScore(job, candidateProfile);
    });
  } catch (err: any) {
    console.warn('[JobDiscovery] AI matching fallback to heuristic scoring:', err.message);
    return applyHeuristicScores(jobs, candidateProfile);
  }
}

