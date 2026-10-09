import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles,
  LoaderCircle as Spinner,
  Loader2,
  Send,
  MessageSquare
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { useSystemOS } from '../context/SystemOSContext';
import EmptyState from '../components/EmptyState';
import NextStepBridgeCard from '../components/NextStepBridgeCard';

export default function JobTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAccess, openUpgradeModal, deductCredit } = usePlan();
  const { activeTargetRole } = useSystemOS();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { hasAccess: canAddJob, remaining: jobsRemaining, limit: jobLimit } = checkAccess('jobsTracked', jobs.length);

  // Form state
  const [newJob, setNewJob] = useState({
    company: '',
    role: '',
    status: 'Applied',
    notes: '',
  });

  useEffect(() => {
    if (user?.uid) {
      fetchJobs();
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  const fetchJobs = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
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
    if (!canAddJob) {
      openUpgradeModal('jobsTracked');
      return;
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'jobs'), {
        ...newJob,
        appliedDate: new Date().toISOString()
      });
      setIsAdding(false);
      setNewJob({ company: '', role: '', status: 'Applied', notes: '' });
      await deductCredit('jobsTracked');
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'jobs', id));
      setJobs(prev => prev.filter(j => j.id !== id));
      await fetchJobs();
    } catch (err) {
      console.error('Failed to delete job:', err);
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

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-cta)]" />
          <p className="text-sm font-medium text-[var(--hf-text-secondary)]">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--hf-text)] tracking-tight">
            Application tracker
          </h1>
          <p className="text-sm text-[var(--hf-text-secondary)]">
            Track and organize your active job applications across interview stages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Capacity pill */}
          <div className="flex items-center gap-3 bg-[var(--hf-surface)] border border-[var(--hf-border)] px-3.5 py-2 rounded-lg text-xs shadow-xs">
            <span className="text-[var(--hf-text-secondary)] font-medium">Slots used:</span>
            <span className={cn(
              "font-semibold tabular-nums",
              jobsRemaining === 0 ? "text-[var(--hf-error)]" : "text-[var(--hf-text)]"
            )}>
              {jobs.length} / {jobLimit}
            </span>
            <div className="w-16 h-1.5 bg-[var(--hf-surface-secondary)] rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  jobsRemaining === 0 ? "bg-[var(--hf-error)]" : "bg-[var(--hf-cta)]"
                )} 
                style={{ width: `${Math.min(100, (jobs.length / (typeof jobLimit === 'number' ? jobLimit : 1)) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hf-text-muted)] pointer-events-none" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search company or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter applications by company or role"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-all"
            />
          </div>

          {/* Add Application CTA */}
          <button 
            onClick={() => {
              if (!canAddJob) {
                openUpgradeModal('jobsTracked');
                return;
              }
              setIsAdding(true);
            }}
            className="hf-btn-primary min-h-[44px] px-4 font-medium flex items-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add new application
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-7 h-7 animate-spin text-[var(--hf-cta)]" />
          <p className="text-sm text-[var(--hf-text-secondary)]">Loading pipeline...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[var(--hf-surface)] p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] shadow-sm"
              >
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[var(--hf-text)]">Add new application</h2>
                      <p className="text-xs text-[var(--hf-text-secondary)]">Log an opportunity into your active tracking pipeline.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAdding(false)} 
                    aria-label="Close add form"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg hover:bg-[var(--hf-surface-secondary)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1">
                    <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Company</label>
                    <input 
                      required
                      value={newJob.company}
                      onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                      className="w-full min-h-[44px] px-3.5 py-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      placeholder="e.g. Stripe"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Role title</label>
                    <input 
                      required
                      value={newJob.role}
                      onChange={(e) => setNewJob({...newJob, role: e.target.value})}
                      className="w-full min-h-[44px] px-3.5 py-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      placeholder="e.g. Frontend Engineer"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Stage</label>
                    <select 
                      value={newJob.status}
                      onChange={(e) => setNewJob({...newJob, status: e.target.value})}
                      className="w-full min-h-[44px] px-3.5 py-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] cursor-pointer"
                    >
                      <option>Applied</option>
                      <option>Interview</option>
                      <option>Offer</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="submit" 
                      className="hf-btn-primary flex-1 min-h-[44px] text-sm font-medium shadow-xs"
                    >
                      Save application
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsAdding(false)} 
                      className="hf-btn-secondary min-h-[44px] px-3.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredJobs.length > 0 ? (
            <div className="space-y-6">
              {/* Desktop / Tablet: Editorial Table */}
              <div className="hidden md:block bg-[var(--hf-surface)] rounded-xl border border-[var(--hf-border)] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--hf-surface-secondary)] border-b border-[var(--hf-border)]">
                      <th className="px-6 py-3.5 text-xs font-semibold text-[var(--hf-text-secondary)]">Company</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-[var(--hf-text-secondary)]">Role</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-[var(--hf-text-secondary)]">Date applied</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-[var(--hf-text-secondary)]">Stage</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-[var(--hf-text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hf-border)]">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-[var(--hf-surface-secondary)]/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)] shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-sm text-[var(--hf-text)]">{job.company}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[var(--hf-text-secondary)]">{job.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-[var(--hf-text-secondary)]">
                            {formatDate(job.appliedDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <label className="sr-only" htmlFor={`status-desktop-${job.id}`}>Update stage for {job.company}</label>
                          <select 
                            id={`status-desktop-${job.id}`}
                            value={job.status}
                            onChange={(e) => updateStatus(job.id, e.target.value)}
                            className={cn(
                              "text-xs font-medium rounded-md px-2.5 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                              job.status === 'Applied' && "bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]",
                              job.status === 'Interview' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
                              job.status === 'Offer' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
                              job.status === 'Rejected' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                            )}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(job.id);
                            }}
                            aria-label={`Delete application for ${job.role} at ${job.company}`}
                            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Readable Application Cards */}
              <div className="md:hidden space-y-3">
                {filteredJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-[var(--hf-surface)] p-4 rounded-xl border border-[var(--hf-border)] shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)] shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--hf-text)] leading-snug">{job.company}</h3>
                          <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">{job.role}</p>
                          <p className="text-[11px] text-[var(--hf-text-muted)] font-mono mt-1">
                            Applied: {formatDate(job.appliedDate)}
                          </p>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        aria-label={`Delete application for ${job.role} at ${job.company}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[var(--hf-border)] flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--hf-text-secondary)] font-medium">Stage</span>
                      <label className="sr-only" htmlFor={`status-mobile-${job.id}`}>Update stage for {job.company}</label>
                      <select 
                        id={`status-mobile-${job.id}`}
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value)}
                        className={cn(
                          "min-h-[44px] text-xs font-medium rounded-lg px-3 py-2 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                          job.status === 'Applied' && "bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]",
                          job.status === 'Interview' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
                          job.status === 'Offer' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
                          job.status === 'Rejected' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                        )}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {jobs.length > 0 && (
                <NextStepBridgeCard
                  title="Application pipeline active"
                  contextData={`Tracking ${jobs.length} applications across companies (${Array.from(new Set(jobs.map(j => j.company))).slice(0, 3).join(', ')}). Latest target: ${jobs[0]?.role} at ${jobs[0]?.company}.`}
                  primaryStep={{
                    label: `Draft pitch for ${jobs[0]?.company || 'recruiter'}`,
                    icon: Send,
                    to: "/outreach",
                    state: {
                      company: jobs[0]?.company,
                      role: jobs[0]?.role,
                      openModal: true
                    }
                  }}
                  secondaryStep={{
                    label: "Practice mock interview",
                    icon: MessageSquare,
                    to: "/interview",
                    state: {
                      company: jobs[0]?.company,
                      role: jobs[0]?.role,
                      jobDescription: `Position: ${jobs[0]?.role} at ${jobs[0]?.company}\nNotes: ${jobs[0]?.notes || 'Technical interview and system architecture.'}`
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Launch your application pipeline"
              targetRole={activeTargetRole || "Tech Roles"}
              description="Track your active job applications in one place to stay organized across interview stages, recruiter follow-ups, and offer negotiations."
              benefitMetric="Candidates tracking 5+ applications get 3.2x more interview callbacks"
              primaryAction={{
                label: "Add job application",
                onClick: () => setIsAdding(true),
                icon: Plus
              }}
              secondaryAction={{
                label: "Browse live job listings",
                onClick: () => navigate('/finder'),
                icon: Search
              }}
            />
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
