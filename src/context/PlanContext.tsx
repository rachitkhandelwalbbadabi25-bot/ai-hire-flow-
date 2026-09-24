import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, UserPlan } from './AuthContext';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Zap, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

// Default credit values per feature
export interface CreditCosts {
  resumeScan: number;
  atsOptimization: number;
  resumeRewrite: number;
  coverLetter: number;
  interviewSession: number;
  jobMatchAnalysis: number;
  careerRoadmap: number;
  linkedinReview: number;
  portfolioReview: number;
  careerCoachChat: number;
}

export const DEFAULT_CREDIT_COSTS: CreditCosts = {
  resumeScan: 20,
  atsOptimization: 25,
  resumeRewrite: 30,
  coverLetter: 15,
  interviewSession: 25,
  jobMatchAnalysis: 5,
  careerRoadmap: 50,
  linkedinReview: 20,
  portfolioReview: 30,
  careerCoachChat: 5
};

import { 
  SUBSCRIPTION_PLANS, 
  PLAN_DAILY_CREDITS,
  PLAN_MONTHLY_CREDITS, 
  normalizePlanTier, 
  getPlanDefinition, 
  getISOWeekString, 
  getMonthString, 
  getDayString,
  FeatureLimitKey,
  SubscriptionPlan
} from '../constants/subscriptionPlans';

// Subscription plans daily credits
export const PLAN_CREDITS = {
  free: 150,
  pro: 500,
  standard: 500,
  premium: 800,
  admin: 999999
};

// Transaction record
export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'grant' | 'referral' | 'achievement' | 'spend' | 'purchase' | 'refund' | 'bonus';
  label: string;
  timestamp: string;
}

// Subscription Usage tracking across daily, weekly, and monthly periods
export interface SubscriptionUsage {
  dailyDate: string;
  jobSearchesDaily: number;
  careerAdvisorDaily: number;

  weekId: string;
  atsAnalysesWeekly: number;
  interviewLabsWeekly: number;

  monthId: string;
  atsAnalysesMonthly: number;
  interviewLabsMonthly: number;
  jobsTrackedMonthly: number;
  resumeEditsMonthly: number;
}

// Full AI Credit Wallet Interface
export interface CreditWallet {
  balance: number;
  subscriptionCredits?: number;
  topupCredits?: number;
  usedThisMonth: number;
  usedToday?: number;
  totalEarned: number;
  expiringSoon: number;
  lastDailyGrant?: string;
  lastDailyRefresh?: string;
  lastMonthlyGrant?: string;
  streak: number;
  lastLoginDate: string;
  xp: number;
  level: number;
  referralCode: string;
  referredBy: string | null;
  hasUploadedResume: boolean;
  hasCompletedAnalysis: boolean;
  banReferrals: boolean;
  unlockedBadges: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badge: string;
  xp: number;
  credits: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  rewardCredits: number;
  type: 'daily' | 'weekly';
}

export interface NotificationAlert {
  id: string;
  title: string;
  description: string;
  type: 'achievement' | 'mission' | 'streak' | 'referral' | 'low-credits' | 'info';
  icon?: string;
  creditsAwarded?: number;
}

export interface ReferralRecord {
  id: string;
  referredEmail: string;
  referredName?: string;
  referredUid?: string;
  referrerUid?: string;
  referralCode: string;
  status: 'completed' | 'pending';
  rewardCredits: number;
  rewardClaimed: boolean;
  conditionMet: boolean;
  createdAt: string;
  completedAt?: string | null;
  notes?: string;
}

// Backward compatible feature structure
interface UserCredits {
  jobSearches: number;
  resumeScans: number;
  interviewSessions: number;
  coverLetters: number;
  jobsTracked: number;
}

interface PlanContextType {
  plan: UserPlan;
  creditWallet: CreditWallet | null;
  creditCosts: CreditCosts;
  transactions: CreditTransaction[];
  achievements: Achievement[];
  dailyMissions: Mission[];
  weeklyChallenges: Mission[];
  notifications: NotificationAlert[];
  isUpgradeModalOpen: boolean;
  leaderboard: any[];
  referrals: ReferralRecord[];
  
  // Subscription usage & limits
  subscriptionUsage: SubscriptionUsage | null;
  recordUsage: (feature: FeatureLimitKey | string) => Promise<void>;
  upgradePlan: (newPlan: 'pro' | 'premium') => Promise<void>;
  downgradePlan: (newPlan: 'free' | 'pro') => Promise<void>;
  getPlanDefinition: (planTier?: string | null) => SubscriptionPlan;

  // Backward compatible old props & access checks
  credits: UserCredits | null;
  checkAccess: (feature: keyof CreditCosts | string, currentCount?: number) => { 
    hasAccess: boolean; 
    remaining: number | string; 
    limit: number | string;
    period?: 'day' | 'week' | 'month' | 'unlimited' | 'action';
    displayLimit?: string;
    hasCredits?: boolean;
    creditsNeeded?: number;
    reason?: string;
  };
  deductCredit: (feature: keyof CreditCosts | string) => Promise<void>;
  openUpgradeModal: (feature?: string) => void;
  closeUpgradeModal: () => void;

  // New Credit Economy Actions
  spendCredits: (featureId: keyof CreditCosts, label: string) => Promise<void>;
  earnCredits: (amount: number, label: string, type?: CreditTransaction['type']) => Promise<void>;
  triggerAction: (actionType: 'run_analysis' | 'practice_interview' | 'track_job' | 'apply_job' | 'complete_lesson' | 'profile_complete' | 'ats_90_plus') => Promise<void>;
  buyCredits: (creditsAmount: number, price: number, promoCode?: string) => Promise<void>;
  applyPromoCode: (code: string) => { valid: boolean; discountPercent: number; description: string };
  claimReferralReward: (referredUserEmailOrCode: string) => Promise<{ success: boolean; message: string }>;
  refreshReferralStatus: () => Promise<void>;
  
