import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import JobTracker from './pages/JobTracker';
import JobFinder from './pages/JobFinder';
import InterviewSimulator from './pages/InterviewSimulator';
import LearningPath from './pages/LearningPath';
import ResumeEditor from './pages/ResumeEditor';
import Profile from './pages/Profile';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />
          <p className="text-ink-dim font-medium font-sans uppercase tracking-widest text-xs">Synchronizing Neural Network...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/analyzer" element={user ? <ResumeAnalyzer /> : <Navigate to="/" />} />
          <Route path="/finder" element={user ? <JobFinder /> : <Navigate to="/" />} />
          <Route path="/interview" element={user ? <InterviewSimulator /> : <Navigate to="/" />} />
          <Route path="/learning" element={user ? <LearningPath /> : <Navigate to="/" />} />
          <Route path="/editor" element={user ? <ResumeEditor /> : <Navigate to="/" />} />
          <Route path="/jobs" element={user ? <JobTracker /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </PlanProvider>
    </AuthProvider>
  );
}
