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
          label: 'Admin',
          icon: <Crown className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface-secondary)] text-[var(--hf-error)] border-[var(--hf-error)]/30 hover:border-[var(--hf-error)]/60'
        };
      case 'premium':
        return {
          label: 'Premium',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface-secondary)] text-[var(--hf-warning)] border-[var(--hf-warning)]/30 hover:border-[var(--hf-warning)]/60'
        };
      case 'pro':
      case 'standard':
        return {
          label: 'Pro',
          icon: <Zap className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface-secondary)] text-[var(--hf-cta)] border-[var(--hf-cta)]/30 hover:border-[var(--hf-cta)]/60'
        };
      default:
        return {
          label: 'Free',
          icon: <Shield className="w-3.5 h-3.5" />,
          className: 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] border-[var(--hf-border)] hover:border-[var(--hf-text-muted)]'
        };
    }
  };

  const config = getBadgeConfig(plan);

  return (
    <Link to="/credits" className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer",
      config.className
    )}>
      {config.icon}
      <span>{config.label}</span>
      {plan === 'admin' && <span className="ml-1 opacity-70">👑</span>}
    </Link>
  );
}
