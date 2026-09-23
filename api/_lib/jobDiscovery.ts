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
  sourceJobId?: string;
  title: string;
  company: string;
  location: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  link: string;
  applyUrl?: string;
  description: string;
  skills?: string[];
  datePosted: string;
  postedAt?: string | null;
  expiresAt?: string | null;
  salary?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    period?: string | null;
    rawText?: string | null;
  } | null;
  source: string;
  provider?: string;
  retrievedAt: string;
  jobType?: string;
  isRemote?: boolean;
  tags?: string[];
  matchScore?: number;
  roleTier?: 'safe' | 'stretch' | 'reach' | string;
  matchExplanation?: string;
  relevanceCategory?: 'exact' | 'related';
  relevanceLabel?: 'Exact Match' | 'Strong Match' | 'Related Match' | string;
  locationMatch?: string;
  missingCriteria?: string[];
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
 * Extracts numeric timestamp in milliseconds from date string, ISO, or relative text.
 * Never invents or fabricates dates.
 */
export function parsePostingTimestamp(dateVal?: string | number | null): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') {
    return dateVal > 1e11 ? dateVal : dateVal * 1000;
  }
  const parsed = Date.parse(dateVal);
  if (!isNaN(parsed)) return parsed;

  const m = String(dateVal).trim().match(/^(\d+)\s*([mhdwo])\b/i);
  if (m) {
    const val = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const now = Date.now();
    if (unit === 'm') return now - val * 60 * 1000;
    if (unit === 'h') return now - val * 3600 * 1000;
    if (unit === 'd') return now - val * 86400 * 1000;
    if (unit === 'w') return now - val * 7 * 86400 * 1000;
    if (unit === 'o') return now - val * 30 * 86400 * 1000;
  }
  return 0;
}

/**
 * Sorts jobs by their actual posting date, newest first.
 * Strictly adheres to requirement: Never invent or modify posting dates.
 */
export function sortJobsByPostingDateNewestFirst<T extends { postedAt?: string | null; datePosted?: string; matchScore?: number }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const timeA = parsePostingTimestamp(a.postedAt) || parsePostingTimestamp(a.datePosted);
    const timeB = parsePostingTimestamp(b.postedAt) || parsePostingTimestamp(b.datePosted);
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeB - timeA; // Newest first
    }
    if (timeB > 0 && timeA === 0) return 1;
    if (timeA > 0 && timeB === 0) return -1;
    return (b.matchScore || 0) - (a.matchScore || 0);
  });
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
  requiredFunction?: 'developer' | 'data_analyst' | 'product' | 'qa' | 'devops' | 'general';
  isAgentSpecific: boolean;
  keyTerms: string[];
  roleKeywords: string[];
}

export const INDIA_LOCATIONS = new Set([
  'india', 'bharat', 'ind',
  'bengaluru', 'bangalore',
  'mumbai', 'bombay',
  'delhi', 'new delhi', 'ncr', 'delhi ncr',
  'hyderabad', 'secunderabad',
  'pune',
  'chennai', 'madras',
  'gurugram', 'gurgaon',
  'noida', 'greater noida',
  'kolkata', 'calcutta',
  'ahmedabad',
  'jaipur',
  'kochi', 'cochin', 'kerala',
  'chandigarh',
  'indore',
  'bhopal',
  'lucknow',
  'mysuru', 'mysore',
  'coimbatore',
  'visakhapatnam', 'vizag',
  'surat',
  'nagpur',
  'vadodara',
  'thiruvananthapuram', 'trivandrum',
  'bhubaneswar', 'patna', 'dehradun'
]);

export interface LocationClassificationResult {
  isCompatible: boolean;
  isExact: boolean;
  classification: 'India Match' | 'Remote — India Eligible' | 'Exact Location Match' | 'Remote — Location Eligible' | 'Related Location' | 'Location Not Confirmed' | 'Incompatible Location';
  locationBadge: string;
  explanation: string;
}

