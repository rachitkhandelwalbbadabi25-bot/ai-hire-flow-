import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  Briefcase, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  HelpCircle,
  Mic,
  GraduationCap,
  FileSearch,
  FileEdit,
  Clock,
  Calendar,
  Layers,
  TrendingUp
} from 'lucide-react';

export default function JobTrackerSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Job Tracker",
    "url": "https://www.aihireflow.in/job-tracker",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Smart career Kanban application pipeline. Track job applications, interview stages, recruiter contacts, and follow-up deadlines in one unified board."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/jobs');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/jobs');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Job Tracker | Kanban Application Pipeline & Follow-Ups — AI HireFlow"
        description="Organize your job search with AI HireFlow's AI Job Tracker. Manage applications, interview rounds, recruiter follow-ups, and offer negotiations in a dedicated career Kanban board."
        canonicalPath="/job-tracker"
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
            <Briefcase className="w-3.5 h-3.5" /> Career Workflow Pipeline Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Job Tracker
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate messy spreadsheets and forgotten recruiter emails. Track your active applications through every stage of the hiring pipeline with automated stage progression, timeline tracking, and interview scheduling.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Open Job Tracker <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#tracker-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              Key Features
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Drag-and-Drop Kanban Board</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Stage Progression Metrics</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Recruiter Contact Records</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="tracker-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Structured Organization</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Manage Your Applications Like A High-Performance Pipeline</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              When applying to dozens of tech employers, tracking stages, recruiter follow-ups, interview rounds, and salary details manually becomes overwhelming. AI HireFlow gives you an executive view of your complete job pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Intuitive Kanban Stages</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Move positions seamlessly through five standard milestones: Saved, Applied, Phone Screen, Technical Interview, and Offer / Decision.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Follow-Up Reminders</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Keep notes on recruiter correspondence, scheduled interview rounds, coding challenge deadlines, and negotiation terms in one centralized hub.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Search Velocity Analytics</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Track your application-to-interview conversion rate, response timelines, and stage velocity to optimize your search strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Workflow</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the AI Job Tracker Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Log or Auto-Import Positions",
                desc: "Save positions directly from the AI Job Finder, or manually enter company, role title, compensation range, and portal links."
              },
              {
                step: "02",
                title: "Attach Tailored Resumes",
                desc: "Keep track of the exact resume version and cover letter submitted for each employer to avoid interview prep confusion."
              },
              {
                step: "03",
                title: "Track Interview Cycles",
                desc: "Record interviewer names, technical loop topics, coding challenges, and key questions asked during each stage."
              },
              {
                step: "04",
                title: "Compare and Negotiate Offers",
                desc: "Evaluate multiple offers side-by-side with total compensation breakdowns, equity terms, and deadline dates."
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
              Organize Your Applications Now <ArrowRight className="w-4 h-4" />
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
            <Link to="/job-finder" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Search className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Job Finder</h3>
                <p className="text-xs text-ink-dim">Discover high-fit engineering opportunities and push them straight into your Job Tracker.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Discover Jobs <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/resume-analyzer" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileSearch className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Analyzer</h3>
                <p className="text-xs text-ink-dim">Audit your resume against job specifications before moving applications to Applied.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Run Resume Audit <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/interview-lab" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Mic className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Interview Lab</h3>
                <p className="text-xs text-ink-dim">Simulate upcoming technical and behavioral rounds for tracked companies.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Practice Interview <ArrowRight className="w-3.5 h-3.5" /></span>
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
              <h3 className="text-sm font-bold text-ink mb-2">Can I customize the stages on the Kanban board?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. While AI HireFlow comes with standard recruitment stages (Saved, Applied, Phone Screen, Interviewing, Offer), you can add custom notes, tags, and priority labels.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is my application data synced to the cloud?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. All your tracked roles, notes, deadlines, and history sync seamlessly with your secure account so you can manage your search from any device.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is the Job Tracker free to use?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes! The application pipeline board is completely free for all registered users to organize unlimited job applications.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
