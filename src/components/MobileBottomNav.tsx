import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Layers, 
  User as UserIcon, 
  BarChart3, 
  Mic, 
  GraduationCap, 
  FileEdit,
  X,
  ChevronRight
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

  useEffect(() => {
    setIsPrepSheetOpen(false);
  }, [location.pathname]);

  const prepItems = [
    { 
      name: 'Resume Analyzer', 
      desc: 'ATS compatibility & keyword gap diagnostic',
      path: '/analyzer', 
      icon: BarChart3,
      badge: 'Audit'
    },
    { 
      name: 'Interview Lab', 
      desc: 'Technical & behavioral mock drills',
      path: '/interview', 
      icon: Mic,
      badge: 'Practice'
    },
    { 
      name: 'Learning Path', 
      desc: 'Role curriculum & skill gap milestones',
      path: '/learning', 
      icon: GraduationCap,
      badge: 'Roadmap'
    },
    { 
      name: 'Resume Editor', 
      desc: 'Single-column builder & bullet rewrites',
      path: '/editor', 
      icon: FileEdit,
      badge: 'Builder'
    }
  ];

  const isPrepActive = prepItems.some(item => location.pathname === item.path);
  const isJobsActive = location.pathname === '/finder' || location.pathname === '/jobs' || location.pathname === '/campus';
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isProfileActive = location.pathname === '/profile';

  return (
    <>
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
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              aria-label="Preparation Tools"
              className="fixed bottom-0 inset-x-0 bg-[var(--hf-surface)] border-t border-[var(--hf-border)] rounded-t-2xl p-5 z-[150] md:hidden shadow-xl safe-area-pb"
            >
              <div className="w-10 h-1 bg-[var(--hf-border)] rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-[var(--hf-text)] font-sans">Preparation Suite</h3>
                  <p className="text-xs text-[var(--hf-text-secondary)]">Select a tool to continue</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrepSheetOpen(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg active:bg-[var(--hf-surface-secondary)] cursor-pointer"
                  aria-label="Close Prep Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                        "w-full min-h-[52px] flex items-center justify-between p-3.5 rounded-xl border transition-colors text-left cursor-pointer",
                        isActive
                          ? "bg-[var(--hf-surface-secondary)] border-[var(--hf-cta)]/40 text-[var(--hf-cta)] font-medium"
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

              <div className="pt-2.5 border-t border-[var(--hf-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--hf-text-secondary)]">Need outreach or campus tools?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrepSheetOpen(false);
                    onOpenOverflowDrawer();
                  }}
                  className="min-h-[40px] px-3 text-xs font-medium text-[var(--hf-cta)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>All tools</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-[100] md:hidden bg-[var(--hf-surface)] border-t border-[var(--hf-border)] safe-area-pb transition-colors"
      >
        <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
          <Link
            to="/dashboard"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none",
              isDashboardActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Dashboard"
            aria-current={isDashboardActive ? 'page' : undefined}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[11px] font-sans">Home</span>
          </Link>

          <Link
            to="/finder"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none",
              isJobsActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Jobs"
            aria-current={isJobsActive ? 'page' : undefined}
          >
            <Briefcase className="w-4 h-4" />
            <span className="text-[11px] font-sans">Jobs</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsPrepSheetOpen(true)}
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none",
              isPrepActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Open Preparation Suite"
            aria-expanded={isPrepSheetOpen}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[11px] font-sans">Tools</span>
          </button>

          <Link
            to="/profile"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer select-none",
              isProfileActive ? "text-[var(--hf-cta)] font-semibold" : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
            )}
            aria-label="Navigate to Profile"
            aria-current={isProfileActive ? 'page' : undefined}
          >
            <UserIcon className="w-4 h-4" />
            <span className="text-[11px] font-sans">Account</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
