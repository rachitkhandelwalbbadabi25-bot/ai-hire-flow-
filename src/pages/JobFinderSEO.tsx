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
  Target,
  BarChart3,
  Compass
} from 'lucide-react';

export default function JobFinderSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Job Finder",
    "url": "https://www.aihireflow.in/job-finder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Semantic job discovery and matching engine. Discover high-compatibility tech opportunities based on skill alignment, location preferences, and career goals."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/finder');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/finder');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Job Finder | Semantic Job Search & Match Engine — AI HireFlow"
        description="Discover targeted job openings with AI HireFlow's AI Job Finder. Compare your skills directly against job descriptions with semantic compatibility scoring and instant application intelligence."
        canonicalPath="/job-finder"
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
            <Search className="w-3.5 h-3.5" /> Semantic Opportunity Discovery Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Job Finder
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop scrolling endless generic job boards. Discover roles that genuinely match your tech stack, evaluate qualification alignment in seconds, and target opportunities with verified hiring velocity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Find Jobs <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#finder-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Matches
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Semantic Skill Matching</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Objective Compatibility Scores</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Direct Pipeline Integration</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="finder-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Precision Job Search</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Search By Skill Alignment Rather Than Just Keywords</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              Traditional job portals rely on crude keyword filters that flood you with irrelevant or outdated postings. AI HireFlow performs semantic analysis across job descriptions to measure actual technology overlap, seniority requirements, and role expectations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Automated Match Scoring</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Every listing is scored against your resume profile so you immediately see your strengths and missing requirements before submitting an application.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Verified Tech Stacks</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Filter by specific languages, cloud providers, frameworks, and engineering tools to find roles that match your hands-on competencies.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">One-Click Pipeline Push</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Save prospective positions straight to your AI Job Tracker board to manage interview stages, recruiter contacts, and deadline alerts.
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
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the AI Job Finder Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Define Target Roles & Locations",
                desc: "Search for specific engineering titles, remote preferences, industry domains, and experience levels."
              },
              {
                step: "02",
                title: "AI Skill Gap Cross-Check",
                desc: "Instantly compare the job description with your resume to see which qualifications you meet and where you have gaps."
              },
              {
                step: "03",
                title: "Tailor Your Application",
                desc: "Use the Resume Analyzer and Editor to tailor your bullets for high-match roles before applying."
              },
              {
                step: "04",
                title: "Track Application Status",
                desc: "Send opportunities directly to your Kanban pipeline board to monitor follow-up timing and interview milestones."
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
              Start Finding Relevant Roles <ArrowRight className="w-4 h-4" />
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
            <Link to="/job-tracker" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Briefcase className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Job Tracker</h3>
                <p className="text-xs text-ink-dim">Organize active applications on a Kanban board from initial reach-out to final offers.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Open Job Tracker <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/resume-analyzer" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileSearch className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Analyzer</h3>
                <p className="text-xs text-ink-dim">Audit your resume compatibility against the exact job description before submitting.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Run Resume Audit <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/interview-lab" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Mic className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Interview Lab</h3>
                <p className="text-xs text-ink-dim">Rehearse technical interview questions tailored directly to the job you just discovered.</p>
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
              <h3 className="text-sm font-bold text-ink mb-2">How does semantic job matching work?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Rather than checking if an exact keyword appears, our engine evaluates the semantic relationship between your demonstrated project work and the job's core technical requirements.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Can I search for remote and hybrid positions?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. You can specify remote, hybrid, or on-site preferences along with preferred technical compensation benchmarks.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">How frequently are job listings refreshed?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Openings are continuously indexed from active tech employers and startup hiring boards to ensure you only apply to genuine open positions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
