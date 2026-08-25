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
import { useLanguage } from '../context/LanguageContext';

interface MobileBottomNavProps {
  onOpenOverflowDrawer: () => void;
}

export default function MobileBottomNav({ onOpenOverflowDrawer }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    },
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[140] md:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              aria-label="Interview & Prep Suite"
              className="fixed bottom-0 inset-x-0 bg-surface border-t border-border rounded-t-3xl p-5 z-[150] md:hidden shadow-2xl safe-area-pb"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-accent/10 border border-accent/20 rounded-xl text-accent">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink font-sans">Interview & Prep Suite</h3>
                    <p className="text-[11px] text-ink-dim font-mono">Select a preparation tool</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrepSheetOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-dim hover:text-ink rounded-xl active:bg-surface-light cursor-pointer"
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
                        "w-full min-h-[52px] flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]",
                        isActive
                          ? "bg-accent/10 border-accent text-accent shadow-sm"
                          : "bg-surface-light/60 hover:bg-surface-light border-border text-ink"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2.5 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-accent text-black font-bold" : "bg-surface text-ink-dim border border-border"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-sans text-ink">{item.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-surface border border-border rounded text-accent">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-ink-dim mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-dim shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Additional Overflow Action */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-sans text-ink-dim">Looking for more modules?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrepSheetOpen(false);
                    onOpenOverflowDrawer();
                  }}
                  className="min-h-[44px] px-3 text-xs font-mono font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>All Modules</span>
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
        className="fixed bottom-0 inset-x-0 z-[100] md:hidden bg-surface/95 backdrop-blur-xl border-t border-border shadow-2xl safe-area-pb"
      >
        <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
          {/* Tab 1: Dashboard */}
          <Link
            to="/dashboard"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer select-none",
              isDashboardActive ? "text-accent font-bold" : "text-ink-dim hover:text-ink"
            )}
            aria-label="Navigate to Dashboard"
            aria-current={isDashboardActive ? 'page' : undefined}
          >
            <div className="relative">
              <Home className={cn("w-5 h-5 transition-transform", isDashboardActive && "scale-110")} />
              {isDashboardActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-sans tracking-tight">Dashboard</span>
          </Link>

          {/* Tab 2: Jobs */}
          <Link
            to="/finder"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer select-none",
              isJobsActive ? "text-accent font-bold" : "text-ink-dim hover:text-ink"
            )}
            aria-label="Navigate to Jobs"
            aria-current={isJobsActive ? 'page' : undefined}
          >
            <div className="relative">
              <Briefcase className={cn("w-5 h-5 transition-transform", isJobsActive && "scale-110")} />
            </div>
            <span className="text-[10px] font-sans tracking-tight">Jobs</span>
          </Link>

          {/* Tab 3: Prep (Combines: Analyzer, Interview Lab, Learning Path, Resume Editor) */}
          <button
            type="button"
            onClick={() => setIsPrepSheetOpen(true)}
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer select-none relative",
              isPrepActive ? "text-accent font-bold" : "text-ink-dim hover:text-ink"
            )}
            aria-label="Open Prep Tools (Resume Analyzer, Interview Lab, Learning Path, Editor)"
            aria-expanded={isPrepSheetOpen}
          >
            <div className="relative">
              <div className={cn(
                "p-1 rounded-lg transition-colors",
                isPrepActive ? "bg-accent/20" : ""
              )}>
                <Sparkles className={cn("w-5 h-5 transition-transform", isPrepActive && "scale-110 text-accent")} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
            </div>
            <span className="text-[10px] font-sans tracking-tight">Prep</span>
          </button>

          {/* Tab 4: Profile */}
          <Link
            to="/profile"
            className={cn(
              "min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer select-none",
              isProfileActive ? "text-accent font-bold" : "text-ink-dim hover:text-ink"
            )}
            aria-label="Navigate to Profile"
            aria-current={isProfileActive ? 'page' : undefined}
          >
            <div className="relative">
              <UserIcon className={cn("w-5 h-5 transition-transform", isProfileActive && "scale-110")} />
            </div>
            <span className="text-[10px] font-sans tracking-tight">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
