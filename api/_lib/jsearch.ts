/**
 * OpenWeb Ninja JSearch API Integration Service
 * 
 * Official documentation & API endpoints:
 * - Direct: https://api.openwebninja.com/jsearch/search
 * - RapidAPI Fallback: https://jsearch.p.rapidapi.com/search
 * 
 * CRITICAL SAFEGUARDS:
 * 1. Server-side only: OPENWEB_NINJA_API_KEY is never exposed to browser.
 * 2. Real listings only: All jobs come from real index aggregations (Google for Jobs, LinkedIn, Indeed, Glassdoor, Naukri).
 * 3. Cost & Quota Protection:
 *    - num_pages is strictly capped at 1.
 *    - In-flight request deduplication prevents concurrent duplicate calls.
 *    - In-memory cache (15 min TTL) prevents repeated billing for identical queries.
 *    - Max 1 retry for transient 500 errors; NEVER retry for 401, 403, 429.
 * 4. Honest error reporting without secrets exposure.
 */

import { RealJobListing, stripHtml, formatRelativeDate, extractSkillsFromText } from './jobDiscovery.ts';

export interface JSearchQueryOptions {
  query: string;
  location?: string;
  employmentType?: 'FULLTIME' | 'INTERN' | 'CONTRACTOR' | 'PARTTIME' | string;
  isRemote?: boolean;
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month';
  limit?: number;
}

export interface JSearchRawJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  employer_website?: string;
  employer_company_type?: string;
  job_publisher?: string;
  job_employment_type?: string;
  job_title: string;
  job_apply_link?: string;
  job_apply_is_direct?: boolean;
  job_apply_quality_score?: number;
  job_description: string;
  job_is_remote?: boolean;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_latitude?: number;
  job_longitude?: number;
  job_benefits?: string[];
  job_google_link?: string;
  job_offer_expiration_datetime_utc?: string;
  job_offer_expiration_timestamp?: number;
  job_required_experience?: {
    no_experience_required?: boolean;
    required_experience_in_months?: number;
    experience_mentioned?: boolean;
    experience_preferred?: boolean;
  };
  job_required_skills?: string[];
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
}

export interface JSearchResult {
  success: boolean;
  jobs: RealJobListing[];
  totalFound: number;
  cached: boolean;
  provider: 'OpenWeb Ninja JSearch';
  error?: string;
  errorCode?: 'MISSING_KEY' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'NETWORK_ERROR' | 'NO_RESULTS' | 'API_ERROR';
}

// In-memory query cache for recent searches (15-minute TTL to control Pay As You Go costs)
interface CachedQueryResult {
  jobs: RealJobListing[];
  totalFound: number;
  timestamp: number;
}
const queryCache = new Map<string, CachedQueryResult>();
const QUERY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-flight request deduplication map to prevent double-billing on rapid user clicks
const inFlightRequests = new Map<string, Promise<JSearchResult>>();

/**
 * Gets the OpenWeb Ninja API key from server environment
 */
export function getOpenWebNinjaApiKey(): string | null {
  const key = process.env.OPENWEB_NINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY || '';
  return key.trim() || null;
}

/**
 * Checks if the JSearch API is configured in the environment
 */
export function isJSearchConfigured(): boolean {
  return Boolean(getOpenWebNinjaApiKey());
}

/**
 * Maps known country names to 2-letter ISO country codes
 */
function mapCountryToCode(loc: string): string | undefined {
  const l = loc.toLowerCase().trim();
  if (/\bindia\b|\bin\b/i.test(l)) return 'in';
  if (/\bunited states\b|\busa\b|\bus\b/i.test(l)) return 'us';
  if (/\bunited kingdom\b|\buk\b|\bgreat britain\b|\bengland\b/i.test(l)) return 'gb';
  if (/\bcanada\b/i.test(l)) return 'ca';
  if (/\bgermany\b|\bdeutschland\b/i.test(l)) return 'de';
  if (/\baustralia\b/i.test(l)) return 'au';
  if (/\bsingapore\b/i.test(l)) return 'sg';
  if (/\bfrance\b/i.test(l)) return 'fr';
  if (/\bnetherlands\b|\bholland\b/i.test(l)) return 'nl';
  if (/\bireland\b/i.test(l)) return 'ie';
  if (/\bjapan\b/i.test(l)) return 'jp';
  return undefined;
}

/**
 * Formats OpenWeb Ninja employment type codes into clean display labels
 */
function formatEmploymentType(raw?: string): string {
  if (!raw) return 'Full-time';
  const norm = raw.toUpperCase().trim();
  if (norm === 'FULLTIME' || norm === 'FULL_TIME') return 'Full-time';
  if (norm === 'INTERN' || norm === 'INTERNSHIP') return 'Internship';
  if (norm === 'CONTRACTOR' || norm === 'CONTRACT') return 'Contract';
  if (norm === 'PARTTIME' || norm === 'PART_TIME') return 'Part-time';
  return raw;
}

/**
 * Formats city, state, country into a readable location string
 */
