import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PlanBadge from './PlanBadge';
import AIProviderSelector from './AIProviderSelector';
import HeaderQuickSearch from './HeaderQuickSearch';
import MobileBottomNav from './MobileBottomNav';
import { useLanguage } from '../context/LanguageContext';
import { PUBLIC_SEO_ROUTES } from './Layout';
import { 
  BarChart3, 
  FileSearch, 
  Briefcase, 
  User as UserIcon, 
  LogOut, 
  Sparkles,
  LayoutDashboard,
  Search,
  MessageSquare,
  BookOpen,
  FileEdit,
  Menu,
  X,
  Home,
  GraduationCap,
  Mic,
  Globe,
  Award,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

import { usePlan } from '../context/PlanContext';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { plan } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isPublicRoute = PUBLIC_SEO_ROUTES.includes(location.pathname);

  const handleSignOut = () => signOut(auth);

  const handleSignIn = async () => {
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  const navItems = [
    { name: t('dashboard'), path: '/dashboard', icon: Home },
    { name: t('jobFinder'), path: '/finder', icon: Search },
    { name: t('campusPlacement'), path: '/campus', icon: Award },
    { name: t('outreach'), path: '/outreach', icon: MessageCircle },
    { name: t('analyzer'), path: '/analyzer', icon: BarChart3 },
    { name: t('interviewLab'), path: '/interview', icon: Mic },
    { name: t('learningPath'), path: '/learning', icon: GraduationCap },
    { name: t('resumeEditor'), path: '/editor', icon: FileEdit },
    { name: t('jobTracker'), path: '/jobs', icon: Briefcase },
    { name: 'AI Credit Wallet', path: '/credits', icon: Sparkles },
    { name: t('profile'), path: '/profile', icon: UserIcon },
  ];

  const getPlanLabel = (p: string) => {
    switch (p) {
      case 'admin': return 'System Admin';
      case 'premium': return 'Premium Pro';
      case 'standard': return 'Standard Tier';
      default: return 'Free Tier';
    }
  };

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav aria-label="Main Navigation" className="fixed top-0 left-0 right-0 z-[100] bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              {user && !isPublicRoute && (
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all lg:hidden cursor-pointer"
                  aria-label="Open navigation menu"
                  aria-expanded={isDrawerOpen}
                  aria-controls="mobile-navigation-drawer"
                >
                  <Menu className="w-6 h-6" aria-hidden="true" />
                </button>
              )}
              <Link to={user ? "/dashboard" : "/"} className="min-h-[44px] flex items-center gap-2.5 group" aria-label="AI HireFlow Home">
                <div className="bg-accent p-2 rounded-xl flex items-center justify-center shadow-lg shadow-accent/25 transition-transform group-hover:scale-105" aria-hidden="true">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-sans font-black text-lg tracking-tight text-ink leading-none">
                    AI HireFlow
                  </span>
                  <span className="text-[9px] font-bold text-accent uppercase tracking-wider mt-0.5 font-mono">
                    Career Hub
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {user && !isPublicRoute && <HeaderQuickSearch />}
              {user ? (
                <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
                   {!isPublicRoute && <AIProviderSelector />}
                   {!isPublicRoute && (
                     <div className="hidden sm:block">
                        <PlanBadge />
                     </div>
                   )}
                   {isPublicRoute && (
                     <Link
                       to="/dashboard"
                       className="min-h-[40px] bg-accent text-black px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-accent/20 flex items-center gap-1.5"
                     >
                       <LayoutDashboard className="w-3.5 h-3.5" />
                       <span>Dashboard</span>
                     </Link>
                   )}
                   <button
                    onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                    className="min-h-[44px] min-w-[44px] p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    aria-label={language === 'en' ? 'Switch interface to Hindi' : 'Switch interface to English'}
                    title={language === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
                  >
                    <Globe className="w-5 h-5" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase hidden md:inline">{language === 'en' ? 'EN' : 'HI'}</span>
                  </button>
                   <button
                    onClick={handleSignOut}
                    className="min-h-[44px] min-w-[44px] p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all flex items-center justify-center cursor-pointer"
                    aria-label="Sign out of account"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="min-h-[44px] bg-accent text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20 cursor-pointer flex items-center justify-center"
                  aria-label="Get Started with Google Sign In"
                >
                  {t('getStarted')}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Persistent Sidebar Rail (Only on authenticated app routes) */}
      {user && !isPublicRoute && (
        <aside aria-label="Sidebar Navigation" className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-40 lg:border-r lg:border-border lg:bg-surface/90 lg:backdrop-blur-xl">
          <div className="px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Navigation</span>
            </div>
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Main Modules</h2>
          </div>

          <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/20 shadow-sm"
                      : "text-ink-dim hover:text-ink hover:bg-surface-light"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 transition-transform group-hover:scale-110 shrink-0",
                    isActive ? "text-accent" : "text-ink-dim group-hover:text-ink"
                  )} />
                  <span className="tracking-tight text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-border bg-surface-light/40 mt-auto">
            <div className="bg-surface p-3 rounded-2xl border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-accent font-mono font-medium truncate">{getPlanLabel(plan)}</p>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
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
              className="fixed top-0 left-0 bottom-0 w-80 bg-surface border-r border-border z-[120] flex flex-col pt-20"
            >
              <div className="absolute top-4 right-4">
                <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all cursor-pointer"
                   aria-label="Close navigation menu"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>

              <div className="px-6 mb-4">
                 <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em]">Navigation</span>
                 </div>
                 <h2 className="text-sm font-bold text-ink uppercase tracking-widest">All Modules</h2>
              </div>

              <div className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group",
                      location.pathname === item.path
                        ? "bg-accent/10 text-accent border border-accent/20 shadow-sm"
                        : "text-ink-dim hover:text-ink hover:bg-surface-light"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-110 shrink-0",
                      location.pathname === item.path ? "text-accent" : "text-ink-dim group-hover:text-ink"
                    )} />
                    <span className="tracking-tight text-xs">{item.name}</span>
                  </Link>
                ))}
              </div>

              <div className="p-6 border-t border-border mt-auto">
                 <div className="bg-surface-light p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                       <UserIcon className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <p className="text-xs font-bold text-ink truncate">{user?.displayName}</p>
                       <p className="text-[10px] text-accent font-mono truncate">{getPlanLabel(plan)}</p>
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
