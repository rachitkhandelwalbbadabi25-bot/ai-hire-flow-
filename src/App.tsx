import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import ResumeAnalyzerSEO from './pages/ResumeAnalyzerSEO';
import ResumeEditorSEO from './pages/ResumeEditorSEO';
import JobFinderSEO from './pages/JobFinderSEO';
import JobTrackerSEO from './pages/JobTrackerSEO';
import CareerAdvisorSEO from './pages/CareerAdvisorSEO';
import InterviewLabSEO from './pages/InterviewLabSEO';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import RefundPolicy from './pages/RefundPolicy';
import ContactUs from './pages/ContactUs';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import JobTracker from './pages/JobTracker';
import JobFinder from './pages/JobFinder';
import InterviewSimulator from './pages/InterviewSimulator';
import LearningPath from './pages/LearningPath';
import ResumeEditor from './pages/ResumeEditor';
import Profile from './pages/Profile';
import CampusPlacement from './pages/CampusPlacement';
import OutreachHub from './pages/OutreachHub';
import CreditsPage from './pages/Credits';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import { SystemOSProvider } from './context/SystemOSContext';
import { A11yProvider } from './context/A11yContext';
import { AIProviderProvider } from './context/AIProviderContext';
import { Sparkles } from 'lucide-react';
import HireFlowLogo from './components/HireFlowLogo';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
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
          <Route path="/campus" element={user ? <CampusPlacement /> : <Navigate to="/" replace />} />
          <Route path="/outreach" element={user ? <OutreachHub /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" replace />} />
          <Route path="/credits" element={user ? <CreditsPage /> : <Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
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
