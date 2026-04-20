import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
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
import CodeRabbit from './pages/CodeRabbit';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import { Sparkles } from 'lucide-react';

function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

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
            <p className="text-[#404040] font-mono text-[8px] uppercase tracking-widest mt-2">Initializing Neural Interface</p>
          </div>
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
          <Route path="/rabbit" element={user ? <CodeRabbit /> : <Navigate to="/" />} />
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
