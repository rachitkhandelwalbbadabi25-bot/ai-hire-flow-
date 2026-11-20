import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_PERSONA } from '../data/sampleData';
import { 
  FileEdit, 
  Layers, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  SlidersHorizontal,
  FileText
} from 'lucide-react';

export default function ResumeEditorSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Resume Editor",
    "url": "https://www.aihireflow.in/resume-editor",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Interactive ATS resume editor and builder. Structure professional resumes, polish bullet points with AI assistance, and export clean, single-column PDFs."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/editor');
      return;
    }
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/editor');
      }
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', error);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  // Static editor mockup mirroring real editor (section editing, AI bullet rewrite, live preview, PDF export)
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Editor preview</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Single-column ATS format
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)] flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
            <span>PDF export ready</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Section Editing Mockup */}
        <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-3.5">
          <div className="flex items-center justify-between text-xs border-b border-[var(--hf-border)] pb-2">
            <span className="font-semibold text-[var(--hf-text)]">Section: Work Experience</span>
            <span className="text-[11px] text-[var(--hf-cta)] font-medium">Auto-saved</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-[var(--hf-text-secondary)] font-medium">Role title & tenure:</span>
            <div className="text-xs font-semibold text-[var(--hf-text)] bg-[var(--hf-surface)] p-2 rounded border border-[var(--hf-border)]">
              {SAMPLE_PERSONA.targetRole} &bull; 2022 &ndash; Present
            </div>
          </div>

          {/* AI Bullet Rewrite Suggestion Box */}
          <div className="p-3.5 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-cta)]/40 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
                <span>XYZ bullet rewrite</span>
              </span>
              <span className="text-[10px] text-[var(--hf-success)] font-medium bg-[var(--hf-surface-secondary)] px-1.5 py-0.5 rounded">
                STAR metric added
              </span>
            </div>
            <p className="text-xs text-[var(--hf-text)] leading-relaxed">
              &ldquo;{SAMPLE_PERSONA.bulletExample.after}&rdquo;
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[var(--hf-cta)] font-medium">Applied to draft</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live ATS Preview */}
        <div className="p-4 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-[var(--hf-border)] pb-2 text-[var(--hf-text-muted)]">
            <span>Live single-column preview</span>
            <span>Page 1 of 1</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="border-b border-[var(--hf-border)] pb-2">
              <h4 className="font-bold text-sm text-[var(--hf-text)]">Alex Rivera</h4>
              <p className="text-[11px] text-[var(--hf-text-secondary)]">alex.rivera@example.com &bull; +1 (555) 000-0000 &bull; Remote</p>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-[var(--hf-text)] uppercase tracking-wider text-[10px] text-[var(--hf-cta)]">
                Experience
              </h5>
              <p className="font-semibold text-xs text-[var(--hf-text)] mt-1">{SAMPLE_PERSONA.targetRole}</p>
              <ul className="list-disc list-inside text-[11px] text-[var(--hf-text-secondary)] space-y-1 mt-1 leading-relaxed">
                <li>Architected modular data-fetching in React, reducing load latency by 42%.</li>
                <li>Mentored 4 frontend engineers and established TypeScript lint standards.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="Free ATS Resume Builder & Single-Column Editor — AI HireFlow"
      metaDescription="Build an ATS-friendly single-column resume with AI HireFlow. Rewrite bullets with STAR/XYZ metrics, preview live formatting, and export clean vector PDFs."
      canonicalPath="/resume-editor"
      jsonLd={jsonLd}
      badgeText="Structured Resume Creation Engine"
      h1="AI Resume Editor"
      heroDescription="Craft beautiful, ATS-optimized resumes engineered for recruiter review. Upgrade your bullets with quantifiable impact metrics, maintain clean section hierarchy, and download ready-to-submit PDFs instantly."
      ctaLabel="Open Resume Editor"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the Resume Editor Works"
      howItWorksSubtitle="A seamless workflow from raw draft to recruiter-ready PDF."
      howItWorks={[
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
      ]}
      capabilitiesTitle="Built Specifically for Modern ATS Algorithms"
      capabilitiesSubtitle="Fancy multi-column templates and graphics get corrupted when ingested by enterprise ATS parsers. The AI HireFlow Resume Editor enforces clean single-column structure."
      capabilities={[
        {
          icon: Layers,
          title: "Clean ATS Hierarchy",
          desc: "Standardized section headers (Experience, Technical Skills, Education, Projects) guarantee seamless parsing across any enterprise hiring portal."
        },
        {
          icon: Sparkles,
          title: "AI Writing Assistant",
          desc: "Select any bullet to transform passive task descriptions into strong, outcome-oriented statements featuring action verbs and verifiable business scope."
        },
        {
          icon: Download,
          title: "Instant Clean PDF Export",
          desc: "Export ATS-friendly, high-resolution vector PDFs with consistent typography, proper margins, and zero layout shift."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Formatting and customization details."
      faqItems={[
        {
          q: "Why is single-column layout recommended for ATS?",
          a: "Many ATS parsers read resumes top-to-bottom and left-to-right. Dual columns can cause text to merge across columns (e.g. putting dates into job descriptions), creating garbled parsing. Single-column layouts ensure 100% linear text reading."
        },
        {
          q: "Can I export multiple tailored versions?",
          a: "Yes. You can duplicate or modify your Master Resume for different target positions and export tailored versions anytime."
        },
        {
          q: "Is the Resume Editor free to use?",
          a: "Yes! Structuring and downloading your resume is completely free. AI bullet assistance uses included initial credits."
        }
      ]}
      finalCtaTitle="Ready to Build Your Resume?"
      finalCtaDesc="Create a single-column, recruiter-ready resume with assisted bullet formulation and instant PDF export."
      finalCtaLabel="Start Editing Your Resume"
    />
  );
}
