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
  Sparkles
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
    code: '01 / FRONTEND',
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
      { code: 'TECH_COVERAGE', name: 'Core Technical Skills', weight: '40%', score: 85, evidence: 'React, TypeScript, GraphQL, Next.js verified across 4 years.' },
      { code: 'IMPACT_METRICS', name: 'Quantified Impact', weight: '30%', score: 75, evidence: '5 of 8 bullets include numerical latency or adoption metrics.' },
      { code: 'ROLE_SENIORITY', name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Evidences design system ownership and code review leadership.' },
      { code: 'ATS_PARSABILITY', name: 'ATS Parsability', weight: '15%', score: 86, evidence: 'Single-column hierarchy with machine-readable date ranges.' }
    ]
  },
  backend: {
    code: '02 / BACKEND',
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
      { code: 'TECH_COVERAGE', name: 'Core Technical Skills', weight: '40%', score: 88, evidence: 'Go, PostgreSQL, Kafka, and Kubernetes production architecture.' },
      { code: 'IMPACT_METRICS', name: 'Quantified Impact', weight: '30%', score: 82, evidence: 'Clear throughput (TPS), SLA uptime, and p99 latency figures.' },
      { code: 'ROLE_SENIORITY', name: 'Role Seniority Scope', weight: '15%', score: 86, evidence: 'Led distributed schema migrations and on-call incident runbooks.' },
      { code: 'ATS_PARSABILITY', name: 'ATS Parsability', weight: '15%', score: 89, evidence: 'Clean chronological sections with zero multi-column traps.' }
    ]
  },
  ai: {
    code: '03 / DATA & AI',
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
      { code: 'TECH_COVERAGE', name: 'Core Technical Skills', weight: '40%', score: 86, evidence: 'Python, PyTorch, retrieval pipelines, and evaluation frameworks.' },
      { code: 'IMPACT_METRICS', name: 'Quantified Impact', weight: '30%', score: 80, evidence: 'Includes retrieval precision lift and corpus scale metrics.' },
      { code: 'ROLE_SENIORITY', name: 'Role Seniority Scope', weight: '15%', score: 83, evidence: 'End-to-end ownership from offline evaluation to production API.' },
      { code: 'ATS_PARSABILITY', name: 'ATS Parsability', weight: '15%', score: 87, evidence: 'Standardized technical skill taxonomy and section labels.' }
    ]
  },
  product: {
    code: '04 / PRODUCT',
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
      { code: 'TECH_COVERAGE', name: 'Core Technical Skills', weight: '40%', score: 82, evidence: 'SQL cohort analysis, experimentation, and technical PRD authorship.' },
      { code: 'IMPACT_METRICS', name: 'Quantified Impact', weight: '30%', score: 78, evidence: 'Strong conversion rate and ARR attribution on key launches.' },
      { code: 'ROLE_SENIORITY', name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Cross-functional leadership across engineering, design, and GTM.' },
      { code: 'ATS_PARSABILITY', name: 'ATS Parsability', weight: '15%', score: 85, evidence: 'Clear role progression and scannable accomplishment bullets.' }
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

  const heroTabs: { id: HeroTabId; code: string; label: string }[] = [
    { id: 'audit', code: '01', label: 'DIAGNOSTIC' },
    { id: 'rewrite', code: '02', label: 'XYZ MEMO' },
    { id: 'jobs', code: '03', label: 'JOB INDEX' },
    { id: 'pipeline', code: '04', label: 'PIPELINE' },
  ];

  const faqItems = [
    {
      q: "What makes AI HireFlow different from standard job boards?",
      a: "AI HireFlow is an engineering-grade career operating dossier. Instead of merely listing vacancies, we connect ATS resume diagnostics, Google-XYZ bullet rewriting, live job compatibility scoring, mock interview simulations, and Kanban application tracking in one unified system."
    },
    {
      q: "Are the ATS tools free to use?",
      a: "Yes. Every account includes a daily refreshing allowance of 150 AI Credits on the Free tier so you can scan resumes, audit ATS compatibility, practice interviews, and generate career roadmaps."
    },
    {
      q: "How does the platform evaluate my resume?",
      a: "AI HireFlow uses a transparent mathematical scoring model across 4 core dimensions: Core technical skill coverage (40%), Quantifiable impact metrics (30%), Role seniority relevance (15%), and Structural ATS parsability (15%)."
    },
    {
      q: "Does AI HireFlow guarantee a job?",
      a: "No automated platform can guarantee employment. AI HireFlow is built to equip you with clear, high-impact application materials and structured interview practice so you can represent your genuine abilities effectively."
    },
    {
      q: "Is my personal career information secure?",
      a: "Yes. All profile, resume, and application data is securely partitioned under your authenticated Google account via Firebase Authentication and Firestore rules, and is never sold to third parties."
    }
  ];

  const activeBenchmark = ROLE_BENCHMARKS[selectedRole];

  const heroScore = heroXyzApplied ? 91 : 74;
  const heroBars = [
    { code: 'I. TECH_COVERAGE (40%)', val: heroXyzApplied ? 92 : 82, color: 'bg-[var(--hf-text)]' },
    { code: 'II. IMPACT_METRICS (30%)', val: heroXyzApplied ? 94 : 58, color: heroXyzApplied ? 'bg-[var(--hf-success)]' : 'bg-[var(--hf-cta)]' },
    { code: 'III. ROLE_SENIORITY (15%)', val: heroXyzApplied ? 88 : 79, color: 'bg-[var(--hf-success)]' },
    { code: 'IV. ATS_PARSABILITY (15%)', val: 89, color: 'bg-[var(--hf-success)]' }
  ];

  const tickerSpecs = [
    'TECH_COVERAGE: 40%',
    'IMPACT_METRICS: 30%',
    'ROLE_SENIORITY: 15%',
    'ATS_PARSABILITY: 15%',
    'XYZ_BULLET_FRAMEWORK',
    'SINGLE_COLUMN_PDF_EXPORT',
    'LIVE_JSEARCH_INDEXING',
    'STAR_INTERVIEW_RUBRIC',
    'ZERO_FABRICATED_METRICS'
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
      {/* 1. SPLIT-SCREEN EDITORIAL DOSSIER HERO                                    */}
      {/* ========================================================================= */}
      <section className="relative pt-24 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
            {/* Left 6 Columns: Editorial Masthead Copy & Mechanical CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6 text-left pt-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)]">
                <span className="w-2 h-2 bg-[var(--hf-cta)] inline-block" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--hf-text)]">
                  VOL. 2026 — CAREER OPERATING DOSSIER
                </span>
              </div>

              <h1 className="font-serif-display font-normal text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.06]">
                Rigorous resume diagnostics for software engineers.
              </h1>

              <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-xl">
                Built like an engineering specification rather than a black-box score: documented 4-factor mathematical ATS audits, line-by-line Google-XYZ bullet refactoring, live job requisition indexing, and STAR interview rehearsals.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className="hf-btn-primary min-h-[46px] px-6 text-xs sm:text-sm gap-2 disabled:opacity-60"
                >
                  <span>{isLaunching ? 'AUTHENTICATING...' : 'RUN RESUME DIAGNOSTIC →'}</span>
                </button>

                <a
                  href="#interactive-rubric"
                  className="hf-btn-secondary min-h-[46px] px-5 text-xs sm:text-sm"
                >
                  INSPECT RUBRIC
                </a>
              </div>

              {/* Specification Ledger Table Below Hero Copy */}
              <div className="pt-4">
                <div className="grid grid-cols-3 border-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)] shadow-[3px_3px_0px_var(--hf-ink-border)] divide-x-[1.5px] divide-[var(--hf-ink-border)]">
                  <div className="p-3 sm:p-3.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)] block">SPEC // 01</span>
                    <span className="font-serif-display text-lg sm:text-xl font-bold text-[var(--hf-text)] mt-0.5 block">4-Factor</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Weighted Rubric</span>
                  </div>
                  <div className="p-3 sm:p-3.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)] block">SPEC // 02</span>
                    <span className="font-serif-display text-lg sm:text-xl font-bold text-[var(--hf-text)] mt-0.5 block">XYZ / STAR</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Bullet Revision</span>
                  </div>
                  <div className="p-3 sm:p-3.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)] block">SPEC // 03</span>
                    <span className="font-serif-display text-lg sm:text-xl font-bold text-[var(--hf-cta)] mt-0.5 block">150 CR</span>
                    <span className="text-[11px] text-[var(--hf-text-secondary)]">Daily Free Quota</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right 6 Columns: Live Interactive Dossier Report Card (REPORT #402) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              className="lg:col-span-6 w-full"
            >
              {/* Tactile Dossier Folder Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {heroTabs.map((tab) => {
                  const isActive = activeHeroTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveHeroTab(tab.id)}
                      className={`px-2.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider border-[1.5px] border-[var(--hf-ink-border)] transition-all cursor-pointer flex items-center justify-center sm:justify-between ${
                        isActive
                          ? 'bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] shadow-[2px_2px_0px_var(--hf-cta)] -translate-y-0.5'
                          : 'bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] hover:bg-[var(--hf-surface-secondary)]'
                      }`}
                    >
                      <span>{tab.code}. {tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Dossier Sheet with Hard 5px Offset Ink Shadow */}
              <div className="bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[5px_5px_0px_var(--hf-ink-border)] p-5 sm:p-6 min-h-[420px] flex flex-col justify-between">
                {/* Dossier Stamp Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b-[1.5px] border-[var(--hf-ink-border)]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--hf-text)]">
                      REPORT #402 // SENIOR_FRONTEND
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 border transition-colors ${
                      heroXyzApplied
                        ? 'bg-[var(--hf-mint)] text-[var(--hf-success)] border-[var(--hf-success)]'
                        : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] border-[var(--hf-ink-border)]'
                    }`}
                  >
                    INDEX: {heroScore} / 100
                  </span>
                </div>

                {/* Animated Dossier Body */}
                <div className="flex-1 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {activeHeroTab === 'audit' && (
                      <motion.div
                        key="dossier-audit"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between bg-[var(--hf-surface-secondary)] p-3.5 border border-[var(--hf-ink-border)]">
                          <div className="min-w-0 pr-3">
                            <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-cta)] block">
                              {heroXyzApplied ? 'STATUS: XYZ REVISION APPLIED (+17 PTS)' : 'CANDIDATE BASELINE AUDIT'}
                            </span>
                            <h2 className="font-serif-display text-lg font-bold text-[var(--hf-text)] truncate">
                              Alex Rivera — Senior Frontend
                            </h2>
                          </div>
                          <AnimatedCircularGauge score={heroScore} size={62} strokeWidth={6} />
                        </div>

                        {/* Interactive Live Simulator Toggle inside Hero Dossier */}
                        <div className="p-3 bg-[var(--hf-bg)] border border-[var(--hf-ink-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="text-xs min-w-0">
                            <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)] block">
                              {heroXyzApplied ? 'UPGRADED BULLET ACTIVE:' : 'FLAGGED PASSIVE BULLET:'}
                            </span>
                            <p className={`text-xs truncate mt-0.5 ${heroXyzApplied ? 'text-[var(--hf-success)] font-medium' : 'text-[var(--hf-text-secondary)] italic'}`}>
                              {heroXyzApplied
                                ? '“Architected modular React data-fetching, cutting p95 latency 42%...”'
                                : '“Worked on the customer dashboard and improved loading speed.”'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHeroXyzApplied((v) => !v)}
                            className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase border-[1.5px] border-[var(--hf-ink-border)] shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                              heroXyzApplied
                                ? 'bg-[var(--hf-surface)] text-[var(--hf-text)] shadow-[2px_2px_0px_var(--hf-ink-border)]'
                                : 'bg-[var(--hf-btn-primary-bg)] text-[var(--hf-btn-primary-text)] shadow-[2px_2px_0px_var(--hf-cta)]'
                            }`}
                          >
                            {heroXyzApplied ? (
                              <>
                                <RotateCcw className="w-3 h-3" /> REVERT DRAFT
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" /> APPLY XYZ FIX
                              </>
                            )}
                          </button>
                        </div>

                        {/* 4 Animated Monospace Spec Bars */}
                        <div className="space-y-2 font-mono text-xs">
                          {heroBars.map((row) => (
                            <div key={row.code} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[var(--hf-text-secondary)]">{row.code}</span>
                                <strong className="text-[var(--hf-text)] tabular-nums">{row.val}%</strong>
                              </div>
                              <div className="h-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] overflow-hidden">
                                <motion.div
                                  initial={false}
                                  animate={{ width: `${row.val}%` }}
                                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold uppercase text-[var(--hf-cta)]">
                            EDITORIAL REVISION MEMO // XYZ FORMULA
                          </span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[var(--hf-mint)] text-[var(--hf-success)] border border-[var(--hf-success)]">
                            +17 PT IMPACT LIFT
                          </span>
                        </div>

                        <div className="p-3.5 bg-[var(--hf-error-bg)] border border-[var(--hf-error)] space-y-1">
                          <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-error)] block">
                            — ORIGINAL DRAFT (UNQUANTIFIED)
                          </span>
                          <p className="text-xs text-[var(--hf-text-secondary)] line-through">
                            &ldquo;Worked on the customer dashboard and improved page loading performance.&rdquo;
                          </p>
                        </div>

                        <div className="p-3.5 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-ink-border)] space-y-2">
                          <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-success)] block">
                            + ENGINEERED XYZ STATEMENT
                          </span>
                          <p className="font-serif-display text-sm sm:text-base text-[var(--hf-text)] leading-snug">
                            &ldquo;Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.&rdquo;
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
                            <span className="px-1.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]">VERB: ARCHITECTED</span>
                            <span className="px-1.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]">METRIC: -42% LATENCY</span>
                            <span className="px-1.5 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] font-bold">SCALE: 120K MAU</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeHeroTab === 'jobs' && (
                      <motion.div
                        key="dossier-jobs"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2.5"
                      >
                        <div className="flex items-center justify-between font-mono text-xs pb-1">
                          <span className="font-bold text-[var(--hf-text)]">LIVE JSEARCH REQUISITION INDEX</span>
                          <span className="text-[var(--hf-cta)] font-bold">3 VERIFIED MATCHES</span>
                        </div>
                        {[
                          { company: 'CLOUDSCALE PAYMENTS', role: 'Senior Frontend Engineer', loc: 'Remote', fit: '94% FIT' },
                          { company: 'VELOCITY DEVTOOLS', role: 'Staff UI Systems Engineer', loc: 'Bengaluru / Hybrid', fit: '91% FIT' },
                          { company: 'NEXUS ANALYTICS', role: 'Frontend Platform Lead', loc: 'Remote', fit: '88% FIT' }
                        ].map((job) => (
                          <div key={job.company} className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] flex items-center justify-between gap-3">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-[var(--hf-text-muted)] block">{job.company} · {job.loc}</span>
                              <span className="font-serif-display text-base font-bold text-[var(--hf-text)]">{job.role}</span>
                            </div>
                            <span className="font-mono text-xs font-bold px-2 py-1 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] text-[var(--hf-success)] shrink-0">
                              {job.fit}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeHeroTab === 'pipeline' && (
                      <motion.div
                        key="dossier-pipeline"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-bold text-[var(--hf-text)]">KANBAN REQUISITION LEDGER</span>
                          <span className="text-[var(--hf-text-muted)]">8 TRACKED</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { stage: 'APPLIED (5)', company: 'CloudScale', note: '94% Match' },
                            { stage: 'INTERVIEW (2)', company: 'Velocity', note: 'Round Tomorrow' },
                            { stage: 'OFFER (1)', company: 'DesignOps', note: '₹36L Base' }
                          ].map((col) => (
                            <div key={col.stage} className="p-2.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] space-y-2">
                              <span className="font-mono text-[10px] font-bold text-[var(--hf-text)] block border-b border-[var(--hf-ink-border)] pb-1">
                                {col.stage}
                              </span>
                              <div className="p-2 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)]">
                                <p className="text-xs font-bold text-[var(--hf-text)]">{col.company}</p>
                                <p className="font-mono text-[10px] text-[var(--hf-cta)] mt-0.5">{col.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dossier Footer Note */}
                  <div className="pt-3 mt-4 border-t border-[var(--hf-border)] flex items-center justify-between font-mono text-[10px] text-[var(--hf-text-muted)]">
                    <span>{isHeroPaused ? 'STATUS: INTERACTIVE_HOLD' : 'STATUS: AUTO_CYCLE · TRY [APPLY XYZ FIX]'}</span>
                    <span>RUBRIC // V2.4</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* EDITORIAL SPECIFICATION MARQUEE RIBBON                                    */}
      {/* ========================================================================= */}
      <div className="border-y-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface-secondary)] py-2.5 overflow-hidden select-none">
        <div className="animate-marquee font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--hf-text)]">
          {[...tickerSpecs, ...tickerSpecs].map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-4 mx-4">
              <span>{item}</span>
              <span className="text-[var(--hf-cta)]">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 6-MODULE DOSSIER INDEX WITH EMBEDDED MINI-WIDGETS                  */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="max-w-2xl mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)] block mb-2">
              SECTION 01 // SYSTEM ARCHITECTURE
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
              Six connected modules in one candidate dossier.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Your master resume, target requisition, identified skill gaps, and interview evaluations share context automatically across the workspace.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MODULE 01: Resume Analyzer */}
            <FadeInSection delay={0.04}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 01
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">4-FACTOR ATS</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Resume Analyzer</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Weighted diagnostic evaluating technical skill coverage, hard metrics, seniority alignment, and linear ATS parsability.
                  </p>
                  {/* Mini Rubric Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] font-mono text-[10px] space-y-1.5">
                    <div className="flex justify-between"><span>SKILLS (40%)</span><strong>85%</strong></div>
                    <div className="h-1.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]"><div className="h-full bg-[var(--hf-text)]" style={{ width: '85%' }} /></div>
                    <div className="flex justify-between pt-0.5"><span>METRICS (30%)</span><strong className="text-[var(--hf-cta)]">75%</strong></div>
                    <div className="h-1.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]"><div className="h-full bg-[var(--hf-cta)]" style={{ width: '75%' }} /></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/resume-analyzer" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT ANALYZER →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* MODULE 02: Resume Editor */}
            <FadeInSection delay={0.08}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 02
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">XYZ BUILDER</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Resume Editor</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Single-column ATS resume builder with inline Google-XYZ bullet refactoring and machine-readable PDF export.
                  </p>
                  {/* Mini Diff Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] space-y-1.5 text-[11px]">
                    <div className="font-mono text-[10px] font-bold text-[var(--hf-success)]">+ XYZ VERIFIED REWRITE</div>
                    <p className="text-[var(--hf-text)] leading-snug">
                      &ldquo;Reduced p95 API latency <strong>38%</strong> using Redis read-through caching...&rdquo;
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/resume-editor" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT EDITOR →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* MODULE 03: Live Job Index */}
            <FadeInSection delay={0.12}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 03
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">LIVE JSEARCH</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Live Job Index</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Discover verified live tech openings scored directly against your master resume so you see skill overlap upfront.
                  </p>
                  {/* Mini Job Fit Preview */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--hf-text)] truncate">Staff Frontend Eng</p>
                      <p className="font-mono text-[10px] text-[var(--hf-text-muted)]">Remote · React, TS</p>
                    </div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] shrink-0">
                      92% FIT
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/job-finder" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT JOB INDEX →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* MODULE 04: Application Tracker */}
            <FadeInSection delay={0.16}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 04
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">KANBAN + LEDGER</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Application Tracker</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Dual Kanban board and requisition ledger organizing active applications across Applied, Interview, and Offer stages.
                  </p>
                  {/* Mini 3-Col Kanban Strip */}
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    <div className="p-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] text-center">
                      <span className="block text-[var(--hf-text-muted)]">APPLIED</span>
                      <strong className="text-xs">5</strong>
                    </div>
                    <div className="p-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] text-center">
                      <span className="block text-[var(--hf-cta)]">LOOP</span>
                      <strong className="text-xs">2</strong>
                    </div>
                    <div className="p-2 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-center text-[var(--hf-success)]">
                      <span className="block">OFFER</span>
                      <strong className="text-xs">1</strong>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/job-tracker" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT TRACKER →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* MODULE 05: Career Roadmap */}
            <FadeInSection delay={0.2}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 05
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">30-DAY SYLLABUS</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Career Roadmap</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Sequential engineering milestones and proof-of-work project specs generated directly from your resume skill gaps.
                  </p>
                  {/* Mini Milestone Strip */}
                  <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>01. CORE WEB VITALS</span>
                      <span className="text-[var(--hf-success)] font-bold">DONE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>02. BUNDLE TELEMETRY</span>
                      <span className="text-[var(--hf-cta)] font-bold">ACTIVE</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/career-advisor" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT ROADMAP →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* MODULE 06: Interview Lab */}
            <FadeInSection delay={0.24}>
              <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                      MODULE 06
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--hf-cta)]">STAR SIMULATOR</span>
                  </div>
                  <h3 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[var(--hf-cta)]" />
                    <span>Interview Lab</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                    Role-specific technical and behavioral mock interviews with structured 100-point STAR critiques and model answers.
                  </p>
                  {/* Mini STAR Score Grid */}
                  <div className="grid grid-cols-4 gap-1 font-mono text-[10px] text-center">
                    {[
                      { k: 'S', v: '22' },
                      { k: 'T', v: '21' },
                      { k: 'A', v: '23' },
                      { k: 'R', v: '20' }
                    ].map((s) => (
                      <div key={s.k} className="p-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)]">
                        <span className="text-[var(--hf-text-muted)] block">{s.k}</span>
                        <strong className="text-[var(--hf-text)]">{s.v}/25</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-[var(--hf-border)]">
                  <Link to="/interview-lab" className="font-mono text-xs font-bold text-[var(--hf-text)] hover:text-[var(--hf-cta)] transition-colors">
                    INSPECT INTERVIEW LAB →
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE DIAGNOSTIC RUBRIC & XYZ BULLET DIFF LEDGER                 */}
      {/* ========================================================================= */}
      <section id="interactive-rubric" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div className="max-w-7xl mx-auto space-y-10">
          <FadeInSection className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)] block mb-2">
                SECTION 02 // TRANSPARENT METHODOLOGY
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
                Mathematical scoring &amp; line-by-line bullet evidence.
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
                Select an engineering or product track to inspect how our 4-pillar diagnostic model and XYZ revision memo evaluate real candidate bullets.
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
                    className={`px-3.5 py-2 font-mono text-xs font-bold uppercase border-[1.5px] border-[var(--hf-ink-border)] transition-all cursor-pointer ${
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left 5 Cols: Weighted Rubric Specification Card */}
              <div className="lg:col-span-5 hf-card p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b-[1.5px] border-[var(--hf-ink-border)]">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--hf-text-muted)] block">
                        TARGET REQUISITION
                      </span>
                      <h3 className="font-serif-display text-xl font-bold text-[var(--hf-text)] mt-0.5">
                        {activeBenchmark.roleTitle}
                      </h3>
                    </div>
                    <div className="px-3 py-1 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] font-mono text-lg font-bold text-[var(--hf-text)]">
                      {activeBenchmark.overallScore} / 100
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeBenchmark.pillars.map((pillar, i) => (
                      <div key={pillar.code} className="space-y-1.5">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-bold text-[var(--hf-text)]">
                            {pillar.code} <span className="text-[var(--hf-text-muted)] font-normal">({pillar.weight})</span>
                          </span>
                          <span className="font-bold text-[var(--hf-cta)]">{pillar.score}%</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] overflow-hidden">
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
                  <span>Scores reflect documented heuristic weights and semantic alignment, not automated hiring decisions.</span>
                </div>
              </div>

              {/* Right 7 Cols: Editorial Before/After Bullet Memo + Keyword Ledger */}
              <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
                <div className="hf-card p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hf-cta)]">
                      EDITORIAL BULLET REVISION MEMO
                    </span>
                    <span className="font-mono text-[11px] text-[var(--hf-text-muted)]">GOOGLE XYZ STANDARD</span>
                  </div>

                  {/* Before Draft */}
                  <div className="p-4 bg-[var(--hf-error-bg)] border border-[var(--hf-error)] space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-[var(--hf-error)] flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> PASSIVE DRAFT (BEFORE)
                      </span>
                      <span className="text-[10px] text-[var(--hf-error)]">UNQUANTIFIED</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] line-through">
                      &ldquo;{activeBenchmark.beforeBullet}&rdquo;
                    </p>
                  </div>

                  {/* After Revision */}
                  <div className="p-4 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-ink-border)] space-y-3">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-[var(--hf-success)] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ENGINEERED REVISION (AFTER)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--hf-mint)] text-[var(--hf-success)] border border-[var(--hf-success)]">
                        VERIFIED METRIC
                      </span>
                    </div>
                    <p className="font-serif-display text-base sm:text-lg text-[var(--hf-text)] leading-snug">
                      &ldquo;{activeBenchmark.afterBullet}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                      <span className="px-2 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]">
                        <strong>ACTION:</strong> {activeBenchmark.verbTag}
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)]">
                        <strong>SCOPE:</strong> {activeBenchmark.scopeTag}
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--hf-mint)] border border-[var(--hf-success)] text-[var(--hf-success)] font-bold">
                        <strong>OUTCOME:</strong> {activeBenchmark.metricTag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keyword Telemetry Ledger */}
                <div className="hf-card p-5 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-[var(--hf-text)]">KEYWORD INDEX // {activeBenchmark.code}</span>
                    <span className="text-[var(--hf-text-muted)]">
                      {activeBenchmark.matchedKeywords.length} VERIFIED · {activeBenchmark.missingKeywords.length} FLAGGED
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {activeBenchmark.matchedKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-ink-border)] font-semibold">
                        <Check className="w-3 h-3 text-[var(--hf-success)]" /> {kw}
                      </span>
                    ))}
                    {activeBenchmark.missingKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 text-[var(--hf-cta)] border border-[var(--hf-cta)] font-bold">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Specification Comparison Ledger */}
          <FadeInSection className="pt-4">
            <div className="hf-card overflow-hidden">
              <div className="px-5 py-3.5 bg-[var(--hf-surface-secondary)] border-b-[1.5px] border-[var(--hf-ink-border)] flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hf-text)]">
                  SPECIFICATION COMPARISON // WHY DOSSIER ARCHITECTURE
                </span>
                <span className="font-mono text-[10px] text-[var(--hf-text-muted)] hidden sm:inline">AUDIT VS. GENERIC TOOLS</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-bg)] font-mono">
                      <th className="p-3.5 font-bold text-[var(--hf-text)]">EVALUATION DIMENSION</th>
                      <th className="p-3.5 font-bold text-[var(--hf-text-muted)]">GENERIC CHATBOTS</th>
                      <th className="p-3.5 font-bold text-[var(--hf-cta)]">HIREFLOW // DOSSIER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hf-border)]">
                    {[
                      ['Scoring Transparency', 'Opaque single number with no rubric', '4 weighted pillars (40 / 30 / 15 / 15) + line evidence'],
                      ['Bullet Rewriting', 'Often invents fake numbers or fluff', 'Anchored strictly to your real resume + XYZ prompts'],
                      ['Job Discovery', 'Manual copy-paste across 10 tabs', 'Live JSearch feed ranked against your resume stack'],
                      ['Interview Rehearsal', 'Unstructured chat Q&A', '100-point STAR rubric + senior model answers'],
                    ].map(([dim, gen, hf]) => (
                      <tr key={dim} className="hover:bg-[var(--hf-surface-secondary)]/40 transition-colors">
                        <td className="p-3.5 font-semibold text-[var(--hf-text)]">{dim}</td>
                        <td className="p-3.5 text-[var(--hf-text-muted)]">{gen}</td>
                        <td className="p-3.5 font-medium text-[var(--hf-text)] flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0" />
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
      {/* 4. PRICING LEDGER (EXACT TIERS, PRICES, AND LIMITS PRESERVED)             */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)] block mb-2">
              SECTION 03 // SUBSCRIPTION LEDGER
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
              Straightforward, predictable pricing.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
              Start on the Free tier with 150 daily renewing credits, or upgrade when your application volume scales.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <FadeInSection delay={0.05}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <h3 className="font-serif-display text-2xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.free.name}</h3>
                    <span className="hf-badge">TIER 01</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.free.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.free.priceFormatted.INR}</span>
                    <span className="font-mono text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.free.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.free.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)]">
                        <Check className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0 mt-0.5" />
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
                  {user ? 'OPEN WORKSPACE' : 'START FREE TIER'}
                </button>
              </SpotlightCard>
            </FadeInSection>

            {/* Pro Plan */}
            <FadeInSection delay={0.1}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6 bg-[var(--hf-surface-secondary)]/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-ink-border)]">
                    <h3 className="font-serif-display text-2xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                    <span className="hf-badge hf-badge-cta">{SUBSCRIPTION_PLANS.pro.badge}</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.pro.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.pro.priceFormatted.INR}</span>
                    <span className="font-mono text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.pro.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-ink-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.pro.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text)] font-medium">
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
                  UPGRADE TO PRO →
                </button>
              </SpotlightCard>
            </FadeInSection>

            {/* Premium Plan */}
            <FadeInSection delay={0.15}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border)]">
                    <h3 className="font-serif-display text-2xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.premium.name}</h3>
                    <span className="hf-badge">TIER 03</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.premium.tagline}</p>
                  <div className="pt-1 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[var(--hf-text)] tabular-nums">{SUBSCRIPTION_PLANS.premium.priceFormatted.INR}</span>
                    <span className="font-mono text-xs text-[var(--hf-text-muted)]">{SUBSCRIPTION_PLANS.premium.period}</span>
                  </div>

                  <div className="pt-4 border-t border-[var(--hf-border)] space-y-2.5">
                    {SUBSCRIPTION_PLANS.premium.bulletFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)]">
                        <Check className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0 mt-0.5" />
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
                  UPGRADE TO PREMIUM
                </button>
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FAQ DOSSIER ACCORDION                                                  */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div className="max-w-3xl mx-auto">
          <FadeInSection className="mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)] block mb-2">
              SECTION 04 // REFERENCE FAQ
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
                      <span className="font-serif-display text-base sm:text-lg font-bold text-[var(--hf-text)]">
                        0{idx + 1}. {faq.q}
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
      {/* 6. FINAL DOSSIER CONVERSION CTA                                           */}
      {/* ========================================================================= */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 text-center bg-[var(--hf-surface)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />
        <FadeInSection className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="font-mono text-xs font-bold uppercase tracking-widest px-2.5 py-1 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] text-[var(--hf-text)]">
            READY FOR INSPECTION
          </span>
          <h2 className="font-serif-display text-3xl sm:text-5xl font-normal tracking-tight text-[var(--hf-text)]">
            Open your candidate dossier today.
          </h2>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-lg mx-auto">
            Upload your current resume to run a 4-factor ATS diagnostic, engineer measurable XYZ bullets, and track target requisitions.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="hf-btn-primary min-h-[46px] px-7 text-xs sm:text-sm w-full sm:w-auto gap-2 disabled:opacity-60"
            >
              <span>{isLaunching ? 'AUTHENTICATING...' : 'RUN RESUME DIAGNOSTIC →'}</span>
            </button>
            <Link
              to="/resume-analyzer"
              className="hf-btn-secondary min-h-[46px] px-6 text-xs sm:text-sm w-full sm:w-auto"
            >
              EXPLORE ANALYZER SPEC
            </Link>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
