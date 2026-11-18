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
  X,
  Briefcase,
  LoaderCircle as Spinner,
  Loader2,
  Send,
  MessageSquare,
  LayoutGrid,
  TableProperties,
  ArrowRight
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { useSystemOS } from '../context/SystemOSContext';
import EmptyState from '../components/EmptyState';
import NextStepBridgeCard from '../components/NextStepBridgeCard';

const KANBAN_STAGES = [
  { id: 'Applied', label: '01 // APPLIED', accent: 'text-[var(--hf-text)]', badgeBg: 'bg-[var(--hf-surface-secondary)]' },
  { id: 'Interview', label: '02 // INTERVIEW LOOP', accent: 'text-[var(--hf-cta)]', badgeBg: 'bg-amber-500/15' },
  { id: 'Offer', label: '03 // OFFER RECEIVED', accent: 'text-[var(--hf-success)]', badgeBg: 'bg-[var(--hf-mint)]' },
  { id: 'Rejected', label: '04 // ARCHIVED', accent: 'text-[var(--hf-error)]', badgeBg: 'bg-[var(--hf-error-bg)]' },
] as const;

export default function JobTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAccess, openUpgradeModal, deductCredit } = usePlan();
  const { activeTargetRole } = useSystemOS();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

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
    if (!user?.uid) return;
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
    if (!user?.uid) return;
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, status } : j)));
    await updateDoc(doc(db, 'users', user.uid, 'jobs', id), { status });
    fetchJobs();
  };

  const filteredJobs = jobs.filter(j => 
    (j.company || '').toLowerCase().includes(search.toLowerCase()) || 
    (j.role || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-cta)]" />
          <p className="font-mono text-xs uppercase text-[var(--hf-text-secondary)]">Loading application ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Editorial Dossier Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div className="space-y-1">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)] block">
            04 // APPLICATION PIPELINE
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight">
            Application tracker
          </h1>
          <p className="text-sm text-[var(--hf-text-secondary)]">
            Manage active applications across Kanban stages or inspect the chronological requisition ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Board / Ledger View Switcher */}
          <div className="inline-flex border-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)] shadow-[2px_2px_0px_var(--hf-ink-border)] p-0.5 rounded-sm">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                "px-3 py-1.5 font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 rounded-sm transition-colors cursor-pointer",
                viewMode === 'board'
                  ? "bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)]"
                  : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>BOARD</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                "px-3 py-1.5 font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 rounded-sm transition-colors cursor-pointer",
                viewMode === 'table'
                  ? "bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)]"
                  : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
              )}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>LEDGER</span>
            </button>
          </div>

          {/* Capacity Ledger Stamp */}
          <div className="flex items-center gap-2.5 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] px-3 py-2 rounded-sm text-xs shadow-[2px_2px_0px_var(--hf-ink-border)]">
            <span className="font-mono text-[11px] font-bold uppercase text-[var(--hf-text-secondary)]">SLOTS:</span>
            <span className={cn(
              "font-mono font-bold tabular-nums",
              jobsRemaining === 0 ? "text-[var(--hf-error)]" : "text-[var(--hf-text)]"
            )}>
              {jobs.length}/{jobLimit}
            </span>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:w-56 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hf-text-muted)] pointer-events-none" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Filter company or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter applications by company or role"
              className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-xs text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:border-[var(--hf-cta)] transition-all"
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
            className="hf-btn-primary min-h-[40px] px-4 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> LOG APPLICATION
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-7 h-7 animate-spin text-[var(--hf-cta)]" />
          <p className="font-mono text-xs uppercase text-[var(--hf-text-secondary)]">Loading pipeline...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="hf-card p-5 sm:p-6"
              >
                <div className="flex justify-between items-center mb-5 pb-3 border-b-[1.5px] border-[var(--hf-ink-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-sm bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] flex items-center justify-center text-[var(--hf-cta)]">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-serif-display text-lg font-bold text-[var(--hf-text)]">Log new requisition</h2>
                      <p className="text-xs text-[var(--hf-text-secondary)]">Record an opportunity into your active tracking pipeline.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAdding(false)} 
                    aria-label="Close add form"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-sm border border-transparent hover:border-[var(--hf-ink-border)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1">
                    <label className="font-mono text-[11px] font-bold uppercase text-[var(--hf-text)] mb-1.5 block">Company</label>
                    <input 
                      required
                      value={newJob.company}
                      onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                      className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:border-[var(--hf-cta)]"
                      placeholder="e.g. Stripe"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="font-mono text-[11px] font-bold uppercase text-[var(--hf-text)] mb-1.5 block">Role title</label>
                    <input 
                      required
                      value={newJob.role}
                      onChange={(e) => setNewJob({...newJob, role: e.target.value})}
                      className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:border-[var(--hf-cta)]"
                      placeholder="e.g. Frontend Engineer"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="font-mono text-[11px] font-bold uppercase text-[var(--hf-text)] mb-1.5 block">Stage</label>
                    <select 
                      value={newJob.status}
                      onChange={(e) => setNewJob({...newJob, status: e.target.value})}
                      className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] focus:outline-none focus:border-[var(--hf-cta)] cursor-pointer"
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
                      className="hf-btn-primary flex-1 min-h-[42px] text-xs"
                    >
                      SAVE RECORD
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsAdding(false)} 
                      className="hf-btn-secondary min-h-[42px] px-3.5 text-xs"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredJobs.length > 0 ? (
            <div className="space-y-6">
              {/* KANBAN DOSSIER BOARD VIEW */}
              {viewMode === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                  {KANBAN_STAGES.map((col) => {
                    const colJobs = filteredJobs.filter(j => (j.status || 'Applied') === col.id);
                    const nextStage = col.id === 'Applied' ? 'Interview' : col.id === 'Interview' ? 'Offer' : null;
                    return (
                      <div
                        key={col.id}
                        className="bg-[var(--hf-surface-secondary)]/70 border-[1.5px] border-[var(--hf-ink-border)] rounded-sm p-3.5 space-y-3 min-h-[260px]"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b-[1.5px] border-[var(--hf-ink-border)]">
                          <span className={cn("font-mono text-[11px] font-bold uppercase tracking-wider", col.accent)}>
                            {col.label}
                          </span>
                          <span className={cn("font-mono text-xs font-bold px-2 py-0.5 border border-[var(--hf-ink-border)]", col.badgeBg)}>
                            {colJobs.length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {colJobs.length > 0 ? colJobs.map((job) => (
                            <motion.div
                              layout
                              key={job.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] p-3.5 rounded-sm space-y-2.5 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)] truncate">
                                    {job.company}
                                  </p>
                                  <h3 className="font-serif-display text-base font-bold text-[var(--hf-text)] leading-snug">
                                    {job.role}
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJob(job.id)}
                                  aria-label={`Delete ${job.role} at ${job.company}`}
                                  className="p-1 text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] rounded-sm transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[var(--hf-border)] text-[11px]">
                                <span className="font-mono text-[10px] text-[var(--hf-text-muted)]">
                                  {formatDate(job.appliedDate)}
                                </span>
                                {nextStage ? (
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(job.id, nextStage)}
                                    className="font-mono text-[10px] font-bold uppercase text-[var(--hf-cta)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>→ {nextStage}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <select
                                    value={job.status}
                                    onChange={(e) => updateStatus(job.id, e.target.value)}
                                    aria-label={`Change stage for ${job.company}`}
                                    className="font-mono text-[10px] bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] px-1.5 py-0.5 rounded-sm cursor-pointer"
                                  >
                                    <option value="Applied">Applied</option>
                                    <option value="Interview">Interview</option>
                                    <option value="Offer">Offer</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                )}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="py-8 text-center font-mono text-[11px] text-[var(--hf-text-muted)] border border-dashed border-[var(--hf-border)]">
                              NO ENTRIES
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet: Editorial Ledger Table */}
                  <div className="hidden md:block hf-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--hf-surface-secondary)] border-b-[1.5px] border-[var(--hf-ink-border)] font-mono text-[11px] uppercase">
                          <th className="px-6 py-3.5 font-bold text-[var(--hf-text)]">Company</th>
                          <th className="px-6 py-3.5 font-bold text-[var(--hf-text)]">Role</th>
                          <th className="px-6 py-3.5 font-bold text-[var(--hf-text)]">Date applied</th>
                          <th className="px-6 py-3.5 font-bold text-[var(--hf-text)]">Stage</th>
                          <th className="px-6 py-3.5 text-right font-bold text-[var(--hf-text)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hf-border)]">
                        {filteredJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-[var(--hf-surface-secondary)]/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-sm bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] flex items-center justify-center text-[var(--hf-cta)] shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-sm text-[var(--hf-text)]">{job.company}</span>
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
                                  "font-mono text-xs font-bold rounded-sm px-2.5 py-1.5 border cursor-pointer focus:outline-none",
                                  job.status === 'Applied' && "bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border-[var(--hf-ink-border)]",
                                  job.status === 'Interview' && "bg-amber-500/15 text-[var(--hf-cta)] border-[var(--hf-cta)]",
                                  job.status === 'Offer' && "bg-[var(--hf-mint)] text-[var(--hf-success)] border-[var(--hf-success)]",
                                  job.status === 'Rejected' && "bg-[var(--hf-error-bg)] text-[var(--hf-error)] border-[var(--hf-error)]"
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
                                className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] p-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] hover:bg-rose-500/10 rounded-sm transition-colors cursor-pointer"
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
                        className="hf-card p-4 space-y-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-sm bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] flex items-center justify-center text-[var(--hf-cta)] shrink-0 mt-0.5">
                              <Building2 className="w-4 h-4" />
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
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] rounded-sm transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pt-2 border-t border-[var(--hf-border)] flex items-center justify-between gap-3">
                          <span className="font-mono text-xs text-[var(--hf-text-secondary)] font-bold uppercase">Stage</span>
                          <label className="sr-only" htmlFor={`status-mobile-${job.id}`}>Update stage for {job.company}</label>
                          <select 
                            id={`status-mobile-${job.id}`}
                            value={job.status}
                            onChange={(e) => updateStatus(job.id, e.target.value)}
                            className="min-h-[40px] font-mono text-xs font-bold rounded-sm px-3 py-1.5 border border-[var(--hf-ink-border)] bg-[var(--hf-surface-secondary)] cursor-pointer"
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
                </>
              )}

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
