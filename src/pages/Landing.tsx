import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import SEOHead from '../components/SEOHead';
import { 
  FileSearch, 
  Target, 
  Briefcase, 
  ArrowRight, 
  FileEdit, 
  Mic, 
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  Compass,
  FileText,
  Check,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openUpgradeModal } = usePlan();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AI HireFlow",
    "url": "https://www.aihireflow.in/",
    "description": "Career platform for ATS resume analysis, resume building, job matching, interview simulation, and career roadmaps.",
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
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', error);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  const handlePlanAction = (planId: 'free' | 'pro' | 'premium') => {
    if (!user) {
      handleLaunch();
      return;
    }
    if (planId === 'free') {
      navigate('/dashboard');
    } else {
      openUpgradeModal(planId);
    }
  };

  const faqItems = [
    {
      q: "What makes AI HireFlow different from standard job boards?",
      a: "AI HireFlow is a comprehensive career operating system. Instead of merely listing vacancies, we provide tools to diagnose ATS resume readability, rewrite bullets, simulate realistic mock interviews, and track your ongoing application pipeline."
    },
    {
      q: "Are the ATS tools free to use?",
      a: "Yes. You can scan your resume, audit ATS compatibility, practice interviews, and generate career roadmaps directly within the platform."
    },
    {
      q: "How does the platform evaluate my resume?",
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
  ];

  return (
    <div className="flex flex-col bg-[var(--hf-bg)] text-[var(--hf-text)] selection:bg-[var(--hf-cta)] selection:text-white min-h-screen">
      <SEOHead 
        title="AI HireFlow | Career Platform for Resume Analysis, Job Search & Interview Prep"
        description="Check ATS resume compatibility, build single-column resumes, practice technical mock interviews, find matched jobs, and map out career roadmaps."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* 1. Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)] shadow-2xs mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-cta)]" />
              <span>ATS Diagnostics · Resume Engineering · Job Discovery</span>
            </div>

            <h1 className="font-sans font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.08] mb-5">
              Make every application more intentional.
            </h1>

            <p className="text-base sm:text-lg text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              Audit your resume against a transparent 4-factor rubric, rewrite weak experience bullets with measurable outcomes, discover live roles that fit your stack, and rehearse before the interview.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isLaunching}
                className="hf-btn-primary min-h-[46px] px-6 text-sm font-medium w-full sm:w-auto gap-2 disabled:opacity-60"
              >
                <span>{isLaunching ? 'Signing in...' : 'Analyze your resume'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#workflow"
                className="hf-btn-secondary min-h-[46px] px-6 text-sm font-medium w-full sm:w-auto"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--hf-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--hf-success)]" /> PDF &amp; DOCX parsing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--hf-success)]" /> Documented 4-weight rubric
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--hf-success)]" /> Free daily credit allowance
              </span>
            </div>
          </div>

          {/* Hero Visual: Authentic Application Workbench Frame */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="max-w-5xl mx-auto"
          >
            <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface)] shadow-lg overflow-hidden">
              {/* Window Chrome Bar */}
              <div className="px-4 py-3 bg-[var(--hf-surface-secondary)] border-b border-[var(--hf-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--hf-border-hover)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--hf-border-hover)]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--hf-border-hover)]" />
                  </div>
                  <div className="h-3.5 w-[1px] bg-[var(--hf-border)]" />
                  <div className="flex items-center gap-2 text-xs text-[var(--hf-text-secondary)] font-medium">
                    <FileText className="w-3.5 h-3.5 text-[var(--hf-text-muted)]" />
                    <span>resume_senior_frontend_2026.pdf</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--hf-text-muted)]">Example diagnostic report</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)]">
                    Senior Frontend Engineer
                  </span>
                </div>
              </div>

              {/* Workbench Body */}
              <div className="p-5 sm:p-7 space-y-6">
                {/* Score Summary Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--hf-border)]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">
                        Composite Match Score
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20">
                        Strong Alignment
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--hf-text)]">
                      Evaluated against Senior Frontend Engineer requisition
                    </h2>
                  </div>

                  <div className="flex items-baseline gap-2 bg-[var(--hf-surface-secondary)] px-4 py-2.5 rounded-lg border border-[var(--hf-border)] self-start md:self-center">
                    <span className="text-3xl font-bold text-[var(--hf-text)] tabular-nums tracking-tight">82</span>
                    <span className="text-xs font-medium text-[var(--hf-text-muted)]">/ 100</span>
                  </div>
                </div>

                {/* 4 Rubric Pillars with Progress Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Core Technical Skills",
                      weight: "40% weight",
                      score: 85,
                      note: "React, TypeScript, Next.js, GraphQL verified",
                      barColor: "bg-[var(--hf-cta)]"
                    },
                    {
                      label: "Quantified Impact",
                      weight: "30% weight",
                      score: 75,
                      note: "5 of 8 bullets contain hard metrics",
                      barColor: "bg-[var(--hf-warning)]"
                    },
                    {
                      label: "Role Seniority Scope",
                      weight: "15% weight",
                      score: 84,
                      note: "Architecture & ownership evidenced",
                      barColor: "bg-[var(--hf-success)]"
                    },
                    {
                      label: "ATS Parsability",
                      weight: "15% weight",
                      score: 86,
                      note: "Single-column, clean date hierarchy",
                      barColor: "bg-[var(--hf-success)]"
                    }
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--hf-text-secondary)]">{item.label}</span>
                        <span className="text-[11px] text-[var(--hf-text-muted)]">{item.weight}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-[var(--hf-text)] tabular-nums">{item.score}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--hf-border)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.barColor}`} style={{ width: `${item.score}%` }} />
                      </div>
                      <p className="text-[11px] text-[var(--hf-text-secondary)] leading-snug">{item.note}</p>
                    </div>
                  ))}
                </div>

                {/* Keyword Coverage & Priority Action */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
                  <div className="lg:col-span-7 p-4 rounded-lg bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--hf-text)]">Requirement Keyword Audit</span>
                      <span className="text-[11px] text-[var(--hf-text-muted)]">6 matched · 2 missing</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['React 18', 'TypeScript', 'GraphQL', 'Next.js', 'CI/CD', 'Design Systems'].map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-border)]">
                          <Check className="w-3 h-3 text-[var(--hf-success)]" /> {kw}
                        </span>
                      ))}
                      {['Web Vitals', 'Bundle Analysis'].map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-[var(--hf-warning)] border border-amber-500/25">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-4 rounded-lg bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] flex items-start gap-3">
                    <div className="p-2 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">Priority Revision</p>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 leading-relaxed">
                        Quantify latency reduction and bundle optimization outcomes in your current role bullets to raise Impact score from 75% to 88%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Three-Step Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Workflow Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              A structured system from resume audit to offer.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Instead of scattered browser tabs and generic chat prompts, every stage of your job search shares context automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[var(--hf-cta)] px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    STEP 01
                  </span>
                  <span className="text-xs text-[var(--hf-text-muted)]">Diagnostics</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)]">Upload and diagnose</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Parse your PDF or DOCX resume against a specific job description to uncover missing technical keywords, vague phrasing, and structural formatting issues.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs text-[var(--hf-text-muted)]">
                <span>Outputs 4-pillar rubric</span>
                <Link to="/resume-analyzer" className="text-[var(--hf-cta)] font-medium hover:underline">Explore →</Link>
              </div>
            </div>

            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[var(--hf-cta)] px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    STEP 02
                  </span>
                  <span className="text-xs text-[var(--hf-text-muted)]">Refinement</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)]">Engineer strong bullets</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Transform passive responsibility lists into high-impact accomplishment statements using the XYZ/STAR structure inside a clean single-column editor.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs text-[var(--hf-text-muted)]">
                <span>Exports ATS-clean PDF</span>
                <Link to="/resume-editor" className="text-[var(--hf-cta)] font-medium hover:underline">Explore →</Link>
              </div>
            </div>

            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[var(--hf-cta)] px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    STEP 03
                  </span>
                  <span className="text-xs text-[var(--hf-text-muted)]">Execution</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)]">Discover, rehearse &amp; track</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Search live job openings ranked by compatibility, practice role-specific technical interviews with rubric feedback, and track every stage on your Kanban board.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs text-[var(--hf-text-muted)]">
                <span>Live JSearch + Kanban</span>
                <Link to="/job-finder" className="text-[var(--hf-cta)] font-medium hover:underline">Explore →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Transparent Scoring & Bullet Engineering Diff */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Bullet Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
                Experience Engineering
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
                Turn passive task lists into verifiable impact.
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Most resumes fail initial screening because they describe duties rather than outcomes. Our writing assistant restructures bullets around action verbs, technical scope, and measurable delivery metrics.
              </p>
              <div className="pt-2">
                <Link
                  to="/resume-editor"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-cta)] hover:underline"
                >
                  <span>Inspect the Resume Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-4">
              {/* Before Card */}
              <div className="hf-card p-5 border-l-4 border-l-rose-500/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-error)]">
                    <X className="w-3.5 h-3.5" /> Original Draft
                  </span>
                  <span className="text-[11px] text-[var(--hf-text-muted)]">Weak verb · Unmeasured claim</span>
                </div>
                <p className="text-sm text-[var(--hf-text-secondary)] bg-[var(--hf-surface-secondary)] p-3.5 rounded-lg border border-[var(--hf-border)] font-sans">
                  &ldquo;Worked on the customer dashboard and improved page loading performance.&rdquo;
                </p>
              </div>

              {/* After Card */}
              <div className="hf-card p-5 border-l-4 border-l-[var(--hf-success)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-success)]">
                    <Check className="w-3.5 h-3.5" /> Engineered Revision (XYZ Framework)
                  </span>
                  <span className="text-[11px] text-[var(--hf-text-muted)]">Action + Scope + Metric</span>
                </div>
                <p className="text-sm text-[var(--hf-text)] bg-[var(--hf-surface-secondary)] p-3.5 rounded-lg border border-[var(--hf-border)] font-medium font-sans leading-relaxed">
                  &ldquo;Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.&rdquo;
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--hf-text-secondary)]">
                  <span className="px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    <strong>Verb:</strong> Architected
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    <strong>Scope:</strong> React data-fetching &amp; bundle splitting
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                    <strong>Impact:</strong> -42% latency (120k MAU)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Rubric Disclosure */}
          <div className="hf-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--hf-border)]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
                  Evaluation Methodology
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--hf-text)] mt-0.5">
                  Transparent scoring, not black-box guesses
                </h3>
              </div>
              <span className="text-xs text-[var(--hf-text-secondary)]">
                Weighted 100-point diagnostic model
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--hf-text)]">1. Core Technical Skills</span>
                  <span className="font-mono font-semibold text-[var(--hf-cta)]">40% Weight</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                  Measures hard skill, framework, and tooling overlap against the target job description while flagging missing critical competencies.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--hf-text)]">2. Quantifiable Impact Metrics</span>
                  <span className="font-mono font-semibold text-[var(--hf-cta)]">30% Weight</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                  Audits experience bullets for concrete numbers, percentages, scale indicators, and business outcomes rather than passive task descriptions.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--hf-text)]">3. Role Seniority Relevance</span>
                  <span className="font-mono font-semibold text-[var(--hf-cta)]">15% Weight</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                  Evaluates leadership signals, system ownership, cross-functional scope, and tenure alignment with the target role level.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--hf-text)]">4. Structural ATS Parsability</span>
                  <span className="font-mono font-semibold text-[var(--hf-cta)]">15% Weight</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                  Verifies clean section headers, standard chronological date formats, machine-readable text encoding, and absence of multi-column layout traps.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] text-xs text-[var(--hf-text-secondary)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Methodology note:</strong> Employer ATS configurations vary across platforms (Workday, Greenhouse, Lever, Ashby). Diagnostic scores reflect documented heuristic rubrics and semantic alignment, not automated hiring decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Six Core Feature Modules */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Platform Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              Six connected modules in one workspace.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Each module is purpose-built for a specific stage of the hiring funnel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: FileSearch,
                title: "Resume Analyzer",
                category: "Diagnostics",
                desc: "ATS compatibility audit, technical keyword density mapping, and 4-factor scoring with line-by-line revision guidance.",
                link: "/resume-analyzer",
                linkLabel: "Explore Resume Analyzer"
              },
              {
                icon: FileEdit,
                title: "Resume Editor",
                category: "Authoring",
                desc: "Clean single-column ATS resume builder with inline XYZ bullet rewriting, section management, and instant PDF export.",
                link: "/resume-editor",
                linkLabel: "Explore Resume Editor"
              },
              {
                icon: Briefcase,
                title: "Job Finder",
                category: "Discovery",
                desc: "Search live external job postings with automatic candidate compatibility scoring computed directly from your resume.",
                link: "/job-finder",
                linkLabel: "Explore Job Finder"
              },
              {
                icon: Target,
                title: "Application Tracker",
                category: "Pipeline",
                desc: "Structured Kanban pipeline to organize applications across Applied, Interview, Offer, and Rejected stages.",
                link: "/job-tracker",
                linkLabel: "Explore Job Tracker"
              },
              {
                icon: Compass,
                title: "Career Roadmap",
                category: "Skill Development",
                desc: "30-day technical study plans and milestone projects designed to close skill gaps identified during your resume audit.",
                link: "/career-advisor",
                linkLabel: "Explore Career Roadmap"
              },
              {
                icon: Mic,
                title: "Interview Lab",
                category: "Preparation",
                desc: "Role-specific technical and behavioral mock interviews with structured rubric evaluation and model answers.",
                link: "/interview-lab",
                linkLabel: "Explore Interview Lab"
              }
            ].map((mod) => (
              <div key={mod.title} className="hf-card p-6 flex flex-col justify-between space-y-5 hover:border-[var(--hf-border-hover)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text)] flex items-center justify-center">
                      <mod.icon className="w-4 h-4 text-[var(--hf-cta)]" />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--hf-text-muted)]">
                      {mod.category}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--hf-text)]">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
                <Link 
                  to={mod.link}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-cta)] hover:underline pt-2 border-t border-[var(--hf-border)]"
                >
                  <span>{mod.linkLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Trust & Data Governance */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Data Governance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              Privacy, accuracy, and clear expectations.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
              Career software handles sensitive professional records. Here is how we protect your data and keep you in control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Account-scoped isolation</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Authentication is managed via Firebase Authentication. Your uploaded resumes, search preferences, and job tracker records are isolated strictly to your account.
              </p>
              <Link to="/privacy" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-1">
                <span>Read privacy policy</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-warning)]">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Candidate-reviewed edits</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Automated suggestions never overwrite your master resume without explicit confirmation. Always verify technical phrasing and metrics before submitting applications.
              </p>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-success)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">No exaggerated claims</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                No software can guarantee interviews or hiring outcomes. HireFlow is an engineering and preparation workbench to help you present your genuine qualifications clearly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Table */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Pricing &amp; Plans
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              Straightforward, predictable pricing.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Start on the Free tier with daily renewing credits, or upgrade when your job search volume increases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.free.name}</h3>
                  <span className="hf-badge text-[11px]">Starter</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.free.tagline}</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.free.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.free.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                  {SUBSCRIPTION_PLANS.free.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePlanAction('free')}
                className="hf-btn-secondary w-full min-h-[44px]"
              >
                {user ? 'Go to Workspace' : 'Start for free'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-6 border-2 border-[var(--hf-cta)] relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                  <span className="hf-badge hf-badge-cta text-[11px] font-semibold">{SUBSCRIPTION_PLANS.pro.badge}</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.pro.tagline}</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.pro.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.pro.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                  {SUBSCRIPTION_PLANS.pro.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePlanAction('pro')}
                className="hf-btn-primary w-full min-h-[44px]"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Premium Plan */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.premium.name}</h3>
                  <span className="hf-badge text-[11px]">High Volume</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.premium.tagline}</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.premium.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.premium.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                  {SUBSCRIPTION_PLANS.premium.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePlanAction('premium')}
                className="hf-btn-secondary w-full min-h-[44px]"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
              Details on our scoring methodology, free tier allowances, and data privacy.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="hf-card overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full min-h-[48px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold text-[var(--hf-text)]">
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[var(--hf-text-secondary)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                      <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-3">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--hf-surface)] text-center">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
            Ready to audit your resume and organize your search?
          </h2>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-lg mx-auto">
            Upload your current resume to run a 4-factor ATS diagnostic, refine weak bullets, and track target roles in one workspace.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="hf-btn-primary min-h-[46px] px-7 text-sm font-medium w-full sm:w-auto gap-2 disabled:opacity-60"
            >
              <span>{isLaunching ? 'Signing in...' : 'Get started for free'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/resume-analyzer"
              className="hf-btn-secondary min-h-[46px] px-6 text-sm font-medium w-full sm:w-auto"
            >
              Learn about Resume Analyzer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
