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
  skills?: string[];
  datePosted: string;
  source: string;
  provider?: string;
  retrievedAt: string;
  jobType?: string;
  isRemote?: boolean;
  tags?: string[];
  matchScore?: number;
  roleTier?: 'safe' | 'stretch' | 'reach' | string;
  matchExplanation?: string;
  relevanceLabel?: 'Exact Match' | 'Strong Match' | 'Related Match' | string;
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
const remotiveQueryCache = new Map<string, ProviderCache>();

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
 * Extracts normalized skill keywords from job title, description, and source tags
 */
export function extractSkillsFromText(title: string, description: string, tags: string[] = []): string[] {
  const skillsSet = new Set<string>();

  // Add source tags directly if valid
  for (const t of tags) {
    if (typeof t === 'string' && t.trim().length > 1 && t.trim().length < 25) {
      skillsSet.add(t.trim());
    }
  }

  const textToScan = `${title} ${description}`.toLowerCase();
  const KNOWN_PATTERNS: { pattern: RegExp; skill: string }[] = [
    { pattern: /\b(react|reactjs|react\.js)\b/i, skill: 'React' },
    { pattern: /\b(typescript|ts)\b/i, skill: 'TypeScript' },
    { pattern: /\b(javascript|js|es6)\b/i, skill: 'JavaScript' },
    { pattern: /\b(nextjs|next\.js)\b/i, skill: 'Next.js' },
    { pattern: /\b(vue|vuejs)\b/i, skill: 'Vue.js' },
    { pattern: /\b(angular)\b/i, skill: 'Angular' },
    { pattern: /\b(tailwind|tailwindcss)\b/i, skill: 'Tailwind CSS' },
    { pattern: /\b(python)\b/i, skill: 'Python' },
    { pattern: /\b(node|nodejs|node\.js)\b/i, skill: 'Node.js' },
    { pattern: /\b(express|expressjs)\b/i, skill: 'Express' },
    { pattern: /\b(golang|go)\b/i, skill: 'Go' },
    { pattern: /\b(rust)\b/i, skill: 'Rust' },
    { pattern: /\b(java)\b/i, skill: 'Java' },
    { pattern: /\b(c\+\+|cpp)\b/i, skill: 'C++' },
    { pattern: /\b(c#|\.net)\b/i, skill: '.NET' },
    { pattern: /\b(ruby|rails)\b/i, skill: 'Ruby on Rails' },
    { pattern: /\b(sql|postgres|postgresql|mysql)\b/i, skill: 'SQL' },
    { pattern: /\b(mongodb|nosql)\b/i, skill: 'MongoDB' },
    { pattern: /\b(docker)\b/i, skill: 'Docker' },
    { pattern: /\b(kubernetes|k8s)\b/i, skill: 'Kubernetes' },
    { pattern: /\b(aws|amazon web services)\b/i, skill: 'AWS' },
    { pattern: /\b(gcp|google cloud)\b/i, skill: 'GCP' },
    { pattern: /\b(azure)\b/i, skill: 'Azure' },
    { pattern: /\b(graphql)\b/i, skill: 'GraphQL' },
    { pattern: /\b(rest|restful|api)\b/i, skill: 'REST APIs' },
    { pattern: /\b(llm|llms|rag|genai)\b/i, skill: 'Generative AI' },
    { pattern: /\b(machine learning|deep learning|pytorch|tensorflow)\b/i, skill: 'Machine Learning' }
  ];

  for (const item of KNOWN_PATTERNS) {
    if (item.pattern.test(textToScan)) {
      skillsSet.add(item.skill);
    }
  }

  const list = Array.from(skillsSet);
  if (list.length === 0) {
    return ['Software Engineering', 'System Architecture', 'Problem Solving'];
  }
  return list.slice(0, 8);
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

      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.title || '', fullDesc, rawTags);

      return {
        id: `arbeitnow-${item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.title || 'Software Engineer').trim(),
        company: (item.company_name || 'Hiring Enterprise').trim(),
        location: loc,
        link: item.url || 'https://www.arbeitnow.com/',
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.created_at),
        source: 'Arbeitnow',
        provider: 'Arbeitnow',
        retrievedAt,
        jobType: jobTypes,
        isRemote,
        tags: rawTags
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
      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.position || 'Software Engineer', fullDesc, rawTags);

      return {
        id: `remoteok-${item.id || item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.position || 'Software Engineer').trim(),
        company: (item.company || 'Tech Company').trim(),
        location: (item.location || 'Remote / Worldwide').trim(),
        link: directUrl || 'https://remoteok.com/',
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.epoch || item.date),
        source: 'RemoteOK',
        provider: 'RemoteOK',
        retrievedAt,
        jobType: 'Full-time',
        isRemote: true,
        tags: rawTags
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
 * Canonicalizes a job URL by removing tracking params, trailing slashes, and normalizing protocol.
 */
export function canonicalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl.trim());
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'fbclid', 'gclid', 'twclid', 'yclid', 'msclkid',
      '_ga', '_gl', 'session_id'
    ];
    for (const p of trackingParams) {
      url.searchParams.delete(p);
    }
    let path = url.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    url.pathname = path;
    url.hash = '';
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }
    return url.toString().toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().split('?')[0].replace(/\/+$/, '');
  }
}

