import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import SEOHead from '../components/SEOHead';
import {
  SpotlightCard,
  AnimatedCircularGauge,
  FadeInSection
} from '../components/AnimatedPrimitives';
import { 
  FileSearch, 
  Target, 
  Briefcase, 
  FileEdit, 
  Mic, 
  AlertCircle,
  ChevronDown,
  Compass,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

type HeroTabId = 'audit' | 'rewrite' | 'jobs' | 'pipeline';
type RoleBenchmarkId = 'frontend' | 'backend' | 'ai' | 'product';

const ROLE_BENCHMARKS: Record<RoleBenchmarkId, {
  code: string;
  label: string;
  roleTitle: string;
  overallScore: number;
  beforeBullet: string;
  afterBullet: string;
  verbTag: string;
  scopeTag: string;
  metricTag: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  pillars: { code: string; name: string; weight: string; score: number; evidence: string }[];
}> = {
  frontend: {
    code: 'Frontend',
    label: 'Frontend Engineering',
    roleTitle: 'Senior Frontend Engineer',
    overallScore: 84,
    beforeBullet: 'Worked on the customer dashboard and improved page loading performance.',
    afterBullet: 'Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.',
    verbTag: 'Architected',
    scopeTag: 'React data-fetching & bundle splitting',
    metricTag: '-42% p95 latency (120k MAU)',
    matchedKeywords: ['React 18', 'TypeScript', 'Next.js', 'GraphQL', 'Design Systems', 'Playwright'],
    missingKeywords: ['Core Web Vitals', 'Vite Bundle Analysis'],
    pillars: [
      { code: 'Technical Skills Match', name: 'Core Technical Skills', weight: '40%', score: 85, evidence: 'React, TypeScript, GraphQL, Next.js verified across 4 years.' },
      { code: 'Quantified Impact', name: 'Quantified Impact', weight: '30%', score: 75, evidence: '5 of 8 bullets include numerical latency or adoption metrics.' },
      { code: 'Experience & Seniority', name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Shows design system ownership and code review leadership.' },
      { code: 'Formatting & Parsability', name: 'ATS Parsability', weight: '15%', score: 86, evidence: 'Single-column hierarchy with machine-readable date ranges.' }
    ]
  },
  backend: {
    code: 'Backend',
    label: 'Backend & Distributed',
    roleTitle: 'Senior Backend Systems Engineer',
    overallScore: 86,
    beforeBullet: 'Built payment microservices in Go and handled database queries for checkout.',
    afterBullet: 'Engineered idempotent payment settlement services in Go and tuned PostgreSQL indexing, sustaining 14,500 TPS at 99.99% availability during peak traffic.',
    verbTag: 'Engineered',
    scopeTag: 'Go microservices & PostgreSQL indexing',
    metricTag: '14,500 TPS @ 99.99% uptime',
    matchedKeywords: ['Golang', 'PostgreSQL', 'Kafka', 'Kubernetes', 'gRPC', 'Redis'],
    missingKeywords: ['OpenTelemetry Tracing', 'Chaos Testing'],
    pillars: [
      { code: 'Technical Skills Match', name: 'Core Technical Skills', weight: '40%', score: 88, evidence: 'Go, PostgreSQL, Kafka, and Kubernetes production architecture.' },
      { code: 'Quantified Impact', name: 'Quantified Impact', weight: '30%', score: 82, evidence: 'Clear throughput (TPS), SLA uptime, and p99 latency figures.' },
      { code: 'Experience & Seniority', name: 'Role Seniority Scope', weight: '15%', score: 86, evidence: 'Led distributed schema migrations and on-call incident runbooks.' },
      { code: 'Formatting & Parsability', name: 'ATS Parsability', weight: '15%', score: 89, evidence: 'Clean chronological sections with zero multi-column traps.' }
    ]
  },
  ai: {
    code: 'Data & AI',
    label: 'Data & AI Engineering',
    roleTitle: 'Machine Learning & AI Engineer',
    overallScore: 84,
    beforeBullet: 'Created RAG pipelines using Python and vector databases for internal search.',
    afterBullet: 'Designed hybrid RAG retrieval pipeline with Python, Qdrant, and cross-encoder reranking, improving top-3 answer precision from 61% to 89% across 2.4M documents.',
    verbTag: 'Designed',
    scopeTag: 'Hybrid RAG + cross-encoder reranking',
    metricTag: '61% → 89% precision (2.4M docs)',
    matchedKeywords: ['Python', 'PyTorch', 'RAG Architecture', 'Vector Search', 'FastAPI', 'Eval Rubrics'],
    missingKeywords: ['vLLM Quantization', 'Triton Inference'],
    pillars: [
      { code: 'Technical Skills Match', name: 'Core Technical Skills', weight: '40%', score: 86, evidence: 'Python, PyTorch, retrieval pipelines, and evaluation frameworks.' },
      { code: 'Quantified Impact', name: 'Quantified Impact', weight: '30%', score: 80, evidence: 'Includes retrieval precision lift and corpus scale metrics.' },
      { code: 'Experience & Seniority', name: 'Role Seniority Scope', weight: '15%', score: 83, evidence: 'End-to-end ownership from offline evaluation to production API.' },
      { code: 'Formatting & Parsability', name: 'ATS Parsability', weight: '15%', score: 87, evidence: 'Standardized technical skill taxonomy and section labels.' }
    ]
  },
  product: {
    code: 'Product',
    label: 'Product & Growth',
    roleTitle: 'Senior Technical Product Manager',
    overallScore: 81,
    beforeBullet: 'Managed the onboarding roadmap and worked with engineers to increase activation.',
    afterBullet: 'Spearheaded self-serve onboarding redesign across 3 engineering pods, lifting Day-7 workspace activation by 28% and adding $1.4M in annualized self-serve ARR.',
    verbTag: 'Spearheaded',
    scopeTag: 'Self-serve onboarding across 3 pods',
    metricTag: '+28% D7 activation ($1.4M ARR)',
    matchedKeywords: ['Product Strategy', 'SQL & Funnel Analytics', 'A/B Experimentation', 'PRDs', 'PLG'],
    missingKeywords: ['Enterprise RBAC Scoping', 'Pricing Packaging'],
    pillars: [
      { code: 'Technical Skills Match', name: 'Core Technical Skills', weight: '40%', score: 82, evidence: 'SQL cohort analysis, experimentation, and technical PRD authorship.' },
      { code: 'Quantified Impact', name: 'Quantified Impact', weight: '30%', score: 78, evidence: 'Strong conversion rate and ARR attribution on key launches.' },
      { code: 'Experience & Seniority', name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Cross-functional leadership across engineering, design, and GTM.' },
      { code: 'Formatting & Parsability', name: 'ATS Parsability', weight: '15%', score: 85, evidence: 'Clear role progression and scannable accomplishment bullets.' }
    ]
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openUpgradeModal } = usePlan();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLaunching, setIsLaunching] = useState(false);

  const [activeHeroTab, setActiveHeroTab] = useState<HeroTabId>('audit');
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [heroXyzApplied, setHeroXyzApplied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleBenchmarkId>('frontend');

  useEffect(() => {
    if (isHeroPaused) return;
    const order: HeroTabId[] = ['audit', 'rewrite', 'jobs', 'pipeline'];
    const timer = setInterval(() => {
      setActiveHeroTab((prev) => {
        const nextIdx = (order.indexOf(prev) + 1) % order.length;
        return order[nextIdx];
      });
    }, 6500);
    return () => clearInterval(timer);
  }, [isHeroPaused]);

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

  const heroTabs: { id: HeroTabId; label: string }[] = [
    { id: 'audit', label: 'Score Breakdown' },
    { id: 'rewrite', label: 'Bullet Rewrite' },
    { id: 'jobs', label: 'Matched Jobs' },
    { id: 'pipeline', label: 'Job Tracker' },
  ];

  const faqItems = [
    {
      q: "What makes AI HireFlow different from standard job boards?",
      a: "Most job boards just show lists of open roles. AI HireFlow puts ATS resume checks, bullet rewriting based on your real work, live job matching, mock interviews, and an application tracker in one connected workspace."
    },
    {
      q: "Are the ATS resume tools free to try?",
      a: "Yes. Every account gets 150 free AI credits that refresh daily, so you can scan resumes, review ATS compatibility, practice interviews, and build career roadmaps without adding a card."
    },
    {
      q: "How does AI HireFlow calculate my resume score?",
      a: "Your score is split across four clear areas: Technical skills match (40%), Quantified impact (30%), Role level and seniority (15%), and Formatting and ATS readability (15%)."
    },
    {
      q: "Does AI HireFlow guarantee job offers?",
      a: "No tool can guarantee an interview or offer. AI HireFlow helps you surface missing keywords, tighten weak resume bullets, and prepare clearer interview stories so your actual experience stands out."
    },
    {
      q: "Is my resume and account data private?",
      a: "Yes. Your resumes, saved searches, and job tracker entries stay scoped to your signed-in Google account in Firebase and are never sold to third parties."
    }
  ];

  const activeBenchmark = ROLE_BENCHMARKS[selectedRole];

  const heroScore = heroXyzApplied ? 91 : 74;
  const heroBars = [
    { code: 'Technical Skills Match (40%)', val: heroXyzApplied ? 92 : 82, color: 'bg-[var(--hf-text)]' },
    { code: 'Quantified Impact (30%)', val: heroXyzApplied ? 94 : 58, color: heroXyzApplied ? 'bg-[var(--hf-success)]' : 'bg-[var(--hf-cta)]' },
    { code: 'Experience & Seniority (15%)', val: heroXyzApplied ? 88 : 79, color: 'bg-[var(--hf-success)]' },
    { code: 'ATS Readability (15%)', val: 89, color: 'bg-[var(--hf-success)]' }
  ];

  const tickerSpecs = [
    'Transparent 4-part ATS scoring',
    'XYZ & STAR bullet rewrites',
    'Clean single-column PDF export',
    'Live job match scoring',
    'Application pipeline tracker',
    '100-point interview feedback',
    '150 daily renewing free credits'
  ];

  return (
    <div className="flex flex-col bg-[var(--hf-bg)] text-[var(--hf-text)] selection:bg-[var(--hf-cta)] selection:text-white min-h-screen">
      <SEOHead 
        title="AI HireFlow | Career Platform for Resume Analysis, Job Search & Interview Prep"
        description="Check ATS resume compatibility, build single-column resumes, practice technical mock interviews, find matched jobs, and map out career roadmaps."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* ========================================================================= */}
      {/* 1. SPLIT-SCREEN EDITORIAL HERO                                            */}
      {/* ========================================================================= */}
      <section className="relative pt-24 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
            {/* Left 6 Columns: Editorial Headline & Clear Value Prop */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6 text-left pt-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] rounded-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--hf-cta)] inline-block" />
                <span className="font-sans text-xs font-semibold text-[var(--hf-text)]">
                  Resume Scoring · Live Jobs · Interview Prep
                </span>
              </div>

              <h1 className="font-serif-display font-normal text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.08]">
                Know why your resume gets skipped—and{' '}
                <em className="italic text-[var(--hf-cta)]">fix it in minutes.</em>
              </h1>

              <p className="text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-xl">
                See a clear 4-part breakdown of how recruiters and ATS filters read your resume, strengthen vague bullet points from your real work, find matching roles, and rehearse interviews in one place.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className="hf-btn-primary min-h-[46px] px-6 gap-2 disabled:opacity-60"
                >
                  <span>{isLaunching ? 'Signing in...' : 'Analyze my resume free'}</span>
                  {!isLaunching && <ArrowRight className="w-4 h-4" />}
                </button>

                <a
                  href="#interactive-rubric"
                  className="hf-btn-secondary min-h-[46px] px-5"
                >
                  See how scoring works
                </a>
              </div>

              {/* Clean 3-Column Summary Strip */}
              <div className="pt-4">
                <div className="grid grid-cols-3 border-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)] shadow-[3px_3px_0px_var(--hf-ink-border)] divide-x-[1.5px] divide-[var(--hf-ink-border)] rounded-sm overflow-hidden">
                  <div className="p-3 sm:p-4">
                    <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)] block">Scoring rubric</span>
                    <span className="font-serif-display text-lg sm:text-xl font-semibold text-[var(--hf-text)] mt-0.5 block">4 Clear Pillars</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Skills, impact &amp; format</span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)] block">Bullet editing</span>
                    <span className="font-serif-display text-lg sm:text-xl font-semibold text-[var(--hf-text)] mt-0.5 block">XYZ &amp; STAR</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Real impact rewrites</span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)] block">Free allowance</span>
                    <span className="font-serif-display text-lg sm:text-xl font-semibold text-[var(--hf-cta)] mt-0.5 block tabular-nums">150 / day</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Refreshes daily</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right 6 Columns: Interactive Preview Card (Fixed-Height Stage, Downward Settling Transitions) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              className="lg:col-span-6 w-full"
            >
              {/* Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {heroTabs.map((tab) => {
                  const isActive = activeHeroTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveHeroTab(tab.id)}
                      className={`px-2.5 py-2 rounded-sm font-sans text-xs font-semibold border-[1.5px] border-[var(--hf-ink-border)] transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] shadow-[2px_2px_0px_var(--hf-cta)]'
                          : 'bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:bg-[var(--hf-surface-secondary)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Preview Sheet with Fixed-Height Inner Body so Page Never Jumps Upward */}
              <div className="bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[5px_5px_0px_var(--hf-ink-border)] rounded-sm p-5 sm:p-6">
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b-[1.5px] border-[var(--hf-ink-border)]">
                  <span className="font-sans text-xs font-semibold text-[var(--hf-text-secondary)]">
                    Sample Resume Review · Senior Frontend
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-sm border tabular-nums transition-colors ${
                      heroXyzApplied
                        ? 'bg-[var(--hf-mint)] text-[var(--hf-success)] border-[var(--hf-success)]'
                        : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] border-[var(--hf-ink-border)]'
                    }`}
                  >
                    Score: {heroScore} / 100
                  </span>
                </div>

                {/* Locked-Height Transition Stage (Prevents Vertical Page Jump on Auto-Switch) */}
                <div className="relative h-[385px] sm:h-[335px] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {activeHeroTab === 'audit' && (
                      <motion.div
                        key="dossier-audit"
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 14 }}
                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex flex-col justify-start space-y-3"
                      >
                        <div className="flex items-center justify-between bg-[var(--hf-surface-secondary)] p-3.5 border border-[var(--hf-ink-border)] rounded-sm">
                          <div className="min-w-0 pr-3">
                            <span className="font-sans text-[11px] font-semibold text-[var(--hf-cta)] block">
                              {heroXyzApplied ? 'Impact bullet updated (+17 pts)' : 'Sample candidate baseline'}
                            </span>
                            <h2 className="font-serif-display text-lg font-semibold text-[var(--hf-text)] truncate">
                              Alex Rivera — Frontend Engineer
                            </h2>
                          </div>
                          <AnimatedCircularGauge score={heroScore} size={58} strokeWidth={6} />
                        </div>

                        {/* Interactive Simulator Toggle */}
                        <div className="p-3 bg-[var(--hf-bg)] border border-[var(--hf-ink-border)] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="text-xs min-w-0">
                            <span className="font-sans text-[11px] font-semibold text-[var(--hf-text-muted)] block">
                              {heroXyzApplied ? 'Updated bullet:' : 'Weak bullet detected:'}
                            </span>
                            <p className={`text-xs truncate mt-0.5 ${heroXyzApplied ? 'text-[var(--hf-success)] font-medium' : 'text-[var(--hf-text-secondary)] italic'}`}>
                              {heroXyzApplied
                                ? '“Redesigned React data fetching and splitting, cutting p95 load latency by 42%...”'
                                : '“Worked on the customer dashboard and improved loading speed.”'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHeroXyzApplied((v) => !v)}
                            className={`px-3 py-1.5 rounded-sm font-sans text-xs font-semibold border-[1.5px] border-[var(--hf-ink-border)] shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                              heroXyzApplied
                                ? 'bg-[var(--hf-surface)] text-[var(--hf-text)] shadow-[2px_2px_0px_var(--hf-ink-border)]'
                                : 'bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] shadow-[2px_2px_0px_var(--hf-cta)]'
                            }`}
                          >
                            {heroXyzApplied ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" /> Reset example
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" /> Try stronger bullet
                              </>
                            )}
                          </button>
                        </div>

                        {/* 4 Weighted Score Bars */}
                        <div className="space-y-2 text-xs">
                          {heroBars.map((row) => (
                            <div key={row.code} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-[var(--hf-text-secondary)]">{row.code}</span>
                                <strong className="font-mono text-[var(--hf-text)] tabular-nums">{row.val}%</strong>
                              </div>
                              <div className="h-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] overflow-hidden rounded-xs">
                                <motion.div
                                  initial={false}
                                  animate={{ width: `${row.val}%` }}
                                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                  className={`h-full ${row.color}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeHeroTab === 'rewrite' && (
                      <motion.div
                        key="dossier-rewrite"
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 14 }}
                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex flex-col justify-start space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-semibold text-[var(--hf-cta)]">
                            Bullet Improvement Example (XYZ Method)
                          </span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[var(--hf-mint)] text-[var(--hf-success)] border border-[var(--hf-success)] rounded-sm">
                            +17 pts impact
                          </span>
                        </div>

                        <div className="p-3.5 bg-[var(--hf-error-bg)] border border-[var(--hf-error)] rounded-sm space-y-1">
                          <span className="font-sans text-[11px] font-semibold text-[var(--hf-error)] block">
                            Original vague line
                          </span>
                          <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] line-through">
                            &ldquo;Worked on the customer dashboard and improved page loading performance.&rdquo;
                          </p>
                        </div>

                        <div className="p-3.5 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-ink-border)] rounded-sm space-y-2.5">
                          <span className="font-sans text-[11px] font-semibold text-[var(--hf-success)] block">
                            Clearer rewrite anchored to your work
                          </span>
                          <p className="font-serif-display text-sm sm:text-base text-[var(--hf-text)] leading-snug">
                            &ldquo;Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.&rdquo;
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-medium">
                            <span className="px-2 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm">Action: Architected</span>
                            <span className="px-2 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm">Result: -42% latency</span>
                            <span className="px-2 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] font-semibold rounded-sm">Scale: 120k users</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeHeroTab === 'jobs' && (
                      <motion.div
                        key="dossier-jobs"
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 14 }}
                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex flex-col justify-start space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="font-semibold text-[var(--hf-text)]">Open roles matched to your resume</span>
                          <span className="font-medium text-[var(--hf-cta)]">3 top matches</span>
                        </div>
                        {[
                          { company: 'CloudScale Payments', role: 'Senior Frontend Engineer', loc: 'Remote', fit: '94% match' },
                          { company: 'Velocity DevTools', role: 'Staff UI Systems Engineer', loc: 'Bengaluru · Hybrid', fit: '91% match' },
                          { company: 'Nexus Analytics', role: 'Frontend Platform Lead', loc: 'Remote', fit: '88% match' }
                        ].map((job) => (
                          <div key={job.company} className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm flex items-center justify-between gap-3">
                            <div>
                              <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)] block">{job.company} · {job.loc}</span>
                              <span className="font-serif-display text-base font-semibold text-[var(--hf-text)]">{job.role}</span>
                            </div>
                            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] text-[var(--hf-success)] shrink-0 rounded-sm">
                              {job.fit}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeHeroTab === 'pipeline' && (
                      <motion.div
                        key="dossier-pipeline"
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 14 }}
                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex flex-col justify-start space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--hf-text)]">Your Application Board</span>
                          <span className="text-[var(--hf-text-muted)]">8 active roles</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { stage: 'Applied (5)', company: 'CloudScale', note: '94% Match', second: 'MetricFlow', secondNote: 'Reviewed' },
                            { stage: 'Interview (2)', company: 'Velocity', note: 'Round Tomorrow', second: 'StackGrid', secondNote: 'Tech Screen' },
                            { stage: 'Offer (1)', company: 'DesignOps', note: '₹36L Base', second: 'Final check', secondNote: 'In review' }
                          ].map((col) => (
                            <div key={col.stage} className="p-2.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm space-y-2">
                              <span className="font-sans text-[11px] font-semibold text-[var(--hf-text)] block border-b border-[var(--hf-ink-border)] pb-1">
                                {col.stage}
                              </span>
                              <div className="p-2 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] rounded-sm">
                                <p className="text-xs font-semibold text-[var(--hf-text)]">{col.company}</p>
                                <p className="text-[11px] font-medium text-[var(--hf-cta)] mt-0.5">{col.note}</p>
                              </div>
                              <div className="p-2 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-sm opacity-85">
                                <p className="text-xs font-medium text-[var(--hf-text)]">{col.second}</p>
                                <p className="text-[10px] text-[var(--hf-text-muted)] mt-0.5">{col.secondNote}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preview Footer Note */}
                <div className="pt-3 mt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-[11px] text-[var(--hf-text-muted)]">
                  <span>{isHeroPaused ? 'Paused while inspecting' : 'Sample workflow · Hover to pause'}</span>
                  <span className="font-medium text-[var(--hf-text-secondary)]">4-pillar rubric</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* EDITORIAL FEATURE RIBBON                                                  */}
      {/* ========================================================================= */}
      <div className="border-y-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface-secondary)] py-2.5 overflow-hidden select-none">
        <div className="animate-marquee font-sans text-xs font-medium text-[var(--hf-text-secondary)]">
          {[...tickerSpecs, ...tickerSpecs].map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-4 mx-4">
              <span>{item}</span>
              <span className="text-[var(--hf-cta)] text-[10px]">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WORKSPACE TOOLS OVERVIEW                                               */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="max-w-2xl mb-12">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Workspace tools
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
              Six connected tools, from first draft to final offer.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Your saved resume, matched jobs, missing skills, and mock interview feedback stay connected in one place—no copying text across disconnected apps.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Resume Analyzer */}
            <FadeInSection delay={0.04}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      01 · Audit
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">ATS Compatibility</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Resume Analyzer</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Check your resume against target roles with a transparent breakdown of technical skills, measurable impact, seniority fit, and ATS formatting.
                  </p>
                  {/* Mini Rubric Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-xs space-y-1.5">
                    <div className="flex justify-between font-medium"><span>Skills match (40%)</span><strong className="font-mono">85%</strong></div>
                    <div className="h-1.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]"><div className="h-full bg-[var(--hf-text)]" style={{ width: '85%' }} /></div>
                    <div className="flex justify-between font-medium pt-0.5"><span>Impact metrics (30%)</span><strong className="font-mono text-[var(--hf-cta)]">75%</strong></div>
                    <div className="h-1.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]"><div className="h-full bg-[var(--hf-cta)]" style={{ width: '75%' }} /></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/resume-analyzer" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Resume Analyzer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* 2. Resume Editor */}
            <FadeInSection delay={0.08}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      02 · Editor
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">XYZ Bullet Writer</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Resume Editor</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Build a clean single-column resume with inline suggestions that turn vague tasks into concrete, results-first bullet points.
                  </p>
                  {/* Mini Diff Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm space-y-1.5 text-xs">
                    <div className="font-sans text-[11px] font-semibold text-[var(--hf-success)]">Suggested rewrite</div>
                    <p className="text-[var(--hf-text)] leading-snug">
                      &ldquo;Reduced p95 API latency <strong>38%</strong> using Redis read-through caching...&rdquo;
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/resume-editor" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Resume Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* 3. Job Finder */}
            <FadeInSection delay={0.12}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      03 · Discovery
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">Live Job Feed</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Job Finder</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Search verified tech openings ranked against your saved resume so you immediately spot strong-fit roles and missing skills.
                  </p>
                  {/* Mini Job Fit Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--hf-text)] truncate">Staff Frontend Engineer</p>
                      <p className="text-[11px] text-[var(--hf-text-muted)]">Remote · React, TypeScript</p>
                    </div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] shrink-0 rounded-sm">
                      92% match
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/job-finder" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Job Finder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* 4. Job Tracker */}
            <FadeInSection delay={0.16}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      04 · Pipeline
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">Board &amp; Table</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Application Tracker</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Keep every application organized across Applied, Interview, and Offer stages with a switchable Kanban board and table view.
                  </p>
                  {/* Mini 3-Col Kanban Strip */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div className="p-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-center">
                      <span className="block text-[var(--hf-text-muted)] font-medium">Applied</span>
                      <strong className="font-mono text-xs">5</strong>
                    </div>
                    <div className="p-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-center">
                      <span className="block text-[var(--hf-cta)] font-medium">Interview</span>
                      <strong className="font-mono text-xs">2</strong>
                    </div>
                    <div className="p-2 bg-[var(--hf-mint)] border border-[var(--hf-success)] rounded-sm text-center text-[var(--hf-success)]">
                      <span className="block font-medium">Offer</span>
                      <strong className="font-mono text-xs">1</strong>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/job-tracker" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Job Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* 5. Career Roadmap */}
            <FadeInSection delay={0.2}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      05 · Roadmap
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">Skill Plan</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Career Advisor</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Turn your resume gaps into a practical step-by-step learning roadmap and portfolio project ideas tailored to your target role.
                  </p>
                  {/* Mini Milestone Strip */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">1. Core Web Vitals</span>
                      <span className="text-[var(--hf-success)] font-semibold">Done</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">2. Bundle Telemetry</span>
                      <span className="text-[var(--hf-cta)] font-semibold">In progress</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/career-advisor" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Career Path</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* 6. Interview Lab */}
            <FadeInSection delay={0.24}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold px-2.5 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                      06 · Practice
                    </span>
                    <span className="font-sans text-xs font-medium text-[var(--hf-cta)]">STAR Feedback</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Interview Lab</span>
                  </h3>
                  <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Practice technical and behavioral interviews tailored to your target role, with structured STAR scoring and example answers.
                  </p>
                  {/* Mini STAR Score Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] text-center">
                    {[
                      { k: 'Situation', v: '22' },
                      { k: 'Task', v: '21' },
                      { k: 'Action', v: '23' },
                      { k: 'Result', v: '20' }
                    ].map((s) => (
                      <div key={s.k} className="p-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm">
                        <span className="text-[var(--hf-text-muted)] block text-[10px]">{s.k}</span>
                        <strong className="font-mono text-[var(--hf-text)]">{s.v}/25</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/interview-lab" className="font-sans text-xs font-semibold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors inline-flex items-center gap-1">
                    <span>Explore Interview Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE SCORING RUBRIC & BULLET REWRITE DEMO                       */}
      {/* ========================================================================= */}
      <section id="interactive-rubric" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div className="max-w-7xl mx-auto space-y-10">
          <FadeInSection className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Transparent scoring
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
                See how your score is calculated—and how to improve it.
              </h2>
              <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
                Pick a role track below to inspect how each of the 4 scoring areas works and how weak bullet points get rewritten.
              </p>
            </div>

            {/* Tactile Track Selector Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-start">
              {(Object.keys(ROLE_BENCHMARKS) as RoleBenchmarkId[]).map((roleKey) => {
                const isSelected = selectedRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setSelectedRole(roleKey)}
                    className={`px-3.5 py-2 rounded-sm font-sans text-xs font-semibold border-[1.5px] border-[var(--hf-ink-border)] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] shadow-[2px_2px_0px_var(--hf-cta)] -translate-y-0.5'
                        : 'bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:bg-[var(--hf-surface-secondary)]'
                    }`}
                  >
                    {ROLE_BENCHMARKS[roleKey].code}
                  </button>
                );
              })}
            </div>
          </FadeInSection>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left 5 Cols: Weighted Rubric Breakdown */}
              <div className="lg:col-span-5 hf-card p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b-[1.5px] border-[var(--hf-ink-border)]">
                    <div>
                      <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)] block">
                        Sample target role
                      </span>
                      <h3 className="font-serif-display text-xl font-semibold text-[var(--hf-text)] mt-0.5">
                        {activeBenchmark.roleTitle}
                      </h3>
                    </div>
                    <div className="px-3 py-1 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm font-mono text-base font-bold text-[var(--hf-text)]">
                      {activeBenchmark.overallScore} / 100
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeBenchmark.pillars.map((pillar, i) => (
                      <div key={pillar.code} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--hf-text)]">
                            {pillar.code} <span className="text-[var(--hf-text-muted)] font-normal">({pillar.weight})</span>
                          </span>
                          <span className="font-mono font-bold text-[var(--hf-cta)]">{pillar.score}%</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-xs overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pillar.score}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="h-full bg-[var(--hf-text)]"
                          />
                        </div>
                        <p className="text-xs text-[var(--hf-text-secondary)] leading-snug">
                          {pillar.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] flex items-start gap-2 text-[11px] text-[var(--hf-text-muted)]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Scores show transparent weighting across skills, metrics, seniority, and formatting so you know what to edit next.</span>
                </div>
              </div>

              {/* Right 7 Cols: Before/After Bullet Rewrite + Keyword Summary */}
              <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
                <div className="hf-card p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-sans text-xs font-semibold text-[var(--hf-cta)]">
                      Before &amp; After Bullet Rewrite
                    </span>
                    <span className="font-sans text-[11px] font-medium text-[var(--hf-text-muted)]">XYZ Clarity Framework</span>
                  </div>

                  {/* Before Draft */}
                  <div className="p-4 bg-[var(--hf-error-bg)] border border-[var(--hf-error)] rounded-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--hf-error)] flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Before (vague)
                      </span>
                      <span className="text-[11px] text-[var(--hf-error)]">Missing impact</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] line-through">
                      &ldquo;{activeBenchmark.beforeBullet}&rdquo;
                    </p>
                  </div>

                  {/* After Revision */}
                  <div className="p-4 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-ink-border)] rounded-sm space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--hf-success)] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> After (clear &amp; measurable)
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-[var(--hf-mint)] text-[var(--hf-success)] border border-[var(--hf-success)] rounded-sm">
                        Quantified result
                      </span>
                    </div>
                    <p className="font-serif-display text-base sm:text-lg text-[var(--hf-text)] leading-snug">
                      &ldquo;{activeBenchmark.afterBullet}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      <span className="px-2.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm">
                        <strong>Verb:</strong> {activeBenchmark.verbTag}
                      </span>
                      <span className="px-2.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm">
                        <strong>Scope:</strong> {activeBenchmark.scopeTag}
                      </span>
                      <span className="px-2.5 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] font-semibold rounded-sm">
                        <strong>Impact:</strong> {activeBenchmark.metricTag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keyword Match Summary */}
                <div className="hf-card p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">Keywords check ({activeBenchmark.label})</span>
                    <span className="text-[var(--hf-text-muted)]">
                      {activeBenchmark.matchedKeywords.length} matched · {activeBenchmark.missingKeywords.length} to consider
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {activeBenchmark.matchedKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-ink-border)] font-medium rounded-sm">
                        <Check className="w-3 h-3 text-[var(--hf-success)]" /> {kw}
                      </span>
                    ))}
                    {activeBenchmark.missingKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 text-[var(--hf-cta)] border border-[var(--hf-cta)] font-semibold rounded-sm">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Practical Comparison Table */}
          <FadeInSection className="pt-4">
            <div className="hf-card overflow-hidden">
              <div className="px-5 py-3.5 bg-[var(--hf-surface-secondary)] border-b-[1.5px] border-[var(--hf-ink-border)] flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-[var(--hf-text)]">
                  Why structured checks beat generic AI chat
                </span>
                <span className="text-xs text-[var(--hf-text-muted)] hidden sm:inline">Side-by-side comparison</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-bg)]">
                      <th className="p-3.5 font-semibold text-[var(--hf-text)]">Area</th>
                      <th className="p-3.5 font-semibold text-[var(--hf-text-muted)]">Generic Chatbots</th>
                      <th className="p-3.5 font-semibold text-[var(--hf-cta)]">AI HireFlow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hf-border)]">
                    {[
                      ['Resume Scoring', 'Opaque score with no breakdown', '4 weighted pillars (40 / 30 / 15 / 15) with line-level reasons'],
                      ['Bullet Rewriting', 'Often invents fake numbers or fluff', 'Grounded in your real work with clear XYZ prompts'],
                      ['Job Matching', 'Copy-pasting links across 10 tabs', 'Live job search scored directly against your saved resume'],
                      ['Interview Practice', 'Unstructured Q&A chat', '100-point STAR feedback with role-specific example answers'],
                    ].map(([dim, gen, hf]) => (
                      <tr key={dim} className="hover:bg-[var(--hf-surface-secondary)]/40 transition-colors">
                        <td className="p-3.5 font-semibold text-[var(--hf-text)]">{dim}</td>
                        <td className="p-3.5 text-[var(--hf-text-muted)]">{gen}</td>
                        <td className="p-3.5 font-medium text-[var(--hf-text)] flex items-center gap-2">
                          <Check className="w-4 h-4 text-[var(--hf-success)] shrink-0" />
                          <span>{hf}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PRICING (EXACT TIERS, PRICES, AND LIMITS PRESERVED)                    */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-12">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Pricing
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
              Simple pricing that starts free.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
              Every account starts with 150 daily renewing free credits. Upgrade only when you want higher volume.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <FadeInSection delay={0.05}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <h3 className="font-serif-display text-2xl font-semibold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.free.name}</h3>
                    <span className="hf-badge">Free</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.free.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.free.priceFormatted.INR}</span>
                    <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.free.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.free.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--hf-text-secondary)]">
                        <Check className="w-4 h-4 text-[var(--hf-success)] shrink-0 mt-0.5" />
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
                  {user ? 'Open workspace' : 'Start free'}
                </button>
              </SpotlightCard>
            </FadeInSection>

            {/* Pro Plan */}
            <FadeInSection delay={0.1}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6 bg-[var(--hf-surface-secondary)]/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-ink-border)]">
                    <h3 className="font-serif-display text-2xl font-semibold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                    <span className="hf-badge hf-badge-cta">{SUBSCRIPTION_PLANS.pro.badge}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.pro.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.pro.priceFormatted.INR}</span>
                    <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.pro.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-ink-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.pro.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--hf-text)] font-medium">
                        <Check className="w-4 h-4 text-[var(--hf-cta)] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanAction('pro')}
                  className="hf-btn-primary w-full min-h-[44px] gap-1.5"
                >
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SpotlightCard>
            </FadeInSection>

            {/* Premium Plan */}
            <FadeInSection delay={0.15}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <h3 className="font-serif-display text-2xl font-semibold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.premium.name}</h3>
                    <span className="hf-badge">All-Access</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.premium.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.premium.priceFormatted.INR}</span>
                    <span className="text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.premium.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.premium.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--hf-text-secondary)]">
                        <Check className="w-4 h-4 text-[var(--hf-success)] shrink-0 mt-0.5" />
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
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FAQ ACCORDION                                                          */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div className="max-w-3xl mx-auto">
          <FadeInSection className="mb-12">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Common questions
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
              Frequently asked questions.
            </h2>
          </FadeInSection>

          <div className="space-y-3.5">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <FadeInSection key={idx} delay={idx * 0.04}>
                  <div className="hf-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full min-h-[52px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="font-serif-display text-base sm:text-lg font-semibold text-[var(--hf-text)]">
                        {faq.q}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[var(--hf-text)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--hf-cta)]' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                            <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-3">
                              {faq.a}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL CONVERSION CTA                                                   */}
      {/* ========================================================================= */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 text-center bg-[var(--hf-surface)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />
        <FadeInSection className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="inline-block font-sans text-xs font-semibold px-3 py-1 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-[var(--hf-text)]">
            Free to start · 150 credits daily
          </span>
          <h2 className="font-serif-display text-3xl sm:text-5xl font-normal tracking-tight text-[var(--hf-text)]">
            Ready to tighten your resume?
          </h2>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-lg mx-auto">
            Upload your resume to see your 4-part ATS breakdown, rewrite weak bullet points, and match with live roles.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="hf-btn-primary min-h-[46px] px-7 w-full sm:w-auto gap-2 disabled:opacity-60"
            >
              <span>{isLaunching ? 'Signing in...' : 'Analyze my resume free'}</span>
              {!isLaunching && <ArrowRight className="w-4 h-4" />}
            </button>
            <Link
              to="/resume-analyzer"
              className="hf-btn-secondary min-h-[46px] px-6 w-full sm:w-auto"
            >
              See how it works
            </Link>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
