import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_JOB_FINDER } from '../data/sampleData';
import { 
  Target, 
  BarChart3, 
  Zap, 
  Search, 
  Briefcase, 
  MapPin, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function JobFinderSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Job Finder",
    "url": "https://www.aihireflow.in/job-finder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Semantic job discovery and matching engine. Discover high-compatibility tech opportunities based on skill alignment, location preferences, and career goals."
  };

  const handleLaunch = () => {
    navigate('/finder');
  };

  // Sample Visual: Search query, filters, match score, matched and missing skills, and "why this role" explanation
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      {/* Search Header Bar Mockup */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Discovery preview</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Search: &ldquo;Senior Frontend Engineer&rdquo;
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--hf-text-muted)]">
          <span>Filter: Remote &bull; Full-time</span>
        </div>
      </div>

      {/* Matched Job Card Mockup */}
      <div className="p-4 sm:p-5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[var(--hf-text)] block">
              {SAMPLE_JOB_FINDER.role}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--hf-text-secondary)] mt-1">
              <span>{SAMPLE_JOB_FINDER.company}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--hf-text-muted)]" /> {SAMPLE_JOB_FINDER.location}</span>
              <span>&bull;</span>
              <span>{SAMPLE_JOB_FINDER.salary}</span>
            </div>
          </div>

          <div className="shrink-0 self-start">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--hf-surface)] text-[var(--hf-cta)] border border-[var(--hf-border)] tabular-nums flex items-center gap-1.5 shadow-xs">
              <span>{SAMPLE_JOB_FINDER.matchScoreLabel}</span>
            </span>
          </div>
        </div>

        {/* Matched & Missing Skills Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)]" />
              <span>Matched skills</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {SAMPLE_JOB_FINDER.matchedSkills.map((sk, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)]">
                  {sk}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[var(--hf-warning)]" />
              <span>Preferred gaps</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {SAMPLE_JOB_FINDER.missingSkills.map((sk, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)]">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Why This Role Explanation */}
        <div className="p-3.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1">
          <span className="text-xs font-semibold text-[var(--hf-text)]">
            Compatibility summary
          </span>
          <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
            {SAMPLE_JOB_FINDER.whyThisRole}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="AI Job Finder & Semantic Job Match Engine — AI HireFlow"
      metaDescription="Discover live tech & corporate jobs ranked by real resume skill overlap. Filter remote and local roles, inspect match percentages, and see missing requirements."
      canonicalPath="/job-finder"
      jsonLd={jsonLd}
      badgeText="Semantic Opportunity Discovery Engine"
      h1="AI Job Finder"
      heroDescription="Stop scrolling endless generic job boards. Discover roles that genuinely match your tech stack, evaluate qualification alignment in seconds, and target opportunities with verified hiring velocity."
      ctaLabel="Find Jobs"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the AI Job Finder Works"
      howItWorksSubtitle="Connect your qualifications directly to matching opportunities."
      howItWorks={[
        {
          step: "01",
          title: "Define Target Roles & Locations",
          desc: "Search for specific engineering titles, remote preferences, industry domains, and experience levels."
        },
        {
          step: "02",
          title: "AI Skill Gap Cross-Check",
          desc: "Instantly compare the job description with your resume to see which qualifications you meet and where you have gaps."
        },
        {
          step: "03",
          title: "Tailor Your Application",
          desc: "Use the Resume Analyzer and Editor to tailor your bullets for high-match roles before applying."
        },
        {
          step: "04",
          title: "Track Application Status",
          desc: "Send opportunities directly to your Kanban pipeline board to monitor follow-up timing and interview milestones."
        }
      ]}
      capabilitiesTitle="Search By Skill Alignment Rather Than Just Keywords"
      capabilitiesSubtitle="Traditional job portals rely on crude keyword filters that flood you with irrelevant postings. AI HireFlow measures technology overlap and role expectations."
      capabilities={[
        {
          icon: Target,
          title: "Automated Match Scoring",
          desc: "Every listing is scored against your resume profile so you immediately see your strengths and missing requirements before submitting an application."
        },
        {
          icon: BarChart3,
          title: "Verified Tech Stacks",
          desc: "Filter by specific languages, cloud providers, frameworks, and engineering tools to find roles that match your hands-on competencies."
        },
        {
          icon: Zap,
          title: "One-Click Pipeline Push",
          desc: "Save prospective positions straight to your AI Job Tracker board to manage interview stages, recruiter contacts, and deadline alerts."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Search intelligence and indexation details."
      faqItems={[
        {
          q: "How does semantic job matching work?",
          a: "Rather than checking if an exact keyword appears, our engine evaluates the semantic relationship between your demonstrated project work and the job's core technical requirements."
        },
        {
          q: "Can I search for remote and hybrid positions?",
          a: "Yes. You can specify remote, hybrid, or on-site preferences along with preferred technical compensation benchmarks."
        },
        {
          q: "How frequently are job listings refreshed?",
          a: "Openings are continuously indexed from active tech employers and startup hiring boards to ensure you only apply to genuine open positions."
        }
      ]}
      finalCtaTitle="Ready to Discover High-Match Opportunities?"
      finalCtaDesc="Search roles aligned with your genuine tech stack and evaluate compatibility before submitting."
      finalCtaLabel="Start Finding Relevant Roles"
    />
  );
}