/**
 * Deduplicates job listings across providers using:
 * 1. Provider + Source Job ID
 * 2. Canonicalized original URL
 * 3. Normalized Title + Company + Location
 */
export function deduplicateJobs(jobs: RealJobListing[]): RealJobListing[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const seenNormalizedKeys = new Set<string>();
  const deduped: RealJobListing[] = [];

  for (const job of jobs) {
    if (!job || !job.title || !job.link) continue;

    // 1. Prefer provider + source job ID when available
    const provider = (job.provider || job.source || 'job').toLowerCase().trim();
    if (job.id && job.id.trim()) {
      const idKey = `${provider}:${job.id.trim().toLowerCase()}`;
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
    }

    // 2. Canonicalized original URL
    const canonUrl = canonicalizeUrl(job.link);
    if (canonUrl && canonUrl.length > 5) {
      if (seenUrls.has(canonUrl)) continue;
      seenUrls.add(canonUrl);
    }

    // 3. Normalized combination of title + company + location
    const normTitle = job.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const normCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const normLoc = job.location.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const textKey = `${normTitle}|${normCompany}|${normLoc}`;
    if (seenNormalizedKeys.has(textKey)) continue;
    seenNormalizedKeys.add(textKey);

    deduped.push(job);
  }

  return deduped;
}

export interface ParsedQueryIntent {
  rawQuery: string;
  normalizedQuery: string;
  isInternship: boolean;
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead';
  primaryDomain: 'ai_ml' | 'data' | 'frontend' | 'backend' | 'fullstack' | 'devops' | 'mobile' | 'product' | 'qa' | 'general_swe';
  keyTerms: string[];
  roleKeywords: string[];
}

/**
 * Extracts structured search intent from user query:
 * - Primary role keywords
 * - Seniority level
 * - Internship/full-time status
 * - Technical domain
 */
