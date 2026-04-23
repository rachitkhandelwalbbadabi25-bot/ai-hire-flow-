import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Briefcase, FileText, CheckCircle2, TrendingUp, Search, FileEdit, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, isAdmin, isPremium } = useAuth();
  const [stats, setStats] = useState({
    totalJobs: 0,
    resumesAnalyzed: 0,
    interviews: 0,
    offers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        const resumesRef = collection(db, 'users', user.uid, 'resumes');
        
        const jobsSnap = await getDocs(jobsRef);
        const resumesSnap = await getDocs(resumesRef);
        
        const jobs = (jobsSnap.docs || []).map(doc => doc.data());
        const statusCounts = jobs.reduce((acc: any, job: any) => {
          if (job && job.status) {
            acc[job.status] = (acc[job.status] || 0) + 1;
          }
          return acc;
        }, {});

        setStats({
          totalJobs: jobsSnap.size,
          resumesAnalyzed: resumesSnap.size,
          interviews: statusCounts['Interview'] || 0,
          offers: statusCounts['Offer'] || 0
        });

        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-ink-dim font-medium uppercase tracking-widest text-[10px]">Overview</p>
            {(isAdmin || isPremium) && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[8px] font-bold uppercase">
                <Crown className="w-2 h-2" /> Unlimited Access
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-ink font-sans tracking-tight">
            Welcome back, {user.displayName?.split(' ')[0]}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {!isAdmin && !isPremium && (
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-0.5">Free Tier Plan</p>
              <p className="text-[9px] text-ink-dim font-mono tracking-tighter uppercase">5 Neural Scans Remaining</p>
            </div>
          )}
          <Link 
            to="/jobs" 
            className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20 h-fit"
          >
            <Plus className="w-4 h-4" /> Add Application
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Applications', val: stats.totalJobs, icon: Briefcase, color: 'text-accent' },
          { label: 'Scans', val: stats.resumesAnalyzed, icon: FileText, color: 'text-ink' },
          { label: 'Interviews', val: stats.interviews, icon: TrendingUp, color: 'text-warning' },
          { label: 'Offers', val: stats.offers, icon: CheckCircle2, color: 'text-success' }
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface p-6 rounded-2xl border border-border group hover:border-accent/30 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-surface-light p-2 rounded-xl group-hover:bg-accent/5 transition-all">
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
            </div>
            <p className="text-ink-dim text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-ink font-mono tracking-tighter">{s.val}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-12">
        <h3 className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em] mb-6 px-2">Suggested Next Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/finder" className="bg-surface p-6 rounded-[2rem] border border-border hover:border-accent/40 transition-all group shadow-sm">
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
          <Link to="/interview" className="bg-surface p-6 rounded-[2rem] border border-border hover:border-success/40 transition-all group shadow-sm">
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
          <Link to="/learning" className="bg-surface p-6 rounded-[2rem] border border-border hover:border-warning/40 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-warning/10 p-3 rounded-2xl group-hover:bg-warning/20 transition-colors">
                   <FileText className="w-5 h-5 text-warning" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Learning Roadmap</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Close alignment gaps</p>
                </div>
             </div>
          </Link>
          <Link to="/editor" className="bg-surface p-6 rounded-[2rem] border border-border hover:border-accent/40 transition-all group shadow-sm">
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