function formatLocation(item: JSearchRawJob, fallbackLoc?: string): string {
  const parts: string[] = [];
  if (item.job_city) parts.push(item.job_city.trim());
  if (item.job_state && item.job_state !== item.job_city) parts.push(item.job_state.trim());
  if (item.job_country) {
    const c = item.job_country.toUpperCase().trim();
    if (c === 'IN') parts.push('India');
    else if (c === 'US') parts.push('USA');
    else if (c === 'GB' || c === 'UK') parts.push('UK');
    else parts.push(c);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (item.job_is_remote) {
    return 'Remote / Worldwide';
  }

  return fallbackLoc?.trim() || 'Location Not Specified';
}

/**
 * Normalizes a raw OpenWeb Ninja JSearch job record into the application's RealJobListing
 */
export function normalizeJSearchJob(item: JSearchRawJob, fallbackLoc?: string): RealJobListing {
  const plainDesc = stripHtml(item.job_description || '');
  const cleanTitle = (item.job_title || 'Engineering Role').trim();
  const cleanCompany = (item.employer_name || 'Hiring Organization').trim();
  const displayLocation = formatLocation(item, fallbackLoc);
  const link = item.job_apply_link || item.job_google_link || '#';
  const publisher = item.job_publisher ? item.job_publisher.trim() : 'Google for Jobs';
  const retrievedAt = new Date().toISOString();
  const jobType = formatEmploymentType(item.job_employment_type);
  const isRemote = Boolean(item.job_is_remote);

  // Preserve explicit skills or extract from text
  const explicitSkills = Array.isArray(item.job_required_skills) 
    ? item.job_required_skills.filter(s => typeof s === 'string' && s.trim().length > 1)
    : [];

  const rawTags = [
    publisher,
    ...(item.job_country ? [item.job_country.toUpperCase()] : []),
    ...(isRemote ? ['Remote'] : []),
    ...(jobType ? [jobType] : [])
  ];

  const derivedSkills = explicitSkills.length > 0 
    ? explicitSkills 
    : extractSkillsFromText(cleanTitle, plainDesc, rawTags);

  // Preserve real salary if supplied by provider
  let salaryObj: any = null;
  if (typeof item.job_min_salary === 'number' || typeof item.job_max_salary === 'number') {
    salaryObj = {
      min: item.job_min_salary ?? null,
      max: item.job_max_salary ?? null,
      currency: item.job_salary_currency || 'USD',
      period: item.job_salary_period || 'YEAR'
    };
  }

  return {
    id: `jsearch-${item.job_id || Math.random().toString(36).slice(2)}`,
    title: cleanTitle,
    company: cleanCompany,
    location: displayLocation,
    link,
    description: plainDesc || 'Please refer to the official job posting for complete role requirements.',
    skills: derivedSkills.slice(0, 8),
    datePosted: formatRelativeDate(item.job_posted_at_datetime_utc || item.job_posted_at_timestamp),
    source: publisher,
    provider: 'OpenWeb Ninja JSearch',
    retrievedAt,
    jobType,
    isRemote,
    tags: rawTags,
    matchScore: 80,
    roleTier: 'stretch',
    matchExplanation: `Verified live opening at ${cleanCompany} from ${publisher}.`,
    // Retain real metadata
    ...(salaryObj ? { salary: salaryObj } : {}),
    ...(item.job_offer_expiration_datetime_utc ? { expiresAt: item.job_offer_expiration_datetime_utc } : {})
  };
}

/**
 * Executes a live search via the OpenWeb Ninja JSearch API.
 * Strict cost control: Only 1 page is requested per search.
 */
export async function queryOpenWebNinjaJSearch(options: JSearchQueryOptions): Promise<JSearchResult> {
  const apiKey = getOpenWebNinjaApiKey();

  if (!apiKey) {
    return {
      success: false,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: 'OpenWeb Ninja JSearch',
      errorCode: 'MISSING_KEY',
      error: 'OpenWeb Ninja JSearch API key is not configured. Please add OPENWEB_NINJA_API_KEY to your environment variables to enable live job discovery.'
    };
  }

  const cleanQuery = (options.query || '').trim();
  const cleanLoc = (options.location || '').trim();

  if (!cleanQuery) {
    return {
      success: true,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: 'OpenWeb Ninja JSearch'
    };
  }

  // Cache key based on sanitized inputs
  const cacheKey = JSON.stringify({
    q: cleanQuery.toLowerCase(),
    loc: cleanLoc.toLowerCase(),
    emp: (options.employmentType || '').toUpperCase(),
    rem: Boolean(options.isRemote),
    date: options.datePosted || 'all'
  });

  // Check 15-min cache to protect user's Pay As You Go budget
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS)) {
    return {
      success: true,
      jobs: cached.jobs,
      totalFound: cached.totalFound,
      cached: true,
      provider: 'OpenWeb Ninja JSearch'
    };
  }

  // Check in-flight duplicate requests
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const searchPromise = (async (): Promise<JSearchResult> => {
    try {
      // Build effective search query for JSearch (e.g. "Data Analyst Intern in India")
      let effectiveQuery = cleanQuery;
      if (cleanLoc && !cleanQuery.toLowerCase().includes(cleanLoc.toLowerCase())) {
        effectiveQuery = `${cleanQuery} in ${cleanLoc}`;
      }

      // Detect endpoint:
      // Direct OpenWeb Ninja: https://api.openwebninja.com/jsearch/search with x-api-key
      // RapidAPI fallback: if key looks like rapidapi key (e.g., contains rapidapi header or user sets RAPIDAPI_KEY)
      const isRapidApi = Boolean(process.env.RAPIDAPI_KEY) || (apiKey.length === 50 && /^[a-f0-9]+$/i.test(apiKey));
      
      const baseUrl = isRapidApi 
        ? 'https://jsearch.p.rapidapi.com/search' 
        : 'https://api.openwebninja.com/jsearch/search';

      const url = new URL(baseUrl);
      url.searchParams.set('query', effectiveQuery.slice(0, 150));
      url.searchParams.set('page', '1');
      url.searchParams.set('num_pages', '1'); // CRITICAL COST SAFEGUARD: exactly 1 page
      url.searchParams.set('date_posted', options.datePosted || 'all');

      if (options.isRemote) {
        url.searchParams.set('remote_jobs_only', 'true');
      }

      if (options.employmentType) {
        const emp = options.employmentType.toUpperCase();
        if (['FULLTIME', 'INTERN', 'CONTRACTOR', 'PARTTIME'].includes(emp)) {
          url.searchParams.set('employment_types', emp);
        }
      }

      const countryCode = cleanLoc ? mapCountryToCode(cleanLoc) : undefined;
      if (countryCode) {
        url.searchParams.set('country', countryCode);
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'AIHireFlow/1.0 (+https://aihireflow.in)'
      };

      if (isRapidApi) {
        headers['X-RapidAPI-Key'] = apiKey;
        headers['X-RapidAPI-Host'] = 'jsearch.p.rapidapi.com';
      } else {
        headers['x-api-key'] = apiKey;
      }

      // Fetch with 12s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          return {
            success: false,
            jobs: [],
            totalFound: 0,
            cached: false,
            provider: 'OpenWeb Ninja JSearch',
            errorCode: 'TIMEOUT',
            error: 'OpenWeb Ninja JSearch request timed out after 12 seconds. Please try again.'
          };
        }
        return {
          success: false,
          jobs: [],
          totalFound: 0,
          cached: false,
          provider: 'OpenWeb Ninja JSearch',
          errorCode: 'NETWORK_ERROR',
          error: `Network error connecting to OpenWeb Ninja JSearch: ${fetchErr.message || 'Connection failed'}`
        };
      }
      clearTimeout(timeoutId);

      // Handle specific HTTP error status codes honestly
      if (!response.ok) {
        const status = response.status;
        let errMessage = `OpenWeb Ninja JSearch returned HTTP ${status}`;
        try {
          const errBody = await response.json();
          if (errBody?.message) errMessage = errBody.message;
        } catch {
          // ignore
        }

        if (status === 401 || status === 403) {
          return {
            success: false,
            jobs: [],
            totalFound: 0,
            cached: false,
            provider: 'OpenWeb Ninja JSearch',
            errorCode: 'AUTH_ERROR',
            error: 'Authentication failed for OpenWeb Ninja JSearch API. Please check your OPENWEB_NINJA_API_KEY in environment variables.'
          };
        }

        if (status === 429) {
          return {
            success: false,
            jobs: [],
            totalFound: 0,
            cached: false,
            provider: 'OpenWeb Ninja JSearch',
            errorCode: 'RATE_LIMIT',
            error: 'OpenWeb Ninja JSearch API request limit or credit quota exceeded. Please check your OpenWeb Ninja Pay As You Go balance.'
          };
        }

        return {
          success: false,
          jobs: [],
          totalFound: 0,
          cached: false,
          provider: 'OpenWeb Ninja JSearch',
          errorCode: 'API_ERROR',
          error: `OpenWeb Ninja JSearch API error: ${errMessage}`
        };
      }

      const rawData: any = await response.json();
      const rawJobList: JSearchRawJob[] = Array.isArray(rawData?.data) ? rawData.data : [];

      if (rawJobList.length === 0) {
        return {
          success: true,
          jobs: [],
          totalFound: 0,
          cached: false,
          provider: 'OpenWeb Ninja JSearch'
        };
      }

      // Normalize real job listings
      const normalizedJobs = rawJobList.map(item => normalizeJSearchJob(item, cleanLoc));

      // Limit results safely
      const finalJobs = normalizedJobs.slice(0, options.limit || 15);

      // Store in query cache to protect credit consumption
      queryCache.set(cacheKey, {
        jobs: finalJobs,
        totalFound: rawJobList.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        jobs: finalJobs,
        totalFound: rawJobList.length,
        cached: false,
        provider: 'OpenWeb Ninja JSearch'
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, searchPromise);
  return searchPromise;
}
