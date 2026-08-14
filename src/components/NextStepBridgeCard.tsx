import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Compass, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface JourneyStepOption {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  state?: any;
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
  title = "Next step in your journey",
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
      navigate(option.to, { state: option.state });
    }
  };

  const PrimaryIcon = primaryStep.icon || ArrowRight;
  const SecondaryIcon = secondaryStep.icon || Compass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`bg-surface border border-accent/40 rounded-lg p-5 sm:p-6 relative my-8 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left Side: Context & Specific Action Summary */}
        <div className="space-y-2.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> AI Journey Router
            </span>
            <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wider">Suggested next action</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-ink font-mono tracking-tight">
            {title}
          </h3>

          <div className="text-xs sm:text-sm text-ink-dim leading-relaxed font-sans bg-background border border-border p-3.5 rounded-md">
            <span className="text-ink font-mono font-semibold block text-[11px] uppercase tracking-wider mb-1 text-accent">
              Action summary:
            </span>
            <p className="text-ink-dim">{contextData}</p>
          </div>
        </div>

        {/* Right Side: Exactly 2 Action Options */}
        <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Primary Next Step (Recommended) */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-accent pl-1">
              Recommended
            </span>
            <button
              type="button"
              onClick={() => handleExecuteOption(primaryStep)}
              className="group/primary bg-accent text-black px-5 py-2.5 rounded-md text-xs font-bold font-mono transition-all hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{primaryStep.label}</span>
              <PrimaryIcon className="w-4 h-4 transition-transform group-hover/primary:translate-x-0.5" />
            </button>
          </div>

          {/* Secondary Option (Explore) */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-muted pl-1">
              Explore
            </span>
            <button
              type="button"
              onClick={() => handleExecuteOption(secondaryStep)}
              className="group/secondary bg-surface-light border border-border hover:border-accent/40 text-ink hover:text-accent px-4 py-2.5 rounded-md text-xs font-bold font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <SecondaryIcon className="w-3.5 h-3.5 text-ink-dim group-hover/secondary:text-accent transition-colors" />
              <span>{secondaryStep.label}</span>
            </button>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-ink-muted hover:text-ink rounded transition-colors self-center hidden sm:block mt-4 cursor-pointer"
              aria-label="Dismiss journey suggestion card"
              title="Dismiss bridge card"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
