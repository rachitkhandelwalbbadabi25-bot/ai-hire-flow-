import { User } from 'firebase/auth';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Briefcase, FileText, CheckCircle2, TrendingUp, Search, FileEdit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, cn } from '../lib/utils';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    totalJobs: 0,
    resumesAnalyzed: 0,
    interviews: 0,
    offers: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        const resumesRef = collection(db, 'users', user.uid, 'resumes');
        
        const jobsSnap = await getDocs(jobsRef);
        const resumesSnap = await getDocs(resumesRef);
        
        const recentJobsQuery = query(jobsRef, orderBy('appliedDate', 'desc'), limit(5));
        const recentSnap = await getDocs(recentJobsQuery);
        
        const jobs = jobsSnap.docs.map(doc => doc.data());
        const statusCounts = jobs.reduce((acc: any, job: any) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {});

        setChartData([
          { name: 'Applied', value: statusCounts['Applied'] || 0 },
          { name: 'Interview', value: statusCounts['Interview'] || 0 },
          { name: 'Offer', value: statusCounts['Offer'] || 0 },
          { name: 'Rejected', value: statusCounts['Rejected'] || 0 }
        ]);

        setStats({
          totalJobs: jobsSnap.size,
          resumesAnalyzed: resumesSnap.size,
          interviews: statusCounts['Interview'] || 0,
          offers: statusCounts['Offer'] || 0
        });

        setRecentJobs(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user.uid]);

  const COLORS = ['#6366F1', '#3dc2ff', '#10b981', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-12">
        <div>
          <p className="text-ink-dim font-medium mb-1 uppercase tracking-widest text-[10px]">Overview</p>
          <h1 className="text-3xl font-bold text-ink font-sans tracking-tight">
            Welcome back, {user.displayName?.split(' ')[0]}
          </h1>
        </div>
        <Link 
          to="/jobs" 
          className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4" /> Add Application
        </Link>
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
            className="bg-surface p-6 rounded-2xl border border-border"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-surface-light p-2 rounded-xl">
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
            </div>
            <p className="text-ink-dim text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-ink font-mono tracking-tighter">{s.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Suggested Operations */}
      <div className="mb-12">
        <h3 className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em] mb-6 px-2">Suggested Next Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/finder" className="bg-surface p-6 rounded-[2rem] border border-border hover:border-accent/40 transition-all group shadow-sm">
             <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent/20 transition-colors">
                   <Search className="w-5 h-5 text-accent" />
                </div>
                <div>
                   <h4 className="font-bold text-ink text-sm">Market Surveillance</h4>
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
                   <h4 className="font-bold text-ink text-sm">Simulation Drill</h4>
                   <p className="text-[10px] text-ink-dim uppercase tracking-tighter">Calibrate interview readiness</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-surface p-8 rounded-2xl border border-border">
          <h3 className="font-sans font-bold text-lg text-ink mb-8">Performance Pipeline</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94949E', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94949E', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#16161A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Jobs Column */}
        <div className="bg-surface p-8 rounded-2xl border border-border">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-sans font-bold text-lg text-ink">Recent Apps</h3>
            <Link to="/jobs" className="text-accent hover:text-ink text-xs font-bold transition-colors">View All</Link>
          </div>
          <div className="space-y-6">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between group">
                <div>
                  <p className="font-bold text-ink text-sm">{job.company}</p>
                  <p className="text-ink-dim text-xs font-medium">{job.role}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn(
                    "status-pill",
                    job.status === 'Applied' && "status-applied",
                    job.status === 'Interview' && "status-interview",
                    job.status === 'Offer' && "status-offer",
                    job.status === 'Rejected' && "status-rejected"
                  )}>
                    {job.status}
                  </span>
                  <p className="text-[10px] text-ink-dim/50 font-mono mt-1">{formatDate(job.appliedDate)}</p>
                </div>
              </div>
            )) : (
              <p className="text-ink-dim text-sm text-center py-12 italic">No data records.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
