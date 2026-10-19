import { User } from 'firebase/auth';
import Navbar from './Navbar';
import { motion } from 'motion/react';
import { useLocation, Link } from 'react-router-dom';
import { ReactNode, lazy, Suspense } from 'react';
import HireFlowLogo from './HireFlowLogo';
import { usePlan } from '../context/PlanContext';

const UpgradeModal = lazy(() => import('./UpgradeModal'));
const OnboardingTour = lazy(() => import('./OnboardingTour'));

interface LayoutProps {
  user: User | null;
  children: ReactNode;
}

export const PUBLIC_SEO_ROUTES = [
  '/',
  '/resume-analyzer',
  '/resume-editor',
  '/job-finder',
  '/job-tracker',
  '/career-advisor',
  '/interview-lab',
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
  const { isUpgradeModalOpen } = usePlan();
  const isPublicRoute = PUBLIC_SEO_ROUTES.includes(location.pathname);
  const showAppSidebar = Boolean(user && !isPublicRoute);

  return (
    <div className="min-h-screen bg-[var(--hf-bg)] selection:bg-[var(--hf-cta)] selection:text-white text-[var(--hf-text)] transition-colors duration-150">
      <Navbar user={user} />
      {isUpgradeModalOpen && (
        <Suspense fallback={null}>
          <UpgradeModal />
        </Suspense>
      )}
      {showAppSidebar && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
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
      <footer className={`py-12 border-t border-[var(--hf-border)] bg-[var(--hf-surface)] mb-16 md:mb-0 transition-colors ${showAppSidebar ? "lg:ml-64" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--hf-text-secondary)] font-medium">
            <Link to="/resume-analyzer" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI resume analyzer</Link>
            <Link to="/resume-editor" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI resume editor</Link>
            <Link to="/job-finder" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI job finder</Link>
            <Link to="/job-tracker" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI job tracker</Link>
            <Link to="/career-advisor" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI career advisor</Link>
            <Link to="/interview-lab" className="hover:text-[var(--hf-cta)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">AI interview lab</Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-6 border-t border-[var(--hf-border)] gap-4">
            <div className="flex items-center gap-2.5">
              <HireFlowLogo className="w-6 h-6" />
              <p className="text-[var(--hf-text-secondary)] text-xs font-sans">
                © 2026 AI HireFlow. AI-powered career operating platform.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link to="/" className="text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">Home</Link>
              <Link to="/privacy" className="text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">Privacy policy</Link>
              <Link to="/terms" className="text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">Terms &amp; conditions</Link>
              <Link to="/refund" className="text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">Refund &amp; cancellation</Link>
              <Link to="/contact" className="text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)] rounded">Contact us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
