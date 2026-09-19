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
  Link2
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
    <div className="min-h-screen bg-background text-ink pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono font-bold text-accent uppercase tracking-[0.25em]">
                FINANCIAL LEDGER & BILLING
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-ink sm:text-4xl font-sans">
              Credits & Billing Hub
            </h1>
            <p className="text-xs text-ink-dim uppercase tracking-wider font-mono font-bold mt-1">
              Transparent, real-time credit management & payment gateways
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Currency Selector */}
            <div className="bg-surface border border-border rounded-2xl p-1 flex items-center shadow-sm">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer",
                  currency === 'INR' ? "bg-accent text-black shadow-sm" : "text-ink-dim hover:text-ink"
                )}
              >
                ₹ INR (India)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer",
                  currency === 'USD' ? "bg-accent text-black shadow-sm" : "text-ink-dim hover:text-ink"
                )}
              >
                $ USD (Global)
              </button>
            </div>

            {/* Core Balance Card Header */}
            <div className="bg-surface border border-border p-3.5 sm:p-4 rounded-2xl flex items-center gap-4 shadow-md">
              <div className="p-3 rounded-xl bg-accent/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim">Active Balance</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-ink">
                    {creditWallet?.balance?.toLocaleString() ?? '---'}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-accent font-mono">Credits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2 mt-8 border-b border-border/60 pb-4">
          {[
            { id: 'wallet', label: 'Credit Wallet & Top-Ups', icon: Wallet },
            { id: 'pricing', label: 'Membership Plans', icon: Zap },
            { id: 'missions', label: 'Missions & Rank', icon: Award },
            { id: 'referrals', label: 'Referral Rewards', icon: UserPlus },
            ...(plan === 'admin' ? [{ id: 'admin', label: 'Admin Ledger', icon: Crown }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold font-sans uppercase tracking-wider transition-all border cursor-pointer",
                activeTab === tab.id
                  ? "bg-accent text-black border-accent shadow-sm"
                  : "text-ink-dim hover:text-ink hover:bg-surface border-transparent"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Feature Info Strip - appears ONLY on Credit Wallet & Top-Ups and Membership Plans */}
        {(activeTab === 'wallet' || activeTab === 'pricing') && (
          <div className="mb-8 p-4 sm:p-5 bg-surface border border-border/80 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Secure Payment</p>
                <p className="text-[10px] text-ink-dim font-mono">256-Bit SSL Encrypted</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Instant Credit Top-Up</p>
                <p className="text-[10px] text-ink-dim font-mono">Zero Waiting Period</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Cancel Anytime</p>
                <p className="text-[10px] text-ink-dim font-mono">No Lock-In Contracts</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-400/10 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Automated Tax Invoice</p>
                <p className="text-[10px] text-ink-dim font-mono">Emailed Instantly</p>
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
                  <div className="bg-surface border border-border p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-dim">Daily Allocation</h3>
                    </div>
                    <div className="relative w-36 h-36 flex items-center justify-center mb-3">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="60" className="stroke-surface-light fill-transparent stroke-[8]" />
                        <circle 
                          cx="72" 
                          cy="72" 
                          r="60" 
                          className="stroke-accent fill-transparent stroke-[8] transition-all duration-1000"
                          strokeDasharray="377"
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-2xl font-black font-mono text-ink">{percentageUsed}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-dim">Today</span>
                      </div>
                    </div>
                    <p className="text-xs font-mono font-semibold text-ink mb-1">
                      {creditWallet?.usedToday ?? 0} / {totalDailyAllowance} Daily Credits
                    </p>
                    <span className="text-[10px] font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full font-bold">
                      Refreshes Every 24h
                    </span>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-surface border border-border p-6 sm:p-7 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-dim mb-4">Account Tier Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                          <span className="text-xs text-ink-dim font-sans">Active Plan</span>
                          <span className="text-xs font-mono font-bold text-accent uppercase">{normalizedPlan} Tier</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                          <span className="text-xs text-ink-dim font-sans">Daily Plan Credits</span>
                          <span className="text-xs font-mono font-bold text-ink">
                            {normalizedPlan === 'admin' ? 'Unlimited' : `${creditWallet?.subscriptionCredits ?? totalDailyAllowance} / ${totalDailyAllowance}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                          <span className="text-xs text-ink-dim font-sans">Purchased Top-Up Credits</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {creditWallet?.topupCredits?.toLocaleString() ?? 0} (No Expiry)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-ink-dim font-sans">Active Daily Streak</span>
                          <span className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> {creditWallet?.streak ?? 1} Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-light border border-border rounded-xl p-3 mt-4">
                      <p className="text-[10px] text-accent font-mono font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                        <Zap className="w-3 h-3" /> AI Credits Daily — Refreshes every day
                      </p>
                      <p className="text-[11px] text-ink-dim leading-relaxed font-sans">
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
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-ink font-sans">On-Demand Credit Packs</h3>
                      <p className="text-xs text-ink-dim font-sans">Instant top-ups that stack on top of your plan. Credits never expire.</p>
                    </div>
                    
                    {/* Promo Code Input */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="PROMO CODE" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="bg-surface-light border border-border px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-accent w-32 text-center"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        className="min-h-[44px] bg-accent text-black px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase hover:bg-accent/90 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {promoMessage && (
                    <div className={cn(
                      "p-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider mb-4 border",
                      promoMessage.success ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {promoMessage.text}
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
                            "bg-surface-light/60 border p-5 rounded-2xl flex flex-col justify-between transition-all relative",
                            pack.recommended ? "border-accent ring-1 ring-accent/30 shadow-md" : "border-border"
                          )}
                        >
                          {pack.recommended && (
                            <span className="absolute -top-2.5 right-3 bg-accent text-black text-[8px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                              BEST VALUE
                            </span>
                          )}
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] bg-surface border border-border text-ink px-2 py-0.5 rounded-lg font-mono font-bold">
                                {pack.name}
                              </span>
                              <span className="text-[10px] text-accent font-mono font-bold">{pack.discount}</span>
                            </div>
                            <h4 className="text-2xl font-black font-mono text-ink mt-2 flex items-baseline gap-1">
                              +{pack.credits.toLocaleString()} <span className="text-[10px] font-bold uppercase text-ink-dim">CR</span>
                            </h4>
                            <p className="text-xs text-ink-dim mt-1.5 font-sans leading-snug font-medium italic">"{pack.description}"</p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-border/40">
                            <p className="text-[10px] font-mono text-ink-dim uppercase">Total Due:</p>
                            <div className="flex items-baseline gap-1 mb-3">
                              <span className="text-lg font-black font-mono text-ink">
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
                              className="min-h-[44px] w-full bg-accent text-black hover:bg-accent/90 transition-all py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Top-Up {pack.name}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Credit Usage History Chart */}
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-dim mb-4">
                    Credit Consumption & Earnings Trend
                  </h3>
                  <div className="h-56">
                    {chartData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-surface-light/30 text-center p-6">
                        <Activity className="w-8 h-8 text-accent opacity-60 mb-2" />
                        <p className="text-xs font-mono font-bold text-ink">No Activity Recorded Yet</p>
                        <p className="text-[11px] text-ink-dim mt-1 max-w-xs font-sans">
                          Your daily credit consumption and rewards will be tracked and plotted here as you use AI features.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="spentColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="earnedColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#606060" fontSize={10} fontStyle="bold" />
                          <YAxis stroke="#606060" fontSize={10} fontStyle="bold" />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} />
                          <Area type="monotone" dataKey="spent" stroke="#f43f5e" fillOpacity={1} fill="url(#spentColor)" strokeWidth={2} name="Spent" />
                          <Area type="monotone" dataKey="earned" stroke="#10b981" fillOpacity={1} fill="url(#earnedColor)" strokeWidth={2} name="Earned" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Panel */}
              <div className="space-y-8">
                <div className="bg-surface border border-border p-6 sm:p-7 rounded-3xl flex flex-col h-full max-h-[75vh] shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="text-sm font-bold text-ink font-sans">Transaction Ledger</h3>
                      <p className="text-[10px] text-ink-dim font-mono">Real-time ledger entries</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-ink-dim border border-dashed border-border rounded-2xl bg-surface-light/40 p-6">
                        <History className="w-8 h-8 text-accent opacity-60 mb-2" />
                        <p className="text-xs font-mono font-bold text-ink">Ledger Ready</p>
                        <p className="text-[11px] text-ink-dim mt-1 max-w-xs leading-relaxed font-sans">
                          Credits used for resume audits, voice interviews, and top-ups will be recorded here.
                        </p>
                      </div>
                    ) : (
                      transactions.map((t) => (
                        <div key={t.id} className="bg-surface-light/60 border border-border/60 p-3.5 rounded-xl flex justify-between items-center">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[10px] font-mono font-bold text-ink-dim">
                              {new Date(t.timestamp).toLocaleDateString()} • {t.type}
                            </span>
                            <span className="text-xs font-bold text-ink truncate mt-0.5 font-sans">{t.label}</span>
                          </div>
                          <span className={cn(
                            "text-xs font-mono font-black shrink-0",
                            t.amount > 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {t.amount > 0 ? `+${t.amount}` : t.amount} CR
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Configured Unit Costs */}
                <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-dim mb-3">AI Action Unit Costs</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'ATS Resume Analyzer', cost: creditCosts.resumeScan },
                      { label: 'Keyword Gap Audit', cost: creditCosts.atsOptimization },
                      { label: 'Tailored Resume Rewrite', cost: creditCosts.resumeRewrite },
                      { label: 'AI Cover Letter Draft', cost: creditCosts.coverLetter },
                      { label: 'Live AI Voice Mock Session', cost: creditCosts.interviewSession },
                      { label: 'Target Job Match Analysis', cost: creditCosts.jobMatchAnalysis },
                      { label: 'Autonomous Career Coach', cost: creditCosts.careerCoachChat }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-xs border-b border-border/40 pb-2">
                        <span className="text-ink-dim font-sans">{item.label}</span>
                        <span className="font-mono font-bold text-ink">{item.cost} Credits</span>
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
              <div className="bg-accent/10 border border-accent/30 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-accent uppercase tracking-wider">
                        AI Credits Daily — Refreshes every day
                      </span>
                      <span className="bg-accent/20 text-accent text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                        24h Refresh Cycle
                      </span>
                    </div>
                    <p className="text-xs text-ink/80 mt-1 leading-relaxed">
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
                        "p-7 rounded-3xl border transition-all flex flex-col justify-between relative bg-surface",
                        p.id === normalizedPlan ? "border-accent ring-1 ring-accent" : "border-border",
                        p.recommended && "shadow-lg shadow-accent/10 border-accent/60"
                      )}
                    >
                      {p.recommended && (
                        <span className="absolute -top-3 right-6 bg-accent text-black text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
                          RECOMMENDED
                        </span>
                      )}

                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-surface-light border border-border flex items-center justify-center mb-5">
                          <p.icon className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="text-xl font-bold text-ink font-sans mb-0.5">{p.name}</h3>
                        <p className="text-[11px] font-mono font-semibold text-accent mb-2">{p.tagline}</p>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-black font-mono text-ink">{p.price[currency]}</span>
                          <span className="text-xs text-ink-dim font-mono">{p.period}</span>
                        </div>
                        <p className="text-xs text-ink-dim leading-relaxed font-sans mb-6">{p.description}</p>

                        {/* Daily Plan Allotment */}
                        {p.id !== 'free' && (
                          <div className="mb-6 p-3 bg-surface-light border border-border rounded-xl">
                            <p className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1 mb-0.5">
                              <Zap className="w-3 h-3" /> Daily Plan Allotment:
                            </p>
                            <p className="text-xs text-ink font-semibold">
                              {p.creditsAdded.toLocaleString()} Daily Credits refreshed every 24h & feature limits active.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-border/40">
                          {p.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                              <span className="text-xs text-ink font-medium font-sans">{feat}</span>
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
                          "min-h-[44px] mt-8 w-full py-3.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                          p.id === normalizedPlan 
                            ? "bg-surface-light border-border text-ink-dim cursor-not-allowed" 
                            : p.id === 'premium'
                            ? "bg-amber-400 text-black hover:bg-amber-300 border-amber-400"
                            : "bg-accent text-black hover:bg-accent/90 border-accent",
                          p.disabled && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        {p.id === normalizedPlan ? 'Active Plan' : p.buttonText}
                        {p.id !== normalizedPlan && p.id !== 'free' && <Lock className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Fair-use policy notice */}
              <p className="text-xs text-ink-dim font-mono text-center">
                *Fair-use limits may apply for high-volume and unlimited features.
              </p>

              {/* Payment FAQ Section */}
              <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="text-base font-bold text-ink font-sans">Frequently Asked Questions (Payment & Billing)</h3>
                    <p className="text-xs text-ink-dim font-sans">Clear answers on activations, tax invoicing, and cancellations</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {paymentFaqs.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div 
                        key={index}
                        className="border border-border/60 rounded-2xl overflow-hidden bg-surface-light/40"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="min-h-[44px] w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-light transition-colors"
                        >
                          <span className="text-xs font-bold text-ink font-sans">{faq.q}</span>
                          <ChevronDown className={cn("w-4 h-4 text-ink-dim transition-transform shrink-0", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-xs text-ink-dim font-sans leading-relaxed border-t border-border/40 pt-3">
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
              <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">Candidate XP Level</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tight text-ink font-sans mt-0.5">Level {creditWallet?.level ?? 1}</h2>
                    <p className="text-xs text-ink-dim font-sans mt-0.5">
                      Ranks: {creditWallet?.unlockedBadges?.join(' • ') || 'Verified Candidate'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-dim font-sans">Total Experience Points</span>
                    <p className="text-xl font-black font-mono text-amber-400 mt-0.5">{creditWallet?.xp ?? 0} XP</p>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-surface-light rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, ((creditWallet?.xp ?? 0) / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Grid of Daily Missions & Weekly Challenges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Missions */}
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                  <h3 className="text-base font-bold text-ink font-sans mb-1">Daily Recruiter Operations</h3>
                  <p className="text-xs text-ink-dim font-sans mb-6">Resets every 24 hours at 00:00 UTC</p>

                  <div className="space-y-3">
                    {dailyMissions.map((m) => (
                      <div key={m.id} className="bg-surface-light/60 border border-border/60 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-xs font-bold text-ink font-sans">{m.title}</h4>
                            <p className="text-[11px] text-ink-dim mt-0.5">{m.description}</p>
                          </div>
                          <span className="text-[10px] bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full font-mono font-bold">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${(m.progress / m.maxProgress) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-ink shrink-0">
                            {m.progress}/{m.maxProgress}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Challenges */}
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                  <h3 className="text-base font-bold text-ink font-sans mb-1">Weekly Milestones</h3>
                  <p className="text-xs text-ink-dim font-sans mb-6">Career progress goals reset weekly</p>

                  <div className="space-y-3">
                    {weeklyChallenges.map((m) => (
                      <div key={m.id} className="bg-surface-light/60 border border-border/60 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-xs font-bold text-ink font-sans">{m.title}</h4>
                            <p className="text-[11px] text-ink-dim mt-0.5">{m.description}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-400/15 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full font-mono font-bold">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(m.progress / m.maxProgress) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-ink shrink-0">
                            {m.progress}/{m.maxProgress}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
                <h3 className="text-base font-bold text-ink font-sans mb-1">Career Achievements</h3>
                <p className="text-xs text-ink-dim font-sans mb-6">Milestone badges with instant credit rewards</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((a) => (
                    <div 
                      key={a.id} 
                      className={cn(
                        "border p-5 rounded-2xl transition-all flex flex-col justify-between",
                        a.unlocked 
                          ? "bg-amber-400/5 border-amber-400/40 shadow-sm" 
                          : "bg-surface-light/40 border-border"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-2xl">{a.badge.split(' ')[0]}</span>
                          {a.unlocked ? (
                            <span className="text-[9px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-mono font-bold">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[9px] bg-surface border border-border text-ink-dim px-2 py-0.5 rounded-full font-mono font-bold">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-ink font-sans">{a.title}</h4>
                        <p className="text-[11px] text-ink-dim mt-0.5 leading-relaxed">{a.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40">
                        <div className="flex justify-between items-center text-[10px] font-mono text-ink-dim mb-1">
                          <span>Progress</span>
                          <span>{a.progress}/{a.maxProgress}</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-light rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", a.unlocked ? "bg-amber-400" : "bg-accent")} 
                            style={{ width: `${(a.progress / a.maxProgress) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[9px] font-mono font-bold text-ink-dim">
                          <span>+{a.credits} Credits</span>
                          <span>+{a.xp} XP</span>
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                {/* Main Referral Card */}
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-ink font-sans">Referral Rewards Program</h3>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                        +100 CR Each
                      </span>
                    </div>
                    <p className="text-xs text-ink-dim font-sans mt-1">
                      Share your personal code with fellow candidates. Both of you receive +100 Credits when they complete their first ATS resume scan.
                    </p>
                  </div>

                  {/* Metrics Summary Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-surface-light/60 border border-border/60 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-mono text-ink-dim uppercase tracking-wider">Total Invites</p>
                      <p className="text-xl font-black font-mono text-ink mt-0.5">{referrals.length}</p>
                    </div>
                    <div className="bg-surface-light/60 border border-border/60 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-mono text-ink-dim uppercase tracking-wider">Rewarded</p>
                      <p className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                        {referrals.filter(r => r.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-surface-light/60 border border-border/60 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-mono text-ink-dim uppercase tracking-wider">Pending Scan</p>
                      <p className="text-xl font-black font-mono text-amber-400 mt-0.5">
                        {referrals.filter(r => r.status === 'pending').length}
                      </p>
                    </div>
                    <div className="bg-surface-light/60 border border-border/60 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-mono text-ink-dim uppercase tracking-wider">Credits Earned</p>
                      <p className="text-xl font-black font-mono text-accent mt-0.5">
                        +{referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.rewardCredits || 100), 0)} CR
                      </p>
                    </div>
                  </div>

                  {/* Share Boxes: Code and Direct Link */}
                  <div className="space-y-4">
                    {/* Invite Code Box */}
                    <div className="bg-surface-light border border-border p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim">Your Personal Referral Code</p>
                        <span className="text-2xl font-black font-mono text-ink block mt-0.5 tracking-wider">
                          {creditWallet?.referralCode ?? '---'}
                        </span>
                      </div>
                      <button 
                        onClick={handleCopyCode}
                        className="min-h-[44px] w-full sm:w-auto bg-accent text-black px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent/90 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        {copyCodeSuccess ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                        <span>{copyCodeSuccess ? 'Copied Code' : 'Copy Code'}</span>
                      </button>
                    </div>

                    {/* Direct Invite Link Box */}
                    <div className="bg-surface-light border border-border p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim">Shareable Invite Link</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex items-center bg-surface border border-border px-3.5 py-2.5 rounded-xl text-xs font-mono text-ink-dim overflow-hidden">
                          <Link2 className="w-4 h-4 mr-2 shrink-0 text-ink-dim" />
                          <span className="truncate select-all text-ink">
                            {creditWallet?.referralCode ? `${window.location.origin}/?ref=${creditWallet.referralCode}` : 'Generating link...'}
                          </span>
                        </div>
                        <button 
                          onClick={handleCopyLink}
                          disabled={!creditWallet?.referralCode}
                          className="min-h-[44px] bg-surface-light hover:bg-surface border border-border text-ink px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          {copyLinkSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copyLinkSuccess ? 'Copied Link' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Redeem Form */}
                  <div className="pt-2 border-t border-border/50">
                    <form onSubmit={handleReferralSubmit} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-mono font-bold uppercase text-ink-dim">
                          Enter Friend's Email or Referral Code
                        </label>
                        {creditWallet?.referredBy && (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Linked to {creditWallet.referredBy}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. HF-AB12 or friend@company.com" 
                          value={referralEmailInput}
                          onChange={(e) => setReferralEmailInput(e.target.value)}
                          disabled={isSubmittingReferral}
                          className="bg-surface-light border border-border px-4 py-2.5 rounded-xl text-xs font-sans text-ink focus:outline-none focus:border-accent flex-1"
                        />
                        <button 
                          type="submit"
                          disabled={isSubmittingReferral || !referralEmailInput.trim()}
                          className="min-h-[44px] bg-accent text-black px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmittingReferral && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Redeem</span>
                        </button>
                      </div>

                      {referralStatusMessage && (
                        <div className={cn(
                          "p-3 rounded-xl text-xs font-sans border flex items-start gap-2.5",
                          referralStatusMessage.type === 'success' 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : referralStatusMessage.type === 'info'
                            ? "bg-accent/10 border-accent/30 text-ink"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
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
                <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-ink font-sans">Referral Activity History</h4>
                      <p className="text-[11px] text-ink-dim font-sans">Real-time status of candidates who signed up with your invite</p>
                    </div>
                    <button
                      onClick={handleRefreshReferrals}
                      disabled={isRefreshingReferrals}
                      className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono text-ink-dim hover:text-ink bg-surface-light border border-border/80 hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
                      title="Re-check pending referral milestones"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingReferrals && "animate-spin text-accent")} />
                      <span>{isRefreshingReferrals ? 'Checking...' : 'Refresh Status'}</span>
                    </button>
                  </div>

                  {referrals.length === 0 ? (
                    <div className="text-center py-10 px-4 border border-dashed border-border/80 rounded-2xl bg-surface-light/30">
                      <div className="w-12 h-12 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-3 text-ink-dim">
                        <Users className="w-6 h-6 text-accent/60" />
                      </div>
                      <p className="text-xs font-bold text-ink font-sans">No referrals recorded yet</p>
                      <p className="text-[11px] text-ink-dim font-sans max-w-sm mx-auto mt-1 leading-relaxed">
                        Copy your invite code or link above and send it to your colleagues. As soon as they register and complete their first ATS resume scan, +100 Credits will unlock here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {referrals.map((ref) => (
                        <div 
                          key={ref.id}
                          className="bg-surface-light/70 border border-border/70 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0",
                              ref.status === 'completed' 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : "bg-amber-500/10 text-amber-400"
                            )}>
                              {ref.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-ink font-sans">
                                  {ref.referredEmail || ref.referredName || 'Peer Candidate'}
                                </p>
                                <span className="text-[10px] font-mono text-ink-dim">
                                  {ref.referralCode ? `(${ref.referralCode})` : ''}
                                </span>
                              </div>
                              <p className="text-[11px] text-ink-dim mt-0.5">
                                {ref.notes || (ref.status === 'completed' ? 'Completed first ATS Resume Scan' : 'Awaiting first ATS Resume Scan')}
                              </p>
                              {ref.createdAt && (
                                <p className="text-[9px] font-mono text-ink-dim/80 mt-1">
                                  Logged: {new Date(ref.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            <span className={cn(
                              "text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                              ref.status === 'completed'
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            )}>
                              {ref.status === 'completed' ? 'Reward Credited' : 'Pending 1st Scan'}
                            </span>
                            <span className="text-xs font-black font-mono text-accent sm:mt-1">
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
              <div className="space-y-8">
                {/* How It Works Card */}
                <div className="bg-surface border border-border p-6 sm:p-7 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-accent" />
                    <h3 className="text-sm font-bold text-ink font-sans">Program Rules</h3>
                  </div>

                  <div className="space-y-3 text-xs text-ink-dim font-sans leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-surface-light border border-border flex items-center justify-center text-[10px] font-mono font-bold text-ink shrink-0 mt-0.5">
                        1
                      </div>
                      <p><strong className="text-ink">Share:</strong> Send your invite link or code to a friend or colleague.</p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-surface-light border border-border flex items-center justify-center text-[10px] font-mono font-bold text-ink shrink-0 mt-0.5">
                        2
                      </div>
                      <p><strong className="text-ink">Condition:</strong> The invited candidate creates an account and completes their first ATS resume scan.</p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-surface-light border border-border flex items-center justify-center text-[10px] font-mono font-bold text-ink shrink-0 mt-0.5">
                        3
                      </div>
                      <p><strong className="text-ink">Instant Rewards:</strong> +100 Credits are instantly awarded to both accounts. Zero daily referral limits.</p>
                    </div>
                  </div>
                </div>

                {/* Community Leaderboard */}
                <div className="bg-surface border border-border p-6 sm:p-7 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="text-sm font-bold text-ink font-sans">Top Referrers</h3>
                      <p className="text-[10px] text-ink-dim font-mono">Community Leaders</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {leaderboard.map((item, idx) => (
                      <div key={idx} className="bg-surface-light/60 border border-border/40 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-ink-dim w-4">#{idx+1}</span>
                          <div>
                            <p className="text-xs font-bold text-ink font-sans">{item.name}</p>
                            <p className="text-[9px] text-ink-dim font-mono">{item.badge}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-accent">+{item.earned} CR</span>
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
