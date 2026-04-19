import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Sparkles, Shield, Crown, CreditCard } from 'lucide-react';
import { usePlan, PLAN_LIMITS } from '../context/PlanContext';
import { useAuth, UserPlan } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, plan: currentPlan } = usePlan();
  const { user } = useAuth();

  const handleUpgrade = async (newPlan: UserPlan) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { plan: newPlan });
      closeUpgradeModal();
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '₹0',
      description: 'Standard intelligence for casual users.',
      icon: <Shield className="w-6 h-6 text-ink-dim" />,
      features: [
        '5 Job Searches per day',
        '3 Resume Scans per month',
        '5 Interview Lab sessions',
        'Maximum 10 Jobs tracked',
        '2 Cover Letters per month',
        'Basic Learning Path'
      ],
      buttonText: 'Current Plan',
      disabled: currentPlan === 'free',
      color: 'border-border bg-surface text-ink'
    },
    {
      id: 'standard',
      name: 'Standard',
      price: '₹200',
      period: '/month',
      recommended: true,
      description: 'The preferred choice for active hunters.',
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      features: [
        '20 Job Searches per day',
        '15 Resume Scans per month',
        '20 Interview Lab sessions',
        'Maximum 50 Jobs tracked',
        '10 Cover Letters per month',
        'Full Learning Path access',
        'Resume Editor unlocked'
      ],
      buttonText: 'Upgrade Now',
      disabled: currentPlan === 'standard' || currentPlan === 'premium' || currentPlan === 'admin',
      color: 'border-blue-500/50 bg-blue-500/5 text-blue-50 relative'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '₹299',
      period: '/month',
      description: 'Ultimate power for career architects.',
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      features: [
        'Unlimited Job Finder',
        'Unlimited Resume Analyzer',
        'Unlimited Interview Lab',
        'Unlimited Job Tracker',
        'Unlimited Cover Letters',
        'Full Personalized Roadmaps',
        'Premium AI Refactoring',
        'Priority Processing'
      ],
      buttonText: 'Go Premium',
      disabled: currentPlan === 'premium' || currentPlan === 'admin',
      color: 'border-amber-500/50 bg-amber-500/5 text-amber-50'
    }
  ];

  return (
    <AnimatePresence>
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeUpgradeModal}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-surface border border-border rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-ink uppercase tracking-tight">Expand Your Intelligence</h2>
                <p className="text-ink-dim text-sm mt-1 uppercase tracking-widest font-bold">Select a neural uplink tier</p>
              </div>
              <button 
                onClick={closeUpgradeModal}
                className="p-2 hover:bg-ink/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-ink-dim" />
              </button>
            </div>

            {/* Plans Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh]">
              {plans.map((p) => (
                <div 
                  key={p.id}
                  className={cn(
                    "p-8 rounded-[2rem] border transition-all flex flex-col",
                    p.color,
                    p.recommended && "ring-2 ring-blue-500/20"
                  )}
                >
                  {p.recommended && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white text-[8px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                      Recommended
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6 shadow-sm">
                      {p.icon}
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-1 uppercase tracking-tight">{p.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-ink">{p.price}</span>
                      {p.period && <span className="text-sm text-ink-dim font-bold uppercase">{p.period}</span>}
                    </div>
                  </div>

                  <p className="text-sm text-ink-dim mb-8 leading-relaxed font-medium">
                    {p.description}
                  </p>

                  <div className="space-y-4 mb-10 flex-1">
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-ink/80 font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpgrade(p.id as UserPlan)}
                    disabled={p.disabled}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                      p.id === 'free' 
                        ? "bg-ink/5 text-ink-dim border border-border" 
                        : p.id === 'premium'
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:opacity-90"
                        : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:opacity-90",
                      p.disabled && "opacity-50 grayscale cursor-not-allowed"
                    )}
                  >
                    {p.buttonText}
                    {p.id !== 'free' && !p.disabled && <CreditCard className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 bg-ink/5 border-t border-border flex items-center justify-center gap-8">
              <div className="flex items-center gap-2 text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                <Shield className="w-4 h-4" /> Secure SSL Encrypted
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                <Crown className="w-4 h-4" /> Priority Support Included
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
