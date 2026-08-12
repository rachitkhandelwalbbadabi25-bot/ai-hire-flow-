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
  accentColor = 'accent',
  className
}: EmptyStateProps) {
  const effectivePrimary: ActionItem | undefined = primaryAction || (action?.label ? action : ctaLabel ? { label: ctaLabel, onClick: onCtaClick } : undefined);
  const effectiveSecondary: ActionItem | undefined = secondaryAction;

  const colorStyles = {
    accent: 'text-accent bg-accent/10 border-accent/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };

  const buttonStyles = {
    accent: 'bg-accent hover:opacity-90 shadow-accent/25 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25 text-white',
    amber: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25 text-white',
    violet: 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/25 text-white',
  };

  const PrimaryIcon = effectivePrimary?.icon || ArrowRight;
  const SecondaryIcon = effectiveSecondary?.icon || Zap;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface/80 border border-border/80 rounded-3xl shadow-xl backdrop-blur-md my-4 relative overflow-hidden",
        className
      )}
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Target Role Tag if available */}
      {targetRole && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> Target Role: {targetRole}
        </div>
      )}

      {/* Icon Badge */}
      <div className={cn("p-4 rounded-2xl border mb-4 flex items-center justify-center shadow-md relative z-10", colorStyles[accentColor])}>
        <Icon className="w-8 h-8" />
      </div>

      {/* Title & Description */}
      <h3 className="text-xl sm:text-2xl font-extrabold text-ink mb-2 tracking-tight relative z-10">{title}</h3>
      <p className="text-xs sm:text-sm text-ink-dim max-w-lg leading-relaxed mb-6 font-medium relative z-10">{description}</p>

      {/* Conversion Benefit Metric Box */}
      {benefitMetric && (
        <div className="mb-6 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-2xl font-mono text-xs font-bold text-accent flex items-center gap-2 max-w-md shadow-sm relative z-10">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>{benefitMetric}</span>
        </div>
      )}

      {/* Dual Conversion CTA Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full sm:w-auto">
        {effectivePrimary && effectivePrimary.onClick && (
          <button
            onClick={effectivePrimary.onClick}
            className={cn(
              "w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2",
              buttonStyles[accentColor]
            )}
          >
            <span>{effectivePrimary.label}</span>
            <PrimaryIcon className="w-4 h-4" />
          </button>
        )}

        {effectiveSecondary && effectiveSecondary.onClick && (
          <button
            onClick={effectiveSecondary.onClick}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-ink bg-surface-light hover:bg-surface border border-border/90 hover:border-accent/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <SecondaryIcon className="w-4 h-4 text-accent" />
            <span>{effectiveSecondary.label}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

