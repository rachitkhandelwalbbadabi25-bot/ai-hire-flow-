import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  action?: {
    label: string;
    onClick?: () => void;
  };
  accentColor?: 'accent' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
  action,
  accentColor = 'accent',
  className
}: EmptyStateProps) {
  const finalCtaLabel = ctaLabel || action?.label;
  const finalOnCtaClick = onCtaClick || action?.onClick;
  const colorStyles = {
    accent: 'text-accent bg-accent/10 border-accent/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };

  const buttonStyles = {
    accent: 'bg-accent hover:opacity-90 shadow-accent/25',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25',
    amber: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25',
    rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25',
    violet: 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/25',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-10 text-center bg-surface/40 border border-border/80 rounded-3xl backdrop-blur-md my-4",
        className
      )}
    >
      <div className={cn("p-4 rounded-2xl border mb-4 flex items-center justify-center shadow-lg", colorStyles[accentColor])}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-ink mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-ink-dim max-w-md leading-relaxed mb-6 font-medium">{description}</p>
      {finalCtaLabel && finalOnCtaClick && (
        <button
          onClick={finalOnCtaClick}
          className={cn(
            "px-6 py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg cursor-pointer flex items-center gap-2",
            buttonStyles[accentColor]
          )}
        >
          {finalCtaLabel}
        </button>
      )}
    </motion.div>
  );
}
