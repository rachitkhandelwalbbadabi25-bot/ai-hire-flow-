import { motion } from 'motion/react';
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
  FileEdit
} from 'lucide-react';

export default function ATSResumeCheckerSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow ATS Resume Checker",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Free ATS resume scanner and audit tool. Analyze resume keywords, formatting, structure, and job description alignment using AI."
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
        title="Free ATS Resume Checker | AI HireFlow"
        description="Scan your resume with AI HireFlow's free ATS resume checker. Get instant feedback on keyword gaps, formatting issues, impact metrics, and job match relevance."
        canonicalPath="/ats-resume-checker"
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
            <FileSearch className="w-3.5 h-3.5" /> ATS Resume Scanner & Diagnostic
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-ink leading-[1.05] mb-6">
            Free ATS Resume Checker
          </h1>

          <p className="text-base sm:text-lg text-ink-dim max-w-2xl mx-auto mb-10 leading-relaxed">
            Audit your resume against modern Applicant Tracking Systems. Discover missing technical keywords, fix formatting flaws, and align your experience directly with target job descriptions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleLaunch}
              className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Scan Your Resume Free <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#how-it-works"
              className="text-ink-dim hover:text-ink px-6 py-4 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              How It Works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-dim font-mono">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Zero hidden paywalls</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Keyword match analysis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Transparent scoring math</span>
          </div>
        </div>
      </section>

      {/* What is an ATS & Why it matters */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Understanding ATS</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">What Is An ATS & Why Does Compatibility Matter?</p>
            <p className="text-sm text-ink-dim mt-3">Applicant Tracking Systems are automated recruitment tools used by hiring teams to parse, categorize, and rank resumes before a human recruiter reads them.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-3">Why Standard Resumes Get Filtered Out</h3>
              <p className="text-sm text-ink-dim leading-relaxed mb-4">
                Many qualified candidates get rejected simply because their resumes cannot be parsed cleanly. Complex multi-column tables, graphics, non-standard section titles, or missing domain keywords prevent ATS parsers from recognizing core qualifications.
              </p>
              <ul className="space-y-2 text-xs text-ink-dim">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span> Missing critical tech stack keywords listed in the job post
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span> Vague bullet points lacking measurable metrics and outcomes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">•</span> Unparsable layout formats that scramble work history dates
                </li>
              </ul>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-3">How AI HireFlow Optimizes Your Resume</h3>
              <p className="text-sm text-ink-dim leading-relaxed mb-4">
                AI HireFlow analyzes your resume against 4 foundational pillars: technical skill coverage, measurable impact density, role relevance, and structural ATS readability.
              </p>
              <ul className="space-y-2 text-xs text-ink-dim">
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span> Pinpoints exact missing keywords with semantic context
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span> Suggests concrete bullet rewrites with STAR impact metrics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span> Provides a deterministic 0-100 score breakdown with math explanations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What AI HireFlow Analyzes */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Audit Breakdown</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">4 Core Evaluation Pillars</p>
            <p className="text-sm text-ink-dim mt-3">Our analysis evaluates your resume through an objective, weighted mathematical framework.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                weight: "40% Weight",
                title: "Skill & Keyword Match",
                desc: "Scans for required programming languages, frameworks, cloud tools, and domain keywords mentioned in the target role."
              },
              {
                icon: BarChart3,
                weight: "30% Weight",
                title: "Impact & Hard Metrics",
                desc: "Audits your bullet points for quantifiable numbers, percentages, latency reductions, revenue gains, and scale metrics."
              },
              {
                icon: Layers,
                weight: "15% Weight",
                title: "Role Relevance",
                desc: "Evaluates the depth and progression of your experience relative to the seniority and core expectations of the position."
              },
              {
                icon: ShieldCheck,
                weight: "15% Weight",
                title: "ATS Parsability",
                desc: "Checks section header clarity, chronological hierarchy, contact readability, and bullet formatting consistency."
              }
            ].map((pillar, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <pillar.icon className="w-5 h-5 text-accent" />
                    <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                      {pillar.weight}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink mb-2">{pillar.title}</h3>
                  <p className="text-xs text-ink-dim leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Step-by-Step */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Step-by-Step Process</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">How To Check Your Resume In 3 Simple Steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface border border-border p-8 rounded-lg relative">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">01</div>
              <h3 className="text-base font-bold text-ink mb-2">Paste or Upload Your Resume</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Paste your resume text or upload your document. AI HireFlow extracts the raw content just like an enterprise ATS parser would.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg relative">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">02</div>
              <h3 className="text-base font-bold text-ink mb-2">Add Target Job (Optional)</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Provide a job description to perform deep semantic role matching and discover exact keyword gaps for that specific opening.
              </p>
            </div>

            <div className="bg-surface border border-border p-8 rounded-lg relative">
              <div className="text-3xl font-mono font-black text-accent/30 mb-4">03</div>
              <h3 className="text-base font-bold text-ink mb-2">Review Detailed Audit & Fixes</h3>
              <p className="text-xs text-ink-dim leading-relaxed">
                Get an actionable breakdown with verified skills found, missing keywords, bullet point rewrite recommendations, and formatting advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who Should Use This Tool */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Audience</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">Who Is The ATS Resume Checker For?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Job Seekers & Applicants",
                desc: "Ensure your resume passes ATS screeners before submitting applications to high-volume job postings."
              },
              {
                title: "Software Engineers & Tech",
                desc: "Confirm your tech stack, system architecture achievements, and tools match the exact requirements of engineering teams."
              },
              {
                title: "Students & Recent Graduates",
                desc: "Format campus projects, coursework, and internships with high impact metrics to stand out with limited experience."
              },
              {
                title: "Career Changers",
                desc: "Identify transferable skills and reframe previous background using industry-standard terminology."
              },
              {
                title: "Senior Leaders & Managers",
                desc: "Audit executive resumes for leadership metrics, team scaling achievements, and business impact."
              },
              {
                title: "Campus Placement Candidates",
                desc: "Prepare standardized, clean resumes tailored for high-volume campus hiring drives."
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

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-[0.2em] mb-3">Frequently Asked Questions</h2>
            <p className="text-2xl sm:text-3xl font-sans font-black text-ink uppercase tracking-tight">ATS Resume Checker FAQs</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is an ATS resume score?",
                a: "An ATS resume score is an objective evaluation of how well your resume matches standard applicant tracking criteria, including keyword coverage, work impact metrics, section formatting, and role relevance."
              },
              {
                q: "Will an ATS score guarantee that I get an interview?",
                a: "No automated tool can guarantee an interview or job offer. An ATS check ensures your resume is easily parsed, clearly formatted, and properly keyword-aligned so human hiring managers can review your real qualifications without being tripped up by parsing errors."
              },
              {
                q: "What formatting works best for ATS parsers?",
                a: "Clean, single-column layouts with standard font families, clear chronological job history headers, standard section titles (e.g., 'Work Experience', 'Education', 'Skills'), and bullet points starting with strong action verbs."
              },
              {
                q: "Is my resume data kept private?",
                a: "Yes. Your resume data is stored securely under your authenticated profile and is never sold or used for public data training."
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
            <p className="text-xl sm:text-2xl font-sans font-black text-ink uppercase tracking-tight">Explore More AI HireFlow Tools</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/resume-builder" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <FileEdit className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Resume Builder</h3>
              <p className="text-[11px] text-ink-dim">Build ATS-friendly resumes with guided bullet enhancements.</p>
            </Link>

            <Link to="/ai-job-search" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Briefcase className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Job Search</h3>
              <p className="text-[11px] text-ink-dim">Match your verified skills with relevant open positions.</p>
            </Link>

            <Link to="/ai-interview-preparation" className="bg-surface border border-border p-5 rounded-lg hover:border-accent/40 transition-all group">
              <Mic className="w-5 h-5 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-ink mb-1">AI Interview Practice</h3>
              <p className="text-[11px] text-ink-dim">Simulate real-time technical and behavioral interviews.</p>
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
            Audit Your Resume with AI HireFlow Today
          </h2>
          <p className="text-sm sm:text-base text-ink-dim mb-8 max-w-xl mx-auto">
            Get instant visibility into what hiring systems see. Fix parsing issues and missing keywords in seconds.
          </p>
          <button
            onClick={handleLaunch}
            className="bg-accent text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2 cursor-pointer"
          >
            Start Free ATS Scan <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
