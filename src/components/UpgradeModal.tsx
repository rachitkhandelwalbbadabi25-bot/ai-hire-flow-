import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Zap, 
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
      description: 'Essential career tools for exploring the platform and running initial diagnostics.',
      icon: <Shield className="w-5 h-5 text-[var(--hf-text-secondary)]" />,
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
      description: 'Higher daily credit allowances and monthly scan capacity for active applications.',
      icon: <Zap className="w-5 h-5 text-[var(--hf-cta)]" />,
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
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'For active job seekers',
      price: { INR: '₹249', USD: '$4' },
      rawPrice: { INR: 249, USD: 4 },
      period: '/ month',
      description: 'Maximum daily capacity for candidates interviewing across multiple companies.',
      icon: <Crown className="w-5 h-5 text-[var(--hf-warning)]" />,
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
    }
  ];

  const faqs = [
    {
      q: 'How quickly are my credits and subscription limits activated?',
      a: 'Activation is immediate. Once your payment is verified by Razorpay, your account tier upgrades and your daily credits and monthly feature allowances apply right away.'
    },
    {
      q: 'What does "Fair-use limits may apply" mean for unlimited features?',
      a: 'For unlimited features on the Premium plan (such as high job search volume and unlimited job tracker), standard automated rate limits apply to protect platform availability and prevent automated scraping.'
    },
    {
      q: 'Can I earn extra credits without paying?',
      a: 'Yes. On every plan, including the Free tier, you can earn extra credits through daily login streaks, referral bonuses, daily missions, and career milestones.'
    },
    {
      q: 'Are credit top-ups available if I run out?',
      a: 'Yes. You can purchase top-up credit packs at any time. Top-up credits never expire and remain separate from your 24-hour daily refreshing allowance.'
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
        `+${planItem.creditsAdded.toLocaleString()} Daily Credits (Refreshes every 24h)`,
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
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-modal-title"
              className="relative bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col text-[var(--hf-text)]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-[var(--hf-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-[var(--hf-surface)]">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-0.5">
                    Plans &amp; Billing
                  </span>
                  <h2 id="upgrade-modal-title" className="text-xl font-bold text-[var(--hf-text)] tracking-tight font-sans">
                    Upgrade your workspace plan
                  </h2>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Currency Switcher */}
                  <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg p-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrency('INR')}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                        currency === 'INR'
                          ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-semibold shadow-2xs border border-[var(--hf-border)]"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                      )}
                    >
                      ₹ INR
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                        currency === 'USD'
                          ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-semibold shadow-2xs border border-[var(--hf-border)]"
                          : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                      )}
                    >
                      $ USD
                    </button>
                  </div>

                  <button 
                    onClick={closeUpgradeModal}
                    className="p-2 hover:bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg transition-colors cursor-pointer shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {plansData.map((p) => (
                    <div 
                      key={p.id}
                      className={cn(
                        "p-6 rounded-xl border transition-all flex flex-col justify-between relative bg-[var(--hf-surface)]",
                        p.recommended
                          ? "border-2 border-[var(--hf-cta)] shadow-sm"
                          : "border-[var(--hf-border)]"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center">
                            {p.icon}
                          </div>
                          {p.recommended && (
                            <span className="hf-badge hf-badge-cta text-[11px] font-semibold">
                              Recommended
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[var(--hf-text)] font-sans">{p.name}</h3>
                        <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 mb-3">{p.tagline}</p>

                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-bold tabular-nums text-[var(--hf-text)]">{p.price[currency]}</span>
                          <span className="text-xs text-[var(--hf-text-muted)]">{p.period}</span>
                        </div>

                        <p className="text-xs text-[var(--hf-text-secondary)] mb-5 leading-relaxed">
                          {p.description}
                        </p>

                        <div className="space-y-2.5 mb-6 pt-4 border-t border-[var(--hf-border)]">
                          {p.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0 mt-0.5" />
                              <span className="text-xs text-[var(--hf-text-secondary)]">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartCheckout(p)}
                        disabled={p.disabled}
                        className={cn(
                          "w-full min-h-[42px] rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                          p.recommended
                            ? "hf-btn-primary"
                            : "hf-btn-secondary",
                          p.disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span>{p.buttonText}</span>
                        {p.id !== 'free' && !p.disabled && <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Trust Signals Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] p-4 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--hf-cta)] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">256-Bit SSL Checkout</p>
                      <p className="text-[11px] text-[var(--hf-text-muted)]">Processed via Razorpay</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-[var(--hf-warning)] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">Instant Activation</p>
                      <p className="text-[11px] text-[var(--hf-text-muted)]">Immediate allowance boost</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 text-[var(--hf-success)] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">No Lock-In</p>
                      <p className="text-[11px] text-[var(--hf-text-muted)]">Cancel anytime</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[var(--hf-cta)] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--hf-text)]">Tax Receipt</p>
                      <p className="text-[11px] text-[var(--hf-text-muted)]">Downloadable invoice</p>
                    </div>
                  </div>
                </div>

                {/* FAQ Accordion Section */}
                <div className="border border-[var(--hf-border)] rounded-xl p-5 bg-[var(--hf-surface)]">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-[var(--hf-cta)]" />
                    <h3 className="text-xs font-semibold text-[var(--hf-text)] uppercase tracking-wider">
                      Billing &amp; Credit Questions
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {faqs.map((faq, index) => {
                      const isOpen = openFaqIndex === index;
                      return (
                        <div 
                          key={index}
                          className="border border-[var(--hf-border)] rounded-lg overflow-hidden bg-[var(--hf-surface-secondary)]/30"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                            className="w-full p-3 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--hf-surface-secondary)] transition-colors"
                          >
                            <span className="text-xs font-semibold text-[var(--hf-text)]">{faq.q}</span>
                            <ChevronDown className={cn("w-4 h-4 text-[var(--hf-text-secondary)] transition-transform", isOpen && "rotate-180")} />
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3 text-xs text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-2">
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

      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => setIsPaymentGatewayOpen(false)}
        item={checkoutItem}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
