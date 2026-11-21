import { Link, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PlanBadge from './PlanBadge';
import HireFlowLogo from './HireFlowLogo';
import { ScrollProgressBar } from './AnimatedPrimitives';
import { PUBLIC_SEO_ROUTES } from './Layout';
import { useTheme } from '../context/ThemeContext';
import { prefetchRoute } from '../lib/routePrefetch';

const HeaderQuickSearch = lazy(() => import('./HeaderQuickSearch'));
const MobileBottomNav = lazy(() => import('./MobileBottomNav'));
import { 
  BarChart3, 
  Briefcase, 
  User as UserIcon, 
  LogOut, 
  CreditCard,
  LayoutDashboard,
  Search,
  FileEdit,
  Menu,
  X,
  GraduationCap,
  Mic,
  Award,
  MessageCircle,
  Sun,
  Moon,
  ArrowRight
} from 'lucide-react';

import { usePlan } from '../context/PlanContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { plan, creditWallet } = usePlan();
  const { openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const isPublicRoute = PUBLIC_SEO_ROUTES.includes(location.pathname);

  const handleSignOut = () => signOut(auth);

  const handleOpenSignIn = () => {
    openAuthModal('unlock 150 daily AI credits & cloud sync');
  };

  const publicNavLinks = [
    { name: 'Resume Analyzer', path: '/resume-analyzer' },
    { name: 'Resume Editor', path: '/resume-editor' },
    { name: 'Job Finder', path: '/job-finder' },
    { name: 'Job Tracker', path: '/job-tracker' },
    { name: 'Interview Prep', path: '/interview-lab' },
    { name: 'Career Path', path: '/career-advisor' },
  ];

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Resume Tools',
      items: [
        { name: 'Resume Analyzer', path: '/analyzer', icon: BarChart3 },
        { name: 'Resume Editor', path: '/editor', icon: FileEdit },
      ]
    },
    {
      label: 'Opportunities',
      items: [
        { name: 'Job Finder', path: '/finder', icon: Search },
        { name: 'Job Tracker', path: '/jobs', icon: Briefcase },
        { name: 'Outreach Hub', path: '/outreach', icon: MessageCircle },
      ]
    },
    {
      label: 'Preparation',
      items: [
        { name: 'Interview Lab', path: '/interview', icon: Mic },
        { name: 'Learning Path', path: '/learning', icon: GraduationCap },
        { name: 'Campus Prep', path: '/campus', icon: Award },
      ]
    },
    {
      label: 'Account',
      items: [
        { name: 'Billing & Credits', path: '/credits', icon: CreditCard },
        { name: 'Profile', path: '/profile', icon: UserIcon },
      ]
    }
  ];

  const getPlanLabel = (p: string) => {
    switch (p) {
      case 'admin': return 'Admin Account';
      case 'premium': return 'Premium Plan';
      case 'pro':
      case 'standard': return 'Pro Plan';
      default: return 'Free Plan';
    }
  };

  useEffect(() => {
    setIsDrawerOpen(false);
    setIsPublicMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav
        aria-label="Main Navigation"
        className="fixed top-0 left-0 right-0 z-[100] bg-[var(--hf-bg)] border-b-[1.5px] border-[var(--hf-ink-border)] transition-colors"
      >
        <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", isPublicRoute ? "max-w-7xl" : "max-w-full")}>
          <div className="flex justify-between h-16 items-center gap-4">
            {/* Left: Menu Trigger + Editorial Masthead Brand */}
            <div className="flex items-center gap-3">
              {!isPublicRoute && (
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center -ml-1.5 text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded border border-[var(--hf-ink-border)] transition-colors lg:hidden cursor-pointer"
                  aria-label="Open navigation menu"
                  aria-expanded={isDrawerOpen}
                  aria-controls="mobile-navigation-drawer"
                >
                  <Menu className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              {isPublicRoute && (
                <button
                  onClick={() => setIsPublicMenuOpen((prev) => !prev)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center -ml-1.5 text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded border border-[var(--hf-ink-border)] transition-colors lg:hidden cursor-pointer"
                  aria-label="Toggle menu"
                  aria-expanded={isPublicMenuOpen}
                >
                  {isPublicMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              )}
              <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group py-1" aria-label="AI HireFlow Home">
                <HireFlowLogo className="w-7 h-7 shrink-0" />
                <span className="font-serif-display font-semibold text-lg tracking-tight text-[var(--hf-text)]">
                  AI HireFlow
                </span>
              </Link>
            </div>

            {/* Center: Clean Public Navigation Links */}
            {isPublicRoute && (
              <div
                className="hidden lg:flex items-center gap-1"
                onMouseLeave={() => setHoveredNav(null)}
              >
                {publicNavLinks.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isHighlighted = hoveredNav ? hoveredNav === item.path : isActive;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onMouseEnter={() => {
                        setHoveredNav(item.path);
                        prefetchRoute(item.path);
                      }}
                      onFocus={() => prefetchRoute(item.path)}
                      className={cn(
                        "relative px-3 py-1.5 rounded-sm font-sans text-[13px] font-medium transition-colors z-10",
                        isActive
                          ? "text-[var(--hf-text)] font-semibold"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                      )}
                    >
                      {isHighlighted && (
                        <motion.span
                          layoutId="public-nav-pill"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="absolute inset-0 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] -z-10"
                        />
                      )}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right: Search, Theme, Account / Enter CTA */}
            <div className="flex items-center gap-2.5">
              {!isPublicRoute && (
                <Suspense fallback={null}>
                  <HeaderQuickSearch />
                </Suspense>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={toggleTheme}
                className="min-h-[36px] min-w-[36px] p-1.5 bg-[var(--hf-surface)] text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-sm border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] transition-colors flex items-center justify-center cursor-pointer overflow-hidden"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {theme === 'dark' ? (
                    <motion.span
                      key="theme-sun"
                      initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-center"
                    >
                      <Sun className="w-4 h-4 text-amber-400" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="theme-moon"
                      initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-center"
                    >
                      <Moon className="w-4 h-4 text-[var(--hf-text)]" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {user ? (
                <div className="flex items-center gap-2">
                  {!isPublicRoute && (
                    <div className="hidden sm:block">
                      <PlanBadge />
                    </div>
                  )}
                  {isPublicRoute && (
                    <Link
                      to="/dashboard"
                      onMouseEnter={() => prefetchRoute('/dashboard')}
                      onFocus={() => prefetchRoute('/dashboard')}
                      className="hf-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs gap-1.5"
                    >
                      <span>Open workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="min-h-[36px] min-w-[36px] p-1.5 bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] hover:bg-[var(--hf-surface-secondary)] rounded-sm border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] transition-all flex items-center justify-center cursor-pointer"
                    aria-label="Sign out of account"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : isPublicRoute ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSignIn}
                    className="hidden sm:inline-flex min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-sm transition-colors cursor-pointer items-center"
                    aria-label="Sign in to existing account"
                  >
                    Sign in
                  </button>
                  <Link
                    to="/dashboard"
                    onMouseEnter={() => prefetchRoute('/dashboard')}
                    onFocus={() => prefetchRoute('/dashboard')}
                    className="hf-btn-primary min-h-[38px] px-4 py-1.5 text-xs gap-1.5"
                    aria-label="Explore AI HireFlow workspace"
                  >
                    <span>Explore app</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--hf-text-secondary)]">
                    Guest Preview
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenSignIn}
                    className="hf-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs gap-1.5 cursor-pointer"
                    aria-label="Sign in with Google"
                  >
                    <span>Sign in</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Public Mobile Dropdown Menu */}
        <AnimatePresence>
          {isPublicRoute && isPublicMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-bg)] px-4 py-3 space-y-1.5 overflow-hidden"
            >
              {publicNavLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "block px-3 py-2 rounded-sm font-sans text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)]"
                      : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Scroll reading progress bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <ScrollProgressBar />
        </div>
      </nav>

      {/* Desktop Persistent Dossier Index Sidebar (Workspace Routes — Open in Guest Preview too) */}
      {!isPublicRoute && (
        <aside
          aria-label="Sidebar Navigation"
          className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-40 lg:border-r-[1.5px] lg:border-[var(--hf-ink-border)] lg:bg-[var(--hf-bg)] transition-colors"
        >
          <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="px-2.5 mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--hf-text-muted)]">
                    {group.label}
                  </span>
                </div>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path === '/jobs' && location.pathname === '/tracker') || (item.path === '/learning' && location.pathname === '/roadmap');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onFocus={() => prefetchRoute(item.path)}
                      className={cn(
                        "relative flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-colors z-10",
                        isActive
                          ? "text-[var(--hf-text)] font-bold"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/70"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                          className="absolute inset-0 rounded-sm bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] -z-10"
                        />
                      )}
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[var(--hf-cta)]" : "text-[var(--hf-text-muted)]"
                      )} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Bottom Ledger Card */}
          <div className="p-3 border-t-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface-secondary)]/50 mt-auto space-y-2">
            {user ? (
              <>
                {creditWallet && (
                  <Link
                    to="/credits"
                    onMouseEnter={() => prefetchRoute('/credits')}
                    onFocus={() => prefetchRoute('/credits')}
                    className="px-3 py-2 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] flex items-center justify-between text-xs transition-transform hover:-translate-y-0.5"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-secondary)]">CREDITS</span>
                    <span className="font-mono font-bold text-[var(--hf-cta)] tabular-nums">
                      {creditWallet.balance.toLocaleString()} CR
                    </span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  onMouseEnter={() => prefetchRoute('/profile')}
                  onFocus={() => prefetchRoute('/profile')}
                  className="p-2 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] hover:bg-[var(--hf-surface-secondary)] transition-colors flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-sm bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] border border-[var(--hf-ink-border)] flex items-center justify-center shrink-0 font-mono text-xs font-bold overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--hf-text)] truncate">{user?.displayName || 'CANDIDATE'}</p>
                    <p className="font-mono text-[10px] text-[var(--hf-cta)] font-semibold truncate">{getPlanLabel(plan)}</p>
                  </div>
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenSignIn}
                className="w-full p-2.5 rounded-sm bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] hover:-translate-y-0.5 transition-all text-left space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--hf-cta)]">
                    Guest Preview
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--hf-text)]" />
                </div>
                <p className="text-[11px] font-semibold text-[var(--hf-text)] leading-snug">
                  Sign in for 150 free daily credits
                </p>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Side Drawer Overlay (Mobile / Tablet below lg, Workspace Routes) */}
      <AnimatePresence>
        {isDrawerOpen && !isPublicRoute && (
          <div className="lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-[110]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              id="mobile-navigation-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              className="fixed top-0 left-0 bottom-0 w-72 bg-[var(--hf-bg)] border-r-[1.5px] border-[var(--hf-ink-border)] z-[120] flex flex-col pt-16 shadow-xl"
            >
              <div className="absolute top-3.5 right-3.5">
                <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="min-h-[36px] min-w-[36px] p-1.5 flex items-center justify-center text-[var(--hf-text)] bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm cursor-pointer"
                   aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="px-4 pb-3 border-b-[1.5px] border-[var(--hf-ink-border)]">
                <div className="flex items-center gap-2">
                  <HireFlowLogo className="w-6 h-6" />
                  <span className="font-serif-display font-semibold text-base text-[var(--hf-text)]">AI HireFlow</span>
                </div>
              </div>

              <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <div className="px-2.5 mb-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--hf-text-muted)]">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-colors",
                            isActive
                              ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-bold border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)]"
                              : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]"
                          )}
                        >
                          <item.icon className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive ? "text-[var(--hf-cta)]" : "text-[var(--hf-text-muted)]"
                          )} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="p-3 border-t-[1.5px] border-[var(--hf-ink-border)] mt-auto bg-[var(--hf-surface-secondary)]">
                {user ? (
                  <div className="p-2 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-sm bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                      {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--hf-text)] truncate">{user?.displayName || 'CANDIDATE'}</p>
                      <p className="font-mono text-[10px] text-[var(--hf-cta)] font-semibold truncate">{getPlanLabel(plan)}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      handleOpenSignIn();
                    }}
                    className="hf-btn-primary w-full min-h-[42px] text-xs gap-1.5 cursor-pointer"
                  >
                    <span>Sign in · 150 free credits</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar (< 768px / mobile, on workspace routes) */}
      {!isPublicRoute && (
        <Suspense fallback={null}>
          <MobileBottomNav onOpenOverflowDrawer={() => setIsDrawerOpen(true)} />
        </Suspense>
      )}
    </>
  );
}
