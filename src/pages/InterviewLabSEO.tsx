import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  Mic, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle,
  Briefcase,
  GraduationCap,
  FileSearch,
  FileEdit,
  MessageSquare,
  Volume2,
  TrendingUp,
  BrainCircuit,
  Search
} from 'lucide-react';

export default function InterviewLabSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Interview Lab",
    "url": "https://www.aihireflow.in/interview-lab",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "description": "Interactive technical and behavioral interview simulation laboratory. Practice with dynamic AI hiring managers and receive structured feedback on STAR delivery and technical precision."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/interview');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/interview');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Interview Lab | Technical & Behavioral Mock Simulator — AI HireFlow"
        description="Practice realistic mock interviews with AI HireFlow's AI Interview Lab. Get real-time AI feedback on technical accuracy, STAR behavioral structure, communication conciseness, and delivery."
        canonicalPath="/interview-lab"
        jsonLd={jsonLd}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-border">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] -z-10 opacity-40 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[350px] h-[350px] bg-accent/10 rounded-full blur-[100px]" />
          <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[90px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-full text-accent text-xs font-mono font-bold uppercase tracking-wider mb-6 border border-border">
            <Mic className="w-3.5 h-3.5" /> High-Fidelity Interview Simulation Laboratory
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Interview Lab
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Master your technical loops and behavioral rounds before speaking to recruiters. Conduct simulated interviews with adaptive AI interviewers and receive instant, objective critiques on clarity, STAR structure, and technical depth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Interview Lab <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#lab-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Simulates
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Role-Specific Question Sets</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Real-Time STAR Feedback</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Technical Precision Scoring</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="lab-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Adaptive Simulation</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Practice Like It's The Real Technical Onsite</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              Standard interview question banks fail because static answers cannot teach you how to adapt when an interviewer probes your design decisions or asks follow-up questions. The AI Interview Lab generates dynamic, context-aware follow-up queries based on your spoken or typed responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Dynamic Follow-Up Probing</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                The AI detects gaps in your explanation and asks senior-level clarifying questions just like a lead engineer or hiring manager on a panel.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Objective 5-Point Rubric</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Receive instant grades on Situation, Task, Action, Result (STAR), conciseness, technical depth, and trade-off justification after every answer.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Voice & Text Modes</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Practice typing concise technical responses or speak naturally using voice recognition to simulate real-time video screen interviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Simulation Process</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the AI Interview Lab Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Choose Role & Interview Type",
                desc: "Select software engineering, frontend, backend, system design, or behavioral rounds, or paste a specific job description."
              },
              {
                step: "02",
                title: "Conduct Live Simulation",
                desc: "The AI conducts a 4-to-6 question round, adapting each question based on your prior answers and resume background."
              },
              {
                step: "03",
                title: "Review Instant Performance Critique",
                desc: "Read detailed critiques on what you nailed, what lacked concrete evidence, and how to improve your delivery."
              },
              {
                step: "04",
                title: "Study Ideal Model Answers",
                desc: "Inspect model senior-level answers showing exact technical vocabulary and structured communication standards."
              }
            ].map((s, i) => (
              <div key={i} className="flex gap-6 p-6 bg-surface border border-border rounded-xl items-start">
                <span className="font-mono text-xl font-bold text-accent">{s.step}</span>
                <div>
                  <h3 className="text-base font-bold text-ink mb-1">{s.title}</h3>
                  <p className="text-xs text-ink-dim leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              Start Your Mock Interview Session <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Related Tools / Internal Linking */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-2">Connected Career Operations</h2>
            <p className="text-2xl font-sans font-bold text-ink">Explore AI HireFlow's Platform Capabilities</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/career-advisor" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <GraduationCap className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Career Advisor</h3>
                <p className="text-xs text-ink-dim">Study curated project roadmaps to close any technical gaps revealed in your mock interviews.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">View Career Advisor <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/resume-analyzer" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileSearch className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Analyzer</h3>
                <p className="text-xs text-ink-dim">Align your resume bullets with the stories you plan to share in your interviews.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Audit Resume <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/job-tracker" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Briefcase className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Job Tracker</h3>
                <p className="text-xs text-ink-dim">Log scheduled interview rounds, interviewer details, and interview outcomes.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Open Job Tracker <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-2">FAQ</h2>
            <p className="text-2xl font-sans font-bold text-ink">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">What types of interviews can I practice?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                You can practice technical coding explanations, system architecture trade-offs, behavioral STAR questions, leadership scenarios, and product management case studies.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Can I paste a specific company or role description?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. The Interview Lab will customize its questions specifically to the company's tech stack, culture principles, and domain expectations.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is the Interview Lab free to try?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes! Every account receives free practice credits to complete realistic interview rounds with full AI feedback.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
