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
  Crown, 
  Sparkles, 
  ArrowUpRight, 
  Calendar, 
  Activity, 
  ArrowRight, 
  GraduationCap, 
  Mic, 
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
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import QuickStartChecklist from '../components/QuickStartChecklist';
import { useSystemOS } from '../context/SystemOSContext';
import { askAICoach } from '../lib/gemini';
import AILoadingStepper from '../components/AILoadingStepper';
import {
  SpotlightCard,
  AnimatedCircularGauge,
  AnimatedCounter,
  FadeInSection
} from '../components/AnimatedPrimitives';

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
  const { plan, creditWallet, checkAccess, deductCredit, openUpgradeModal } = usePlan();
  const { 
    activeTargetRole, 
    latestResume,
    simulations: systemSimulations 
  } = useSystemOS();
  const navigate = useNavigate();

  const planBadgeLabel = isAdmin ? 'Admin Master' : plan === 'premium' ? 'Premium Tier' : (plan === 'pro' || plan === 'standard') ? 'Pro Tier' : 'Free Tier';
  const advisorAccess = checkAccess('careerAdvisor');
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
          .filter((s: number | null): s is number => s !== null && !isNaN(s));

        if (scores.length > 0) {
          const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
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
          const rawInterviewDate = job.interviewDate || job.interview_date || null;
          let dateObj: Date | null = null;
          if (rawInterviewDate) {
            const parsed = new Date(rawInterviewDate);
            if (!isNaN(parsed.getTime())) {
              dateObj = parsed;
            }
          }
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          
          upcomingEvents.push({
            hasRealDate: Boolean(dateObj),
            month: dateObj ? months[dateObj.getMonth()] : null,
            day: dateObj ? dateObj.getDate().toString() : null,
            formattedDate: dateObj ? formatDate(dateObj) : null,
            company: job.company || 'Unknown Company',
            role: job.role || 'Target Role',
            title: `Interview: ${job.role || 'Target Role'} at ${job.company || 'Company'}`,
            description: `Application in interview stage with ${job.company || 'organization'}.`
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

    const access = checkAccess('careerAdvisor');
    if (!access.hasAccess) {
      openUpgradeModal();
      return;
    }

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
      await deductCredit('careerAdvisor');
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
      <div className="min-h-[400px] w-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-accent)]" />
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--hf-text-secondary)]">
            Loading career workspace...
          </p>
        </div>
      </div>
    );
  }

  const latestTargetRole = latestResume?.targetRole || activeTargetRole || masterResumeData?.targetRole;
  const latestAnalysisDate = latestResume?.createdAt ? formatDate(latestResume.createdAt) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-6 pt-2 pb-6 border-b border-[var(--hf-border)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-text-muted)] block mb-1">
            Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
            {greeting}, {user.displayName?.split(' ')[0] || "Professional"}
          </h1>
          <p className="text-xs sm:text-sm mt-1 max-w-xl text-[var(--hf-text-secondary)]">
            Resume diagnostics, application pipeline metrics, and interview readiness in one view.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[var(--hf-surface)] px-3.5 py-2 rounded-lg border border-[var(--hf-border)] flex items-center gap-3">
            <div className="text-left">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--hf-text-muted)]">Plan</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-cta)]" />
                <span className="text-xs font-semibold text-[var(--hf-text)]">{planBadgeLabel}</span>
              </div>
            </div>
          </div>

          {!hasResume ? (
            <button 
              onClick={() => navigate('/analyzer')}
              className="hf-btn-primary min-h-[42px] px-4 py-2 text-xs sm:text-sm gap-2"
            >
              <FileText className="w-4 h-4" /> Upload resume
            </button>
          ) : !hasJobs ? (
            <button 
              onClick={() => navigate('/finder')}
              className="hf-btn-primary min-h-[42px] px-4 py-2 text-xs sm:text-sm gap-2"
            >
              <Search className="w-4 h-4" /> Discover roles
            </button>
          ) : (
            <button 
              onClick={() => navigate('/jobs')}
              className="hf-btn-primary min-h-[42px] px-4 py-2 text-xs sm:text-sm gap-2"
            >
              <Plus className="w-4 h-4" /> Track application
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
      {/* 1. PRIORITY #1: NEXT ACTION                                               */}
      {/* ========================================================================= */}
      <section className="mb-8">
        {!hasResume ? (
          <div className="hf-card p-6 sm:p-8 border border-[var(--hf-border)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-accent)] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Next recommended step
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
                  Upload and analyze your master resume
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--hf-text-secondary)]">
                  To calculate ATS match scores, discover tailored roles, and practice focused interview questions, upload your resume or paste its text.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-3 rounded-xl flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[var(--hf-accent)]/15 text-[var(--hf-accent)] text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <span className="text-xs font-medium text-[var(--hf-text)]">Score resume</span>
                  </div>
                  <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-3 rounded-xl flex items-center gap-2.5 opacity-60">
                    <span className="w-5 h-5 rounded-full bg-[var(--hf-border)] text-[var(--hf-text-muted)] text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <span className="text-xs text-[var(--hf-text-muted)]">Discover target jobs</span>
                  </div>
                  <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-3 rounded-xl flex items-center gap-2.5 opacity-60">
                    <span className="w-5 h-5 rounded-full bg-[var(--hf-border)] text-[var(--hf-text-muted)] text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <span className="text-xs text-[var(--hf-text-muted)]">Practice interview</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-stretch md:items-end gap-2">
                <button 
                  onClick={() => navigate('/analyzer')}
                  className="min-h-[44px] bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" /> Upload resume
                </button>
                <span className="text-[11px] text-[var(--hf-text-muted)] text-center md:text-right">Supports PDF and DOCX files</span>
              </div>
            </div>
          </div>
        ) : !hasJobs ? (
          <div className="hf-card p-6 sm:p-8 border border-[var(--hf-border)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-accent)] text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Next recommended step
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
                  Discover matching jobs for your profile
                </h2>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">
                  Your resume is evaluated. Discover curated positions matching your skillset and start tracking your pipeline.
                </p>
              </div>
              <button 
                onClick={() => navigate('/finder')}
                className="min-h-[44px] bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Search className="w-4 h-4" /> Discover jobs
              </button>
            </div>
          </div>
        ) : stats.interviews > 0 ? (
          <div className="hf-card p-6 sm:p-8 border border-[var(--hf-border)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-accent)] text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Active interview preparation
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
                  Prepare for your upcoming interview
                </h2>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">
                  You have {stats.interviews} application{stats.interviews === 1 ? '' : 's'} in the interview stage. Conduct mock behavioral and technical drills to refine your responses.
                </p>
              </div>
              <button 
                onClick={() => navigate('/interview')}
                className="min-h-[44px] bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Mic className="w-4 h-4" /> Practice mock interview
              </button>
            </div>
          </div>
        ) : (
          <div className="hf-card p-6 sm:p-8 border border-[var(--hf-border)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-accent)] text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline active
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
                  Continue application momentum
                </h2>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">
                  Track new openings or run mock drills to keep your interview readiness high while applications are reviewed.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button 
                  onClick={() => navigate('/jobs')}
                  className="min-h-[44px] bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Track job
                </button>
                <button 
                  onClick={() => navigate('/interview')}
                  className="min-h-[44px] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text)] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-[var(--hf-surface)] transition-all flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" /> Practice drill
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2 & 3. RESUME READINESS & UPCOMING INTERVIEWS                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 2. Current Resume Score */}
        <FadeInSection delay={0.05}>
          <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-5">
                <div className="bg-[var(--hf-surface-secondary)] p-2.5 rounded-xl border border-[var(--hf-border)] text-[var(--hf-accent)]">
                  <FileText className="w-5 h-5 text-[var(--hf-accent)]" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--hf-accent)] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-2.5 py-1 rounded-full">
                  Resume ATS match
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--hf-border)]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-text-muted)] mb-1">
                    Resume compatibility
                  </h3>
                  <p className="text-sm font-semibold text-[var(--hf-text)]">
                    {stats.latestResumeScore >= 80
                      ? 'Strong ATS alignment'
                      : stats.latestResumeScore >= 60
                      ? 'Competitive baseline'
                      : stats.latestResumeScore > 0
                      ? 'Needs keyword & metric refinement'
                      : 'Not evaluated yet'}
                  </p>
                  {latestTargetRole && (
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-1">
                      Target: <strong className="text-[var(--hf-text)] font-semibold">{latestTargetRole}</strong>
                    </p>
                  )}
                  {latestAnalysisDate && (
                    <p className="text-[11px] text-[var(--hf-text-muted)] mt-0.5">
                      Audited {latestAnalysisDate}
                    </p>
                  )}
                </div>

                <AnimatedCircularGauge
                  score={stats.latestResumeScore}
                  size={84}
                  strokeWidth={7}
                />
              </div>

              <p className="text-xs leading-relaxed text-[var(--hf-text-secondary)]">
                {stats.latestResumeScore > 0 ? (
                  stats.missingKeywords.length > 0 ? (
                    `Identified skill gaps: ${stats.missingKeywords.slice(0, 3).join(', ')}. Optimize in the Resume Analyzer.`
                  ) : (
                    "Your resume aligns cleanly with target technical job listings."
                  )
                ) : (
                  "Upload your master resume to calculate 4-category ATS scoring and identified keyword gaps."
                )}
              </p>
            </div>

            <div className="pt-5 border-t border-[var(--hf-border)] mt-5">
              <button 
                onClick={() => navigate('/analyzer')}
                className="hf-btn-secondary min-h-[42px] w-full py-2.5 px-4 text-xs sm:text-sm font-semibold gap-2"
              >
                <span>Audit in resume analyzer</span>
                <ArrowRight className="w-4 h-4 text-[var(--hf-text-secondary)]" />
              </button>
            </div>
          </SpotlightCard>
        </FadeInSection>

        {/* 3. Upcoming Interviews */}
        <FadeInSection delay={0.1}>
          <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--hf-border)]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--hf-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--hf-text)]">Upcoming interviews</h3>
                </div>
                <span className="text-xs font-medium text-[var(--hf-text-secondary)]">
                  {stats.upcomingEvents.length} scheduled
                </span>
              </div>

              <div className="space-y-3">
                {stats.upcomingEvents.length > 0 ? (
                  stats.upcomingEvents.map((event, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {event.hasRealDate && event.month && event.day ? (
                          <div className="bg-[var(--hf-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--hf-border)] text-center shrink-0 min-w-[44px]">
                            <span className="text-[10px] font-semibold text-[var(--hf-accent)] uppercase block leading-none">{event.month}</span>
                            <span className="text-sm font-bold text-[var(--hf-text)] tabular-nums leading-none mt-1">{event.day}</span>
                          </div>
                        ) : (
                          <div className="bg-[var(--hf-surface)] p-2 rounded-lg border border-[var(--hf-border)] text-[var(--hf-accent)] shrink-0">
                            <Briefcase className="w-4 h-4 text-[var(--hf-accent)]" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-[var(--hf-text)] text-xs sm:text-sm">{event.title}</h4>
                          <p className="text-[11px] text-[var(--hf-text-secondary)] mt-0.5">
                            {event.hasRealDate && event.formattedDate ? `Scheduled for ${event.formattedDate}` : 'In interview stage (date not specified)'}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate('/interview')}
                        className="hf-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs font-semibold shrink-0"
                      >
                        Prep round
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-[var(--hf-surface-secondary)]/60 rounded-xl border border-[var(--hf-border)] text-center space-y-2">
                    <p className="text-xs font-semibold text-[var(--hf-text)]">No upcoming interviews scheduled</p>
                    <p className="text-[11px] text-[var(--hf-text-secondary)] max-w-sm mx-auto">
                      When you update an application in the Job Tracker to the &ldquo;Interview&rdquo; stage, it will appear here for practice.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-5 border-t border-[var(--hf-border)] mt-5">
              <button 
                onClick={() => navigate('/interview')}
                className="hf-btn-secondary min-h-[42px] w-full py-2.5 px-4 text-xs sm:text-sm font-semibold gap-2"
              >
                <span>Practice in interview lab</span>
                <ArrowRight className="w-4 h-4 text-[var(--hf-text-secondary)]" />
              </button>
            </div>
          </SpotlightCard>
        </FadeInSection>
      </div>

      {/* ========================================================================= */}
      {/* 4. SAVED JOBS & APPLICATION PROGRESS (PIPELINE SUMMARY)                   */}
      {/* ========================================================================= */}
      <FadeInSection delay={0.12} className="mb-8">
        <SpotlightCard hoverLift={false} className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--hf-border)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-[var(--hf-accent)]" />
                <span className="text-[11px] font-semibold text-[var(--hf-accent)] uppercase tracking-wider">Application progress</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--hf-text)]">
                Job pipeline summary
              </h2>
            </div>
            <button 
              onClick={() => navigate('/jobs')}
              className="hf-btn-secondary min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold gap-2 self-start sm:self-center"
            >
              <span>Manage job tracker</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--hf-text-secondary)]" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] p-4 rounded-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">Total tracked</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--hf-text)] mt-1">
                <AnimatedCounter value={stats.totalJobs} />
              </p>
              <p className="text-[11px] text-[var(--hf-text-secondary)] mt-1">Applications in pipeline</p>
            </div>
            <div className="bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] p-4 rounded-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">Interviews</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--hf-accent)] mt-1">
                <AnimatedCounter value={stats.interviews} />
              </p>
              <p className="text-[11px] text-[var(--hf-text-secondary)] mt-1">In interview stage</p>
            </div>
            <div className="bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] p-4 rounded-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">Offers</p>
              <p 
                className="text-2xl sm:text-3xl font-bold tabular-nums mt-1"
                style={{ color: stats.offers > 0 ? 'var(--hf-success)' : 'var(--hf-text)' }}
              >
                <AnimatedCounter value={stats.offers} />
              </p>
              <p className="text-[11px] text-[var(--hf-text-secondary)] mt-1">Offers received</p>
            </div>
            <div className="bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] p-4 rounded-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">Average practice score</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--hf-text)] mt-1">
                {stats.simulationsRun > 0 ? <AnimatedCounter value={stats.interviewReadiness} suffix="%" /> : 'N/A'}
              </p>
              <p className="text-[11px] text-[var(--hf-text-secondary)] mt-1">
                {stats.simulationsRun} drill{stats.simulationsRun === 1 ? '' : 's'} completed
              </p>
            </div>
          </div>

          {/* Visual Multi-Stage Funnel Progress Bar */}
          {stats.totalJobs > 0 && (
            <div className="mt-5 pt-4 border-t border-[var(--hf-border)] space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--hf-text-secondary)]">
                <span className="font-medium">Pipeline Stage Distribution</span>
                <span className="font-mono text-[11px]">
                  {Math.round(((stats.interviews + stats.offers) / Math.max(1, stats.totalJobs)) * 100)}% interview conversion
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(8, ((stats.totalJobs - stats.interviews - stats.offers) / Math.max(1, stats.totalJobs)) * 100)}%` }}
                  transition={{ duration: 0.7 }}
                  className="h-full bg-slate-400/70"
                  title="Applied"
                />
                {stats.interviews > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.interviews / Math.max(1, stats.totalJobs)) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className="h-full bg-[var(--hf-cta)]"
                    title="Interviewing"
                  />
                )}
                {stats.offers > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.offers / Math.max(1, stats.totalJobs)) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="h-full bg-[var(--hf-success)]"
                    title="Offers"
                  />
                )}
              </div>
            </div>
          )}
        </SpotlightCard>
      </FadeInSection>

      {/* ========================================================================= */}
      {/* 5 & 6. SKILL GAPS & LAST 7 DAYS                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 5. Skill Gaps from latest analysis */}
        <FadeInSection delay={0.14}>
          <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-[var(--hf-surface-secondary)] p-2.5 rounded-xl border border-[var(--hf-border)] text-[var(--hf-accent)]">
                  <GraduationCap className="w-5 h-5 text-[var(--hf-accent)]" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--hf-accent)] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-2.5 py-1 rounded-full">
                  Learning focus
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[var(--hf-text)] mb-1">
                Skill gaps from your latest analysis
              </h3>
              <p className="text-xs text-[var(--hf-text-secondary)] mb-4">
                Identified competencies recommended to strengthen your target role readiness.
              </p>

              {stats.missingKeywords && stats.missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.missingKeywords.slice(0, 8).map((skill, idx) => (
                    <motion.span 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text)]"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] rounded-xl text-xs text-[var(--hf-text-secondary)]">
                  No skill gaps identified yet. Run a resume analysis against a target job to generate focused learning recommendations.
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-[var(--hf-border)] mt-5">
              <button 
                onClick={() => navigate('/learning')}
                className="hf-btn-secondary min-h-[42px] w-full py-2.5 px-4 text-xs sm:text-sm font-semibold gap-2"
              >
                <span>View learning roadmap</span>
                <ArrowRight className="w-4 h-4 text-[var(--hf-text-secondary)]" />
              </button>
            </div>
          </SpotlightCard>
        </FadeInSection>

        {/* 6. Last 7 Days (Recent Activity) */}
        <FadeInSection delay={0.18}>
          <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-[var(--hf-surface-secondary)] p-2.5 rounded-xl border border-[var(--hf-border)] text-[var(--hf-accent)]">
                  <Activity className="w-5 h-5 text-[var(--hf-accent)]" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--hf-accent)] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-2.5 py-1 rounded-full">
                  Activity summary
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[var(--hf-text)] mb-1">
                Last 7 days
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-extrabold tabular-nums text-[var(--hf-text)]">
                  <AnimatedCounter value={stats.weeklyMilestoneCount} />
                </span>
                <span className="text-xs font-medium text-[var(--hf-text-secondary)]">
                  actions completed
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[var(--hf-text-secondary)]">Applications tracked</span>
                  <span className="font-semibold tabular-nums text-[var(--hf-text)]">{stats.weeklyJobsCount}</span>
                </div>
                <div className="p-2.5 bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[var(--hf-text-secondary)]">Resumes evaluated</span>
                  <span className="font-semibold tabular-nums text-[var(--hf-text)]">{stats.weeklyResumesCount}</span>
                </div>
                <div className="p-2.5 bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[var(--hf-text-secondary)]">Mock interview drills</span>
                  <span className="font-semibold tabular-nums text-[var(--hf-text)]">{stats.weeklySimulationsCount}</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[var(--hf-border)] mt-5">
              <button 
                onClick={() => navigate('/jobs')}
                className="hf-btn-secondary min-h-[42px] w-full py-2.5 px-4 text-xs sm:text-sm font-semibold gap-2"
              >
                <span>Review pipeline activity</span>
                <ArrowRight className="w-4 h-4 text-[var(--hf-text-secondary)]" />
              </button>
            </div>
          </SpotlightCard>
        </FadeInSection>
      </div>

      {/* ========================================================================= */}
      {/* 7. AI CAREER ADVISOR                                                      */}
      {/* ========================================================================= */}
      <section className="hf-card p-6 sm:p-8 border border-[var(--hf-border)]">
        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Left info column */}
          <div className="lg:w-1/3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--hf-cta)] uppercase tracking-wider">Career Advisory</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)]">
                  {typeof advisorAccess.limit === 'number' && advisorAccess.limit < 9999 ? `${advisorAccess.remaining} left today` : 'Daily allowance'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)] mb-2">
                Career Strategy Advisor
              </h2>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed mb-4">
                Ask questions about offer negotiations, addressing employment gaps, or positioning your technical background using your live profile context.
              </p>
            </div>

            <div className="bg-[var(--hf-surface-secondary)] p-4 rounded-xl border border-[var(--hf-border)] space-y-2 mt-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">Suggested questions:</p>
              <ul className="space-y-2 text-xs text-[var(--hf-text-secondary)]">
                <li 
                  className="cursor-pointer hover:text-[var(--hf-accent)] transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("How do I address a 6-month employment gap elegantly?")}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--hf-accent)] shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Addressing employment gaps</span>
                </li>
                <li 
                  className="cursor-pointer hover:text-[var(--hf-accent)] transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("What are the best negotiation strategies for tech offers?")}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--hf-accent)] shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Offer negotiation strategy</span>
                </li>
                <li 
                  className="cursor-pointer hover:text-[var(--hf-accent)] transition-colors flex items-center gap-1.5 group/q" 
                  onClick={() => setCoachQuestion("How can I frame myself as a tech leader without official title?")}>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--hf-accent)] shrink-0 group-hover/q:translate-x-0.5 transition-transform" /> 
                  <span>Framing informal leadership</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right chat & answer column */}
          <div className="lg:w-2/3 w-full flex flex-col justify-between space-y-4 bg-[var(--hf-surface-secondary)] p-4 sm:p-6 rounded-2xl border border-[var(--hf-border)]">
            {/* Conversation / Response display area */}
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
                    className="p-5 bg-[var(--hf-surface)] rounded-xl border border-[var(--hf-border)] space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--hf-border)]">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[var(--hf-accent)]" />
                        <span className="text-xs font-semibold text-[var(--hf-text)]">Advisory insight</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCoachAnswer(null);
                          setCoachQuestion("");
                        }}
                        className="text-[11px] text-[var(--hf-text-secondary)] hover:text-[var(--hf-accent)] transition-colors"
                      >
                        New question
                      </button>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed whitespace-pre-line">
                      {coachAnswer.answer}
                    </div>

                    {coachAnswer.actionItems && coachAnswer.actionItems.length > 0 && (
                      <div className="pt-3 border-t border-[var(--hf-border)] mt-3">
                        <p className="text-[11px] font-semibold text-[var(--hf-accent)] uppercase tracking-wider mb-2">Recommended action items</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {coachAnswer.actionItems.map((item: string, idx: number) => (
                            <div key={idx} className="p-2.5 bg-[var(--hf-surface-secondary)] rounded-lg border border-[var(--hf-border)] flex items-start gap-2">
                              <span className="bg-[var(--hf-accent)]/15 text-[var(--hf-accent)] text-xs font-bold w-4 h-4 rounded flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs text-[var(--hf-text)] font-medium leading-snug">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center py-6 px-4 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center mx-auto mb-3 text-[var(--hf-accent)]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--hf-text)]">Ready to assist your career strategy</h4>
                    <p className="text-xs text-[var(--hf-text-secondary)] max-w-md mx-auto">
                      Ask any question below or click a suggested query on the left. The advisor analyzes your live resume, pipeline, and skills context.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Input & Button */}
            <form onSubmit={handleAskCoach} className="pt-3 border-t border-[var(--hf-border)]">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={coachQuestion}
                  onChange={(e) => setCoachQuestion(e.target.value)}
                  placeholder="Ask the executive coach about your job search strategy..."
                  className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl pl-4 pr-24 py-3 text-xs sm:text-sm text-[var(--hf-text)] focus:outline-none focus:border-[var(--hf-accent)] focus:ring-1 focus:ring-[var(--hf-accent)]/30 transition-all placeholder:text-[var(--hf-text-muted)] shadow-sm"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button 
                    type="submit" 
                    disabled={isCoachLoading || !coachQuestion.trim()}
                    className="min-h-[38px] bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Ask</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

