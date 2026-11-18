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
  AnimatedCounter,
  FadeInSection
} from '../components/AnimatedPrimitives';
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
  X,
  Building2,
  MapPin,
  Layers,
  BarChart3,
  GraduationCap
} from 'lucide-react';
import { useState, useEffect } from 'react';

type HeroTabId = 'audit' | 'rewrite' | 'jobs' | 'pipeline';
type RoleBenchmarkId = 'frontend' | 'backend' | 'ai' | 'product';

const ROLE_BENCHMARKS: Record<RoleBenchmarkId, {
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
  pillars: { name: string; weight: string; score: number; evidence: string }[];
}> = {
  frontend: {
    label: 'Frontend Engineering',
    roleTitle: 'Senior Frontend Engineer',
    overallScore: 82,
    beforeBullet: 'Worked on the customer dashboard and improved page loading performance.',
    afterBullet: 'Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.',
    verbTag: 'Architected',
    scopeTag: 'React data-fetching & bundle splitting',
    metricTag: '-42% p95 latency (120k MAU)',
    matchedKeywords: ['React 18', 'TypeScript', 'Next.js', 'GraphQL', 'Design Systems', 'Playwright'],
    missingKeywords: ['Core Web Vitals', 'Vite Bundle Analysis'],
    pillars: [
      { name: 'Core Technical Skills', weight: '40%', score: 85, evidence: 'React, TypeScript, GraphQL, Next.js verified across 4 years.' },
      { name: 'Quantified Impact', weight: '30%', score: 75, evidence: '5 of 8 bullets include numerical latency or adoption metrics.' },
      { name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Evidences design system ownership and code review leadership.' },
      { name: 'ATS Parsability', weight: '15%', score: 86, evidence: 'Single-column hierarchy with machine-readable date ranges.' }
    ]
  },
  backend: {
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
      { name: 'Core Technical Skills', weight: '40%', score: 88, evidence: 'Go, PostgreSQL, Kafka, and Kubernetes production architecture.' },
      { name: 'Quantified Impact', weight: '30%', score: 82, evidence: 'Clear throughput (TPS), SLA uptime, and p99 latency figures.' },
      { name: 'Role Seniority Scope', weight: '15%', score: 86, evidence: 'Led distributed schema migrations and on-call incident runbooks.' },
      { name: 'ATS Parsability', weight: '15%', score: 89, evidence: 'Clean chronological sections with zero multi-column traps.' }
    ]
  },
  ai: {
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
      { name: 'Core Technical Skills', weight: '40%', score: 86, evidence: 'Python, PyTorch, retrieval pipelines, and evaluation frameworks.' },
      { name: 'Quantified Impact', weight: '30%', score: 80, evidence: 'Includes retrieval precision lift and corpus scale metrics.' },
      { name: 'Role Seniority Scope', weight: '15%', score: 83, evidence: 'End-to-end ownership from offline evaluation to production API.' },
      { name: 'ATS Parsability', weight: '15%', score: 87, evidence: 'Standardized technical skill taxonomy and section labels.' }
    ]
  },
  product: {
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
      { name: 'Core Technical Skills', weight: '40%', score: 82, evidence: 'SQL cohort analysis, experimentation, and technical PRD authorship.' },
      { name: 'Quantified Impact', weight: '30%', score: 78, evidence: 'Strong conversion rate and ARR attribution on key launches.' },
      { name: 'Role Seniority Scope', weight: '15%', score: 84, evidence: 'Cross-functional leadership across engineering, design, and GTM.' },
      { name: 'ATS Parsability', weight: '15%', score: 85, evidence: 'Clear role progression and scannable accomplishment bullets.' }
    ]
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openUpgradeModal } = usePlan();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLaunching, setIsLaunching] = useState(false);

  // Interactive Hero Workbench Tab State + Auto-rotation
  const [activeHeroTab, setActiveHeroTab] = useState<HeroTabId>('audit');
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  // Interactive Role Benchmark Switcher State
  const [selectedRole, setSelectedRole] = useState<RoleBenchmarkId>('frontend');

  useEffect(() => {
    if (isHeroPaused) return;
    const order: HeroTabId[] = ['audit', 'rewrite', 'jobs', 'pipeline'];
    const timer = setInterval(() => {
      setActiveHeroTab((prev) => {
        const nextIdx = (order.indexOf(prev) + 1) % order.length;
        return order[nextIdx];
      });
    }, 5500);
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

  const heroTabs: { id: HeroTabId; label: string; icon: any; badge: string }[] = [
    { id: 'audit', label: '1. ATS Diagnostic', icon: FileSearch, badge: '82 / 100' },
    { id: 'rewrite', label: '2. XYZ Bullet Engineer', icon: FileEdit, badge: '+14 pts' },
    { id: 'jobs', label: '3. Live Job Matcher', icon: Briefcase, badge: '94% Match' },
    { id: 'pipeline', label: '4. Kanban Pipeline', icon: Layers, badge: '8 Active' },
  ];

  const faqItems = [
    {
      q: "What makes AI HireFlow different from standard job boards?",
      a: "AI HireFlow is a complete career workspace. Instead of merely listing vacancies, we connect ATS resume diagnostics, XYZ bullet rewriting, live job compatibility scoring, mock interview simulations, and Kanban application tracking in one unified system."
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

  return (
    <div className="flex flex-col bg-[var(--hf-bg)] text-[var(--hf-text)] selection:bg-[var(--hf-cta)] selection:text-white min-h-screen">
      <SEOHead 
        title="AI HireFlow | Career Platform for Resume Analysis, Job Search & Interview Prep"
        description="Check ATS resume compatibility, build single-column resumes, practice technical mock interviews, find matched jobs, and map out career roadmaps."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH ARCHITECTURAL GRID CANVAS & LIVE 4-TAB WORKBENCH     */}
      {/* ========================================================================= */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] overflow-hidden">
        {/* Subtle Architectural Grid Background */}
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)] shadow-2xs mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--hf-cta)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--hf-cta)]" />
              </span>
              <span>ATS Diagnostics · XYZ Resume Editor · Live Job Matcher</span>
            </div>

            <h1 className="font-sans font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.07] mb-5">
              Make every application more intentional.
            </h1>

            <p className="text-base sm:text-lg text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              Audit your resume against a transparent 4-factor rubric, engineer quantified experience bullets, discover live roles matched to your stack, and rehearse before the interview.
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
                href="#interactive-rubric"
                className="hf-btn-secondary min-h-[46px] px-6 text-sm font-medium w-full sm:w-auto"
              >
                Inspect live rubric
              </a>
            </div>

            {/* Key Platform Metrics Strip Above the Fold */}
            <div className="mt-7 pt-6 border-t border-[var(--hf-border)]/70 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div>
                <p className="text-lg sm:text-xl font-bold text-[var(--hf-text)] tabular-nums">
                  4-Factor
                </p>
                <p className="text-[11px] text-[var(--hf-text-muted)]">Weighted ATS Rubric</p>
              </div>
              <div className="border-x border-[var(--hf-border)] px-2">
                <p className="text-lg sm:text-xl font-bold text-[var(--hf-text)] tabular-nums">
                  XYZ / STAR
                </p>
                <p className="text-[11px] text-[var(--hf-text-muted)]">Impact Bullet Engine</p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-[var(--hf-text)] tabular-nums">
                  150 CR
                </p>
                <p className="text-[11px] text-[var(--hf-text-muted)]">Free Daily Allowance</p>
              </div>
            </div>
          </motion.div>

          {/* Interactive 4-Tab Hero Product Workbench */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setIsHeroPaused(true)}
            onMouseLeave={() => setIsHeroPaused(false)}
            className="max-w-5xl mx-auto"
          >
            {/* Interactive Tab Switcher Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              {heroTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeHeroTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveHeroTab(tab.id)}
                    className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 overflow-hidden ${
                      isActive
                        ? 'bg-[var(--hf-surface)] border-[var(--hf-cta)]/50 text-[var(--hf-text)] shadow-sm'
                        : 'bg-[var(--hf-surface)]/70 hover:bg-[var(--hf-surface)] border-[var(--hf-border)] text-[var(--hf-text-secondary)]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="hero-tab-active-bg"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        className="absolute inset-0 bg-[var(--hf-cta)]/[0.04] pointer-events-none"
                      />
                    )}
                    <div className="flex items-center gap-2 min-w-0 relative z-10">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--hf-cta)]' : 'text-[var(--hf-text-muted)]'}`} />
                      <span className="text-xs font-semibold truncate">{tab.label}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 relative z-10 ${
                      isActive
                        ? 'bg-[var(--hf-cta)] text-white'
                        : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-muted)] border border-[var(--hf-border)]'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Application Window Frame */}
            <div className="rounded-2xl border border-[var(--hf-border)] bg-[var(--hf-surface)] shadow-xl overflow-hidden">
              {/* macOS / Browser Window Chrome Header */}
              <div className="px-4 py-3 bg-[var(--hf-surface-secondary)]/80 border-b border-[var(--hf-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="h-3.5 w-[1px] bg-[var(--hf-border)]" />
                  <div className="flex items-center gap-2 text-xs text-[var(--hf-text-secondary)] font-medium">
                    <FileText className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                    <span className="font-mono text-[11px]">workspace / senior-frontend-engineer</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--hf-text-muted)] hidden sm:inline">
                    {isHeroPaused ? 'Interactive preview (paused)' : 'Interactive preview · Click tabs above'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)]">
                    Live Workbench
                  </span>
                </div>
              </div>

              {/* Animated Tab Content Area */}
              <div className="p-5 sm:p-7 min-h-[370px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {activeHeroTab === 'audit' && (
                    <motion.div
                      key="tab-audit"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6"
                    >
                      {/* Top Score Row with Animated Radial SVG Gauge */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--hf-border)]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)]">
                              ATS Compatibility Report
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20">
                              Strong Alignment
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl font-bold text-[var(--hf-text)]">
                            alex_rivera_resume.pdf → Senior Frontend Engineer
                          </h2>
                        </div>

                        <AnimatedCircularGauge
                          score={82}
                          size={76}
                          strokeWidth={6}
                          label="Composite Match"
                          sublabel="4 weighted dimensions"
                        />
                      </div>

                      {/* 4 Animated Progress Pillars */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {[
                          { label: 'Core Technical Skills', weight: '40%', score: 85, note: 'React, TypeScript, Next.js, GraphQL', color: 'bg-[var(--hf-cta)]' },
                          { label: 'Quantified Impact', weight: '30%', score: 75, note: '5 of 8 bullets contain hard metrics', color: 'bg-[var(--hf-warning)]' },
                          { label: 'Role Seniority Scope', weight: '15%', score: 84, note: 'Architecture & mentoring verified', color: 'bg-[var(--hf-success)]' },
                          { label: 'ATS Parsability', weight: '15%', score: 86, note: 'Single-column, clean date hierarchy', color: 'bg-[var(--hf-success)]' }
                        ].map((item, idx) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06, duration: 0.3 }}
                            className="p-4 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-[var(--hf-text-secondary)]">{item.label}</span>
                              <span className="text-[10px] font-mono text-[var(--hf-text-muted)]">{item.weight}</span>
                            </div>
                            <div className="text-xl font-bold text-[var(--hf-text)] tabular-nums">
                              {item.score}%
                            </div>
                            <div className="w-full h-1.5 bg-[var(--hf-border)] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.score}%` }}
                                transition={{ duration: 0.8, delay: 0.1 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                className={`h-full rounded-full ${item.color}`}
                              />
                            </div>
                            <p className="text-[11px] text-[var(--hf-text-secondary)] leading-snug">{item.note}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Keyword Pills & Priority Action */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-7 p-4 rounded-xl bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--hf-text)]">Detected Requirement Keywords</span>
                            <span className="text-[11px] text-[var(--hf-text-muted)]">6 matched · 2 missing</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {['React 18', 'TypeScript', 'GraphQL', 'Next.js', 'CI/CD', 'Design Systems'].map((kw, i) => (
                              <motion.span
                                key={kw}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.15 + i * 0.04 }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-border)]"
                              >
                                <Check className="w-3 h-3 text-[var(--hf-success)]" /> {kw}
                              </motion.span>
                            ))}
                            {['Core Web Vitals', 'Bundle Analysis'].map((kw) => (
                              <span
                                key={kw}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-[var(--hf-warning)] border border-amber-500/25"
                              >
                                + {kw}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-5 p-4 rounded-xl bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0">
                            <SlidersHorizontal className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--hf-text)]">Highest-Leverage Fix</p>
                            <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 leading-relaxed">
                              Add quantified latency reduction and bundle splitting figures to 3 passive experience bullets to lift score from <strong>82 → 91</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeHeroTab === 'rewrite' && (
                    <motion.div
                      key="tab-rewrite"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--hf-border)]">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
                            Google XYZ Bullet Transformation
                          </span>
                          <h3 className="text-lg font-bold text-[var(--hf-text)] mt-0.5">
                            Accomplished [X] as measured by [Y], by doing [Z]
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20">
                          +14 pt Impact Score Lift
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Original Passive Bullet */}
                        <div className="p-5 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] border-l-4 border-l-rose-500/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-error)]">
                              <X className="w-3.5 h-3.5" /> Original Resume Bullet
                            </span>
                            <span className="text-[11px] font-mono text-[var(--hf-text-muted)]">Impact: 48/100</span>
                          </div>
                          <p className="text-sm text-[var(--hf-text-secondary)] line-through decoration-rose-500/50 bg-[var(--hf-surface)] p-4 rounded-lg border border-[var(--hf-border)] leading-relaxed">
                            &ldquo;Worked on the customer dashboard and improved page loading performance.&rdquo;
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--hf-text-muted)]">
                            <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)]">Weak verb: &ldquo;Worked on&rdquo;</span>
                            <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)]">Missing tech stack</span>
                            <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)]">Zero metrics</span>
                          </div>
                        </div>

                        {/* Engineered XYZ Bullet */}
                        <motion.div
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1, duration: 0.35 }}
                          className="p-5 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] border-l-4 border-l-[var(--hf-success)] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-success)]">
                              <Check className="w-3.5 h-3.5" /> Engineered XYZ Revision
                            </span>
                            <span className="text-[11px] font-mono text-[var(--hf-success)] font-semibold">Impact: 94/100</span>
                          </div>
                          <p className="text-sm text-[var(--hf-text)] font-medium bg-[var(--hf-surface)] p-4 rounded-lg border border-[var(--hf-border)] leading-relaxed">
                            &ldquo;Architected modular data-fetching in React and optimized bundle splitting, reducing p95 page load latency by 42% across 120,000 monthly active users.&rdquo;
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-[var(--hf-cta)]/10 text-[var(--hf-cta)] border border-[var(--hf-cta)]/20 font-medium">
                              Verb: Architected
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-border)] font-medium">
                              Stack: React &amp; Bundle Splitting
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20 font-medium">
                              Metric: -42% latency (120k MAU)
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {activeHeroTab === 'jobs' && (
                    <motion.div
                      key="tab-jobs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--hf-border)]">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
                            Semantic Job Discovery
                          </span>
                          <h3 className="text-lg font-bold text-[var(--hf-text)] mt-0.5">
                            Live openings ranked against your master resume
                          </h3>
                        </div>
                        <span className="text-xs text-[var(--hf-text-secondary)] bg-[var(--hf-surface-secondary)] px-3 py-1 rounded-lg border border-[var(--hf-border)]">
                          Filter: Senior Frontend · Remote / Hybrid
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          {
                            title: 'Senior Frontend Engineer',
                            company: 'CloudScale Payments',
                            location: 'Remote · India / Global',
                            match: 94,
                            skills: ['React 18', 'TypeScript', 'GraphQL', 'Design Systems'],
                            posted: 'Posted 4h ago'
                          },
                          {
                            title: 'Staff UI Systems Engineer',
                            company: 'Velocity DevTools',
                            location: 'Bengaluru · Hybrid',
                            match: 91,
                            skills: ['TypeScript', 'Next.js', 'Performance', 'Tailwind'],
                            posted: 'Posted 9h ago'
                          },
                          {
                            title: 'Frontend Platform Lead',
                            company: 'Nexus Analytics',
                            location: 'Remote',
                            match: 88,
                            skills: ['React', 'State Management', 'CI/CD', 'Testing'],
                            posted: 'Posted 1d ago'
                          }
                        ].map((job, idx) => (
                          <motion.div
                            key={job.title}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07, duration: 0.3 }}
                            className="p-4 rounded-xl bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] flex flex-col justify-between space-y-4"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)] shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold tabular-nums bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20">
                                  {job.match}% Match
                                </span>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--hf-text)]">{job.title}</h4>
                                <p className="text-xs text-[var(--hf-text-secondary)] flex items-center gap-1.5 mt-0.5">
                                  <span>{job.company}</span>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {job.location}</span>
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {job.skills.map((s) => (
                                  <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-[11px]">
                              <span className="text-[var(--hf-text-muted)]">{job.posted}</span>
                              <span className="font-semibold text-[var(--hf-cta)]">Tailor Resume →</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeHeroTab === 'pipeline' && (
                    <motion.div
                      key="tab-pipeline"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--hf-border)]">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
                            Application Pipeline CRM
                          </span>
                          <h3 className="text-lg font-bold text-[var(--hf-text)] mt-0.5">
                            Track every stage from initial application to final offer
                          </h3>
                        </div>
                        <span className="text-xs text-[var(--hf-text-secondary)]">
                          Synced with Interview Lab &amp; Outreach Hub
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          {
                            stage: 'Applied',
                            count: 5,
                            pillColor: 'bg-[var(--hf-surface)] text-[var(--hf-text-secondary)]',
                            items: [
                              { company: 'CloudScale Payments', role: 'Senior Frontend Engineer', meta: '94% ATS Match · 2d ago' },
                              { company: 'Linear Systems', role: 'Product UI Engineer', meta: '89% ATS Match · 4d ago' }
                            ]
                          },
                          {
                            stage: 'Interview Stage',
                            count: 2,
                            pillColor: 'bg-blue-500/10 text-[var(--hf-cta)] border-blue-500/20',
                            items: [
                              { company: 'Velocity DevTools', role: 'Staff UI Engineer', meta: 'System Design Round · Tomorrow' },
                              { company: 'FinTech Global', role: 'Lead Frontend Engineer', meta: 'Hiring Manager Loop · Thu' }
                            ]
                          },
                          {
                            stage: 'Offer Received',
                            count: 1,
                            pillColor: 'bg-emerald-500/10 text-[var(--hf-success)] border-emerald-500/20',
                            items: [
                              { company: 'DesignOps SaaS', role: 'Principal UI Architect', meta: '₹36L Base + Equity · Reviewing' }
                            ]
                          }
                        ].map((col, idx) => (
                          <motion.div
                            key={col.stage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                            className="p-3.5 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-2.5"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--hf-border)]">
                              <span className="text-xs font-semibold text-[var(--hf-text)]">{col.stage}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--hf-border)] tabular-nums ${col.pillColor}`}>
                                {col.count}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {col.items.map((card) => (
                                <div key={card.company} className="p-3 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] shadow-2xs space-y-1">
                                  <p className="text-xs font-semibold text-[var(--hf-text)]">{card.company}</p>
                                  <p className="text-[11px] text-[var(--hf-text-secondary)]">{card.role}</p>
                                  <p className="text-[10px] font-mono text-[var(--hf-cta)] pt-1">{card.meta}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ASYMMETRIC INTERACTIVE BENTO GRID (6 CONNECTED WORKSPACE MODULES)      */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Connected Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Every tool shares context across your job search.
            </h2>
            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Your master resume, target job description, identified skill gaps, and interview evaluations flow automatically between modules.
            </p>
          </FadeInSection>

          {/* Asymmetric 12-Column Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento Cell 1 (7 Cols): Resume Analyzer */}
            <FadeInSection delay={0.05} className="lg:col-span-7">
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs font-semibold text-[var(--hf-text)]">
                      <FileSearch className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                      <span>Resume Analyzer</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--hf-text-muted)]">4-Pillar ATS Audit</span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--hf-text)]">
                      Pinpoint exact keyword and metric gaps before you apply
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-1.5 leading-relaxed">
                      Evaluates technical skill overlap, quantified outcomes, seniority scope, and single-column ATS parsability against any target job requisition.
                    </p>
                  </div>

                  {/* Embedded Mini Animated UI Graphic */}
                  <div className="p-4 rounded-xl bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { k: 'Technical Match', v: '85%', w: '85%' },
                      { k: 'Hard Metrics', v: '75%', w: '75%' },
                      { k: 'Role Scope', v: '84%', w: '84%' },
                      { k: 'Parsability', v: '86%', w: '86%' }
                    ].map((stat) => (
                      <div key={stat.k} className="p-2.5 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)]">
                        <span className="text-[10px] text-[var(--hf-text-muted)] block truncate">{stat.k}</span>
                        <span className="text-sm font-bold text-[var(--hf-text)] tabular-nums mt-0.5 block">{stat.v}</span>
                        <div className="w-full h-1 bg-[var(--hf-border)] rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-[var(--hf-cta)] rounded-full" style={{ width: stat.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--hf-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--hf-text-muted)]">Includes automated cover letter generator</span>
                  <Link to="/resume-analyzer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-cta)] hover:underline">
                    <span>Explore Resume Analyzer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* Bento Cell 2 (5 Cols): Resume Editor */}
            <FadeInSection delay={0.1} className="lg:col-span-5">
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs font-semibold text-[var(--hf-text)]">
                      <FileEdit className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                      <span>Resume Editor</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--hf-text-muted)]">XYZ Builder &amp; PDF</span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--hf-text)]">
                      Single-column ATS builder with inline bullet rewrites
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-1.5 leading-relaxed">
                      Rewrite weak bullets using Google&rsquo;s XYZ framework and export clean, machine-readable vector PDFs.
                    </p>
                  </div>

                  {/* Mini Diff Preview */}
                  <div className="p-3.5 rounded-xl bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-[var(--hf-cta)] font-semibold">XYZ Assistant</span>
                      <span className="text-[var(--hf-success)] font-medium">✓ Metric Verified</span>
                    </div>
                    <p className="text-[11px] text-[var(--hf-text-secondary)] bg-[var(--hf-surface)] p-2.5 rounded-lg border border-[var(--hf-border)] leading-relaxed">
                      &ldquo;Reduced API p95 response time by <strong className="text-[var(--hf-text)]">38%</strong> by implementing Redis read-through caching...&rdquo;
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--hf-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--hf-text-muted)]">1-click PDF export</span>
                  <Link to="/resume-editor" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-cta)] hover:underline">
                    <span>Explore Resume Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* Bento Cell 3 (5 Cols): Job Finder */}
            <FadeInSection delay={0.12} className="lg:col-span-5">
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs font-semibold text-[var(--hf-text)]">
                      <Briefcase className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                      <span>Job Finder</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--hf-text-muted)]">Live JSearch Feed</span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--hf-text)]">
                      Live job discovery ranked by resume compatibility
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-1.5 leading-relaxed">
                      Search verified external job openings and immediately see your skill overlap percentage before clicking apply.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">Senior Full Stack Engineer</p>
                      <p className="text-[11px] text-[var(--hf-text-secondary)]">Remote · React, Node.js, PostgreSQL</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-[var(--hf-success)] border border-emerald-500/20 shrink-0">
                      92% Fit
                    </span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--hf-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--hf-text-muted)]">Exact &amp; related role categorization</span>
                  <Link to="/job-finder" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-cta)] hover:underline">
                    <span>Explore Job Finder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>

            {/* Bento Cell 4 (7 Cols): Interview Lab & Career Roadmap & Tracker */}
            <FadeInSection delay={0.16} className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">
                {/* Sub-card A: Interview Lab */}
                <SpotlightCard className="p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--hf-text)]">Interview Lab</h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                      Role-tailored technical and behavioral mock interviews graded on the STAR rubric with model senior answers.
                    </p>
                  </div>
                  <Link to="/interview-lab" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--hf-cta)] hover:underline pt-4 mt-4 border-t border-[var(--hf-border)]">
                    <span>Interview Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </SpotlightCard>

                {/* Sub-card B: Job Tracker */}
                <SpotlightCard className="p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--hf-text)]">Job Tracker</h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                      Kanban pipeline board to organize applications across Applied, Interview, Offer, and Rejected stages.
                    </p>
                  </div>
                  <Link to="/job-tracker" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--hf-cta)] hover:underline pt-4 mt-4 border-t border-[var(--hf-border)]">
                    <span>Job Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </SpotlightCard>

                {/* Sub-card C: Career Roadmap */}
                <SpotlightCard className="p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--hf-text)]">Career Roadmap</h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                      30-day technical curriculum and proof-of-work projects to close missing skill gaps from your resume audit.
                    </p>
                  </div>
                  <Link to="/career-advisor" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--hf-cta)] hover:underline pt-4 mt-4 border-t border-[var(--hf-border)]">
                    <span>Career Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </SpotlightCard>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE ROLE BENCHMARK & LIVE BEFORE/AFTER DIFF INSPECTOR          */}
      {/* ========================================================================= */}
      <section id="interactive-rubric" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto space-y-10">
          <FadeInSection className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Interactive Diagnostic Explorer
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
                Transparent scoring across every engineering &amp; product track.
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
                Select a domain below to inspect how the 4-factor mathematical rubric and XYZ bullet engine evaluate real role profiles.
              </p>
            </div>

            {/* Interactive Role Switcher Pills with Shared Layout */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[var(--hf-surface)] border border-[var(--hf-border)] self-start">
              {(Object.keys(ROLE_BENCHMARKS) as RoleBenchmarkId[]).map((roleKey) => {
                const isSelected = selectedRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setSelectedRole(roleKey)}
                    className={`relative px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer z-10 ${
                      isSelected
                        ? 'text-white font-semibold'
                        : 'text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="role-benchmark-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-[var(--hf-cta)] -z-10"
                      />
                    )}
                    {ROLE_BENCHMARKS[roleKey].label}
                  </button>
                );
              })}
            </div>
          </FadeInSection>

          {/* Animated Role Benchmark Comparison Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left 5 Cols: 4-Factor Weighted Rubric Breakdown */}
              <div className="lg:col-span-5 hf-card p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--hf-border)]">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--hf-text-muted)] block">
                        Target Requisition
                      </span>
                      <h3 className="text-base font-bold text-[var(--hf-text)] mt-0.5">
                        {activeBenchmark.roleTitle}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[var(--hf-cta)] tabular-nums">
                        {activeBenchmark.overallScore}
                      </span>
                      <span className="text-xs text-[var(--hf-text-muted)]"> / 100</span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {activeBenchmark.pillars.map((pillar, i) => (
                      <div key={pillar.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--hf-text)]">
                            {pillar.name} <span className="text-[var(--hf-text-muted)] font-normal">({pillar.weight})</span>
                          </span>
                          <span className="font-mono font-semibold text-[var(--hf-text)] tabular-nums">{pillar.score}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pillar.score}%` }}
                            transition={{ duration: 0.65, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full bg-[var(--hf-cta)] rounded-full"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--hf-text-secondary)] leading-snug">
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

              {/* Right 7 Cols: Live Before vs. After Bullet Diff + Keyword Evidence */}
              <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
                <div className="hf-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)]">
                      Before &amp; After Bullet Engineering
                    </span>
                    <span className="text-xs text-[var(--hf-text-muted)]">Google XYZ / STAR Formulation</span>
                  </div>

                  {/* Before Draft */}
                  <div className="p-4 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] border-l-4 border-l-rose-500/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--hf-error)] flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Passive Task Statement
                      </span>
                      <span className="text-[11px] text-[var(--hf-text-muted)]">Unquantified</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] italic">
                      &ldquo;{activeBenchmark.beforeBullet}&rdquo;
                    </p>
                  </div>

                  {/* After Revision */}
                  <div className="p-4 rounded-xl bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] border-l-4 border-l-[var(--hf-success)] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--hf-success)] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Quantified Impact Statement
                      </span>
                      <span className="text-[11px] text-[var(--hf-success)] font-medium">High ATS Signal</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--hf-text)] font-medium leading-relaxed">
                      &ldquo;{activeBenchmark.afterBullet}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)]">
                        <strong>Action:</strong> {activeBenchmark.verbTag}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)]">
                        <strong>Scope:</strong> {activeBenchmark.scopeTag}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[var(--hf-success)] font-medium">
                        <strong>Outcome:</strong> {activeBenchmark.metricTag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keyword Audit Box */}
                <div className="hf-card p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">Domain Keyword Telemetry</span>
                    <span className="text-[var(--hf-text-muted)]">
                      {activeBenchmark.matchedKeywords.length} matched · {activeBenchmark.missingKeywords.length} flagged
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeBenchmark.matchedKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)]">
                        <Check className="w-3 h-3 text-[var(--hf-success)]" /> {kw}
                      </span>
                    ))}
                    {activeBenchmark.missingKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-[var(--hf-warning)] border border-amber-500/25">
                        + {kw} (Recommended gap)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THREE-STEP WORKFLOW & DATA GOVERNANCE                                  */}
      {/* ========================================================================= */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div>
            <FadeInSection className="max-w-2xl mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Execution Sequence
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
                Three steps from raw resume draft to interview readiness.
              </h2>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  phase: 'Diagnostics',
                  title: 'Upload and diagnose',
                  desc: 'Parse your PDF or DOCX resume against target job requirements to uncover missing technical keywords, vague phrasing, and formatting risks.',
                  link: '/resume-analyzer',
                  cta: 'Inspect Analyzer'
                },
                {
                  step: '02',
                  phase: 'Engineering',
                  title: 'Refine and align',
                  desc: 'Transform passive duties into high-impact accomplishment bullets using the XYZ structure inside our single-column ATS resume builder.',
                  link: '/resume-editor',
                  cta: 'Inspect Editor'
                },
                {
                  step: '03',
                  phase: 'Execution',
                  title: 'Discover, rehearse & track',
                  desc: 'Find high-match live openings, practice role-specific technical interviews with STAR rubric feedback, and track progress on your Kanban board.',
                  link: '/job-finder',
                  cta: 'Inspect Job Finder'
                }
              ].map((item, idx) => (
                <FadeInSection key={item.step} delay={idx * 0.08}>
                  <SpotlightCard className="p-6 h-full flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[var(--hf-cta)] px-2.5 py-0.5 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                          STEP {item.step}
                        </span>
                        <span className="text-xs text-[var(--hf-text-muted)]">{item.phase}</span>
                      </div>
                      <h3 className="text-base font-bold text-[var(--hf-text)]">{item.title}</h3>
                      <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs">
                      <Link to={item.link} className="font-semibold text-[var(--hf-cta)] hover:underline inline-flex items-center gap-1">
                        <span>{item.cta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </SpotlightCard>
                </FadeInSection>
              ))}
            </div>
          </div>

          {/* Compact Trust & Data Governance Strip */}
          <FadeInSection>
            <div className="p-6 sm:p-7 rounded-2xl bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--hf-text)]">Account-scoped isolation</h3>
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                    Your uploaded resumes, search history, and tracker records are isolated strictly under your authenticated Firebase account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-warning)] shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--hf-text)]">Candidate-reviewed edits</h3>
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                    AI suggestions never overwrite your master profile without confirmation. Always verify technical claims and figures before applying.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-success)] shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--hf-text)]">Honest expectations</h3>
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                    No software can guarantee hiring outcomes. HireFlow is an engineering workbench to help you present your real qualifications clearly.
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRICING TABLE (EXACT TIERS, PRICES, AND LIMITS PRESERVED)              */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              Pricing &amp; Plans
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Straightforward, predictable pricing.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
              Start on the Free tier with daily renewing credits, or upgrade when your application volume scales.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <FadeInSection delay={0.05}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
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
              </SpotlightCard>
            </FadeInSection>

            {/* Pro Plan */}
            <FadeInSection delay={0.1}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6 border-2 border-[var(--hf-cta)] relative">
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
              </SpotlightCard>
            </FadeInSection>

            {/* Premium Plan */}
            <FadeInSection delay={0.15}>
              <SpotlightCard className="p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
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
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SMOOTH ANIMATED FAQ ACCORDION                                          */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-3xl mx-auto">
          <FadeInSection className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
              Details on our scoring methodology, free tier allowances, and data privacy.
            </p>
          </FadeInSection>

          <div className="space-y-3">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <FadeInSection key={idx} delay={idx * 0.04}>
                  <div className="hf-card overflow-hidden transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full min-h-[52px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[var(--hf-text)]">
                        {faq.q}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[var(--hf-text-secondary)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--hf-cta)]' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
      {/* 7. FINAL CONVERSION CTA                                                   */}
      {/* ========================================================================= */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />
        <FadeInSection className="relative z-10 max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
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
              Explore Resume Analyzer
            </Link>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
