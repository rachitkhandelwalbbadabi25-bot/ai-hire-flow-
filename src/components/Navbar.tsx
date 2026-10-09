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
  Sparkles,
  LayoutDashboard,
  Search,
  FileEdit,
  Menu,
  X,
  Home,
  GraduationCap,
  Mic,
  Award,
  MessageCircle,
  Sun,
  Moon
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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Job finder', path: '/finder', icon: Search },
    { name: 'Campus prep', path: '/campus', icon: Award },
    { name: 'Outreach & alerts', path: '/outreach', icon: MessageCircle },
    { name: 'Resume analyzer', path: '/analyzer', icon: BarChart3 },
    { name: 'Interview lab', path: '/interview', icon: Mic },
    { name: 'Learning path', path: '/learning', icon: GraduationCap },
    { name: 'Resume editor', path: '/editor', icon: FileEdit },
    { name: 'Job tracker', path: '/jobs', icon: Briefcase },
    { name: 'Credit wallet', path: '/credits', icon: Sparkles },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  const getPlanLabel = (p: string) => {
    switch (p) {
      case 'admin': return 'System admin';
      case 'premium': return 'Premium';
      case 'pro':
      case 'standard': return 'Pro';
      default: return 'Free';
    }
  };

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav aria-label="Main Navigation" className="fixed top-0 left-0 right-0 z-[100] bg-[var(--hf-surface)] border-b border-[var(--hf-border)] shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              {user && !isPublicRoute && (
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors lg:hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                  aria-label="Open navigation menu"
                  aria-expanded={isDrawerOpen}
                  aria-controls="mobile-navigation-drawer"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
              <Link to={user ? "/dashboard" : "/"} className="min-h-[44px] flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded-lg" aria-label="AI HireFlow Home">
                <HireFlowLogo className="w-8 h-8 shrink-0 transition-transform group-hover:scale-105" />
                <div className="flex flex-col leading-tight">
                  <span className="font-sans font-bold text-base tracking-tight text-[var(--hf-text)]">
                    AI HireFlow
                  </span>
                  <span className="text-[11px] font-normal text-[var(--hf-text-secondary)]">
                    Career platform
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {user && !isPublicRoute && <HeaderQuickSearch />}

              {/* Dev Only Theme Toggle Preview */}
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="min-h-[44px] min-w-[44px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (Preview)`}
                  title={`Toggle theme (${theme})`}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                   {!isPublicRoute && (
                     <div className="hidden sm:block">
                        <PlanBadge />
                     </div>
                   )}
                   {isPublicRoute && (
                     <Link
                       to="/dashboard"
                       className="hf-btn-primary min-h-[40px] px-3.5 py-1.5 text-xs gap-1.5"
                     >
                       <LayoutDashboard className="w-3.5 h-3.5" />
                       <span>Dashboard</span>
                     </Link>
                   )}
                   <button
                    onClick={handleSignOut}
                    className="min-h-[44px] min-w-[44px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                    aria-label="Sign out of account"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="hf-btn-primary min-h-[44px] px-4 py-2 text-sm font-medium disabled:opacity-60"
                  aria-label="Get Started with Google Sign In"
                >
                  {isSigningIn ? 'Signing in...' : 'Get started'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Persistent Sidebar Rail (Only on authenticated app routes) */}
      {user && !isPublicRoute && (
        <aside aria-label="Sidebar Navigation" className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-40 lg:border-r lg:border-[var(--hf-border)] lg:bg-[var(--hf-surface)] transition-colors">
          <div className="px-5 py-4 border-b border-[var(--hf-border)]">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
              <span className="text-[11px] font-medium text-[var(--hf-text-secondary)]">Workspace</span>
            </div>
            <h2 className="text-xs font-semibold text-[var(--hf-text)]">Navigation modules</h2>
          </div>

          <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
                    isActive
                      ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] font-semibold border border-[var(--hf-border)] shadow-xs"
                      : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/60"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-[var(--hf-cta)]" : "text-[var(--hf-text-secondary)]"
                  )} />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-3.5 border-t border-[var(--hf-border)] bg-[var(--hf-surface-secondary)]/40 mt-auto">
            <div className="bg-[var(--hf-surface)] p-3 rounded-lg border border-[var(--hf-border)] flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0 text-[var(--hf-cta)]">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--hf-text)] truncate">{user?.displayName || 'User'}</p>
                <p className="text-[11px] text-[var(--hf-cta)] font-medium truncate">{getPlanLabel(plan)}</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Side Drawer Overlay (Mobile / Tablet below lg, only on authenticated app routes) */}
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
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              id="mobile-navigation-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              className="fixed top-0 left-0 bottom-0 w-80 bg-[var(--hf-surface)] border-r border-[var(--hf-border)] z-[120] flex flex-col pt-16 shadow-xl"
            >
              <div className="absolute top-4 right-4">
                <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                   aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 mb-3">
                 <div className="flex items-center gap-3">
                    <HireFlowLogo className="w-7 h-7" />
                    <div>
                      <h2 className="text-sm font-bold text-[var(--hf-text)]">AI HireFlow</h2>
                      <span className="text-[11px] font-normal text-[var(--hf-text-secondary)]">Career platform</span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]",
                      location.pathname === item.path
                        ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] font-semibold border border-[var(--hf-border)]"
                        : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)]/60"
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      location.pathname === item.path ? "text-[var(--hf-cta)]" : "text-[var(--hf-text-secondary)]"
                    )} />
                    <span className="text-xs">{item.name}</span>
                  </Link>
                ))}
              </div>

              <div className="p-4 border-t border-[var(--hf-border)] mt-auto bg-[var(--hf-surface-secondary)]/40">
                 <div className="bg-[var(--hf-surface)] p-3 rounded-lg border border-[var(--hf-border)] flex items-center gap-3 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0 text-[var(--hf-cta)]">
                       <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <p className="text-xs font-semibold text-[var(--hf-text)] truncate">{user?.displayName || 'User'}</p>
                       <p className="text-[11px] text-[var(--hf-cta)] font-medium truncate">{getPlanLabel(plan)}</p>
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
