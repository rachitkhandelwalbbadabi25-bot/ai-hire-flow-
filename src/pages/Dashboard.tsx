import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  FileEdit, 
  Crown, 
  Sparkles, 
  ArrowUpRight, 
  Calendar, 
  Activity, 
  ArrowRight, 
  GraduationCap, 
  Mic, 
  MessageCircle, 
  Compass, 
  Target, 
  ChevronRight, 
  UserCheck, 
  Send,
  Loader2,
  AlertCircle,
  Building2,
  MapPin,
  Clock,
  Zap,
  Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import SmartContextChips from '../components/SmartContextChips';
import QuickStartChecklist from '../components/QuickStartChecklist';
import CareerHealthScore from '../components/CareerHealthScore';
import { useSystemOS } from '../context/SystemOSContext';
import { askAICoach } from '../lib/gemini';
import AILoadingStepper from '../components/AILoadingStepper';

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  type: string;
  posted: string;
  tags: string[];
}

const DEFAULT_RECOMMENDED_JOBS: RecommendedJob[] = [
  {
    id: 'rec-1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'Remote / San Francisco',
    salary: '$160,000 - $190,000',
    matchScore: 94,
    type: 'Full-time',
    posted: '2d ago',
    tags: ['React', 'TypeScript', 'Tailwind']
  },
  {
    id: 'rec-2',
    title: 'Full Stack Engineer (AI Products)',
    company: 'Linear',
    location: 'Remote',
    salary: '$150,000 - $185,000',
    matchScore: 89,
    type: 'Full-time',
    posted: '1d ago',
    tags: ['Next.js', 'Node.js', 'PostgreSQL']
  },
  {
    id: 'rec-3',
    title: 'Product Software Engineer',
    company: 'Vercel',
    location: 'Remote',
    salary: '$155,000 - $180,000',
    matchScore: 86,
    type: 'Full-time',
    posted: '3d ago',
    tags: ['React', 'Edge Computing', 'GraphQL']
  }
];

