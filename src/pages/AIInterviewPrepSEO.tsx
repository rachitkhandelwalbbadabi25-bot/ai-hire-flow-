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
  BrainCircuit
} from 'lucide-react';

export default function AIInterviewPrepSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Interview Simulator",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Simulate technical and behavioral job interviews with AI. Receive real-time critique on answer clarity, depth, and STAR structure."
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
        title="AI Interview Preparation & Practice | AI HireFlow"
        description="Practice role-specific technical and behavioral interviews with AI HireFlow. Get real-time feedback on your answers, structure, and communication."
        canonicalPath="/ai-interview-preparation"
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
            <Mic className="w-3.5 h-3.5" /> Interactive Mock Interview Lab
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            Practice Interviews With AI
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Rehearse high-stakes technical, behavioral, and system design interviews in a realistic, pressure-free simulation. Receive objective, turn-by-turn critiques to sharpen your answers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Mock Interview Free <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#interview-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              See Capabilities
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Role-tailored questions</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Real-time feedback</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Voice & text simulation</span>
          </div>
        </div>
      </section>

      {/* What the Interview Simulator Covers */}
      <section id="interview-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Interview Modes</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Comprehensive Interview Preparation</p>
            <p className="text-sm text-ink-dim mt-3">Target your specific interview rounds with tailored questioning pipelines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Technical & Architecture Rounds</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Practice core data structures, algorithms, frontend frameworks, backend microservices, SQL/NoSQL databases, and cloud architecture deep dives.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Behavioral & STAR Structure</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Master behavioral questions (conflict resolution, leadership, deadline management) evaluated against the Situation, Task, Action, Result framework.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Instant Actionable Scoring</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Receive concrete scores on clarity, technical accuracy, conciseness, and sample model answers to help you calibrate your phrasing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Step-by-Step */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Workflow</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">How Mock Interview Sessions Work</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">01</div>
              <h3 className="text-base font-bold text-ink mb-2">Select Your Target Role</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Choose your job title (e.g., Full Stack Engineer, Frontend Dev, Product Manager) and select seniority level and round type.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">02</div>
              <h3 className="text-base font-bold text-ink mb-2">Answer Questions Interactively</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                The AI interviewer delivers dynamic follow-up questions tailored to your previous responses just like a senior engineering manager.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">03</div>
              <h3 className="text-base font-bold text-ink mb-2">Review Detailed Performance Feedback</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Get a breakdown of your strengths, identified knowledge gaps, and improved example answers to refine your delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Audience</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Who Should Practice With AI Interviews?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Active Job Seekers",
                desc: "Rehearse before real screening calls to eliminate nervousness and refine your pitch."
              },
              {
                title: "Software Engineers",
                desc: "Practice explaining complex system architectures, trade-offs, and technical problem-solving aloud."
              },
              {
                title: "College & Campus Placements",
                desc: "Prepare for standardized technical rounds and HR interviews for campus recruitment drives."
              },
              {
                title: "Career Switchers",
                desc: "Build fluency in unfamiliar domain vocabulary and articulate your transferable skills with confidence."
              },
              {
                title: "Professionals Returning to Market",
                desc: "Get up to speed with contemporary interview question styles and modern tech expectations."
              },
              {
                title: "Aspiring Team Leads",
                desc: "Practice responding to behavioral leadership scenarios and cross-functional conflict questions."
              }
            ].map((aud, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-lg">
                <h3 className="text-sm font-bold text-ink mb-2">{aud.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">FAQ</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Interview Simulator FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How does the AI generate interview questions?",
                a: "Questions are generated dynamically based on your target role title, seniority level, and target technologies, simulating realistic interview patterns."
              },
              {
                q: "Can I practice both technical and behavioral questions?",
                a: "Yes. You can select specific interview tracks including technical system design, coding problem walkthroughs, and behavioral/STAR questions."
              },
              {
                q: "Does the simulator provide ideal sample answers?",
                a: "Yes. For each question answered, the AI provides feedback along with a recommended high-impact sample response highlighting key concepts you may have omitted."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-lg">
                <h3 className="text-sm font-bold text-ink mb-2 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="text-xs text-ink-dim leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Related AI Career Tools */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Ecosystem</h2>
            <p className="text-xl sm:text-2xl font-sans font-black text-ink uppercase tracking-tight">Complementary Career Tools</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/ats-resume-checker" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileSearch className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">ATS Resume Checker</h3>
              <p className="text-[11px] text-ink-dim">Audit keyword density and formatting before applying.</p>
            </Link>

            <Link to="/resume-builder" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileEdit className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Resume Builder</h3>
              <p className="text-[11px] text-ink-dim">Create clean, ATS-compliant resumes with AI assistance.</p>
            </Link>

            <Link to="/ai-job-search" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Briefcase className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Job Search</h3>
              <p className="text-[11px] text-ink-dim">Discover openings aligned with your skillset.</p>
            </Link>

            <Link to="/career-roadmap" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <GraduationCap className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">Career Roadmap</h3>
              <p className="text-[11px] text-ink-dim">Close skill gaps with curated learning milestones.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight mb-4">
            Level Up Your Interview Readiness
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-8 max-w-xl mx-auto">
            Practice challenging questions in a safe environment and get real-time feedback today.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Start Practice Session <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