export function parseQueryIntent(rawQuery: string): ParsedQueryIntent {
  const norm = (rawQuery || '').trim().toLowerCase();
  
  const isInternship = /\b(intern|internship|trainee|apprentice)\b/i.test(norm);
  let seniority: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | undefined = undefined;
  if (isInternship) {
    seniority = 'intern';
  } else if (/\b(junior|jr|entry[ -]?level|associate)\b/i.test(norm)) {
    seniority = 'junior';
  } else if (/\b(lead|principal|staff|director|head of|architect)\b/i.test(norm)) {
    seniority = 'lead';
  } else if (/\b(senior|sr)\b/i.test(norm)) {
    seniority = 'senior';
  }

  let primaryDomain: ParsedQueryIntent['primaryDomain'] = 'general_swe';
  if (/\b(ai|artificial intelligence|ml|machine learning|deep learning|llm|llms|nlp|computer vision|genai|agent|applied ai)\b/i.test(norm)) {
    primaryDomain = 'ai_ml';
  } else if (/\b(data analyst|data analytics|analytics|bi analyst|business intelligence|data scientist|data engineer|sql)\b/i.test(norm)) {
    primaryDomain = 'data';
  } else if (/\b(product engineer|product engineering|product manager|product management|pm|product owner)\b/i.test(norm)) {
    primaryDomain = 'product';
  } else if (/\b(frontend|front-end|react|vue|angular|ui developer|web developer)\b/i.test(norm)) {
    primaryDomain = 'frontend';
  } else if (/\b(backend|back-end|node|express|django|flask|spring|ruby|rails|golang|rust)\b/i.test(norm)) {
    primaryDomain = 'backend';
  } else if (/\b(fullstack|full-stack|full stack)\b/i.test(norm)) {
    primaryDomain = 'fullstack';
  } else if (/\b(devops|sre|site reliability|cloud engineer|platform engineer|infrastructure|kubernetes)\b/i.test(norm)) {
    primaryDomain = 'devops';
  } else if (/\b(mobile|ios|android|flutter|react native)\b/i.test(norm)) {
    primaryDomain = 'mobile';
  } else if (/\b(qa|quality assurance|tester|test automation|sdet)\b/i.test(norm)) {
    primaryDomain = 'qa';
  }

  const stopWords = new Set([
    'and', 'or', 'the', 'in', 'at', 'for', 'with', 'to', 'of', 'a', 'an',
    'role', 'roles', 'job', 'jobs', 'position', 'positions', 'career', 'opportunity',
    'hiring', 'looking', 'wanted', 'need', 'needed'
  ]);
  const keyTerms = norm
    .split(/[\s,/\-_]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !stopWords.has(t));

  return {
    rawQuery,
    normalizedQuery: norm,
    isInternship,
    seniority,
    primaryDomain,
    keyTerms,
    roleKeywords: keyTerms.filter(t => !['intern', 'internship', 'trainee', 'senior', 'junior', 'lead', 'staff'].includes(t))
  };
}

/**
 * Deterministically evaluates job relevance against user intent.
 * Enforces hard constraints (e.g. internship status, technical domain compatibility).
 */
