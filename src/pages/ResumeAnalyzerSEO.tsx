import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_PERSONA } from '../data/sampleData';
import { 
  BarChart3, 
  Zap, 
  ShieldCheck, 
  SlidersHorizontal,
  FileSearch,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ResumeAnalyzerSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

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
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/analyzer');
      }
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', error);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  // Unique Sample Visual: Annotated sample resume audit with categories, missing keywords, and evidence
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Sample audit</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Role: {SAMPLE_PERSONA.targetRole}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--hf-text-muted)]">Benchmark score</span>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)] tabular-nums">
            {SAMPLE_PERSONA.scoreLabel}
          </span>
        </div>
      </div>

      {/* 4 Score Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SAMPLE_PERSONA.categories.map((cat, idx) => (
          <div key={idx} className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
            <span className="text-xs text-[var(--hf-text-secondary)] block">
              {cat.name} ({cat.weight}%)
            </span>
            <span className="text-base font-semibold text-[var(--hf-text)] tabular-nums mt-1 block">
              {cat.scoreLabel}
            </span>
            <span className="text-[11px] text-[var(--hf-text-muted)] mt-1 line-clamp-2 block leading-relaxed">
              {cat.evidence}
            </span>
          </div>
        ))}
      </div>

      {/* Keyword Matching & Gaps */}
      <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--hf-text)]">
            Keyword coverage analysis
          </span>
          <span className="text-[11px] text-[var(--hf-text-muted)]">
            5 matched &bull; 3 missing
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--hf-text-secondary)] font-medium mr-1">Matched:</span>
            {SAMPLE_PERSONA.matchedKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-success)] font-medium">
                {kw}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--hf-text-secondary)] font-medium mr-1">Missing:</span>
            {SAMPLE_PERSONA.missingKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-error)] font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence-Grounded Recommendation */}
      <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0 mt-0.5">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--hf-text)]">Actionable evidence rewrite</p>
          <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 leading-relaxed">
            {SAMPLE_PERSONA.recommendation}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="Free ATS Resume Checker & AI Resume Analyzer — AI HireFlow"
      metaDescription="Check your ATS resume score free with AI HireFlow. Get a transparent 4-part weighted audit, missing keyword gap analysis, and evidence-grounded bullet rewrites."
      canonicalPath="/resume-analyzer"
      jsonLd={jsonLd}
      badgeText="AI Resume Intelligence Engine"
      h1="AI Resume Analyzer"
      heroDescription="Audit your resume with senior recruiter rigor. Detect missing technical keywords, eliminate ATS parsing roadblocks, evaluate quantifiable impact metrics, and optimize your qualifications for target positions."
      ctaLabel="Try Resume Analyzer"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the Resume Analyzer Works"
      howItWorksSubtitle="A structured 4-step audit to inspect and improve your resume."
      howItWorks={[
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
      ]}
      capabilitiesTitle="Why Standard ATS Checkers Fail Job Seekers"
      capabilitiesSubtitle="Most online resume checkers give arbitrary scores based on simple word count or keyword stuffing. AI HireFlow operates with transparent, weighted category scores."
      capabilities={[
        {
          icon: BarChart3,
          title: "Mathematical Transparency",
          desc: "Scores are divided into four clear categories: Core Technical Match (40%), Measurable Impact (25%), Role Relevance (20%), and Structure (15%). No hidden formulas or artificial clamping."
        },
        {
          icon: Zap,
          title: "Evidence-Grounded Rewrites",
          desc: "The analyzer never fabricates fake projects or metrics. Instead, it extracts your real experience bullets and provides truthful, tailored upgrades that highlight delivered value."
        },
        {
          icon: ShieldCheck,
          title: "Recruiter-Grade Advice",
          desc: "Gaps are categorized into direct evidence, transferable experience, or genuine gaps, delivering distinct, situational recommendations rather than repetitive templates."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Answers regarding scoring methodology and privacy."
      faqItems={[
        {
          q: "How does AI HireFlow calculate the ATS Compatibility Score?",
          a: "Our engine uses an authoritative 4-category weighted breakdown: Core Technical & Skill Match (40%), Measurable Impact & Hard Metrics (25%), Role & Domain Relevance (20%), and Structure & ATS Parsability (15%). Category points sum exactly to your final score without arbitrary inflation."
        },
        {
          q: "Does the analyzer invent fake metrics or experience?",
          a: "Never. Every recommendation, bullet rewrite, and skill gap is anchored strictly in the content of your resume. If a verified metric is missing, the tool prompts you to add a real figure rather than inventing fabricated statistics."
        },
        {
          q: "Is the Resume Analyzer free to try?",
          a: "Yes! Every new account receives free AI analysis credits to scan resumes, inspect keyword gaps, and review full recruiter audit reports."
        }
      ]}
      finalCtaTitle="Ready to Audit Your Resume?"
      finalCtaDesc="Get an actionable evaluation of your resume's technical coverage, impact metrics, and ATS compatibility."
      finalCtaLabel="Analyze Your Resume Now"
    />
  );
}
