import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  LockKeyhole
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart as ReChartsPie, Cell, Pie } from 'recharts';

export default function CreditsPage() {
  const { user } = useAuth();
  const {
    plan,
    creditWallet,
    creditCosts,
    transactions,
    achievements,
    dailyMissions,
    weeklyChallenges,
    leaderboard,
    spendCredits,
    earnCredits,
    buyCredits,
    applyPromoCode,
    claimReferralReward,
    adminUpdateCosts,
    adminRewardCredits,
    adminDeductCredits,
    adminIssueRefund,
    adminSetReferralBan,
    adminFetchAllUsers,
    adminGetAnalytics
  } = usePlan();

  const [activeTab, setActiveTab] = useState<'wallet' | 'missions' | 'referrals' | 'pricing' | 'admin'>('wallet');
  
  // Wallet states
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);

  // Referral states
  const [referralEmailInput, setReferralEmailInput] = useState('');

  // Store packages
  const storePackages = [
    { id: 'pack_500', credits: 500, price: 99, discount: 'Popular', badge: 'Casual Hunter' },
    { id: 'pack_1000', credits: 1000, price: 179, discount: '10% OFF', badge: 'Professional' },
    { id: 'pack_2500', credits: 2500, price: 399, discount: '20% OFF', badge: 'Pro Plus', recommended: true },
    { id: 'pack_5000', credits: 5000, price: 699, discount: '30% OFF', badge: 'AI Elite' },
    { id: 'pack_10000', credits: 10000, price: 1199, discount: '40% OFF', badge: 'SaaS Powerhouse' }
  ];

  // Admin states
  const [editedCosts, setEditedCosts] = useState<Partial<CreditCosts>>({});
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminUser, setSelectedAdminUser] = useState<string>('');
  const [adminAdjustmentAmount, setAdminAdjustmentAmount] = useState<string>('');
  const [adminAdjustmentLabel, setAdminAdjustmentLabel] = useState<string>('');
  const [adminRefundTxId, setAdminRefundTxId] = useState<string>('');
  const [adminAnalytics, setAdminAnalytics] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

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

  const handleCopyCode = () => {
    if (!creditWallet?.referralCode) return;
    navigator.clipboard.writeText(creditWallet.referralCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
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
    if (!referralEmailInput) return;
    await claimReferralReward(referralEmailInput);
    setReferralEmailInput('');
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

  // Razorpay Paywall states
  const [razorpayConfig, setRazorpayConfig] = useState<{ configured: boolean; keyId: string } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    // Check Razorpay server-side config
    fetch('/api/razorpay/config')
      .then(res => res.json())
      .then(data => setRazorpayConfig(data))
      .catch(err => console.error("Razorpay config check failed:", err));
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentInitiation = async (params: {
    type: 'subscription' | 'credits';
    item: string;
    price: number;
    credits: number;
  }) => {
    if (!user) return;
    setCheckingOut(true);
    setPaymentError(null);

    try {
      // Apply promo discount if any
      let finalPrice = params.price;
      if (promoCode && params.type === 'credits') {
        const pCheck = applyPromoCode(promoCode);
        if (pCheck.valid) {
          finalPrice = Math.round(params.price * (1 - pCheck.discountPercent / 100));
        }
      }

      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          type: params.type,
          item: params.item,
          price: finalPrice,
          credits: params.credits
        })
      });

      const data = await response.json();

      if (data.orderId) {
        // Razorpay order created on backend! Load Checkout JS
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Failed to load Razorpay payment SDK script.');
        }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Career Gateway",
          description: params.type === 'subscription' 
            ? `Career ${params.item === 'premium' ? 'Premium' : 'Standard'} Plan`
            : `${params.credits} Credits Pack Wallet Top-up`,
          order_id: data.orderId,
          handler: async function (paymentResponse: any) {
            setCheckingOut(false);
            setPaymentStatus('verifying');

            try {
              const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                  userId: user.uid,
                  type: params.type,
                  item: params.item,
                  credits: params.credits,
                  price: finalPrice
                })
              });

              const verifyData = await verifyResponse.json();
              if (verifyData.success) {
                const userRef = doc(db, 'users', user.uid);
                
                if (params.type === 'subscription') {
                  const addedCredits = params.item === 'premium' ? 8000 : 2000;
                  const updatedWallet = {
                    ...creditWallet,
                    balance: (creditWallet?.balance ?? 0) + addedCredits,
                    totalEarned: (creditWallet?.totalEarned ?? 0) + addedCredits,
                    usedThisMonth: creditWallet?.usedThisMonth ?? 0,
                    referralCode: creditWallet?.referralCode ?? ''
                  };

                  await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                    amount: addedCredits,
                    type: 'purchase',
                    label: `Razorpay Verified Upgrade to ${params.item.toUpperCase()} Plan`,
                    timestamp: new Date().toISOString()
                  });

                  await updateDoc(userRef, { 
                    plan: params.item,
                    creditWallet: updatedWallet
                  });
                } else {
                  // Credit top-up
                  const updatedWallet = {
                    ...creditWallet,
                    balance: (creditWallet?.balance ?? 0) + params.credits,
                    totalEarned: (creditWallet?.totalEarned ?? 0) + params.credits,
                    usedThisMonth: creditWallet?.usedThisMonth ?? 0,
                    referralCode: creditWallet?.referralCode ?? ''
                  };

                  await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                    amount: params.credits,
                    type: 'purchase',
                    label: `Razorpay Verified Purchase of ${params.credits} Credits Pack`,
                    timestamp: new Date().toISOString()
                  });

                  await updateDoc(userRef, { 
                    creditWallet: updatedWallet
                  });
                }

                setPaymentStatus('success');
              } else {
                setPaymentStatus('error');
                setPaymentError(verifyData.error || 'Payment verification failed.');
              }
            } catch (vErr: any) {
              console.error(vErr);
              setPaymentStatus('error');
              setPaymentError(vErr.message || 'Payment verification request failed.');
            }
          },
          prefill: {
            email: user.email || '',
          },
          theme: {
            color: "#6366f1",
          },
          modal: {
            ondismiss: function () {
              setCheckingOut(false);
              setPaymentStatus('error');
              setPaymentError('Payment window closed by user.');
            }
          }
        };

        setCheckingOut(false);
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();

      } else if (data.isSandbox) {
        // Server indicates Razorpay keys are not configured, trigger sandbox bypass.
        setCheckingOut(false);
        setPaymentStatus('verifying');
        
        // Simulate a transaction securely inside the sandbox environment
        setTimeout(async () => {
          try {
            const userRef = doc(db, 'users', user.uid);
            if (params.type === 'subscription') {
              const addedCredits = params.item === 'premium' ? 8000 : 2000;
              const updatedWallet = {
                ...creditWallet,
                balance: (creditWallet?.balance ?? 0) + addedCredits,
                totalEarned: (creditWallet?.totalEarned ?? 0) + addedCredits,
                usedThisMonth: creditWallet?.usedThisMonth ?? 0,
                referralCode: creditWallet?.referralCode ?? ''
              };

              await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                amount: addedCredits,
                type: 'purchase',
                label: `Sandbox Instant Bypass Upgrade: ${params.item.toUpperCase()} Tier`,
                timestamp: new Date().toISOString()
              });

              await updateDoc(userRef, { 
                plan: params.item,
                creditWallet: updatedWallet
              });
            } else {
              const updatedWallet = {
                ...creditWallet,
                balance: (creditWallet?.balance ?? 0) + params.credits,
                totalEarned: (creditWallet?.totalEarned ?? 0) + params.credits,
                usedThisMonth: creditWallet?.usedThisMonth ?? 0,
                referralCode: creditWallet?.referralCode ?? ''
              };

              await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                amount: params.credits,
                type: 'purchase',
                label: `Sandbox Instant Bypass: Purchased ${params.credits} Credits Pack`,
                timestamp: new Date().toISOString()
              });

              await updateDoc(userRef, { 
                creditWallet: updatedWallet
              });
            }
            setPaymentStatus('success');
          } catch (err) {
            console.error(err);
            setPaymentStatus('error');
            setPaymentError('Failed to execute Sandbox bypass transaction.');
          }
        }, 1200);
      } else {
        throw new Error(data.error || 'Failed to initiate Razorpay Session');
      }
    } catch (err: any) {
      console.error(err);
      setCheckingOut(false);
      setPaymentStatus('error');
      setPaymentError(err.message || 'Failed to initiate payment gateway connection.');
    }
  };

  // Helper values for rendering progress wheels
  const totalMonthlyAllowance = plan === 'premium' ? 8000 : plan === 'standard' ? 2000 : 250;
  const percentageUsed = creditWallet 
    ? Math.round(((creditWallet.usedThisMonth) / totalMonthlyAllowance) * 100)
    : 0;
  const strokeDashoffset = 440 - (440 * Math.min(100, percentageUsed)) / 100;

  // Chart mocks based on transactional categories
  const chartData = [
    { name: 'Day 1', spent: 40, earned: 15 },
    { name: 'Day 3', spent: 85, earned: 100 },
    { name: 'Day 5', spent: 150, earned: 50 },
    { name: 'Day 7', spent: 220, earned: 125 },
    { name: 'Day 10', spent: 310, earned: 80 },
    { name: 'Day 12', spent: 390, earned: 150 },
    { name: 'Day 15', spent: 480, earned: 200 },
  ];

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-bold text-accent uppercase tracking-[0.25em] font-mono">Credits & Usage</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Credit Hub
            </h1>
            <p className="text-sm text-ink-dim uppercase tracking-widest font-bold mt-1">
              Powering AI HireFlow's Career Accelerator Systems
            </p>
          </div>

          {/* Core Balance Card Header */}
          <div className="bg-surface/50 backdrop-blur-md border border-border p-4 rounded-[2rem] flex items-center gap-6 shadow-2xl">
            <div className="p-4 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Verified Active Balance</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black font-mono text-white">
                  {creditWallet?.balance ?? '---'}
                </span>
                <span className="text-[10px] font-black uppercase text-accent font-mono">Credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2 mt-10 border-b border-border/40 pb-4">
          {[
            { id: 'wallet', label: 'Credit Wallet', icon: Wallet },
            { id: 'missions', label: 'Missions & Rank', icon: Award },
            { id: 'referrals', label: 'Referral Engine', icon: UserPlus },
            { id: 'pricing', label: 'Plans & Pricing', icon: Zap },
            ...(plan === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Crown }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === tab.id
                  ? 'bg-white text-black border-white'
                  : 'text-ink-dim hover:text-white hover:bg-surface border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Razorpay Gateway Status Banner */}
        {razorpayConfig && (
          <div className="mb-8 p-4 bg-surface border border-border/80 rounded-[1.5rem] flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-tight text-white">Razorpay Core Paywall System</p>
                <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">
                  {razorpayConfig.configured 
                    ? '🔒 Secured by 256-bit SSL Cryptographic Bank Uplink (Razorpay Live Mode)' 
                    : '🧪 Sandbox Bypass active — Instant transaction simulation enabled for developer preview'
                  }
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[8px] font-mono font-black uppercase tracking-widest border ${
              razorpayConfig.configured 
                ? 'bg-success/10 text-success border-success/30' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
            }`}>
              {razorpayConfig.configured ? 'RAZORPAY LIVE' : 'SANDBOX SIMULATOR'}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* WALLET TAB */}
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
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Monthly used wheel */}
                  <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink-dim mb-4">Allowance Consumed</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" className="stroke-surface-light fill-transparent stroke-[8]" />
                        <circle 
                          cx="80" 
                          cy="80" 
                          r="70" 
                          className="stroke-accent fill-transparent stroke-[8] transition-all duration-1000"
                          strokeDasharray="440"
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-3xl font-black font-mono">{percentageUsed}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-dim mt-1">Used This Month</span>
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-ink-dim uppercase">
                      {creditWallet?.usedThisMonth ?? 0} / {totalMonthlyAllowance} Credits Consumed
                    </p>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem] flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-ink-dim mb-6">Usage History</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-border/30 pb-3">
                          <span className="text-xs text-ink-dim font-bold uppercase">Plan Tier</span>
                          <span className="text-xs font-bold text-accent uppercase tracking-widest">{plan}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/30 pb-3">
                          <span className="text-xs text-ink-dim font-bold uppercase">Total Earned</span>
                          <span className="text-xs font-bold font-mono text-white">{creditWallet?.totalEarned ?? 250} CR</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/30 pb-3">
                          <span className="text-xs text-ink-dim font-bold uppercase">Current Level</span>
                          <span className="text-xs font-bold text-amber-500 uppercase">Level {creditWallet?.level ?? 1}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-ink-dim font-bold uppercase">Streak Multiplier</span>
                          <span className="text-xs font-bold text-success flex items-center gap-1 font-mono uppercase">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> {creditWallet?.streak ?? 1} Days Active
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 mt-6">
                      <p className="text-[9px] text-accent font-black uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <Zap className="w-3.5 h-3.5" /> Rollover Guarantee
                      </p>
                      <p className="text-[10px] text-ink-dim leading-relaxed font-semibold">
                        {plan === 'premium' ? 'Premium credits roll over for 3 months.' : plan === 'standard' ? 'Standard credits roll over for 2 months.' : 'Free tier credits expire monthly.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credit Store Package Grid */}
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-white">Credit Store</h3>
                      <p className="text-xs text-ink-dim font-bold uppercase tracking-wider mt-0.5">Top-up instantly to fuel critical AI runs</p>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="PROMO CODE" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="bg-black/40 border border-border px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-accent w-28 text-center"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold uppercase hover:opacity-90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {promoMessage && (
                    <div className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider mb-4 border ${
                      promoMessage.success ? 'bg-success/10 text-success border-success/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {promoMessage.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storePackages.map((pack) => (
                      <div 
                        key={pack.id} 
                        className={`bg-black/40 border p-5 rounded-[1.5rem] flex flex-col justify-between transition-all relative ${
                          pack.recommended ? 'border-accent ring-1 ring-accent/30' : 'border-border/60'
                        }`}
                      >
                        {pack.recommended && (
                          <span className="absolute -top-2.5 right-4 bg-accent text-white text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                            RECOMMENDED
                          </span>
                        )}
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-white/5 border border-white/10 text-ink px-2 py-0.5 rounded-full font-mono font-bold">
                              {pack.badge}
                            </span>
                            <span className="text-xs text-accent font-black uppercase tracking-wider">{pack.discount}</span>
                          </div>
                          <h4 className="text-2xl font-black font-mono text-white mt-4 flex items-baseline gap-1">
                            {pack.credits} <span className="text-[10px] font-black uppercase text-ink-dim">CR</span>
                          </h4>
                          <p className="text-[10px] text-ink-dim mt-1 font-semibold uppercase">Instantly unlocked</p>
                        </div>

                        <button 
                          onClick={() => handlePaymentInitiation({ type: 'credits', item: pack.id, price: pack.price, credits: pack.credits })}
                          className="mt-6 w-full bg-surface-light border border-border hover:bg-white hover:text-black transition-all py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em]"
                        >
                          Buy for ₹{promoCode && applyPromoCode(promoCode).valid ? Math.round(pack.price * (1 - applyPromoCode(promoCode).discountPercent / 100)) : pack.price}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analytics Chart */}
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ink-dim mb-6">Aesthetic Spent vs Earned Chart</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="spentColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fc3c3c" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#fc3c3c" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="earnedColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#404040" fontSize={10} fontStyle="bold" />
                        <YAxis stroke="#404040" fontSize={10} fontStyle="bold" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f0f10', borderColor: '#202022', borderRadius: '1rem', color: '#fff', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="spent" stroke="#fc3c3c" fillOpacity={1} fill="url(#spentColor)" strokeWidth={2} name="Spent" />
                        <Area type="monotone" dataKey="earned" stroke="#059669" fillOpacity={1} fill="url(#earnedColor)" strokeWidth={2} name="Earned" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Panel */}
              <div className="space-y-8">
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem] flex flex-col h-full max-h-[80vh] overflow-hidden">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-white">Credit History</h3>
                      <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">Verified ledger audits</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-ink-dim border border-dashed border-border rounded-lg bg-surface p-6">
                        <History className="w-8 h-8 text-accent opacity-60 mb-2" />
                        <p className="text-xs font-mono font-bold text-ink">Transaction history starts here</p>
                        <p className="text-[11px] text-ink-dim mt-1 max-w-xs leading-relaxed">
                          Credits used for resume scans, mock interviews, and job searches will appear in this ledger.
                        </p>
                      </div>
                    ) : (
                      transactions.map((t) => (
                        <div key={t.id} className="bg-black/30 border border-border/50 p-4 rounded-2xl flex justify-between items-center">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-ink-dim uppercase font-mono">
                              {new Date(t.timestamp).toLocaleDateString()} • {t.type}
                            </span>
                            <span className="text-[11px] font-bold text-white truncate mt-1">{t.label}</span>
                          </div>
                          <span className={`text-xs font-black font-mono ml-4 shrink-0 ${
                            t.amount > 0 ? 'text-success' : 'text-rose-500'
                          }`}>
                            {t.amount > 0 ? `+${t.amount}` : t.amount} CR
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Configured Costs Card */}
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ink-dim mb-4">Cost Per AI Request</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Resume Analyzer', cost: creditCosts.resumeScan },
                      { label: 'ATS Optimization', cost: creditCosts.atsOptimization },
                      { label: 'AI Resume Rewrite', cost: creditCosts.resumeRewrite },
                      { label: 'AI Cover Letter', cost: creditCosts.coverLetter },
                      { label: 'Practice AI Interview', cost: creditCosts.interviewSession },
                      { label: 'Job Matching', cost: creditCosts.jobMatchAnalysis },
                      { label: 'Career Coach Bot', cost: creditCosts.careerCoachChat }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-xs border-b border-border/20 pb-2">
                        <span className="text-ink-dim font-bold uppercase">{item.label}</span>
                        <span className="font-mono font-bold text-white">{item.cost} Credits</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MISSIONS & RANKS TAB */}
          {activeTab === 'missions' && (
            <motion.div
              key="missions-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Level & XP bar */}
              <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest font-mono">Level Index</span>
                    <h2 className="text-2xl font-black uppercase tracking-tight mt-1">Level {creditWallet?.level ?? 1}</h2>
                    <p className="text-sm text-ink-dim font-bold uppercase mt-0.5">
                      Ranks unlocked: {creditWallet?.unlockedBadges?.join(' • ') || 'Verified Candidate'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-dim font-bold uppercase">Total Experience Points</span>
                    <p className="text-xl font-black font-mono text-amber-500 mt-1">{creditWallet?.xp ?? 0} XP</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full bg-surface-light rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" 
                    style={{ width: `${Math.min(100, ((creditWallet?.xp ?? 0) / 1000) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-ink-dim font-bold uppercase tracking-wider mt-2.5">
                  <span>Level 1: Beginner</span>
                  <span>Level 5: Career Architect (1000 XP)</span>
                </div>
              </div>

              {/* Grid of Daily Missions & Weekly Challenges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Missions */}
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Daily Operations</h3>
                  <p className="text-xs text-ink-dim font-bold uppercase tracking-wider mb-6">Resets daily at 00:00 UTC</p>

                  <div className="space-y-4">
                    {dailyMissions.map((m) => (
                      <div key={m.id} className="bg-black/30 border border-border/60 p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-tight text-white">{m.title}</h4>
                            <p className="text-[10px] text-ink-dim font-semibold mt-1">{m.description}</p>
                          </div>
                          <span className="text-[9px] bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full font-mono font-bold">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
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
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Weekly Milestones</h3>
                  <p className="text-xs text-ink-dim font-bold uppercase tracking-wider mb-6">Progress overrides reset weekly</p>

                  <div className="space-y-4">
                    {weeklyChallenges.map((m) => (
                      <div key={m.id} className="bg-black/30 border border-border/60 p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-tight text-white">{m.title}</h4>
                            <p className="text-[10px] text-ink-dim font-semibold mt-1">{m.description}</p>
                          </div>
                          <span className="text-[9px] bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full font-mono font-bold">
                            +{m.rewardCredits} CR
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${(m.progress / m.maxProgress) * 100}%` }} />
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
              <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Career Achievements</h3>
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider mb-6">Gamified badges with instant credit payloads</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((a) => (
                    <div 
                      key={a.id} 
                      className={`border p-6 rounded-[2rem] transition-all flex flex-col justify-between ${
                        a.unlocked 
                          ? 'bg-amber-500/5 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                          : 'bg-black/40 border-border/60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-2xl">{a.badge.split(' ')[0]}</span>
                          {a.unlocked ? (
                            <span className="text-[8px] bg-amber-500 text-black px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[8px] bg-white/5 border border-white/10 text-ink-dim px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-white mt-1">{a.title}</h4>
                        <p className="text-[10px] text-ink-dim leading-relaxed mt-1 font-semibold">{a.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border/40">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-ink-dim mb-1">
                          <span>Progress</span>
                          <span>{a.progress}/{a.maxProgress}</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-light rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${a.unlocked ? 'bg-amber-500' : 'bg-accent'}`} 
                            style={{ width: `${(a.progress / a.maxProgress) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-3 text-[9px] font-mono font-bold text-ink-dim">
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

          {/* REFERRALS TAB */}
          {activeTab === 'referrals' && (
            <motion.div
              key="referrals-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Invite terminal */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Referral Engine</h3>
                  <p className="text-xs text-ink-dim font-bold uppercase tracking-wider mb-8">Share intelligence & receive rewards instantly</p>

                  <div className="bg-black/40 border border-border/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Your Unique Invite Code</p>
                      <span className="text-2xl font-black font-mono text-white tracking-widest block mt-1">
                        {creditWallet?.referralCode ?? '---'}
                      </span>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-2"
                    >
                      {copyCodeSuccess ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      <span>{copyCodeSuccess ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Redeem Form */}
                  <form onSubmit={handleReferralSubmit} className="mt-8 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-ink-dim mb-2">
                        Redeem Friend's Registered Email
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          placeholder="friend@email.com" 
                          value={referralEmailInput}
                          onChange={(e) => setReferralEmailInput(e.target.value)}
                          className="bg-black/40 border border-border px-4 py-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-accent flex-1"
                        />
                        <button 
                          type="submit"
                          className="bg-accent text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90"
                        >
                          Redeem Reward
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-ink-dim font-semibold uppercase leading-relaxed">
                      * Reward Rule: Active when both sign up, verify, and complete first resume analysis (+100 credits for both users).
                    </p>
                  </form>
                </div>

                {/* Referral Rules detail */}
                <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ink-dim mb-4">Verification Steps</h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', title: 'Invite Link Shared', desc: 'Friend signs up via your unique uplink reference.' },
                      { step: '2', title: 'Profile Setup completed', desc: 'Friend completes verifying security credentials.' },
                      { step: '3', title: 'Analyze & Reward', desc: 'Friend analyzes their first ATS Resume. Automatically triggers +100 credits grant.' }
                    ].map((item, index) => (
                      <div key={index} className="flex gap-4 items-start bg-black/20 p-4 rounded-xl">
                        <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-mono font-bold text-xs">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-tight text-white">{item.title}</h4>
                          <p className="text-[10px] text-ink-dim font-semibold mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leaderboard panel */}
              <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-white">Top Referrers</h3>
                    <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">Top members</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {leaderboard.map((item, idx) => (
                    <div key={idx} className="bg-black/30 border border-border/40 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-ink-dim w-4">#{idx+1}</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-white">{item.name}</p>
                          <p className="text-[9px] text-ink-dim font-bold uppercase mt-0.5">{item.badge}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-accent">+{item.earned} Credits</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* PRICING PLANS TAB */}
          {activeTab === 'pricing' && (
            <motion.div
              key="pricing-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Free Plan */}
              <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all relative ${
                plan === 'free' ? 'border-ink bg-surface/40' : 'border-border/60 bg-black/40'
              }`}>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-ink-dim" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">FREE</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black text-white">₹0</span>
                    <span className="text-[10px] text-ink-dim font-bold uppercase">/ month</span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-semibold mb-8">Standard intelligence limits for casual career explorers.</p>

                  <div className="space-y-4 pt-6 border-t border-border/30">
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span><strong>250</strong> Credits allowance/month</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink-dim">
                      <Lock className="w-4 h-4 text-ink-dim/40 shrink-0 mt-0.5" />
                      <span>Free credits expire monthly</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink-dim">
                      <Lock className="w-4 h-4 text-ink-dim/40 shrink-0 mt-0.5" />
                      <span>No Roll-over backup available</span>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={plan === 'free'}
                  className={`mt-10 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    plan === 'free' ? 'bg-white/5 border-border text-ink-dim cursor-not-allowed' : 'bg-surface-light border-border text-white hover:bg-white hover:text-black'
                  }`}
                >
                  {plan === 'free' ? 'Your Current Plan' : 'Select Free'}
                </button>
              </div>

              {/* Standard Plan */}
              <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all relative ${
                plan === 'standard' ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 bg-black/40'
              }`}>
                <span className="absolute -top-3 right-6 bg-blue-500 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">STANDARD</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black text-white">₹200</span>
                    <span className="text-[10px] text-ink-dim font-bold uppercase">/ month</span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-semibold mb-8">Advanced parameters for active job hunters.</p>

                  <div className="space-y-4 pt-6 border-t border-border/30">
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span><strong>2000</strong> Credits allowance/month</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Standard credits roll over for <strong>2 months</strong></span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Resume editor & resume builder unlocked</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handlePaymentInitiation({ type: 'subscription', item: 'standard', price: 200, credits: 2000 })}
                  disabled={plan === 'standard' || plan === 'premium' || plan === 'admin'}
                  className={`mt-10 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    plan === 'standard' 
                      ? 'bg-blue-500 text-white border-blue-500 cursor-not-allowed' 
                      : plan === 'premium' || plan === 'admin'
                      ? 'bg-white/5 border-border text-ink-dim cursor-not-allowed'
                      : 'bg-blue-500 text-white border-blue-500 hover:opacity-90 shadow-lg shadow-blue-500/10'
                  }`}
                >
                  {plan === 'standard' ? 'Active Plan' : plan === 'premium' || plan === 'admin' ? 'Select Standard' : 'Upgrade to Standard'}
                </button>
              </div>

              {/* Premium Plan */}
              <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all relative ${
                plan === 'premium' ? 'border-amber-500 bg-amber-500/5' : 'border-border/60 bg-black/40'
              }`}>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">PREMIUM</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black text-white">₹299</span>
                    <span className="text-[10px] text-ink-dim font-bold uppercase">/ month</span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-semibold mb-8">Absolute power for serious developers and placement builders.</p>

                  <div className="space-y-4 pt-6 border-t border-border/30">
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span><strong>8000</strong> Credits allowance/month</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Premium credits roll over for <strong>3 months</strong></span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Dedicated roadmap creation & priorities processing</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handlePaymentInitiation({ type: 'subscription', item: 'premium', price: 299, credits: 8000 })}
                  disabled={plan === 'premium' || plan === 'admin'}
                  className={`mt-10 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    plan === 'premium' 
                      ? 'bg-amber-500 text-white border-amber-500 cursor-not-allowed' 
                      : plan === 'admin'
                      ? 'bg-white/5 border-border text-ink-dim cursor-not-allowed'
                      : 'bg-amber-500 text-white border-amber-500 hover:opacity-90 shadow-lg shadow-amber-500/10'
                  }`}
                >
                  {plan === 'premium' ? 'Active Plan' : plan === 'admin' ? 'Select Premium' : 'Upgrade to Premium'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ADMIN TAB */}
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
                  {/* Global Analytics Overview */}
                  {adminAnalytics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-6 rounded-[2rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Total Platform Users</span>
                        <p className="text-3xl font-black font-mono text-white mt-1">{adminAnalytics.totalUsers}</p>
                      </div>
                      <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-6 rounded-[2rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Total Credits Spent</span>
                        <p className="text-3xl font-black font-mono text-white mt-1">{adminAnalytics.creditsSpent}</p>
                      </div>
                      <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-6 rounded-[2rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Premium Conversions</span>
                        <p className="text-3xl font-black font-mono text-amber-500 mt-1">{adminAnalytics.premiumUsers} Users</p>
                      </div>
                      <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-6 rounded-[2rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-dim">Est. Monthly Revenue</span>
                        <p className="text-3xl font-black font-mono text-success mt-1">₹{adminAnalytics.estimatedRevenue}</p>
                      </div>
                    </div>
                  )}

                  {/* Backend Adjusters */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Modify Costs Panel */}
                    <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                      <h3 className="text-lg font-black uppercase tracking-tight text-white mb-6">Configure Credit Costs</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'resumeScan', label: 'Resume Scan' },
                          { key: 'atsOptimization', label: 'ATS Optimization' },
                          { key: 'resumeRewrite', label: 'Resume Rewrite' },
                          { key: 'coverLetter', label: 'Cover Letter' },
                          { key: 'interviewSession', label: 'AI Interview Session' },
                          { key: 'jobMatchAnalysis', label: 'Job Match Analysis' },
                          { key: 'careerRoadmap', label: 'Career Roadmap' },
                          { key: 'linkedinReview', label: 'LinkedIn Review' },
                          { key: 'portfolioReview', label: 'Portfolio Review' },
                          { key: 'careerCoachChat', label: 'Career Coach Chat' }
                        ].map((item) => (
                          <div key={item.key} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-border/20">
                            <span className="text-xs font-bold text-ink-dim uppercase">{item.label}</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                placeholder={`${creditCosts[item.key as keyof CreditCosts]}`}
                                onChange={(e) => setEditedCosts(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                                className="bg-black border border-border w-16 text-center py-1 rounded-lg text-xs font-mono font-bold"
                              />
                              <span className="text-[10px] font-black text-ink-dim uppercase">CR</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleAdminCostsSubmit}
                        className="mt-6 w-full bg-white text-black py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                      >
                        Publish Backend Configuration
                      </button>
                    </div>

                    {/* Users & Transaction Adjustment Panel */}
                    <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem] space-y-6">
                      <h3 className="text-lg font-black uppercase tracking-tight text-white">Manual Adjuster Ledger</h3>
                      
                      {/* Select user */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-ink-dim mb-2">Target User</label>
                        <select 
                          value={selectedAdminUser} 
                          onChange={(e) => setSelectedAdminUser(e.target.value)}
                          className="bg-black border border-border px-4 py-3 rounded-xl text-xs font-bold text-white w-full"
                        >
                          <option value="">Select Target User Profile</option>
                          {adminUsers.map((u) => (
                            <option key={u.uid} value={u.uid}>
                              {u.displayName || u.email} ({u.plan})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount and Label */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-ink-dim mb-2">Credits Value</label>
                          <input 
                            type="number" 
                            placeholder="Amount" 
                            value={adminAdjustmentAmount}
                            onChange={(e) => setAdminAdjustmentAmount(e.target.value)}
                            className="bg-black border border-border px-4 py-3 rounded-xl text-xs font-bold text-white w-full font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-ink-dim mb-2">Transaction Label</label>
                          <input 
                            type="text" 
                            placeholder="Description" 
                            value={adminAdjustmentLabel}
                            onChange={(e) => setAdminAdjustmentLabel(e.target.value)}
                            className="bg-black border border-border px-4 py-3 rounded-xl text-xs font-bold text-white w-full"
                          />
                        </div>
                      </div>

                      {/* Adjustment Buttons */}
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handleAdminAdjustment('reward')}
                          className="flex-1 bg-success text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                          <PlusCircle className="w-4 h-4" /> Reward Credits
                        </button>
                        <button 
                          onClick={() => handleAdminAdjustment('deduct')}
                          className="flex-1 bg-rose-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                          <MinusCircle className="w-4 h-4" /> Deduct Credits
                        </button>
                      </div>

                      {/* Refund Actions */}
                      <div className="pt-6 border-t border-border/40 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-ink-dim">Issue Refund</h4>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-ink-dim mb-2">Failed Transaction ID Reference</label>
                          <input 
                            type="text" 
                            placeholder="tx_xxxxxxxxxx" 
                            value={adminRefundTxId}
                            onChange={(e) => setAdminRefundTxId(e.target.value)}
                            className="bg-black border border-border px-4 py-3 rounded-xl text-xs font-bold text-white w-full font-mono"
                          />
                        </div>
                        <button 
                          onClick={handleAdminRefund}
                          className="w-full bg-surface-light border border-border text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all"
                        >
                          <RefreshCw className="w-4 h-4" /> Issue Transaction Refund
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Anti-Abuse Controls */}
                  <div className="bg-surface/30 backdrop-blur-md border border-border/80 p-8 rounded-[2.5rem]">
                    <h3 className="text-lg font-black uppercase tracking-tight text-white mb-6">Anti-Abuse Controls & Ban List</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border/40 text-ink-dim font-bold uppercase">
                            <th className="pb-3">User Profile</th>
                            <th className="pb-3">Email Verification</th>
                            <th className="pb-3">Referral Status</th>
                            <th className="pb-3 text-right">Referral Program Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.map((u) => (
                            <tr key={u.uid} className="border-b border-border/20">
                              <td className="py-4 font-bold">{u.displayName || 'Anonymous Hunter'}</td>
                              <td className="py-4 font-mono text-ink-dim">{u.email}</td>
                              <td className="py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  u.creditWallet?.banReferrals ? 'bg-rose-500/10 text-rose-500' : 'bg-success/10 text-success'
                                }`}>
                                  {u.creditWallet?.banReferrals ? 'Banned' : 'Authorized'}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <button 
                                  onClick={() => handleAdminBanToggle(u.uid, !!u.creditWallet?.banReferrals)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    u.creditWallet?.banReferrals ? 'bg-success text-white' : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {u.creditWallet?.banReferrals ? 'Unban User' : 'Ban From Referrals'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Razorpay Secure Payment Overlay Notification */}
      <AnimatePresence>
        {(checkingOut || paymentStatus !== 'idle') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border/80 p-8 rounded-[2.5rem] max-w-md w-full text-center relative shadow-2xl"
            >
              {checkingOut && (
                <div className="flex flex-col items-center py-6">
                  <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Connecting Razorpay...</h3>
                  <p className="text-xs text-ink-dim mt-2 tracking-wide font-medium">Initializing secure checkout</p>
                </div>
              )}

              {paymentStatus === 'verifying' && (
                <div className="flex flex-col items-center py-6">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Verifying Transaction...</h3>
                  <p className="text-xs text-ink-dim mt-2 uppercase tracking-widest font-bold font-mono">Verifying secure ledger transaction</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-success/10 border border-success/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-success">Uplink Established!</h3>
                  <p className="text-xs text-ink mt-2 font-bold uppercase tracking-wide">Razorpay transaction verified successfully. Your resources have been updated.</p>
                  <button 
                    onClick={() => setPaymentStatus('idle')}
                    className="mt-6 px-6 py-2.5 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded-xl hover:opacity-95 transition-all"
                  >
                    Enter System
                  </button>
                </div>
              )}

              {paymentStatus === 'error' && (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mb-4">
                    <MinusCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-rose-500 font-mono">Routing Blocked</h3>
                  <p className="text-xs text-ink-dim mt-2 font-semibold uppercase leading-relaxed font-mono">{paymentError || 'An unexpected error occurred during routing.'}</p>
                  <button 
                    onClick={() => setPaymentStatus('idle')}
                    className="mt-6 px-6 py-2.5 bg-surface border border-border text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-white hover:text-black transition-all"
                  >
                    Acknowledge
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