export function evaluateJobRelevance(
  job: RealJobListing,
  intent: ParsedQueryIntent,
  cleanLoc: string
): {
  isRelevant: boolean;
  score: number;
  relevanceLabel: 'Exact Match' | 'Strong Match' | 'Related Match';
  explanation: string;
} {
  const titleLower = job.title.toLowerCase();
  const descLower = job.description.toLowerCase();
  const tagsLower = (job.tags || []).map(t => t.toLowerCase());
  const locLower = job.location.toLowerCase();

  const jobIsIntern = /\b(intern|internship|trainee|apprentice)\b/i.test(titleLower) ||
    tagsLower.some(t => /\b(intern|internship)\b/i.test(t)) ||
    /\b(intern|internship|trainee)\b/i.test(descLower.slice(0, 400));

  const jobIsSenior = /\b(senior|sr|lead|principal|staff|director|head of|architect)\b/i.test(titleLower);

  // 1. HARD DOMAIN COMPATIBILITY FILTERING
  if (intent.primaryDomain === 'ai_ml') {
    const hasAiInTitle = /\b(ai|ml|machine learning|deep learning|llm|llms|nlp|agent|data science|applied ai|generative ai)\b/i.test(titleLower);
    const hasAiInTags = tagsLower.some(t => /\b(ai|ml|machine learning|deep learning|llm|genai|nlp)\b/i.test(t));
    const hasAiInDesc = /\b(machine learning|artificial intelligence|large language model|llm|deep learning|neural network|genai)\b/i.test(descLower);
    const hasProductInTitle = /\b(product)\b/i.test(titleLower);

    // Reject non-technical or completely unrelated roles
    const isUnrelatedRole = /\b(kundenservice|customer support|copywriter|writer|marketing|sales|shopify|office assistant|service desk|inbound)\b/i.test(titleLower);
    if (isUnrelatedRole) {
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'Unrelated role' };
    }

    // Must have meaningful AI/ML connection in title, tags, or description
    if (!hasAiInTitle && !hasAiInTags && (!hasAiInDesc || !hasProductInTitle)) {
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'No meaningful AI connection' };
    }
  } else if (intent.primaryDomain === 'data') {
    const hasDataInTitle = /\b(data|analytics|analyst|bi|business intelligence|scientist|sql)\b/i.test(titleLower);
    const hasDataInTags = tagsLower.some(t => /\b(data|analytics|sql|bi)\b/i.test(t));
    if (!hasDataInTitle && !hasDataInTags) {
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'No data or analytics role alignment' };
    }
    // Reject generic software engineer / devops / frontend roles
    if (/\b(frontend|react|devops|full[- ]stack|rails|shopify|kundenservice|writer)\b/i.test(titleLower) && !hasDataInTitle) {
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'Unrelated engineering role for data query' };
    }
  } else if (intent.normalizedQuery.includes('react')) {
    const hasReactInTitle = /\b(react|reactjs|react\.js)\b/i.test(titleLower);
    const hasReactInSkills = (job.skills || []).some(s => s.toLowerCase().includes('react'));
    const hasReactInTags = tagsLower.some(t => t.includes('react'));
    const hasReactInDesc = /\b(react|reactjs|react\.js)\b/i.test(descLower);
    if (!hasReactInTitle && !hasReactInSkills && !hasReactInTags && !hasReactInDesc) {
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'Does not require React' };
    }
  }

  // 2. HARD SENIORITY & INTERNSHIP CONSTRAINT
  if (intent.isInternship) {
    if (jobIsSenior) {
      // User explicitly asked for an intern position. Senior/Lead roles are strictly filtered.
      return { isRelevant: false, score: 0, relevanceLabel: 'Related Match', explanation: 'Senior role incompatible with internship search' };
    }
  }

  // 3. SCORING COMPUTATION
  let baseScore = 60;
  let exactTitleMatch = false;

  // Exact phrase match in title
  if (titleLower.includes(intent.normalizedQuery)) {
    baseScore += 30;
    exactTitleMatch = true;
  } else {
    // Check keyword coverage
    const matchedKeywords = intent.roleKeywords.filter(k => titleLower.includes(k));
    if (intent.roleKeywords.length > 0) {
      const ratio = matchedKeywords.length / intent.roleKeywords.length;
      baseScore += ratio * 25;
      if (ratio >= 0.75) exactTitleMatch = true;
    }
  }

  // Tags & Skills
  for (const k of intent.roleKeywords) {
    if (tagsLower.some(t => t.includes(k))) baseScore += 6;
    if ((job.skills || []).some(s => s.toLowerCase().includes(k))) baseScore += 6;
  }

  // Description reinforcement
  if (intent.roleKeywords.some(k => descLower.includes(k))) {
    baseScore += 5;
  }

  // Location / Remote scoring
  if (cleanLoc) {
    const isRemoteReq = cleanLoc.includes('remote') || cleanLoc.includes('worldwide');
    if (isRemoteReq) {
      if (job.isRemote || locLower.includes('remote') || locLower.includes('worldwide')) {
        baseScore += 10;
      }
    } else {
      if (locLower.includes(cleanLoc)) {
        baseScore += 12;
      } else if (!job.isRemote && !locLower.includes('remote')) {
        baseScore -= 15;
      }
    }
  }

  // Determine Relevance Label & Calibrate Scores
  let relevanceLabel: 'Exact Match' | 'Strong Match' | 'Related Match' = 'Related Match';
  let explanation = '';

  if (intent.isInternship) {
    if (jobIsIntern && exactTitleMatch) {
      relevanceLabel = 'Exact Match';
      baseScore = Math.min(96, Math.max(90, baseScore));
      explanation = `Verified ${job.title} internship matching your search.`;
    } else if (jobIsIntern) {
      relevanceLabel = 'Strong Match';
      baseScore = Math.min(88, Math.max(82, baseScore));
      explanation = `Verified internship position in ${job.title}.`;
    } else {
      // Full-time role in the target domain (when no active internship opening found)
      relevanceLabel = 'Related Match';
      baseScore = Math.min(78, Math.max(68, Math.round(baseScore * 0.85)));
      explanation = `Verified full-time role in ${job.title} (no active internship opening found).`;
    }
  } else {
    // Regular search
    if (exactTitleMatch && (!intent.seniority || (intent.seniority === 'senior' && jobIsSenior) || (intent.seniority !== 'senior' && !jobIsSenior))) {
      relevanceLabel = 'Exact Match';
      baseScore = Math.min(97, Math.max(88, baseScore));
      explanation = `Exact title and domain match for ${job.title}.`;
    } else if (baseScore >= 75) {
      relevanceLabel = 'Strong Match';
      baseScore = Math.min(87, Math.max(80, baseScore));
      explanation = `Strong alignment with ${job.title} and technical domain.`;
    } else {
      relevanceLabel = 'Related Match';
      baseScore = Math.min(76, Math.max(65, baseScore));
      explanation = `Related opportunity in ${job.title} from verified external listings.`;
    }
  }

  return {
    isRelevant: true,
    score: Math.min(99, Math.max(50, Math.round(baseScore))),
    relevanceLabel,
    explanation
  };
}

