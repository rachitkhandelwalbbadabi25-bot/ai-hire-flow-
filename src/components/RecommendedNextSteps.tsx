import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  FileText, 
  Search, 
  MessageSquare, 
  Send, 
  GraduationCap, 
  CheckCircle2, 
  Compass,
  TrendingUp
} from 'lucide-react';
import { useSystemOS } from '../context/SystemOSContext';

export interface RecommendedStepItem {
  id: string;
  stepNumber: number;
  title: string;
  category: string;
  description: string;
  badgeText: string;
  badgeType: 'high' | 'recommended' | 'growth';
  icon: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  ctaLink: string;
  ctaState?: any;
  reasoning: string;
}

interface RecommendedNextStepsProps {
  className?: string;
}

export default function RecommendedNextSteps({ className = '' }: RecommendedNextStepsProps) {
  const navigate = useNavigate();
  const { 
    latestResume, 
    trackedJobs, 
    latestRoadmap, 
    simulations, 
    activeTargetRole, 
    allMissingSkills 
  } = useSystemOS();

  const hasResume = !!latestResume;
  const hasJobs = trackedJobs.length > 0;
  const hasSimulations = simulations.length > 0;
  const hasRoadmap = !!latestRoadmap;

  // Determine top 3 context-aware recommended steps based on candidate pipeline
  const getRecommendedSteps = (): RecommendedStepItem[] => {
    const steps: RecommendedStepItem[] = [];

    // Step 1 determination
    if (!hasResume) {
      steps.push({
        id: 'step_resume_audit',
        stepNumber: 1,
        title: 'Check Your Resume Score',
        category: 'Resume',
        description: 'Upload your resume to see your score, fix formatting, and check if you have the right keywords.',
        badgeText: 'Step 1',
        badgeType: 'high',
        icon: FileText,
        ctaLabel: 'Upload Resume',
        ctaLink: '/analyzer',
        reasoning: 'Helps your resume pass automated filters and catch recruiter attention.'
      });
    } else {
      steps.push({
        id: 'step_resume_improve',
        stepNumber: 1,
        title: 'Improve Your Bullet Points',
        category: 'Resume',
        description: latestResume.missingKeywords && latestResume.missingKeywords.length > 0
          ? `Add missing skills like ${latestResume.missingKeywords.slice(0, 2).join(', ')} to make your experience stand out.`
          : 'Turn your job bullet points into clear achievements with measurable results.',
        badgeText: 'Recommended',
        badgeType: 'high',
        icon: FileText,
        ctaLabel: 'Edit Resume',
        ctaLink: '/editor',
        reasoning: 'Clear achievement bullets make recruiters 3x more likely to invite you to interview.'
      });
    }

    // Step 2 determination
    if (!hasJobs) {
      steps.push({
        id: 'step_discover_jobs',
        stepNumber: 2,
        title: 'Find Matching Jobs',
        category: 'Jobs',
        description: `Explore live job openings that match your skills for ${activeTargetRole || 'your target role'}.`,
        badgeText: 'Step 2',
        badgeType: 'recommended',
        icon: Search,
        ctaLabel: 'Search Jobs',
        ctaLink: '/finder',
        reasoning: 'Save jobs to easily track your applications in one place.'
      });
    } else {
      const topJob = trackedJobs[0];
      steps.push({
        id: 'step_outreach_pitch',
        stepNumber: 2,
        title: `Message ${topJob?.company || 'Recruiter'}`,
        category: 'Outreach',
        description: `Create a short, personalized note to send to hiring managers for ${topJob?.role || 'this job'}.`,
        badgeText: 'Recommended',
        badgeType: 'recommended',
        icon: Send,
        ctaLabel: 'Write Message',
        ctaLink: '/outreach',
        ctaState: {
          company: topJob?.company,
          role: topJob?.role,
          openModal: true
        },
        reasoning: 'Direct outreach helps you skip the pile and get faster responses.'
      });
    }

    // Step 3 determination
    if (!hasSimulations) {
      steps.push({
        id: 'step_mock_simulation',
        stepNumber: 3,
        title: 'Practice a Mock Interview',
        category: 'Interview',
        description: `Rehearse common questions for ${activeTargetRole || 'your role'} and get instant tips to improve.`,
        badgeText: 'Step 3',
        badgeType: 'growth',
        icon: MessageSquare,
        ctaLabel: 'Start Practice',
        ctaLink: '/interview',
        ctaState: {
          role: activeTargetRole,
          company: trackedJobs[0]?.company
        },
        reasoning: 'Practicing even 1 mock interview builds confidence and sharper answers.'
      });
    } else if (allMissingSkills.length > 0 || !hasRoadmap) {
      steps.push({
        id: 'step_skill_roadmap',
        stepNumber: 3,
        title: 'Learn In-Demand Skills',
        category: 'Skills',
        description: allMissingSkills.length > 0
          ? `Work on top requested skills: ${allMissingSkills.slice(0, 3).join(', ')}.`
          : 'Follow a simple weekly plan to build skills employers are actively looking for.',
        badgeText: 'Growth',
        badgeType: 'growth',
        icon: GraduationCap,
        ctaLabel: 'View Learning Plan',
        ctaLink: '/learning',
        reasoning: 'Closing skill gaps makes you eligible for higher-paying positions.'
      });
    } else {
      steps.push({
        id: 'step_behavioral_mastery',
        stepNumber: 3,
        title: 'Practice Behavioral Questions',
        category: 'Interview',
        description: 'Get ready for leadership and situational questions with quick AI feedback.',
        badgeText: 'Practice',
        badgeType: 'growth',
        icon: MessageSquare,
        ctaLabel: 'Practice Questions',
        ctaLink: '/interview',
        reasoning: 'Great stories and structured answers leave a lasting positive impression.'
      });
    }

    return steps.slice(0, 3);
  };

  const steps = getRecommendedSteps();

  const getBadgeStyle = (type: 'high' | 'recommended' | 'growth') => {
    switch (type) {
      case 'high':
        return 'bg-accent/10 border-accent/30 text-accent';
      case 'recommended':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case 'growth':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  return (
    <section className={`bg-surface border border-accent/30 rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-xl ${className}`}>
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/80 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded-lg border border-accent/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">
              Recommended For You
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink font-mono tracking-tight">
            Your Next 3 Steps
          </h2>
          <p className="text-xs text-ink-dim font-sans max-w-xl">
            Quick, personalized actions based on your current progress.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-background border border-border rounded-xl text-[11px] font-mono font-bold text-ink-dim">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span>Target: <span className="text-ink">{activeTargetRole || 'Software Engineer'}</span></span>
          </div>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        {steps.map((step) => {
          const IconComponent = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-background/80 hover:bg-background border border-border hover:border-accent/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm flex-1"
            >
              <div className="space-y-3.5">
                {/* Step Number & Category Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-accent text-black text-xs font-mono font-extrabold flex items-center justify-center shadow-md shadow-accent/20">
                      {step.stepNumber}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider">
                      {step.category}
                    </span>
                  </div>

                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(step.badgeType)}`}>
                    {step.badgeText}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-ink group-hover:text-accent transition-colors font-sans mb-1.5 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-ink-dim font-sans leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* AI Reasoning Note */}
                <div className="bg-surface/70 border border-border/80 rounded-lg p-2.5 text-[11px] font-sans text-ink-dim flex items-start gap-2">
                  <span className="font-mono font-bold text-accent shrink-0 text-[10px] uppercase">Why:</span>
                  <span className="leading-tight">{step.reasoning}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => navigate(step.ctaLink, { state: step.ctaState })}
                  className="w-full py-2.5 px-4 bg-accent hover:bg-accent/90 text-black font-mono font-bold text-xs rounded-xl shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{step.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
