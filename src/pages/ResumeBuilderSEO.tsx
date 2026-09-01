import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  FileEdit, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  HelpCircle,
  Briefcase,
  Mic,
  GraduationCap,
  FileSearch,
  Download,
  Eye
} from 'lucide-react';

export default function ResumeBuilderSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Resume Builder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Create clean, ATS-compliant resumes with AI-assisted bullet point formatting, customizable sections, and instant export."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/editor');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/editor');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Resume Builder | Create ATS-Friendly Resumes"
        description="Build professional, ATS-friendly resumes with AI HireFlow. Optimize your bullet points with quantifiable impact metrics, clean formatting, and real-time preview."
        canonicalPath="/resume-builder"
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
            <FileEdit className="w-3.5 h-3.5" /> Structured Resume Creation Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Resume Builder
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Create clean, ATS-compliant resumes engineered for modern hiring workflows. Enhance your bullet points with measurable impact metrics, clear section hierarchy, and seamless PDF export.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Build Resume Now <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#builder-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              Key Features
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> ATS-optimized layouts</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> AI bullet polish</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Instant PDF download</span>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="builder-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Architected for Parsability</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Why Use AI HireFlow's Resume Builder?</p>
            <p className="text-sm text-ink-dim mt-3">Most visual resume templates fail ATS screening due to unreadable column tables. AI HireFlow is built from the ground up for clean machine parsing and human clarity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Single-Column Architecture</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Standard single-column layouts guarantee that applicant tracking software processes your experience chronologically without merging unrelated text blocks.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">AI-Powered Bullet Optimization</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Transform passive responsibilities into active, outcome-driven bullet points using the Action + Context + Metric (STAR) formulation.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Live Side-by-Side Preview</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Edit contact information, employment history, technical skills, and project highlights with real-time visual formatting updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Workflow</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">How To Build Your Resume</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Enter Your Details",
                desc: "Fill in your background details, work experience, projects, education, and technical competencies."
              },
              {
                step: "02",
                title: "Refine with AI",
                desc: "Use built-in prompt assistance to sharpen action verbs and articulate measurable achievements."
              },
              {
                step: "03",
                title: "Audit ATS Fit",
                desc: "Check your resume structure and keyword density against target job requirements."
              },
              {
                step: "04",
                title: "Export Clean PDF",
                desc: "Download a perfectly styled, machine-readable PDF ready for direct job applications."
              }
            ].map((st, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-lg">
                <div className="text-2xl font-mono font-black text-accent mb-3">{st.step}</div>
                <h3 className="text-sm font-bold text-ink mb-2">{st.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Target Users</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Who Benefits From AI HireFlow Resume Builder?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Developers & Engineers",
                desc: "Highlight tech stacks, repositories, microservice scaling metrics, and architectural contributions cleanly."
              },
              {
                title: "Early Career & Freshers",
                desc: "Structure academic projects, certifications, and technical proficiencies professionally even without extensive work history."
              },
              {
                title: "Product & Project Managers",
                desc: "Articulate product launches, user growth numbers, and cross-functional team leadership with clarity."
              },
              {
                title: "Data & Cloud Specialists",
                desc: "Clearly separate cloud platforms, pipeline tools, database technologies, and machine learning toolsets."
              },
              {
                title: "Active Job Seekers",
                desc: "Create and customize tailored versions of your master resume quickly for distinct role types."
              },
              {
                title: "Campus Candidates",
                desc: "Ensure your resume adheres to university placement cell formatting guidelines and ATS requirements."
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
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Questions & Answers</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Resume Builder FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Are the generated resumes ATS-friendly?",
                a: "Yes. All resumes built in AI HireFlow follow clean, single-column semantic structures with standard headers, avoiding multi-layer nested tables or unreadable graphical elements."
              },
              {
                q: "Can I download my resume as a PDF?",
                a: "Yes, you can export your completed resume directly to a standardized PDF format formatted for direct application submission."
              },
              {
                q: "Can I store multiple resume versions?",
                a: "Yes. Authenticated users can manage and customize different resume variations saved under their account profile."
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
            <p className="text-xl sm:text-2xl font-sans font-black text-ink uppercase tracking-tight">Related Career Operations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/ats-resume-checker" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileSearch className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">ATS Resume Checker</h3>
              <p className="text-[11px] text-ink-dim">Audit keyword density and formatting flaws.</p>
            </Link>

            <Link to="/ai-job-search" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Briefcase className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Job Search</h3>
              <p className="text-[11px] text-ink-dim">Discover openings that match your skills profile.</p>
            </Link>

            <Link to="/ai-interview-preparation" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Mic className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Interview Practice</h3>
              <p className="text-[11px] text-ink-dim">Conduct interactive mock interviews with instant feedback.</p>
            </Link>

            <Link to="/career-roadmap" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <GraduationCap className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">Career Roadmap</h3>
              <p className="text-[11px] text-ink-dim">Map skill milestones and curated learning resources.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight mb-4">
            Build Your ATS-Ready Resume Today
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-8 max-w-xl mx-auto">
            Take the guesswork out of resume formatting. Create a clean, powerful document in minutes.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Launch Resume Builder <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