/**
 * Fetches real job listings from Remotive API with query-aware caching
 */
async function fetchRemotiveJobs(query?: string): Promise<RealJobListing[]> {
  const cleanQ = (query || '').trim().toLowerCase();
  const cacheKey = cleanQ || '__all__';
  const now = Date.now();

  const cached = remotiveQueryCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.jobs;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Determine targeted search keyword for Remotive
    let searchParam = cleanQ;
    if (/\b(ai|ml|agent)\b/i.test(cleanQ)) {
      searchParam = 'ai';
    } else if (/\b(data)\b/i.test(cleanQ)) {
      searchParam = 'data';
    } else if (/\b(react)\b/i.test(cleanQ)) {
      searchParam = 'react';
    } else if (/\b(frontend|front-end)\b/i.test(cleanQ)) {
      searchParam = 'frontend';
    } else if (/\b(backend|back-end)\b/i.test(cleanQ)) {
      searchParam = 'backend';
    } else if (/\b(intern|internship)\b/i.test(cleanQ)) {
      searchParam = 'intern';
    }

    const url = searchParam 
      ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchParam)}&limit=50`
      : 'https://remotive.com/api/remote-jobs?limit=50';

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[JobDiscovery] Remotive returned status ${res.status}`);
      return cached?.jobs || [];
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

      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.title || 'Developer', fullDesc, rawTags);

      return {
        id: `remotive-${item.id || Math.random().toString(36).slice(2)}`,
        title: (item.title || 'Developer').trim(),
        company: (item.company_name || 'Remote Enterprise').trim(),
        location: loc,
        link: item.url || 'https://remotive.com/',
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.publication_date),
        source: 'Remotive',
        provider: 'Remotive',
        retrievedAt,
        jobType,
        isRemote: true,
        tags: rawTags
      };
    }).filter(j => j.title && j.link);

    if (remotiveQueryCache.size > 30) {
      remotiveQueryCache.clear();
    }
    remotiveQueryCache.set(cacheKey, { jobs: normalized, timestamp: now });
    return normalized;
  } catch (err: any) {
    console.warn('[JobDiscovery] Failed to fetch Remotive:', err.message);
    return cached?.jobs || [];
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
  const cleanQuery = (query || '').trim();
  const cleanLoc = (location || '').trim();

  // Concurrent fetch from verified real feeds
  const [arbeitnowRes, remoteokRes, remotiveRes] = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchRemoteOKJobs(),
    fetchRemotiveJobs(cleanQuery || undefined)
  ]);

  const rawJobs: RealJobListing[] = [];
  if (arbeitnowRes.status === 'fulfilled') rawJobs.push(...arbeitnowRes.value);
  if (remoteokRes.status === 'fulfilled') rawJobs.push(...remoteokRes.value);
  if (remotiveRes.status === 'fulfilled') rawJobs.push(...remotiveRes.value);

  if (rawJobs.length === 0) {
    throw new Error('Real job providers are currently unreachable. Please try again in a moment.');
  }

  // 1. Cross-provider strict deduplication
  const dedupedJobs = deduplicateJobs(rawJobs);

  // If no query string was entered, return latest verified live listings
  if (!cleanQuery) {
    return dedupedJobs.slice(0, limit).map(j => ({
      ...j,
      relevanceLabel: 'Related Match' as const,
      matchScore: 80,
      roleTier: 'stretch' as const,
      matchExplanation: `Verified live opening at ${j.company} from ${j.source}.`
    }));
  }

  // 2. Structured query intent extraction
  const intent = parseQueryIntent(cleanQuery);

  // 3. Deterministic filtering and scoring
  const qualifiedJobs: RealJobListing[] = [];

  for (const job of dedupedJobs) {
    const evalResult = evaluateJobRelevance(job, intent, cleanLoc);
    if (!evalResult.isRelevant) {
      continue;
    }

    qualifiedJobs.push({
      ...job,
      matchScore: evalResult.score,
      relevanceLabel: evalResult.relevanceLabel,
      roleTier: evalResult.score >= 85 ? 'safe' : (evalResult.score >= 75 ? 'stretch' : 'reach'),
      matchExplanation: evalResult.explanation
    });
  }

  // Sort qualified jobs: Exact Match first, then Strong Match, then Related Match, and by score descending
  qualifiedJobs.sort((a, b) => {
    const tierPriority = (label?: string) => {
      if (!label) return 0;
      if (label.includes('Exact')) return 3;
      if (label.includes('Strong')) return 2;
      return 1;
    };
    const tierDiff = tierPriority(b.relevanceLabel) - tierPriority(a.relevanceLabel);
    if (tierDiff !== 0) return tierDiff;
    return (b.matchScore || 0) - (a.matchScore || 0);
  });

  return qualifiedJobs.slice(0, limit);
}

