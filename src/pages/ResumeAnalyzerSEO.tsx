import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { 
  FileSearch, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Search, 
  Layers, 
  BarChart3, 
  HelpCircle,
  Briefcase,
  Mic,
  GraduationCap,
  FileEdit,
  Sparkles
} from 'lucide-react';

export default function ResumeAnalyzerSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Resume Analyzer",
    "url": "https://www.aihireflow.in/resume-analyzer",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Enterprise-grade ATS resume analyzer and auditor. Scan resumes for keyword gaps, formatting parseability, impact metrics, and job alignment with explainable scoring."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/analyzer');
      return;
    }
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/analyzer');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="AI Resume Analyzer | ATS Compatibility & Keyword Audit — AI HireFlow"
        description="Analyze your resume with AI HireFlow's advanced AI Resume Analyzer. Get instant ATS compatibility scores, keyword gap audits, metric density evaluations, and actionable bullet rewrites."
        canonicalPath="/resume-analyzer"
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
            <FileSearch className="w-3.5 h-3.5" /> AI Resume Intelligence Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            AI Resume Analyzer
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Audit your resume with senior recruiter rigor. Detect missing technical keywords, eliminate ATS parsing roadblocks, evaluate quantifiable impact metrics, and optimize your qualifications for target positions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Try Resume Analyzer <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#how-it-works"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> 4-Category Weighted Math</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Keyword Gap Isolation</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Evidence-Grounded Rewrites</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Diagnostic Intelligence</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Why Standard ATS Checkers Fail Job Seekers</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              Most online resume checkers give arbitrary 0-100 scores based on simple word count or keyword stuffing. AI HireFlow operates like a senior technical hiring manager: analyzing deep semantic skills, verifying project evidence, and calculating transparent, weighted category scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Mathematical Transparency</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Scores are divided into four clear categories: Core Technical Match (40%), Measurable Impact (25%), Role Relevance (20%), and Structure (15%). No hidden formulas or artificial clamping.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Evidence-Grounded Rewrites</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                The analyzer never fabricates fake projects or metrics. Instead, it extracts your real experience bullets and provides truthful, tailored upgrades that highlight delivered value.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Recruiter-Grade Advice</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Gaps are categorized into direct evidence, transferable experience, or genuine gaps, delivering distinct, situational recommendations rather than repetitive templates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Audit Process</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the Resume Analyzer Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Upload Resume or Paste Text",
                desc: "Upload PDF or DOCX files or select your saved Master Resume profile. Our parser strips formatting noise and normalizes sections."
              },
              {
                step: "02",
                title: "Provide Target Job Description",
                desc: "Paste the exact job description you are targeting. The analyzer extracts required technical qualifications, hard requirements, and domain preferences."
              },
              {
                step: "03",
                title: "Run Deep-Layer ATS Audit",
                desc: "AI HireFlow evaluates keyword density, explicit vs. inferred skills, quantifiable metrics, and single-column ATS parsability."
              },
              {
                step: "04",
                title: "Implement High-Impact Upgrades",
                desc: "Review your detailed 12-section audit memo, copy evidence-based bullet rewrites, and push improvements directly into the Resume Editor."
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
              Analyze Your Resume Now <ArrowRight className="w-4 h-4" />
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
            <Link to="/resume-editor" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileEdit className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Editor</h3>
                <p className="text-xs text-ink-dim">Apply analyzed recommendations and build single-column ATS resumes with instant PDF export.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Open Resume Editor <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/job-finder" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Search className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Job Finder</h3>
                <p className="text-xs text-ink-dim">Discover targeted openings and run automated skill match comparisons before applying.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Find Relevant Jobs <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/interview-lab" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Mic className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Interview Lab</h3>
                <p className="text-xs text-ink-dim">Rehearse technical and behavioral interview questions tailored to your target job profile.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Start Interview Lab <ArrowRight className="w-3.5 h-3.5" /></span>
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
              <h3 className="text-sm font-bold text-ink mb-2">How does AI HireFlow calculate the ATS Compatibility Score?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Our engine uses an authoritative 4-category weighted breakdown: Core Technical & Skill Match (40%), Measurable Impact & Hard Metrics (25%), Role & Domain Relevance (20%), and Structure & ATS Parsability (15%). Category points sum exactly to your final score without arbitrary inflation.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Does the analyzer invent fake metrics or experience?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Never. Every recommendation, bullet rewrite, and skill gap is anchored strictly in the content of your resume. If a verified metric is missing, the tool prompts you to add a real figure rather than inventing fabricated statistics.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is the Resume Analyzer free to try?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes! Every new account receives free AI analysis credits to scan resumes, inspect keyword gaps, and review full recruiter audit reports.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