  // Admin Methods
  adminUpdateCosts: (newCosts: Partial<CreditCosts>) => Promise<void>;
  adminRewardCredits: (userId: string, amount: number, label: string) => Promise<void>;
  adminDeductCredits: (userId: string, amount: number, label: string) => Promise<void>;
  adminIssueRefund: (userId: string, transactionId: string, amount: number, label: string) => Promise<void>;
  adminSetReferralBan: (userId: string, isBanned: boolean) => Promise<void>;
  adminFetchAllUsers: () => Promise<any[]>;
  adminGetAnalytics: () => Promise<any>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, plan } = useAuth();
  
  const [creditWallet, setCreditWallet] = useState<CreditWallet | null>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<SubscriptionUsage | null>(null);
  const [creditCosts, setCreditCosts] = useState<CreditCosts>(DEFAULT_CREDIT_COSTS);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyMissions, setDailyMissions] = useState<Mission[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<Mission[]>([]);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);

  // Statically defined gamified metadata compiled with user progress
  const staticAchievements = [
    { id: 'career_starter', title: 'Career Starter', description: 'Complete your profile details.', badge: '🥉 Starter', xp: 50, credits: 20, maxProgress: 1 },
    { id: 'resume_master', title: 'Resume Master', description: 'Complete 10 Resume Analyses.', badge: '🥈 Master', xp: 100, credits: 50, maxProgress: 10 },
    { id: 'interview_champion', title: 'Interview Champion', description: 'Complete 20 Mock Interviews.', badge: '🥇 Champion', xp: 200, credits: 100, maxProgress: 20 },
    { id: 'job_hunter', title: 'Job Hunter', description: 'Track 25 Jobs in Kanban board.', badge: '🎯 Hunter', xp: 100, credits: 50, maxProgress: 25 },
    { id: 'ats_expert', title: 'ATS Expert', description: 'Score above 90 on ATS Resume score.', badge: '🚀 Expert', xp: 80, credits: 30, maxProgress: 1 },
    { id: 'offer_chaser', title: 'Offer Chaser', description: 'Apply to 50 Jobs.', badge: '💼 Chaser', xp: 150, credits: 75, maxProgress: 50 },
    { id: 'consistency_master', title: 'Consistency Master', description: 'Maintain active logins.', badge: '📈 Constant', xp: 120, credits: 60, maxProgress: 30 },
    { id: 'weekly_warrior', title: 'Weekly Warrior', description: 'Reach a 7-day login streak.', badge: '🔥 Streak', xp: 50, credits: 25, maxProgress: 7 },
    { id: 'ai_explorer', title: 'AI Explorer', description: 'Use every single AI utility tool.', badge: '⚡ Explorer', xp: 100, credits: 50, maxProgress: 5 },
    { id: 'career_legend', title: 'Career Legend', description: 'Unlock all other achievements.', badge: '🏆 Legend', xp: 500, credits: 500, maxProgress: 9 }
  ];

  const staticDailyMissions = [
    { id: 'daily_analyze', title: 'Run Resume Analysis', description: 'Analyze any resume with AI.', maxProgress: 1, rewardCredits: 15, type: 'daily' as const },
    { id: 'daily_interview', title: 'Practice Interview', description: 'Perform 1 interview session.', maxProgress: 1, rewardCredits: 20, type: 'daily' as const },
    { id: 'daily_track', title: 'Track a Job', description: 'Add a job to your tracker.', maxProgress: 1, rewardCredits: 5, type: 'daily' as const },
    { id: 'daily_apply', title: 'Apply to a Job', description: 'Log a applied job application.', maxProgress: 1, rewardCredits: 10, type: 'daily' as const },
    { id: 'daily_lesson', title: 'Complete Lesson', description: 'Progress on your roadmap.', maxProgress: 1, rewardCredits: 15, type: 'daily' as const }
  ];

  const staticWeeklyChallenges = [
    { id: 'weekly_analyze_5', title: 'Resume Blitz', description: 'Analyze 5 resumes with AI.', maxProgress: 5, rewardCredits: 50, type: 'weekly' as const },
    { id: 'weekly_interview_3', title: 'Interview Guru', description: 'Complete 3 full mock interviews.', maxProgress: 3, rewardCredits: 75, type: 'weekly' as const },
    { id: 'weekly_apply_10', title: 'Opportunity Seeker', description: 'Apply and track 10 jobs.', maxProgress: 10, rewardCredits: 100, type: 'weekly' as const }
  ];

  // Load Configurable Backend Costs
  useEffect(() => {
    const costDocRef = doc(db, 'config', 'creditCosts');
    const unsubscribe = onSnapshot(
      costDocRef,
      (snap) => {
        if (snap.exists()) {
          setCreditCosts({ ...DEFAULT_CREDIT_COSTS, ...snap.data() });
        } else {
          setCreditCosts(DEFAULT_CREDIT_COSTS);
        }
      },
      (error) => {
        console.warn("Could not read remote credit costs, fallback to default:", error.message);
        setCreditCosts(DEFAULT_CREDIT_COSTS);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync user Credit Wallet and Transactions
  useEffect(() => {
    if (!user) {
      setCreditWallet(null);
      setTransactions([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(
      userRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let wallet = data.creditWallet as CreditWallet;
          const userPlanNormalized = normalizePlanTier(data.plan || plan);
          const targetDailyCredits = PLAN_DAILY_CREDITS[userPlanNormalized];
          const planDef = getPlanDefinition(userPlanNormalized);

          const now = new Date();
          const currentDayStr = getDayString(now);
          const currentWeekStr = getISOWeekString(now);
          const currentMonthStr = getMonthString(now);
          
          // Auto-migrate or initialize Credit Wallet
          if (!wallet) {
            const generatedCode = 'HF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const defaultWallet: CreditWallet = {
              balance: userPlanNormalized === 'admin' ? 999999 : targetDailyCredits,
              subscriptionCredits: userPlanNormalized === 'admin' ? 999999 : targetDailyCredits,
              topupCredits: 0,
              usedThisMonth: 0,
              usedToday: 0,
              totalEarned: targetDailyCredits,
              expiringSoon: 0,
              lastDailyGrant: currentDayStr,
              lastDailyRefresh: now.toISOString(),
              lastMonthlyGrant: now.toISOString(),
              streak: 1,
              lastLoginDate: currentDayStr,
              xp: 50, // bonus for registering
              level: 1,
              referralCode: generatedCode,
              referredBy: null,
              hasUploadedResume: false,
              hasCompletedAnalysis: false,
              banReferrals: false,
              unlockedBadges: ['Verified Candidate']
            };

            const initialUsage: SubscriptionUsage = {
              dailyDate: currentDayStr,
              jobSearchesDaily: 0,
              careerAdvisorDaily: 0,
              weekId: currentWeekStr,
              atsAnalysesWeekly: 0,
              interviewLabsWeekly: 0,
              monthId: currentMonthStr,
              atsAnalysesMonthly: 0,
              interviewLabsMonthly: 0,
              jobsTrackedMonthly: 0,
              resumeEditsMonthly: 0
            };
            
            await updateDoc(userRef, { 
              creditWallet: defaultWallet,
              subscriptionUsage: initialUsage
            });
            wallet = defaultWallet;
            setSubscriptionUsage(initialUsage);
            
            // Log initial daily grant
            await addDoc(collection(db, 'users', user.uid, 'transactions'), {
              amount: defaultWallet.balance,
              type: 'grant',
              label: `Initial ${planDef.name} Daily AI Credit Allocation (Refreshes every 24 hours)`,
              timestamp: now.toISOString()
            });
          } else {
            let updatedWallet = { ...wallet };
            let walletChanged = false;

            // 1. Check for 24-hour daily subscription credit refresh
            // Unused daily subscription credits do NOT accumulate.
            // Purchased top-up credits remain separate and do NOT expire.
            const lastGrantDay = wallet.lastDailyGrant || (wallet.lastDailyRefresh ? getDayString(new Date(wallet.lastDailyRefresh)) : null);
            const isNewDay = !lastGrantDay || lastGrantDay !== currentDayStr;

            if (isNewDay) {
              const existingTopup = wallet.topupCredits ?? Math.max(0, (wallet.balance || 0) - (wallet.subscriptionCredits || 0));
              const newSubCredits = userPlanNormalized === 'admin' ? 999999 : targetDailyCredits;
              const newBalance = userPlanNormalized === 'admin' ? 999999 : (newSubCredits + existingTopup);

              updatedWallet = {
                ...updatedWallet,
                subscriptionCredits: newSubCredits,
                topupCredits: existingTopup,
                balance: newBalance,
                usedToday: 0,
                lastDailyGrant: currentDayStr,
                lastDailyRefresh: now.toISOString()
              };
              walletChanged = true;

              await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                amount: newSubCredits,
                type: 'grant',
                label: `${planDef.name} Daily AI Credit Allocation (Refreshes every 24 hours)`,
                timestamp: now.toISOString()
              });
            }

            // 2. Check for login streak or daily reset
            const today = currentDayStr;
            const lastDate = wallet.lastLoginDate;

            if (lastDate !== today) {
              let newStreak = wallet.streak || 1;
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

              if (lastDate === yesterdayStr) {
                newStreak += 1;
              } else {
                newStreak = 1;
              }

              // Streak Reward Scheme
              let rewardCredits = 5;
              if (newStreak === 3) rewardCredits = 10;
              else if (newStreak === 7) rewardCredits = 25;
              else if (newStreak === 15) rewardCredits = 50;
              else if (newStreak === 30) rewardCredits = 100;

              const existingTopup = updatedWallet.topupCredits ?? 0;
              updatedWallet = {
                ...updatedWallet,
                streak: newStreak,
                lastLoginDate: today,
                topupCredits: existingTopup + rewardCredits,
                balance: updatedWallet.balance + rewardCredits,
                totalEarned: updatedWallet.totalEarned + rewardCredits,
                xp: updatedWallet.xp + 10
              };
              walletChanged = true;

              await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                amount: rewardCredits,
                type: 'bonus',
                label: `Day ${newStreak} Login Streak Reward`,
                timestamp: now.toISOString()
              });

              triggerNotification(`Daily Streak Day ${newStreak}!`, `You earned +${rewardCredits} Credits and +10 XP for staying consistent.`, 'streak', rewardCredits);
              
              if (newStreak >= 7) {
                await updateAchievementProgress('weekly_warrior', newStreak);
              }
              await updateAchievementProgress('consistency_master', 1);
            }

            // 3. Sync & Reset subscriptionUsage across day, week, month
            const rawUsage: Partial<SubscriptionUsage> = (data.subscriptionUsage as SubscriptionUsage) || {};
            const syncedUsage: SubscriptionUsage = {
              dailyDate: currentDayStr,
              jobSearchesDaily: rawUsage.dailyDate === currentDayStr ? (rawUsage.jobSearchesDaily || 0) : 0,
              careerAdvisorDaily: rawUsage.dailyDate === currentDayStr ? (rawUsage.careerAdvisorDaily || 0) : 0,

              weekId: currentWeekStr,
              atsAnalysesWeekly: rawUsage.weekId === currentWeekStr ? (rawUsage.atsAnalysesWeekly || 0) : 0,
              interviewLabsWeekly: rawUsage.weekId === currentWeekStr ? (rawUsage.interviewLabsWeekly || 0) : 0,

              monthId: currentMonthStr,
              atsAnalysesMonthly: rawUsage.monthId !== currentMonthStr ? 0 : (rawUsage.atsAnalysesMonthly || 0),
              interviewLabsMonthly: rawUsage.monthId !== currentMonthStr ? 0 : (rawUsage.interviewLabsMonthly || 0),
              jobsTrackedMonthly: rawUsage.monthId !== currentMonthStr ? 0 : (rawUsage.jobsTrackedMonthly || 0),
              resumeEditsMonthly: rawUsage.monthId !== currentMonthStr ? 0 : (rawUsage.resumeEditsMonthly || 0)
            };

            setSubscriptionUsage(syncedUsage);

            const usageNeedsSync = rawUsage.dailyDate !== currentDayStr || 
                                   rawUsage.weekId !== currentWeekStr || 
                                   rawUsage.monthId !== currentMonthStr;

            if (walletChanged || usageNeedsSync) {
              await updateDoc(userRef, { 
                creditWallet: updatedWallet,
                subscriptionUsage: syncedUsage
              });
            }
            wallet = updatedWallet;
          }

          // Calculate Level from XP
          // Level 1: <100, Level 2: 100-299, Level 3: 300-599, Level 4: 600-999, Level 5: 1000+
          let correctLevel = 1;
          let badgeTitle = 'Career Beginner';
          if (wallet.xp >= 1000) { correctLevel = 5; badgeTitle = 'Career Architect'; }
          else if (wallet.xp >= 600) { correctLevel = 4; badgeTitle = 'Interview Warrior'; }
          else if (wallet.xp >= 300) { correctLevel = 3; badgeTitle = 'Resume Ninja'; }
          else if (wallet.xp >= 100) { correctLevel = 2; badgeTitle = 'Career Explorer'; }

          if (wallet.level !== correctLevel) {
            const newBadges = [...(wallet.unlockedBadges || [])];
            if (!newBadges.includes(badgeTitle)) {
              newBadges.push(badgeTitle);
            }
            
            await updateDoc(userRef, { 
              'creditWallet.level': correctLevel,
              'creditWallet.unlockedBadges': newBadges
            });
            
            triggerNotification(`Leveled Up to Lvl ${correctLevel}!`, `You unlocked the "${badgeTitle}" rank and profile badge!`, 'achievement');
          }

          if (!wallet.referralCode) {
            const genCode = 'HF-' + (user.uid.slice(0, 4) + Math.random().toString(36).substring(2, 5)).toUpperCase();
            wallet.referralCode = genCode;
            updateDoc(userRef, { 'creditWallet.referralCode': genCode }).catch(() => {});
          }

          setCreditWallet(wallet);
        }
      },
      (error) => {
        console.warn("User wallet sync warning:", error.message);
      }
    );

    // Load Transactions ledger
    const transactionsQuery = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('timestamp', 'desc'),
      limit(15)
    );
    const unsubTransactions = onSnapshot(
      transactionsQuery,
      (snap) => {
        const records: CreditTransaction[] = [];
        snap.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() } as CreditTransaction);
        });
        setTransactions(records);
      },
      (error) => {
        console.warn("Transactions ledger sync warning:", error.message);
      }
    );

    // Load Real Referrals tracking ledger
    const referralsQuery = collection(db, 'users', user.uid, 'referrals');
    const unsubReferrals = onSnapshot(
      referralsQuery,
      (snap) => {
        const records: ReferralRecord[] = [];
        snap.forEach((d) => {
          records.push({ id: d.id, ...d.data() } as ReferralRecord);
        });
        records.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setReferrals(records);
      },
      (error) => {
        console.warn("Referrals tracking sync warning:", error.message);
      }
    );

    return () => {
      unsubUser();
      unsubTransactions();
      unsubReferrals();
    };
  }, [user, plan]);

  // Sync Achievements, Daily Missions, Weekly Challenges from Firestore
  useEffect(() => {
    if (!user || !creditWallet) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubProgress = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const userAchievements = data.achievementsState || {};
          const userMissions = data.missionsState || {};

          // Merge achievements
          const mergedAchievements = staticAchievements.map((ach) => {
            const state = userAchievements[ach.id] || {};
            return {
              ...ach,
              progress: Math.min(ach.maxProgress, state.progress || 0),
              unlocked: !!state.unlocked,
              unlockedAt: state.unlockedAt || undefined
            };
          });
          setAchievements(mergedAchievements);

          // Merge daily missions
          const mergedMissions = staticDailyMissions.map((mis) => {
            const state = userMissions[mis.id] || {};
            // If date doesn't match today, reset daily progress
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = state.date === todayStr;
            return {
              ...mis,
              progress: isToday ? Math.min(mis.maxProgress, state.progress || 0) : 0,
              completed: isToday ? !!state.completed : false
            };
          });
          setDailyMissions(mergedMissions);

          // Merge weekly challenges
          const mergedWeekly = staticWeeklyChallenges.map((weekly) => {
            const state = userMissions[weekly.id] || {};
            // Simple week check (UTC days since epoch / 7)
            const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)).toString();
            const isThisWeek = state.weekId === currentWeek;
            return {
              ...weekly,
              progress: isThisWeek ? Math.min(weekly.maxProgress, state.progress || 0) : 0,
              completed: isThisWeek ? !!state.completed : false
            };
          });
          setWeeklyChallenges(mergedWeekly);
        }
      },
      (error) => {
        console.warn("User progress sync warning:", error.message);
      }
    );

    return () => unsubProgress();
  }, [user, creditWallet]);

  // Fetch Referral Leaderboard
  useEffect(() => {
    if (!user) return;
    const fetchLeaderboard = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const boards: any[] = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.creditWallet) {
            boards.push({
              name: data.displayName || 'Anonymous Hunter',
              level: data.creditWallet.level || 1,
              earned: data.creditWallet.totalEarned || 250,
              badge: data.creditWallet.unlockedBadges?.[data.creditWallet.unlockedBadges.length - 1] || 'Verified Candidate'
            });
          }
        });
        boards.sort((a, b) => b.earned - a.earned);
        setLeaderboard(boards.slice(0, 5));
      } catch (err) {
        console.error("Leaderboard error:", err);
      }
    };
    fetchLeaderboard();
  }, [user, creditWallet]);

  // Toast Notification System
  const triggerNotification = (title: string, description: string, type: NotificationAlert['type'], creditsAwarded?: number) => {
    const id = Math.random().toString();
    setNotifications((prev) => [...prev, { id, title, description, type, creditsAwarded }]);
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  };

  // Spend Credits logic with transaction locking
  const spendCredits = async (featureId: keyof CreditCosts, label: string) => {
    if (!user || !creditWallet) return;
    if (normalizePlanTier(plan) === 'admin') {
      return; // Admin has unlimited AI Credits
    }
    const cost = creditCosts[featureId] || 0;

    if (creditWallet.balance < cost) {
      triggerNotification('Insufficient AI Credits', `This feature requires ${cost} credits. Please top up or upgrade your plan.`, 'low-credits');
      setIsUpgradeModalOpen(true);
      throw new Error(`Insufficient credits: Requires ${cost}`);
    }

    let subCredits = creditWallet.subscriptionCredits ?? creditWallet.balance;
    let topupCredits = creditWallet.topupCredits ?? 0;

    if (subCredits >= cost) {
      subCredits -= cost;
    } else {
      const remainder = cost - subCredits;
      subCredits = 0;
      topupCredits = Math.max(0, topupCredits - remainder);
    }

    const updatedWallet: CreditWallet = {
      ...creditWallet,
      subscriptionCredits: subCredits,
      topupCredits: topupCredits,
      balance: subCredits + topupCredits,
      usedThisMonth: (creditWallet.usedThisMonth || 0) + cost,
      usedToday: (creditWallet.usedToday || 0) + cost
    };

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { creditWallet: updatedWallet });
    setCreditWallet(updatedWallet);

    // Add transaction
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      amount: -cost,
      type: 'spend',
      label: label || `Used feature: ${featureId}`,
      timestamp: new Date().toISOString()
    });

    if (updatedWallet.balance < 50) {
      triggerNotification('AI Credits Running Low!', `You have ${updatedWallet.balance} credits left. Upgrade to stay connected.`, 'low-credits');
    }
  };

  // Earn Credits logic (preserves top-up and earned balance across resets)
  const earnCredits = async (amount: number, label: string, type: CreditTransaction['type'] = 'bonus') => {
    if (!user || !creditWallet) return;

    const userRef = doc(db, 'users', user.uid);
    const updatedWallet: CreditWallet = {
      ...creditWallet,
      topupCredits: (creditWallet.topupCredits ?? 0) + amount,
      balance: creditWallet.balance + amount,
      totalEarned: (creditWallet.totalEarned || 0) + amount
    };

    await updateDoc(userRef, { creditWallet: updatedWallet });
    setCreditWallet(updatedWallet);

    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      amount,
      type,
      label,
      timestamp: new Date().toISOString()
    });

    triggerNotification('Credits Granted!', `${label}: Earned +${amount} credits!`, 'info', amount);
  };

  // Update Achievement Progress Helper
  const updateAchievementProgress = async (achId: string, incrementVal: number) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const achievementsState = data.achievementsState || {};
    const state = achievementsState[achId] || { progress: 0, unlocked: false };

    if (state.unlocked) return; // already unlocked

    const targetAch = staticAchievements.find((a) => a.id === achId);
    if (!targetAch) return;

    let newProgress = (state.progress || 0) + incrementVal;
    if (achId === 'weekly_warrior' || achId === 'career_starter' || achId === 'ats_expert') {
      newProgress = incrementVal; // set directly for streak or single events
    }

    const isUnlocked = newProgress >= targetAch.maxProgress;
    
    const updatedState = {
      ...state,
      progress: Math.min(targetAch.maxProgress, newProgress),
      unlocked: isUnlocked,
      ...(isUnlocked ? { unlockedAt: new Date().toISOString() } : {})
    };

    const newAchievementsState = {
      ...achievementsState,
      [achId]: updatedState
    };

    await updateDoc(userRef, { achievementsState: newAchievementsState });

    if (isUnlocked) {
      // Trigger canvas confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Grant rewards
      const wallet = data.creditWallet as CreditWallet;
      const updatedWallet = {
        ...wallet,
        balance: wallet.balance + targetAch.credits,
        totalEarned: wallet.totalEarned + targetAch.credits,
        xp: wallet.xp + targetAch.xp,
        unlockedBadges: [...(wallet.unlockedBadges || []), targetAch.badge]
      };

      await updateDoc(userRef, { creditWallet: updatedWallet });
      
      // Log transaction
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        amount: targetAch.credits,
        type: 'achievement',
        label: `Unlocked Achievement: ${targetAch.title}`,
        timestamp: new Date().toISOString()
      });

      triggerNotification(`Achievement Unlocked!`, `Unlocked "${targetAch.title}". Earned +${targetAch.credits} credits and +${targetAch.xp} XP!`, 'achievement', targetAch.credits);
      
      // Check for Career Legend
      if (achId !== 'career_legend') {
        const unlockedCount = Object.values(newAchievementsState).filter((a: any) => a.unlocked && a.id !== 'career_legend').length;
        if (unlockedCount >= 9) {
          await updateAchievementProgress('career_legend', 1);
        }
      }
    }
  };

  // Update Daily & Weekly Missions Progress Helper
  const updateMissionProgress = async (missionId: string, incrementVal: number, isWeekly: boolean = false) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const missionsState = data.missionsState || {};
    const state = missionsState[missionId] || { progress: 0, completed: false };

    if (state.completed) return; // already done

    const targetMis = isWeekly 
      ? staticWeeklyChallenges.find((m) => m.id === missionId)
      : staticDailyMissions.find((m) => m.id === missionId);
    if (!targetMis) return;

    const newProgress = (state.progress || 0) + incrementVal;
    const isCompleted = newProgress >= targetMis.maxProgress;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)).toString();

    const updatedState = {
      progress: Math.min(targetMis.maxProgress, newProgress),
      completed: isCompleted,
      date: todayStr,
      weekId: currentWeek
    };

    await updateDoc(userRef, {
      [`missionsState.${missionId}`]: updatedState
    });

    if (isCompleted) {
      // Reward credits
      const wallet = data.creditWallet as CreditWallet;
      const updatedWallet = {
        ...wallet,
        balance: wallet.balance + targetMis.rewardCredits,
        totalEarned: wallet.totalEarned + targetMis.rewardCredits,
        xp: wallet.xp + (isWeekly ? 40 : 15) // bonus XP
      };

      await updateDoc(userRef, { creditWallet: updatedWallet });

      // Add transaction record
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        amount: targetMis.rewardCredits,
        type: 'achievement',
        label: `Completed Challenge: ${targetMis.title}`,
        timestamp: new Date().toISOString()
      });

      triggerNotification(
        isWeekly ? `Weekly Challenge Complete!` : `Daily Mission Complete!`,
        `Completed "${targetMis.title}". Claimed +${targetMis.rewardCredits} Credits!`,
        'mission',
        targetMis.rewardCredits
      );
    }
  };

  // Unified trigger handler to track stats, achievements, missions, streaks
  const triggerAction = async (actionType: 'run_analysis' | 'practice_interview' | 'track_job' | 'apply_job' | 'complete_lesson' | 'profile_complete' | 'ats_90_plus') => {
    if (!user) return;

    // Map actions to accomplishments
    switch (actionType) {
      case 'profile_complete':
        await updateAchievementProgress('career_starter', 1);
        break;
      case 'run_analysis':
        await updateAchievementProgress('resume_master', 1);
        await updateMissionProgress('daily_analyze', 1, false);
        await updateMissionProgress('weekly_analyze_5', 1, true);
        await updateAchievementProgress('ai_explorer', 1); // tracks variety of tool usage

        // Fulfill referral reward condition upon first completed scan
        if (creditWallet && creditWallet.referredBy && !creditWallet.hasCompletedAnalysis) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 'creditWallet.hasCompletedAnalysis': true });

            // Reward current user with welcome referral credits
            await earnCredits(100, `Referral Welcome Bonus (First Scan Complete)`, 'referral');

            // Find referrer by referral code
            const refQuery = query(collection(db, 'users'), where('creditWallet.referralCode', '==', creditWallet.referredBy));
            const refSnap = await getDocs(refQuery);
            if (!refSnap.empty) {
              const referrerDoc = refSnap.docs[0];
              const referrerUid = referrerDoc.id;
              const referrerData = referrerDoc.data();
              const rWallet = referrerData.creditWallet;

              if (rWallet) {
                await updateDoc(doc(db, 'users', referrerUid), {
                  'creditWallet.balance': (rWallet.balance || 0) + 100,
                  'creditWallet.totalEarned': (rWallet.totalEarned || 0) + 100
                });
                await addDoc(collection(db, 'users', referrerUid, 'transactions'), {
                  amount: 100,
                  type: 'referral',
                  label: `Referral Reward: ${user.email || 'Candidate'} completed first scan`,
                  timestamp: new Date().toISOString()
                });

                // Update referral record in referrer's subcollection
                await setDoc(doc(db, 'users', referrerUid, 'referrals', user.uid), {
                  id: user.uid,
                  referredUid: user.uid,
                  referredEmail: user.email || 'Candidate',
                  referredName: user.displayName || user.email?.split('@')[0] || 'Peer Candidate',
                  referralCode: creditWallet.referredBy,
                  status: 'completed',
                  conditionMet: true,
                  rewardCredits: 100,
                  rewardClaimed: true,
                  createdAt: new Date().toISOString(),
                  completedAt: new Date().toISOString(),
                  notes: 'Completed first ATS Resume Scan'
                }, { merge: true });
              }
            }
          } catch (e) {
            console.warn("Auto-fulfill referral condition warning:", e);
          }
        }
        break;
      case 'practice_interview':
        await updateAchievementProgress('interview_champion', 1);
        await updateMissionProgress('daily_interview', 1, false);
        await updateMissionProgress('weekly_interview_3', 1, true);
        await updateAchievementProgress('ai_explorer', 1);
        break;
      case 'track_job':
        await updateAchievementProgress('job_hunter', 1);
        await updateMissionProgress('daily_track', 1, false);
        break;
      case 'apply_job':
        await updateAchievementProgress('offer_chaser', 1);
        await updateMissionProgress('daily_apply', 1, false);
        await updateMissionProgress('weekly_apply_10', 1, true);
        break;
      case 'complete_lesson':
        await updateMissionProgress('daily_lesson', 1, false);
        break;
      case 'ats_90_plus':
        await updateAchievementProgress('ats_expert', 1);
        break;
    }
  };

  // Buy credits topup simulation
  const buyCredits = async (creditsAmount: number, price: number, promoCode?: string) => {
    if (!user || !creditWallet) return;

    let finalPrice = price;
    let desc = `Purchased ${creditsAmount} Credits package`;
    
    if (promoCode) {
      const pCheck = applyPromoCode(promoCode);
      if (pCheck.valid) {
        finalPrice = Math.round(price * (1 - pCheck.discountPercent / 100));
        desc += ` using promo code "${promoCode}" (${pCheck.discountPercent}% OFF)`;
      }
    }

    const userRef = doc(db, 'users', user.uid);
    const updatedWallet: CreditWallet = {
      ...creditWallet,
      topupCredits: (creditWallet.topupCredits ?? 0) + creditsAmount,
      balance: creditWallet.balance + creditsAmount,
      totalEarned: creditWallet.totalEarned + creditsAmount
    };

    await updateDoc(userRef, { creditWallet: updatedWallet });
    setCreditWallet(updatedWallet);

    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      amount: creditsAmount,
      type: 'purchase',
      label: `${desc} - Paid ₹${finalPrice}`,
      timestamp: new Date().toISOString()
    });

    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.5 }
    });

    triggerNotification('Purchase Successful!', `Loaded +${creditsAmount} Credits to your Wallet.`, 'referral', creditsAmount);
  };

  const applyPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'HIREFLOW50') {
      return { valid: true, discountPercent: 50, description: '50% VIP discount applied' };
    }
    if (cleanCode === 'LAUNCH20') {
      return { valid: true, discountPercent: 20, description: '20% welcome discount applied' };
    }
    if (cleanCode === 'NEXTGEN30') {
      return { valid: true, discountPercent: 30, description: '30% summer launch deal' };
    }
    return { valid: false, discountPercent: 0, description: 'Invalid promo code' };
  };

  // Referral system tracking & claiming with strict fraud protection & condition enforcement
  const claimReferralReward = async (identifierOrEmail: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !creditWallet) {
      return { success: false, message: 'You must be logged in to redeem referrals.' };
    }
    if (creditWallet.banReferrals) {
      triggerNotification('Access Denied', 'Your referral program privileges have been suspended.', 'info');
      return { success: false, message: 'Your referral program privileges have been suspended.' };
    }

    const cleanInput = identifierOrEmail.trim();
    if (!cleanInput) {
      return { success: false, message: 'Please enter a valid referral code or email.' };
    }

    // Anti-abuse: Self referral check
    const isSelfEmail = user.email && user.email.toLowerCase() === cleanInput.toLowerCase();
    const isSelfCode = creditWallet.referralCode && creditWallet.referralCode.toUpperCase() === cleanInput.toUpperCase();
    if (isSelfEmail || isSelfCode) {
      triggerNotification('Self Referral Blocked', 'You cannot refer yourself. Anti-abuse systems triggered.', 'info');
      return { success: false, message: 'You cannot refer yourself.' };
    }

    // Anti-abuse: Prevent duplicate claim of already completed referral
    const existingRef = referrals.find(
      r => r.referredEmail?.toLowerCase() === cleanInput.toLowerCase() ||
           r.referralCode?.toUpperCase() === cleanInput.toUpperCase() ||
           r.id === cleanInput
    );
    if (existingRef && existingRef.status === 'completed') {
      triggerNotification('Duplicate Claim', 'This referral has already been completed and rewarded.', 'info');
      return { success: false, message: 'This referral has already been completed and rewarded.' };
    }

    // Lookup candidate / target by code or email
    const usersRef = collection(db, 'users');
    let targetDocSnap: any = null;
    let isCodeInput = false;

    // First try by code
    const codeQuery = query(usersRef, where('creditWallet.referralCode', '==', cleanInput.toUpperCase()));
    const codeSnap = await getDocs(codeQuery);

    if (!codeSnap.empty) {
      targetDocSnap = codeSnap.docs[0];
      isCodeInput = true;
    } else {
      // Try by email
      const emailQuery = query(usersRef, where('email', '==', cleanInput.toLowerCase()));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        targetDocSnap = emailSnap.docs[0];
      }
    }

    // CASE 1: Current user is entering their referrer's code/email ("I was referred by X")
    if (isCodeInput || (targetDocSnap && !creditWallet.referredBy)) {
      const referrerDoc = targetDocSnap;
      const referrerUid = referrerDoc.id;
      const referrerData = referrerDoc.data();
      const referrerCode = referrerData.creditWallet?.referralCode || cleanInput.toUpperCase();

      if (referrerUid === user.uid) {
        triggerNotification('Self Referral Blocked', 'You cannot refer yourself.', 'info');
        return { success: false, message: 'You cannot refer yourself.' };
      }

      if (creditWallet.referredBy) {
        triggerNotification('Already Referred', `You have already redeemed a referral (${creditWallet.referredBy}).`, 'info');
        return { success: false, message: `You have already redeemed a referral (${creditWallet.referredBy}).` };
      }

      // Check condition: Has the current user completed their first ATS resume scan?
      const resumesSnap = await getDocs(collection(db, 'users', user.uid, 'resumes'));
      const hasCompletedScan = !resumesSnap.empty || creditWallet.hasCompletedAnalysis;

      const userRef = doc(db, 'users', user.uid);
      const referrerUserRef = doc(db, 'users', referrerUid);

      if (hasCompletedScan) {
        // Condition MET!
        await earnCredits(100, `Referral Welcome Bonus (Referred by ${referrerData.email || referrerCode})`, 'referral');

        const rWallet = referrerData.creditWallet;
        if (rWallet) {
          await updateDoc(referrerUserRef, {
            'creditWallet.balance': (rWallet.balance || 0) + 100,
            'creditWallet.totalEarned': (rWallet.totalEarned || 0) + 100
          });
          await addDoc(collection(db, 'users', referrerUid, 'transactions'), {
            amount: 100,
            type: 'referral',
            label: `Referral Reward: ${user.email || 'Candidate'} completed first ATS scan`,
            timestamp: new Date().toISOString()
          });
        }

        await updateDoc(userRef, {
          'creditWallet.referredBy': referrerCode,
          'creditWallet.hasCompletedAnalysis': true
        });

        await setDoc(doc(db, 'users', referrerUid, 'referrals', user.uid), {
          id: user.uid,
          referredUid: user.uid,
          referredEmail: user.email || 'Candidate',
          referredName: user.displayName || user.email?.split('@')[0] || 'Peer Candidate',
          referralCode: referrerCode,
          status: 'completed',
          conditionMet: true,
          rewardCredits: 100,
          rewardClaimed: true,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          notes: 'Completed first ATS Resume Scan'
        });

        await setDoc(doc(db, 'users', user.uid, 'referrals', `ref_from_${referrerUid}`), {
          id: `ref_from_${referrerUid}`,
          referrerUid: referrerUid,
          referredEmail: referrerData.email || 'Referrer',
          referralCode: referrerCode,
          status: 'completed',
          conditionMet: true,
          rewardCredits: 100,
          rewardClaimed: true,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          notes: 'Welcome referral bonus credited'
        });

        triggerNotification('Referral Unlocked!', `Success! Both you and your referrer received +100 credits!`, 'referral', 100);
        return { success: true, message: 'Referral verified! +100 Credits added to your wallet.' };
      } else {
        // Condition NOT YET MET! Mark pending
        await updateDoc(userRef, {
          'creditWallet.referredBy': referrerCode
        });

        await setDoc(doc(db, 'users', referrerUid, 'referrals', user.uid), {
          id: user.uid,
          referredUid: user.uid,
          referredEmail: user.email || 'Candidate',
          referredName: user.displayName || user.email?.split('@')[0] || 'Peer Candidate',
          referralCode: referrerCode,
          status: 'pending',
          conditionMet: false,
          rewardCredits: 100,
          rewardClaimed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          notes: 'Awaiting first ATS Resume Scan'
        });

        await setDoc(doc(db, 'users', user.uid, 'referrals', `ref_from_${referrerUid}`), {
          id: `ref_from_${referrerUid}`,
          referrerUid: referrerUid,
          referredEmail: referrerData.email || 'Referrer',
          referralCode: referrerCode,
          status: 'pending',
          conditionMet: false,
          rewardCredits: 100,
          rewardClaimed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          notes: 'Complete your first ATS resume scan to unlock +100 credits'
        });

        triggerNotification('Referral Linked!', 'Referral code registered! Complete your first ATS resume scan to unlock +100 credits.', 'info');
        return { success: true, message: 'Referral code linked! Complete your first ATS resume scan to unlock +100 credits for both of you.' };
      }
    }

    // CASE 2: Current user is entering friend's email to record or verify
    const friendEmail = cleanInput.toLowerCase();

    if (targetDocSnap) {
      const friendUid = targetDocSnap.id;
      const friendData = targetDocSnap.data();

      if (friendData.creditWallet?.referredBy && friendData.creditWallet.referredBy !== creditWallet.referralCode) {
        triggerNotification('Already Referred', `${friendEmail} was already referred by another invite code.`, 'info');
        return { success: false, message: `${friendEmail} was already referred by another invite code.` };
      }

      const friendResumesSnap = await getDocs(collection(db, 'users', friendUid, 'resumes'));
      const friendHasScanned = !friendResumesSnap.empty || friendData.creditWallet?.hasCompletedAnalysis;

      if (friendHasScanned) {
        await earnCredits(100, `Referral Reward: ${friendEmail}`, 'referral');

        const fWallet = friendData.creditWallet;
        if (fWallet && (!fWallet.referredBy || fWallet.referredBy === creditWallet.referralCode)) {
          await updateDoc(doc(db, 'users', friendUid), {
            'creditWallet.balance': (fWallet.balance || 0) + 100,
            'creditWallet.totalEarned': (fWallet.totalEarned || 0) + 100,
            'creditWallet.referredBy': creditWallet.referralCode,
            'creditWallet.hasCompletedAnalysis': true
          });
          await addDoc(collection(db, 'users', friendUid, 'transactions'), {
            amount: 100,
            type: 'referral',
            label: `Referred by ${user.displayName || user.email}`,
            timestamp: new Date().toISOString()
          });
        }

        await setDoc(doc(db, 'users', user.uid, 'referrals', friendUid), {
          id: friendUid,
          referredUid: friendUid,
          referredEmail: friendEmail,
          referredName: friendData.displayName || friendEmail.split('@')[0],
          referralCode: creditWallet.referralCode,
          status: 'completed',
          conditionMet: true,
          rewardCredits: 100,
          rewardClaimed: true,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          notes: 'First ATS scan verified'
        });

        triggerNotification('Referral Verified!', `Success! ${friendEmail} completed their first scan. +100 credits awarded!`, 'referral', 100);
        return { success: true, message: `Referral verified! +100 credits added to your wallet.` };
      } else {
        await setDoc(doc(db, 'users', user.uid, 'referrals', friendUid), {
          id: friendUid,
          referredUid: friendUid,
          referredEmail: friendEmail,
          referredName: friendData.displayName || friendEmail.split('@')[0],
          referralCode: creditWallet.referralCode,
          status: 'pending',
          conditionMet: false,
          rewardCredits: 100,
          rewardClaimed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          notes: 'Awaiting friend to complete their first ATS resume scan'
        });

        triggerNotification('Referral Logged!', `Referral recorded! +100 credits will unlock as soon as ${friendEmail} completes their first scan.`, 'info');
        return { success: true, message: `Referral recorded! Awaiting ${friendEmail} to complete their first ATS scan.` };
      }
    } else {
      // Friend not registered yet
      const inviteId = `invite_${friendEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await setDoc(doc(db, 'users', user.uid, 'referrals', inviteId), {
        id: inviteId,
        referredEmail: friendEmail,
        referredName: friendEmail.split('@')[0],
        referralCode: creditWallet.referralCode,
        status: 'pending',
        conditionMet: false,
        rewardCredits: 100,
        rewardClaimed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        notes: 'Invite sent - pending registration & first ATS scan'
      });

      triggerNotification('Invite Recorded!', `Invite logged for ${friendEmail}! Share your referral link with them.`, 'info');
      return { success: true, message: `Invite logged! Once ${friendEmail} registers and scans their resume, you'll both receive +100 credits.` };
    }
  };

  // Re-check pending referrals condition
  const refreshReferralStatus = async () => {
    if (!user || !creditWallet) return;
    const pending = referrals.filter(r => r.status === 'pending');
    if (pending.length === 0) return;

    let unlockedCount = 0;
    for (const item of pending) {
      try {
        let friendDoc: any = null;
        if (item.referredUid) {
          const snap = await getDoc(doc(db, 'users', item.referredUid));
          if (snap.exists()) friendDoc = snap;
        } else if (item.referredEmail) {
          const q = query(collection(db, 'users'), where('email', '==', item.referredEmail.toLowerCase()));
          const snap = await getDocs(q);
          if (!snap.empty) friendDoc = snap.docs[0];
        }

        if (friendDoc) {
          const friendUid = friendDoc.id;
          const friendData = friendDoc.data();
          const friendResumesSnap = await getDocs(collection(db, 'users', friendUid, 'resumes'));
          const friendHasScanned = !friendResumesSnap.empty || friendData.creditWallet?.hasCompletedAnalysis;

          if (friendHasScanned && !item.rewardClaimed) {
            unlockedCount++;
            await earnCredits(100, `Referral Reward: ${item.referredEmail}`, 'referral');

            const fWallet = friendData.creditWallet;
            if (fWallet && (!fWallet.referredBy || fWallet.referredBy === creditWallet.referralCode)) {
              await updateDoc(doc(db, 'users', friendUid), {
                'creditWallet.balance': (fWallet.balance || 0) + 100,
                'creditWallet.totalEarned': (fWallet.totalEarned || 0) + 100,
                'creditWallet.referredBy': creditWallet.referralCode,
                'creditWallet.hasCompletedAnalysis': true
              });
              await addDoc(collection(db, 'users', friendUid, 'transactions'), {
                amount: 100,
                type: 'referral',
                label: `Referred by ${user.displayName || user.email}`,
                timestamp: new Date().toISOString()
              });
            }

            await updateDoc(doc(db, 'users', user.uid, 'referrals', item.id), {
              status: 'completed',
              conditionMet: true,
              rewardClaimed: true,
              completedAt: new Date().toISOString(),
              referredUid: friendUid,
              notes: 'First ATS scan verified'
            });
          }
        }
      } catch (err) {
        console.warn("Refresh referral check warning:", err);
      }
    }

    if (unlockedCount > 0) {
      triggerNotification('Referrals Updated!', `+${unlockedCount * 100} Credits unlocked from completed referrals!`, 'referral', unlockedCount * 100);
    }
  };

  // Administrative actions
  const adminUpdateCosts = async (newCosts: Partial<CreditCosts>) => {
    const costDocRef = doc(db, 'config', 'creditCosts');
    const updated = { ...creditCosts, ...newCosts };
    await setDoc(costDocRef, updated);
    setCreditCosts(updated);
    triggerNotification('Config Updated', 'Successfully modified features credit billing costs.', 'info');
  };

  const adminRewardCredits = async (targetUid: string, amount: number, label: string) => {
    const userRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const wallet = data.creditWallet as CreditWallet;
    if (!wallet) return;

    const updatedWallet = {
      ...wallet,
      balance: wallet.balance + amount,
      totalEarned: wallet.totalEarned + amount
    };

    await updateDoc(userRef, { creditWallet: updatedWallet });

    await addDoc(collection(db, 'users', targetUid, 'transactions'), {
      amount,
      type: 'grant',
      label: `Admin Reward: ${label}`,
      timestamp: new Date().toISOString()
    });
  };

  const adminDeductCredits = async (targetUid: string, amount: number, label: string) => {
    const userRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const wallet = data.creditWallet as CreditWallet;
    if (!wallet) return;

    const updatedWallet = {
      ...wallet,
      balance: Math.max(0, wallet.balance - amount)
    };

    await updateDoc(userRef, { creditWallet: updatedWallet });

    await addDoc(collection(db, 'users', targetUid, 'transactions'), {
      amount: -amount,
      type: 'spend',
      label: `Admin Deduction: ${label}`,
      timestamp: new Date().toISOString()
    });
  };

  const adminIssueRefund = async (targetUid: string, transactionId: string, amount: number, label: string) => {
    await adminRewardCredits(targetUid, amount, `Refund for: ${label}`);
  };

  const adminSetReferralBan = async (targetUid: string, isBanned: boolean) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { 'creditWallet.banReferrals': isBanned });
  };

  const adminFetchAllUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      list.push({ uid: doc.id, ...doc.data() });
    });
    return list;
  };

  const adminGetAnalytics = async () => {
    const users = await adminFetchAllUsers();
    let totalSpent = 0;
    let totalEarned = 0;
    let premiumCount = 0;
    let proCount = 0;
    let freeCount = 0;
    let referralConversions = 0;

    users.forEach((u) => {
      if (u.plan === 'premium') premiumCount++;
      else if (u.plan === 'pro' || u.plan === 'standard') proCount++;
      else freeCount++;

      if (u.creditWallet) {
        totalEarned += u.creditWallet.totalEarned || 0;
        totalSpent += u.creditWallet.usedThisMonth || 0;
      }
    });

    return {
      totalUsers: users.length,
      creditsEarned: totalEarned,
      creditsSpent: totalSpent,
      premiumUsers: premiumCount,
      proUsers: proCount,
      standardUsers: proCount,
      freeUsers: freeCount,
      estimatedRevenue: premiumCount * 249 + proCount * 149
    };
  };

  // Record feature usage for subscriptions
  const recordUsage = async (feature: FeatureLimitKey | string) => {
    if (!user) return;
    const userPlanNormalized = normalizePlanTier(plan);
    if (userPlanNormalized === 'admin') return;

    const userRef = doc(db, 'users', user.uid);
    const now = new Date();
    const dayStr = getDayString(now);
    const weekStr = getISOWeekString(now);
    const monthStr = getMonthString(now);

    const isJobSearch = feature === 'jobSearches' || feature === 'jobSearch';
    const isAts = feature === 'atsAnalyses' || feature === 'atsAnalysis' || feature === 'resumeScans' || feature === 'resumeScan';
    const isInterview = feature === 'interviewLabs' || feature === 'interviewLab' || feature === 'interviewSessions' || feature === 'interviewSession';
    const isJobTrack = feature === 'jobsTracked' || feature === 'jobTracker';
    const isResumeEdit = feature === 'resumeEdits' || feature === 'resumeEditor' || feature === 'resumeEdit';
    const isCoach = feature === 'careerAdvisor' || feature === 'careerCoachChat' || feature === 'careerCoach';

    const current = subscriptionUsage || {
      dailyDate: dayStr,
      jobSearchesDaily: 0,
      careerAdvisorDaily: 0,
      weekId: weekStr,
      atsAnalysesWeekly: 0,
      interviewLabsWeekly: 0,
      monthId: monthStr,
      atsAnalysesMonthly: 0,
      interviewLabsMonthly: 0,
      jobsTrackedMonthly: 0,
      resumeEditsMonthly: 0,
    };

    const updatedUsage: SubscriptionUsage = {
      dailyDate: dayStr,
      jobSearchesDaily: (current.dailyDate === dayStr ? current.jobSearchesDaily : 0) + (isJobSearch ? 1 : 0),
      careerAdvisorDaily: (current.dailyDate === dayStr ? current.careerAdvisorDaily : 0) + (isCoach ? 1 : 0),

      weekId: weekStr,
      atsAnalysesWeekly: (current.weekId === weekStr ? current.atsAnalysesWeekly : 0) + (isAts ? 1 : 0),
      interviewLabsWeekly: (current.weekId === weekStr ? current.interviewLabsWeekly : 0) + (isInterview ? 1 : 0),

      monthId: monthStr,
      atsAnalysesMonthly: (current.monthId === monthStr ? current.atsAnalysesMonthly : 0) + (isAts ? 1 : 0),
      interviewLabsMonthly: (current.monthId === monthStr ? current.interviewLabsMonthly : 0) + (isInterview ? 1 : 0),
      jobsTrackedMonthly: (current.monthId === monthStr ? current.jobsTrackedMonthly : 0) + (isJobTrack ? 1 : 0),
      resumeEditsMonthly: (current.monthId === monthStr ? current.resumeEditsMonthly : 0) + (isResumeEdit ? 1 : 0),
    };

    setSubscriptionUsage(updatedUsage);
    await updateDoc(userRef, { subscriptionUsage: updatedUsage }).catch(() => {});
  };

  // Upgrade Plan handler
  const upgradePlan = async (newPlan: 'pro' | 'premium') => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const normalized = normalizePlanTier(newPlan);
    const planDef = getPlanDefinition(normalized);
    const newSubCredits = planDef.dailyCredits;
    const now = new Date();
    
    const existingTopup = creditWallet?.topupCredits ?? 0;
    const updatedWallet: CreditWallet = {
      ...(creditWallet || {
        usedThisMonth: 0,
        usedToday: 0,
        totalEarned: 0,
        expiringSoon: 0,
        streak: 1,
        lastLoginDate: getDayString(now),
        xp: 100,
        level: 1,
        referralCode: 'HF-' + user.uid.slice(0, 5).toUpperCase(),
        referredBy: null,
        hasUploadedResume: false,
        hasCompletedAnalysis: false,
        banReferrals: false,
        unlockedBadges: []
      }),
      subscriptionCredits: newSubCredits,
      topupCredits: existingTopup,
      balance: newSubCredits + existingTopup,
      lastDailyGrant: getDayString(now),
      lastDailyRefresh: now.toISOString(),
      lastMonthlyGrant: now.toISOString()
    };

    const resetUsage: SubscriptionUsage = {
      dailyDate: subscriptionUsage?.dailyDate || getDayString(now),
      jobSearchesDaily: subscriptionUsage?.jobSearchesDaily || 0,
      careerAdvisorDaily: subscriptionUsage?.careerAdvisorDaily || 0,
      weekId: subscriptionUsage?.weekId || getISOWeekString(now),
      atsAnalysesWeekly: 0,
      interviewLabsWeekly: 0,
      monthId: getMonthString(now),
      atsAnalysesMonthly: 0,
      interviewLabsMonthly: 0,
      jobsTrackedMonthly: 0,
      resumeEditsMonthly: 0
    };

    await setDoc(userRef, {
      plan: normalized,
      creditWallet: updatedWallet,
      subscriptionUsage: resetUsage,
      subscriptionStartDate: now.toISOString()
    }, { merge: true });

    setCreditWallet(updatedWallet);
    setSubscriptionUsage(resetUsage);

    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      amount: newSubCredits,
      type: 'purchase',
      label: `Upgraded to ${planDef.name} Subscription Plan`,
      timestamp: now.toISOString()
    });

    triggerNotification(
      'Subscription Activated!',
      `You are now on the ${planDef.name} plan (${planDef.priceFormatted.INR}/month). ${newSubCredits.toLocaleString()} AI Credits allocated!`,
      'info'
    );
  };

  const downgradePlan = async (newPlan: 'free' | 'pro') => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const normalized = normalizePlanTier(newPlan);
    await updateDoc(userRef, {
      plan: normalized
    });
    triggerNotification('Plan Updated', `Your plan is now set to ${getPlanDefinition(normalized).name}.`, 'info');
  };

  // Check feature limit & credit access
  const checkAccess = (feature: keyof CreditCosts | string, currentCount?: number) => {
    const userPlanNormalized = normalizePlanTier(plan);
    if (userPlanNormalized === 'admin') {
      return { 
        hasAccess: true, 
        remaining: 'Unlimited', 
        limit: 'Unlimited',
        period: 'unlimited' as const,
        displayLimit: 'Unlimited',
        hasCredits: true,
        creditsNeeded: 0
      };
    }

    const planDef = getPlanDefinition(userPlanNormalized);
    const usage = subscriptionUsage || {
      dailyDate: getDayString(),
      jobSearchesDaily: 0,
      careerAdvisorDaily: 0,
      weekId: getISOWeekString(),
      atsAnalysesWeekly: 0,
      interviewLabsWeekly: 0,
      monthId: getMonthString(),
      atsAnalysesMonthly: 0,
      interviewLabsMonthly: 0,
      jobsTrackedMonthly: 0,
      resumeEditsMonthly: 0,
    };

    // 1. Job Searches: Free: 10/day, Pro: 30/day, Premium: Unlimited*
    if (feature === 'jobSearches' || feature === 'jobSearch') {
      const lim = planDef.limits.jobSearches;
      if (lim.period === 'unlimited') {
        return { hasAccess: true, remaining: 'Unlimited', limit: 'Unlimited', period: 'unlimited' as const, displayLimit: lim.display };
      }
      const used = usage.dailyDate === getDayString() ? usage.jobSearchesDaily : 0;
      const remaining = Math.max(0, lim.limit - used);
      return {
        hasAccess: remaining > 0,
        remaining,
        limit: lim.limit,
        period: 'day' as const,
        displayLimit: lim.display,
        reason: remaining <= 0 ? `Daily search limit reached (${lim.limit}/day on ${planDef.name}). Upgrade for more searches.` : undefined
      };
    }

    // 2. ATS Analyses: Free: 5/week, Pro: 20/month, Premium: 50/month
    if (feature === 'resumeScans' || feature === 'resumeScan' || feature === 'atsAnalyses' || feature === 'atsAnalysis') {
      const lim = planDef.limits.atsAnalyses;
      const isWeekly = lim.period === 'week';
      const used = isWeekly
        ? (usage.weekId === getISOWeekString() ? usage.atsAnalysesWeekly : 0)
        : (usage.monthId === getMonthString() ? usage.atsAnalysesMonthly : 0);
      const remaining = Math.max(0, lim.limit - used);
      const cost = creditCosts.resumeScan || 20;
      const balance = creditWallet?.balance || 0;
      const hasCredits = balance >= cost;
      const hasAllowance = remaining > 0;
      return {
        hasAccess: hasAllowance && hasCredits,
        remaining,
        limit: lim.limit,
        period: lim.period,
        displayLimit: lim.display,
        hasCredits,
        creditsNeeded: cost,
        reason: !hasAllowance 
          ? `${isWeekly ? 'Weekly' : 'Monthly'} ATS Analysis limit reached (${lim.display} on ${planDef.name}). Upgrade for more scans.`
          : (!hasCredits ? `Insufficient AI Credits (${balance} / ${cost} needed). Top up or upgrade.` : undefined)
      };
    }

    // 3. Interview Labs: Free: 3/week, Pro: 15/month, Premium: 30/month
    if (feature === 'interviewSessions' || feature === 'interviewSession' || feature === 'interviewLabs' || feature === 'interviewLab') {
      const lim = planDef.limits.interviewLabs;
      const isWeekly = lim.period === 'week';
      const used = isWeekly
        ? (usage.weekId === getISOWeekString() ? usage.interviewLabsWeekly : 0)
        : (usage.monthId === getMonthString() ? usage.interviewLabsMonthly : 0);
      const remaining = Math.max(0, lim.limit - used);
      const cost = creditCosts.interviewSession || 25;
      const balance = creditWallet?.balance || 0;
      const hasCredits = balance >= cost;
      const hasAllowance = remaining > 0;
      return {
        hasAccess: hasAllowance && hasCredits,
        remaining,
        limit: lim.limit,
        period: lim.period,
        displayLimit: lim.display,
        hasCredits,
        creditsNeeded: cost,
        reason: !hasAllowance
          ? `${isWeekly ? 'Weekly' : 'Monthly'} Interview Lab limit reached (${lim.display} on ${planDef.name}). Upgrade to practice more.`
          : (!hasCredits ? `Insufficient AI Credits (${balance} / ${cost} needed). Top up or upgrade.` : undefined)
      };
    }

    // 4. Job Tracker: Free: 10/month, Pro: 75/month, Premium: Unlimited
    if (feature === 'jobsTracked' || feature === 'jobTracker') {
      const lim = planDef.limits.jobsTracked;
      if (lim.period === 'unlimited') {
        return { hasAccess: true, remaining: 'Unlimited', limit: 'Unlimited', period: 'unlimited' as const, displayLimit: lim.display };
      }
      const used = usage.monthId === getMonthString() ? usage.jobsTrackedMonthly : (currentCount || 0);
      const remaining = Math.max(0, lim.limit - used);
      return {
        hasAccess: remaining > 0,
        remaining,
        limit: lim.limit,
        period: 'month' as const,
        displayLimit: lim.display,
        reason: remaining <= 0 ? `Monthly job tracking limit reached (${lim.display} on ${planDef.name}). Upgrade for more job tracking.` : undefined
      };
    }

    // 5. Resume Edits: Free: 2/month, Pro: 10/month, Premium: 25/month
    if (feature === 'resumeEdits' || feature === 'resumeEditor' || feature === 'resumeEdit') {
      const lim = planDef.limits.resumeEdits;
      const used = usage.monthId === getMonthString() ? usage.resumeEditsMonthly : 0;
      const remaining = Math.max(0, lim.limit - used);
      return {
        hasAccess: remaining > 0,
        remaining,
        limit: lim.limit,
        period: 'month' as const,
        displayLimit: lim.display,
        reason: remaining <= 0 ? `Monthly resume edit limit reached (${lim.display} on ${planDef.name}). Upgrade to edit more.` : undefined
      };
    }

    // 6. Career Advisor: Free: 5/day, Pro: 30/day, Premium: High usage*
    if (feature === 'careerAdvisor' || feature === 'careerCoachChat' || feature === 'careerCoach') {
      const lim = planDef.limits.careerAdvisor;
      if (lim.period === 'unlimited') {
        return { hasAccess: true, remaining: 'Unlimited', limit: 'Unlimited', period: 'day' as const, displayLimit: lim.display };
      }
      const used = usage.dailyDate === getDayString() ? usage.careerAdvisorDaily : 0;
      const remaining = Math.max(0, lim.limit - used);
      const cost = creditCosts.careerCoachChat || 5;
      const balance = creditWallet?.balance || 0;
      const hasCredits = balance >= cost;
      const hasAllowance = remaining > 0;
      return {
        hasAccess: hasAllowance && hasCredits,
        remaining,
        limit: lim.limit,
        period: 'day' as const,
        displayLimit: lim.display,
        hasCredits,
        creditsNeeded: cost,
        reason: !hasAllowance ? `Daily Career Advisor chat limit reached (${lim.display} on ${planDef.name}). Upgrade for more chats.` : undefined
      };
    }

    // 7. Learning Path: Available for Free users as well (no premium lock or payment requirement)
    if (feature === 'learningPath') {
      return {
        hasAccess: true,
        remaining: 'Unlimited',
        limit: 'Unlimited',
        period: 'unlimited' as const,
        displayLimit: 'Free Access',
        hasCredits: true,
        creditsNeeded: 0
      };
    }

    // Fallback: credits based check
    let key: keyof CreditCosts = 'resumeScan';
    if (feature === 'coverLetters' || feature === 'coverLetter') key = 'coverLetter';
    else if (feature === 'careerRoadmap') key = 'careerRoadmap';
    else if (feature in creditCosts) key = feature as keyof CreditCosts;

    const cost = creditCosts[key] || 0;
    const balance = creditWallet?.balance || 0;
    const hasAccess = balance >= cost;

    return {
      hasAccess,
      remaining: balance,
      limit: cost,
      period: 'action' as const,
      displayLimit: `${cost} credits`,
      hasCredits: hasAccess,
      creditsNeeded: cost
    };
  };

  const deductCredit = async (feature: keyof CreditCosts | string) => {
    // 1. Record feature usage
    await recordUsage(feature);

    // 2. Deduct credit cost if applicable
    let key: keyof CreditCosts | null = null;
    if (feature === 'resumeScans' || feature === 'resumeScan' || feature === 'atsAnalyses' || feature === 'atsAnalysis') {
      key = 'resumeScan';
      await triggerAction('run_analysis');
    } else if (feature === 'interviewSessions' || feature === 'interviewSession' || feature === 'interviewLabs' || feature === 'interviewLab') {
      key = 'interviewSession';
      await triggerAction('practice_interview');
    } else if (feature === 'coverLetters' || feature === 'coverLetter') {
      key = 'coverLetter';
    } else if (feature === 'careerAdvisor' || feature === 'careerCoachChat' || feature === 'careerCoach') {
      key = 'careerCoachChat';
    } else if (feature === 'careerRoadmap') {
      key = 'careerRoadmap';
    } else if (feature in creditCosts) {
      key = feature as keyof CreditCosts;
    }

    if (key) {
      await spendCredits(key, `Triggered Feature: ${feature}`);
    }
  };

  const openUpgradeModal = (feature?: string) => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  // Backward compatible credits object
  const credits: UserCredits = {
    jobSearches: creditWallet?.usedThisMonth || 0,
    resumeScans: creditWallet?.usedThisMonth || 0,
    interviewSessions: creditWallet?.usedThisMonth || 0,
    coverLetters: creditWallet?.usedThisMonth || 0,
    jobsTracked: creditWallet?.usedThisMonth || 0,
  };

  const value = {
    plan,
    creditWallet,
    creditCosts,
    transactions,
    achievements,
    dailyMissions,
    weeklyChallenges,
    notifications,
    isUpgradeModalOpen,
    leaderboard,
    referrals,
    credits,
    subscriptionUsage,
    recordUsage,
    upgradePlan,
    downgradePlan,
    getPlanDefinition,
    checkAccess,
    deductCredit,
    openUpgradeModal,
    closeUpgradeModal,
    spendCredits,
    earnCredits,
    triggerAction,
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
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
      
      {/* Animated Floating Toasts Notification Overlay */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-surface/90 backdrop-blur-xl border border-border p-4 rounded-3xl shadow-2xl flex gap-3 pointer-events-auto items-start"
            >
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent mt-0.5">
                {n.type === 'achievement' && <Award className="w-5 h-5 text-amber-500" />}
                {n.type === 'mission' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {n.type === 'streak' && <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />}
                {n.type === 'referral' && <Sparkles className="w-5 h-5 text-blue-500" />}
                {n.type === 'low-credits' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {n.type === 'info' && <RefreshCw className="w-5 h-5 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  {n.title}
                  {n.creditsAwarded && (
                    <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-mono font-bold">
                      +{n.creditsAwarded} CR
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-ink-dim leading-relaxed font-semibold mt-1">
                  {n.description}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
