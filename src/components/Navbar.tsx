import { Link, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
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
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSignOut = () => signOut(auth);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Job Finder', path: '/finder', icon: Search },
    { name: 'Analyzer', path: '/analyzer', icon: BarChart3 },
    { name: 'Interview Lab', path: '/interview', icon: Mic },
    { name: 'Learning Path', path: '/learning', icon: GraduationCap },
    { name: 'Resume Editor', path: '/editor', icon: FileEdit },
    { name: 'Job Tracker', path: '/jobs', icon: Briefcase },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              {user && (
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="p-2 -ml-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all"
                  aria-label="Open Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-accent p-1.5 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-sans font-bold text-xl tracking-tight text-ink">
                  AI HireFlow
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                   <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-bold text-ink uppercase tracking-wider">{user.displayName}</p>
                      <p className="text-[9px] text-ink-dim uppercase">Standard Tier</p>
                   </div>
                   <button
                    onClick={toggleTheme}
                    className="p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                  >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </button>
                   <button
                    onClick={handleSignOut}
                    className="p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Side Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
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
              className="fixed top-0 left-0 bottom-0 w-80 bg-surface border-r border-border z-[120] flex flex-col pt-20"
            >
              <div className="absolute top-4 right-4">
                <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-6 mb-8">
                 <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em]">Navigation Grid</span>
                 </div>
                 <h2 className="text-sm font-bold text-ink uppercase tracking-widest">Main Modules</h2>
              </div>

              <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all group",
                      location.pathname === item.path
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-ink-dim hover:text-ink hover:bg-surface-light"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-110",
                      location.pathname === item.path ? "text-accent" : "text-ink-dim group-hover:text-ink"
                    )} />
                    <span className="tracking-tight uppercase text-xs">{item.name}</span>
                  </Link>
                ))}
              </div>

              <div className="p-8 border-t border-border mt-auto">
                 <div className="bg-surface-light p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                       <UserIcon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-ink uppercase">{user?.displayName?.split(' ')[0]}</p>
                       <p className="text-[8px] text-ink-dim uppercase font-mono tracking-tighter">System Verified</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
