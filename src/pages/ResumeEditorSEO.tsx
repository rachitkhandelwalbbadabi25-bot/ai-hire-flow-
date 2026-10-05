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
  Eye,
  Search
} from 'lucide-react';

export default function ResumeEditorSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Resume Editor",
    "url": "https://www.aihireflow.in/resume-editor",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Interactive ATS resume editor and builder. Structure professional resumes, polish bullet points with AI assistance, and export clean, single-column PDFs."
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
        title="AI Resume Editor | ATS-Compliant Resume Builder — AI HireFlow"
        description="Create and edit ATS-compliant resumes with AI HireFlow's AI Resume Editor. Transform bullet points with STAR impact metrics, single-column formatting, and instant PDF download."
        canonicalPath="/resume-editor"
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
            AI Resume Editor
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Craft beautiful, ATS-optimized resumes engineered for recruiter review. Upgrade your bullets with quantifiable impact metrics, maintain clean section hierarchy, and download ready-to-submit PDFs instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Open Resume Editor <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#editor-features"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              Key Features
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> ATS Single-Column Layouts</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> STAR Action Verb Upgrades</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Pixel-Perfect PDF Export</span>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="editor-features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-3">Precision Formatting</h2>
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">Built Specifically for Modern ATS Algorithms</p>
            <p className="text-sm text-ink-dim mt-4 leading-relaxed">
              Fancy multi-column templates, graphics, and tables often get corrupted when ingested by enterprise ATS parsers like Workday, Greenhouse, and Lever. The AI HireFlow Resume Editor enforces clean single-column structure and standard semantic tags that parse with 100% fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Clean ATS Hierarchy</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Standardized section headers (Experience, Technical Skills, Education, Projects) guarantee seamless parsing across any enterprise hiring portal.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">AI Writing Assistant</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Select any bullet to transform passive task descriptions into strong, outcome-oriented statements featuring action verbs and verifiable business scope.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Instant Clean PDF Export</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Export ATS-friendly, high-resolution vector PDFs with consistent typography, proper margins, and zero layout shift.
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
            <p className="text-3xl font-sans font-black text-ink uppercase tracking-tight">How the Resume Editor Works</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Import or Start Clean",
                desc: "Import your current resume to auto-populate existing sections, or start fresh with our optimized template."
              },
              {
                step: "02",
                title: "Refine Sections & Experience",
                desc: "Organize work history, technical proficiencies, education, and notable engineering projects with intuitive reordering."
              },
              {
                step: "03",
                title: "Apply AI Bullet Enhancements",
                desc: "Leverage AI guidance to strengthen metrics, emphasize technical stack ownership, and align phrasing with target roles."
              },
              {
                step: "04",
                title: "Preview & Download PDF",
                desc: "Live dual-pane preview lets you see exactly how recruiters and automated parsers will render your finalized resume."
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
              Start Editing Your Resume <ArrowRight className="w-4 h-4" />
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
            <Link to="/resume-analyzer" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <FileSearch className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Resume Analyzer</h3>
                <p className="text-xs text-ink-dim">Audit your resume for missing keywords, ATS formatting errors, and role alignment scores.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Run Resume Audit <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/job-tracker" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <Briefcase className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Job Tracker</h3>
                <p className="text-xs text-ink-dim">Organize your application pipeline, schedule interviews, and track recruiter communications.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">Track Applications <ArrowRight className="w-3.5 h-3.5" /></span>
            </Link>

            <Link to="/career-advisor" className="p-6 bg-surface border border-border rounded-xl hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div>
                <GraduationCap className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-bold text-ink mb-1 group-hover:text-accent transition-colors">AI Career Advisor</h3>
                <p className="text-xs text-ink-dim">Generate personalized skill roadmaps and course recommendations to close technical gaps.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent mt-4">View Career Advisor <ArrowRight className="w-3.5 h-3.5" /></span>
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
              <h3 className="text-sm font-bold text-ink mb-2">Why is single-column layout recommended for ATS?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Many ATS parsers read resumes top-to-bottom and left-to-right. Dual columns can cause text to merge across columns (e.g. putting dates into job descriptions), creating garbled parsing. Single-column layouts ensure 100% linear text reading.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Can I export multiple tailored versions?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes. You can duplicate or modify your Master Resume for different target positions and export tailored versions anytime.
              </p>
            </div>

            <div className="bg-surface border border-border p-6 rounded-xl">
              <h3 className="text-sm font-bold text-ink mb-2">Is the Resume Editor free to use?</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Yes! Structuring and downloading your resume is completely free. AI bullet assistance uses included initial credits.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
