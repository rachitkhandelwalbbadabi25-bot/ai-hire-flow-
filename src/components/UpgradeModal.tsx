import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Zap, 
  Sparkles, 
  Shield, 
  Crown, 
  ShieldCheck, 
  RotateCcw, 
  FileText, 
  ChevronDown, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { cn } from '../lib/utils';
import PaymentGatewayModal, { CheckoutItem } from './PaymentGatewayModal';
import { normalizePlanTier } from '../constants/subscriptionPlans';

export default function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, plan: currentPlan } = usePlan();
  const normalizedCurrentPlan = normalizePlanTier(currentPlan);

  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const plansData = [
    {
      id: 'free',
      name: 'Free',
      tagline: 'For exploring AI HireFlow',
      price: { INR: '₹0', USD: '$0' },
      rawPrice: { INR: 0, USD: 0 },
      period: '/ month',
      description: 'Essential AI career intelligence for exploring AI HireFlow and getting started.',
      icon: <Shield className="w-6 h-6 text-ink-dim" />,
      creditsAdded: 150,
      features: [
        '150 AI Credits/day',
        '10 Job Searches/day',
        '5 ATS Analyses/week',
        '3 Interview Labs/week',
        '10 new jobs tracked/month',
        '2 Resume Edits/month',
        '5 Career Advisor chats/day',
        'Earn additional credits through daily login, referrals, achievements, onboarding and campaigns'
      ],
      buttonText: normalizedCurrentPlan === 'free' ? 'Current Plan' : 'Free Tier',
      disabled: normalizedCurrentPlan === 'free',
      color: 'border-border bg-surface/50 text-ink'
    },
    {
      id: 'pro',
      name: 'Pro',
      badge: 'RECOMMENDED',
      tagline: 'For students & casual job seekers',
      price: { INR: '₹149', USD: '$2' },
      rawPrice: { INR: 149, USD: 2 },
      period: '/ month',
      recommended: true,
      description: 'Affordable acceleration tailored for students and casual job seekers.',
      icon: <Zap className="w-6 h-6 text-accent" />,
      creditsAdded: 500,
      features: [
        '500 AI Credits/day',
        '30 Job Searches/day',
        '20 ATS Analyses/month',
        '15 Interview Labs/month',
        '75 new jobs tracked/month',
        '10 Resume Edits/month',
        '30 Career Advisor chats/day'
      ],
      buttonText: normalizedCurrentPlan === 'pro' 
        ? 'Current Plan' 
        : (normalizedCurrentPlan === 'premium' || normalizedCurrentPlan === 'admin' ? 'Included in Plan' : 'Upgrade to Pro'),
      disabled: normalizedCurrentPlan === 'pro' || normalizedCurrentPlan === 'premium' || normalizedCurrentPlan === 'admin',
      color: 'border-accent/40 bg-accent/5 text-ink'
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'For active job seekers',
      price: { INR: '₹249', USD: '$4' },
      rawPrice: { INR: 249, USD: 4 },
      period: '/ month',
      description: 'Maximum velocity and power for active candidates hunting their next dream role.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      creditsAdded: 800,
      features: [
        '800 AI Credits/day',
        'High/Unlimited Job Searches*',
        '50 ATS Analyses/month',
        '30 Interview Labs/month',
        'Unlimited Job Tracker',
        '25 Resume Edits/month',
        'High Career Advisor usage'
      ],
      buttonText: normalizedCurrentPlan === 'premium' 
        ? 'Current Plan' 
        : (normalizedCurrentPlan === 'admin' ? 'Included with Admin' : 'Upgrade to Premium'),
      disabled: normalizedCurrentPlan === 'premium' || normalizedCurrentPlan === 'admin',
      color: 'border-amber-500/40 bg-amber-500/5 text-ink'
    }
  ];

  const faqs = [
    {
      q: 'How quickly are my credits and subscription limits activated?',
      a: 'Activation is instantaneous. The moment your payment is verified by Razorpay, your account tier upgrades and your monthly AI Credits and feature allowances apply immediately.'
    },
    {
      q: 'What does "Fair-use limits may apply" mean for unlimited features?',
      a: 'For unlimited features on the Premium plan (such as high job search volume and unlimited job tracker), standard automated rate limits apply to protect platform availability and prevent bot abuse.'
    },
    {
      q: 'Can I earn extra credits without paying?',
      a: 'Yes! On every plan, including the Free tier, you can earn extra credits through daily login streaks (+5 to +100 credits), referral bonuses (+100 credits per friend), daily missions, and career achievements.'
    },
    {
      q: 'Are credit top-ups available if I run out?',
      a: 'Yes! You can top up AI credits at any time. Top-up credits never expire and roll over indefinitely on your account.'
    }
  ];

  const handleStartCheckout = (planItem: typeof plansData[0]) => {
    if (planItem.disabled || planItem.id === 'free') return;
    
    setCheckoutItem({
      type: 'subscription',
      itemId: planItem.id,
      title: `${planItem.name} Plan Subscription`,
      subtitle: planItem.tagline,
      basePriceINR: planItem.rawPrice.INR,
      basePriceUSD: planItem.rawPrice.USD,
      credits: planItem.creditsAdded,
      badge: planItem.recommended ? 'RECOMMENDED' : undefined,
      featuresUnlocked: [
        `+${planItem.creditsAdded.toLocaleString()} Daily AI Credits (Refreshes daily)`,
        `${planItem.features[1]}`,
        `${planItem.features[2]}`,
        `${planItem.features[3]}`
      ]
    });
    setIsPaymentGatewayOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentGatewayOpen(false);
    closeUpgradeModal();
  };

  return (
    <>
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeUpgradeModal}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-modal-title"
              className="relative bg-surface border border-border rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-surface/80 backdrop-blur-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-[0.25em] font-mono">
                      SECURE CHECKOUT & BILLING
                    </span>
                  </div>
                  <h2 id="upgrade-modal-title" className="text-2xl font-bold text-ink tracking-tight font-sans">
                    Upgrade Your Career Plan
                  </h2>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Currency Switcher */}
                  <div className="bg-surface-light border border-border rounded-xl p-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrency('INR')}
                      className={cn(
                        "px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                        currency === 'INR' ? "bg-accent text-black shadow-sm" : "text-ink-dim hover:text-ink"
                      )}
                    >
                      ₹ INR (India)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={cn(
                        "px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                        currency === 'USD' ? "bg-accent text-black shadow-sm" : "text-ink-dim hover:text-ink"
                      )}
                    >
                      $ USD (Global)
                    </button>
                  </div>

                  <button 
                    onClick={closeUpgradeModal}
                    className="p-2 hover:bg-surface-light text-ink-dim hover:text-ink rounded-full transition-colors cursor-pointer shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* Trust Signals Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-light/60 border border-border/80 p-4 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-ink">Secure Payment</p>
                      <p className="text-[10px] text-ink-dim font-mono">256-Bit SSL Gateway</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-ink">Instant Unlock</p>
                      <p className="text-[10px] text-ink-dim font-mono">Immediate Credit Top-Up</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-ink">Cancel Anytime</p>
                      <p className="text-[10px] text-ink-dim font-mono">Zero Lock-In</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-ink">GST / Tax Invoice</p>
                      <p className="text-[10px] text-ink-dim font-mono">Instant Print & Receipt</p>
                    </div>
                  </div>
                </div>

                {/* Daily Refresh Information Banner */}
                <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-accent uppercase tracking-wider">
                          AI Credits Daily — Refreshes every day
                        </span>
                        <span className="bg-accent/20 text-accent text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                          24h Cycle
                        </span>
                      </div>
                      <p className="text-xs text-ink/80 mt-0.5">
                        Daily subscription credits refresh every 24 hours (unused daily credits do not accumulate). Purchased top-up credits remain separate and never expire.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plansData.map((p) => (
                    <div 
                      key={p.id}
                      className={cn(
                        "p-6 sm:p-7 rounded-[2rem] border transition-all flex flex-col justify-between relative",
                        p.color,
                        p.recommended && "ring-2 ring-accent shadow-xl shadow-accent/10"
                      )}
                    >
                      {p.recommended && (
                        <div className="absolute -top-3 right-6 bg-accent text-black text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-lg">
                          RECOMMENDED
                        </div>
                      )}
                      
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-5 shadow-sm">
                          {p.icon}
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-lg font-bold text-ink font-sans">{p.name}</h3>
                        </div>
                        <p className="text-[11px] font-mono text-accent font-semibold mb-2">{p.tagline}</p>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black font-mono text-ink">{p.price[currency]}</span>
                          <span className="text-xs text-ink-dim font-mono">{p.period}</span>
                        </div>

                        <p className="text-xs text-ink-dim mb-6 leading-relaxed font-sans">
                          {p.description}
                        </p>

                        {/* Post-Payment Outcome Highlight */}
                        {p.id !== 'free' && (
                          <div className="mb-6 p-3 bg-surface border border-border/80 rounded-xl">
                            <p className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                              <Zap className="w-3 h-3" /> Daily Plan Allotment:
                            </p>
                            <p className="text-[11px] text-ink font-semibold">
                              {p.creditsAdded.toLocaleString()} Daily Credits refreshed every 24h & features active.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3 mb-8 pt-4 border-t border-border/40">
                          {p.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-ink/90 font-medium font-sans">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartCheckout(p)}
                        disabled={p.disabled}
                        className={cn(
                          "w-full py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                          p.id === 'free' 
                            ? "bg-surface-light text-ink-dim border border-border" 
                            : p.id === 'premium'
                            ? "bg-amber-400 text-black hover:bg-amber-300"
                            : "bg-accent text-black hover:bg-accent/90",
                          p.disabled && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        <span>{p.buttonText}</span>
                        {p.id !== 'free' && !p.disabled && <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Fair-use policy notice */}
                <p className="text-xs text-ink-dim font-mono text-center">
                  *Fair-use limits may apply for high-volume and unlimited features.
                </p>

                {/* FAQ Accordion Section */}
                <div className="bg-surface/50 border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-bold text-ink font-sans uppercase tracking-wider">
                      Frequently Asked Questions (Payment & Billing)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {faqs.map((faq, index) => {
                      const isOpen = openFaqIndex === index;
                      return (
                        <div 
                          key={index}
                          className="border border-border/60 rounded-xl overflow-hidden bg-surface-light/40"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                            className="w-full p-3.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-light transition-colors"
                          >
                            <span className="text-xs font-bold text-ink font-sans">{faq.q}</span>
                            <ChevronDown className={cn("w-4 h-4 text-ink-dim transition-transform", isOpen && "rotate-180")} />
                          </button>
                          {isOpen && (
                            <div className="px-3.5 pb-3.5 text-xs text-ink-dim font-sans leading-relaxed border-t border-border/40 pt-2">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => setIsPaymentGatewayOpen(false)}
        item={checkoutItem}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
