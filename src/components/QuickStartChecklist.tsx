import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

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
        : 'Choose the job title you want to focus on next. Complete step 1 first to unlock.',
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
        : 'Scan your resume against a target job posting to find missing skills. Complete step 2 first to unlock.',
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
    return null;
  }

  const completedCount = [hasResume, hasTargetRole, hasScanDone].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`hf-card p-6 relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--hf-border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--hf-text)]">Workspace Setup Checklist</h2>
          <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
            Complete these 3 foundational steps to unlock personalized job matching and interview drills.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-[var(--hf-text-secondary)] tabular-nums">
            {completedCount} of 3 complete
          </span>
          <div className="w-24 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[var(--hf-cta)] h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              step.is_complete
                ? 'bg-[var(--hf-surface-secondary)]/50 border-[var(--hf-border)]'
                : step.is_locked
                ? 'bg-[var(--hf-surface-secondary)]/30 border-[var(--hf-border)] opacity-65'
                : 'bg-[var(--hf-surface)] border-[var(--hf-cta)]/40 shadow-2xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-medium text-[var(--hf-text-muted)]">
                  Step {idx + 1} &bull; {step.module}
                </span>

                {step.is_complete ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--hf-success)] shrink-0" />
                ) : step.is_locked ? (
                  <Lock className="w-3.5 h-3.5 text-[var(--hf-text-muted)] shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[var(--hf-cta)] shrink-0" />
                )}
              </div>

              <h3 className="text-sm font-semibold text-[var(--hf-text)] mb-1">{step.title}</h3>
              <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed mb-4">{step.description}</p>
            </div>

            {!step.is_complete ? (
              <button
                type="button"
                disabled={step.is_locked}
                onClick={() => navigate(step.cta_link)}
                className={
                  step.is_locked
                    ? 'w-full py-2 px-3 rounded-lg text-xs font-medium bg-[var(--hf-surface-secondary)] text-[var(--hf-text-muted)] border border-[var(--hf-border)] cursor-not-allowed flex items-center justify-center gap-1.5'
                    : 'hf-btn-primary w-full py-2 px-3 text-xs gap-1.5'
                }
              >
                <span>{step.cta_label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-xs font-medium text-[var(--hf-success)] flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}
