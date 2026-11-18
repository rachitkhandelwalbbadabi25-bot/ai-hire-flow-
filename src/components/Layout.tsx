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
    <div className="min-h-screen flex flex-col bg-[var(--hf-bg)] selection:bg-[var(--hf-cta)] selection:text-white text-[var(--hf-text)] transition-colors duration-150">
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
      <main className={showAppSidebar ? "flex-1 pt-20 sm:pt-22 pb-28 md:pb-12 lg:ml-60 transition-all" : "flex-1"}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {isPublicRoute ? (
        <footer className="border-t-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b-[1.5px] border-[var(--hf-ink-border)]">
              {/* Brand Column */}
              <div className="md:col-span-4 space-y-3.5">
                <Link to="/" className="inline-flex items-center gap-2.5">
                  <HireFlowLogo className="w-7 h-7" />
                  <span className="font-serif-display font-bold text-lg tracking-tight text-[var(--hf-text)]">
                    HIREFLOW // DOSSIER
                  </span>
                </Link>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed max-w-sm">
                  Rigorous career operating dossier for ATS resume diagnostics, Google-XYZ bullet engineering, live requisition indexing, and STAR interview simulations.
                </p>
                <div className="pt-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] text-[var(--hf-text)]">
                    EDITION // VOL. 2026
                  </span>
                </div>
              </div>

              {/* Platform Column */}
              <div className="md:col-span-3 space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hf-text)]">
                  I. Core Diagnostics
                </h3>
                <ul className="space-y-2.5 text-xs font-mono text-[var(--hf-text-secondary)]">
                  <li>
                    <Link to="/resume-analyzer" className="hover:text-[var(--hf-cta)] transition-colors">01. Resume Analyzer</Link>
                  </li>
                  <li>
                    <Link to="/resume-editor" className="hover:text-[var(--hf-cta)] transition-colors">02. Resume Editor</Link>
                  </li>
                  <li>
                    <Link to="/job-finder" className="hover:text-[var(--hf-cta)] transition-colors">03. Live Job Index</Link>
                  </li>
                  <li>
                    <Link to="/job-tracker" className="hover:text-[var(--hf-cta)] transition-colors">04. Application Tracker</Link>
                  </li>
                </ul>
              </div>

              {/* Preparation Column */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hf-text)]">
                  II. Preparation
                </h3>
                <ul className="space-y-2.5 text-xs font-mono text-[var(--hf-text-secondary)]">
                  <li>
                    <Link to="/interview-lab" className="hover:text-[var(--hf-cta)] transition-colors">05. Interview Lab</Link>
                  </li>
                  <li>
                    <Link to="/career-advisor" className="hover:text-[var(--hf-cta)] transition-colors">06. Career Roadmap</Link>
                  </li>
                  <li>
                    <a href="/#pricing" className="hover:text-[var(--hf-cta)] transition-colors">07. Pricing Ledger</a>
                  </li>
                  <li>
                    <a href="/#faq" className="hover:text-[var(--hf-cta)] transition-colors">08. FAQ Index</a>
                  </li>
                </ul>
              </div>

              {/* Legal & Support Column */}
              <div className="md:col-span-3 space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hf-text)]">
                  III. Governance &amp; Legal
                </h3>
                <ul className="space-y-2.5 text-xs font-mono text-[var(--hf-text-secondary)]">
                  <li>
                    <Link to="/privacy" className="hover:text-[var(--hf-cta)] transition-colors">Privacy Policy</Link>
                  </li>
                  <li>
                    <Link to="/terms" className="hover:text-[var(--hf-cta)] transition-colors">Terms &amp; Conditions</Link>
                  </li>
                  <li>
                    <Link to="/refund" className="hover:text-[var(--hf-cta)] transition-colors">Refund &amp; Cancellation</Link>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-[var(--hf-cta)] transition-colors">Contact Support Desk</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[var(--hf-text-muted)]">
              <p>© {new Date().getFullYear()} AI HIREFLOW // CAREER OPERATING DOSSIER.</p>
              <div className="flex items-center gap-6">
                <Link to="/privacy" className="hover:text-[var(--hf-text)] transition-colors">PRIVACY</Link>
                <Link to="/terms" className="hover:text-[var(--hf-text)] transition-colors">TERMS</Link>
                <Link to="/contact" className="hover:text-[var(--hf-text)] transition-colors">SUPPORT</Link>
              </div>
            </div>
          </div>
        </footer>
      ) : (
        <footer className="py-4 border-t-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)] mb-16 md:mb-0 lg:ml-60 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[var(--hf-text-muted)]">
            <span>HIREFLOW // WORKSPACE DOSSIER ({new Date().getFullYear()})</span>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="hover:text-[var(--hf-text)] transition-colors">PRIVACY</Link>
              <Link to="/terms" className="hover:text-[var(--hf-text)] transition-colors">TERMS</Link>
              <Link to="/refund" className="hover:text-[var(--hf-text)] transition-colors">REFUNDS</Link>
              <Link to="/contact" className="hover:text-[var(--hf-text)] transition-colors">SUPPORT</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
