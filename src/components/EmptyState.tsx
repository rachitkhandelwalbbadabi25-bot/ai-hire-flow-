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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-surface border border-border rounded-lg my-4 relative overflow-hidden",
        className
      )}
    >
      {/* Target Role Tag if available */}
      {targetRole && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded text-[10px] font-mono font-bold text-accent uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> Target role: {targetRole}
        </div>
      )}

      {/* Icon Badge */}
      <div className="p-3.5 rounded-md border border-accent/20 bg-accent/10 text-accent mb-4 flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>

      {/* Title & Description */}
      <h3 className="text-xl sm:text-2xl font-bold font-mono text-ink mb-2 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-ink-dim max-w-lg leading-relaxed mb-6 font-medium">{description}</p>

      {/* Conversion Benefit Metric Box */}
      {benefitMetric && (
        <div className="mb-6 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-md font-mono text-xs font-bold text-accent flex items-center gap-2 max-w-md">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>{benefitMetric}</span>
        </div>
      )}

      {/* Dual Conversion CTA Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {effectivePrimary && effectivePrimary.onClick && (
          <button
            type="button"
            onClick={effectivePrimary.onClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md font-mono font-bold text-xs text-black bg-accent hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{effectivePrimary.label}</span>
            <PrimaryIcon className="w-4 h-4" />
          </button>
        )}

        {effectiveSecondary && effectiveSecondary.onClick && (
          <button
            type="button"
            onClick={effectiveSecondary.onClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md font-mono font-bold text-xs text-ink bg-surface-light hover:bg-surface border border-border hover:border-accent/40 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <SecondaryIcon className="w-4 h-4 text-accent" />
            <span>{effectiveSecondary.label}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}


