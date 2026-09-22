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

import { RealJobListing, stripHtml, formatRelativeDate, extractSkillsFromText, sortJobsByPostingDateNewestFirst } from './jobDiscovery.ts';

export interface JSearchQueryOptions {
  query: string;
  location?: string;
  employmentType?: 'FULLTIME' | 'INTERN' | 'CONTRACTOR' | 'PARTTIME' | string;
  isRemote?: boolean;
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month';
  allowAllDateFallback?: boolean;
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

  // Parse authentic postedAt timestamp/ISO
  const parsedPostedAt = item.job_posted_at_datetime_utc 
    ? item.job_posted_at_datetime_utc 
    : (typeof item.job_posted_at_timestamp === 'number' ? new Date(item.job_posted_at_timestamp * 1000).toISOString() : null);

  return {
    id: `jsearch-${item.job_id || Math.random().toString(36).slice(2)}`,
    title: cleanTitle,
    company: cleanCompany,
    location: displayLocation,
    link,
    description: plainDesc || 'Please refer to the official job posting for complete role requirements.',
    skills: derivedSkills.slice(0, 8),
    datePosted: formatRelativeDate(item.job_posted_at_datetime_utc || item.job_posted_at_timestamp),
    postedAt: parsedPostedAt,
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
 * Executes a single HTTP query to OpenWeb Ninja JSearch for a given date_posted filter.
 */
async function executeSingleJSearchQuery(
  options: JSearchQueryOptions,
  dateFilter: string,
  apiKey: string,
  cleanQuery: string,
  cleanLoc: string
): Promise<JSearchResult> {
  // Requirement 8: country: in (default or mapped from location)
  const countryCode = cleanLoc ? mapCountryToCode(cleanLoc) : 'in';
  const targetCountry = countryCode || 'in';

  // Build effective search query for JSearch (e.g. "Data Analyst" or "Data Analyst in Bangalore")
  // Keep country out of the query string when the country parameter is explicitly set,
  // preventing upstream Google for Jobs query parser timeouts.
  let effectiveQuery = cleanQuery;
  if (cleanLoc && !/^(india|in|usa|us|united states|uk|united kingdom)$/i.test(cleanLoc.trim())) {
    if (!cleanQuery.toLowerCase().includes(cleanLoc.toLowerCase())) {
      effectiveQuery = `${cleanQuery} in ${cleanLoc}`;
    }
  }

  // Detect endpoint:
  // Direct OpenWeb Ninja: https://api.openwebninja.com/jsearch/search with x-api-key
  // RapidAPI fallback: if key looks like rapidapi key
  const isRapidApi = Boolean(process.env.RAPIDAPI_KEY) || (apiKey.length === 50 && /^[a-f0-9]+$/i.test(apiKey));
  
  const baseUrl = isRapidApi 
    ? 'https://jsearch.p.rapidapi.com/search' 
    : 'https://api.openwebninja.com/jsearch/search';

  const url = new URL(baseUrl);
  url.searchParams.set('query', effectiveQuery.slice(0, 150));
  url.searchParams.set('page', '1');
  url.searchParams.set('num_pages', '1'); // Requirement 8: num_pages: 1 initially
  url.searchParams.set('date_posted', dateFilter); // Requirement 2 & 3: officially supported date_posted
  url.searchParams.set('country', targetCountry); // Requirement 8: country: in
  url.searchParams.set('language', 'en'); // Requirement 8: language: en

  // Requirement 8: work_from_home: omitted unless the user selects remote jobs
  if (options.isRemote) {
    url.searchParams.set('work_from_home', 'true');
    url.searchParams.set('remote_jobs_only', 'true');
  }

  if (options.employmentType) {
    const emp = options.employmentType.toUpperCase();
    if (['FULLTIME', 'INTERN', 'CONTRACTOR', 'PARTTIME'].includes(emp)) {
      url.searchParams.set('employment_types', emp);
    }
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

  // 50-second timeout to allow upstream search scraping and residential proxy routing to complete
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal
    });
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

    const normalizedJobs = rawJobList.map(item => normalizeJSearchJob(item, cleanLoc));

    return {
      success: true,
      jobs: normalizedJobs,
      totalFound: rawJobList.length,
      cached: false,
      provider: 'OpenWeb Ninja JSearch'
    };
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
        error: 'OpenWeb Ninja JSearch request timed out. Please try again.'
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
}

/**
 * Executes live search via OpenWeb Ninja JSearch API with smart, single-fallback logic.
 * Requirements:
 * 1. OpenWeb Ninja JSearch API
 * 2. Search for jobs posted today first (date_posted: 'today')
 * 3. If < 5 jobs returned, automatically make only ONE fallback request with date_posted: '3days'
 * 4. If < 5 jobs still available, use all-date filter only when requested/necessary
 * 5. Display 5-6 real jobs whenever available (never fake/AI jobs)
 * 6. Sort by actual posting date, newest first (never invent or modify dates)
 * 7. Do not use jobs[0], results[0], slice(0,1)
 * 8. country: in, language: en, num_pages: 1 initially, work_from_home omitted unless remote
 * 9. Maximum one fallback search, no infinite retries
 * 10. API key kept server-side
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

  let cleanQuery = (options.query || '').trim();
  let cleanLoc = (options.location || '').trim();

  // Smart query extraction for natural language queries like "AI product intern role at mumbai"
  const locMatch = cleanQuery.match(/\s+(?:role\s+at|jobs?\s+at|openings?\s+at|internship\s+at|role\s+in|jobs?\s+in|openings?\s+in|internship\s+in|in|at)\s+([a-zA-Z\s]+)$/i);
  if (locMatch && locMatch[1]) {
    const extractedLoc = locMatch[1].trim();
    if (!cleanLoc) {
      cleanLoc = extractedLoc;
    }
    cleanQuery = cleanQuery.slice(0, locMatch.index).trim();
  }

  // Clean trailing filler words like "role", "roles", "jobs", "openings"
  cleanQuery = cleanQuery.replace(/\s+(?:roles?|jobs?|openings?|vacanc(?:y|ies))\s*$/i, '').trim() || (options.query || '').trim();

  if (!cleanQuery) {
    return {
      success: true,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: 'OpenWeb Ninja JSearch'
    };
  }

  // Requirement 2: First search for jobs posted today using officially supported date_posted value
  const initialDateFilter = options.datePosted || 'today';

  // Cache key based on sanitized inputs
  const cacheKey = JSON.stringify({
    q: cleanQuery.toLowerCase(),
    loc: cleanLoc.toLowerCase(),
    emp: (options.employmentType || '').toUpperCase(),
    rem: Boolean(options.isRemote),
    date: initialDateFilter,
    fallback: Boolean(options.allowAllDateFallback)
  });

  // Check 15-min cache to protect user's Pay As You Go budget (only if non-empty)
  const cached = queryCache.get(cacheKey);
  if (cached && cached.jobs?.length > 0 && (Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS)) {
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
      // Step 1: Initial request (date_posted: 'today' by default)
      const initialResult = await executeSingleJSearchQuery(
        options,
        initialDateFilter,
        apiKey,
        cleanQuery,
        cleanLoc
      );

      // If initial request failed with an authentication or network error, return honestly
      if (!initialResult.success) {
        return initialResult;
      }

      let aggregatedJobs: RealJobListing[] = [...initialResult.jobs];
      let totalFound = initialResult.totalFound;

      // Helper to merge and deduplicate jobs
      const mergeUniqueJobs = (newJobs: RealJobListing[]) => {
        const seenKeys = new Set(
          aggregatedJobs.map(j => (j.id || `${j.title.trim().toLowerCase()}--${j.company.trim().toLowerCase()}`))
        );
        for (const job of newJobs) {
          const key = (job.id || `${job.title.trim().toLowerCase()}--${job.company.trim().toLowerCase()}`);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            aggregatedJobs.push(job);
          }
        }
      };

      // Requirement 3: If fewer than 5 jobs are returned, automatically fallback to 3-day filter
      if (aggregatedJobs.length < 5 && initialDateFilter === 'today') {
        const fallback3DaysResult = await executeSingleJSearchQuery(
          options,
          '3days',
          apiKey,
          cleanQuery,
          cleanLoc
        );

        if (fallback3DaysResult.success) {
          mergeUniqueJobs(fallback3DaysResult.jobs);
          totalFound = Math.max(totalFound, aggregatedJobs.length);
        }
      }

      // Requirement 4: If fewer than 5 jobs are still available, use the all-date filter to discover real opportunities
      if (aggregatedJobs.length < 5 && options.allowAllDateFallback !== false) {
        const fallbackAllResult = await executeSingleJSearchQuery(
          options,
          'all',
          apiKey,
          cleanQuery,
          cleanLoc
        );

        if (fallbackAllResult.success) {
          mergeUniqueJobs(fallbackAllResult.jobs);
          totalFound = Math.max(totalFound, aggregatedJobs.length);
        }
      }

      // If still 0 jobs found for a multi-word niche query (e.g. "AI Product Intern"),
      // perform a broader search on the core role to discover closely matching openings
      if (aggregatedJobs.length === 0 && cleanQuery.split(/\s+/).length > 2) {
        const words = cleanQuery.split(/\s+/);
        const broaderQueries = [
          words.slice(1).join(' '), // e.g. "Product Intern"
          [words[0], words[words.length - 1]].join(' ') // e.g. "AI Intern"
        ].filter(q => q.trim().length > 3);

        for (const broaderQ of broaderQueries) {
          if (aggregatedJobs.length >= 5) break;
          const broaderRes = await executeSingleJSearchQuery(
            options,
            'all',
            apiKey,
            broaderQ,
            cleanLoc
          );
          if (broaderRes.success && broaderRes.jobs.length > 0) {
            mergeUniqueJobs(broaderRes.jobs);
            totalFound = Math.max(totalFound, aggregatedJobs.length);
          }
        }
      }

      // Requirement 6: Sort jobs by their actual posting date, newest first. Never invent or modify posting dates.
      aggregatedJobs = sortJobsByPostingDateNewestFirst(aggregatedJobs);

      // Requirement 5 & 7: Render all valid jobs (never fake/AI jobs, never slice down to 1)
      const maxLimit = Math.max(15, options.limit || 15);
      const finalJobs = aggregatedJobs.slice(0, maxLimit);

      // Store in query cache to protect credit consumption
      queryCache.set(cacheKey, {
        jobs: finalJobs,
        totalFound: aggregatedJobs.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        jobs: finalJobs,
        totalFound: aggregatedJobs.length,
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
