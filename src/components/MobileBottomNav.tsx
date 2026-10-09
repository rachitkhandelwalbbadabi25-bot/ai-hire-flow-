import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Briefcase, 
  Sparkles, 
  User as UserIcon, 
  BarChart3, 
  Mic, 
  GraduationCap, 
  FileEdit,
  X,
  ChevronRight,
  Search,
  CheckCircle2,
  Award,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MobileBottomNavProps {
  onOpenOverflowDrawer: () => void;
}

export default function MobileBottomNav({ onOpenOverflowDrawer }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPrepSheetOpen, setIsPrepSheetOpen] = useState(false);

  // Close prep sheet on location change
  useEffect(() => {
    setIsPrepSheetOpen(false);
  }, [location.pathname]);

  const prepItems = [
    { 
      name: 'Resume Analyzer', 
      desc: 'ATS scan & structural audit',
      path: '/analyzer', 
      icon: BarChart3,
      badge: 'ATS Scan'
    },
    { 
      name: 'Interview Lab', 
      desc: 'AI voice & roleplay simulator',
      path: '/interview', 
      icon: Mic,
      badge: 'Live Voice'
    },
    { 
      name: 'Learning Path', 
      desc: 'Adaptive role curriculum & roadmap',
      path: '/learning', 
      icon: GraduationCap,
      badge: 'Skills'
    },
    { 
      name: 'Resume Editor', 
      desc: 'Master resume builder & sync',
      path: '/editor', 
      icon: FileEdit,
      badge: 'Master Profile'
    }
  ];

  const isPrepActive = prepItems.some(item => location.pathname === item.path);
  const isJobsActive = location.pathname === '/finder' || location.pathname === '/jobs' || location.pathname === '/campus';
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isProfileActive = location.pathname === '/profile';

  return (
    <>
      {/* Prep Action Bottom Sheet (Triggered by Prep Tab) */}
      <AnimatePresence>
        {isPrepSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrepSheetOpen(false)}
              className="fixed inset-0 bg-black/50 z-[140] md:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              aria-label="Interview & Prep Suite"
              className="fixed bottom-0 inset-x-0 bg-[var(--hf-surface)] border-t border-[var(--hf-border)] rounded-t-2xl p-5 z-[150] md:hidden shadow-xl safe-area-pb"
            >
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 bg-[var(--hf-border)] rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-[var(--hf-ai-teal)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)] font-sans">Preparation suite</h3>
                    <p className="text-xs text-[var(--hf-text-secondary)]">Select a preparation module</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrepSheetOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg active:bg-[var(--hf-surface-secondary)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                  aria-label="Close Prep Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4 Prep Modules Grid */}
              <div className="grid grid-cols-1 gap-2.5 mb-3">
                {prepItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setIsPrepSheetOpen(false);
                        navigate(item.path);
                      }}
                      className={cn(
                        "w-full min-h-[52px] flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
                        isActive
                          ? "bg-[var(--hf-surface-secondary)] border-[var(--hf-cta)]/40 text-[var(--hf-cta)] font-medium shadow-xs"
                          : "bg-[var(--hf-surface)] hover:bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] text-[var(--hf-text)]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg flex items-center justify-center shrink-0 border border-[var(--hf-border)]",
                          isActive ? "bg-[var(--hf-cta)] text-white" : "bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)]"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-sans text-[var(--hf-text)]">{item.name}</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded text-[var(--hf-text-secondary)]">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--hf-text-secondary)] mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--hf-text-secondary)] shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Additional Overflow Action */}
              <div className="pt-2.5 border-t border-[var(--hf-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--hf-text-secondary)]">Looking for more modules?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrepSheetOpen(false);
                    onOpenOverflowDrawer();
                  }}
                  className="min-h-[44px] px-3 text-xs font-medium text-[var(--hf-cta)] hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                >
                  <span>All modules</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar (Strictly 4 Tabs max, visible only on < md / <768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-[100] md:hidden bg-[var(--hf-surface)] border-t border-[var(--hf-border)] shadow-xs safe-area-pb transition-colors"
      >
        <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
          {/* Tab 1: Dashboard */}
          <Link
            to="/dashboard"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
              isDashboardActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Dashboard"
            aria-current={isDashboardActive ? 'page' : undefined}
          >
            <div className="relative">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-sans">Dashboard</span>
          </Link>

          {/* Tab 2: Jobs */}
          <Link
            to="/finder"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
              isJobsActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Jobs"
            aria-current={isJobsActive ? 'page' : undefined}
          >
            <div className="relative">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-sans">Jobs</span>
          </Link>

          {/* Tab 3: Prep (Combines: Analyzer, Interview Lab, Learning Path, Resume Editor) */}
          <button
            type="button"
            onClick={() => setIsPrepSheetOpen(true)}
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
              isPrepActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Open Prep Tools (Resume Analyzer, Interview Lab, Learning Path, Editor)"
            aria-expanded={isPrepSheetOpen}
          >
            <div className="relative">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-sans">Prep</span>
          </button>

          {/* Tab 4: Profile */}
          <Link
            to="/profile"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
              isProfileActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Profile"
            aria-current={isProfileActive ? 'page' : undefined}
          >
            <div className="relative">
              <UserIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-sans">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
