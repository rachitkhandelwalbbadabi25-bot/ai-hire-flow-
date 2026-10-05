import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  GraduationCap, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle,
  Briefcase,
  Mic,
  FileSearch,
  FileEdit,
  Map,
  Compass,
  BookOpen,
  Award,
  Search
} from 'lucide-react';

export default function CareerAdvisorSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Career Advisor & Learning Roadmap",
    "url": "https://www.aihireflow.in/career-advisor",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Intelligent AI career advisory system. Analyze skill deficiencies against target tech jobs, formulate milestone learning roadmaps, and receive curated technical project guidance."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/learning');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/learning');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Career Advisor | Personalized Skill Roadmaps & Growth — AI HireFlow"
        description="Accelerate your tech career with AI HireFlow's AI Career Advisor. Identify technical skill gaps, generate milestone-driven learning roadmaps, and build project portfolios that recruiters notice."
        canonicalPath="/career-advisor"
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
            <Compass className="w-3.5 h-3.5" /> Technical Career Progression Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Career Advisor
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Navigate your tech career with clarity. Automatically detect missing qualifications between your current profile and target senior roles, then generate actionable, milestone-driven learning roadmaps.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Ask AI Career Advisor <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#roadmap-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Guides
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Skill Gap Diagnostics</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Curated Project Milestones</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Targeted Course Roadmaps</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="roadmap-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Targeted Career Advancement</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Turn Skill Deficiencies Into Structured Learning Milestones</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              When applying for competitive tech roles or pivoting into new domains like AI engineering, cloud infrastructure, or full-stack architecture, random tutorials waste months. AI HireFlow reverse-engineers the exact skills demanded by hiring managers into a personalized progression path.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Map className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Milestone Roadmaps</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Step-by-step technical paths broken into weekly modules with clear learning objectives, documentation links, and mastery checks.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Proof-of-Work Projects</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Build real-world portfolio applications and end-to-end pipelines that provide concrete proof of competence on your resume and GitHub.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Dynamic Role Pivots</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Transitioning from backend to AI engineering or QA to DevOps? The advisor maps your existing transferable experience to accelerate your switch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Roadmap Architecture</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the AI Career Advisor Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Select Target Career Destination",
                desc: "Choose from software engineering, machine learning, cloud architecture, product management, or paste a target dream job."
              },
              {
                step: "02",
                title: "Baseline Competency Assessment",
                desc: "The engine audits your verified resume capabilities against target senior-level expectations to pinpoint specific technical gaps."
              },
              {
                step: "03",
                title: "Generate Structured Curriculum",
                desc: "Receive a chronological roadmap featuring prioritized topics, documentation deep dives, courses, and project specs."
              },
              {
                step: "04",
                title: "Add Verified Bullets To Resume",
                desc: "As you complete project milestones, seamlessly add verified implementation bullets to your Master Resume profile."
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
              Generate Your Career Roadmap <ArrowRight className="w-4 h-4" />
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
                <p className="text-xs text-ink-dim">Discover real job openings matching your newly acquired technical skills.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Discover Jobs <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/resume-analyzer" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileSearch className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Analyzer</h3>
                <p className="text-xs text-ink-dim">Verify that your updated resume reflects your new capabilities before applying.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Audit Resume <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/interview-lab" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Mic className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Interview Lab</h3>
                <p className="text-xs text-ink-dim">Practice technical interview questions covering topics on your learning roadmap.</p>
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
              <h3 className="text-sm font-bold text-ink mb-2">How personalized are the career roadmaps?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Roadmaps are customized specifically to your current demonstrated resume experience and the target job description or role level you wish to reach.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Can I track my progress over time?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. You can check off modules, record project completion, and push new bullet accomplishments directly to your Master Resume profile.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is the Career Advisor free to access?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes! Generating roadmap recommendations and viewing foundational milestones is included in every account's free access.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
