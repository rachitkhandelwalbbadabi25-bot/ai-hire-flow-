import { Link, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';
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
  FileEdit
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const location = useLocation();

  const handleSignOut = () => signOut(auth);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Job Finder', path: '/finder', icon: Search },
    { name: 'Analyzer', path: '/analyzer', icon: FileSearch },
    { name: 'Interview Lab', path: '/interview', icon: MessageSquare },
    { name: 'Learning Path', path: '/learning', icon: BookOpen },
    { name: 'Resume Editor', path: '/editor', icon: FileEdit },
    { name: 'Job Tracker', path: '/jobs', icon: Briefcase },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-accent p-1.5 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight text-ink">
              AI HireFlow
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {user && navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-surface-light text-ink"
                    : "text-ink-dim hover:text-ink hover:bg-surface-light/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={handleSignOut}
                className="p-2 text-ink-dim hover:text-ink transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
  );
}
