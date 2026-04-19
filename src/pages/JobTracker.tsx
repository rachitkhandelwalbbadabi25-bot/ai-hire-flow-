import { useState, useEffect, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Building2, 
  Calendar,
  X,
  Briefcase,
  LoaderCircle as Spinner
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function JobTracker() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form state
  const [newJob, setNewJob] = useState({
    company: '',
    role: '',
    status: 'Applied',
    notes: '',
  });

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    try {
      const q = query(collection(db, 'users', user.uid, 'jobs'), orderBy('appliedDate', 'desc'));
      const snap = await getDocs(q);
      setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddJob = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', user.uid, 'jobs'), {
        ...newJob,
        appliedDate: new Date().toISOString()
      });
      setIsAdding(false);
      setNewJob({ company: '', role: '', status: 'Applied', notes: '' });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Delete this application?")) {
      await deleteDoc(doc(db, 'users', user.uid, 'jobs', id));
      fetchJobs();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'users', user.uid, 'jobs', id), { status });
    fetchJobs();
  };

  const filteredJobs = jobs.filter(j => 
    j.company.toLowerCase().includes(search.toLowerCase()) || 
    j.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight mb-2 uppercase font-sans leading-none">Job Pipeline</h1>
          <p className="text-ink-dim font-medium text-sm">Real-time surveillance of your current professional acquisitions.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
            <input 
              type="text" 
              placeholder="Filter acquisitions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-ink"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Target
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Spinner className="w-8 h-8 animate-spin text-accent/20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface p-8 rounded-3xl border border-border mb-8 shadow-2xl relative"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-accent" /> Register Opportunity
                  </h3>
                  <button onClick={() => setIsAdding(false)} className="text-ink-dim hover:text-ink"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">Organization</label>
                    <input 
                      required
                      value={newJob.company}
                      onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                      placeholder="e.g. Stripe"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">Role Type</label>
                    <input 
                      required
                      value={newJob.role}
                      onChange={(e) => setNewJob({...newJob, role: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                      placeholder="e.g. Product Engineer"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">Status</label>
                    <select 
                      value={newJob.status}
                      onChange={(e) => setNewJob({...newJob, status: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 appearance-none text-ink"
                    >
                      <option>Applied</option>
                      <option>Interview</option>
                      <option>Offer</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-accent text-white p-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:opacity-90 transition-all">Commit</button>
                    <button type="button" onClick={() => setIsAdding(false)} className="p-3.5 border border-border rounded-2xl text-ink-dim hover:text-ink transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredJobs.length > 0 ? (
            <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-light/30">
                    <th className="px-6 py-4 text-[10px] font-bold text-ink-dim uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-ink-dim uppercase tracking-widest hidden md:table-cell">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-ink-dim uppercase tracking-widest hidden md:table-cell">Applied Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-ink-dim uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="font-sans">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border hover:bg-surface-light/20 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-xl border border-border">
                            <Building2 className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-sm">{job.company}</p>
                            <p className="text-ink-dim text-[10px] md:hidden font-medium">{job.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <p className="text-ink text-sm font-medium">{job.role}</p>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-ink-dim">
                          <span className="text-xs font-mono">{formatDate(job.appliedDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <select 
                          value={job.status}
                          onChange={(e) => updateStatus(job.id, e.target.value)}
                          className={cn(
                            "status-pill appearance-none cursor-pointer border-none focus:ring-0",
                            job.status === 'Applied' && "status-applied",
                            job.status === 'Interview' && "status-interview",
                            job.status === 'Offer' && "status-offer",
                            job.status === 'Rejected' && "status-rejected"
                          )}
                        >
                          <option>Applied</option>
                          <option>Interview</option>
                          <option>Offer</option>
                          <option>Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 text-ink-dim hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center bg-surface border border-border rounded-3xl">
              <div className="bg-surface-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-ink-dim" />
              </div>
              <h3 className="text-ink font-bold text-lg mb-2 uppercase tracking-tight">Registry Empty</h3>
              <p className="text-ink-dim text-sm mb-8 font-medium">No active acquisitions recorded in standard sub-sectors.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-accent text-white px-8 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-accent/20"
              >
                <Plus className="w-4 h-4" /> Initialize Acquisition
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoaderCircle(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
