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
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Initializing Job Finder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <Search className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Job Finder</span>
          </div>
          <div className="px-4 py-2 glass border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">
               {formatCreditAvailability(creditWallet?.balance, creditCosts?.jobMatchAnalysis ?? 20, 'searches')}
             </span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">Job Finder</h1>
        <p className="text-ink-dim font-medium text-lg max-w-2xl mb-4">
          Discover real, verified job vacancies from live external sources with AI-powered candidate compatibility matching.
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-panel mb-12 p-8 rounded-3xl border border-border bg-surface">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <label htmlFor="job-role-input" className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block">Job Role / Title</label>
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="text-[10px] text-ink-dim hover:text-accent font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
                className="w-full pl-12 pr-10 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. AI Product Intern at Mumbai, Software Engineer"
                aria-label="Job Role or Title"
              />
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" aria-hidden="true" />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-ink-dim hover:text-ink rounded-lg transition-colors cursor-pointer"
                  aria-label="Clear job role"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <label htmlFor="job-location-input" className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block">Location / Remote</label>
              {location && (
                <button
                  type="button"
                  onClick={() => handleLocationChange('')}
                  className="text-[10px] text-ink-dim hover:text-accent font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
                className="w-full pl-12 pr-10 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. Remote or Worldwide"
                aria-label="Job Location or Remote"
              />
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" aria-hidden="true" />
              {location && (
                <button
                  type="button"
                  onClick={() => handleLocationChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-ink-dim hover:text-ink rounded-lg transition-colors cursor-pointer"
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
              className="flex-1 bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Search Jobs
                </>
              )}
            </button>

            <button
              type="button"
              id="reset-search-button"
              onClick={handleResetSearch}
              title="Reset and clear search"
              aria-label="Reset Search"
              className="px-4 py-4 bg-background hover:bg-surface-light text-ink-dim hover:text-ink border border-border hover:border-accent/40 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider block mb-3">Popular Searches:</span>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((chip) => (
              <button
                key={chip}
                onClick={() => handlePopularSearch(chip)}
                className="px-3 py-1.5 bg-background hover:bg-accent/10 hover:border-accent/30 text-ink-dim hover:text-accent border border-border rounded-xl text-xs font-medium transition-all cursor-pointer"
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
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Cached Results</span>
            </div>
          </div>
        )}
        {loading ? (
          <div className="max-w-2xl mx-auto my-6">
            <AILoadingStepper presetKey="job_finder" title="Live Job Index & Compatibility Engine" />
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-surface border border-border rounded-3xl p-8 max-w-lg mx-auto">
            <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Search Error</h3>
            <p className="text-rose-400/80 text-sm mb-6">
              {error}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button 
                id="retry-search-button"
                onClick={() => handleSearchWithQuery(query.trim() || activeTargetRole || "Full Stack Developer", location)}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                Retry Search
              </button>
              <button 
                id="fallback-search-button"
                onClick={() => handleSearchWithQuery(query.trim() || activeTargetRole || "Full Stack Developer", location, undefined, true)}
                className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Search Public Feeds
              </button>
              <button 
                onClick={handleResetSearch}
                className="px-4 py-2.5 bg-surface-light hover:bg-surface-light/80 text-ink-dim hover:text-ink border border-border rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
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
              <div className="mb-6 p-4 rounded-2xl bg-accent/10 border border-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse mt-1 sm:mt-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Active Selected Real Job</p>
                      {currentActiveJob.relevanceLabel && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                          currentActiveJob.relevanceLabel.toLowerCase().includes('exact')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {currentActiveJob.relevanceLabel}
                        </span>
                      )}
                      {currentActiveJob.provider && (
                        <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md text-[9px] font-mono font-bold text-accent">
                          {currentActiveJob.provider}
                        </span>
                      )}
                      {currentActiveJob.isRemote && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[9px] font-mono font-bold text-emerald-400">
                          Verified Remote
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-ink mt-0.5">
                      {currentActiveJob.title} <span className="text-ink-dim font-normal">at {currentActiveJob.company}</span>
                      {currentActiveJob.location && (
                        <span className="text-xs text-ink-dim font-normal ml-2">({currentActiveJob.location})</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {currentActiveJob.link && (
                    <a
                      href={currentActiveJob.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      Official Posting <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => clearCurrentJobContext()}
                    className="px-3 py-1.5 text-xs text-ink-dim hover:text-rose-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Clear Active Job
                  </button>
                  <button
                    onClick={handleResetSearch}
                    className="px-3 py-1.5 text-xs text-ink-dim hover:text-ink font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 border border-border rounded-xl bg-surface-light hover:border-accent/40"
                    title="Complete Job Search Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Search
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ink uppercase tracking-wider">
                          {jobs.length} Real Vacanc{jobs.length === 1 ? 'y' : 'ies'} Found
                        </span>
                        {query && (
                          <span className="text-xs text-ink-dim">
                            for &ldquo;<strong className="text-ink font-semibold">{query}</strong>&rdquo;{location ? ` in ${location}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      id="reset-search-results-button"
                      onClick={handleResetSearch}
                      className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-border hover:border-accent/40 bg-surface-light text-ink-dim hover:text-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Search
                    </button>
                  </div>
                  {/* Honest notice if no exact matches found but related listings exist */}
                  {exactMatches.length === 0 && relatedMatches.length > 0 && (
                    <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/25">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400 shrink-0">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2.5 py-0.5 bg-amber-500/20 rounded-full border border-amber-500/30">
                              Strict Constraint Enforcement
                            </span>
                            <span className="text-xs font-mono text-ink-dim">0 Exact Matches</span>
                          </div>
                          <h3 className="text-base font-bold text-ink mb-1">
                            {searchNotice || `No sufficiently relevant live job listings were found for this role${location ? ` in ${location}` : ''}.`}
                          </h3>
                          <p className="text-xs text-ink-dim leading-relaxed">
                            Verified live feeds do not currently have openings that satisfy every specified constraint (such as strict India eligibility or internship level).
                            To protect you from misleading fit scores, all listings below are categorized as <strong>Related Matches</strong> with their specific differences highlighted.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Exact Matches */}
                  {exactMatches.length > 0 && (
                    <div className="mb-10">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                            Exact Matches
                            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {exactMatches.length}
                            </span>
                          </h2>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          Satisfies Role, Seniority & Location Criteria
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                            Related Live Opportunities
                            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {relatedMatches.length}
                            </span>
                          </h2>
                        </div>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                          {exactMatches.length === 0 ? 'Verified Feed Alternatives (Differences Noted)' : 'Broader / Worldwide Openings'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="py-24 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto opacity-40 grayscale group-hover:grayscale-0 transition-all">
             <div className="p-8 glass-card">
                <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent/10">
                   <TargetIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-tighter mb-2">LinkedIn Vectors</h4>
                <p className="text-[10px] text-ink-dim">Deep scan professional network indices.</p>
             </div>
             <div className="p-8 glass-card">
                <div className="w-12 h-12 bg-success/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-success/10">
                   <Zap className="w-6 h-6 text-success" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-tighter mb-2">Rapid Response</h4>
                <p className="text-[10px] text-ink-dim">Real-time listing extraction engine.</p>
             </div>
             <div className="p-8 glass-card">
                <div className="w-12 h-12 bg-warning/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-warning/10">
                   <Building2 className="w-6 h-6 text-warning" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-tighter mb-2">Sector Clarity</h4>
                <p className="text-[10px] text-ink-dim">Unfiltered access to global hiring signals.</p>
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
    if (!locMatch) return 'bg-surface-light text-ink-dim border-border';
    const l = locMatch.toLowerCase();
    if (l.includes('india match') || l.includes('verified local')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    }
    if (l.includes('incompatible')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/25';
    }
    if (l.includes('worldwide') || l.includes('remote')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    }
    return 'bg-surface-light text-ink-dim border-border';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className={`glass-card p-6 flex flex-col hover:border-accent/40 transition-all shadow-sm group ${
        isSelected ? 'border-accent ring-1 ring-accent/30' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="bg-background/80 p-3 rounded-2xl border border-border">
          <Building2 className="w-6 h-6 text-accent" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Relevance Badge */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isExact
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            {job.relevanceLabel || (isExact ? 'Exact Match' : 'Related Match')}
          </span>

          {/* Location Match Badge */}
          {job.locationMatch && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getLocationBadgeClass(job.locationMatch)}`}>
              {job.locationMatch}
            </span>
          )}

          {/* Fit Score */}
          {job.matchScore !== undefined && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                job.matchScore >= 80
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : job.matchScore >= 60
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {job.matchScore}% FIT
            </span>
          )}

          {/* Role Tier */}
          {job.roleTier && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                job.roleTier.toLowerCase() === 'safe'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : job.roleTier.toLowerCase() === 'stretch'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}
            >
              {job.roleTier} ROLE
            </span>
          )}

          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-dim hover:text-accent transition-colors p-1"
            title="Open official job post"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <h3 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1 leading-tight">
        {job.title}
      </h3>
      <p className="text-sm font-bold text-ink-dim mb-3">{job.company}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {job.source && (
          <div className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{job.source}</span>
          </div>
        )}
        <div className="px-2.5 py-1 bg-surface-light/50 border border-border rounded-lg flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-ink-dim" />
          <span className="text-[10px] font-bold text-ink-dim uppercase">{job.location}</span>
        </div>
        {job.isRemote && (
          <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Remote</span>
          </div>
        )}
        {job.jobType && (
          <div className="px-2.5 py-1 bg-surface-light/50 border border-border rounded-lg flex items-center">
            <span className="text-[10px] font-bold text-ink-dim uppercase">{job.jobType}</span>
          </div>
        )}
        {job.datePosted && (
          <div className="px-2.5 py-1 bg-surface-light/50 border border-border rounded-lg flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-ink-dim" />
            <span className="text-[10px] font-bold text-ink-dim uppercase">{job.datePosted}</span>
          </div>
        )}
      </div>

      {/* Honest Differences Callout if present */}
      {job.missingCriteria && job.missingCriteria.length > 0 && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Requirement Differences
          </div>
          <ul className="space-y-1 text-[11px] text-amber-300/90 list-disc list-inside">
            {job.missingCriteria.map((diff, dIdx) => (
              <li key={dIdx} className="leading-snug">{diff}</li>
            ))}
          </ul>
        </div>
      )}

      {job.matchExplanation && (
        <div className="mb-4 p-3 rounded-2xl bg-accent/5 border border-accent/15 text-xs text-ink-dim font-medium">
          <div className="flex items-center justify-between text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Fit Assessment
            </span>
            <span className="text-[9px] text-ink-dim/80 font-normal lowercase tracking-normal">ai match</span>
          </div>
          <p className="italic text-ink leading-relaxed">
            "{job.matchExplanation}"
          </p>
        </div>
      )}

      <p className="text-sm text-ink-dim line-clamp-3 mb-4 flex-1 leading-relaxed">
        "{job.description}"
      </p>

      <div className="mb-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
          {job.source ? `Source: ${job.source}` : 'External Listing'}
        </span>
        <a 
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Official Job Post <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex gap-2 mb-3">
        <button 
          onClick={() => onSelect(job)}
          className={`w-full py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isSelected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
              : 'bg-surface hover:bg-accent/10 text-ink-dim hover:text-accent border border-border'
          }`}
        >
          {isSelected ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Active Selected Job
            </>
          ) : (
            <>
              <Target className="w-3.5 h-3.5" />
              Select As Active Job
            </>
          )}
        </button>
      </div>

      {isSelected && (
        <div className="flex gap-2">
          <button 
            onClick={() => onAlignResume(job)}
            className="flex-1 bg-accent/10 border border-accent/20 text-accent font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
          >
            Analyze Compatibility <ChevronRight className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onTrackJob(job)}
            className="px-4 bg-surface border border-border text-ink-dim hover:border-ink hover:text-ink py-3 rounded-xl transition-all"
            title="Add to Pipeline"
          >
            <Briefcase className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
