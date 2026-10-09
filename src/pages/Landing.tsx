import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import SEOHead from '../components/SEOHead';
import { 
  FileSearch, 
  Sparkles, 
  Target, 
  Briefcase, 
  ArrowRight, 
  ShieldCheck, 
  FileEdit, 
  Mic, 
  GraduationCap, 
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  Compass
} from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openUpgradeModal } = usePlan();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

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
  ];

  return (
    <div className="flex flex-col bg-[var(--hf-bg)] text-[var(--hf-text)] selection:bg-[var(--hf-cta)] selection:text-white min-h-screen">
      <SEOHead 
        title="AI HireFlow | AI-Powered Career Operating System"
        description="AI HireFlow is the complete AI career platform. Check ATS resume compatibility, build ATS-friendly resumes, practice AI mock interviews, find matched jobs, and create career roadmaps."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* 1. Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--hf-surface-secondary)] text-[var(--hf-ai-teal)] border border-[var(--hf-border)] mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
              <span>Career operating platform</span>
            </div>

            <h1 className="font-sans font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight text-[var(--hf-text)] leading-[1.05] mb-6">
              Make every application more intentional.
            </h1>

            <p className="text-lg sm:text-xl text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              Improve your resume, find roles that fit your actual skills, and practice the conversation before it happens.
            </p>

            {/* Keyword-Rich Visible SEO Subheading */}
            <p className="text-xs sm:text-sm text-[var(--hf-text-muted)] mb-8 max-w-xl mx-auto">
              Comprehensive tools for ATS resume analysis, resume building, semantic job finding, and interview simulation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isLaunching}
                className="hf-btn-primary min-h-[48px] px-6 text-sm w-full sm:w-auto gap-2 shadow-xs disabled:opacity-60"
              >
                <span>{isLaunching ? 'Signing in...' : 'Analyze my resume'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#workflow"
                className="hf-btn-secondary min-h-[48px] px-6 text-sm w-full sm:w-auto"
              >
                Explore how it works
              </a>
            </div>
          </div>

          {/* Hero Visual: Realistic Product Panel (Labeled Sample) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="hf-card p-5 sm:p-7 shadow-xs relative">
              {/* Top Bar with Sample Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="hf-badge hf-badge-teal">Sample analysis</span>
                  <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
                    Target role: Senior Frontend Engineer
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--hf-text-muted)]">Benchmark score</span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)] tabular-nums">
                    82 / 100 [Sample]
                  </span>
                </div>
              </div>

              {/* 4 Category Score Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                  <span className="text-xs text-[var(--hf-text-secondary)] block">Core skills (40%)</span>
                  <span className="text-lg font-semibold text-[var(--hf-text)] tabular-nums mt-1 block">85 / 100 [Sample]</span>
                  <span className="text-[11px] text-[var(--hf-success)] font-medium mt-0.5 block">High technical fit</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                  <span className="text-xs text-[var(--hf-text-secondary)] block">Impact metrics (30%)</span>
                  <span className="text-lg font-semibold text-[var(--hf-text)] tabular-nums mt-1 block">75 / 100 [Sample]</span>
                  <span className="text-[11px] text-[var(--hf-warning)] font-medium mt-0.5 block">Add business outcomes</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                  <span className="text-xs text-[var(--hf-text-secondary)] block">Role seniority (15%)</span>
                  <span className="text-lg font-semibold text-[var(--hf-text)] tabular-nums mt-1 block">84 / 100 [Sample]</span>
                  <span className="text-[11px] text-[var(--hf-success)] font-medium mt-0.5 block">Matches experience</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                  <span className="text-xs text-[var(--hf-text-secondary)] block">ATS parsability (15%)</span>
                  <span className="text-lg font-semibold text-[var(--hf-text)] tabular-nums mt-1 block">86 / 100 [Sample]</span>
                  <span className="text-[11px] text-[var(--hf-success)] font-medium mt-0.5 block">Clean structure</span>
                </div>
              </div>

              {/* Sample Actionable Recommendation Box */}
              <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--hf-text)]">Prioritized recommendation [Sample]</p>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                      Quantify performance metrics in your current role: add measurable outcomes for frontend architecture and latency reduction.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--hf-cta)] font-medium shrink-0 self-start sm:self-center">
                  Review suggestion
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Sample Resume-to-Job Match with Transparent Score Explanation */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Diagnostic rubric</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Transparent scoring, not black-box guesses.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              Every score on AI HireFlow is tied to a documented rubric. Below is an inspection of how a sample Senior Frontend Engineer profile is scored against a target job requisition.
            </p>
          </div>

          <div className="hf-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--hf-border)]">
              <div>
                <span className="text-xs text-[var(--hf-text-muted)] uppercase tracking-wider block">Target role context</span>
                <h3 className="text-lg font-semibold text-[var(--hf-text)] mt-0.5">Senior Frontend Engineer Requisition [Sample]</h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-[var(--hf-text-muted)] block">Calculated match score</span>
                <span className="text-2xl font-bold text-[var(--hf-cta)] tabular-nums">82 / 100 [Sample]</span>
              </div>
            </div>

            {/* Score Breakdown Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-text-muted)]">
                Category weighting & evidence [Sample]
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">1. Core technical skills (40% weight)</span>
                    <span className="font-semibold text-[var(--hf-text)] tabular-nums">85 / 100 [Sample]</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <strong>Evidence:</strong> Identified React, TypeScript, GraphQL, Next.js, and automated testing across 4 career years. Missing keywords flagged: Webpack/Vite bundle analysis, Web Vitals monitoring.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">2. Quantifiable impact metrics (30% weight)</span>
                    <span className="font-semibold text-[var(--hf-text)] tabular-nums">75 / 100 [Sample]</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <strong>Evidence:</strong> 5 of 8 experience bullets include numerical results. 3 bullets rely on passive phrasing ("responsible for component creation") without business impact.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">3. Role seniority relevance (15% weight)</span>
                    <span className="font-semibold text-[var(--hf-text)] tabular-nums">84 / 100 [Sample]</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <strong>Evidence:</strong> Demonstrates cross-functional design collaboration and code review ownership. Scope aligns with Senior Engineer requirements.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--hf-text)]">4. Structural ATS parsability (15% weight)</span>
                    <span className="font-semibold text-[var(--hf-text)] tabular-nums">86 / 100 [Sample]</span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <strong>Evidence:</strong> Clear section headers, standard date ranges, zero multi-column parsing traps, and machine-readable text encoding.
                  </p>
                </div>
              </div>
            </div>

            {/* Transparent Limitations Notice */}
            <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] text-xs text-[var(--hf-text-secondary)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Limitations disclosure:</strong> Employer ATS configurations vary (e.g. Workday, Greenhouse, Lever). Diagnostic scores reflect best-practice heuristic rubrics and semantic matching, not recruiter decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Before-and-After Resume Bullet Example (Labeled Sample) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Bullet optimization</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Turn passive task lists into measurable impact.
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              See how the AI writing assistant refines a bullet point for our Senior Frontend Engineer sample profile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Bullet */}
            <div className="hf-card p-6 border-l-4 border-l-[var(--hf-text-muted)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--hf-text-muted)] uppercase tracking-wider">Before [Sample]</span>
                <span className="text-[11px] text-[var(--hf-error)] font-medium">Lacks metrics & specificity</span>
              </div>
              <p className="text-sm text-[var(--hf-text-secondary)] italic leading-relaxed bg-[var(--hf-surface-secondary)] p-4 rounded-lg border border-[var(--hf-border)]">
                &ldquo;Worked on the customer dashboard and improved page loading performance.&rdquo;
              </p>
              <ul className="text-xs text-[var(--hf-text-muted)] space-y-1 list-disc list-inside">
                <li>Passive verb (&ldquo;Worked on&rdquo;)</li>
                <li>No scope of technology mentioned</li>
                <li>Unmeasured claim (&ldquo;improved performance&rdquo;)</li>
              </ul>
            </div>

            {/* After Bullet */}
            <div className="hf-card p-6 border-l-4 border-l-[var(--hf-success)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--hf-success)] uppercase tracking-wider">After [Sample]</span>
                <span className="text-[11px] text-[var(--hf-success)] font-medium">STAR framework applied</span>
              </div>
              <p className="text-sm text-[var(--hf-text)] leading-relaxed bg-[var(--hf-surface-secondary)] p-4 rounded-lg border border-[var(--hf-border)]">
                &ldquo;Architected modular data-fetching in React and optimized bundle size, reducing page load latency by 42% across 120,000 monthly active users [Sample].&rdquo;
              </p>
              <ul className="text-xs text-[var(--hf-text-secondary)] space-y-1 list-disc list-inside">
                <li>Strong action verb: <strong>Architected</strong></li>
                <li>Clear technology scope: <strong>React bundle optimization</strong></li>
                <li>Quantified business metric: <strong>42% latency reduction, 120k users [Sample]</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three-Step Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Workflow</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              How AI HireFlow works
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              A structured 3-step sequence designed to make each application thoughtful and competitive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold text-[var(--hf-cta)]">
                01
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Upload and diagnose</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Scan your resume against target job requirements to identify missing technical keywords, weak impact phrasing, and formatting risks.
              </p>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold text-[var(--hf-cta)]">
                02
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Refine and align</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Strengthen bullet points using STAR impact formulation and clean single-column structure in the resume editor before exporting your PDF.
              </p>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold text-[var(--hf-cta)]">
                03
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Rehearse and track</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Practice role-specific interview questions with real-time feedback, discover high-match job openings, and manage applications on your board.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Six Core Feature Modules */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Platform modules</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Integrated career tools
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              Every feature connects directly to your job search process. Explore individual modules below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Resume Analyzer */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <FileSearch className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Resume Analyzer</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  ATS compatibility audit, technical keyword density mapping, and category-level scoring with actionable feedback.
                </p>
              </div>
              <Link 
                to="/resume-analyzer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Resume Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 2. Resume Editor */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <FileEdit className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Resume Editor</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Single-column ATS builder with AI bullet refinement, section reorganizing, and instant PDF download.
                </p>
              </div>
              <Link 
                to="/resume-editor"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Resume Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3. Job Finder */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Job Finder</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Discover job listings matching your skills with role compatibility percentages computed from your resume.
                </p>
              </div>
              <Link 
                to="/job-finder"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Job Finder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 4. Job Tracker */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Job Tracker</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Pipeline board to organize applications across applied, interview, offer, and rejected stages.
                </p>
              </div>
              <Link 
                to="/job-tracker"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Job Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 5. Career Advisor */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Career Advisor</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Diagnostic roadmap mapping step-by-step milestones to bridge technical skill gaps for your next target position.
                </p>
              </div>
              <Link 
                to="/career-advisor"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Career Advisor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 6. Interview Lab */}
            <div className="hf-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-4">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--hf-text)] mb-1.5">Interview Lab</h3>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Simulate technical and behavioral interview sessions with automated feedback structured around the STAR method.
                </p>
              </div>
              <Link 
                to="/interview-lab"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hf-cta)] hover:underline pt-2"
              >
                <span>Learn about Interview Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Trust & Responsible AI Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Responsible use</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Privacy, accuracy, and clear expectations
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              We believe career software must handle user information responsibly and be honest about how AI assists you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Account-scoped data</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                Authentication is handled securely via Firebase Authentication. Your uploaded resumes, search preferences, and tracker data are partitioned strictly to your authenticated account.
              </p>
              <Link to="/privacy" className="inline-flex items-center gap-1 text-xs text-[var(--hf-cta)] hover:underline pt-1">
                <span>Read privacy policy</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-warning)]">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">Review AI suggestions</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                AI language models can make mistakes, misinterpret domain jargon, or produce imprecise phrasing. We urge all users to carefully review, edit, and verify all suggestions before applying.
              </p>
            </div>

            <div className="hf-card p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-success)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-[var(--hf-text)]">No exaggerated guarantees</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                No software can guarantee interviews or hiring outcomes. AI HireFlow is designed as an assistive preparation platform to help you structure and refine your genuine qualifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Table (Exact Tiers, Prices, and Limits Preserved) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Subscription plans</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Straightforward pricing
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              Start with the free tier to scan resumes and explore features, or upgrade for higher daily allowances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.free.name}</h3>
                  <span className="hf-badge text-[11px]">Free tier</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.free.tagline}</p>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.free.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-secondary)] ml-1">{SUBSCRIPTION_PLANS.free.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2">
                  {SUBSCRIPTION_PLANS.free.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--hf-text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
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
                {user ? 'Current plan' : 'Get started free'}
              </button>
            </div>

            {/* Pro Plan (Recommended) */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-6 border-2 border-[var(--hf-cta)] relative shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                  <span className="hf-badge hf-badge-cta text-[11px] font-semibold">{SUBSCRIPTION_PLANS.pro.badge}</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.pro.tagline}</p>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.pro.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-secondary)] ml-1">{SUBSCRIPTION_PLANS.pro.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2">
                  {SUBSCRIPTION_PLANS.pro.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--hf-text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
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
                  <span className="hf-badge text-[11px]">Active search</span>
                </div>
                <p className="text-xs text-[var(--hf-text-secondary)]">{SUBSCRIPTION_PLANS.premium.tagline}</p>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-[var(--hf-text)]">{SUBSCRIPTION_PLANS.premium.priceFormatted.INR}</span>
                  <span className="text-xs text-[var(--hf-text-secondary)] ml-1">{SUBSCRIPTION_PLANS.premium.period}</span>
                </div>

                <div className="pt-4 border-t border-[var(--hf-border)] space-y-2">
                  {SUBSCRIPTION_PLANS.premium.bulletFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--hf-text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
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

      {/* 8. Frequently Asked Questions (Word for Word Content Preserved) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="hf-badge hf-badge-teal mb-3">Support</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
              Common questions regarding our resume diagnostics, scoring methods, and security practices.
            </p>
          </div>

          <div className="space-y-3.5">
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
                    className="w-full min-h-[48px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
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

      {/* 9. Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
            Ready to make every application intentional?
          </h2>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-lg mx-auto">
            Audit your resume against ATS benchmarks, refine your experience bullets, and practice for your next interview.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="hf-btn-primary min-h-[48px] px-8 text-sm w-full sm:w-auto gap-2 disabled:opacity-60"
            >
              <span>{isLaunching ? 'Signing in...' : 'Analyze my resume now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/resume-analyzer"
              className="hf-btn-secondary min-h-[48px] px-6 text-sm w-full sm:w-auto"
            >
              Explore sample scanner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
