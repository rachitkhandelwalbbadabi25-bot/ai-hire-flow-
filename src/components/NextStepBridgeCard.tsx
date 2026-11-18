import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass, X } from 'lucide-react';
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
  secondaryStep?: JourneyStepOption;
  onDismiss?: () => void;
  className?: string;
}

export default function NextStepBridgeCard({
  title = "Recommended next step",
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
  const SecondaryIcon = secondaryStep?.icon || Compass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`hf-card p-5 sm:p-6 relative my-6 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block">
            Workflow continuation
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-[var(--hf-text)] tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
            {contextData}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleExecuteOption(primaryStep)}
            className="hf-btn-primary min-h-[40px] px-4 py-2 text-xs gap-2"
          >
            <span>{primaryStep.label}</span>
            <PrimaryIcon className="w-3.5 h-3.5" />
          </button>

          {secondaryStep && (
            <button
              type="button"
              onClick={() => handleExecuteOption(secondaryStep)}
              className="hf-btn-secondary min-h-[40px] px-4 py-2 text-xs gap-2"
            >
              <SecondaryIcon className="w-3.5 h-3.5 text-[var(--hf-text-secondary)]" />
              <span>{secondaryStep.label}</span>
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] rounded-lg hover:bg-[var(--hf-surface-secondary)] transition-colors cursor-pointer"
              aria-label="Dismiss suggestion"
              title="Dismiss"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
