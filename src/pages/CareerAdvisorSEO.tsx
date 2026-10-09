import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_CAREER_ADVISOR } from '../data/sampleData';
import { 
  Map, 
  Award, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Compass, 
  Clock, 
  ArrowRight 
} from 'lucide-react';

export default function CareerAdvisorSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Career Advisor & Learning Roadmap",
    "url": "https://www.aihireflow.in/career-advisor",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "description": "Intelligent AI career advisory system. Analyze skill deficiencies against target tech jobs, formulate milestone learning roadmaps, and receive curated technical project guidance."
  };

  const handleLaunch = async () => {
    if (user) {
      navigate('/learning');
      return;
    }
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        navigate('/learning');
      }
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign in error:', error);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  // Sample Visual: Skill gap roadmap with current skills, target role, and next milestones
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Sample roadmap</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Path: {SAMPLE_CAREER_ADVISOR.currentRole} &rarr; {SAMPLE_CAREER_ADVISOR.targetRole}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--hf-text-muted)]">
          <span>3 structured milestones [Sample]</span>
        </div>
      </div>

      {/* Skill Diagnostic Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
          <span className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)]" />
            <span>Demonstrated skills [Sample]</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_CAREER_ADVISOR.currentSkills.map((sk, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-border)]">
                {sk}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-2">
          <span className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--hf-warning)]" />
            <span>Target qualification gaps [Sample]</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_CAREER_ADVISOR.missingSkills.map((sk, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)]">
                {sk}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Milestones */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-semibold text-[var(--hf-text)] block">
          Sequential milestone curriculum [Sample]
        </span>
        <div className="space-y-2">
          {SAMPLE_CAREER_ADVISOR.milestones.map((m, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-start gap-3.5"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-xs font-bold font-mono text-[var(--hf-cta)] flex items-center justify-center shrink-0">
                {m.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--hf-text)]">
                    {m.title}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                    m.status === 'In progress' 
                      ? 'bg-[var(--hf-mint)] text-[var(--hf-ai-teal)] border-[var(--hf-ai-teal)]/30'
                      : 'bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border-[var(--hf-border)]'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                  {m.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="AI Career Advisor | Personalized Skill Roadmaps & Growth — AI HireFlow"
      metaDescription="Accelerate your tech career with AI HireFlow's AI Career Advisor. Identify technical skill gaps, generate milestone-driven learning roadmaps, and build project portfolios that recruiters notice."
      canonicalPath="/career-advisor"
      jsonLd={jsonLd}
      badgeText="Technical Career Progression Engine"
      h1="AI Career Advisor"
      heroDescription="Navigate your tech career with clarity. Automatically detect missing qualifications between your current profile and target senior roles, then generate actionable, milestone-driven learning roadmaps."
      ctaLabel="Ask AI Career Advisor"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the AI Career Advisor Works"
      howItWorksSubtitle="Reverse-engineer hiring manager expectations into a milestone curriculum."
      howItWorks={[
        {
          step: "01",
          title: "Select Target Career Destination",
          desc: "Choose from software engineering, machine learning, cloud architecture, product management, or paste a target dream job."
        },
        {
          step: "02",
          title: "Baseline Competency Assessment",
          desc: "The engine audits your verified resume capabilities against target senior-level expectations to pinpoint specific technical gaps."
        },
        {
          step: "03",
          title: "Generate Structured Curriculum",
          desc: "Receive a chronological roadmap featuring prioritized topics, documentation deep dives, courses, and project specs."
        },
        {
          step: "04",
          title: "Add Verified Bullets To Resume",
          desc: "As you complete project milestones, seamlessly add verified implementation bullets to your Master Resume profile."
        }
      ]}
      capabilitiesTitle="Turn Skill Deficiencies Into Structured Learning Milestones"
      capabilitiesSubtitle="When applying for competitive tech roles or pivoting into new domains like AI engineering, cloud infrastructure, or full-stack architecture, random tutorials waste months. AI HireFlow reverse-engineers the exact skills demanded by hiring managers."
      capabilities={[
        {
          icon: Map,
          title: "Milestone Roadmaps",
          desc: "Step-by-step technical paths broken into weekly modules with clear learning objectives, documentation links, and mastery checks."
        },
        {
          icon: Award,
          title: "Proof-of-Work Projects",
          desc: "Build real-world portfolio applications and end-to-end pipelines that provide concrete proof of competence on your resume and GitHub."
        },
        {
          icon: Zap,
          title: "Dynamic Role Pivots",
          desc: "Transitioning from backend to AI engineering or QA to DevOps? The advisor maps your existing transferable experience to accelerate your switch."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Answers regarding career roadmaps and technical competency advancement."
      faqItems={[
        {
          q: "How personalized are the career roadmaps?",
          a: "Roadmaps are customized specifically to your current demonstrated resume experience and the target job description or role level you wish to reach."
        },
        {
          q: "Can I track my progress over time?",
          a: "Yes. You can check off modules, record project completion, and push new bullet accomplishments directly to your Master Resume profile."
        },
        {
          q: "Is the Career Advisor free to access?",
          a: "Yes! Generating roadmap recommendations and viewing foundational milestones is included in every account's free access."
        }
      ]}
      finalCtaTitle="Bridge your skill gaps with a structured path."
      finalCtaDesc="Turn vague ambitions into concrete engineering milestones. Let AI HireFlow build your roadmap today."
      finalCtaLabel="Ask AI Career Advisor"
    />
  );
}
