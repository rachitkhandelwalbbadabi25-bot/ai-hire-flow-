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

// Subscription plans credits
export const PLAN_CREDITS = {
  free: 250,
  standard: 2000,
  premium: 8000
};

// Transaction record
export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'grant' | 'referral' | 'achievement' | 'spend' | 'purchase' | 'refund' | 'bonus';
  label: string;
  timestamp: string;
}

// Full AI Credit Wallet Interface
export interface CreditWallet {
  balance: number;
  usedThisMonth: number;
  totalEarned: number;
  expiringSoon: number;
  lastMonthlyGrant: string;
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
  
  // Backward compatible old props
  credits: UserCredits | null;
  checkAccess: (feature: keyof CreditCosts | string, currentCount?: number) => { hasAccess: boolean; remaining: number | string; limit: number | string };
  deductCredit: (feature: keyof CreditCosts | string) => Promise<void>;
  openUpgradeModal: (feature?: string) => void;
  closeUpgradeModal: () => void;

  // New Credit Economy Actions
  spendCredits: (featureId: keyof CreditCosts, label: string) => Promise<void>;
  earnCredits: (amount: number, label: string, type?: CreditTransaction['type']) => Promise<void>;
  triggerAction: (actionType: 'run_analysis' | 'practice_interview' | 'track_job' | 'apply_job' | 'complete_lesson' | 'profile_complete' | 'ats_90_plus') => Promise<void>;
  buyCredits: (creditsAmount: number, price: number, promoCode?: string) => Promise<void>;
  applyPromoCode: (code: string) => { valid: boolean; discountPercent: number; description: string };
  claimReferralReward: (referredUserEmail: string) => Promise<void>;
  
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
  const [creditCosts, setCreditCosts] = useState<CreditCosts>(DEFAULT_CREDIT_COSTS);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyMissions, setDailyMissions] = useState<Mission[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<Mission[]>([]);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
          
          // Auto-migrate or initialize Credit Wallet
          if (!wallet) {
            const generatedCode = 'HF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const defaultWallet: CreditWallet = {
              balance: PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] || 250,
              usedThisMonth: 0,
              totalEarned: PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] || 250,
              expiringSoon: 0,
              lastMonthlyGrant: new Date().toISOString(),
              streak: 1,
              lastLoginDate: new Date().toISOString().split('T')[0],
              xp: 50, // bonus for registering
              level: 1,
              referralCode: generatedCode,
              referredBy: null,
              hasUploadedResume: false,
              hasCompletedAnalysis: false,
              banReferrals: false,
              unlockedBadges: ['Verified Candidate']
            };
            
            await updateDoc(userRef, { creditWallet: defaultWallet });
            wallet = defaultWallet;
            
            // Log initial grant
            await addDoc(collection(db, 'users', user.uid, 'transactions'), {
              amount: defaultWallet.balance,
              type: 'grant',
              label: `Initial Free Tier Monthly Grant`,
              timestamp: new Date().toISOString()
            });
          } else {
            // Check for login streak or daily reset
            const today = new Date().toISOString().split('T')[0];
            const lastDate = wallet.lastLoginDate;

            if (lastDate !== today) {
              let newStreak = wallet.streak;
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

              if (lastDate === yesterdayStr) {
                newStreak += 1;
              } else {
                newStreak = 1;
              }

              // Streak Reward Scheme:
              // Day 1: 5, Day 2: 5, Day 3: 10, Day 7: 25, Day 15: 50, Day 30: 100
              let rewardCredits = 5;
              if (newStreak === 3) rewardCredits = 10;
              else if (newStreak === 7) rewardCredits = 25;
              else if (newStreak === 15) rewardCredits = 50;
              else if (newStreak === 30) rewardCredits = 100;

              const updatedWallet = {
                ...wallet,
                streak: newStreak,
                lastLoginDate: today,
                balance: wallet.balance + rewardCredits,
                totalEarned: wallet.totalEarned + rewardCredits,
                xp: wallet.xp + 10 // login bonus XP
              };

              await updateDoc(userRef, { creditWallet: updatedWallet });
              wallet = updatedWallet;

              // Log streak reward transaction
              await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                amount: rewardCredits,
                type: 'bonus',
                label: `Day ${newStreak} Login Streak Reward`,
                timestamp: new Date().toISOString()
              });

              triggerNotification(`Daily Streak Day ${newStreak}!`, `You earned +${rewardCredits} Credits and +10 XP for staying consistent.`, 'streak', rewardCredits);
              
              // Trigger streak achievements
              if (newStreak >= 7) {
                await updateAchievementProgress('weekly_warrior', newStreak);
              }
              await updateAchievementProgress('consistency_master', 1); // logins accumulation
            }
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

    return () => {
      unsubUser();
      unsubTransactions();
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
    const cost = creditCosts[featureId] || 0;

    if (creditWallet.balance < cost) {
      triggerNotification('Insufficient AI Credits', `This feature requires ${cost} credits. Please top up.`, 'low-credits');
      setIsUpgradeModalOpen(true);
      throw new Error(`Insufficient credits: Requires ${cost}`);
    }

    const userRef = doc(db, 'users', user.uid);
    const updatedWallet = {
      ...creditWallet,
      balance: creditWallet.balance - cost,
      usedThisMonth: creditWallet.usedThisMonth + cost
    };

    // Update DB
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
      triggerNotification('AI Credits Running Low!', `You only have ${updatedWallet.balance} credits left. Upgrade to stay connected.`, 'low-credits');
    }
  };

  // Earn Credits logic
  const earnCredits = async (amount: number, label: string, type: CreditTransaction['type'] = 'bonus') => {
    if (!user || !creditWallet) return;

    const userRef = doc(db, 'users', user.uid);
    const updatedWallet = {
      ...creditWallet,
      balance: creditWallet.balance + amount,
      totalEarned: creditWallet.totalEarned + amount
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
    const updatedWallet = {
      ...creditWallet,
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

  // Referral system tracking
  const claimReferralReward = async (referredUserEmail: string) => {
    if (!user || !creditWallet) return;
    if (creditWallet.banReferrals) {
      triggerNotification('Access Denied', 'Your referral program privileges have been suspended.', 'info');
      return;
    }

    // Secure Referral Engine validation
    const emailToSearch = referredUserEmail.trim().toLowerCase();
    
    // Self referral check
    if (user.email?.toLowerCase() === emailToSearch) {
      triggerNotification('Referral Failed', 'You cannot refer yourself. Anti-abuse systems triggered.', 'info');
      return;
    }

    // Find if user already referred this person or if they exist in DB
    const querySnapshot = await getDocs(
      query(collection(db, 'users'), where('email', '==', emailToSearch))
    );

    if (querySnapshot.empty) {
      triggerNotification('User Not Found', 'A user with that verified email has not registered yet.', 'info');
      return;
    }

    // Add +100 Credits to inviter
    await earnCredits(100, `Successful Referral of ${emailToSearch}`, 'referral');
    
    // Add +100 Credits to referred user
    const referredUserDoc = querySnapshot.docs[0];
    const referredUserRef = doc(db, 'users', referredUserDoc.id);
    const refData = referredUserDoc.data();
    const refWallet = refData.creditWallet;

    if (refWallet) {
      const updatedRefWallet = {
        ...refWallet,
        balance: (refWallet.balance || 0) + 100,
        totalEarned: (refWallet.totalEarned || 0) + 100
      };
      await updateDoc(referredUserRef, { creditWallet: updatedRefWallet });
      
      await addDoc(collection(db, 'users', referredUserDoc.id, 'transactions'), {
        amount: 100,
        type: 'referral',
        label: `Referred by ${user.displayName || user.email}`,
        timestamp: new Date().toISOString()
      });
    }

    triggerNotification('Referral Unlocked!', `Success! Both you and ${emailToSearch} received +100 credits!`, 'referral', 100);
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
    let standardCount = 0;
    let freeCount = 0;
    let referralConversions = 0;

    users.forEach((u) => {
      if (u.plan === 'premium') premiumCount++;
      else if (u.plan === 'standard') standardCount++;
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
      standardUsers: standardCount,
      freeUsers: freeCount,
      estimatedRevenue: premiumCount * 299 + standardCount * 200
    };
  };

  // Backward-compatible checking methods
  const checkAccess = (feature: keyof CreditCosts | string, currentCount?: number) => {
    if ((plan as string) === 'admin') return { hasAccess: true, remaining: 'Unlimited', limit: 'Unlimited' };
    
    // 1. Resume Editor check
    if (feature === 'resumeEditor') {
      return {
        hasAccess: true,
        remaining: 'Unlimited',
        limit: 'Unlimited'
      };
    }

    // 2. Learning Path check
    if (feature === 'learningPath') {
      const type = plan === 'premium' || (plan as string) === 'admin' ? 'personalized' : plan === 'standard' ? 'full' : 'basic';
      return {
        hasAccess: plan !== 'free',
        remaining: type,
        limit: type
      };
    }

    // 3. Jobs Tracked check
    if (feature === 'jobsTracked') {
      const trackedCount = currentCount || 0;
      const limitVal = plan === 'premium' || (plan as string) === 'admin' ? 99999 : plan === 'standard' ? 25 : 5;
      return {
        hasAccess: trackedCount < limitVal,
        remaining: Math.max(0, limitVal - trackedCount),
        limit: limitVal
      };
    }

    // Check key mapping
    let key: keyof CreditCosts = 'resumeScan';
    if (feature === 'resumeScans' || feature === 'resumeScan') key = 'resumeScan';
    else if (feature === 'interviewSessions' || feature === 'interviewSession') key = 'interviewSession';
    else if (feature === 'coverLetters' || feature === 'coverLetter') key = 'coverLetter';
    else if (feature === 'jobSearches' || feature === 'jobMatchAnalysis') key = 'jobMatchAnalysis';
    else if (feature === 'careerRoadmap') key = 'careerRoadmap';
    else if (feature in creditCosts) key = feature as keyof CreditCosts;

    const cost = creditCosts[key] || 0;
    const balance = creditWallet?.balance || 0;
    const hasAccess = balance >= cost;

    return {
      hasAccess,
      remaining: balance,
      limit: cost
    };
  };

  const deductCredit = async (feature: keyof CreditCosts | string) => {
    let key: keyof CreditCosts = 'resumeScan';
    if (feature === 'resumeScans' || feature === 'resumeScan') key = 'resumeScan';
    else if (feature === 'interviewSessions' || feature === 'interviewSession') key = 'interviewSession';
    else if (feature === 'coverLetters' || feature === 'coverLetter') key = 'coverLetter';
    else if (feature === 'jobSearches' || feature === 'jobMatchAnalysis') key = 'jobMatchAnalysis';
    else if (feature === 'jobsTracked') key = 'jobMatchAnalysis';
    else if (feature === 'careerRoadmap' || feature === 'learningPath') key = 'careerRoadmap';
    else if (feature in creditCosts) key = feature as keyof CreditCosts;

    await spendCredits(key, `Triggered Feature: ${feature}`);
    
    // Map actions for rewards progression
    if (key === 'resumeScan') {
      await triggerAction('run_analysis');
    } else if (key === 'interviewSession') {
      await triggerAction('practice_interview');
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
    credits,
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
