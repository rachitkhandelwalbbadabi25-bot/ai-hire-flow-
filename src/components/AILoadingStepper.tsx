import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Cpu, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import aiLoadingPresets from '../data/aiLoadingSteps.json';

export interface AIStep {
  step: number;
  duration: number; // in milliseconds (2000-4000)
  description: string;
}

export interface AILoadingStepperProps {
  presetKey?: keyof typeof aiLoadingPresets;
  customSteps?: AIStep[];
  title?: string;
  className?: string;
  onComplete?: () => void;
}

export default function AILoadingStepper({
  presetKey = 'resume_audit',
  customSteps,
  title = "AI Execution Pipeline",
  className = "",
  onComplete
}: AILoadingStepperProps) {
  const steps: AIStep[] = customSteps || aiLoadingPresets[presetKey] || aiLoadingPresets.resume_audit;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentStepIndex >= steps.length) {
      if (onComplete) onComplete();
      return;
    }

    const currentStep = steps[currentStepIndex];
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, steps, onComplete]);

  const activeIndex = Math.min(currentStepIndex, steps.length - 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`hf-card p-6 sm:p-7 space-y-5 relative ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-ai-teal)]" aria-hidden="true">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="hf-badge hf-badge-teal text-[11px] py-0.5">
                <Sparkles className="w-3 h-3" aria-hidden="true" /> AI Pipeline
              </span>
              <span className="text-xs text-[var(--hf-text-muted)] tabular-nums">
                Step {activeIndex + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--hf-text)] mt-1">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-[var(--hf-cta)] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--hf-cta)]" /> In progress
          </span>
        </div>
      </div>

      {/* Primary Processing Notice */}
      <div className="p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-center space-y-1">
        <h4 className="text-sm font-semibold text-[var(--hf-text)]">
          Processing request
        </h4>
        <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
          This usually takes 30–60 seconds. Analyzing details and verifying benchmarks.
        </p>
      </div>

      {/* Single Indeterminate Loading Visual */}
      <div 
        role="progressbar"
        aria-label={`${title} processing`}
        className="w-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] h-2 rounded-full overflow-hidden relative"
      >
        <motion.div
          className="bg-[var(--hf-cta)] h-full rounded-full w-1/3"
          animate={{
            x: ['-100%', '300%']
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Step Checklist Items */}
      <div className="space-y-2 pt-1">
        {steps.map((s, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={s.step}
              className={`flex items-center gap-3 p-3 rounded-lg border text-xs sm:text-sm transition-all ${
                isDone
                  ? 'bg-[var(--hf-surface-secondary)]/60 border-[var(--hf-border)] text-[var(--hf-text-secondary)]'
                  : isCurrent
                  ? 'bg-[var(--hf-mint)]/20 border-[var(--hf-ai-teal)]/30 text-[var(--hf-text)] font-medium shadow-xs'
                  : 'bg-[var(--hf-surface)] border-[var(--hf-border)]/60 text-[var(--hf-text-muted)] opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--hf-success)]" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--hf-ai-teal)] border-t-transparent animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--hf-border)] flex items-center justify-center text-[10px] text-[var(--hf-text-muted)]">
                    {s.step}
                  </div>
                )}
              </div>

              <span className={`flex-1 truncate ${isDone ? 'line-through text-[var(--hf-text-muted)]' : ''}`}>
                {s.description}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--hf-text-muted)] border-t border-[var(--hf-border)] pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--hf-success)]" /> Benchmarked evaluation
        </span>
        <span className="text-[11px]">AI Career Engine</span>
      </div>
    </motion.div>
  );
}
