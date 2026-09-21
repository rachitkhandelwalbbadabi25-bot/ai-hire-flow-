import { User } from 'firebase/auth';
import Navbar from './Navbar';
import UpgradeModal from './UpgradeModal';
import OnboardingTour from './OnboardingTour';
import { motion } from 'motion/react';
import { useLocation, Link } from 'react-router-dom';
import { ReactNode } from 'react';
import HireFlowLogo from './HireFlowLogo';

interface LayoutProps {
  user: User | null;
  children: ReactNode;
}

export const PUBLIC_SEO_ROUTES = [
  '/',
  '/ats-resume-checker',
  '/resume-builder',
  '/ai-interview-preparation',
  '/ai-job-search',
  '/career-roadmap',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/terms-and-conditions',
  '/refund',
  '/refund-policy',
  '/refund-and-cancellation',
  '/contact',
  '/contact-us'
];

export default function Layout({ user, children }: LayoutProps) {
  const location = useLocation();
  const isPublicRoute = PUBLIC_SEO_ROUTES.includes(location.pathname);
  const showAppSidebar = Boolean(user && !isPublicRoute);

  return (
    <div className="min-h-screen bg-background selection:bg-accent selection:text-white text-ink">
      <Navbar user={user} />
      <UpgradeModal />
      {showAppSidebar && <OnboardingTour />}
      <main className={showAppSidebar ? "pt-20 sm:pt-24 pb-28 md:pb-12 lg:ml-64 transition-all" : ""}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
      <footer className={`py-12 border-t border-border bg-surface mb-16 md:mb-0 ${showAppSidebar ? "lg:ml-64" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-dim">
            <Link to="/ats-resume-checker" className="hover:text-ink transition-colors">ATS Resume Checker</Link>
            <Link to="/resume-builder" className="hover:text-ink transition-colors">AI Resume Builder</Link>
            <Link to="/ai-interview-preparation" className="hover:text-ink transition-colors">AI Interview Practice</Link>
            <Link to="/ai-job-search" className="hover:text-ink transition-colors">AI Job Search</Link>
            <Link to="/career-roadmap" className="hover:text-ink transition-colors">Career Roadmap</Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-6 border-t border-border/40 gap-4">
            <div className="flex items-center gap-2.5">
              <HireFlowLogo className="w-6 h-6" />
              <p className="text-ink-dim text-xs font-sans">
                © 2026 AI HireFlow. Precision engineered for the bold.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link to="/" className="text-ink-dim hover:text-ink text-xs transition-colors">Home</Link>
              <Link to="/privacy" className="text-ink-dim hover:text-ink text-xs transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-ink-dim hover:text-ink text-xs transition-colors">Terms &amp; Conditions</Link>
              <Link to="/refund" className="text-ink-dim hover:text-ink text-xs transition-colors">Refund &amp; Cancellation</Link>
              <Link to="/contact" className="text-ink-dim hover:text-ink text-xs transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
