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
  Award
} from 'lucide-react';

export default function CareerRoadmapSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Career Roadmap & Learning Path",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Generate structured career learning roadmaps. Map technical skill gaps into milestone-driven courses and projects."
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
        title="AI Career Roadmap for Job Seekers | AI HireFlow"
        description="Build a step-by-step technical career roadmap with AI HireFlow. Bridge skill gaps with personalized learning milestones and curated course recommendations."
        canonicalPath="/career-roadmap"
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
            <Map className="w-3.5 h-3.5" /> Structured Career Navigation
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            Build Your Personalized Career Roadmap
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Diagnose technical skill gaps between your current resume and dream role. AI HireFlow constructs milestone-driven learning paths backed by high-yield course recommendations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Generate Career Roadmap <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#roadmap-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Skill gap assessment</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Curated course links</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Milestone progress tracking</span>
          </div>
        </div>
      </section>

      {/* Core Benefits */}
      <section id="roadmap-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Targeted Skill Acquisition</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Structured Upskilling Without the Guesswork</p>
            <p className="text-sm text-ink-dim mt-3">Avoid spending months learning irrelevant tools. Focus on the high-demand competencies required by hiring teams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Automated Skill Gap Extraction</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Compares your uploaded resume profile against target job profiles to uncover missing languages, cloud platforms, and framework proficiencies.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Curated Course Integration</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Connects identified skill deficiencies to top-rated courses and projects across Coursera, Udemy, official documentation, and YouTube.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Milestone-Driven Tracking</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Track completion of foundational concepts, intermediate projects, and advanced production-grade system implementations.
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
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">How To Generate Your Career Roadmap</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">01</div>
              <h3 className="text-base font-bold text-ink mb-2">Define Your Career Goal</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Input your target job title (e.g. Senior Backend Engineer, AI/ML Specialist, Cloud Architect) and current skill baseline.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">02</div>
              <h3 className="text-base font-bold text-ink mb-2">Receive Step-by-Step Milestones</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Get a phased curriculum divided into core fundamentals, real-world portfolio projects, and interview-ready architecture patterns.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">03</div>
              <h3 className="text-base font-bold text-ink mb-2">Track Progress & Update Resume</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Mark modules as complete and sync newly acquired competencies directly into your AI HireFlow resume builder profile.
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
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Who Is The Career Roadmap For?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Engineers Aiming for Senior Roles",
                desc: "Identify architecture and system design skills needed to transition from mid-level to senior/lead engineer."
              },
              {
                title: "Career Switchers Entering Tech",
                desc: "Follow an organized, step-by-step syllabus without getting overwhelmed by hundreds of disconnected tutorials."
              },
              {
                title: "Computer Science Students",
                desc: "Supplement university coursework with practical industry frameworks and production database patterns."
              },
              {
                title: "Self-Taught Developers",
                desc: "Validate and fill hidden knowledge gaps in testing, CI/CD, data structures, and cloud deployments."
              },
              {
                title: "DevOps & Cloud Engineers",
                desc: "Master modern containerization, Kubernetes, infrastructure-as-code, and cloud security certifications."
              },
              {
                title: "Product & Technical Leads",
                desc: "Acquire technical literacy across modern AI integrations, microservices, and modern web architectures."
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
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Career Roadmap FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How are the course recommendations selected?",
                a: "Courses and resources are mapped directly to specific industry skills from verified educational platforms (Coursera, Udemy, documentation, freeCodeCamp) based on real job requirements."
              },
              {
                q: "Can I customize my target career goals?",
                a: "Yes. You can generate roadmaps for any technical discipline including Frontend, Backend, Full Stack, Cloud/DevOps, Data Science, and Mobile development."
              },
              {
                q: "Is my progress saved?",
                a: "Yes. Authenticated users have their roadmap state and milestone progress automatically synced to their cloud account."
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
            <p className="text-xl sm:text-2xl font-sans font-black text-ink uppercase tracking-tight">Full Platform Suite</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/ats-resume-checker" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileSearch className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">ATS Resume Checker</h3>
              <p className="text-[11px] text-ink-dim">Audit keyword density and formatting flaws.</p>
            </Link>

            <Link to="/resume-builder" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileEdit className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Resume Builder</h3>
              <p className="text-[11px] text-ink-dim">Create clean, ATS-compliant resumes with AI.</p>
            </Link>

            <Link to="/ai-job-search" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Briefcase className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Job Search</h3>
              <p className="text-[11px] text-ink-dim">Discover openings aligned with your skills.</p>
            </Link>

            <Link to="/ai-interview-preparation" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Mic className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Interview Practice</h3>
              <p className="text-[11px] text-ink-dim">Simulate mock interviews with live feedback.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight mb-4">
            Build Your Career Roadmap Today
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-8 max-w-xl mx-auto">
            Take control of your technical growth. Uncover skill gaps and accelerate your path to your target position.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Create Learning Path <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
