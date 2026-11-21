import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_JOB_TRACKER } from '../data/sampleData';
import { 
  Briefcase, 
  Layers, 
  Clock, 
  TrendingUp, 
  Building2, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function JobTrackerSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Job Tracker",
    "url": "https://www.aihireflow.in/job-tracker",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Smart career Kanban application pipeline. Track job applications, interview stages, recruiter contacts, and follow-up deadlines in one unified board."
  };

  const handleLaunch = () => {
    navigate('/jobs');
  };

  // Sample Visual: Pipeline board using product's real stage names (Applied, Interview, Offer, Rejected)
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Pipeline preview</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Active search board
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--hf-text-muted)]">
          <span>4 stages &bull; 10 tracked positions</span>
        </div>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto">
        {SAMPLE_JOB_TRACKER.stages.map((stage, idx) => (
          <div 
            key={idx} 
            className="p-3 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--hf-border)]">
                <span className="text-xs font-semibold text-[var(--hf-text)]">
                  {stage.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)] tabular-nums">
                  {stage.count}
                </span>
              </div>

              <div className="space-y-2">
                {stage.jobs.map((job, jIdx) => (
                  <div 
                    key={jIdx} 
                    className="p-2.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)] shadow-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--hf-text)] leading-snug">
                      <Building2 className="w-3 h-3 text-[var(--hf-cta)] shrink-0" />
                      <span className="truncate">{job.company}</span>
                    </div>
                    <p className="text-[11px] text-[var(--hf-text-secondary)] truncate">
                      {job.role}
                    </p>
                    <span className="text-[10px] text-[var(--hf-text-muted)] block pt-0.5">
                      {job.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[10px] text-[var(--hf-text-muted)] text-center">
              Cloud synced
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="Free Job Application Tracker & Kanban Pipeline — AI HireFlow"
      metaDescription="Organize every job application in a visual Kanban pipeline. Track Applied, Interview, Offer, and Rejected stages, notes, resume versions, and follow-ups free."
      canonicalPath="/job-tracker"
      jsonLd={jsonLd}
      badgeText="Career Workflow Pipeline Engine"
      h1="AI Job Tracker"
      heroDescription="Eliminate messy spreadsheets and forgotten recruiter emails. Track your active applications through every stage of the hiring pipeline with automated stage progression, timeline tracking, and interview scheduling."
      ctaLabel="Open Job Tracker"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the AI Job Tracker Works"
      howItWorksSubtitle="Structured workflow management from first application to final offer."
      howItWorks={[
        {
          step: "01",
          title: "Log or Auto-Import Positions",
          desc: "Track positions directly from the AI Job Finder, or manually enter company, role title, compensation range, and notes."
        },
        {
          step: "02",
          title: "Attach Tailored Resumes",
          desc: "Keep track of the exact resume version and cover letter submitted for each employer to avoid interview prep confusion."
        },
        {
          step: "03",
          title: "Track Interview Cycles",
          desc: "Record interviewer names, technical loop topics, coding challenges, and key questions asked during each stage."
        },
        {
          step: "04",
          title: "Compare and Negotiate Offers",
          desc: "Evaluate multiple offers side-by-side with total compensation breakdowns, equity terms, and deadline dates."
        }
      ]}
      capabilitiesTitle="Manage Your Applications Like A High-Performance Pipeline"
      capabilitiesSubtitle="When applying to tech employers, tracking stages, follow-ups, interview rounds, and salary details manually becomes overwhelming. AI HireFlow gives you an executive view of your complete job pipeline."
      capabilities={[
        {
          icon: Layers,
          title: "Intuitive Pipeline Stages",
          desc: "Move positions seamlessly through four standard milestones: Applied, Interview, Offer, and Rejected."
        },
        {
          icon: Clock,
          title: "Follow-Up Reminders",
          desc: "Keep notes on recruiter correspondence, scheduled interview rounds, coding challenge deadlines, and negotiation terms in one centralized hub."
        },
        {
          icon: TrendingUp,
          title: "Search Velocity Analytics",
          desc: "Track your application-to-interview conversion rate, response timelines, and stage velocity to optimize your search strategy."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Common questions about application tracking and workflow organization."
      faqItems={[
        {
          q: "Can I customize the stages on the pipeline board?",
          a: "AI HireFlow uses four standard recruitment stages (Applied, Interview, Offer, and Rejected) aligned with industry hiring practices, allowing you to attach notes, deadlines, and salary details to each application."
        },
        {
          q: "Is my application data synced to the cloud?",
          a: "Yes. All your tracked roles, notes, deadlines, and history sync seamlessly with your secure account so you can manage your search from any device."
        },
        {
          q: "Is the Job Tracker free to use?",
          a: "Yes! The application pipeline board is completely free for all registered users to organize unlimited job applications."
        }
      ]}
      finalCtaTitle="Never let another opportunity slip through the cracks."
      finalCtaDesc="Bring clarity to your job search. Organize your applications, follow-ups, and interview rounds with AI HireFlow."
      finalCtaLabel="Open Job Tracker"
    />
  );
}
