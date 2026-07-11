import { collection, getDocs } from 'firebase/firestore';
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
  Send 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { askAICoach } from '../lib/gemini';

export default function Dashboard() {
  const { user, isAdmin, isPremium } = useAuth();
  const navigate = useNavigate();
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
    upcomingEvents: [] as any[]
  });
  const [loading, setLoading] = useState(true);

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
        
        const statusCounts = jobs.reduce((acc: any, job: any) => {
          if (job && job.status) {
            acc[job.status] = (acc[job.status] || 0) + 1;
          }
          return acc;
        }, {});

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

        let weeklyMilestoneCount = 0;
        resumes.forEach((r: any) => {
          if (isWithinLast7Days(r.createdAt)) weeklyMilestoneCount++;
        });
        jobs.forEach((j: any) => {
          if (isWithinLast7Days(j.appliedDate)) weeklyMilestoneCount++;
        });
        simulations.forEach((s: any) => {
          if (isWithinLast7Days(s.createdAt)) weeklyMilestoneCount++;
        });

        // 4. Upcoming events from jobs with status 'Interview'
        const upcomingEvents: any[] = [];
        const interviewJobs = jobs.filter(j => j.status === 'Interview');
        
        interviewJobs.forEach((job) => {
          const date = job.appliedDate ? new Date(job.appliedDate) : new Date();
          // Simulate interview date 3 days in the future relative to apply date
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

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachQuestion.trim()) return;

    setIsCoachLoading(true);
    setCoachAnswer(null);

    try {
      const context = `Candidate stats: Applications: ${stats.totalJobs}, Resumes audited: ${stats.resumesAnalyzed}, Interviews lined up: ${stats.interviews}.`;
      const res = await askAICoach(coachQuestion, context);
      setCoachAnswer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCoachLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12 gap-8 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" /> SYSTEM ACTIVE
            </span>
            <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Rachit's Career Terminal</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-ink tracking-tight font-sans">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-accent/80">{user.displayName?.split(' ')[0] || "Professional"}</span>
          </h1>
          <p className="text-ink-dim text-sm mt-2 max-w-xl">
            Welcome to your unified AI Career Operating System. All operations are calibrated and synchronized with live placement indices.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-border flex items-center gap-4">
            <div className="text-left">
              <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Global Status</p>
              <p className="text-xs font-bold text-success flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Accelerated Mode
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-left">
              <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Plan Authorization</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-bold text-ink uppercase tracking-tight">Premium Elite</span>
              </div>
            </div>
          </div>

          <Link 
            to="/jobs" 
            className="bg-accent text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:opacity-95 hover:scale-[1.02] transition-all shadow-lg shadow-accent/20"
          >
            <Plus className="w-4 h-4" /> Add Opportunity
          </Link>
        </div>
      </div>

      {/* Career Progress Dashboard Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Metric Card 1: ATS Tracker */}
        <div className="glass-card p-8 border border-border hover:border-accent/30 transition-all flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all" />
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20 text-accent">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded-full border border-accent/10">ATS SCORE</span>
            </div>
            <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wider mb-2">Resume Compatibility</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-extrabold tracking-tighter font-mono text-ink">
                {stats.latestResumeScore > 0 ? `${stats.latestResumeScore}%` : 'N/A'}
              </span>
              {stats.latestResumeScore > 0 && (
                <span className="text-xs text-success font-semibold flex items-center gap-0.5">Evaluated</span>
              )}
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.latestResumeScore > 0 ? (
                stats.missingKeywords.length > 0 ? (
                  `Your resume compatibility index is compiled. Missed keywords: ${stats.missingKeywords.slice(0, 4).join(', ')}. Eliminate gaps in the Analyzer module.`
                ) : (
                  "Your resume has 100% alignment with your target specifications! Excellent work."
                )
              ) : (
                "No evaluated resumes detected. Upload your first resume to the Analyzer module to baseline your ATS compatibility score."
              )}
            </p>
          </div>
          <button 
            onClick={() => navigate('/analyzer')}
            className="mt-6 flex items-center gap-2 text-xs font-bold text-ink hover:text-accent transition-colors self-start group/btn"
          >
            Audit Resume <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>

        {/* Metric Card 2: Interview readiness */}
        <div className="glass-card p-8 border border-border hover:border-success/30 transition-all flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-2xl group-hover:bg-success/10 transition-all" />
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="bg-success/10 p-2.5 rounded-2xl border border-success/20 text-success">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-success uppercase tracking-wider bg-success/5 px-2 py-0.5 rounded-full border border-success/10">SIMULATOR READINESS</span>
            </div>
            <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wider mb-2">Interview Readiness</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-extrabold tracking-tighter font-mono text-ink">
                {stats.simulationsRun > 0 ? `${stats.interviewReadiness}%` : '0%'}
              </span>
              <span className="text-xs text-success font-semibold flex items-center gap-0.5">
                {stats.simulationsRun > 0 ? (stats.interviewReadiness >= 80 ? 'Highly Calibrated' : 'Calibrating') : 'No Simulation'}
              </span>
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.simulationsRun > 0 ? (
                `Calculated across ${stats.simulationsRun} simulated agent runs. High fidelity behavioral & technical feedback has been compiled.`
              ) : (
                "Vetting simulation has not been initiated. Enter the Interview Lab to run real-time interactive questions and calculate your readiness index."
              )}
            </p>
          </div>
          <button 
            onClick={() => navigate('/interview')}
            className="mt-6 flex items-center gap-2 text-xs font-bold text-ink hover:text-success transition-colors self-start group/btn"
          >
            Enter Interview Lab <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>

        {/* Metric Card 3: Weekly Activity */}
        <div className="glass-card p-8 border border-border hover:border-warning/30 transition-all flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full blur-2xl group-hover:bg-warning/10 transition-all" />
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="bg-warning/10 p-2.5 rounded-2xl border border-warning/20 text-warning">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider bg-warning/5 px-2 py-0.5 rounded-full border border-warning/10">ACTIVE CYCLE</span>
            </div>
            <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wider mb-2">Weekly Milestones</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-extrabold tracking-tighter font-mono text-ink">{stats.weeklyMilestoneCount}/10</span>
              <span className="text-xs text-warning font-semibold">Targets Logged</span>
            </div>
            <div className="w-full bg-surface-light h-1.5 rounded-full overflow-hidden mb-3">
              <div className="bg-warning h-full rounded-full" style={{ width: `${Math.min(100, (stats.weeklyMilestoneCount / 10) * 100)}%` }} />
            </div>
            <p className="text-xs text-ink-dim leading-relaxed">
              {stats.weeklyMilestoneCount > 0 ? (
                `Excellent activity profile. You logged ${stats.weeklyMilestoneCount} operations in the pipeline over the last 7 days. Keep up your current job acquisition velocity!`
              ) : (
                "No operations recorded in the last 7 days. Track target jobs, audit resumes, or initiate simulated interview drills to log weekly milestone targets."
              )}
            </p>
          </div>
          <button 
            onClick={() => navigate('/learning')}
            className="mt-6 flex items-center gap-2 text-xs font-bold text-ink hover:text-warning transition-colors self-start group/btn"
          >
            View Active Goals <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Grid: Recommended actions & Upcoming Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Today's AI Recommendations */}
        <div className="lg:col-span-7 glass-panel">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Neural Intelligence Feed</span>
              </div>
              <h2 className="text-xl font-bold text-ink tracking-tight uppercase">Today's Operations Feed</h2>
            </div>
            <span className="text-xs text-accent font-mono tracking-tighter uppercase">UPDATED LIVE</span>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => navigate('/analyzer')}
              className="flex items-center justify-between p-5 bg-surface/30 hover:bg-surface/80 rounded-2xl border border-border group cursor-pointer transition-all hover:translate-x-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center border border-accent/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ink text-sm">Optimize tech stack descriptions</h4>
                    <span className="text-[8px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest">CRITICAL</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Resume ATS compatibility missing 3 specialized industry-standard tags.</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-accent transition-colors" />
            </div>

            <div 
              onClick={() => navigate('/interview')}
              className="flex items-center justify-between p-5 bg-surface/30 hover:bg-surface/80 rounded-2xl border border-border group cursor-pointer transition-all hover:translate-x-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-success/10 text-success rounded-xl flex items-center justify-center border border-success/20">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ink text-sm">Behavioral storytelling simulation</h4>
                    <span className="text-[8px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase tracking-widest">HIGH PAYOFF</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Practice STAR method alignment for complex conflict resolutions questions.</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-success transition-colors" />
            </div>

            <div 
              onClick={() => navigate('/outreach')}
              className="flex items-center justify-between p-5 bg-surface/30 hover:bg-surface/80 rounded-2xl border border-border group cursor-pointer transition-all hover:translate-x-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-warning/10 text-warning rounded-xl flex items-center justify-center border border-warning/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ink text-sm">Trigger cold referral draft sequence</h4>
                    <span className="text-[8px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full uppercase tracking-widest">RECOMMENDED</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Draft cold outbound messages to Google and Stripe engineers for target vacancies.</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-warning transition-colors" />
            </div>
          </div>
        </div>

        {/* Calendar / Upcoming milestones */}
        <div className="lg:col-span-5 glass-panel">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-success" />
                <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Target Deadlines</span>
              </div>
              <h2 className="text-xl font-bold text-ink tracking-tight uppercase">Upcoming Events</h2>
            </div>
          </div>

          <div className="space-y-4">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event, idx) => (
                <div key={idx} className="p-5 bg-surface/30 rounded-2xl border border-border flex items-start gap-4">
                  <div className="bg-accent/10 px-3 py-2.5 rounded-xl border border-accent/20 flex flex-col items-center shrink-0">
                    <span className="text-[10px] font-bold text-accent tracking-tighter uppercase font-mono">{event.month}</span>
                    <span className="text-lg font-extrabold text-ink font-mono mt-0.5 leading-none">{event.day}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">{event.title}</h4>
                    <p className="text-xs text-ink-dim mt-0.5">{event.description}</p>
                    <p className="text-[9px] font-bold text-accent uppercase tracking-wider mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> {event.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 bg-surface/10 rounded-2xl border border-border/50 text-center space-y-3">
                <p className="text-xs text-ink-dim">No upcoming interviews scheduled in your active job pipeline.</p>
                <button 
                  onClick={() => navigate('/jobs')}
                  className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline"
                >
                  Manage Pipeline &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive AI Coach Interface */}
      <div className="glass-panel mb-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div className="lg:w-1/3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">ELITE EXPERT ADVICE</span>
            </div>
            <h2 className="text-2xl font-bold text-ink tracking-tight uppercase mb-3">AI Career Advisor</h2>
            <p className="text-sm text-ink-dim leading-relaxed mb-6">
              Consult with our built-in Stanford Career Strategist & McKinsey Executive Coach. Get instant high-fidelity answers to salary negotiations, missing background arguments, resume layouts, or interview plans.
            </p>
            <div className="bg-surface/30 p-4 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider mb-2">Suggested queries:</p>
              <ul className="space-y-1.5 text-xs text-ink-dim">
                <li className="cursor-pointer hover:text-ink transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("How do I address a 6-month employment gap elegantly?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Gap in employment framing
                </li>
                <li className="cursor-pointer hover:text-ink transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("What are the best negotiation strategies for tech offers?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Offer negotiation strategy
                </li>
                <li className="cursor-pointer hover:text-ink transition-colors flex items-center gap-1.5" onClick={() => setCoachQuestion("How can I frame myself as a tech leader without official title?")}>
                  <ChevronRight className="w-3 h-3 text-accent" /> Framing informal leadership
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:w-2/3 w-full space-y-6">
            <form onSubmit={handleAskCoach} className="relative">
              <input 
                type="text" 
                value={coachQuestion}
                onChange={(e) => setCoachQuestion(e.target.value)}
                placeholder="Ask the executive coach anything about your placement cycle or resume strategy..."
                className="w-full bg-surface-light/40 border border-border rounded-2xl px-6 py-4 pr-16 text-sm text-ink focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-ink-dim/40"
              />
              <button 
                type="submit" 
                disabled={isCoachLoading}
                className="absolute right-3 top-3 bg-accent text-white p-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <AnimatePresence mode="wait">
              {isCoachLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 bg-surface/20 rounded-2xl border border-border"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Synthesizing Advisor Knowledge...</span>
                  </div>
                  <div className="w-full bg-surface-light h-1 rounded-full overflow-hidden">
                    <div className="bg-accent h-full rounded-full animate-[loading_1.5s_infinite]" />
                  </div>
                </motion.div>
              )}

              {coachAnswer && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 bg-surface-light/20 rounded-2xl border border-border space-y-4"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <UserCheck className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Executive Advisory Insight</span>
                  </div>
                  
                  <div className="text-sm text-ink-dim leading-relaxed whitespace-pre-line font-sans">
                    {coachAnswer.answer}
                  </div>

                  {coachAnswer.actionItems && coachAnswer.actionItems.length > 0 && (
                    <div className="pt-4 border-t border-border mt-4">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-3">IMMEDIATE STEPS REQUIRED</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {coachAnswer.actionItems.map((item: string, idx: number) => (
                          <div key={idx} className="p-3 bg-surface/40 rounded-xl border border-border flex items-start gap-2">
                            <span className="bg-accent/15 text-accent text-[10px] font-mono font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                              0{idx + 1}
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

      {/* Suggested next operations Grid */}
      <div className="mb-12">
        <h3 className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em] mb-6 px-2">Next Operations Command Grid</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/finder" className="glass-card p-6 border border-border hover:border-accent/40 hover:-translate-y-1 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent/20 transition-colors">
                   <Search className="w-5 h-5 text-accent" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Market surveillance</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Initialize job discovery scan</p>
                </div>
             </div>
          </Link>
          <Link to="/interview" className="glass-card p-6 border border-border hover:border-success/40 hover:-translate-y-1 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-success/10 p-3 rounded-2xl group-hover:bg-success/20 transition-colors">
                   <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Simulation drill</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Calibrate readiness levels</p>
                </div>
             </div>
          </Link>
          <Link to="/learning" className="glass-card p-6 border border-border hover:border-warning/40 hover:-translate-y-1 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-warning/10 p-3 rounded-2xl group-hover:bg-warning/20 transition-colors">
                   <GraduationCap className="w-5 h-5 text-warning" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Learning Roadmap</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Close alignment gaps</p>
                </div>
             </div>
          </Link>
          <Link to="/editor" className="glass-card p-6 border border-border hover:border-accent/40 hover:-translate-y-1 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent/20 transition-colors">
                   <FileEdit className="w-5 h-5 text-accent" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Neural Editor</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Refactor professional DNA</p>
                </div>
             </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
