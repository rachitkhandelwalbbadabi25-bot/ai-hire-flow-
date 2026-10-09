import React from 'react';
import { LucideIcon, TrendingUp, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface ActionItem {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefitMetric?: string;
  targetRole?: string;
  primaryAction?: ActionItem;
  secondaryAction?: ActionItem;
  // Backwards compatibility props:
  ctaLabel?: string;
  onCtaClick?: () => void;
  action?: ActionItem;
  accentColor?: 'accent' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  benefitMetric,
  targetRole,
  primaryAction,
  secondaryAction,
  ctaLabel,
  onCtaClick,
  action,
  className
}: EmptyStateProps) {
  const effectivePrimary: ActionItem | undefined = primaryAction || (action?.label ? action : ctaLabel ? { label: ctaLabel, onClick: onCtaClick } : undefined);
  const effectiveSecondary: ActionItem | undefined = secondaryAction;

  const PrimaryIcon = effectivePrimary?.icon || ArrowRight;
  const SecondaryIcon = effectiveSecondary?.icon || Zap;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "hf-card flex flex-col items-center justify-center p-8 sm:p-10 text-center my-4 relative overflow-hidden",
        className
      )}
    >
      {/* Target Role Tag if available */}
      {targetRole && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--hf-mint)]/25 border border-[var(--hf-ai-teal)]/30 rounded-md text-xs font-medium text-[var(--hf-ai-teal)]">
          <Sparkles className="w-3.5 h-3.5" /> Target role: {targetRole}
        </div>
      )}

      {/* Icon Badge */}
      <div className="p-3.5 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] mb-4 flex items-center justify-center" aria-hidden="true">
        <Icon className="w-6 h-6" />
      </div>

      {/* Title & Description */}
      <h3 className="text-lg sm:text-xl font-semibold text-[var(--hf-text)] mb-1.5 tracking-tight">{title}</h3>
      <p className="text-sm text-[var(--hf-text-secondary)] max-w-lg leading-relaxed mb-6">{description}</p>

      {/* Conversion Benefit Metric Box */}
      {benefitMetric && (
        <div className="mb-6 px-4 py-2 bg-[var(--hf-mint)]/20 border border-[var(--hf-ai-teal)]/20 rounded-lg text-xs font-medium text-[var(--hf-ai-teal)] flex items-center gap-2 max-w-md">
          <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{benefitMetric}</span>
        </div>
      )}

      {/* Dual Conversion CTA Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {effectivePrimary && effectivePrimary.onClick && (
          <button
            type="button"
            onClick={effectivePrimary.onClick}
            aria-label={effectivePrimary.label}
            className="hf-btn-primary w-full sm:w-auto gap-2"
          >
            <span>{effectivePrimary.label}</span>
            <PrimaryIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {effectiveSecondary && effectiveSecondary.onClick && (
          <button
            type="button"
            onClick={effectiveSecondary.onClick}
            aria-label={effectiveSecondary.label}
            className="hf-btn-secondary w-full sm:w-auto gap-2"
          >
            <SecondaryIcon className="w-4 h-4 text-[var(--hf-cta)]" aria-hidden="true" />
            <span>{effectiveSecondary.label}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}


