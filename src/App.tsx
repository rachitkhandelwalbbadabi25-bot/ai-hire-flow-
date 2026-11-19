import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout, { PUBLIC_SEO_ROUTES } from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import { SystemOSProvider } from './context/SystemOSContext';
import { A11yProvider } from './context/A11yContext';
import { AIProviderProvider } from './context/AIProviderContext';
import HireFlowLogo from './components/HireFlowLogo';
import {
  loadLanding,
  loadResumeAnalyzerSEO,
  loadResumeEditorSEO,
  loadJobFinderSEO,
  loadJobTrackerSEO,
  loadCareerAdvisorSEO,
  loadInterviewLabSEO,
  loadPrivacyPolicy,
  loadTermsAndConditions,
  loadRefundPolicy,
  loadContactUs,
  loadDashboard,
  loadResumeAnalyzer,
  loadJobTracker,
  loadJobFinder,
  loadInterviewSimulator,
  loadLearningPath,
  loadResumeEditor,
  loadProfile,
  loadCampusPlacement,
  loadOutreachHub,
  loadCreditsPage,
} from './lib/routePrefetch';

// Route-level lazy loading for public & SEO pages (keeps authenticated initial bundle lean)
const Landing = lazy(loadLanding);
const ResumeAnalyzerSEO = lazy(loadResumeAnalyzerSEO);
const ResumeEditorSEO = lazy(loadResumeEditorSEO);
const JobFinderSEO = lazy(loadJobFinderSEO);
const JobTrackerSEO = lazy(loadJobTrackerSEO);
const CareerAdvisorSEO = lazy(loadCareerAdvisorSEO);
const InterviewLabSEO = lazy(loadInterviewLabSEO);
const PrivacyPolicy = lazy(loadPrivacyPolicy);
const TermsAndConditions = lazy(loadTermsAndConditions);
const RefundPolicy = lazy(loadRefundPolicy);
const ContactUs = lazy(loadContactUs);

// Route-level lazy loading for authenticated application modules
const Dashboard = lazy(loadDashboard);
const ResumeAnalyzer = lazy(loadResumeAnalyzer);
const JobTracker = lazy(loadJobTracker);
const JobFinder = lazy(loadJobFinder);
const InterviewSimulator = lazy(loadInterviewSimulator);
const LearningPath = lazy(loadLearningPath);
const ResumeEditor = lazy(loadResumeEditor);
const Profile = lazy(loadProfile);
const CampusPlacement = lazy(loadCampusPlacement);
const OutreachHub = lazy(loadOutreachHub);
const CreditsPage = lazy(loadCreditsPage);

function hasCachedFirebaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:authUser:')) {
        return true;
      }
    }
  } catch {}
  return false;
}

function PageLoader() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-[var(--hf-bg)] text-[var(--hf-text)]">
      <div className="flex flex-col items-center gap-4">
        <HireFlowLogo className="w-12 h-12 animate-pulse" />
        <div className="h-[2px] w-12 bg-[var(--hf-border)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--hf-cta)] animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isDedicatedPublicPage = pathname !== '/' && PUBLIC_SEO_ROUTES.includes(pathname);
  const canRenderImmediately = isDedicatedPublicPage || (pathname === '/' && !hasCachedFirebaseSession());

  if (authLoading && !canRenderImmediately) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--hf-bg)] text-[var(--hf-text)] transition-all duration-700">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <HireFlowLogo className="w-16 h-16 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-[var(--hf-text)] font-sans font-bold uppercase tracking-[0.3em] text-sm ml-[0.3em]">AI HireFlow</h2>
            <div className="h-[2px] w-12 bg-[var(--hf-border)] rounded-full overflow-hidden">
               <div className="h-full bg-[var(--hf-cta)] animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
            </div>
            <p className="text-[var(--hf-text-secondary)] font-sans text-xs tracking-wide mt-2">Loading career platform</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
            
            {/* Public Core AI Feature Landing Pages (Always crawlable & accessible without login) */}
            <Route path="/resume-analyzer" element={<ResumeAnalyzerSEO />} />
            <Route path="/resume-editor" element={<ResumeEditorSEO />} />
            <Route path="/job-finder" element={<JobFinderSEO />} />
            <Route path="/job-tracker" element={<JobTrackerSEO />} />
            <Route path="/career-advisor" element={<CareerAdvisorSEO />} />
            <Route path="/interview-lab" element={<InterviewLabSEO />} />

            {/* Backward-Compatible Public Aliases (Also crawlable & accessible without login) */}
            <Route path="/ats-resume-checker" element={<ResumeAnalyzerSEO />} />
            <Route path="/resume-builder" element={<ResumeEditorSEO />} />
            <Route path="/ai-job-search" element={<JobFinderSEO />} />
            <Route path="/career-roadmap" element={<CareerAdvisorSEO />} />
            <Route path="/ai-interview-preparation" element={<InterviewLabSEO />} />

            {/* Public Legal & Support Pages (Always accessible) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/refund-and-cancellation" element={<RefundPolicy />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/contact-us" element={<ContactUs />} />

            {/* Authenticated Application Routes (Protected product functionality) */}
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
            <Route path="/analyzer" element={user ? <ResumeAnalyzer /> : <Navigate to="/" replace />} />
            <Route path="/finder" element={user ? <JobFinder /> : <Navigate to="/" replace />} />
            <Route path="/interview" element={user ? <InterviewSimulator /> : <Navigate to="/" replace />} />
            <Route path="/learning" element={user ? <LearningPath /> : <Navigate to="/" replace />} />
            <Route path="/roadmap" element={user ? <LearningPath /> : <Navigate to="/" replace />} />
            <Route path="/editor" element={user ? <ResumeEditor /> : <Navigate to="/" replace />} />
            <Route path="/jobs" element={user ? <JobTracker /> : <Navigate to="/" replace />} />
            <Route path="/tracker" element={user ? <JobTracker /> : <Navigate to="/" replace />} />
            <Route path="/campus" element={user ? <CampusPlacement /> : <Navigate to="/" replace />} />
            <Route path="/outreach" element={user ? <OutreachHub /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" replace />} />
            <Route path="/credits" element={user ? <CreditsPage /> : <Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <A11yProvider>
      <AuthProvider>
        <PlanProvider>
          <AIProviderProvider>
            <SystemOSProvider>
              <ThemeProvider>
                <AppRoutes />
              </ThemeProvider>
            </SystemOSProvider>
          </AIProviderProvider>
        </PlanProvider>
      </AuthProvider>
    </A11yProvider>
  );
}
