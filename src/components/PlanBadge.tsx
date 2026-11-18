import { Crown, Zap, Shield, Sparkles } from 'lucide-react';
import { useAuth, UserPlan } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function PlanBadge() {
  const { plan } = useAuth();

  const getBadgeConfig = (plan: UserPlan) => {
    switch (plan) {
      case 'admin':
        return {
          label: 'ADMIN',
          icon: <Crown className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface)] text-[var(--hf-error)] border-[var(--hf-error)]'
        };
      case 'premium':
        return {
          label: 'PREMIUM',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface)] text-[var(--hf-cta)] border-[var(--hf-ink-border)]'
        };
      case 'pro':
      case 'standard':
        return {
          label: 'PRO',
          icon: <Zap className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface)] text-[var(--hf-cta)] border-[var(--hf-ink-border)]'
        };
      default:
        return {
          label: 'FREE',
          icon: <Shield className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border-[var(--hf-ink-border)]'
        };
    }
  };

  const config = getBadgeConfig(plan);

  return (
    <Link
      to="/credits"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[1.5px] font-mono text-[11px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_var(--hf-ink-border)] hover:-translate-y-0.5 transition-all cursor-pointer",
        config.className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </Link>
  );
}
