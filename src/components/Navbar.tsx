import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PlanBadge from './PlanBadge';
import HeaderQuickSearch from './HeaderQuickSearch';
import MobileBottomNav from './MobileBottomNav';
import HireFlowLogo from './HireFlowLogo';
import { PUBLIC_SEO_ROUTES } from './Layout';
import { useTheme } from '../context/ThemeContext';
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

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { plan, creditWallet } = usePlan();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const isPublicRoute = PUBLIC_SEO_ROUTES.includes(location.pathname);

  const handleSignOut = () => signOut(auth);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/cancelled-popup-request' && err?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', err);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const publicNavLinks = [
    { name: '01. AUDIT', path: '/resume-analyzer' },
    { name: '02. EDITOR', path: '/resume-editor' },
    { name: '03. JOB INDEX', path: '/job-finder' },
    { name: '04. TRACKER', path: '/job-tracker' },
    { name: '05. INTERVIEW', path: '/interview-lab' },
    { name: '06. ROADMAP', path: '/career-advisor' },
  ];

  const navGroups = [
    {
      label: '01 // OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: '02 // DOCUMENTS',
      items: [
        { name: 'Resume Analyzer', path: '/analyzer', icon: BarChart3 },
        { name: 'Resume Editor', path: '/editor', icon: FileEdit },
      ]
    },
    {
      label: '03 // OPPORTUNITIES',
      items: [
        { name: 'Job Finder', path: '/finder', icon: Search },
        { name: 'Job Tracker', path: '/jobs', icon: Briefcase },
        { name: 'Outreach Hub', path: '/outreach', icon: MessageCircle },
      ]
    },
    {
      label: '04 // PREPARATION',
      items: [
        { name: 'Interview Lab', path: '/interview', icon: Mic },
        { name: 'Learning Path', path: '/learning', icon: GraduationCap },
        { name: 'Campus Prep', path: '/campus', icon: Award },
      ]
    },
    {
      label: '05 // ACCOUNT',
      items: [
        { name: 'Billing & Credits', path: '/credits', icon: CreditCard },
        { name: 'Profile', path: '/profile', icon: UserIcon },
      ]
    }
  ];

  const getPlanLabel = (p: string) => {
    switch (p) {
      case 'admin': return 'ADMIN // MASTER';
      case 'premium': return 'TIER // PREMIUM';
      case 'pro':
      case 'standard': return 'TIER // PRO';
      default: return 'TIER // FREE';
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
              {user && !isPublicRoute && (
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
              <Link to={user && !isPublicRoute ? "/dashboard" : "/"} className="flex items-center gap-2.5 group py-1" aria-label="AI HireFlow Home">
                <HireFlowLogo className="w-7 h-7 shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="font-serif-display font-bold text-base sm:text-lg tracking-tight text-[var(--hf-text)]">
                    HIREFLOW // DOSSIER
                  </span>
                  <span className="hidden md:inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] text-[var(--hf-text)]">
                    VOL. 2026
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Numbered Monospace Index Links (Public Routes) */}
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
                      onMouseEnter={() => setHoveredNav(item.path)}
                      className={cn(
                        "relative px-2.5 py-1.5 rounded-sm font-mono text-[11px] font-semibold tracking-wide transition-colors z-10",
                        isActive
                          ? "text-[var(--hf-text)] font-bold"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                      )}
                    >
                      {isHighlighted && (
                        <motion.span
                          layoutId="public-nav-pill"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="absolute inset-0 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] -z-10"
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
              {user && !isPublicRoute && <HeaderQuickSearch />}

              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[36px] min-w-[36px] p-1.5 bg-[var(--hf-surface)] text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-sm border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] transition-all flex items-center justify-center cursor-pointer"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--hf-text)]" />
                )}
              </button>

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
                      className="hf-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs gap-1.5"
                    >
                      <span>ENTER WORKSPACE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="min-h-[36px] min-w-[36px] p-1.5 bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] hover:bg-[var(--hf-surface-secondary)] rounded-sm border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] transition-all flex items-center justify-center cursor-pointer"
                    aria-label="Sign out of account"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="hf-btn-primary min-h-[38px] px-4 py-1.5 text-xs gap-1.5 disabled:opacity-60"
                  aria-label="Enter Dossier with Google Sign In"
                >
                  <span>{isSigningIn ? 'AUTHENTICATING...' : 'ENTER →'}</span>
                </button>
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
                    "block px-3 py-2 rounded-sm font-mono text-xs font-semibold transition-colors",
                    location.pathname === item.path
                      ? "bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)]"
                      : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Desktop Persistent Dossier Index Sidebar (Authenticated App Routes) */}
      {user && !isPublicRoute && (
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
                          className="absolute inset-0 rounded-sm bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] -z-10"
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
            {creditWallet && (
              <Link
                to="/credits"
                className="px-3 py-2 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] flex items-center justify-between text-xs transition-transform hover:-translate-y-0.5"
              >
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-secondary)]">CREDITS</span>
                <span className="font-mono font-bold text-[var(--hf-cta)] tabular-nums">
                  {creditWallet.balance.toLocaleString()} CR
                </span>
              </Link>
            )}
            <Link
              to="/profile"
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
          </div>
        </aside>
      )}

      {/* Side Drawer Overlay (Mobile / Tablet below lg, Authenticated App Routes) */}
      <AnimatePresence>
        {isDrawerOpen && user && !isPublicRoute && (
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
                  <span className="font-serif-display font-bold text-sm text-[var(--hf-text)]">HIREFLOW // DOSSIER</span>
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
                              ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-bold border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)]"
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
                <div className="p-2 rounded-sm bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-sm bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--hf-text)] truncate">{user?.displayName || 'CANDIDATE'}</p>
                    <p className="font-mono text-[10px] text-[var(--hf-cta)] font-semibold truncate">{getPlanLabel(plan)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar (< 768px / mobile, only on authenticated app routes) */}
      {user && !isPublicRoute && <MobileBottomNav onOpenOverflowDrawer={() => setIsDrawerOpen(true)} />}
    </>
  );
}
