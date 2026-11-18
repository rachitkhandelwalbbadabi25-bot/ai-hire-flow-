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
  const { plan } = usePlan();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

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
    { name: 'Resume Analyzer', path: '/resume-analyzer' },
    { name: 'Resume Editor', path: '/resume-editor' },
    { name: 'Job Search', path: '/job-finder' },
    { name: 'Job Tracker', path: '/job-tracker' },
    { name: 'Interview Lab', path: '/interview-lab' },
    { name: 'Career Roadmap', path: '/career-advisor' },
  ];

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Documents & Audit',
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
      case 'admin': return 'Administrator';
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
      <nav aria-label="Main Navigation" className="fixed top-0 left-0 right-0 z-[100] bg-[var(--hf-surface)]/95 backdrop-blur-xs border-b border-[var(--hf-border)] transition-colors">
        <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", isPublicRoute ? "max-w-7xl" : "max-w-full")}>
          <div className="flex justify-between h-16 items-center gap-4">
            {/* Left: Menu Trigger + Brand */}
            <div className="flex items-center gap-3">
              {user && !isPublicRoute && (
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center -ml-1.5 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors lg:hidden cursor-pointer"
                  aria-label="Open navigation menu"
                  aria-expanded={isDrawerOpen}
                  aria-controls="mobile-navigation-drawer"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
              {isPublicRoute && (
                <button
                  onClick={() => setIsPublicMenuOpen((prev) => !prev)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center -ml-1.5 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors lg:hidden cursor-pointer"
                  aria-label="Toggle menu"
                  aria-expanded={isPublicMenuOpen}
                >
                  {isPublicMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
              <Link to={user && !isPublicRoute ? "/dashboard" : "/"} className="flex items-center gap-2.5 group rounded-lg py-1" aria-label="AI HireFlow Home">
                <HireFlowLogo className="w-7 h-7 shrink-0" />
                <div className="flex items-baseline gap-2">
                  <span className="font-sans font-semibold text-base tracking-tight text-[var(--hf-text)]">
                    HireFlow
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-medium text-[var(--hf-text-muted)] border-l border-[var(--hf-border)] pl-2">
                    Career Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Public Navigation Links */}
            {isPublicRoute && (
              <div className="hidden lg:flex items-center gap-1">
                {publicNavLinks.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                        isActive
                          ? "text-[var(--hf-text)] bg-[var(--hf-surface-secondary)] font-semibold"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/60"
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right: Search, Theme, Account / Auth CTA */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {user && !isPublicRoute && <HeaderQuickSearch />}

              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[38px] min-w-[38px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg border border-transparent hover:border-[var(--hf-border)] transition-colors flex items-center justify-center cursor-pointer"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
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
                      className="hf-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs gap-1.5"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="min-h-[38px] min-w-[38px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Sign out of account"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="hf-btn-primary min-h-[38px] px-4 py-1.5 text-xs font-medium gap-1.5 disabled:opacity-60"
                    aria-label="Get Started with Google Sign In"
                  >
                    <span>{isSigningIn ? 'Signing in...' : 'Get started'}</span>
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
              className="lg:hidden border-t border-[var(--hf-border)] bg-[var(--hf-surface)] px-4 py-3 space-y-1 overflow-hidden"
            >
              {publicNavLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] font-semibold"
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

      {/* Desktop Persistent Sidebar Rail (Authenticated App Routes) */}
      {user && !isPublicRoute && (
        <aside aria-label="Sidebar Navigation" className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-40 lg:border-r lg:border-[var(--hf-border)] lg:bg-[var(--hf-surface)] transition-colors">
          <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-3 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">
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
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        isActive
                          ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] font-semibold border border-[var(--hf-border)]"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/60 border border-transparent"
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

          <div className="p-3 border-t border-[var(--hf-border)] bg-[var(--hf-surface-secondary)]/30 mt-auto">
            <Link
              to="/profile"
              className="p-2.5 rounded-lg hover:bg-[var(--hf-surface-secondary)] transition-colors flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0 text-xs font-semibold text-[var(--hf-text)] overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--hf-text)] truncate">{user?.displayName || 'Account'}</p>
                <p className="text-[11px] text-[var(--hf-text-muted)] truncate">{getPlanLabel(plan)}</p>
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
              className="fixed top-0 left-0 bottom-0 w-72 bg-[var(--hf-surface)] border-r border-[var(--hf-border)] z-[120] flex flex-col pt-16 shadow-xl"
            >
              <div className="absolute top-3.5 right-3.5">
                <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="min-h-[40px] min-w-[40px] p-2 flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors cursor-pointer"
                   aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="px-4 pb-3 border-b border-[var(--hf-border)]">
                <div className="flex items-center gap-2.5">
                  <HireFlowLogo className="w-6 h-6" />
                  <span className="text-sm font-semibold text-[var(--hf-text)]">HireFlow</span>
                </div>
              </div>

              <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="px-3 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">
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
                            "min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                            isActive
                              ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] font-semibold border border-[var(--hf-border)]"
                              : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/60 border border-transparent"
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

              <div className="p-3 border-t border-[var(--hf-border)] mt-auto bg-[var(--hf-surface-secondary)]/30">
                <div className="p-2.5 rounded-lg flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0 text-xs font-semibold text-[var(--hf-text)]">
                    {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--hf-text)] truncate">{user?.displayName || 'Account'}</p>
                    <p className="text-[11px] text-[var(--hf-text-muted)] truncate">{getPlanLabel(plan)}</p>
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
