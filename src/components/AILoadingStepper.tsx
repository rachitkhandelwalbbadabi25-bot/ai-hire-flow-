import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Cpu, Sparkles, ShieldCheck } from 'lucide-react';
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
  const activeStep = steps[activeIndex];
  const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
  const elapsedTime = steps.slice(0, activeIndex).reduce((acc, s) => acc + s.duration, 0);
  const progressPercent = Math.min(100, Math.round(((elapsedTime + (activeStep?.duration || 2000) * 0.5) / totalDuration) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`bg-surface border border-accent/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden ${className}`}
    >
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-2xl text-accent animate-pulse">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Autonomous Engine
              </span>
              <span className="text-[10px] text-ink-dim font-mono uppercase tracking-wider">
                Step {activeIndex + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-ink uppercase tracking-tight font-mono mt-0.5">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold text-accent bg-background border border-border px-3 py-1.5 rounded-xl">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-background border border-border/80 h-2.5 rounded-full overflow-hidden p-0.5 relative z-10">
        <motion.div
          className="bg-accent h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Active Step Description banner */}
      <div className="bg-background/90 border border-accent/20 p-4 sm:p-5 rounded-2xl relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-ping mt-1.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
              Active Operation
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={activeIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-xs sm:text-sm font-mono text-ink font-semibold leading-relaxed"
              >
                {activeStep?.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Step Checklist Items */}
      <div className="space-y-2 pt-1 relative z-10">
        {steps.map((s, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={s.step}
              className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-mono transition-all ${
                isDone
                  ? 'bg-success/5 border-success/20 text-ink'
                  : isCurrent
                  ? 'bg-accent/10 border-accent/30 text-ink font-bold'
                  : 'bg-background/40 border-border/40 text-ink-dim opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[9px] text-ink-dim">
                    {s.step}
                  </div>
                )}
              </div>

              <span className={`flex-1 truncate ${isDone ? 'line-through text-ink-dim' : ''}`}>
                {s.description}
              </span>

              <span className="text-[10px] text-ink-dim uppercase tracking-wider shrink-0 font-mono">
                {(s.duration / 1000).toFixed(1)}s
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-dim font-mono border-t border-border/60 pt-3 relative z-10">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Verified Telemetry Standard
        </span>
        <span>Deterministic Multi-Node Analysis</span>
      </div>
    </motion.div>
  );
}
