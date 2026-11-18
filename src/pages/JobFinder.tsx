import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ExternalLink, Sparkles, Building2, Calendar, LoaderCircle, Loader2, Briefcase, ChevronRight, Zap, AlertCircle, ShieldCheck, TrendingUp, Target, RotateCcw, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { findJobsDetailed, JobSearchResult } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query as fsQuery, orderBy, limit as fsLimit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { formatCreditAvailability } from '../utils/formatters';
import { Send, MessageSquare } from 'lucide-react';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AILoadingStepper from '../components/AILoadingStepper';
import { useSystemOS } from '../context/SystemOSContext';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { isDemoRole } from '../utils/demoDataSanitizer';
import { ActiveJobContext, extractJobSkills } from '../utils/jobContextManager';

interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  skills?: string[];
  datePosted: string;
  source?: string;
  provider?: string;
  retrievedAt?: string;
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

export default function JobFinder() {
  const { user } = useAuth();
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const { hasAccess } = checkAccess('jobSearches');

  // Job Title starts completely empty for fresh users. Only user-entered real queries are retained.
  const [query, setQuery] = useState(() => {
    try {
      const stored = sessionStorage.getItem('job_finder_user_query');
      if (stored && stored.trim() && !isDemoRole(stored)) {
        return stored.trim();
      }
    } catch (e) {}
    return '';
  });

  const [location, setLocation] = useState(() => {
    try {
      const stored = sessionStorage.getItem('job_finder_user_location');
      return stored || '';
    } catch (e) {
      return '';
    }
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const stored = sessionStorage.getItem('job_finder_search_results');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('job_finder_search_notice') || null;
    } catch (e) {
      return null;
    }
  });
  const [hasSearched, setHasSearched] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('job_finder_has_searched') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isFromCache, setIsFromCache] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState('');
  const [providerStatus, setProviderStatus] = useState<{
    provider: string;
    configured: boolean;
    plan: string;
  } | null>(null);
  const navigate = useNavigate();
  const locationState = useLocation();

  const { activeTargetRole, currentActiveJob, setCurrentActiveJob, clearCurrentJobContext } = useSystemOS();
  const hasAutoSearchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchSequenceRef = useRef<number>(0);

  // Check OpenWeb Ninja JSearch provider configuration on mount
  useEffect(() => {
    fetch('/api/jobs/provider-status')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.configured === 'boolean') {
          setProviderStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize query when navigated with explicit route state, ignoring any legacy demo roles
  useEffect(() => {
    if (locationState.state?.role || locationState.state?.query) {
      const targetQuery = locationState.state.role || locationState.state.query;
      if (targetQuery && !isDemoRole(targetQuery)) {
        setQuery(targetQuery);
        try {
          sessionStorage.setItem('job_finder_user_query', targetQuery);
        } catch (e) {}
        if (locationState.state?.autoSearch && !hasAutoSearchedRef.current) {
          hasAutoSearchedRef.current = true;
          handleSearchWithQuery(targetQuery, location);
        }
      }
    }
  }, [locationState.state]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    try {
      if (!val || !val.trim() || isDemoRole(val)) {
        sessionStorage.removeItem('job_finder_user_query');
      } else {
        sessionStorage.setItem('job_finder_user_query', val);
      }
    } catch (e) {}
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    try {
      if (!val || !val.trim()) {
        sessionStorage.removeItem('job_finder_user_location');
      } else {
        sessionStorage.setItem('job_finder_user_location', val);
      }
    } catch (e) {}
  };

  useEffect(() => {
    async function fetchCandidateProfile() {
      if (!user) return;
      try {
        const resumesSnap = await getDocs(
          fsQuery(
            collection(db, 'users', user.uid, 'resumes'),
            orderBy('createdAt', 'desc'),
            fsLimit(1)
          )
        );
        if (!resumesSnap.empty) {
          const docData = resumesSnap.docs[0].data() as any;
          setCandidateProfile(
            docData.rawText || docData.text || docData.extractedText || docData.analysis?.summary || ''
          );
        }
      } catch (err) {
        console.warn('Could not fetch candidate profile for job matching:', err);
      }
    }
    fetchCandidateProfile();
  }, [user]);

  const popularSearches = [
    'AI Product Intern',
    'Frontend Developer',
    'Full Stack Engineer',
    'Data Analyst',
    'AI Engineer',
    'Product Manager',
  ];

  const handlePopularSearch = (searchQuery: string) => {
    handleQueryChange(searchQuery);
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as FormEvent;
      handleSearchWithQuery(searchQuery, location, formEvent);
    }, 0);
  };

  const handleSelectJob = (targetJob: Job) => {
    // If clicking an already selected job, toggle clear
    if (
      currentActiveJob &&
      currentActiveJob.title.toLowerCase() === targetJob.title.toLowerCase() &&
      currentActiveJob.company.toLowerCase() === targetJob.company.toLowerCase()
    ) {
      clearCurrentJobContext();
      return;
    }

    const skills = targetJob.skills && targetJob.skills.length > 0 
      ? targetJob.skills 
      : extractJobSkills(targetJob);
    const stableId = targetJob.id || `${targetJob.title}-${targetJob.company}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const activeJob: ActiveJobContext = {
      id: stableId,
      title: targetJob.title,
      company: targetJob.company,
      location: targetJob.location,
      description: targetJob.description,
      skills,
      datePosted: targetJob.datePosted,
      retrievedAt: targetJob.retrievedAt || new Date().toISOString(),
      isRemote: targetJob.isRemote,
      jobType: targetJob.jobType,
      matchScore: targetJob.matchScore,
      roleTier: targetJob.roleTier,
      relevanceCategory: targetJob.relevanceCategory,
      relevanceLabel: targetJob.relevanceLabel,
      locationMatch: targetJob.locationMatch,
      missingCriteria: targetJob.missingCriteria,
      link: targetJob.link,
      provider: targetJob.provider || targetJob.source || 'External Provider',
      source: targetJob.source || 'search',
      selectedAt: Date.now()
    };
    setCurrentActiveJob(activeJob);
  };

  const handleResetSearch = () => {
    // 1. Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    searchSequenceRef.current++;

    // 2. Clear user input fields
    setQuery('');
    setLocation('');

    // 3. Clear results, search notice, and statuses
    setJobs([]);
    setLoading(false);
    setError(null);
    setSearchNotice(null);
    setHasSearched(false);
    setIsFromCache(false);

    // 4. Complete Reset: clear active selected job so user starts completely fresh
    clearCurrentJobContext();

    // 5. Remove session storage keys
    try {
      sessionStorage.removeItem('job_finder_user_query');
      sessionStorage.removeItem('job_finder_user_location');
      sessionStorage.removeItem('job_finder_search_results');
      sessionStorage.removeItem('job_finder_search_notice');
      sessionStorage.removeItem('job_finder_has_searched');
    } catch (e) {
      console.warn('Failed to clear sessionStorage for job finder:', e);
    }
  };

  const handleSearchWithQuery = async (
    searchQuery: string,
    searchLoc: string,
    e?: FormEvent,
    allowFallback: boolean = false
  ) => {
    if (e) e.preventDefault();

    // If query is empty or whitespace, gracefully default to activeTargetRole or 'Software Engineer'
    let effectiveQuery = (searchQuery || '').trim();
    if (!effectiveQuery) {
      effectiveQuery = (activeTargetRole && !isDemoRole(activeTargetRole))
        ? activeTargetRole.trim()
        : 'Software Engineer';
      handleQueryChange(effectiveQuery);
    }

    // Abort previous in-flight request if one exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++searchSequenceRef.current;

    const trimmedQuery = effectiveQuery;
    const trimmedLoc = searchLoc ? searchLoc.trim() : '';

    // Search results are for pure discovery - do NOT mutate or clear active job context
    setJobs([]);
    setLoading(true);
    setError(null);
    setSearchNotice(null);
    setHasSearched(true);
    setIsFromCache(false);

    try {
      const cacheKey = cacheManager.generateJobKey(trimmedQuery, trimmedLoc + (allowFallback ? '_fb' : ''));
      
      let cached: any = null;
      try {
        cached = cacheManager.get<any>(cacheKey);
      } catch (err) {
        console.warn('Cache access failure:', err);
      }

      if (cached) {
        const cachedJobs = Array.isArray(cached) ? cached : (cached.jobs || []);
        const cachedNotice = !Array.isArray(cached) && cached.notice ? cached.notice : null;
        if (cachedJobs.length > 0) {
          if (currentSeq !== searchSequenceRef.current) return;
          setJobs(cachedJobs);
          setSearchNotice(cachedNotice);
          try {
            sessionStorage.setItem('job_finder_search_results', JSON.stringify(cachedJobs));
            if (cachedNotice) sessionStorage.setItem('job_finder_search_notice', cachedNotice);
            else sessionStorage.removeItem('job_finder_search_notice');
            sessionStorage.setItem('job_finder_has_searched', 'true');
          } catch (e) {}
          setIsFromCache(true);
          setLoading(false);
          return;
        }
      }

      if (!hasAccess) {
        setSearchNotice('Daily free search quota reached. Results are provided in live discovery mode.');
      }

      try {
        await deductCredit('jobSearches');
      } catch (creditErr) {
        console.warn('Credit usage logging deferred:', creditErr);
      }

      const searchResult: JobSearchResult = await findJobsDetailed(
        trimmedQuery,
        trimmedLoc,
        candidateProfile,
        12,
        controller.signal,
        allowFallback
      );

      if (currentSeq !== searchSequenceRef.current) return;

      if (searchResult.errorCode) {
        if (searchResult.errorCode === 'MISSING_KEY' || searchResult.requiresKey || searchResult.errorCode === 'AUTH_ERROR') {
          // If key is not configured or auth error, auto-fallback to public live feeds seamlessly
          handleSearchWithQuery(trimmedQuery || activeTargetRole || "Full Stack Developer", trimmedLoc, undefined, true);
          return;
        } else if (searchResult.errorCode === 'RATE_LIMIT') {
          setError(
            'OpenWeb Ninja JSearch credit limit or rate quota reached. Please check your Pay As You Go plan balance on OpenWeb Ninja.'
          );
        } else if (searchResult.errorCode === 'TIMEOUT') {
          setError('OpenWeb Ninja JSearch request timed out. Please retry.');
        } else {
          setError(searchResult.error || 'Failed to retrieve job listings. Please try again.');
        }
        setJobs([]);
        return;
      }

      if (searchResult.isConfigured !== undefined) {
        setProviderStatus(prev => prev ? { ...prev, configured: Boolean(searchResult.isConfigured) } : null);
      }

      setJobs(searchResult.jobs);
      setSearchNotice(searchResult.message || null);
      try {
        sessionStorage.setItem('job_finder_search_results', JSON.stringify(searchResult.jobs));
        if (searchResult.message) sessionStorage.setItem('job_finder_search_notice', searchResult.message);
        else sessionStorage.removeItem('job_finder_search_notice');
        sessionStorage.setItem('job_finder_has_searched', 'true');
      } catch (e) {}
      
      cacheManager.set(cacheKey, { jobs: searchResult.jobs, notice: searchResult.message }, 30 * 60 * 1000);
    } catch (err: any) {
      if (err.name === 'AbortError' || currentSeq !== searchSequenceRef.current) {
        // Intentional abort or superseded by a newer search/reset
        return;
      }
      console.error('Search failed:', err);
      setError(err.message || "Failed to retrieve job listings. Please try again.");
    } finally {
      if (currentSeq === searchSequenceRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e: FormEvent) => handleSearchWithQuery(query, location, e);

  const trackJob = async (job: Job) => {
    if (!user) return;
    handleSelectJob(job);
    try {
      await addDoc(collection(db, 'users', user.uid, 'jobs'), {
        userId: user.uid,
        company: job.company,
        role: job.title,
        status: 'Applied',
        appliedDate: new Date().toISOString(),
        notes: `Source: ${job.link}\n\n${job.description}`
      });
      navigate('/jobs');
    } catch (error) {
      console.error('Failed to track job:', error);
    }
  };

  const alignResume = (job: Job) => {
    handleSelectJob(job);
    const metaParts: string[] = [`${job.title} at ${job.company}`];
    if (job.location) metaParts.push(`Location: ${job.location}`);
    if (job.isRemote) metaParts.push('Remote');
    const formattedDesc = job.description ? `${metaParts.join(' · ')}\n\n${job.description}` : metaParts.join(' · ');
    navigate('/analyzer', { state: { jobDescription: formattedDesc, forceResetAnalysis: true } });
  };

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-cta)]" />
          <p className="text-xs text-[var(--hf-text-secondary)] tracking-wide animate-pulse">Initializing Job Finder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 font-sans">
      {/* Header */}
      <div className="mb-8 pb-6 border-b-[1.5px] border-[var(--hf-ink-border)] font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)]">
            03 // LIVE REQUISITION INDEX
          </span>
          <div className="px-3 py-1.5 border-[1.5px] border-[var(--hf-ink-border)] rounded-sm bg-[var(--hf-surface)] shadow-[2px_2px_0px_var(--hf-ink-border)] flex items-center gap-2 text-xs text-[var(--hf-text)]">
            <span className="w-2 h-2 bg-[var(--hf-success)]" />
            <span className="font-mono font-bold tabular-nums">
              {formatCreditAvailability(creditWallet?.balance, creditCosts?.jobMatchAnalysis ?? 20, 'searches')}
            </span>
          </div>
        </div>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight mb-1.5">Job finder</h1>
        <p className="text-sm text-[var(--hf-text-secondary)] max-w-2xl">
          Discover verified job vacancies from live external sources with AI-powered candidate compatibility matching.
        </p>
      </div>

      {/* Search Console */}
      <div className="mb-8 p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface)] shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label htmlFor="job-role-input" className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                Job role or title
              </label>
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="relative group">
              <input 
                id="job-role-input"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]/20 focus:border-[var(--hf-cta)] transition-all"
                placeholder="e.g. AI Product Intern at Mumbai, Software Engineer"
                aria-label="Job Role or Title"
              />
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hf-text-muted)]" aria-hidden="true" />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] p-1 text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] rounded-md transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Clear job role"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label htmlFor="job-location-input" className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                Location or remote
              </label>
              {location && (
                <button
                  type="button"
                  onClick={() => handleLocationChange('')}
                  className="text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="relative group">
              <input 
                id="job-location-input"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]/20 focus:border-[var(--hf-cta)] transition-all"
                placeholder="e.g. Remote or Worldwide"
                aria-label="Job Location or Remote"
              />
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hf-text-muted)]" aria-hidden="true" />
              {location && (
                <button
                  type="button"
                  onClick={() => handleLocationChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] p-1 text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] rounded-md transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Clear location"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 min-h-[44px] bg-[var(--hf-cta)] hover:opacity-90 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search jobs</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="reset-search-button"
              onClick={handleResetSearch}
              title="Reset and clear search"
              aria-label="Reset Search"
              className="min-h-[44px] px-3.5 py-2.5 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)] rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="mt-5 pt-4 border-t border-[var(--hf-border)]">
          <span className="text-xs font-medium text-[var(--hf-text-muted)] block mb-2">Popular searches:</span>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((chip) => (
              <button
                key={chip}
                onClick={() => handlePopularSearch(chip)}
                className="min-h-[36px] sm:min-h-[32px] px-3 py-1 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)] rounded-md text-xs font-medium transition-all cursor-pointer flex items-center"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="min-h-[400px]">
        {isFromCache && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md text-xs font-medium text-[var(--hf-teal)] shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cached results</span>
            </div>
          </div>
        )}
        {loading ? (
          <div className="max-w-2xl mx-auto my-6">
            <AILoadingStepper presetKey="job_finder" title="Live Job Index & Compatibility Engine" />
          </div>
        ) : error ? (
          <div className="py-12 text-center bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl p-6 sm:p-8 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[var(--hf-error)]/10 text-[var(--hf-error)] flex items-center justify-center mx-auto mb-3 border border-[var(--hf-error)]/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold font-sans text-[var(--hf-text)] mb-1.5">Search error</h3>
            <p className="text-sm text-[var(--hf-text-secondary)] mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button 
                id="retry-search-button"
                onClick={() => handleSearchWithQuery(query.trim() || activeTargetRole || "Full Stack Developer", location)}
                className="min-h-[44px] px-5 py-2.5 bg-[var(--hf-cta)] hover:opacity-90 text-white rounded-lg text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer"
              >
                Retry search
              </button>
              <button 
                id="fallback-search-button"
                onClick={() => handleSearchWithQuery(query.trim() || activeTargetRole || "Full Stack Developer", location, undefined, true)}
                className="min-h-[44px] px-4 py-2.5 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)] rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--hf-teal)]" />
                <span>Search public feeds</span>
              </button>
              <button 
                onClick={handleResetSearch}
                className="min-h-[44px] px-4 py-2.5 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)] rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        ) : hasSearched && jobs.length === 0 ? (
          (() => {
            const isIndiaSearch = (location && location.toLowerCase().includes('india')) || (query && query.toLowerCase().includes('india'));
            return (
              <EmptyState
                icon={Search}
                title={isIndiaSearch ? "No sufficiently relevant live job listings found in India" : "No matching live job listings were found"}
                targetRole={query || activeTargetRole || "Current search"}
                description={
                  isIndiaSearch 
                    ? `No live postings from verified external feeds currently match "${query}" with strict India eligibility. Worldwide or incompatible location roles were filtered out to protect relevance.`
                    : "No matching live job listings were found for this search from verified external sources. Try another role title, broader location, or alternative keywords."
                }
                benefitMetric={
                  isIndiaSearch
                    ? "Strict location enforcement ensures only genuine local or India-eligible openings are shown"
                    : "Real job listings are sourced directly from verified job boards and live career portals"
                }
                primaryAction={{
                  label: "Reset & Clear Search",
                  onClick: handleResetSearch,
                  icon: RotateCcw
                }}
                secondaryAction={
                  isIndiaSearch ? {
                    label: "Search 'AI Engineer' Remote",
                    onClick: () => {
                      setQuery("AI Engineer");
                      setLocation("Remote");
                      handleSearchWithQuery("AI Engineer", "Remote");
                    },
                    icon: Search
                  } : {
                    label: "Search 'Full Stack Developer'",
                    onClick: () => handlePopularSearch("Full Stack Developer"),
                    icon: Search
                  }
                }
              />
            );
          })()
        ) : !hasSearched ? (
          <EmptyState
            icon={Building2}
            title="Find verified job openings"
            targetRole={activeTargetRole || "Engineering & Tech"}
            description="Search live job postings from verified external providers and compare them against your profile."
            benefitMetric="Real job listings are fetched directly from external providers without synthetic generation"
            primaryAction={{
              label: "Search 'Full Stack Developer'",
              onClick: () => handlePopularSearch("Full Stack Developer"),
              icon: Search
            }}
            secondaryAction={{
              label: "Search 'Frontend Developer'",
              onClick: () => handlePopularSearch("Frontend Developer"),
              icon: Search
            }}
          />
        ) : (
          <>
            {currentActiveJob && (
              <div className="mb-6 p-4 sm:p-5 rounded-xl bg-[var(--hf-surface)] border border-[var(--hf-border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-teal)] shrink-0 mt-0.5">
                    <Target className="w-5 h-5 text-[var(--hf-teal)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--hf-surface-secondary)] text-[var(--hf-teal)] border border-[var(--hf-border)] text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-teal)]" />
                        Active job
                      </span>
                      <span className="text-xs text-[var(--hf-text-muted)] font-normal">
                        Selected for analysis and application actions
                      </span>
                      {currentActiveJob.relevanceLabel && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          currentActiveJob.relevanceLabel.toLowerCase().includes('exact')
                            ? 'bg-[var(--hf-mint)]/30 text-[var(--hf-success)] border-[var(--hf-success)]/30'
                            : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
                        }`}>
                          {currentActiveJob.relevanceLabel}
                        </span>
                      )}
                      {currentActiveJob.provider && (
                        <span className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md text-[11px] font-medium text-[var(--hf-text-secondary)]">
                          {currentActiveJob.provider}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <p className="text-base font-bold text-[var(--hf-text)] leading-snug">
                        {currentActiveJob.title}
                      </p>
                      <p className="text-sm font-medium text-[var(--hf-text-secondary)]">
                        at {currentActiveJob.company}
                        {currentActiveJob.location && (
                          <span className="text-xs text-[var(--hf-text-muted)] font-normal ml-2">· {currentActiveJob.location}</span>
                        )}
                        {currentActiveJob.isRemote && (
                          <span className="text-xs text-[var(--hf-text-muted)] font-normal ml-2">· Remote</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-[var(--hf-border)] w-full md:w-auto justify-end">
                  {currentActiveJob.link && (
                    <a
                      href={currentActiveJob.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-2 text-xs font-medium text-[var(--hf-cta)] hover:underline flex items-center gap-1"
                    >
                      <span>Official posting</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => clearCurrentJobContext()}
                    className="min-h-[44px] px-3 py-2 text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] font-medium transition-colors cursor-pointer flex items-center"
                  >
                    Clear active job
                  </button>
                  <button
                    onClick={handleResetSearch}
                    className="min-h-[44px] px-3 py-2 text-xs text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] font-medium transition-colors cursor-pointer flex items-center gap-1.5 border border-[var(--hf-border)] rounded-lg bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)]"
                    title="Complete Job Search Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset search</span>
                  </button>
                </div>
              </div>
            )}

            {(() => {
              const exactMatches = (jobs || []).filter(j => j.relevanceCategory === 'exact');
              const relatedMatches = (jobs || []).filter(j => j.relevanceCategory !== 'exact');

              return (
                <>
                  {/* Results Summary and Reset Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-[var(--hf-border)]">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-[var(--hf-surface-secondary)] text-[var(--hf-teal)] border border-[var(--hf-border)]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--hf-text)]">
                          {jobs.length} verified vacanc{jobs.length === 1 ? 'y' : 'ies'} found
                        </span>
                        {query && (
                          <span className="text-xs text-[var(--hf-text-secondary)]">
                            for &ldquo;<strong className="text-[var(--hf-text)] font-semibold">{query}</strong>&rdquo;{location ? ` in ${location}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      id="reset-search-results-button"
                      onClick={handleResetSearch}
                      className="self-start sm:self-auto min-h-[44px] px-3.5 py-2 rounded-lg border border-[var(--hf-border)] hover:bg-[var(--hf-surface)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset search</span>
                    </button>
                  </div>

                  {/* Notice if no exact matches found but related listings exist */}
                  {exactMatches.length === 0 && relatedMatches.length > 0 && (
                    <div className="mb-6 p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                              Strict constraint enforcement
                            </span>
                            <span className="text-xs font-medium text-[var(--hf-text-muted)]">0 exact matches</span>
                          </div>
                          <h3 className="text-sm font-semibold font-sans text-[var(--hf-text)] mb-1">
                            {searchNotice || `No sufficiently relevant live job listings were found for this role${location ? ` in ${location}` : ''}.`}
                          </h3>
                          <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                            Verified live feeds do not currently have openings that satisfy every specified constraint (such as strict local eligibility or seniority level).
                            To protect you from misleading fit scores, all listings below are categorized as <strong>related matches</strong> with specific differences highlighted.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Exact Matches */}
                  {exactMatches.length > 0 && (
                    <div className="mb-10">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2.5 border-b border-[var(--hf-border)]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--hf-success)]" />
                          <h2 className="text-base sm:text-lg font-semibold font-sans text-[var(--hf-text)] flex items-center gap-2">
                            Exact matches
                            <span className="text-xs font-medium font-sans px-2 py-0.5 rounded-md bg-[var(--hf-mint)]/30 text-[var(--hf-success)] border border-[var(--hf-success)]/30 tabular-nums">
                              {exactMatches.length}
                            </span>
                          </h2>
                        </div>
                        <span className="text-xs font-medium font-sans text-[var(--hf-success)] bg-[var(--hf-mint)]/20 px-2.5 py-1 rounded-md border border-[var(--hf-success)]/20">
                          Satisfies role, seniority & location criteria
                        </span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <AnimatePresence>
                          {exactMatches.map((job, index) => (
                            <JobListingCard
                              key={job.id || `${job.title}-${job.company}-${index}`}
                              job={job}
                              index={index}
                              currentActiveJob={currentActiveJob}
                              onSelect={handleSelectJob}
                              onAlignResume={alignResume}
                              onTrackJob={trackJob}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Related Matches */}
                  {relatedMatches.length > 0 && (
                    <div className="mb-10">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2.5 border-b border-[var(--hf-border)]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <h2 className="text-base sm:text-lg font-semibold font-sans text-[var(--hf-text)] flex items-center gap-2">
                            Related live opportunities
                            <span className="text-xs font-medium font-sans px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 tabular-nums">
                              {relatedMatches.length}
                            </span>
                          </h2>
                        </div>
                        <span className="text-xs font-medium font-sans text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                          {exactMatches.length === 0 ? 'Verified feed alternatives (differences noted)' : 'Broader / worldwide openings'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <AnimatePresence>
                          {relatedMatches.map((job, index) => (
                            <JobListingCard
                              key={job.id || `${job.title}-${job.company}-${index}`}
                              job={job}
                              index={index}
                              currentActiveJob={currentActiveJob}
                              onSelect={handleSelectJob}
                              onAlignResume={alignResume}
                              onTrackJob={trackJob}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {currentActiveJob && (
              <NextStepBridgeCard
                title="Active job selected"
                contextData={`Targeting ${currentActiveJob.title} at ${currentActiveJob.company}${currentActiveJob.matchScore ? ` (${currentActiveJob.matchScore}% fit)` : ''}. Accelerate your preparation with targeted outreach and mock interviews.`}
                primaryStep={{
                  label: "Draft recruiter pitch",
                  icon: Send,
                  to: "/outreach",
                  state: {
                    company: currentActiveJob.company,
                    role: currentActiveJob.title
                  }
                }}
                secondaryStep={{
                  label: "Simulate role interview",
                  icon: MessageSquare,
                  to: "/interview",
                  state: {
                    company: currentActiveJob.company,
                    role: currentActiveJob.title,
                    jobDescription: currentActiveJob.description || `Position: ${currentActiveJob.title} at ${currentActiveJob.company}`
                  }
                }}
              />
            )}
          </>
        )}
      </div>
      
      {!hasSearched && (
        <div className="py-16 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
             <div className="p-6 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl text-left shadow-xs">
                <div className="w-10 h-10 bg-[var(--hf-surface-secondary)] rounded-lg flex items-center justify-center mb-3 border border-[var(--hf-border)] text-[var(--hf-teal)]">
                   <TargetIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold font-sans text-[var(--hf-text)] mb-1">Live market index</h4>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">Verified open roles from live web portals and verified employer boards.</p>
             </div>
             <div className="p-6 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl text-left shadow-xs">
                <div className="w-10 h-10 bg-[var(--hf-surface-secondary)] rounded-lg flex items-center justify-center mb-3 border border-[var(--hf-border)] text-[var(--hf-cta)]">
                   <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold font-sans text-[var(--hf-text)] mb-1">Real-time matching</h4>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">Direct comparison against your latest analyzed resume skills and profile.</p>
             </div>
             <div className="p-6 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl text-left shadow-xs">
                <div className="w-10 h-10 bg-[var(--hf-surface-secondary)] rounded-lg flex items-center justify-center mb-3 border border-[var(--hf-border)] text-[var(--hf-teal)]">
                   <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold font-sans text-[var(--hf-text)] mb-1">Direct pipeline</h4>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">Save openings to your job tracker pipeline and trigger tailored interview prep.</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TargetIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function JobListingCard({
  job,
  index,
  currentActiveJob,
  onSelect,
  onAlignResume,
  onTrackJob,
}: {
  job: Job;
  index: number;
  currentActiveJob: ActiveJobContext | null;
  onSelect: (job: Job) => void;
  onAlignResume: (job: Job) => void;
  onTrackJob: (job: Job) => void;
}) {
  const isSelected = Boolean(
    currentActiveJob &&
    currentActiveJob.title.toLowerCase() === job.title.toLowerCase() &&
    currentActiveJob.company.toLowerCase() === job.company.toLowerCase()
  );

  const isExact = job.relevanceCategory === 'exact' || (job.relevanceLabel && job.relevanceLabel.toLowerCase().includes('exact'));

  const getLocationBadgeClass = (locMatch?: string) => {
    if (!locMatch) return 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]';
    const l = locMatch.toLowerCase();
    if (l.includes('incompatible')) {
      return 'bg-rose-500/10 text-[var(--hf-error)] border-rose-500/20';
    }
    // Supporting metadata: quiet neutral styling rather than intense green
    return 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={`bg-[var(--hf-surface)] p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] flex flex-col hover:border-[var(--hf-text-muted)]/40 transition-all shadow-xs relative group font-sans ${
        isSelected ? 'ring-2 ring-[var(--hf-teal)] border-[var(--hf-teal)]' : ''
      }`}
    >
      {/* 1. Opportunity Header (Company & Top-Level Match Signals) */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-teal)] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold font-sans text-[var(--hf-text-secondary)] truncate">
            {job.company}
          </p>
        </div>

        {/* 2. MATCH SIGNALS (Primary fit score + Secondary relevance) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* SECONDARY: Relevance Label */}
          <span
            className={`text-xs font-medium font-sans px-2 py-0.5 rounded-md border ${
              isExact
                ? 'bg-[var(--hf-mint)]/20 text-[var(--hf-success)] border-[var(--hf-success)]/30'
                : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]'
            }`}
          >
            {job.relevanceLabel || (isExact ? 'Exact match' : 'Related match')}
          </span>

          {/* PRIMARY: Fit Score (Strongest visual emphasis) */}
          {job.matchScore !== undefined && (
            <span
              className={`text-xs font-bold font-sans tabular-nums px-2.5 py-0.5 rounded-md border ${
                job.matchScore >= 80
                  ? 'bg-[var(--hf-mint)]/40 text-[var(--hf-success)] border-[var(--hf-success)]/40'
                  : job.matchScore >= 60
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-[var(--hf-error)] border-rose-500/30'
              }`}
            >
              {job.matchScore}% fit
            </span>
          )}

          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-[var(--hf-text-muted)] hover:text-[var(--hf-cta)] transition-colors rounded-md"
            title="Open official job post"
            aria-label={`Open official job post for ${job.title}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* JOB TITLE */}
      <h3 className="text-base sm:text-lg font-bold font-sans text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] transition-colors mb-2 leading-snug">
        {job.title}
      </h3>

      {/* SUPPORTING METADATA: Visually quiet neutral chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3.5 text-xs text-[var(--hf-text-secondary)] font-sans">
        {job.roleTier && (
          <span className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md text-[var(--hf-text-muted)] font-medium">
            {job.roleTier} role
          </span>
        )}
        {job.locationMatch && (
          <span className={`px-2 py-0.5 rounded-md border font-medium ${getLocationBadgeClass(job.locationMatch)}`}>
            {job.locationMatch}
          </span>
        )}
        {job.source && (
          <div className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-cta)]" />
            <span>{job.source}</span>
          </div>
        )}
        <div className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md flex items-center gap-1 font-medium">
          <MapPin className="w-3 h-3 text-[var(--hf-text-muted)]" />
          <span>{job.location}</span>
        </div>
        {job.isRemote && (
          <div className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md flex items-center font-medium">
            <span>Remote</span>
          </div>
        )}
        {job.jobType && (
          <div className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md flex items-center font-medium">
            <span>{job.jobType}</span>
          </div>
        )}
        {job.datePosted && (
          <div className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md flex items-center gap-1 font-medium text-[var(--hf-text-muted)]">
            <Calendar className="w-3 h-3 text-[var(--hf-text-muted)]" />
            <span>{job.datePosted}</span>
          </div>
        )}
      </div>

      {/* 3. WHY: AI Fit Assessment & Reasoning */}
      {job.matchExplanation && (
        <div className="mb-3 p-3 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs font-sans text-[var(--hf-text-secondary)]">
          <div className="flex items-center justify-between font-semibold text-[var(--hf-teal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--hf-teal)]" />
              <span>Fit assessment</span>
            </span>
            <span className="text-[11px] text-[var(--hf-text-muted)] font-normal">AI match</span>
          </div>
          <p className="italic text-[var(--hf-text)] leading-relaxed">
            &ldquo;{job.matchExplanation}&rdquo;
          </p>
        </div>
      )}

      {/* Differences Callout if present */}
      {job.missingCriteria && job.missingCriteria.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Requirement differences</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/90 list-disc list-inside">
            {job.missingCriteria.map((diff, dIdx) => (
              <li key={dIdx} className="leading-snug">{diff}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Job Description Excerpt */}
      <p className="text-sm font-sans text-[var(--hf-text-secondary)] line-clamp-3 mb-3.5 flex-1 leading-relaxed">
        &ldquo;{job.description}&rdquo;
      </p>

      {/* 4. ACTION: Source, Official Job Post & Card Controls */}
      <div className="mb-3 pt-2.5 border-t border-[var(--hf-border)] flex items-center justify-between text-xs font-sans text-[var(--hf-text-muted)]">
        <span>
          {job.source ? `Source: ${job.source}` : 'External listing'}
        </span>
        <a 
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-1 font-medium text-[var(--hf-cta)] hover:underline"
        >
          <span>Official job post</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onSelect(job)}
          className={`w-full min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isSelected 
              ? 'bg-[var(--hf-mint)]/30 text-[var(--hf-success)] border border-[var(--hf-success)]/40' 
              : 'bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)]'
          }`}
        >
          {isSelected ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[var(--hf-success)]" />
              <span>Active selected job</span>
            </>
          ) : (
            <>
              <Target className="w-4 h-4 text-[var(--hf-teal)]" />
              <span>Select as active job</span>
            </>
          )}
        </button>
      </div>

      {isSelected && (
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => onAlignResume(job)}
            className="flex-1 min-h-[44px] bg-[var(--hf-cta)] hover:opacity-90 text-white font-medium font-sans text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Analyze compatibility</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onTrackJob(job)}
            className="min-h-[44px] min-w-[44px] px-3.5 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg transition-all flex items-center justify-center cursor-pointer"
            title="Add to pipeline"
            aria-label="Add to pipeline"
          >
            <Briefcase className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
