import { collection, getDocs, addDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import QuickStartChecklist from '../components/QuickStartChecklist';
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

export default function Dashboard() {
  const { user, isAdmin, isPremium } = useAuth();
  const { plan, creditWallet } = usePlan();
  const { 
    activeTargetRole, 
    latestResume,
    simulations: systemSimulations 
  } = useSystemOS();
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
    
    // Helper to extract a normalized 0-100 score from any simulation record or evaluation payload
    const parseSimulationScore = (sim: any): number | null => {
      if (!sim) return null;

      // 1. Direct candidate numeric score fields
      const directCandidates = [
        sim.score,
        sim.overallScore,
        sim.totalScore,
        sim.aggregateScore,
        sim.interviewReadiness,
        sim.readinessScore,
        sim.percentage
      ];

      for (const cand of directCandidates) {
        if (typeof cand === 'number' && !isNaN(cand)) {
          // If score is on 1-10 scale (e.g. 7.5 or 8), convert to 0-100%
          return cand <= 10 && cand > 0 ? Math.round(cand * 10) : Math.min(100, Math.max(0, Math.round(cand)));
        }
        if (typeof cand === 'string' && cand.trim() !== '') {
          const parsed = parseFloat(cand.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) {
            return parsed <= 10 && parsed > 0 ? Math.round(parsed * 10) : Math.min(100, Math.max(0, Math.round(parsed)));
          }
        }
      }

      // 2. Derive from evaluations object or array if present
      if (sim.evaluations && (typeof sim.evaluations === 'object' || Array.isArray(sim.evaluations))) {
        const evals = Array.isArray(sim.evaluations) ? sim.evaluations : Object.values(sim.evaluations);
        const scores = evals
          .map((e: any) => {
            if (typeof e?.score === 'number' && !isNaN(e.score)) return e.score;
            if (typeof e?.score === 'string') {
              const num = parseFloat(e.score);
              return isNaN(num) ? null : num;
            }
            if (typeof e?.rating === 'number' && !isNaN(e.rating)) return e.rating;
            return null;
          })
          .filter((s): s is number => s !== null && !isNaN(s));

        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return avg <= 10 && avg > 0 ? Math.round(avg * 10) : Math.min(100, Math.max(0, Math.round(avg)));
        }
      }

      return null;
    };

    // Helper to collect all real simulation activities across Firestore, SystemOS, and Browser Storage
    const resolveRealSimulations = (firestoreSims: any[]) => {
      const list: { id?: string; score: number; createdAt?: string }[] = [];
      const seenIds = new Set<string>();

      // 1. Process Firestore simulations (EVERY doc in the user's simulations collection is a recorded completed session!)
      (firestoreSims || []).forEach(sim => {
        let score = parseSimulationScore(sim);
        if (score === null && sim.evaluations) {
          score = parseSimulationScore({ evaluations: sim.evaluations });
        }
        // If a doc exists in the simulations collection, it was saved upon completing an interview drill
        if (score === null) {
          score = 75; // Baseline readiness if specific question scores were omitted
        }
        const simId = sim.id || `sim_${list.length}`;
        if (!seenIds.has(simId)) {
          seenIds.add(simId);
          list.push({
            id: simId,
            score,
            createdAt: sim.createdAt || new Date().toISOString()
          });
        }
      });

      // 2. Process simulations from SystemOSContext if not already present
      if (systemSimulations && Array.isArray(systemSimulations)) {
        systemSimulations.forEach(sysSim => {
          if (sysSim.id && seenIds.has(sysSim.id)) return;
          let score = parseSimulationScore(sysSim);
          if (score === null && (sysSim as any).evaluations) {
            score = parseSimulationScore({ evaluations: (sysSim as any).evaluations });
          }
          if (score === null && (sysSim as any).score !== undefined) {
            score = parseSimulationScore({ score: (sysSim as any).score });
          }
          if (score !== null) {
            const sysId = sysSim.id || `sys_sim_${list.length}`;
            if (!seenIds.has(sysId)) {
              seenIds.add(sysId);
              list.push({
                id: sysId,
                score,
                createdAt: sysSim.createdAt || new Date().toISOString()
              });
            }
          }
        });
      }

      // 3. Fallback: check sessionStorage for active/completed session evaluations
      try {
        const sessionEvalsRaw = sessionStorage.getItem('interview_sim_evaluations');
        if (sessionEvalsRaw) {
          const parsedEvals = JSON.parse(sessionEvalsRaw);
          if (parsedEvals && typeof parsedEvals === 'object' && Object.keys(parsedEvals).length > 0) {
            const sessionScore = parseSimulationScore({ evaluations: parsedEvals });
            if (sessionScore !== null) {
              if (list.length === 0) {
                list.push({
                  id: 'session-sim-active',
                  score: sessionScore,
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch {}

      // 4. Fallback: check localStorage for saved evaluations
      try {
        const localEvalsRaw = localStorage.getItem('interview_sim_evaluations');
        if (localEvalsRaw && list.length === 0) {
          const parsedEvals = JSON.parse(localEvalsRaw);
          if (parsedEvals && typeof parsedEvals === 'object' && Object.keys(parsedEvals).length > 0) {
            const localScore = parseSimulationScore({ evaluations: parsedEvals });
            if (localScore !== null) {
              list.push({
                id: 'local-sim-active',
                score: localScore,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      } catch {}

      // 5. Fallback: check localStorage user-specific completed simulation
      try {
        const localSimRaw = (user?.uid ? localStorage.getItem(`interview_last_completed_sim_${user.uid}`) : null) || localStorage.getItem('interview_last_completed_sim');
        if (localSimRaw && list.length === 0) {
          const parsedSim = JSON.parse(localSimRaw);
          const localScore = parseSimulationScore(parsedSim);
          if (localScore !== null) {
            list.push({
              id: 'local-sim-record',
              score: localScore,
              createdAt: parsedSim.createdAt || new Date().toISOString()
            });
          }
        }
      } catch {}

      return list;
    };

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
        const simulations = (simulationsSnap.docs || []).map(doc => ({ id: doc.id, ...(doc.data() as any) }));
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
        const resolvedSims = resolveRealSimulations(simulations);
        let interviewReadiness = 0;
        if (resolvedSims.length > 0) {
          const sum = resolvedSims.reduce((acc, sim) => acc + sim.score, 0);
          interviewReadiness = Math.round(sum / resolvedSims.length);
        }
        const simulationsRun = resolvedSims.length;

        // Auto-persist uncommitted session if Firestore is empty to ensure durable storage
        if (simulations.length === 0 && user?.uid) {
          try {
            const sessionEvalsRaw = sessionStorage.getItem('interview_sim_evaluations');
            const sessionJobDesc = sessionStorage.getItem('interview_sim_job_desc') || '';
            if (sessionEvalsRaw) {
              const parsedEvals = JSON.parse(sessionEvalsRaw);
              if (parsedEvals && Object.keys(parsedEvals).length > 0) {
                const sessionScore = parseSimulationScore({ evaluations: parsedEvals });
                if (sessionScore) {
                  addDoc(collection(db, 'users', user.uid, 'simulations'), {
                    jobDescription: sessionJobDesc,
                    evaluations: parsedEvals,
                    score: sessionScore,
                    createdAt: new Date().toISOString()
                  }).catch(() => {});
                }
              }
            }
          } catch {}
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
        resolvedSims.forEach((s: any) => {
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
          simulationsRun,
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

    // Attach real-time listener for simulations so newly completed drills update instantly
    const simulationsRef = collection(db, 'users', user.uid, 'simulations');
    const unsubscribeSims = onSnapshot(simulationsRef, (simSnap) => {
      const currentDocs = (simSnap.docs || []).map(d => ({ id: d.id, ...(d.data() as any) }));
      const resolved = resolveRealSimulations(currentDocs);
      let readiness = 0;
      if (resolved.length > 0) {
        const sum = resolved.reduce((acc, sim) => acc + sim.score, 0);
        readiness = Math.round(sum / resolved.length);
      }
      setStats(prev => {
        if (prev.simulationsRun === resolved.length && prev.interviewReadiness === readiness) {
          return prev;
        }
        return {
          ...prev,
          interviewReadiness: readiness,
          simulationsRun: resolved.length
        };
      });
    }, (err) => {
      console.warn("Real-time simulations listener warning:", err);
    });

    return () => {
      unsubscribeSims();
    };
  }, [user, systemSimulations]);

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachQuestion.trim()) return;

    setIsCoachLoading(true);
    setCoachAnswer(null);

    try {
      const trackedCompanies = rawJobsList.map(j => j.company || j.role).filter(Boolean).slice(0, 8).join(', ');
      const currentRole = masterResumeData?.experience?.[0]?.role 
        ? `${masterResumeData.experience[0].role} at ${masterResumeData.experience[0].company || 'Current Company'}`
        : 'Not specified';
      const targetRole = masterResumeData?.targetRole || (stats.missingKeywords?.length ? 'Roles requiring ' + stats.missingKeywords.slice(0, 3).join(', ') : 'Not specified');
      const userSkills = masterResumeData?.skills?.join(', ') || 'Not specified';

      const context = `
- Candidate Name: ${user?.displayName || 'Candidate'}
- Current Role: ${currentRole}
- Target Role: ${targetRole}
- Resume Skills & Data: ${userSkills}
- Master Resume Summary: "${masterResumeData?.summary || 'Candidate'}"
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

  const hasResume = stats.resumesAnalyzed > 0 || !!masterResumeData;
  const hasJobs = stats.totalJobs > 0;
  const hasTargetRole = Boolean(masterResumeData?.targetRole || latestResume?.targetRole || activeTargetRole);
  const hasScanDone = stats.resumesAnalyzed > 0;

  if (loading || !user) {
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

      <QuickStartChecklist 
        hasResume={hasResume}
        hasTargetRole={hasTargetRole}
        hasScanDone={hasScanDone}
        className="mb-8"
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

      {/* STATE 3: HAS JOBS TRACKED -> SHOW PIPELINE SUMMARY */}
      {hasJobs && (
        <section className="mb-10">
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
                Manage Job Tracker <ArrowRight className="w-3.5 h-3.5" />
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
              onClick={() => navigate('/learning')}
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
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 mb-10 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Left info column */}
          <div className="lg:w-1/3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">EXPERT ADVISORY</span>
              </div>
              <h2 className="text-2xl font-bold text-ink uppercase tracking-tight font-mono mb-2">AI Career Advisor</h2>
              <p className="text-xs text-ink-dim leading-relaxed mb-4">
                Consult with our built-in Career Strategist & Executive Coach. Get tailored advice on salary negotiations, handling employment gaps, or executive positioning.
              </p>
            </div>

            <div className="bg-background p-4 rounded-xl border border-border space-y-2 mt-auto">
              <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Suggested queries:</p>
              <ul className="space-y-2 text-xs text-ink-dim">
                <li 
                  className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("How do I address a 6-month employment gap elegantly?")}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Addressing employment gaps</span>
                </li>
                <li 
                  className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("What are the best negotiation strategies for tech offers?")}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Offer negotiation strategy</span>
                </li>
                <li 
                  className="cursor-pointer hover:text-accent transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("How can I frame myself as a tech leader without official title?")}>
                  <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Framing informal leadership</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right chat & answer column */}
          <div className="lg:w-2/3 w-full flex flex-col justify-between space-y-4 bg-background/50 p-4 sm:p-6 rounded-2xl border border-border/80">
            {/* Conversation / Response display area (TOP / MIDDLE) */}
            <div className="flex-1 min-h-[160px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {isCoachLoading ? (
                  <div className="py-4">
                    <AILoadingStepper presetKey="career_coach" title="Executive Strategy & Negotiation Engine" />
                  </div>
                ) : coachAnswer ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 bg-background rounded-xl border border-border space-y-3 shadow-inner"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">Executive Advisory Insight</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCoachAnswer(null);
                          setCoachQuestion("");
                        }}
                        className="text-[10px] font-mono text-ink-dim hover:text-accent transition-colors uppercase"
                      >
                        New Question
                      </button>
                    </div>
                    
                    <div className="text-xs text-ink-dim leading-relaxed whitespace-pre-line font-sans">
                      {coachAnswer.answer}
                    </div>

                    {coachAnswer.actionItems && coachAnswer.actionItems.length > 0 && (
                      <div className="pt-3 border-t border-border mt-3">
                        <p className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono mb-2">RECOMMENDED ACTION ITEMS</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {coachAnswer.actionItems.map((item: string, idx: number) => (
                            <div key={idx} className="p-2.5 bg-surface rounded-lg border border-border flex items-start gap-2">
                              <span className="bg-accent/10 text-accent text-[10px] font-mono font-bold w-4 h-4 rounded flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-[11px] text-ink font-medium leading-snug">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center py-6 px-4 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 text-accent">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-ink">Ready to assist your career strategy</h4>
                    <p className="text-xs text-ink-dim max-w-md mx-auto">
                      Ask any question below or click a suggested query on the left. The advisor analyzes your live resume, pipeline, and skills context.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Input & Button (PLACED AT THE BOTTOM) */}
            <form onSubmit={handleAskCoach} className="pt-3 border-t border-border/80">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={coachQuestion}
                  onChange={(e) => setCoachQuestion(e.target.value)}
                  placeholder="Ask the executive coach anything about your job search strategy..."
                  className="w-full bg-background border border-border rounded-xl pl-4 pr-28 py-3.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all placeholder:text-ink-dim/40 shadow-sm"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button 
                    type="submit" 
                    disabled={isCoachLoading || !coachQuestion.trim()}
                    className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Ask</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

