import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  FileSearch, 
  Sparkles, 
  Target, 
  Zap, 
  Map, 
  Briefcase, 
  ArrowRight, 
  ShieldCheck, 
  FileEdit, 
  Mic, 
  GraduationCap, 
  HelpCircle,
  CheckCircle2,
  Users,
  BrainCircuit,
  Compass
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AI HireFlow",
    "url": "https://www.aihireflow.in/",
    "description": "AI-powered career operating system for ATS resume analysis, AI resume building, job matching, interview simulation, and career roadmaps.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.aihireflow.in/ai-job-search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/dashboard');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="flex flex-col bg-background text-ink selection:bg-accent selection:text-black overflow-hidden min-h-screen">
      <SEOHead 
        title="AI HireFlow | AI-Powered Career Operating System"
        description="AI HireFlow is the complete AI career platform. Check ATS resume compatibility, build ATS-friendly resumes, practice AI mock interviews, find matched jobs, and create career roadmaps."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center justify-center border-b border-border">
        {/* Ambient Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] -z-10 opacity-50 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[20%] w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 bg-surface px-4 py-1.5 rounded-full text-accent text-xs font-mono font-bold uppercase tracking-widest mb-10 border border-border"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI CAREER OPERATING SYSTEM
          </motion.div>
          
          <h1 className="font-sans font-black text-5xl sm:text-7xl md:text-8xl tracking-tight text-ink leading-[0.98] mb-8 max-w-4xl mx-auto">
            Engineering your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-emerald-400 to-teal-300">perfect career</span> with AI.
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-ink-dim max-w-2xl mx-auto mb-12 font-sans font-normal leading-relaxed">
            Next-generation resume intelligence, precision matching, and live-cycle interview simulations. An all-in-one platform built to streamline ATS resume scanning, resume building, semantic job search, and career progression.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            
            <a 
              href="#tools"
              className="text-ink-dim hover:text-ink px-8 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              Explore Capabilities
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> ATS Resume Scanner</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> AI Resume Builder</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Mock Interview Lab</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Career Roadmaps</span>
          </div>
        </div>
      </section>

      {/* Section 2: What is AI HireFlow? */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Platform Overview</h2>
            <p className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight">What Is AI HireFlow?</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              AI HireFlow is a unified, intelligent career workspace built to replace disconnected job search tools. We empower candidates by combining resume diagnostics, ATS formatting standards, simulated interview practice, and targeted job discovery in one cohesive system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">The Problem We Solve</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Job seekers often apply blindly to hundreds of postings with unparsed resumes, unclear keyword alignment, and inadequate interview preparation, leading to low callback rates and burnout.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">How AI Is Used Responsibly</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                AI HireFlow uses deterministic algorithms and advanced language models to evaluate technical keyword coverage, rewrite bullet points with STAR impact metrics, and conduct realistic mock interview simulations.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Who It Is Designed For</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Engineered for software engineers, university graduates, active job applicants, and career transitioners looking to present their genuine capabilities with maximum clarity and impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: AI Career Tools / Capabilities */}
      <section id="tools" className="py-28 px-4 sm:px-6 lg:px-8 border-b border-border relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.3em] mb-3">SYSTEM CAPABILITIES</h2>
            <p className="text-3xl md:text-4xl font-sans font-black text-ink tracking-tight uppercase">High-Performance Career Operations</p>
            <p className="text-sm text-ink-dim mt-4">Every tool is engineered with precision pipelines to accelerate your placement cycle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tool 1: ATS Resume Checker */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">ATS Resume Checker</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Deep-layer mapping of ATS compatibility, keyword density audits, and professional impact scoring with transparent mathematical explanations.
                </p>
              </div>
              <Link 
                to="/ats-resume-checker" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider"
              >
                Learn More About ATS Checker <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tool 2: AI Resume Builder */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <FileEdit className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">AI Resume Builder</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Create clean, single-column ATS-friendly resumes. Elevate bullet points with quantifiable STAR metrics and export instant PDFs.
                </p>
              </div>
              <Link 
                to="/resume-builder" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider"
              >
                Learn More About Resume Builder <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tool 3: AI Interview Preparation */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">AI Interview Practice</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Conduct dynamic mock interviews with real-time feedback on technical accuracy, STAR behavioral structure, clarity, and conciseness.
                </p>
              </div>
              <Link 
                to="/ai-interview-preparation" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider"
              >
                Learn More About Mock Interviews <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tool 4: AI Job Search */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">AI Job Search & Match</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Semantic job discovery that compares candidate skills against role requirements to deliver objective compatibility scores.
                </p>
              </div>
              <Link 
                to="/ai-job-search" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider"
              >
                Learn More About Job Matching <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tool 5: Career Roadmap */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Career Roadmap</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Automatically identify technical skill gaps and map milestone-driven learning steps backed by curated courses and projects.
                </p>
              </div>
              <Link 
                to="/career-roadmap" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider"
              >
                Learn More About Roadmaps <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tool 6: Pipeline Tracker */}
            <div className="bg-surface border border-border p-8 rounded-lg flex flex-col justify-between hover:border-accent/40 transition-all group">
              <div>
                <div className="bg-surface-light p-3 rounded-lg border border-border text-accent mb-6 inline-flex">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Application Pipeline Tracker</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-6">
                  Interactive Kanban board tracking applications from initial scan to phone screen, technical loops, and final offers.
                </p>
              </div>
              <button 
                onClick={handleLaunch}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent hover:underline uppercase tracking-wider text-left cursor-pointer"
              >
                Launch Tracker In App <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How AI HireFlow Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Operating Cycle</h2>
            <p className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight">How AI HireFlow Works</p>
            <p className="text-sm text-ink-dim mt-3">A streamlined 4-step workflow to elevate your job search readiness.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Scan & Diagnose",
                desc: "Run an instant ATS scan on your current resume to uncover keyword gaps, metric density, and parsing issues."
              },
              {
                step: "02",
                title: "Build & Optimize",
                desc: "Use the resume builder to structure clean single-column layouts with high-impact STAR formulation bullets."
              },
              {
                step: "03",
                title: "Practice & Search",
                desc: "Rehearse role-specific technical and behavioral questions in mock interviews while discovering high-match jobs."
              },
              {
                step: "04",
                title: "Level Up & Track",
                desc: "Follow curated skill roadmaps to close technical gaps and track your application pipeline on the Kanban board."
              }
            ].map((st, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-lg">
                <div className="text-3xl font-mono font-black text-accent mb-3">{st.step}</div>
                <h3 className="text-base font-bold text-ink mb-2">{st.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Who is AI HireFlow For? */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Designed For High Performers</h2>
            <p className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight">Who Is AI HireFlow For?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-sm font-bold text-ink mb-2">Students & New Grads</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Translate academic coursework and capstone projects into ATS-ready professional bullets for campus recruitment.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-sm font-bold text-ink mb-2">Active Job Seekers</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Avoid generic blast applications. Tailor your resume specifically for high-match opportunities and track stages.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-sm font-bold text-ink mb-2">Software Engineers</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Highlight microservices, system architectures, and performance metrics while practicing technical mock rounds.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-lg">
              <h3 className="text-sm font-bold text-ink mb-2">Career Switchers</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Identify transferable skills, follow milestone-driven roadmaps, and rebuild your resume for new technical domains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Frequently Asked Questions</h2>
            <p className="text-3xl sm:text-4xl font-sans font-black text-ink uppercase tracking-tight">Platform FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What makes AI HireFlow different from standard job boards?",
                a: "AI HireFlow is a comprehensive career operating system. Instead of merely listing vacancies, we provide tools to diagnose ATS resume readability, rewrite bullets, simulate realistic mock interviews, and track your ongoing application pipeline."
              },
              {
                q: "Are the ATS tools free to use?",
                a: "Yes. You can scan your resume, audit ATS compatibility, practice interviews, and generate career roadmaps directly within the platform."
              },
              {
                q: "How does the AI evaluate my resume?",
                a: "AI HireFlow uses transparent mathematical scoring across 4 core dimensions: Core technical skill coverage (40%), Quantifiable impact metrics (30%), Role seniority relevance (15%), and Structural ATS parsability (15%)."
              },
              {
                q: "Does AI HireFlow guarantee a job?",
                a: "No automated platform can guarantee employment. AI HireFlow is built to equip you with clear, high-impact application materials and interview practice so you can represent your abilities effectively."
              },
              {
                q: "Is my personal career information secure?",
                a: "Yes. All profile, resume, and application data is securely partitioned under your authenticated Google account and is never sold to third parties."
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

      {/* Section 7: Final CTA */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-sans font-black text-ink uppercase tracking-tight mb-4">
            Ready to Engineer Your Career?
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-10 max-w-xl mx-auto">
            Join candidates using AI HireFlow to audit resumes, practice interviews, and match with the right jobs.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-10 py-5 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Get Started Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
