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
        title: 'Audit Master Resume & ATS Score',
        category: 'Resume Engineering',
        description: 'Upload your resume to calculate baseline keyword density, formatting compliance, and alignment against target roles.',
        badgeText: 'Highest Priority',
        badgeType: 'high',
        icon: FileText,
        ctaLabel: 'Upload & Audit Resume',
        ctaLink: '/analyzer',
        reasoning: 'Unlocks personalized matching, gap detection, and customized interview simulations.'
      });
    } else {
      steps.push({
        id: 'step_resume_improve',
        stepNumber: 1,
        title: `Optimize Bullets with XYZ Formula`,
        category: 'Resume Refinement',
        description: latestResume.missingKeywords && latestResume.missingKeywords.length > 0
          ? `Address ${latestResume.missingKeywords.length} detected skill gaps (${latestResume.missingKeywords.slice(0, 2).join(', ')}) using verified XYZ impact bullets.`
          : 'Refactor passive job bullets into high-impact XYZ accomplishment statements in the Resume Editor.',
        badgeText: 'High ROI',
        badgeType: 'high',
        icon: FileText,
        ctaLabel: 'Refine in Resume Editor',
        ctaLink: '/editor',
        reasoning: 'Google XYZ formula elevates recruiter signal and ATS parsing pass rates.'
      });
    }

    // Step 2 determination
    if (!hasJobs) {
      steps.push({
        id: 'step_discover_jobs',
        stepNumber: 2,
        title: `Discover & Track Matched Roles`,
        category: 'Opportunity Discovery',
        description: `Explore live job openings calibrated specifically for ${activeTargetRole || 'Software Engineers'} with real-time match scoring.`,
        badgeText: 'Pipeline Builder',
        badgeType: 'recommended',
        icon: Search,
        ctaLabel: 'Search Matched Listings',
        ctaLink: '/finder',
        reasoning: 'Tracking target companies powers personalized outreach and tailored mock drills.'
      });
    } else {
      const topJob = trackedJobs[0];
      steps.push({
        id: 'step_outreach_pitch',
        stepNumber: 2,
        title: `Draft Recruiter Pitch for ${topJob?.company || 'Target Company'}`,
        category: 'Direct Outreach',
        description: `Generate high-converting, personalized cold email & LinkedIn outreach messages for your ${topJob?.role || 'open position'} application.`,
        badgeText: 'Active Outreach',
        badgeType: 'recommended',
        icon: Send,
        ctaLabel: 'Generate Cold Email Pitch',
        ctaLink: '/outreach',
        ctaState: {
          company: topJob?.company,
          role: topJob?.role,
          openModal: true
        },
        reasoning: 'Direct outreach to engineering hiring managers generates 3.5x higher interview response rates.'
      });
    }

    // Step 3 determination
    if (!hasSimulations) {
      steps.push({
        id: 'step_mock_simulation',
        stepNumber: 3,
        title: `Practice Role-Specific Mock Interview`,
        category: 'Interview Calibration',
        description: `Rehearse technical architecture and STAR behavioral questions tailored for ${activeTargetRole || 'your target position'}.`,
        badgeText: 'Interview Prep',
        badgeType: 'growth',
        icon: MessageSquare,
        ctaLabel: 'Start AI Mock Drill',
        ctaLink: '/interview',
        ctaState: {
          role: activeTargetRole,
          company: trackedJobs[0]?.company
        },
        reasoning: 'Candidates completing at least 2 drills score 40% higher on hiring team evaluations.'
      });
    } else if (allMissingSkills.length > 0 || !hasRoadmap) {
      steps.push({
        id: 'step_skill_roadmap',
        stepNumber: 3,
        title: `Close Technical Gaps with Learning Roadmap`,
        category: 'Skill Mastery',
        description: allMissingSkills.length > 0
          ? `Target key technical gaps: ${allMissingSkills.slice(0, 3).join(', ')} with structured milestones and resources.`
          : 'Generate a personalized 4-week technical upskilling curriculum to accelerate career velocity.',
        badgeText: 'Skill Growth',
        badgeType: 'growth',
        icon: GraduationCap,
        ctaLabel: 'View Upskilling Roadmap',
        ctaLink: '/learning',
        reasoning: 'Targeted skill resolution transforms resume weaknesses into competitive advantages.'
      });
    } else {
      steps.push({
        id: 'step_behavioral_mastery',
        stepNumber: 3,
        title: 'Calibrate Advanced Behavioral Answers',
        category: 'Leadership Drill',
        description: 'Simulate high-stakes behavioral questions and system design defense drills with real-time AI scoring.',
        badgeText: 'Advanced Drill',
        badgeType: 'growth',
        icon: MessageSquare,
        ctaLabel: 'Launch Advanced Simulator',
        ctaLink: '/interview',
        reasoning: 'Deepens behavioral readiness and STAR structure fluency before round 1.'
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
              AI Dynamic Career Router
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink font-mono tracking-tight">
            Top 3 Recommended Next Steps
          </h2>
          <p className="text-xs text-ink-dim font-sans max-w-xl">
            Prioritized actions derived from your current resume audit, pipeline volume, and interview readiness.
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
                  <span className="font-mono font-bold text-accent shrink-0 text-[10px]">WHY:</span>
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
