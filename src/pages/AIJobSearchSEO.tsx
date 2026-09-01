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

export default function AIJobSearchSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Job Search & Match Engine",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Discover targeted job opportunities with AI-driven semantic role matching and objective skill fit scoring."
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
        title="AI Job Search & Job Matching | AI HireFlow"
        description="Find high-compatibility job listings matched with your skills, tech stack, and experience. Stop blind applications with AI HireFlow's semantic job search."
        canonicalPath="/ai-job-search"
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
            <Search className="w-3.5 h-3.5" /> Semantic Opportunity Matching
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            Find Jobs That Match Your Skills
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate low-yield application spam. AI HireFlow evaluates semantic alignment between your verified skills, experience level, and real-world job requirements with transparent match scoring.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Search Matched Jobs <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#matching-logic"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How Matching Works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Semantic skill matching</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Transparent fit breakdown</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Direct one-click application links</span>
          </div>
        </div>
      </section>

      {/* Why Targeted Job Search Matters */}
      <section id="matching-logic" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Matching Architecture</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Move Beyond Keyword Filters</p>
            <p className="text-sm text-ink-dim mt-3">Traditional job boards rely on crude boolean search filters. AI HireFlow uses semantic intelligence to evaluate comprehensive candidate-job compatibility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Technical Skill Alignment (40%)</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Checks core languages, libraries, frameworks, cloud tooling, and databases against job requirements.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Experience & Seniority (30%)</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Evaluates years of relevant production experience, technical leadership, and project complexity.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Domain & Location Fit (30%)</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Accounts for industry verticals (Fintech, SaaS, Healthcare) along with remote, hybrid, or on-site location preferences.
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
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">How To Discover Matched Opportunities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">01</div>
              <h3 className="text-base font-bold text-ink mb-2">Specify Role & Preferences</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Enter your target role (e.g. React Frontend Engineer, DevOps Specialist) and preferred location or remote status.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">02</div>
              <h3 className="text-base font-bold text-ink mb-2">Analyze Semantic Fit</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Review opportunities scored from 0-100 with transparent explanations detailing why the role matches or where gaps exist.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">03</div>
              <h3 className="text-base font-bold text-ink mb-2">Apply & Track Progress</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Seamlessly import opportunities into your integrated Kanban pipeline tracker to manage your application cycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Audience</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Who Is AI Job Matching For?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Active Job Seekers",
                desc: "Focus application effort on opportunities where your qualification score is highest."
              },
              {
                title: "Software Developers",
                desc: "Find roles matching exact tech stacks (e.g. Next.js, Node.js, Kubernetes) without generic keyword noise."
              },
              {
                title: "Remote Workers",
                desc: "Filter for worldwide and remote-friendly opportunities aligned with your time zone requirements."
              },
              {
                title: "Graduates & Freshers",
                desc: "Identify entry-level roles where foundational technical projects meet hiring manager criteria."
              },
              {
                title: "Contractors & Freelancers",
                desc: "Discover high-yield project positions requiring specialized, immediate domain expertise."
              },
              {
                title: "Career Switchers",
                desc: "Locate hybrid roles that value cross-disciplinary backgrounds and transferable problem-solving skills."
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
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Job Search FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How is the match score calculated?",
                a: "The match score is calculated using an objective 4-factor formula: Technical skills match (40%), Experience level (30%), Domain alignment (20%), and Location preference (10%)."
              },
              {
                q: "Can I save jobs directly to a tracker?",
                a: "Yes. Once logged in, you can save opportunities directly to your integrated Job Tracker Kanban board to organize interview stages."
              },
              {
                q: "Does AI HireFlow guarantee job placement?",
                a: "No. AI HireFlow is an intelligence tool designed to maximize application relevance and interview preparation. We do not make false claims of guaranteed employment."
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
            <p className="text-xl sm:text-2xl font-sans font-black text-ink uppercase tracking-tight">Complete Career Suite</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/ats-resume-checker" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileSearch className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">ATS Resume Checker</h3>
              <p className="text-[11px] text-ink-dim">Scan your resume before applying.</p>
            </Link>

            <Link to="/resume-builder" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileEdit className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Resume Builder</h3>
              <p className="text-[11px] text-ink-dim">Create clean, ATS-compliant resumes with AI.</p>
            </Link>

            <Link to="/ai-interview-preparation" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Mic className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Interview Practice</h3>
              <p className="text-[11px] text-ink-dim">Simulate mock interviews with live feedback.</p>
            </Link>

            <Link to="/career-roadmap" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <GraduationCap className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">Career Roadmap</h3>
              <p className="text-[11px] text-ink-dim">Personalized skill trees and course recommendations.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight mb-4">
            Start Finding Matched Roles
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-8 max-w-xl mx-auto">
            Focus your time on roles where your skills shine. Search and evaluate job openings with AI HireFlow.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Search Matched Jobs <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
