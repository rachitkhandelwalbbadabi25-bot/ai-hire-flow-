import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ExternalLink, Sparkles, Building2, Calendar, LoaderCircle, Briefcase, ChevronRight, Zap, AlertCircle } from 'lucide-react';
import { findJobs } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  datePosted: string;
}

export default function JobFinder() {
  const { user } = useAuth();
  const { checkAccess, deductCredit } = usePlan();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const navigate = useNavigate();

  const { hasAccess, remaining, limit } = checkAccess('jobSearches');

  if (!user) return null;

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setIsFromCache(false);

    try {
      const cacheKey = cacheManager.generateJobKey(query, location);
      const cached = cacheManager.get<Job[]>(cacheKey);

      if (cached) {
        setJobs(cached);
        setIsFromCache(true);
        setLoading(false);
        return;
      }

      if (!hasAccess) {
        setError(`Search capacity exceeded. Remaining scans: ${remaining}/${limit}. Please upgrade for more bandwidth.`);
        setLoading(false);
        return;
      }

      await deductCredit('jobSearches');
      const results = await findJobs(query, location);
      setJobs(results);
      
      // Cache for 30 minutes
      cacheManager.set(cacheKey, results, 30 * 60 * 1000);
    } catch (error: any) {
      console.error('Search failed:', error);
      setError(error.message || "The Neural Crawler encountered an interference.");
    } finally {
      setLoading(false);
    }
  };

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
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Neural Crawler</span>
          </div>
          <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Scans Available: {remaining} / {limit}</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">Market Surveillance</h1>
        <p className="text-ink-dim font-medium text-lg max-w-2xl">
          Deploy specialized AI agents to scan global sectors for optimal career acquisitions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-2xl mb-12">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-5">
            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Sector / Role Target</label>
            <div className="relative group">
              <input 
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. Senior Frontend Engineer"
              />
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" />
            </div>
          </div>
          
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Geographical Domain</label>
            <div className="relative group">
              <input 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink transition-all group-hover:border-accent/40"
                placeholder="e.g. San Francisco or Remote"
              />
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-dim" />
            </div>
          </div>

          <div className="md:col-span-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Initialize Scan
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="min-h-[400px]">
        {isFromCache && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Neural Mirroring (Cached Result)</span>
            </div>
          </div>
        )}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface border border-border rounded-full mb-6">
              <LoaderCircle className="w-4 h-4 animate-spin text-accent" />
              <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Parsing Real-Time Global Telemetry...</span>
            </div>
            <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
              <div className="h-4 bg-surface-light rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-surface-light rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : error ? (
          <div className="py-24 text-center">
            <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-2 uppercase tracking-tight">System Interference</h3>
            <p className="text-rose-400/80 text-sm max-w-md mx-auto px-4">
              {error}
            </p>
            <button 
              onClick={() => handleSearch({ preventDefault: () => {} } as any)}
              className="mt-6 text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
            >
              Re-initialize Scanning
            </button>
          </div>
        ) : hasSearched && jobs.length === 0 ? (
          <div className="py-24 text-center">
            <div className="bg-surface w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
              <Search className="w-8 h-8 text-ink-dim" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-2 uppercase tracking-tight">Access Restricted / No Signals</h3>
            <p className="text-ink-dim text-sm max-w-md mx-auto">
              Our agents were unable to locate opportunities matching those specific parameters in the current cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {(jobs || []).map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-surface border border-border rounded-3xl p-6 flex flex-col hover:border-accent/40 transition-all shadow-sm group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-background/80 p-3 rounded-2xl border border-border">
                      <Building2 className="w-6 h-6 text-accent" />
                    </div>
                    <a 
                      href={job.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-ink-dim hover:text-accent transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>

                  <h3 className="text-lg font-bold text-ink group-hover:text-accent transition-colors mb-1 leading-tight">{job.title}</h3>
                  <p className="text-sm font-bold text-ink-dim mb-4">{job.company}</p>

                  <div className="flex flex-wrap gap-2 mb-6">
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

                  <p className="text-sm text-ink-dim line-clamp-3 mb-8 flex-1 leading-relaxed italic">
                    "{job.description}"
                  </p>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => alignResume(job)}
                      className="flex-1 bg-accent/10 border border-accent/20 text-accent font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                      Align Neural Pattern <ChevronRight className="w-3 h-3" />
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
        )}
      </div>
      
      {!hasSearched && (
        <div className="py-24 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto opacity-40 grayscale group-hover:grayscale-0 transition-all">
             <div className="p-8 bg-surface border border-border rounded-3xl">
                <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent/10">
                   <TargetIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-tighter mb-2">LinkedIn Vectors</h4>
                <p className="text-[10px] text-ink-dim">Deep scan professional network indices.</p>
             </div>
             <div className="p-8 bg-surface border border-border rounded-3xl">
                <div className="w-12 h-12 bg-success/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-success/10">
                   <Zap className="w-6 h-6 text-success" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-tighter mb-2">Rapid Response</h4>
                <p className="text-[10px] text-ink-dim">Real-time listing extraction engine.</p>
             </div>
             <div className="p-8 bg-surface border border-border rounded-3xl">
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
