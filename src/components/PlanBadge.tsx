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
          className: 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
        };
      case 'premium':
        return {
          label: 'Premium',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
        };
      case 'pro':
      case 'standard':
        return {
          label: 'Pro',
          icon: <Zap className="w-3.5 h-3.5" />,
          className: 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
        };
      default:
        return {
          label: 'Free',
          icon: <Shield className="w-3.5 h-3.5" />,
          className: 'bg-ink-dim/10 text-ink-dim border-border hover:bg-ink-dim/20'
        };
    }
  };

  const config = getBadgeConfig(plan);

  return (
    <Link to="/credits" className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 cursor-pointer",
      config.className
    )}>
      {config.icon}
      <span>{config.label}</span>
      {plan === 'admin' && <span className="ml-1 opacity-50">👑</span>}
    </Link>
  );
}