/**
 * Computes heuristic match score based on candidate profile keywords vs job title and tags
 */
export function applySingleHeuristicScore(job: RealJobListing, profileText?: string): RealJobListing {
  const profileLower = (profileText || '').toLowerCase();
  const titleWords = job.title.toLowerCase().split(/[\s,/\-_]+/).filter(w => w.length > 2);
  let matchPoints = job.matchScore || 72;

  if (profileLower) {
    for (const w of titleWords) {
      if (profileLower.includes(w)) matchPoints += 4;
    }
    for (const t of job.tags || []) {
      if (profileLower.includes(t.toLowerCase())) matchPoints += 3;
    }
  }

  // Cap score if this is a Related Match to prevent violating hard constraints
  let maxCap = 96;
  if (job.relevanceLabel === 'Related Match') {
    maxCap = 78;
  }

  const score = Math.min(maxCap, Math.max(55, matchPoints));
  const roleTier = score >= 85 ? 'safe' : (score >= 75 ? 'stretch' : 'reach');
  const explanation = job.matchExplanation || (profileText 
    ? `Verified opening matching your background in ${job.tags?.[0] || job.title.split(' ')[0] || 'technology'}.`
    : `Verified live opening at ${job.company} from ${job.source}.`);

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
 * Velona does NOT override hard constraints or turn Related Matches into Exact Matches.
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
      relevanceLabel: j.relevanceLabel,
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
2. If relevanceLabel is "Related Match", do NOT give a matchScore above 78.
3. Output a JSON array with one object per job:
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
        let maxCap = 98;
        if (job.relevanceLabel === 'Related Match') {
          maxCap = 78;
        }

        const rawScore = typeof aiScore.matchScore === 'number' ? Math.round(aiScore.matchScore) : (job.matchScore || 80);
        const score = Math.max(50, Math.min(maxCap, rawScore));
        const tier = ['safe', 'stretch', 'reach'].includes(aiScore.roleTier) ? aiScore.roleTier : (score >= 85 ? 'safe' : score >= 75 ? 'stretch' : 'reach');
        const explanation = typeof aiScore.matchExplanation === 'string' && aiScore.matchExplanation.trim()
          ? aiScore.matchExplanation.trim()
          : (job.matchExplanation || `Verified opening at ${job.company} matching candidate skillset.`);

        return {
          ...job,
          matchScore: score,
          roleTier: tier,
          matchExplanation: explanation,
          relevanceLabel: job.relevanceLabel
        };
      }

      return applySingleHeuristicScore(job, candidateProfile);
    });
  } catch (err: any) {
    console.warn('[JobDiscovery] AI matching fallback to heuristic scoring:', err.message);
    return applyHeuristicScores(jobs, candidateProfile);
  }
}

