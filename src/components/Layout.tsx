import { User } from 'firebase/auth';
import Navbar from './Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
  user: User | null;
  children: ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background selection:bg-accent selection:text-white text-ink">
      <Navbar user={user} />
      <main className={user ? "pt-24 pb-12" : ""}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="py-12 border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4">
          <p className="text-ink-dim text-sm font-sans">
            © 2026 AI HireFlow. Precision engineered for the bold.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-ink-dim hover:text-ink text-xs transition-colors">Privacy</a>
            <a href="#" className="text-ink-dim hover:text-ink text-xs transition-colors">Terms</a>
            <a href="#" className="text-ink-dim hover:text-ink text-xs transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
