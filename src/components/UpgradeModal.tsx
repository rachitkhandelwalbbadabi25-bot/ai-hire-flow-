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

export default function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, plan: currentPlan } = usePlan();

  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const plansData = [
    {
      id: 'free',
      name: 'Starter Plan',
      price: { INR: '₹0', USD: '$0' },
      rawPrice: { INR: 0, USD: 0 },
      period: 'forever',
      description: 'Standard baseline intelligence for individual career explorers.',
      icon: <Shield className="w-6 h-6 text-ink-dim" />,
      creditsAdded: 100,
      features: [
        '100 Initial Wallet Credits',
        '2 ATS Resume Scans / month',
        '1 AI Voice Interview Lab session',
        'Global Tech Job Finder Access',
        'Standard Community Support'
      ],
      buttonText: 'Current Plan',
      disabled: currentPlan === 'free',
      color: 'border-border bg-surface/50 text-ink'
    },
    {
      id: 'standard',
      name: 'Standard Pro',
      price: { INR: '₹1,499', USD: '$19' },
      rawPrice: { INR: 1499, USD: 19 },
      period: '/ month',
      recommended: true,
      description: 'High-velocity toolkit for active candidates and interview preparation.',
      icon: <Zap className="w-6 h-6 text-accent" />,
      creditsAdded: 2000,
      features: [
        '2,000 Monthly Credits (Instant top-up)',
        'Unlimited ATS Scans & Keyword Gap Audits',
        'Live Voice Mock Interview Lab with real-time feedback',
        'Tailored Cover Letter Generator',
        'Full Personalized Skill Roadmap',
        'Master Resume Cloud Sync & Builder'
      ],
      buttonText: 'Upgrade to Standard',
      disabled: currentPlan === 'standard' || currentPlan === 'premium' || currentPlan === 'admin',
      color: 'border-accent/40 bg-accent/5 text-ink'
    },
    {
      id: 'premium',
      name: 'Premium Elite',
      price: { INR: '₹3,499', USD: '$49' },
      rawPrice: { INR: 3499, USD: 49 },
      period: '/ month',
      description: 'Full-spectrum autonomous career suite with priority GPU allocation.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      creditsAdded: 8000,
      features: [
        '8,000 Monthly Credits (Instant top-up)',
        'All Standard Pro capabilities included',
        'Campus Placement & University Drives Tracker',
        'Executive Salary & Negotiation Simulator',
        'Direct Recruiter Cold Outreach Pitch Engine',
        'Priority GPU Allocation & Ultra-fast AI Processing',
        'Dedicated 1-on-1 Priority Technical Support'
      ],
      buttonText: 'Unlock Premium Elite',
      disabled: currentPlan === 'premium' || currentPlan === 'admin',
      color: 'border-amber-500/40 bg-amber-500/5 text-ink'
    }
  ];

  const faqs = [
    {
      q: 'How quickly are my credits and features unlocked?',
      a: 'Activation is instantaneous. The moment your payment is verified by Razorpay or Stripe, your account tier upgrades and your credit balance updates automatically.'
    },
    {
      q: 'Can I cancel my subscription at any time?',
      a: 'Yes, you can cancel whenever you want from your Profile & Billing settings. You retain access to all plan features and remaining credits until the end of your billing cycle.'
    },
    {
      q: 'Do subscription credits roll over?',
      a: 'Yes. Standard plan credits roll over for 2 months, and Premium plan credits roll over for 3 months as long as your subscription remains active.'
    },
    {
      q: 'Will I receive a GST / Tax Invoice?',
      a: 'Yes. An official tax-compliant receipt with order ID and transaction details is generated and available for immediate printing/download.'
    }
  ];

  const handleStartCheckout = (planItem: typeof plansData[0]) => {
    if (planItem.disabled || planItem.id === 'free') return;
    
    setCheckoutItem({
      type: 'subscription',
      itemId: planItem.id,
      title: planItem.name,
      subtitle: planItem.description,
      basePriceINR: planItem.rawPrice.INR,
      basePriceUSD: planItem.rawPrice.USD,
      credits: planItem.creditsAdded,
      badge: planItem.recommended ? 'MOST POPULAR' : undefined,
      featuresUnlocked: [
        `+${planItem.creditsAdded.toLocaleString()} Monthly Credits (Instant Top-Up)`,
        'Unlimited ATS & Resume Optimizations',
        'Interactive AI Mock Interview Lab',
        'Priority GPU Acceleration & 0s Queue'
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
                          MOST POPULAR
                        </div>
                      )}
                      
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-5 shadow-sm">
                          {p.icon}
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-1 font-sans">{p.name}</h3>
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
                              <Zap className="w-3 h-3" /> Post-Payment Outcome:
                            </p>
                            <p className="text-[11px] text-ink font-semibold">
                              +{p.creditsAdded.toLocaleString()} Credits added immediately & all features unlocked.
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
