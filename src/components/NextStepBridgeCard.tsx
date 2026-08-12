import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Compass, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface JourneyStepOption {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  onClick?: () => void;
}

export interface NextStepBridgeCardProps {
  title?: string;
  contextData: string;
  primaryStep: JourneyStepOption;
  secondaryStep: JourneyStepOption;
  onDismiss?: () => void;
  className?: string;
}

export default function NextStepBridgeCard({
  title = "Optimal Next Journey Action",
  contextData,
  primaryStep,
  secondaryStep,
  onDismiss,
  className = ""
}: NextStepBridgeCardProps) {
  const navigate = useNavigate();

  const handleExecuteOption = (option: JourneyStepOption) => {
    if (option.onClick) {
      option.onClick();
    }
    if (option.to) {
      navigate(option.to);
    }
  };

  const PrimaryIcon = primaryStep.icon || ArrowRight;
  const SecondaryIcon = secondaryStep.icon || Compass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`bg-surface border border-accent/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden my-8 ${className}`}
    >
      {/* Decorative accent glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left Side: Context Header */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> AI Journey Router
            </span>
            <span className="text-[10px] text-ink-dim font-mono uppercase tracking-wider">Next Optimal Step</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-ink uppercase tracking-tight font-mono">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-ink-dim leading-relaxed font-sans bg-background/60 border border-border p-3 rounded-xl">
            <strong className="text-ink font-mono font-semibold">Action Summary:</strong> {contextData}
          </p>
        </div>

        {/* Right Side: Exactly 2 Action Options */}
        <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Primary Next Step (Recommended) */}
          <button
            onClick={() => handleExecuteOption(primaryStep)}
            className="group/primary bg-accent text-black px-6 py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2.5 hover:bg-accent/90 transition-all shadow-xl shadow-accent/15"
          >
            <span>{primaryStep.label}</span>
            <PrimaryIcon className="w-4 h-4 transition-transform group-hover/primary:translate-x-1" />
          </button>

          {/* Secondary Option (Explore) */}
          <button
            onClick={() => handleExecuteOption(secondaryStep)}
            className="group/secondary bg-surface-light border border-border hover:border-accent/40 text-ink hover:text-accent px-5 py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <SecondaryIcon className="w-3.5 h-3.5 text-ink-dim group-hover/secondary:text-accent transition-colors" />
            <span>{secondaryStep.label}</span>
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 text-ink-dim hover:text-ink rounded-lg transition-colors self-center hidden sm:block"
              title="Dismiss bridge card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
