import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Sparkles, PartyPopper } from 'lucide-react';
import { motion } from 'motion/react';
import { useSystemOS } from '../context/SystemOSContext';

export interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  cta_label: string;
  cta_link: string;
  module: string;
  is_locked: boolean;
  is_complete: boolean;
}

export function getQuickStartChecklist(
  hasResume: boolean,
  hasTargetRole: boolean,
  hasScanDone: boolean
): QuickStartStep[] {
  if (hasResume && hasTargetRole && hasScanDone) {
    return [];
  }

  return [
    {
      id: 'upload_resume',
      title: 'Upload your resume',
      description: 'Add your current resume so we can calculate your baseline match scores and highlight your key strengths.',
      cta_label: 'Upload resume',
      cta_link: '/analyzer',
      module: 'Resume Analyzer',
      is_locked: false,
      is_complete: hasResume,
    },
    {
      id: 'select_target_role',
      title: 'Select your target role',
      description: hasResume
        ? 'Choose the job title you want to focus on next so we can personalize your match recommendations.'
        : 'Choose the job title you want to focus on next. Please complete Upload your resume first to unlock this step.',
      cta_label: 'Select target role',
      cta_link: '/analyzer',
      module: 'Resume Analyzer',
      is_locked: !hasResume,
      is_complete: hasResume && hasTargetRole,
    },
    {
      id: 'first_analysis',
      title: 'Run your first analysis',
      description: hasTargetRole
        ? 'Scan your resume against a target job posting to find missing skills and get tailored suggestions.'
        : 'Scan your resume against a target job posting to find missing skills. Please complete Select your target role first to unlock this step.',
      cta_label: 'Run first scan',
      cta_link: '/analyzer',
      module: 'Resume Analyzer',
      is_locked: !(hasResume && hasTargetRole),
      is_complete: hasResume && hasTargetRole && hasScanDone,
    },
  ];
}

interface QuickStartChecklistProps {
  hasResume: boolean;
  hasTargetRole: boolean;
  hasScanDone: boolean;
  className?: string;
}

export default function QuickStartChecklist({
  hasResume,
  hasTargetRole,
  hasScanDone,
  className = '',
}: QuickStartChecklistProps) {
  const navigate = useNavigate();
  const steps = getQuickStartChecklist(hasResume, hasTargetRole, hasScanDone);

  if (steps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-surface border border-accent/30 rounded-lg p-6 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent/10 text-accent rounded-md">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink font-mono">You're all set!</h3>
            <p className="text-xs text-ink-dim">
              Your onboarding is complete. Explore job openings, generate cover letters, or practice mock interviews.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const completedCount = [hasResume, hasTargetRole, hasScanDone].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <section
      className={`bg-surface border border-accent/30 rounded-lg p-6 relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-accent/10 text-accent rounded-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-ink font-mono">Quick Start Checklist</h2>
          </div>
          <p className="text-xs text-ink-dim">
            Complete these 3 simple steps to unlock tailored job matching and interview coaching.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-accent">{completedCount}/3 Completed</span>
          </div>
          <div className="w-24 bg-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, idx) => {
          return (
            <div
              key={step.id}
              className={`p-5 rounded-lg border transition-all flex flex-col justify-between ${
                step.is_complete
                  ? 'bg-accent/5 border-accent/30'
                  : step.is_locked
                  ? 'bg-background/40 border-border/40 opacity-70'
                  : 'bg-background border-accent/40 hover:border-accent'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      step.is_complete
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : step.is_locked
                        ? 'bg-border/60 text-ink-dim'
                        : 'bg-accent/10 text-accent'
                    }`}
                  >
                    Step {idx + 1} • {step.module}
                  </span>

                  {step.is_complete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : step.is_locked ? (
                    <Lock className="w-4 h-4 text-ink-dim shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-ink mb-1">{step.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed mb-4">{step.description}</p>
              </div>

              {!step.is_complete && (
                <div>
                  <button
                    type="button"
                    disabled={step.is_locked}
                    onClick={() => navigate(step.cta_link)}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                      step.is_locked
                        ? 'bg-border/30 text-ink-dim cursor-not-allowed'
                        : 'bg-accent text-black hover:bg-accent/90 shadow-md shadow-accent/10 cursor-pointer'
                    }`}
                  >
                    <span>{step.cta_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {step.is_complete && (
                <div className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Step Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
