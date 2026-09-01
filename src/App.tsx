import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import ATSResumeCheckerSEO from './pages/ATSResumeCheckerSEO';
import ResumeBuilderSEO from './pages/ResumeBuilderSEO';
import AIInterviewPrepSEO from './pages/AIInterviewPrepSEO';
import AIJobSearchSEO from './pages/AIJobSearchSEO';
import CareerRoadmapSEO from './pages/CareerRoadmapSEO';
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
import { LanguageProvider } from './context/LanguageContext';
import { SystemOSProvider } from './context/SystemOSContext';
import { A11yProvider } from './context/A11yContext';
import { AIProviderProvider } from './context/AIProviderContext';
import { Sparkles } from 'lucide-react';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] transition-all duration-700">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center animate-pulse border border-accent/30 shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-white font-sans font-black uppercase tracking-[0.4em] text-sm ml-[0.4em]">AI HireFlow</h2>
            <div className="h-[2px] w-12 bg-accent/40 rounded-full overflow-hidden">
               <div className="h-full bg-accent animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
            </div>
            <p className="text-[#404040] font-mono text-[8px] uppercase tracking-widest mt-2">Loading Career Platform</p>
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
          
          {/* Public SEO Landing Pages (Always accessible) */}
          <Route path="/ats-resume-checker" element={<ATSResumeCheckerSEO />} />
          <Route path="/resume-builder" element={<ResumeBuilderSEO />} />
          <Route path="/ai-interview-preparation" element={<AIInterviewPrepSEO />} />
          <Route path="/ai-job-search" element={<AIJobSearchSEO />} />
          <Route path="/career-roadmap" element={<CareerRoadmapSEO />} />

          {/* Authenticated Application Routes */}
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="/analyzer" element={user ? <ResumeAnalyzer /> : <Navigate to="/" replace />} />
          <Route path="/finder" element={user ? <JobFinder /> : <Navigate to="/" replace />} />
          <Route path="/interview" element={user ? <InterviewSimulator /> : <Navigate to="/" replace />} />
          <Route path="/learning" element={user ? <LearningPath /> : <Navigate to="/" replace />} />
          <Route path="/editor" element={user ? <ResumeEditor /> : <Navigate to="/" replace />} />
          <Route path="/resume-editor" element={user ? <ResumeEditor /> : <Navigate to="/" replace />} />
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
      <LanguageProvider>
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
      </LanguageProvider>
    </A11yProvider>
  );
}
