import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SEOFeatureLayout from '../components/SEOFeatureLayout';
import { SAMPLE_INTERVIEW_LAB } from '../data/sampleData';
import { 
  Mic, 
  BrainCircuit, 
  TrendingUp, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function InterviewLabSEO() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLaunching, setIsLaunching] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI HireFlow AI Interview Lab",
    "url": "https://www.aihireflow.in/interview-lab",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "description": "Interactive technical and behavioral interview simulation laboratory. Practice with dynamic AI hiring managers and receive structured feedback on STAR delivery and technical precision."
  };

  const handleLaunch = () => {
    navigate('/interview');
  };

  // Sample Visual: Question, candidate response, structured STAR feedback, strengths, and improvement points
  const sampleVisual = (
    <div className="hf-card p-5 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="hf-badge hf-badge-teal">Simulation preview</span>
          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">
            Category: {SAMPLE_INTERVIEW_LAB.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--hf-text-muted)]">Evaluated score</span>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)] tabular-nums">
            {SAMPLE_INTERVIEW_LAB.scoreLabel}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] space-y-1.5">
        <span className="text-[11px] font-semibold text-[var(--hf-cta)] uppercase tracking-wider block">
          Interviewer prompt
        </span>
        <p className="text-xs sm:text-sm font-medium text-[var(--hf-text)] leading-relaxed">
          &ldquo;{SAMPLE_INTERVIEW_LAB.question}&rdquo;
        </p>
      </div>

      {/* Candidate Response Card */}
      <div className="p-4 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1.5">
        <span className="text-[11px] font-semibold text-[var(--hf-text-muted)] uppercase tracking-wider block">
          Candidate answer
        </span>
        <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed italic">
          &ldquo;{SAMPLE_INTERVIEW_LAB.userAnswerSnippet}&rdquo;
        </p>
      </div>

      {/* Structured Rubric / STAR Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-center">
          <span className="text-[11px] text-[var(--hf-text-secondary)] block">Situation</span>
          <span className="text-xs font-semibold text-[var(--hf-text)] mt-0.5 block tabular-nums">22 / 25</span>
        </div>
        <div className="p-3 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-center">
          <span className="text-[11px] text-[var(--hf-text-secondary)] block">Task</span>
          <span className="text-xs font-semibold text-[var(--hf-text)] mt-0.5 block tabular-nums">21 / 25</span>
        </div>
        <div className="p-3 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-center">
          <span className="text-[11px] text-[var(--hf-text-secondary)] block">Action</span>
          <span className="text-xs font-semibold text-[var(--hf-text)] mt-0.5 block tabular-nums">23 / 25</span>
        </div>
        <div className="p-3 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-center">
          <span className="text-[11px] text-[var(--hf-text-secondary)] block">Result</span>
          <span className="text-xs font-semibold text-[var(--hf-text)] mt-0.5 block tabular-nums">20 / 25</span>
        </div>
      </div>

      {/* Feedback Strengths and Improvement Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)]" />
            <span>Demonstrated strengths</span>
          </span>
          <ul className="space-y-1 text-[11px] text-[var(--hf-text-secondary)]">
            {SAMPLE_INTERVIEW_LAB.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[var(--hf-success)]">&bull;</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--hf-warning)]" />
            <span>Improvement opportunities</span>
          </span>
          <ul className="space-y-1 text-[11px] text-[var(--hf-text-secondary)]">
            {SAMPLE_INTERVIEW_LAB.improvementTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[var(--hf-warning)]">&bull;</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <SEOFeatureLayout
      title="AI Mock Interview Simulator & STAR Prep Lab — AI HireFlow"
      metaDescription="Practice technical, system design, and behavioral mock interviews with AI. Get instant 100-point scoring, STAR framework critiques, and concrete follow-ups."
      canonicalPath="/interview-lab"
      jsonLd={jsonLd}
      badgeText="High-Fidelity Interview Simulation Laboratory"
      h1="AI Interview Lab"
      heroDescription="Master your technical loops and behavioral rounds before speaking to recruiters. Conduct simulated interviews with adaptive AI interviewers and receive instant, objective critiques on clarity, STAR structure, and technical depth."
      ctaLabel="Start Interview Lab"
      onCtaClick={handleLaunch}
      isCtaLoading={isLaunching}
      sampleVisual={sampleVisual}
      howItWorksTitle="How the AI Interview Lab Works"
      howItWorksSubtitle="A structured rehearsal loop to build interview confidence."
      howItWorks={[
        {
          step: "01",
          title: "Choose Role & Interview Type",
          desc: "Select software engineering, frontend, backend, system design, or behavioral rounds, or paste a specific job description."
        },
        {
          step: "02",
          title: "Conduct Realistic Simulation",
          desc: "Practice answering role-tailored questions adapted to your resume and experience level."
        },
        {
          step: "03",
          title: "Review Instant Performance Critique",
          desc: "Read detailed critiques on what you nailed, what lacked concrete evidence, and how to improve your delivery."
        },
        {
          step: "04",
          title: "Study Ideal Model Answers",
          desc: "Inspect model senior-level answers showing exact technical vocabulary and structured communication standards."
        }
      ]}
      capabilitiesTitle="Adaptive Simulation Engineered for High-Stakes Tech Rounds"
      capabilitiesSubtitle="Standard interview question banks fail because static answers cannot teach you how to adapt when an interviewer probes your design decisions or asks follow-up questions."
      capabilities={[
        {
          icon: BrainCircuit,
          title: "Dynamic Follow-Up Probing",
          desc: "The AI detects gaps in your explanation and asks senior-level clarifying questions just like a lead engineer or hiring manager on a panel."
        },
        {
          icon: TrendingUp,
          title: "Objective Scoring Rubric",
          desc: "Receive structured grades on technical depth, trade-off justification, structure, and conciseness after every answer."
        },
        {
          icon: MessageSquare,
          title: "Role-Specific Simulations",
          desc: "Practice technical system design explanations, behavioral questions, or architecture trade-offs customized to your target role."
        }
      ]}
      faqTitle="Frequently Asked Questions"
      faqSubtitle="Answers about interview rehearsal and structured feedback."
      faqItems={[
        {
          q: "What types of interviews can I practice?",
          a: "You can practice technical coding explanations, system architecture trade-offs, behavioral STAR questions, leadership scenarios, and product management case studies."
        },
        {
          q: "Can I paste a specific company or role description?",
          a: "Yes. The Interview Lab will customize its questions specifically to the company's tech stack, culture principles, and domain expectations."
        },
        {
          q: "Is the Interview Lab free to try?",
          a: "Yes! Every account receives free practice credits to complete realistic interview rounds with full AI feedback."
        }
      ]}
      finalCtaTitle="Master high-stakes technical loops with zero pressure."
      finalCtaDesc="Sharpen your explanations and deliver structured answers before walking into the interview."
      finalCtaLabel="Start Interview Lab"
    />
  );
}