export default function Dashboard() {
  const { user, isAdmin, isPremium } = useAuth();
  const { plan, creditWallet } = usePlan();
  const navigate = useNavigate();

  const planBadgeLabel = isAdmin ? 'Admin Master' : plan === 'premium' ? 'Premium Tier' : plan === 'standard' ? 'Standard Tier' : 'Free Tier';
  const [stats, setStats] = useState({
    totalJobs: 0,
    resumesAnalyzed: 0,
    interviews: 0,
    offers: 0,
    latestResumeScore: 0,
    missingKeywords: [] as string[],
    interviewReadiness: 0,
    simulationsRun: 0,
    weeklyMilestoneCount: 0,
    weeklyResumesCount: 0,
    weeklyJobsCount: 0,
    weeklySimulationsCount: 0,
    upcomingEvents: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [addingJobId, setAddingJobId] = useState<string | null>(null);
  const [trackedJobsMap, setTrackedJobsMap] = useState<Record<string, boolean>>({});
  const [masterResumeData, setMasterResumeData] = useState<any>(null);
  const [rawJobsList, setRawJobsList] = useState<any[]>([]);

  // AI Coach state
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachAnswer, setCoachAnswer] = useState<any>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Dynamic greeting
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        const resumesRef = collection(db, 'users', user.uid, 'resumes');
        const simulationsRef = collection(db, 'users', user.uid, 'simulations');
        
        const jobsSnap = await getDocs(jobsRef);
        const resumesSnap = await getDocs(resumesRef);
        const simulationsSnap = await getDocs(simulationsRef);
        
        const jobs = (jobsSnap.docs || []).map(doc => doc.data() as any);
        const resumes = (resumesSnap.docs || []).map(doc => doc.data() as any);
        const simulations = (simulationsSnap.docs || []).map(doc => doc.data() as any);
        setRawJobsList(jobs);

        try {
          const masterDocRef = doc(db, 'users', user.uid, 'config', 'masterResume');
          const masterSnap = await getDoc(masterDocRef);
          if (masterSnap.exists()) {
            setMasterResumeData(masterSnap.data());
          }
        } catch (e) {
          console.warn("Master resume not loaded:", e);
        }
        
        const statusCounts = jobs.reduce((acc: any, job: any) => {
          if (job && job.status) {
            acc[job.status] = (acc[job.status] || 0) + 1;
          }
          return acc;
        }, {});

        // Build tracked map
        const trackedMap: Record<string, boolean> = {};
        jobs.forEach(j => {
          if (j.company) trackedMap[j.company.toLowerCase()] = true;
        });
        setTrackedJobsMap(trackedMap);

        // 1. Latest Resume Score & Missing Keywords
        let latestResumeScore = 0;
        let missingKeywords: string[] = [];
        const sortedResumes = [...resumes].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        if (sortedResumes[0] && sortedResumes[0].analysis) {
          latestResumeScore = sortedResumes[0].analysis.score || 0;
          missingKeywords = sortedResumes[0].analysis.missingKeywords || [];
        }

        // 2. Interview Readiness from simulations
        let interviewReadiness = 0;
        if (simulations.length > 0) {
          const sum = simulations.reduce((acc, sim) => acc + (sim.score || 0), 0);
          interviewReadiness = Math.round(sum / simulations.length);
        }

        // 3. Weekly Milestones (last 7 days actions)
        const isWithinLast7Days = (dateStr?: string) => {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= sevenDaysAgo;
        };

        let weeklyResumesCount = 0;
        let weeklyJobsCount = 0;
        let weeklySimulationsCount = 0;

        resumes.forEach((r: any) => {
          if (isWithinLast7Days(r.createdAt)) weeklyResumesCount++;
        });
        jobs.forEach((j: any) => {
          if (isWithinLast7Days(j.appliedDate)) weeklyJobsCount++;
        });
        simulations.forEach((s: any) => {
          if (isWithinLast7Days(s.createdAt)) weeklySimulationsCount++;
        });

        const weeklyMilestoneCount = weeklyResumesCount + weeklyJobsCount + weeklySimulationsCount;

        // 4. Upcoming events from jobs with status 'Interview'
        const upcomingEvents: any[] = [];
        const interviewJobs = jobs.filter(j => j.status === 'Interview');
        
        interviewJobs.forEach((job) => {
          const date = job.appliedDate ? new Date(job.appliedDate) : new Date();
          const interviewDate = new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000);
          const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          
          upcomingEvents.push({
            month: months[interviewDate.getMonth()],
            day: interviewDate.getDate().toString(),
            title: `Interview: ${job.role} at ${job.company}`,
            description: `Vetting round prep for your application with ${job.company}.`,
            time: "10:00 AM UTC"
          });
        });

        setStats({
          totalJobs: jobsSnap.size,
          resumesAnalyzed: resumesSnap.size,
          interviews: statusCounts['Interview'] || 0,
          offers: statusCounts['Offer'] || 0,
          latestResumeScore,
          missingKeywords,
          interviewReadiness,
          simulationsRun: simulations.length,
          weeklyMilestoneCount,
          weeklyResumesCount,
          weeklyJobsCount,
          weeklySimulationsCount,
          upcomingEvents
        });

        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleTrackRecommendedJob = async (job: RecommendedJob) => {
    if (!user) return;
    setAddingJobId(job.id);
    try {
      const jobsRef = collection(db, 'users', user.uid, 'jobs');
      await addDoc(jobsRef, {
        company: job.company,
        role: job.title,
        status: 'Applied',
        appliedDate: new Date().toISOString(),
        notes: `Imported from Job Finder. Salary range: ${job.salary}. Match Score: ${job.matchScore}%.`
      });
      setTrackedJobsMap(prev => ({ ...prev, [job.company.toLowerCase()]: true }));
      setStats(prev => ({ ...prev, totalJobs: prev.totalJobs + 1 }));
    } catch (err) {
      console.error("Failed to track job:", err);
    } finally {
      setAddingJobId(null);
    }
  };

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachQuestion.trim()) return;

    setIsCoachLoading(true);
    setCoachAnswer(null);

    try {
      const trackedCompanies = rawJobsList.map(j => j.company || j.role).filter(Boolean).slice(0, 8).join(', ');
      const currentRole = masterResumeData?.experience?.[0]?.role 
        ? `${masterResumeData.experience[0].role} at ${masterResumeData.experience[0].company || 'Current Company'}`
        : 'Software Engineer';
      const targetRole = masterResumeData?.targetRole || (stats.missingKeywords?.length ? 'Roles requiring ' + stats.missingKeywords.slice(0, 3).join(', ') : 'Software Engineering & Tech Roles');
      const userSkills = masterResumeData?.skills?.join(', ') || 'React, TypeScript, Node.js, Python, System Design';

      const context = `
- Candidate Name: ${user?.displayName || 'Candidate'}
- Current Role: ${currentRole}
- Target Role: ${targetRole}
- Resume Skills & Data: ${userSkills}
- Master Resume Summary: "${masterResumeData?.summary || 'Experienced software developer'}"
- ATS Audit Status: Score ${stats.latestResumeScore || 0}/100. Resumes Audited: ${stats.resumesAnalyzed}. Missing Keywords: ${stats.missingKeywords?.length ? stats.missingKeywords.join(', ') : 'None identified'}.
- Job Pipeline Status: Total Tracked Jobs: ${stats.totalJobs}. Tracked Companies: ${trackedCompanies || 'None (0 jobs tracked)'}. Active Interviews: ${stats.interviews}. Offers Received: ${stats.offers}.
- Recent Interview Scores: Interview Readiness Index: ${stats.interviewReadiness}%. Total Simulations Completed: ${stats.simulationsRun}.
- Credit Balance & Membership Tier: Balance: ${creditWallet?.balance ?? 0} CR, Membership Tier: ${planBadgeLabel}.
      `.trim();
      const res = await askAICoach(coachQuestion, context);
      setCoachAnswer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCoachLoading(false);
    }
  };

  const { 
    activeTargetRole, 
    latestResume, 
    careerHealthScore, 
    refreshSystemContext, 
    loadingSystemContext 
  } = useSystemOS();

  const hasResume = stats.resumesAnalyzed > 0 || !!masterResumeData;
  const hasJobs = stats.totalJobs > 0;
  const hasTargetRole = Boolean(masterResumeData?.targetRole || latestResume?.targetRole || (activeTargetRole && activeTargetRole !== 'Software Engineer' && activeTargetRole !== 'Full Stack Engineer'));
  const hasScanDone = stats.resumesAnalyzed > 0;

  if (!user) return null;

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Synchronizing Career Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-10 gap-8 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold uppercase tracking-wider font-mono">
              <Sparkles className="w-2.5 h-2.5" /> SYSTEM ACTIVE
            </span>
            <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Career Operating System</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-ink tracking-tight font-sans">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-accent">{user.displayName?.split(' ')[0] || "Professional"}</span>
          </h1>
          <p className="text-ink-dim text-xs sm:text-sm mt-1 max-w-xl">
            Unified workspace for resume optimization, job discovery, and interview preparation.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface/60 backdrop-blur-md px-5 py-3 rounded-xl border border-border flex items-center gap-4">
            <div className="text-left">
              <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Global Status</p>
              <p className="text-xs font-bold text-accent flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Active Session
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-left">
              <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Plan Tier</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-bold text-ink uppercase tracking-tight">{planBadgeLabel}</span>
              </div>
            </div>
          </div>

          {!hasResume ? (
            <button 
              onClick={() => navigate('/analyzer')}
              className="bg-accent text-black px-6 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              <FileText className="w-4 h-4" /> Upload Resume
            </button>
          ) : !hasJobs ? (
            <button 
              onClick={() => navigate('/finder')}
              className="bg-accent text-black px-6 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              <Search className="w-4 h-4" /> Discover Roles
            </button>
          ) : (
            <button 
              onClick={() => navigate('/jobs')}
              className="bg-accent text-black px-6 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4" /> Add Application
            </button>
          )}
        </div>
      </div>

      {/* UNIFIED CAREER HEALTH SCORE (0-100 METRIC) */}
      <CareerHealthScore 
        scoreData={careerHealthScore}
        onRefresh={refreshSystemContext}
        isRefreshing={loadingSystemContext}
        className="mb-8"
      />

      <QuickStartChecklist 
        hasResume={hasResume}
        hasTargetRole={hasTargetRole}
        hasScanDone={hasScanDone}
        className="mb-8"
      />

      <SmartContextChips 
        className="mb-8"
        onSelectRole={(role) => navigate(`/finder`)}
        onSelectJob={(jobTitle) => navigate(`/jobs`)}
        onSelectSkill={(skill) => navigate(`/learning`)}
      />

      {/* ========================================================================= */}
      {/* STATE-BASED PRIMARY HERO BANNER (#1 PRIORITY)                             */}
      {/* ========================================================================= */}

      {/* STATE 1: NO RESUME UPLOADED -> FORCE QUICK START BANNER */}
      {!hasResume && (
        <section className="mb-10 bg-surface border border-accent/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="bg-accent/10 border border-accent/30 text-accent text-[9px] font-bold font-mono px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Priority Action #1 Required
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink uppercase tracking-tight font-mono">
                Quick Start: Upload Master Resume
              </h2>
              <p className="text-ink-dim text-sm leading-relaxed">
                Welcome to AI HireFlow! To unlock real-time ATS match scoring, job recommendation feeds, tailored outreach scripts, and interview drills, upload or analyze your master resume first.
              </p>
              
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-background/60 border border-border p-3 rounded-xl flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-mono font-bold flex items-center justify-center">1</span>
                  <span className="text-xs text-ink font-semibold">Upload & Score Resume</span>
                </div>
                <div className="bg-background/30 border border-border/50 p-3 rounded-xl flex items-center gap-2.5 opacity-60">
                  <span className="w-5 h-5 rounded-full bg-border text-ink-dim text-[10px] font-mono font-bold flex items-center justify-center">2</span>
                  <span className="text-xs text-ink-dim">Match Target Jobs</span>
                </div>
                <div className="bg-background/30 border border-border/50 p-3 rounded-xl flex items-center gap-2.5 opacity-60">
                  <span className="w-5 h-5 rounded-full bg-border text-ink-dim text-[10px] font-mono font-bold flex items-center justify-center">3</span>
                  <span className="text-xs text-ink-dim">Practice Mock Interview</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-stretch md:items-end gap-3">
              <button 
                onClick={() => navigate('/analyzer')}
                className="bg-accent text-black px-8 py-4 rounded-xl text-xs font-bold font-mono uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-accent/20"
              >
                <FileText className="w-4 h-4" /> Upload & Analyze Resume
              </button>
              <span className="text-[10px] text-ink-dim text-center md:text-right">Takes under 30 seconds • Supports PDF & DOCX</span>
            </div>
          </div>
        </section>
      )}

      {/* STATE 2: HAS RESUME BUT NO JOB TRACKED -> SHOW INLINE RECOMMENDED JOBS */}
      {hasResume && !hasJobs && (
        <section className="mb-10 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono text-xl font-bold shrink-0">
                {stats.latestResumeScore > 0 ? `${stats.latestResumeScore}%` : '85%'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-accent uppercase tracking-widest font-mono bg-accent/10 px-2 py-0.5 rounded-md">Resume Ready</span>
                  <span className="text-xs text-ink-dim font-medium">ATS Match Score Baseline</span>
                </div>
                <h3 className="text-lg font-bold text-ink uppercase tracking-tight font-mono mt-0.5">
                  Resume Analyzed — Next Step: Discover Opportunities
                </h3>
              </div>
            </div>
            <button 
              onClick={() => navigate('/editor')}
              className="bg-surface-light border border-border hover:border-accent/40 text-ink text-xs font-bold uppercase font-mono px-5 py-2.5 rounded-xl transition-colors self-start sm:self-center shrink-0"
            >
              Refine Resume in Editor
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest font-mono">Matched Listings</span>
                </div>
                <h2 className="text-xl font-bold text-ink uppercase tracking-tight font-mono">
                  Recommended Positions For You
                </h2>
                <p className="text-xs text-ink-dim mt-0.5">
                  Curated based on your master resume skills and technical profile.
                </p>
              </div>

              <button 
                onClick={() => navigate('/finder')}
                className="text-xs font-bold font-mono text-accent hover:underline flex items-center gap-1.5 self-start sm:self-center"
              >
                Search All Listings in Job Finder <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEFAULT_RECOMMENDED_JOBS.map((job) => {
                const isTracked = !!trackedJobsMap[job.company.toLowerCase()];
                return (
                  <div 
                    key={job.id} 
                    className="bg-background border border-border rounded-xl p-6 flex flex-col justify-between hover:border-accent/40 transition-all group"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-ink font-bold font-mono">
                          {job.company.charAt(0)}
                        </div>
                        <span className="text-[10px] font-bold font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                          {job.matchScore}% Match
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-ink text-base group-hover:text-accent transition-colors">{job.title}</h4>
                        <p className="text-xs text-ink-dim font-medium flex items-center gap-2 mt-1">
                          <span className="text-ink font-semibold">{job.company}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.map((tag, idx) => (
                          <span key={idx} className="text-[9px] font-mono text-ink-dim bg-surface px-2 py-0.5 rounded border border-border">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-accent font-mono font-semibold pt-1">{job.salary}</p>
                    </div>

                    <div className="pt-6 border-t border-border/60 mt-6">
                      <button 
                        onClick={() => handleTrackRecommendedJob(job)}
                        disabled={isTracked || addingJobId === job.id}
                        className={cn(
                          "w-full py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                          isTracked
                            ? "bg-surface border border-border text-success cursor-default"
                            : "bg-accent text-black hover:bg-accent/90"
                        )}
                      >
                        {addingJobId === job.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isTracked ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Opportunity Tracked
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Track Opportunity
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STATE 3: HAS JOBS TRACKED -> SHOW PIPELINE SUMMARY & NEXT ACTIONS */}
      {hasJobs && (
        <section className="mb-10 space-y-6">
          {/* Pipeline Bar */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest font-mono">Pipeline Status</span>
                </div>
                <h2 className="text-xl font-bold text-ink uppercase tracking-tight font-mono">
                  Active Career Pipeline Summary
                </h2>
              </div>
              <button 
                onClick={() => navigate('/jobs')}
                className="bg-accent text-black px-5 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-accent/90 transition-all self-start sm:self-center"
              >
                Manage Pipeline Kanban <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Total Tracked</p>
                <p className="text-3xl font-extrabold font-mono text-ink mt-1">{stats.totalJobs}</p>
                <p className="text-[10px] text-ink-dim mt-1">Active target positions</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Interviews</p>
                <p className="text-3xl font-extrabold font-mono text-accent mt-1">{stats.interviews}</p>
                <p className="text-[10px] text-accent mt-1">Lined up & scheduled</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Offers</p>
                <p className="text-3xl font-extrabold font-mono text-success mt-1">{stats.offers}</p>
                <p className="text-[10px] text-success mt-1">Final decision stage</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Interview Readiness</p>
                <p className="text-3xl font-extrabold font-mono text-ink mt-1">{stats.simulationsRun > 0 ? `${stats.interviewReadiness}%` : 'N/A'}</p>
                <p className="text-[10px] text-ink-dim mt-1">{stats.simulationsRun} drills completed</p>
              </div>
            </div>
          </div>

          {/* Action Queue */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Recommended Immediate Actions
            </h3>
            
            <div className="space-y-3">
              <div className="bg-background border border-border hover:border-accent/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">High Priority</span>
                    <span className="text-xs text-ink font-bold">Simulate Interview Rounds</span>
                  </div>
                  <p className="text-xs text-ink-dim">
                    {stats.interviews > 0 
                      ? `You have ${stats.interviews} upcoming interview rounds. Calibrate technical and behavioral questions in the Lab.` 
                      : 'Prepare for unexpected technical screenings by running mock interview simulations.'}
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/interview')}
                  className="bg-accent text-black px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider hover:bg-accent/90 transition-all shrink-0 self-start sm:self-center"
                >
                  Start Mock Drill
                </button>
              </div>

              <div className="bg-background border border-border hover:border-accent/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold font-mono text-ink-dim bg-surface px-2 py-0.5 rounded border border-border">Outreach</span>
                    <span className="text-xs text-ink font-bold">Draft Referral Outreach Emails</span>
                  </div>
                  <p className="text-xs text-ink-dim">
                    Generate cold Gmail outreach pitches to recruiters and engineering managers at your tracked companies.
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/outreach')}
                  className="bg-surface-light border border-border hover:border-accent/40 text-ink px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all shrink-0 self-start sm:self-center"
                >
                  Open Outreach Hub
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CORE METRICS & ANALYTICS CARDS (1 PRIMARY CTA PER CARD)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Metric Card 1: ATS Resume Audit */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-accent/30 transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-accent/10 p-2 rounded-xl border border-accent/20 text-accent">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full font-mono">
                ATS SCORE
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink-dim uppercase tracking-wider mb-1 font-mono">Resume Compatibility</h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold font-mono text-ink">
                {stats.latestResumeScore > 0 ? `${stats.latestResumeScore}%` : 'N/A'}
              </span>
              {stats.latestResumeScore > 0 && (
                <span className="text-xs text-success font-semibold">Audited</span>
              )}
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.latestResumeScore > 0 ? (
                stats.missingKeywords.length > 0 ? (
                  `Missing key keywords: ${stats.missingKeywords.slice(0, 3).join(', ')}. Optimize in the Analyzer.`
                ) : (
                  "Your master resume aligns cleanly with target technical job listings!"
                )
              ) : (
                "Upload your baseline master resume to generate instant 4-category ATS scoring and missing keyword analysis."
              )}
            </p>
          </div>
          <div className="pt-6 border-t border-border mt-6">
            <button 
              onClick={() => navigate('/analyzer')}
              className="w-full bg-surface-light border border-border hover:border-accent/40 text-ink py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              Audit Resume <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric Card 2: Interview Simulator */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-accent/30 transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-accent/10 p-2 rounded-xl border border-accent/20 text-accent">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full font-mono">
                READINESS
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink-dim uppercase tracking-wider mb-1 font-mono">Interview Prep Index</h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold font-mono text-ink">
                {stats.simulationsRun > 0 ? `${stats.interviewReadiness}%` : '0%'}
              </span>
              <span className="text-xs text-accent font-semibold">
                {stats.simulationsRun > 0 ? `${stats.simulationsRun} Drills Completed` : 'Not Started'}
              </span>
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.simulationsRun > 0 ? (
                `Readiness index compiled across ${stats.simulationsRun} mock interview drills with real-time AI feedback.`
              ) : (
                "Practice answering behavioral and technical questions in the interactive Interview Lab."
              )}
            </p>
          </div>
          <div className="pt-6 border-t border-border mt-6">
            <button 
              onClick={() => navigate('/interview')}
              className="w-full bg-surface-light border border-border hover:border-accent/40 text-ink py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              Enter Interview Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric Card 3: Learning Roadmap */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-accent/30 transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-accent/10 p-2 rounded-xl border border-accent/20 text-accent">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full font-mono">
                SKILL ROADMAP
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink-dim uppercase tracking-wider mb-1 font-mono">Weekly Activity Progress</h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold font-mono text-ink">{stats.weeklyMilestoneCount}</span>
              <span className="text-xs text-ink-dim font-semibold">Milestones (7 Days)</span>
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.weeklyMilestoneCount > 0 ? (
                `${stats.weeklyJobsCount} applications tracked, ${stats.weeklyResumesCount} resumes evaluated, and ${stats.weeklySimulationsCount} interview drills run this week.`
              ) : (
                "Bridge identified skill gaps by accessing personalized Coursera, Udemy, and system-vetted courses."
              )}
            </p>
          </div>
          <div className="pt-6 border-t border-border mt-6">
            <button 
              onClick={() => navigate('/roadmap')}
              className="w-full bg-surface-light border border-border hover:border-accent/40 text-ink py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              View Learning Roadmap <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPCOMING EVENTS & CALENDAR                                                 */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-10">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-ink-dim uppercase tracking-widest font-mono">Target Deadlines</span>
            </div>
            <h2 className="text-xl font-bold text-ink uppercase tracking-tight font-mono">Upcoming Milestones</h2>
          </div>
          {stats.upcomingEvents.length > 0 && (
            <button 
              onClick={() => navigate('/jobs')}
              className="text-xs font-bold font-mono text-accent hover:underline flex items-center gap-1"
            >
              View Calendar &rarr;
            </button>
          )}
        </div>

        <div className="space-y-3">
          {stats.upcomingEvents.length > 0 ? (
            stats.upcomingEvents.map((event, idx) => (
              <div key={idx} className="p-4 bg-background border border-border rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-accent/10 px-3 py-2 rounded-lg border border-accent/20 text-center shrink-0">
                    <span className="text-[9px] font-bold text-accent uppercase font-mono block">{event.month}</span>
                    <span className="text-base font-extrabold text-ink font-mono leading-none">{event.day}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">{event.title}</h4>
                    <p className="text-xs text-ink-dim mt-0.5">{event.description}</p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/interview')}
                  className="bg-accent text-black px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider hover:bg-accent/90 transition-all shrink-0"
                >
                  Prep Round
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 bg-background rounded-2xl border border-border/80 text-center space-y-3">
              <p className="text-xs text-ink font-bold">Initialize Target Applications to Schedule Interview Rounds</p>
              <p className="text-[11px] text-ink-dim max-w-sm mx-auto">
                Candidates who conduct mock interview simulations prior to technical rounds report 3.5x higher offer success.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button 
                  onClick={() => navigate('/interview')}
                  className="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-md"
                >
                  Start Mock Simulation
                </button>
                <button 
                  onClick={() => navigate('/finder')}
                  className="bg-surface-light border border-border hover:border-accent/40 text-ink px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Discover Live Jobs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AI CAREER ADVISOR / COACH                                                  */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-border rounded-2xl p-8 mb-10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="lg:w-1/3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">EXPERT ADVISORY</span>
            </div>
            <h2 className="text-2xl font-bold text-ink uppercase tracking-tight font-mono mb-2">AI Career Advisor</h2>
            <p className="text-xs text-ink-dim leading-relaxed mb-4">
              Consult with our built-in Stanford Career Strategist & Executive Coach. Get instant answers regarding salary negotiations, career gaps, or interview strategy.
            </p>
            <div className="bg-background p-4 rounded-xl border border-border space-y-2">
              <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Suggested queries:</p>
              <ul className="space-y-1.5 text-xs text-ink-dim">
                <li className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("How do I address a 6-month employment gap elegantly?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Addressing employment gaps
                </li>
                <li className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("What are the best negotiation strategies for tech offers?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Offer negotiation strategy
                </li>
                <li className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("How can I frame myself as a tech leader without official title?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Framing informal leadership
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:w-2/3 w-full space-y-4">
            <form onSubmit={handleAskCoach} className="relative">
              <input 
                type="text" 
                value={coachQuestion}
                onChange={(e) => setCoachQuestion(e.target.value)}
                placeholder="Ask the executive coach anything about your job search strategy..."
                className="w-full bg-background border border-border rounded-xl px-5 py-3.5 pr-14 text-sm text-ink focus:outline-none focus:border-accent/50 transition-all placeholder:text-ink-dim/40"
              />
              <button 
                type="submit" 
                disabled={isCoachLoading}
                className="absolute right-2 top-2 bg-accent text-black p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <AnimatePresence mode="wait">
              {isCoachLoading && (
                <div className="mt-4">
                  <AILoadingStepper presetKey="career_coach" title="Executive Strategy & Negotiation Engine" />
                </div>
              )}

              {coachAnswer && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 bg-background rounded-xl border border-border space-y-3"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <UserCheck className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">Executive Advisory Insight</span>
                  </div>
                  
                  <div className="text-xs text-ink-dim leading-relaxed whitespace-pre-line font-sans">
                    {coachAnswer.answer}
                  </div>

                  {coachAnswer.actionItems && coachAnswer.actionItems.length > 0 && (
                    <div className="pt-3 border-t border-border mt-3">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono mb-2">KEY STEPS</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {coachAnswer.actionItems.map((item: string, idx: number) => (
                          <div key={idx} className="p-3 bg-surface rounded-lg border border-border flex items-start gap-2">
                            <span className="bg-accent/10 text-accent text-[10px] font-mono font-bold w-4 h-4 rounded flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-ink font-medium leading-tight">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

