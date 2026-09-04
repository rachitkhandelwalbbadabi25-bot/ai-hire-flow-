import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ExternalLink, Sparkles, Building2, Calendar, LoaderCircle, Briefcase, ChevronRight, Zap, AlertCircle, ShieldCheck, TrendingUp, Target } from 'lucide-react';
import { findJobs } from '../lib/gemini';
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

interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  datePosted: string;
  matchScore?: number;
  roleTier?: 'safe' | 'stretch' | 'reach' | string;
  matchExplanation?: string;
  isPoorFit?: boolean;
}

export default function JobFinder() {
  const { user } = useAuth();
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const { hasAccess } = checkAccess('jobSearches');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState('');
  const navigate = useNavigate();
  const locationState = useLocation();

  const { activeTargetRole } = useSystemOS();
  const hasAutoSearchedRef = useRef(false);

  useEffect(() => {
    if (locationState.state?.role || locationState.state?.query) {
      const targetQuery = locationState.state.role || locationState.state.query;
      setQuery(targetQuery);
      if (locationState.state?.autoSearch && !hasAutoSearchedRef.current) {
        hasAutoSearchedRef.current = true;
        handleSearchWithQuery(targetQuery, location);
      }
    } else if (!query && activeTargetRole) {
      setQuery(activeTargetRole);
    }
  }, [locationState.state, activeTargetRole]);

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
    'Frontend Developer',
    'Full Stack Engineer',
    'Data Analyst',
    'Backend Engineer',
    'DevOps Engineer',
    'Product Manager',
    'Software Engineer',
  ];

  if (!user) return null;

  const handlePopularSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as FormEvent;
      handleSearchWithQuery(searchQuery, location, formEvent);
    }, 0);
  };

  const handleSearchWithQuery = async (searchQuery: string, searchLoc: string, e?: FormEvent) => {
    if (e) e.preventDefault();
    if (loading || !searchQuery || !searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setIsFromCache(false);

    try {
      const cacheKey = cacheManager.generateJobKey(searchQuery, searchLoc);
      
      let cached = null;
      try {
        cached = cacheManager.get<Job[]>(cacheKey);
      } catch (err) {
        console.warn('Cache access failure:', err);
      }

      if (cached && Array.isArray(cached)) {
        setJobs(cached);
        setIsFromCache(true);
        setLoading(false);
        return;
      }

      if (!hasAccess) {
        setError(`Search limit reached. Upgrade your wallet to unlock extra job scans.`);
        setLoading(false);
        return;
      }

      await deductCredit('jobSearches');
      const results = await findJobs(searchQuery, searchLoc, candidateProfile);
      setJobs(results);
      
      cacheManager.set(cacheKey, results, 30 * 60 * 1000);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || "Failed to retrieve job listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => handleSearchWithQuery(query, location, e);

  const trackJob = async (job: Job) => {
    try {
      await addDoc(collection(db, 'users', user.uid, 'jobs'), {
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
    // Navigate to analyzer and pass job description via state or search params
    // For simplicity, we'll use state if supported, or just navigate
    navigate('/analyzer', { state: { jobDescription: `${job.title} at ${job.company}\n\n${job.description}` } });
  };

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
        <p className="text-ink-dim font-medium text-lg max-w-2xl">
          Search and match top job opportunities tailored for your engineering profile.
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-panel mb-12 p-8 rounded-3xl border border-border bg-surface">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-5">
            <label htmlFor="job-role-input" className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Job Role / Title</label>
            <div className="relative group">
              <input 
                id="job-role-input"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. Senior Frontend Engineer"
                aria-label="Job Role or Title"
              />
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" aria-hidden="true" />
            </div>
          </div>
          
          <div className="md:col-span-4">
            <label htmlFor="job-location-input" className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Location / Remote</label>
            <div className="relative group">
              <input 
                id="job-location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. San Francisco or Remote"
                aria-label="Job Location or Remote"
              />
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" aria-hidden="true" />
            </div>
          </div>

          <div className="md:col-span-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
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
            <button 
              id="retry-search-button"
              onClick={() => handleSearchWithQuery(query.trim() || activeTargetRole || "Software Engineer", location)}
              className="px-6 py-2.5 bg-accent text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-90 transition-all cursor-pointer"
            >
              Retry Search
            </button>
          </div>
        ) : hasSearched && jobs.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Expand your job search criteria"
            targetRole={query || activeTargetRole || "Software Engineer"}
            description="Try searching with broader location filters or related job titles to discover active, verified job openings."
            benefitMetric="Searching with related role titles yields 4.5x more relevant job matches"
            primaryAction={{
              label: "Search 'Full Stack Developer'",
              onClick: () => handlePopularSearch("Full Stack Developer"),
              icon: Search
            }}
            secondaryAction={{
              label: "Analyze your resume first",
              onClick: () => navigate('/analyzer'),
              icon: Target
            }}
          />
        ) : !hasSearched ? (
          <EmptyState
            icon={Building2}
            title="Find matched job openings"
            targetRole={activeTargetRole || "Software Engineer"}
            description="Search verified listings and compare them directly against your target role profile to see match scores."
            benefitMetric="Candidates applying to high-match roles receive interviews 2.8x faster"
            primaryAction={{
              label: "Search 'Software Engineer'",
              onClick: () => handlePopularSearch("Software Engineer"),
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {(jobs || []).map((job, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-6 flex flex-col hover:border-accent/40 transition-all shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-background/80 p-3 rounded-2xl border border-border">
                        <Building2 className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex items-center gap-2">
                        {job.matchScore !== undefined && (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            job.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            job.matchScore >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {job.matchScore}% FIT
                          </span>
                        )}
                        {job.roleTier && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            job.roleTier.toLowerCase() === 'safe' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            job.roleTier.toLowerCase() === 'stretch' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {job.roleTier} ROLE
                          </span>
                        )}
                        <a 
                          href={job.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-ink-dim hover:text-accent transition-colors p-1"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1 leading-tight">{job.title}</h3>
                    <p className="text-sm font-bold text-ink-dim mb-4">{job.company}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="px-3 py-1 bg-surface-light/50 border border-border rounded-lg flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-ink-dim" />
                        <span className="text-[10px] font-bold text-ink-dim uppercase">{job.location}</span>
                      </div>
                      {job.datePosted && (
                        <div className="px-3 py-1 bg-surface-light/50 border border-border rounded-lg flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-ink-dim" />
                          <span className="text-[10px] font-bold text-ink-dim uppercase">{job.datePosted}</span>
                        </div>
                      )}
                    </div>

                    {job.matchExplanation && (
                      <div className="mb-4 p-3 rounded-2xl bg-accent/5 border border-accent/15 text-xs text-ink-dim font-medium">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                          <Sparkles className="w-3 h-3" /> Fit Assessment
                        </div>
                        <p className="italic text-ink leading-relaxed">
                          "{job.matchExplanation}"
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-ink-dim line-clamp-3 mb-6 flex-1 leading-relaxed">
                      "{job.description}"
                    </p>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => alignResume(job)}
                        className="flex-1 bg-accent/10 border border-accent/20 text-accent font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                      >
                        Analyze Compatibility <ChevronRight className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => trackJob(job)}
                        className="px-4 bg-surface border border-border text-ink-dim hover:border-ink hover:text-ink py-3 rounded-xl transition-all"
                        title="Add to Pipeline"
                      >
                        <Briefcase className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <NextStepBridgeCard
              title="Job search complete"
              contextData={`Extracted ${jobs.length} verified listings for "${query || activeTargetRole || 'Software Engineering'}". Top match: ${jobs[0]?.title || 'Engineer'} at ${jobs[0]?.company || 'Enterprise Company'} (${jobs[0]?.matchScore || 85}% match).`}
              primaryStep={{
                label: "Draft recruiter pitch",
                icon: Send,
                to: "/outreach",
                state: {
                  company: jobs[0]?.company || "Target Company",
                  role: jobs[0]?.title || query || "Software Engineer"
                }
              }}
              secondaryStep={{
                label: "Simulate role interview",
                icon: MessageSquare,
                to: "/interview",
                state: {
                  company: jobs[0]?.company || "Target Company",
                  role: jobs[0]?.title || query || "Software Engineer",
                  jobDescription: jobs[0]?.description || `Position: ${jobs[0]?.title} at ${jobs[0]?.company}`
                }
              }}
            />
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
