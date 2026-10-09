import React, { useState, useEffect } from 'react';
import { useAuth, UserPlan } from '../context/AuthContext';
import { usePlan, DEFAULT_CREDIT_COSTS, PLAN_CREDITS, CreditCosts } from '../context/PlanContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wallet, 
  History, 
  TrendingUp, 
  Gift, 
  UserPlus, 
  Award, 
  Zap, 
  Shield, 
  Crown, 
  CreditCard, 
  Lock, 
  PlusCircle, 
  MinusCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Users, 
  Flame, 
  ChevronRight,
  TrendingDown,
  DollarSign,
  Activity,
  CheckCircle2,
  Trash2,
  LockKeyhole,
  ShieldCheck,
  RotateCcw,
  FileText,
  ChevronDown,
  HelpCircle,
  ArrowRight,
  Clock,
  Link2,
  AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '../lib/utils';

import PaymentGatewayModal, { CheckoutItem } from '../components/PaymentGatewayModal';
import { CREDIT_PACKS } from '../constants/creditPacks.ts';
import { normalizePlanTier, PLAN_DAILY_CREDITS, PLAN_MONTHLY_CREDITS, SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';

export default function CreditsPage() {
  const { user } = useAuth();
  const {
    plan,
    creditWallet,
    subscriptionUsage,
    checkAccess,
    creditCosts,
    transactions,
    achievements,
    dailyMissions,
    weeklyChallenges,
    leaderboard,
    referrals,
    spendCredits,
    earnCredits,
    buyCredits,
    applyPromoCode,
    claimReferralReward,
    refreshReferralStatus,
    adminUpdateCosts,
    adminRewardCredits,
    adminDeductCredits,
    adminIssueRefund,
    adminSetReferralBan,
    adminFetchAllUsers,
    adminGetAnalytics
  } = usePlan();

  const normalizedPlan = normalizePlanTier(plan);

  const [activeTab, setActiveTab] = useState<'wallet' | 'missions' | 'referrals' | 'pricing' | 'admin'>('wallet');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  
  // Checkout Modal State
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);

  // Wallet states
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Referral states
  const [referralEmailInput, setReferralEmailInput] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [isRefreshingReferrals, setIsRefreshingReferrals] = useState(false);
  const [referralStatusMessage, setReferralStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Store packages (Finalized AI Credit Top-Up Pricing: MINI ₹49, BOOST ₹99, JOB HUNT ₹199, CAREER PACK ₹399)
  const storePackages = CREDIT_PACKS;

  // Membership Plans for Pricing Tab (Final 3-tier model)
  const membershipPlans = [
    {
      id: 'free',
      name: 'Free',
      tagline: 'For exploring AI HireFlow',
      price: { INR: '₹0', USD: '$0' },
      rawPrice: { INR: 0, USD: 0 },
      period: '/ month',
      description: 'Standard baseline intelligence for individual career explorers.',
      icon: Shield,
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
      buttonText: 'Current Plan',
      disabled: normalizedPlan === 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'For students & casual job seekers',
      badge: 'RECOMMENDED',
      price: { INR: '₹149', USD: '$2' },
      rawPrice: { INR: 149, USD: 2 },
      period: '/ month',
      recommended: true,
      description: 'Affordable acceleration tailored for students and casual job seekers.',
      icon: Zap,
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
      buttonText: 'Upgrade to Pro',
      disabled: normalizedPlan === 'pro' || normalizedPlan === 'premium' || normalizedPlan === 'admin'
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'For active job seekers',
      price: { INR: '₹249', USD: '$4' },
      rawPrice: { INR: 249, USD: 4 },
      period: '/ month',
      description: 'Maximum velocity and power for active candidates hunting their next dream role.',
      icon: Sparkles,
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
      buttonText: 'Unlock Premium',
      disabled: normalizedPlan === 'premium' || normalizedPlan === 'admin'
    }
  ];

  // Payment FAQ
  const paymentFaqs = [
    {
      q: 'How quickly are my credits and features activated?',
      a: 'Activation is instantaneous. As soon as the payment gateway (Razorpay or Stripe) confirms the transaction, our real-time webhook updates your account and credits your wallet immediately.'
    },
    {
      q: 'How do daily credits and rollover work?',
      a: 'Purchased top-up credit packs never expire and roll over indefinitely. Daily subscription credits refresh every 24 hours (unused daily subscription credits do not accumulate). Your account automatically spends daily subscription credits before using purchased top-up credits.'
    },
    {
      q: 'Can I cancel my subscription at any time?',
      a: 'Yes, you can cancel whenever you choose with a single click from your Profile & Billing page. You will retain access to all plan benefits and credits until the end of your current billing cycle.'
    },
    {
      q: 'Which payment methods are supported?',
      a: 'For Indian users (INR), we support UPI (Google Pay, PhonePe, Paytm), RuPay/Visa/Mastercard debit and credit cards, and Net Banking. For international users (USD), we support all major global credit cards, debit cards, and Apple Pay.'
    },
    {
      q: 'Will I receive a GST / Tax Invoice?',
      a: 'Yes. A formal tax invoice containing the transaction ID, breakdown of taxes, and billing details is automatically generated and sent to your registered email address.'
    }
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Admin states
  const [editedCosts, setEditedCosts] = useState<Partial<CreditCosts>>({});
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminUser, setSelectedAdminUser] = useState<string>('');
  const [adminAdjustmentAmount, setAdminAdjustmentAmount] = useState<string>('');
  const [adminAdjustmentLabel, setAdminAdjustmentLabel] = useState<string>('');
  const [adminRefundTxId, setAdminRefundTxId] = useState<string>('');
  const [adminAnalytics, setAdminAnalytics] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Checkout & Payment states
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'authorizing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [completedOrderDetails, setCompletedOrderDetails] = useState<any>(null);

  // Load admin data if admin
  useEffect(() => {
    if (plan === 'admin' && activeTab === 'admin') {
      loadAdminPanel();
    }
  }, [plan, activeTab]);

  const loadAdminPanel = async () => {
    setLoadingAdmin(true);
    try {
      const usersList = await adminFetchAllUsers();
      setAdminUsers(usersList);
      const analytics = await adminGetAnalytics();
      setAdminAnalytics(analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyCode = () => {
    const code = creditWallet?.referralCode;
    if (!code) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopyCodeSuccess(true);
        setTimeout(() => setCopyCodeSuccess(false), 2000);
      }).catch(() => {
        fallbackCopy(code);
        setCopyCodeSuccess(true);
        setTimeout(() => setCopyCodeSuccess(false), 2000);
      });
    } else {
      fallbackCopy(code);
      setCopyCodeSuccess(true);
      setTimeout(() => setCopyCodeSuccess(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const code = creditWallet?.referralCode || '';
    const link = `${window.location.origin}/?ref=${code}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopyLinkSuccess(true);
        setTimeout(() => setCopyLinkSuccess(false), 2000);
      }).catch(() => {
        fallbackCopy(link);
        setCopyLinkSuccess(true);
        setTimeout(() => setCopyLinkSuccess(false), 2000);
      });
    } else {
      fallbackCopy(link);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode) return;
    const check = applyPromoCode(promoCode);
    if (check.valid) {
      setPromoMessage({ success: true, text: `${check.description}` });
    } else {
      setPromoMessage({ success: false, text: 'Invalid promo code' });
    }
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = referralEmailInput.trim();
    if (!input) return;
    setIsSubmittingReferral(true);
    setReferralStatusMessage(null);
    try {
      const res = await claimReferralReward(input);
      setReferralStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      if (res.success) {
        setReferralEmailInput('');
      }
    } catch (err: any) {
      setReferralStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to submit referral. Please try again.'
      });
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const handleRefreshReferrals = async () => {
    setIsRefreshingReferrals(true);
    try {
      await refreshReferralStatus();
    } finally {
      setIsRefreshingReferrals(false);
    }
  };

  // Admin action submitters
  const handleAdminCostsSubmit = async () => {
    await adminUpdateCosts(editedCosts);
    await loadAdminPanel();
  };

  const handleAdminAdjustment = async (type: 'reward' | 'deduct') => {
    if (!selectedAdminUser || !adminAdjustmentAmount || !adminAdjustmentLabel) return;
    const amountNum = parseInt(adminAdjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (type === 'reward') {
      await adminRewardCredits(selectedAdminUser, amountNum, adminAdjustmentLabel);
    } else {
      await adminDeductCredits(selectedAdminUser, amountNum, adminAdjustmentLabel);
    }

    setAdminAdjustmentAmount('');
    setAdminAdjustmentLabel('');
    await loadAdminPanel();
  };

  const handleAdminRefund = async () => {
    if (!selectedAdminUser || !adminRefundTxId || !adminAdjustmentAmount) return;
    const amountNum = parseInt(adminAdjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await adminIssueRefund(selectedAdminUser, adminRefundTxId, amountNum, adminAdjustmentLabel || 'Refund processed');
    setAdminRefundTxId('');
    setAdminAdjustmentAmount('');
    setAdminAdjustmentLabel('');
    await loadAdminPanel();
  };

  const handleAdminBanToggle = async (targetUid: string, currentlyBanned: boolean) => {
    await adminSetReferralBan(targetUid, !currentlyBanned);
    await loadAdminPanel();
  };

  // Real Payment Execution Flow via PaymentGatewayModal
  const handlePaymentInitiation = (params: {
    type: 'subscription' | 'credits';
    item: string;
    itemName: string;
    price: number;
    currencySymbol: string;
    credits: number;
    priceUSD?: number;
  }) => {
    const isINR = currency === 'INR';
    const priceINR = isINR ? params.price : Math.round(params.price * 80);
    const priceUSD = params.priceUSD || (isINR ? Math.round(params.price / 80) || 4 : params.price);

    setCheckoutItem({
      type: params.type,
      itemId: params.item,
      title: params.itemName,
      subtitle: params.type === 'subscription' 
        ? 'Monthly subscription tier with instant credit refill' 
        : `Instant top-up of +${params.credits.toLocaleString()} AI Credits`,
      basePriceINR: priceINR,
      basePriceUSD: priceUSD,
      credits: params.credits,
      badge: params.type === 'subscription' ? 'PLAN UPGRADE' : 'CREDIT PACK',
      featuresUnlocked: params.type === 'subscription'
        ? [
            `+${params.credits.toLocaleString()} Monthly Credits`,
            'Zero Queue Time & Priority AI Execution',
            'Full Access to Voice Mock Interview Lab',
            'Automated GST Invoice Receipt'
          ]
        : [
            `+${params.credits.toLocaleString()} Wallet Credits Added Immediately`,
            'Credits Never Expire',
            'Stackable on Any Plan Tier',
            'Automated GST Invoice Receipt'
          ]
    });
    setIsPaymentGatewayOpen(true);
  };

  // Helper values for rendering progress wheels
  const totalDailyAllowance = PLAN_DAILY_CREDITS[normalizedPlan] || 150;
  const percentageUsed = creditWallet 
    ? Math.min(100, Math.round(((creditWallet.usedToday || 0) / totalDailyAllowance) * 100))
    : 0;
  const strokeDashoffset = 377 - (377 * Math.min(100, percentageUsed)) / 100;

  // Derive chart data from real user transactions
  const chartData = React.useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    const dateMap: Record<string, { spent: number; earned: number }> = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sorted.forEach((t) => {
      const d = new Date(t.timestamp);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dateMap[key]) {
        dateMap[key] = { spent: 0, earned: 0 };
      }
      if (t.type === 'spend') {
        dateMap[key].spent += Math.abs(t.amount);
      } else {
        dateMap[key].earned += Math.abs(t.amount);
      }
    });

    return Object.entries(dateMap).map(([name, val]) => ({
      name,
      spent: val.spent,
      earned: val.earned,
    }));
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[var(--hf-bg)] text-[var(--hf-text)] pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--hf-text)]">
              Credits & Billing
            </h1>
            <p className="text-sm text-[var(--hf-text-secondary)]">
              Manage your AI credits, subscription plan, and usage transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Selector */}
            <div 
              role="group" 
              aria-label="Currency selection"
              className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl p-1 flex items-center shadow-xs"
            >
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={cn(
                  "min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                  currency === 'INR' 
                    ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-semibold shadow-xs border border-[var(--hf-border)]" 
                    : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                )}
              >
                ₹ INR (India)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={cn(
                  "min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                  currency === 'USD' 
                    ? "bg-[var(--hf-surface)] text-[var(--hf-text)] font-semibold shadow-xs border border-[var(--hf-border)]" 
                    : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                )}
              >
                $ USD (Global)
              </button>
            </div>

            {/* Core Balance Card Header */}
            <div className="hf-card p-3 sm:px-4 sm:py-3 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-[var(--hf-cta)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--hf-text-secondary)]">Available balance</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)] font-mono tabular-nums">
                    {creditWallet?.balance?.toLocaleString() ?? '---'}
                  </span>
                  <span className="text-xs font-medium text-[var(--hf-text-muted)]">Credits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-[var(--hf-border)] pb-2">
          <nav 
            aria-label="Billing sections" 
            className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
          >
            {[
              { id: 'wallet', label: 'Credit Wallet & Top-Ups', icon: Wallet },
              { id: 'pricing', label: 'Membership Plans', icon: Zap },
              { id: 'missions', label: 'Missions & Rank', icon: Award },
              { id: 'referrals', label: 'Referral Rewards', icon: UserPlus },
              ...(plan === 'admin' ? [{ id: 'admin', label: 'Admin Ledger', icon: Crown }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "min-h-[44px] shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                    isActive
                      ? "bg-[var(--hf-surface)] text-[var(--hf-cta)] border border-[var(--hf-border)] shadow-xs font-semibold"
                      : "text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[var(--hf-cta)]" : "text-[var(--hf-text-muted)]")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Feature Info Strip - appears ONLY on Credit Wallet & Top-Ups and Membership Plans */}
        {(activeTab === 'wallet' || activeTab === 'pricing') && (
          <div className="mb-8 p-4 sm:p-5 hf-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--hf-text)]">Secure Payment</p>
                <p className="text-xs text-[var(--hf-text-secondary)]">256-Bit SSL Encrypted</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-warning)] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--hf-text)]">Instant Credit Top-Up</p>
                <p className="text-xs text-[var(--hf-text-secondary)]">Zero Waiting Period</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-success)] flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--hf-text)]">Cancel Anytime</p>
                <p className="text-xs text-[var(--hf-text-secondary)]">No Lock-In Contracts</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--hf-text)]">Automated Tax Invoice</p>
                <p className="text-xs text-[var(--hf-text-secondary)]">Emailed Instantly</p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* TAB 1: WALLET & STORE */}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left & Center Columns */}
              <div className="lg:col-span-2 space-y-8">
                {/* Allowance & Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Daily used wheel */}
                  <div className="hf-card p-6 flex flex-col items-center justify-between text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--hf-text)]">Daily allocation</h3>
                    </div>

                    <div className="relative w-36 h-36 flex items-center justify-center my-3">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="60" className="stroke-[var(--hf-surface-secondary)] fill-transparent stroke-[8]" />
                        <circle 
                          cx="72" 
                          cy="72" 
                          r="60" 
                          className="stroke-[var(--hf-cta)] fill-transparent stroke-[8] transition-all duration-1000"
                          strokeDasharray="377"
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-text)]">{percentageUsed}%</span>
                        <span className="text-xs text-[var(--hf-text-secondary)]">Used today</span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <p className="text-xs font-medium text-[var(--hf-text)]">
                        {creditWallet?.usedToday ?? 0} / {totalDailyAllowance} daily credits
                      </p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)]">
                        Refreshes every 24 hours
                      </span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--hf-text)]">Account tier status</h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--hf-cta)]/10 text-[var(--hf-cta)] border border-[var(--hf-cta)]/20 capitalize">
                          {normalizedPlan} tier
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-[var(--hf-border)] pb-2.5">
                          <span className="text-xs text-[var(--hf-text-secondary)]">Active plan</span>
                          <span className="text-xs font-semibold capitalize text-[var(--hf-text)]">{normalizedPlan} plan</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[var(--hf-border)] pb-2.5">
                          <span className="text-xs text-[var(--hf-text-secondary)]">Daily plan credits</span>
                          <span className="text-xs font-mono font-semibold tabular-nums text-[var(--hf-text)]">
                            {normalizedPlan === 'admin' ? 'Unlimited' : `${creditWallet?.subscriptionCredits ?? totalDailyAllowance} / ${totalDailyAllowance}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[var(--hf-border)] pb-2.5">
                          <span className="text-xs text-[var(--hf-text-secondary)]">Purchased top-up credits</span>
                          <span className="text-xs font-mono font-semibold tabular-nums text-[var(--hf-success)]">
                            {creditWallet?.topupCredits?.toLocaleString() ?? 0} (No expiration)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--hf-text-secondary)]">Daily login streak</span>
                          <span className="text-xs font-semibold text-[var(--hf-warning)] flex items-center gap-1.5">
                            <Flame className="w-4 h-4 fill-[var(--hf-warning)] text-[var(--hf-warning)]" /> {creditWallet?.streak ?? 1} days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hf-card-secondary p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Daily credits reset
                      </p>
                      <p className="text-[11px] text-[var(--hf-text-secondary)] leading-relaxed">
                        {normalizedPlan === 'admin'
                          ? 'Unlimited AI credits and zero usage limits on all intelligence engines.'
                          : normalizedPlan === 'premium'
                          ? '800 AI Credits/day reset every 24 hours. Top-up credits remain separate and never expire.'
                          : normalizedPlan === 'pro'
                          ? '500 AI Credits/day reset every 24 hours. Top-up credits remain separate and never expire.'
                          : '150 AI Credits/day reset every 24 hours. Daily credits are used before top-up credits.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credit Store Package Grid */}
                <div className="hf-card p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[var(--hf-text)]">On-demand credit packs</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                        Instant top-ups that stack on top of your plan. Credits never expire.
                      </p>
                    </div>
                    
                    {/* Promo Code Input */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input 
                        id="promo-code-input"
                        type="text" 
                        placeholder="PROMO CODE" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        aria-label="Promo code"
                        className="min-h-[44px] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-3.5 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] w-36 text-center"
                      />
                      <button 
                        type="button"
                        onClick={handleApplyPromo}
                        className="hf-btn-secondary min-h-[44px] px-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {promoMessage && (
                    <div className={cn(
                      "p-3 rounded-lg text-xs font-medium border flex items-center gap-2",
                      promoMessage.success 
                        ? "bg-[var(--hf-success)]/10 text-[var(--hf-success)] border-[var(--hf-success)]/20" 
                        : "bg-[var(--hf-error)]/10 text-[var(--hf-error)] border-[var(--hf-error)]/20"
                    )}>
                      {promoMessage.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{promoMessage.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {storePackages.map((pack) => {
                      const finalPrice = promoCode && applyPromoCode(promoCode).valid
                        ? Math.round(pack.price[currency] * (1 - applyPromoCode(promoCode).discountPercent / 100))
                        : pack.price[currency];

                      return (
                        <div 
                          key={pack.id} 
                          id={`credit-pack-${pack.id}`}
                          className={cn(
                            "hf-card p-5 flex flex-col justify-between relative transition-all",
                            pack.recommended 
                              ? "border-[var(--hf-cta)] ring-1 ring-[var(--hf-cta)]/20 shadow-sm" 
                              : "border-[var(--hf-border)]"
                          )}
                        >
                          {pack.recommended && (
                            <span className="absolute -top-2.5 right-3 bg-[var(--hf-cta)] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
                              Best value
                            </span>
                          )}
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text)]">
                                {pack.name}
                              </span>
                              <span className="text-xs font-medium text-[var(--hf-success)]">{pack.discount}</span>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                              <span className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-text)]">
                                +{pack.credits.toLocaleString()}
                              </span>
                              <span className="text-xs font-medium text-[var(--hf-text-muted)]">Credits</span>
                            </div>
                            <p className="text-xs text-[var(--hf-text-secondary)] mt-1.5 leading-relaxed font-normal italic">
                              "{pack.description}"
                            </p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-[var(--hf-border)]">
                            <p className="text-xs text-[var(--hf-text-secondary)] font-medium">Total due:</p>
                            <div className="flex items-baseline gap-1 mb-3">
                              <span className="text-xl font-bold font-mono tabular-nums text-[var(--hf-text)]">
                                {currency === 'INR' ? `₹${finalPrice}` : `$${finalPrice}`}
                              </span>
                            </div>

                            <button 
                              type="button"
                              id={`btn-topup-${pack.id}`}
                              onClick={() => handlePaymentInitiation({
                                type: 'credits',
                                item: pack.id,
                                itemName: `${pack.name} (${pack.credits} Credits)`,
                                price: finalPrice,
                                currencySymbol: currency === 'INR' ? '₹' : '$',
                                credits: pack.credits
                              })}
                              className={cn(
                                "min-h-[44px] w-full rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                                pack.recommended ? "hf-btn-primary" : "hf-btn-secondary"
                              )}
                            >
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>Top-up {pack.name}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Credit Usage History Chart */}
                <div className="hf-card p-6 sm:p-7 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[var(--hf-text)]">
                        Credit consumption and earnings trend
                      </h3>
                      <p className="text-xs text-[var(--hf-text-secondary)]">
                        Track credits spent on AI features versus credits earned over time
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--hf-text-secondary)] font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                        Spent
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--hf-text-secondary)] font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                        Earned
                      </span>
                    </div>
                  </div>

                  <div className="h-56">
                    {chartData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center border border-dashed border-[var(--hf-border)] rounded-xl bg-[var(--hf-surface-secondary)]/40 text-center p-6">
                        <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center mb-2.5">
                          <Activity className="w-5 h-5 text-[var(--hf-text-muted)]" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--hf-text)]">No activity recorded yet</p>
                        <p className="text-xs text-[var(--hf-text-secondary)] mt-1 max-w-sm">
                          Your daily credit consumption and rewards will be tracked and plotted here as you use AI features.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="spentColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#E11D48" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#E11D48" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="earnedColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#15803D" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#15803D" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="name" 
                            stroke="#68778A" 
                            fontSize={11} 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#68778A" 
                            fontSize={11} 
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--hf-surface)', 
                              borderColor: 'var(--hf-border)', 
                              borderRadius: '0.5rem', 
                              color: 'var(--hf-text)', 
                              fontSize: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)'
                            }} 
                          />
                          <Area type="monotone" dataKey="spent" stroke="#E11D48" fillOpacity={1} fill="url(#spentColor)" strokeWidth={2} name="Spent" />
                          <Area type="monotone" dataKey="earned" stroke="#15803D" fillOpacity={1} fill="url(#earnedColor)" strokeWidth={2} name="Earned" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Panel */}
              <div className="space-y-8">
                <div className="hf-card p-6 sm:p-7 flex flex-col h-full max-h-[75vh] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-[var(--hf-cta)]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--hf-text)]">Transaction ledger</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)]">Activity history for this account</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[var(--hf-border)] rounded-xl bg-[var(--hf-surface-secondary)]/40 p-6">
                        <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center mb-2.5">
                          <History className="w-5 h-5 text-[var(--hf-text-muted)]" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--hf-text)]">No transactions recorded yet</p>
                        <p className="text-xs text-[var(--hf-text-secondary)] mt-1 max-w-xs leading-relaxed">
                          Credits used for resume audits, voice interviews, and top-ups will be recorded here.
                        </p>
                      </div>
                    ) : (
                      transactions.map((t) => (
                        <div key={t.id} className="bg-[var(--hf-surface-secondary)]/60 border border-[var(--hf-border)] p-3 rounded-lg flex justify-between items-center gap-3">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[11px] font-medium text-[var(--hf-text-secondary)]">
                              {new Date(t.timestamp).toLocaleDateString()} • <span className="capitalize">{t.type}</span>
                            </span>
                            <span className="text-xs font-semibold text-[var(--hf-text)] truncate mt-0.5">{t.label}</span>
                          </div>
                          <span className={cn(
                            "text-xs font-mono font-bold shrink-0 tabular-nums px-2 py-0.5 rounded-md",
                            t.amount > 0 
                              ? "text-[var(--hf-success)] bg-[var(--hf-success)]/10" 
                              : "text-[var(--hf-error)] bg-[var(--hf-error)]/10"
                          )}>
                            {t.amount > 0 ? `+${t.amount}` : t.amount} CR
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Configured Unit Costs */}
                <div className="hf-card p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[var(--hf-cta)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--hf-text)]">Credit cost per action</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)]">Standard deduction per AI feature</p>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--hf-border)]">
                    {[
                      { label: 'ATS Resume Analyzer', cost: creditCosts.resumeScan },
                      { label: 'Keyword Gap Audit', cost: creditCosts.atsOptimization },
                      { label: 'Tailored Resume Rewrite', cost: creditCosts.resumeRewrite },
                      { label: 'AI Cover Letter Draft', cost: creditCosts.coverLetter },
                      { label: 'Live AI Voice Mock Session', cost: creditCosts.interviewSession },
                      { label: 'Target Job Match Analysis', cost: creditCosts.jobMatchAnalysis },
                      { label: 'Autonomous Career Coach', cost: creditCosts.careerCoachChat }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2.5 text-xs">
                        <span className="text-[var(--hf-text-secondary)]">{item.label}</span>
                        <span className="font-mono font-semibold text-[var(--hf-text)] tabular-nums">{item.cost} credits</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MEMBERSHIP PLANS */}
          {activeTab === 'pricing' && (
            <motion.div
              key="pricing-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Daily Refresh Information Banner */}
              <div className="hf-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--hf-text)]">
                        Daily credit allocation
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)]">
                        24-hour refresh cycle
                      </span>
                    </div>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                      Daily subscription credits refresh every 24 hours (unused daily credits do not accumulate). Purchased top-up credits remain separate and do not expire.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {membershipPlans.map((p) => {
                  const rawPriceNumber = p.rawPrice[currency];

                  return (
                    <div 
                      key={p.id}
                      className={cn(
                        "hf-card p-6 sm:p-7 flex flex-col justify-between relative transition-all",
                        p.id === normalizedPlan 
                          ? "border-[var(--hf-cta)] ring-1 ring-[var(--hf-cta)]/20 shadow-xs" 
                          : "border-[var(--hf-border)]",
                        p.recommended && "border-[var(--hf-cta)] shadow-sm"
                      )}
                    >
                      {p.recommended && (
                        <span className="absolute -top-2.5 right-6 bg-[var(--hf-cta)] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
                          Recommended
                        </span>
                      )}

                      <div>
                        <div className="w-11 h-11 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center mb-4">
                          <p.icon className="w-5 h-5 text-[var(--hf-cta)]" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--hf-text)]">{p.name}</h3>
                        <p className="text-xs font-medium text-[var(--hf-text-secondary)] mt-0.5 mb-3">{p.tagline}</p>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-bold font-mono tabular-nums text-[var(--hf-text)]">{p.price[currency]}</span>
                          <span className="text-xs text-[var(--hf-text-secondary)] font-medium">{p.period}</span>
                        </div>
                        <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed mb-5">{p.description}</p>

                        {/* Daily Plan Allotment */}
                        {p.id !== 'free' && (
                          <div className="hf-card-secondary p-3.5 mb-5 space-y-0.5">
                            <p className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Daily credit allotment
                            </p>
                            <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                              {p.creditsAdded.toLocaleString()} daily credits refreshed every 24 hours.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2.5 pt-4 border-t border-[var(--hf-border)]">
                          {p.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--hf-text)]">
                              <Check className="w-4 h-4 text-[var(--hf-success)] shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          if (p.id === 'free') return;
                          handlePaymentInitiation({
                            type: 'subscription',
                            item: p.id,
                            itemName: `${p.name} Plan`,
                            price: rawPriceNumber,
                            currencySymbol: currency === 'INR' ? '₹' : '$',
                            credits: p.creditsAdded
                          });
                        }}
                        disabled={p.disabled}
                        className={cn(
                          "min-h-[44px] mt-8 w-full rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                          p.id === normalizedPlan 
                            ? "bg-[var(--hf-surface-secondary)] text-[var(--hf-text-muted)] border border-[var(--hf-border)] cursor-not-allowed" 
                            : p.recommended
                            ? "hf-btn-primary"
                            : "hf-btn-secondary",
                          p.disabled && p.id !== normalizedPlan && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        {p.id === normalizedPlan ? 'Active plan' : p.buttonText}
                        {p.id !== normalizedPlan && p.id !== 'free' && <Lock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Fair-use policy notice */}
              <p className="text-xs text-[var(--hf-text-muted)] text-center">
                *Fair-use limits may apply for high-volume and unlimited features.
              </p>

              {/* Payment FAQ Section */}
              <div className="hf-card p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 text-[var(--hf-cta)]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--hf-text)]">
                      Frequently asked questions (Payment & Billing)
                    </h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                      Clear details on credit activation, tax invoices, and cancellation policy
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {paymentFaqs.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div 
                        key={index}
                        className="border border-[var(--hf-border)] rounded-xl overflow-hidden bg-[var(--hf-surface)] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          aria-expanded={isOpen}
                          className="min-h-[48px] w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--hf-surface-secondary)]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                        >
                          <span className="text-sm font-semibold text-[var(--hf-text)]">{faq.q}</span>
                          <ChevronDown className={cn("w-4 h-4 text-[var(--hf-text-secondary)] transition-transform shrink-0", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-xs text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-3">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: MISSIONS & RANKS */}
          {activeTab === 'missions' && (
            <motion.div
              key="missions-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Level & XP bar */}
              <div className="hf-card p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--hf-warning)]/10 text-[var(--hf-warning)] border border-[var(--hf-warning)]/20">
                        Candidate level
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-[var(--hf-text)]">
                        Level {creditWallet?.level ?? 1}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--hf-text-secondary)] flex-wrap">
                      <span>Ranks:</span>
                      {creditWallet?.unlockedBadges && creditWallet.unlockedBadges.length > 0 ? (
                        creditWallet.unlockedBadges.map((badge, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)] text-[11px] font-medium"
                          >
                            {badge}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--hf-text-muted)]">Verified candidate</span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--hf-border)] w-full sm:w-auto">
                    <span className="text-xs font-medium text-[var(--hf-text-secondary)]">Total experience</span>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-text)] mt-0.5">
                      {creditWallet?.xp ?? 0} <span className="text-xs font-medium text-[var(--hf-text-muted)]">XP</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-[var(--hf-cta)] rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((creditWallet?.xp ?? 0) / 1000) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-[var(--hf-text-secondary)]">
                    <span>Level {creditWallet?.level ?? 1} progression</span>
                    <span className="font-mono tabular-nums text-[var(--hf-text)]">{creditWallet?.xp ?? 0} / 1,000 XP</span>
                  </div>
                </div>
              </div>

              {/* Grid of Daily Missions & Weekly Challenges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Daily Missions */}
                <div className="hf-card p-6 sm:p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-[var(--hf-cta)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--hf-text)]">Daily recruitment tasks</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">Resets every 24 hours at 00:00 UTC</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dailyMissions.map((m) => (
                      <div key={m.id} className="hf-card-secondary p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-[var(--hf-text)]">{m.title}</h4>
                            <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 leading-relaxed">{m.description}</p>
                          </div>
                          <span className="text-xs font-mono font-semibold tabular-nums shrink-0 px-2.5 py-1 rounded-md bg-[var(--hf-cta)]/10 text-[var(--hf-cta)] border border-[var(--hf-cta)]/20">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium text-[var(--hf-text-secondary)]">
                            <span>Progress</span>
                            <span className="font-mono tabular-nums text-[var(--hf-text)]">{m.progress}/{m.maxProgress}</span>
                          </div>
                          <div className="h-2 w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[var(--hf-cta)] rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, (m.progress / m.maxProgress) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Challenges */}
                <div className="hf-card p-6 sm:p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-[var(--hf-cta)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--hf-text)]">Weekly milestones</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">Career goals reset weekly</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {weeklyChallenges.map((m) => (
                      <div key={m.id} className="hf-card-secondary p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-[var(--hf-text)]">{m.title}</h4>
                            <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 leading-relaxed">{m.description}</p>
                          </div>
                          <span className="text-xs font-mono font-semibold tabular-nums shrink-0 px-2.5 py-1 rounded-md bg-[var(--hf-success)]/10 text-[var(--hf-success)] border border-[var(--hf-success)]/20">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium text-[var(--hf-text-secondary)]">
                            <span>Progress</span>
                            <span className="font-mono tabular-nums text-[var(--hf-text)]">{m.progress}/{m.maxProgress}</span>
                          </div>
                          <div className="h-2 w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[var(--hf-success)] rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, (m.progress / m.maxProgress) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="hf-card p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[var(--hf-cta)]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--hf-text)]">Career achievements</h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                      Milestone achievements with instant credit and experience rewards
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((a) => (
                    <div 
                      key={a.id} 
                      className={cn(
                        "p-5 rounded-xl border flex flex-col justify-between transition-all",
                        a.unlocked 
                          ? "bg-[var(--hf-surface)] border-[var(--hf-success)]/40 shadow-xs" 
                          : "bg-[var(--hf-surface-secondary)]/50 border-[var(--hf-border)] opacity-90"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-2xl" aria-hidden="true">{a.badge.split(' ')[0]}</span>
                          {a.unlocked ? (
                            <span className="text-[11px] font-medium bg-[var(--hf-success)]/10 text-[var(--hf-success)] border border-[var(--hf-success)]/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Unlocked
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-muted)] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-[var(--hf-text)]">{a.title}</h4>
                        <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">{a.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--hf-border)] space-y-2">
                        <div className="flex justify-between items-center text-xs text-[var(--hf-text-secondary)]">
                          <span>Progress</span>
                          <span className="font-mono tabular-nums text-[var(--hf-text)]">{a.progress}/{a.maxProgress}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-300", a.unlocked ? "bg-[var(--hf-success)]" : "bg-[var(--hf-cta)]")} 
                            style={{ width: `${Math.min(100, (a.progress / a.maxProgress) * 100)}%` }} 
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium text-[var(--hf-text-secondary)] pt-0.5">
                          <span className="font-mono text-[var(--hf-cta)]">+{a.credits} Credits</span>
                          <span className="font-mono text-[var(--hf-text-muted)]">+{a.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: REFERRALS */}
          {activeTab === 'referrals' && (
            <motion.div
              key="referrals-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* Main Referral Card */}
                <div className="hf-card p-6 sm:p-8 space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                          <UserPlus className="w-5 h-5 text-[var(--hf-cta)]" />
                        </div>
                        <h3 className="text-base font-bold text-[var(--hf-text)]">Referral rewards program</h3>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--hf-cta)]/10 text-[var(--hf-cta)] border border-[var(--hf-cta)]/20">
                        +100 Credits each
                      </span>
                    </div>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
                      Share your personal code with fellow candidates. Both of you receive +100 Credits when they complete their first ATS resume scan.
                    </p>
                  </div>

                  {/* Metrics Summary Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="hf-card-secondary p-4 rounded-xl">
                      <p className="text-xs text-[var(--hf-text-secondary)] font-medium">Total invites</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-text)] mt-1">{referrals.length}</p>
                    </div>
                    <div className="hf-card-secondary p-4 rounded-xl">
                      <p className="text-xs text-[var(--hf-text-secondary)] font-medium">Rewarded</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-success)] mt-1">
                        {referrals.filter(r => r.status === 'completed').length}
                      </p>
                    </div>
                    <div className="hf-card-secondary p-4 rounded-xl">
                      <p className="text-xs text-[var(--hf-text-secondary)] font-medium">Pending scan</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-warning)] mt-1">
                        {referrals.filter(r => r.status === 'pending').length}
                      </p>
                    </div>
                    <div className="hf-card-secondary p-4 rounded-xl">
                      <p className="text-xs text-[var(--hf-text-secondary)] font-medium">Credits earned</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-cta)] mt-1">
                        +{referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.rewardCredits || 100), 0)} CR
                      </p>
                    </div>
                  </div>

                  {/* Share Boxes: Code and Direct Link */}
                  <div className="space-y-4">
                    {/* Invite Code Box */}
                    <div className="hf-card-secondary p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-xs font-medium text-[var(--hf-text-secondary)]">Your personal referral code</p>
                        <span className="text-2xl font-bold font-mono tabular-nums text-[var(--hf-text)] block mt-1 tracking-wider">
                          {creditWallet?.referralCode ?? '---'}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCopyCode}
                        className="hf-btn-primary min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      >
                        {copyCodeSuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                        <span>{copyCodeSuccess ? 'Copied code' : 'Copy code'}</span>
                      </button>
                    </div>

                    {/* Direct Invite Link Box */}
                    <div className="hf-card-secondary p-5 rounded-xl space-y-2">
                      <p className="text-xs font-medium text-[var(--hf-text-secondary)]">Shareable invite link</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex items-center bg-[var(--hf-surface)] border border-[var(--hf-border)] px-3.5 py-2.5 rounded-lg text-xs font-mono text-[var(--hf-text-secondary)] overflow-hidden">
                          <Link2 className="w-4 h-4 mr-2 shrink-0 text-[var(--hf-text-muted)]" />
                          <span className="truncate select-all text-[var(--hf-text)]">
                            {creditWallet?.referralCode ? `${window.location.origin}/?ref=${creditWallet.referralCode}` : 'Generating link...'}
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={handleCopyLink}
                          disabled={!creditWallet?.referralCode}
                          className="hf-btn-secondary min-h-[44px] px-5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] disabled:opacity-50"
                        >
                          {copyLinkSuccess ? <Check className="w-4 h-4 text-[var(--hf-success)]" /> : <Copy className="w-4 h-4" />}
                          <span>{copyLinkSuccess ? 'Copied link' : 'Copy link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Redeem Form */}
                  <div className="pt-2 border-t border-[var(--hf-border)]">
                    <form onSubmit={handleReferralSubmit} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="referral-code-input" className="block text-xs font-medium text-[var(--hf-text-secondary)]">
                          Enter friend's email or referral code
                        </label>
                        {creditWallet?.referredBy && (
                          <span className="text-xs font-medium text-[var(--hf-success)] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Linked to {creditWallet.referredBy}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          id="referral-code-input"
                          type="text" 
                          placeholder="e.g. HF-AB12 or friend@company.com" 
                          value={referralEmailInput}
                          onChange={(e) => setReferralEmailInput(e.target.value)}
                          disabled={isSubmittingReferral}
                          className="min-h-[44px] bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] px-4 py-2.5 rounded-lg text-xs text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] flex-1"
                        />
                        <button 
                          type="submit"
                          disabled={isSubmittingReferral || !referralEmailInput.trim()}
                          className="hf-btn-primary min-h-[44px] px-6 py-2.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                        >
                          {isSubmittingReferral && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Redeem</span>
                        </button>
                      </div>

                      {referralStatusMessage && (
                        <div className={cn(
                          "p-3 rounded-lg text-xs border flex items-start gap-2.5",
                          referralStatusMessage.type === 'success' 
                            ? "bg-[var(--hf-success)]/10 border-[var(--hf-success)]/20 text-[var(--hf-success)]" 
                            : referralStatusMessage.type === 'info'
                            ? "bg-[var(--hf-cta)]/10 border-[var(--hf-cta)]/20 text-[var(--hf-text)]" 
                            : "bg-[var(--hf-error)]/10 border-[var(--hf-error)]/20 text-[var(--hf-error)]"
                        )}>
                          {referralStatusMessage.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span>{referralStatusMessage.text}</span>
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Referral Tracking History Ledger */}
                <div className="hf-card p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[var(--hf-text)]">Referral activity history</h4>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                        Real-time status of candidates who registered with your invite
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshReferrals}
                      disabled={isRefreshingReferrals}
                      className="hf-btn-secondary min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      title="Re-check pending referral milestones"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingReferrals && "animate-spin text-[var(--hf-cta)]")} />
                      <span>{isRefreshingReferrals ? 'Checking...' : 'Refresh status'}</span>
                    </button>
                  </div>

                  {referrals.length === 0 ? (
                    <div className="text-center py-10 px-4 border border-dashed border-[var(--hf-border)] rounded-xl bg-[var(--hf-surface-secondary)]/40">
                      <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center mx-auto mb-2.5 text-[var(--hf-text-muted)]">
                        <Users className="w-5 h-5 text-[var(--hf-cta)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--hf-text)]">No referrals recorded yet</p>
                      <p className="text-xs text-[var(--hf-text-secondary)] max-w-sm mx-auto mt-1 leading-relaxed">
                        Copy your invite code or link above and send it to your colleagues. As soon as they register and complete their first ATS resume scan, +100 Credits will unlock here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {referrals.map((ref) => (
                        <div 
                          key={ref.id}
                          className="hf-card-secondary p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0",
                              ref.status === 'completed' 
                                ? "bg-[var(--hf-success)]/10 text-[var(--hf-success)]" 
                                : "bg-[var(--hf-warning)]/10 text-[var(--hf-warning)]"
                            )}>
                              {ref.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-semibold text-[var(--hf-text)]">
                                  {ref.referredEmail || ref.referredName || 'Peer candidate'}
                                </p>
                                <span className="text-[11px] font-mono text-[var(--hf-text-muted)]">
                                  {ref.referralCode ? `(${ref.referralCode})` : ''}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                                {ref.notes || (ref.status === 'completed' ? 'Completed first ATS Resume Scan' : 'Awaiting first ATS Resume Scan')}
                              </p>
                              {ref.createdAt && (
                                <p className="text-[11px] font-mono text-[var(--hf-text-muted)] mt-1">
                                  Logged: {new Date(ref.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--hf-border)]">
                            <span className={cn(
                              "text-xs font-medium px-2.5 py-0.5 rounded-md",
                              ref.status === 'completed'
                                ? "bg-[var(--hf-success)]/10 text-[var(--hf-success)] border border-[var(--hf-success)]/20"
                                : "bg-[var(--hf-warning)]/10 text-[var(--hf-warning)] border border-[var(--hf-warning)]/20"
                            )}>
                              {ref.status === 'completed' ? 'Reward credited' : 'Pending 1st scan'}
                            </span>
                            <span className="text-xs font-bold font-mono text-[var(--hf-cta)] sm:mt-1">
                              +{ref.rewardCredits || 100} CR
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Leaderboard & Rules Panel */}
              <div className="space-y-6 sm:space-y-8">
                {/* How It Works Card */}
                <div className="hf-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-[var(--hf-cta)]" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--hf-text)]">Program rules</h3>
                  </div>

                  <div className="space-y-3 text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold font-mono text-[var(--hf-text)] shrink-0 mt-0.5">
                        1
                      </div>
                      <p><strong className="text-[var(--hf-text)]">Share:</strong> Send your invite link or code to a friend or colleague.</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold font-mono text-[var(--hf-text)] shrink-0 mt-0.5">
                        2
                      </div>
                      <p><strong className="text-[var(--hf-text)]">Condition:</strong> The invited candidate creates an account and completes their first ATS resume scan.</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold font-mono text-[var(--hf-text)] shrink-0 mt-0.5">
                        3
                      </div>
                      <p><strong className="text-[var(--hf-text)]">Instant rewards:</strong> +100 Credits are instantly awarded to both accounts. Zero daily referral limits.</p>
                    </div>
                  </div>
                </div>

                {/* Community Leaderboard */}
                <div className="hf-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[var(--hf-cta)]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--hf-text)]">Top referrers</h3>
                      <p className="text-xs text-[var(--hf-text-secondary)]">Community leaders</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {leaderboard.map((item, idx) => (
                      <div key={idx} className="hf-card-secondary p-3 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono font-bold text-xs text-[var(--hf-text-muted)] w-5 shrink-0">#{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--hf-text)] truncate">{item.name}</p>
                            <p className="text-[11px] text-[var(--hf-text-secondary)] font-medium">{item.badge}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-[var(--hf-cta)] shrink-0">+{item.earned} CR</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: ADMIN (ONLY ADMINS) */}
          {activeTab === 'admin' && plan === 'admin' && (
            <motion.div
              key="admin-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {loadingAdmin ? (
                <div className="flex items-center justify-center py-20 text-ink-dim">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <>
                  {adminAnalytics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-surface border border-border p-5 rounded-2xl">
                        <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">Total Platform Users</span>
                        <p className="text-2xl font-black font-mono text-ink mt-1">{adminAnalytics.totalUsers}</p>
                      </div>
                      <div className="bg-surface border border-border p-5 rounded-2xl">
                        <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">Total Credits Spent</span>
                        <p className="text-2xl font-black font-mono text-ink mt-1">{adminAnalytics.creditsSpent}</p>
                      </div>
                      <div className="bg-surface border border-border p-5 rounded-2xl">
                        <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">Premium Tier Users</span>
                        <p className="text-2xl font-black font-mono text-amber-400 mt-1">{adminAnalytics.premiumUsers}</p>
                      </div>
                      <div className="bg-surface border border-border p-5 rounded-2xl">
                        <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">Gross Invoiced Revenue</span>
                        <p className="text-2xl font-black font-mono text-emerald-400 mt-1">₹{adminAnalytics.estimatedRevenue}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Real Payment Gateway Modal */}
      <PaymentGatewayModal 
        isOpen={isPaymentGatewayOpen}
        onClose={() => setIsPaymentGatewayOpen(false)}
        item={checkoutItem}
      />
    </div>
  );
}