/**
 * Evaluates geographic compatibility strictly.
 * When a user specifies a location (e.g. India), incompatible regional roles are strictly rejected.
 * Worldwide-only roles are treated as Related/Unconfirmed, NEVER as exact India matches.
 */
export function classifyJobLocation(
  job: RealJobListing,
  targetLoc: string
): LocationClassificationResult {
  const cleanTarget = (targetLoc || '').trim().toLowerCase();
  const locLower = (job.location || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();

  // If no target location was entered by user, all locations are compatible
  if (!cleanTarget) {
    return {
      isCompatible: true,
      isExact: true,
      classification: job.isRemote ? 'Related Location' : 'Exact Location Match',
      locationBadge: job.isRemote ? 'Remote' : (job.location || 'Location Open'),
      explanation: 'No specific location constraint was specified.'
    };
  }

  const isTargetIndia = cleanTarget === 'india' || cleanTarget.includes('india') || Array.from(INDIA_LOCATIONS).some(k => {
    const r = new RegExp(`\\b${k}\\b`, 'i');
    return r.test(cleanTarget);
  });

  if (isTargetIndia) {
    // 1. Check if the job specifically mentions India or an Indian city in location or description
    const hasIndiaInLoc = locLower.includes('india') || Array.from(INDIA_LOCATIONS).some(k => {
      const regex = new RegExp(`\\b${k}\\b`, 'i');
      return regex.test(locLower);
    });

    const hasIndiaInDesc = /\b(based in india|office in (bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|gurugram|noida)|candidates in india|hiring in india|work from india)\b/i.test(descLower);

    if (hasIndiaInLoc || hasIndiaInDesc) {
      return {
        isCompatible: true,
        isExact: true,
        classification: 'India Match',
        locationBadge: 'India Match',
        explanation: 'Verified position based in or hiring directly within India.'
      };
    }

    // 2. Check for explicit geographic exclusions or purely on-site roles in other countries
    const isExcludedRegion = /\b(usa? only|us only|united states only|north america only|canada only|europe only|eu only|uk only|latin america|latam only|apac only|germany only)\b/i.test(locLower) ||
      /\b(must reside in (the )?(us|usa|united states|canada|europe|uk|germany)|only (us|usa|united states|uk|eu) citizens|authorized to work in (the )?(us|usa|united states)|must be based in (the )?(us|usa|europe|uk))\b/i.test(descLower);

    const isExplicitOtherCountry = /\b(germany|deutschland|berlin|munich|hamburg|frankfurt|london|united kingdom|uk|france|paris|spain|madrid|barcelona|poland|warsaw|netherlands|amsterdam|canada|toronto|vancouver|australia|sydney|singapore|japan|tokyo|austin|san francisco|california|new york|chicago|seattle)\b/i.test(locLower);

    if (!job.isRemote && isExplicitOtherCountry) {
      return {
        isCompatible: false,
        isExact: false,
        classification: 'Incompatible Location',
        locationBadge: 'Incompatible Location',
        explanation: `Position is located in ${job.location}, incompatible with India search.`
      };
    }

    if (isExcludedRegion && !locLower.includes('worldwide') && !locLower.includes('anywhere')) {
      return {
        isCompatible: false,
        isExact: false,
        classification: 'Incompatible Location',
        locationBadge: 'Incompatible Location',
        explanation: 'Job restricts hiring eligibility to candidates outside of India.'
      };
    }

    // 3. Check for Remote / Worldwide roles
    const isWorldwideRemote = job.isRemote || locLower.includes('remote') || locLower.includes('worldwide') || locLower.includes('anywhere');
    if (isWorldwideRemote) {
      return {
        isCompatible: true,
        isExact: false, // Per strict user instructions: worldwide remote is NOT an exact India match!
        classification: 'Location Not Confirmed',
        locationBadge: 'Worldwide Remote — India Unconfirmed',
        explanation: 'Global remote opening; India-specific employment eligibility is not explicitly confirmed by the provider.'
      };
    }

    return {
      isCompatible: false,
      isExact: false,
      classification: 'Incompatible Location',
      locationBadge: 'Incompatible Location',
      explanation: `Location (${job.location}) does not match India.`
    };
  }

  // Non-India specific location query (e.g. "Germany", "London", "San Francisco", "Remote")
  if (cleanTarget.includes('remote') || cleanTarget.includes('worldwide')) {
    if (job.isRemote || locLower.includes('remote') || locLower.includes('worldwide')) {
      return {
        isCompatible: true,
        isExact: true,
        classification: 'Exact Location Match',
        locationBadge: 'Remote',
        explanation: 'Verified remote opportunity.'
      };
    }
  }

  if (locLower.includes(cleanTarget)) {
    return {
      isCompatible: true,
      isExact: true,
      classification: 'Exact Location Match',
      locationBadge: `${job.location} Match`,
      explanation: `Position based in requested location: ${job.location}.`
    };
  }

  if (job.isRemote || locLower.includes('remote') || locLower.includes('worldwide')) {
    return {
      isCompatible: true,
      isExact: false,
      classification: 'Related Location',
      locationBadge: 'Remote / Worldwide',
      explanation: `Remote opportunity; specific eligibility for ${targetLoc} unconfirmed.`
    };
  }

  return {
    isCompatible: false,
    isExact: false,
    classification: 'Incompatible Location',
    locationBadge: 'Incompatible Location',
    explanation: `Position based in ${job.location}, incompatible with ${targetLoc}.`
  };
}

/**
 * Extracts structured search intent from user query:
 * - Primary role keywords
 * - Seniority level
 * - Internship/full-time status
 * - Technical domain & required function
 */
export function parseQueryIntent(rawQuery: string): ParsedQueryIntent {
  const norm = (rawQuery || '').trim().toLowerCase();
  
  const isInternship = /\b(intern|internship|trainee|apprentice|co-op)\b/i.test(norm);
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

  const isAgentSpecific = /\b(agent|agents|agentic|ai agent)\b/i.test(norm);

  let requiredFunction: ParsedQueryIntent['requiredFunction'] = 'general';
  if (/\b(developer|engineer|engineering|programmer|coder|swe|sde|architect)\b/i.test(norm)) {
    requiredFunction = 'developer';
  } else if (/\b(data analyst|analytics|business intelligence|bi analyst)\b/i.test(norm)) {
    requiredFunction = 'data_analyst';
  } else if (/\b(product manager|product owner|product engineer)\b/i.test(norm)) {
    requiredFunction = 'product';
  } else if (/\b(qa|quality assurance|tester|test automation|sdet)\b/i.test(norm)) {
    requiredFunction = 'qa';
  } else if (/\b(devops|sre|site reliability|cloud engineer|platform engineer)\b/i.test(norm)) {
    requiredFunction = 'devops';
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
    requiredFunction,
    isAgentSpecific,
    keyTerms,
    roleKeywords: keyTerms.filter(t => !['intern', 'internship', 'trainee', 'senior', 'junior', 'lead', 'staff'].includes(t))
  };
}

/**
 * Deterministically evaluates job relevance against user intent.
 * Enforces hard constraints:
 * - Strict location filtering (e.g. India)
 * - Strict internship / seniority constraints
 * - Role function filtering (e.g. Developer vs Graphic Designer vs Talent Acquisition)
 * - Technical domain compatibility
 */
export function evaluateJobRelevance(
  job: RealJobListing,
  intent: ParsedQueryIntent,
  cleanLoc: string
): {
  isRelevant: boolean;
  score: number;
  relevanceCategory: 'exact' | 'related';
  relevanceLabel: 'Exact Match' | 'Strong Match' | 'Related Match';
  locationMatch: string;
  missingCriteria: string[];
  explanation: string;
} {
  const titleLower = job.title.toLowerCase();
  const descLower = job.description.toLowerCase();
  const tagsLower = (job.tags || []).map(t => t.toLowerCase());

  // 1. HARD LOCATION FILTERING
  const locResult = classifyJobLocation(job, cleanLoc);
  if (!locResult.isCompatible) {
    return {
      isRelevant: false,
      score: 0,
      relevanceCategory: 'related',
      relevanceLabel: 'Related Match',
      locationMatch: locResult.locationBadge,
      missingCriteria: ['Incompatible Location'],
      explanation: locResult.explanation
    };
  }

  // 2. HARD ROLE FUNCTION FILTERING
  // If user searched for developer/engineer/programmer, reject non-engineering roles:
  if (intent.requiredFunction === 'developer') {
    const isNonEngRole = /\b(kundenservice|customer support|customer service|copywriter|writer|marketing|sales|talent acquisition|recruiter|human resources|hr |bartender|care navigator|decorator|online bidder|virtual assistant|venture development|business development|gtm academy|product designer|grafikdesigner|graphic designer|brand designer|office assistant|inbound)\b/i.test(titleLower);
    if (isNonEngRole) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['Non-engineering position'],
        explanation: `Non-engineering role (${job.title}) incompatible with developer search.`
      };
    }
  }

  // 3. HARD DOMAIN FILTERING
  if (intent.primaryDomain === 'ai_ml') {
    const hasAiInTitle = /\b(ai|ml|machine learning|deep learning|llm|llms|nlp|agent|data science|applied ai|generative ai)\b/i.test(titleLower);
    const hasAiInTags = tagsLower.some(t => /\b(ai|ml|machine learning|deep learning|llm|genai|nlp|agent)\b/i.test(t));
    const hasAiInDesc = /\b(machine learning|artificial intelligence|large language model|llm|deep learning|neural network|genai|ai agent|autonomous agent)\b/i.test(descLower);

    // Must have meaningful AI connection
    if (!hasAiInTitle && !hasAiInTags && !hasAiInDesc) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['No AI/ML requirement'],
        explanation: 'Position does not involve AI, ML, or agentic development.'
      };
    }

    // If query specifically asked for "agent", ensure it's not an unrelated generic software role
    if (intent.isAgentSpecific && !titleLower.includes('agent') && !descLower.includes('agent') && !tagsLower.some(t => t.includes('agent')) && !descLower.includes('llm') && !descLower.includes('genai')) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['Not agent-focused'],
        explanation: 'Role does not focus on AI agents or LLM systems.'
      };
    }
  } else if (intent.primaryDomain === 'data') {
    const hasDataInTitle = /\b(data|analytics|analyst|bi|business intelligence|scientist|sql)\b/i.test(titleLower);
    const hasDataInTags = tagsLower.some(t => /\b(data|analytics|sql|bi)\b/i.test(t));
    if (!hasDataInTitle && !hasDataInTags) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['No data analytics alignment'],
        explanation: 'Role does not align with data analysis or analytics.'
      };
    }
    // Reject generic software engineer / devops / frontend roles
    if (/\b(frontend|react|devops|full[- ]stack|rails|shopify)\b/i.test(titleLower) && !hasDataInTitle) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['Unrelated software engineering'],
        explanation: 'Generic software engineering role does not match data analyst query.'
      };
    }
  } else if (intent.normalizedQuery.includes('react')) {
    const hasReactInTitle = /\b(react|reactjs|react\.js)\b/i.test(titleLower);
    const hasReactInSkills = (job.skills || []).some(s => s.toLowerCase().includes('react'));
    const hasReactInTags = tagsLower.some(t => t.includes('react'));
    const hasReactInDesc = /\b(react|reactjs|react\.js)\b/i.test(descLower);
    if (!hasReactInTitle && !hasReactInSkills && !hasReactInTags && !hasReactInDesc) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: 'related',
        relevanceLabel: 'Related Match',
        locationMatch: locResult.locationBadge,
        missingCriteria: ['No React requirement'],
        explanation: 'Role does not require React.'
      };
    }
  }

  // 4. HARD SENIORITY & INTERNSHIP FILTERING
  const jobIsIntern = /\b(intern|internship|trainee|apprentice|co-op)\b/i.test(titleLower) ||
    tagsLower.some(t => /\b(intern|internship)\b/i.test(t)) ||
    /\b(intern|internship|trainee)\b/i.test(descLower.slice(0, 400));

  const jobIsSenior = /\b(senior|sr|lead|principal|staff|director|head of|architect)\b/i.test(titleLower);

  if (intent.isInternship && jobIsSenior) {
    // Senior/Lead role is strictly incompatible with internship search!
    return {
      isRelevant: false,
      score: 0,
      relevanceCategory: 'related',
      relevanceLabel: 'Related Match',
      locationMatch: locResult.locationBadge,
      missingCriteria: ['Senior role incompatible with internship'],
      explanation: 'Senior or lead role is incompatible with an internship search.'
    };
  }

  // 5. EVALUATE EXACT TITLE & KEYWORD MATCH
  let baseScore = 65;
  let exactTitleMatch = false;

  if (titleLower.includes(intent.normalizedQuery)) {
    baseScore += 30;
    exactTitleMatch = true;
  } else {
    const matchedKeywords = intent.roleKeywords.filter(k => titleLower.includes(k));
    if (intent.roleKeywords.length > 0) {
      const ratio = matchedKeywords.length / intent.roleKeywords.length;
      baseScore += ratio * 24;
      if (ratio >= 0.75) exactTitleMatch = true;
    }
  }

  for (const k of intent.roleKeywords) {
    if (tagsLower.some(t => t.includes(k))) baseScore += 4;
    if ((job.skills || []).some(s => s.toLowerCase().includes(k))) baseScore += 4;
  }
  if (intent.roleKeywords.some(k => descLower.includes(k))) {
    baseScore += 3;
  }

  // 6. COMPILE MISSING CRITERIA AND DETERMINE EXACT VS RELATED
  const missingCriteria: string[] = [];

  // Check location requirement
  if (cleanLoc && !locResult.isExact) {
    missingCriteria.push(locResult.locationBadge);
  }

  // Check internship requirement
  if (intent.isInternship && !jobIsIntern) {
    missingCriteria.push('Full-Time (Not Internship)');
  }

  // Check seniority match for non-internship queries
  if (!intent.isInternship && intent.seniority === 'senior' && !jobIsSenior) {
    missingCriteria.push('Mid-Level (Not Senior)');
  }

  let relevanceCategory: 'exact' | 'related' = 'exact';
  let relevanceLabel: 'Exact Match' | 'Strong Match' | 'Related Match' = 'Exact Match';
  let explanation = '';

  if (missingCriteria.length === 0) {
    // Perfectly matches all constraints
    relevanceCategory = 'exact';
    if (exactTitleMatch) {
      relevanceLabel = 'Exact Match';
      baseScore = Math.min(97, Math.max(90, baseScore));
      explanation = `Verified ${job.title} meeting your exact search criteria.`;
    } else {
      relevanceLabel = 'Strong Match';
      baseScore = Math.min(88, Math.max(82, baseScore));
      explanation = `Strong technical alignment with ${job.title}.`;
    }
  } else {
    // Missing one or more criteria -> Classified as Related Match
    relevanceCategory = 'related';
    relevanceLabel = 'Related Match';
    baseScore = Math.min(74, Math.max(60, Math.round(baseScore * 0.75)));

    const criteriaText = missingCriteria.join(', ');
    if (intent.isInternship && !jobIsIntern && !locResult.isExact) {
      explanation = `Verified full-time ${job.title} role; global remote (internship not specified, India unconfirmed).`;
    } else if (intent.isInternship && !jobIsIntern) {
      explanation = `Verified full-time role in ${job.title} (no active internship opening found).`;
    } else if (!locResult.isExact) {
      explanation = `Verified ${job.title} opening; remote worldwide (${locResult.locationBadge}).`;
    } else {
      explanation = `Related opportunity in ${job.title} (${criteriaText}).`;
    }
  }

  return {
    isRelevant: true,
    score: Math.min(98, Math.max(50, Math.round(baseScore))),
    relevanceCategory,
    relevanceLabel,
    locationMatch: locResult.locationBadge,
    missingCriteria,
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

export interface SearchRealJobsParams {
  query: string;
  location?: string;
  limit?: number;
  employmentType?: string;
  isRemote?: boolean;
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month';
  allowFallback?: boolean;
}

export interface SearchRealJobsResponse {
  jobs: RealJobListing[];
  provider: string;
  isConfigured: boolean;
  totalFound: number;
  cached?: boolean;
  errorCode?: string;
  error?: string;
}

/**
 * Searches and scores REAL jobs from OpenWeb Ninja JSearch API (primary) or verified feeds
 */
export async function searchRealJobs({
  query,
  location = '',
  limit = 12,
  employmentType,
  isRemote,
  datePosted,
  allowFallback = false
}: SearchRealJobsParams): Promise<SearchRealJobsResponse> {
  const cleanQuery = (query || '').trim();
  const cleanLoc = (location || '').trim();

  const { queryOpenWebNinjaJSearch, isJSearchConfigured } = await import('./jsearch.ts');

  // Primary: OpenWeb Ninja JSearch API
  if (isJSearchConfigured()) {
    const jsearchRes = await queryOpenWebNinjaJSearch({
      query: cleanQuery,
      location: cleanLoc,
      employmentType,
      isRemote,
      datePosted,
      limit
    });

    if (!jsearchRes.success) {
      return {
        jobs: [],
        provider: 'OpenWeb Ninja JSearch',
        isConfigured: true,
        totalFound: 0,
        errorCode: jsearchRes.errorCode,
        error: jsearchRes.error
      };
    }

    if (jsearchRes.jobs.length === 0) {
      return {
        jobs: [],
        provider: 'OpenWeb Ninja JSearch',
        isConfigured: true,
        totalFound: 0,
        cached: jsearchRes.cached
      };
    }

    // Extract query intent and evaluate relevance (Exact vs Related match)
    const intent = parseQueryIntent(cleanQuery);
    const qualifiedJobs: RealJobListing[] = [];

    for (const job of jsearchRes.jobs) {
      const evalResult = evaluateJobRelevance(job, intent, cleanLoc);
      qualifiedJobs.push({
        ...job,
        matchScore: evalResult.score,
        relevanceCategory: evalResult.relevanceCategory,
        relevanceLabel: evalResult.relevanceLabel,
        locationMatch: evalResult.locationMatch,
        missingCriteria: evalResult.missingCriteria,
        roleTier: evalResult.score >= 85 ? 'safe' : (evalResult.score >= 75 ? 'stretch' : 'reach'),
        matchExplanation: evalResult.explanation
      });
    }

    // Requirement 6: Sort jobs by their actual posting date, newest first. Never invent or modify posting dates.
    const sortedJobs = sortJobsByPostingDateNewestFirst(qualifiedJobs);

    return {
      jobs: sortedJobs.slice(0, Math.max(15, limit)),
      provider: 'OpenWeb Ninja JSearch',
      isConfigured: true,
      totalFound: jsearchRes.totalFound,
      cached: jsearchRes.cached
    };
  }

  // If OPENWEB_NINJA_API_KEY is not configured, automatically fallback to verified public live feeds
  // Concurrent fetch from verified real feeds (Public fallback)
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
    return {
      jobs: [],
      provider: 'Verified Feeds (Fallback)',
      isConfigured: false,
      totalFound: 0,
      errorCode: 'PROVIDERS_UNREACHABLE',
      error: 'Public job feeds are currently unreachable. Please try again in a moment.'
    };
  }

  // Cross-provider strict deduplication
  const dedupedJobs = deduplicateJobs(rawJobs);

  if (!cleanQuery) {
    return {
      jobs: dedupedJobs.slice(0, limit).map(j => ({
        ...j,
        relevanceCategory: 'related' as const,
        relevanceLabel: 'Related Match' as const,
        locationMatch: j.isRemote ? 'Remote' : (j.location || 'Location Open'),
        missingCriteria: [],
        matchScore: 80,
        roleTier: 'stretch' as const,
        matchExplanation: `Verified live opening at ${j.company} from ${j.source}.`
      })),
      provider: 'Verified Feeds (Fallback)',
      isConfigured: false,
      totalFound: dedupedJobs.length
    };
  }

  const intent = parseQueryIntent(cleanQuery);
  const qualifiedJobs: RealJobListing[] = [];

  for (const job of dedupedJobs) {
    const evalResult = evaluateJobRelevance(job, intent, cleanLoc);
    if (!evalResult.isRelevant) {
      continue;
    }

    qualifiedJobs.push({
      ...job,
      matchScore: evalResult.score,
      relevanceCategory: evalResult.relevanceCategory,
      relevanceLabel: evalResult.relevanceLabel,
      locationMatch: evalResult.locationMatch,
      missingCriteria: evalResult.missingCriteria,
      roleTier: evalResult.score >= 85 ? 'safe' : (evalResult.score >= 75 ? 'stretch' : 'reach'),
      matchExplanation: evalResult.explanation
    });
  }

  qualifiedJobs.sort((a, b) => {
    const aIsExact = a.relevanceCategory === 'exact' ? 1 : 0;
    const bIsExact = b.relevanceCategory === 'exact' ? 1 : 0;
    if (bIsExact !== aIsExact) return bIsExact - aIsExact;

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

  return {
    jobs: qualifiedJobs.slice(0, limit),
    provider: 'Verified Feeds (Fallback)',
    isConfigured: false,
    totalFound: qualifiedJobs.length
  };
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
  if (job.relevanceCategory === 'related' || job.relevanceLabel === 'Related Match') {
    maxCap = 75;
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
    matchExplanation: explanation,
    relevanceCategory: job.relevanceCategory,
    relevanceLabel: job.relevanceLabel,
    locationMatch: job.locationMatch,
    missingCriteria: job.missingCriteria
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
      relevanceCategory: j.relevanceCategory,
      relevanceLabel: j.relevanceLabel,
      locationMatch: j.locationMatch,
      missingCriteria: j.missingCriteria || [],
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
2. If relevanceCategory is "related" or relevanceLabel is "Related Match", do NOT give a matchScore above 75, as this job does not satisfy all primary constraints.
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

    const aiTimeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    const velonaCallPromise = callVelona({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 800,
      operation: 'job_match'
    });
    const velonaResponse = await Promise.race([velonaCallPromise, aiTimeoutPromise]);
    if (!velonaResponse) {
      console.warn('[JobDiscovery] Velona semantic scoring timed out after 5s; falling back to instant heuristic scoring.');
      return applyHeuristicScores(jobs, candidateProfile);
    }

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
        if (job.relevanceCategory === 'related' || job.relevanceLabel === 'Related Match') {
          maxCap = 75;
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
          relevanceCategory: job.relevanceCategory,
          relevanceLabel: job.relevanceLabel,
          locationMatch: job.locationMatch,
          missingCriteria: job.missingCriteria
        };
      }

      return applySingleHeuristicScore(job, candidateProfile);
    });
  } catch (err: any) {
    console.warn('[JobDiscovery] AI matching fallback to heuristic scoring:', err.message);
    return applyHeuristicScores(jobs, candidateProfile);
  }
}

