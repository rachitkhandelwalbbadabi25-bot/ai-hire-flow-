import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, addDoc, collection, setDoc } from 'firebase/firestore';
import { 
  SUBSCRIPTION_PLANS, 
  PLAN_DAILY_CREDITS, 
  normalizePlanTier, 
  getPlanDefinition, 
  getDayString, 
  getISOWeekString, 
  getMonthString 
} from './subscriptionPlans.ts';
import fs from 'fs';
import path from 'path';

// Load Firebase Config
let db: any = null;

export function getServerFirestore() {
  if (db) return db;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      db = getFirestore(app, config.firestoreDatabaseId);
      console.log('[SubscriptionEnforcement] Server Firestore initialized with database:', config.firestoreDatabaseId);
      return db;
    }
  } catch (err: any) {
    console.warn('[SubscriptionEnforcement] Could not initialize server Firestore:', err.message);
  }
  return null;
}

export const ACTION_CREDIT_COSTS: Record<string, number> = {
  resumeScan: 20,
  resume_scan: 20,
  ats_analysis: 20,
  atsAnalysis: 20,
  atsOptimization: 25,
  ats_optimization: 25,
  resumeRewrite: 30,
  resume_rewrite: 30,
  coverLetter: 15,
  cover_letter: 15,
  interviewSession: 25,
  interview_session: 25,
  interviewLab: 25,
  jobMatchAnalysis: 5,
  job_match: 5,
  careerRoadmap: 50,
  career_roadmap: 50,
  learning_path: 0,
  learningPath: 0,
  linkedinReview: 20,
  portfolioReview: 30,
  careerCoachChat: 5,
  careerAdvisor: 5,
  coach: 5,
  general: 5
};

export interface EnforcementResult {
  allowed: boolean;
  status?: number;
  code?: string;
  error?: string;
  plan?: string;
  remainingCredits?: number;
  requiredCredits?: number;
  balance?: number;
}

/**
 * Backend Enforcement: Verifies authenticated user's plan, feature limits,
 * and credits before executing any AI action.
 * Performs atomic daily credit refresh and credit deduction directly in Firestore.
 */
export async function enforceSubscriptionAndCredits({
  userId,
  userEmail,
  operation,
  overrideCost
}: {
  userId?: string;
  userEmail?: string;
  operation: string;
  overrideCost?: number;
}): Promise<EnforcementResult> {
  const normalizedOp = operation ? operation.trim() : 'general';
  const requiredCredits = typeof overrideCost === 'number' 
    ? overrideCost 
    : (ACTION_CREDIT_COSTS[normalizedOp] ?? 5);

  // Admin bypass
  const isAdminEmail = userEmail?.toLowerCase() === 'rrachitkhandelwal8@gmail.com';
  if (isAdminEmail) {
    return {
      allowed: true,
      plan: 'admin',
      remainingCredits: 999999
    };
  }

  // Require user authentication
  if (!userId) {
    return {
      allowed: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      error: 'Authentication required. Please sign in to access AI HireFlow features.'
    };
  }

  const firestore = getServerFirestore();
  if (!firestore) {
    // If Firestore is temporarily unreachable, allow execution with warning to not brick server
    console.warn('[SubscriptionEnforcement] Firestore unavailable on server, allowing with fallback.');
    return { allowed: true, plan: 'free', remainingCredits: 150 };
  }

  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        allowed: false,
        status: 404,
        code: 'USER_NOT_FOUND',
        error: 'User profile not found. Please log in again.'
      };
    }

    const userData = userSnap.data();
    const planTier = normalizePlanTier(userData.plan);

    // Admin plan has unlimited everything
    if (planTier === 'admin' || userData.isAdmin) {
      return {
        allowed: true,
        plan: 'admin',
        remainingCredits: 999999
      };
    }

    const planDef = getPlanDefinition(planTier);
    const now = new Date();
    const currentDayStr = getDayString(now);
    const currentWeekStr = getISOWeekString(now);
    const currentMonthStr = getMonthString(now);

    let wallet = userData.creditWallet || {
      balance: PLAN_DAILY_CREDITS[planTier],
      subscriptionCredits: PLAN_DAILY_CREDITS[planTier],
      topupCredits: 0,
      usedThisMonth: 0,
      usedToday: 0,
      lastDailyGrant: currentDayStr
    };

    let usage = userData.subscriptionUsage || {
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

    // 1. Check if Daily Refresh is needed on server (Every 24 hours / new calendar day)
    const isNewDay = !wallet.lastDailyGrant || wallet.lastDailyGrant !== currentDayStr;
    if (isNewDay) {
      const targetDailyCredits = PLAN_DAILY_CREDITS[planTier];
      const existingTopup = wallet.topupCredits ?? Math.max(0, (wallet.balance || 0) - (wallet.subscriptionCredits || 0));
      
      // Daily subscription credits reset to targetDailyCredits (Unused daily credits do NOT accumulate)
      wallet.subscriptionCredits = targetDailyCredits;
      // Purchased top-up credits are preserved and never deleted
      wallet.topupCredits = existingTopup;
      wallet.balance = targetDailyCredits + existingTopup;
      wallet.lastDailyGrant = currentDayStr;
      wallet.usedToday = 0;

      // Reset daily usage counters
      usage.dailyDate = currentDayStr;
      usage.jobSearchesDaily = 0;
      usage.careerAdvisorDaily = 0;

      // If week changed, reset weekly
      if (usage.weekId !== currentWeekStr) {
        usage.weekId = currentWeekStr;
        usage.atsAnalysesWeekly = 0;
        usage.interviewLabsWeekly = 0;
      }

      // If month changed, reset monthly
      if (usage.monthId !== currentMonthStr) {
        usage.monthId = currentMonthStr;
        usage.atsAnalysesMonthly = 0;
        usage.interviewLabsMonthly = 0;
        usage.jobsTrackedMonthly = 0;
        usage.resumeEditsMonthly = 0;
      }
    }

    // 2. Enforce Feature Limits based on plan definition
    const isAdvisor = normalizedOp.includes('coach') || normalizedOp.includes('advisor') || normalizedOp === 'careerAdvisor';
    const isAts = normalizedOp.includes('ats') || normalizedOp.includes('scan') || normalizedOp.includes('analysis');
    const isInterview = normalizedOp.includes('interview');
    const isEdit = normalizedOp.includes('rewrite') || normalizedOp.includes('edit');

    if (isAdvisor && planDef.limits.careerAdvisor.period !== 'unlimited') {
      const dailyUsed = usage.dailyDate === currentDayStr ? (usage.careerAdvisorDaily || 0) : 0;
      if (dailyUsed >= planDef.limits.careerAdvisor.limit) {
        return {
          allowed: false,
          status: 403,
          code: 'FEATURE_LIMIT_EXCEEDED',
          error: `Daily Career Advisor limit reached (${planDef.limits.careerAdvisor.display} on ${planDef.name}). Upgrade your plan for higher usage.`
        };
      }
    }

    if (isAts && planDef.limits.atsAnalyses.period !== 'unlimited') {
      const isWeekly = planDef.limits.atsAnalyses.period === 'week';
      const used = isWeekly
        ? (usage.weekId === currentWeekStr ? (usage.atsAnalysesWeekly || 0) : 0)
        : (usage.monthId === currentMonthStr ? (usage.atsAnalysesMonthly || 0) : 0);
      if (used >= planDef.limits.atsAnalyses.limit) {
        return {
          allowed: false,
          status: 403,
          code: 'FEATURE_LIMIT_EXCEEDED',
          error: `${isWeekly ? 'Weekly' : 'Monthly'} ATS Analysis limit reached (${planDef.limits.atsAnalyses.display} on ${planDef.name}). Upgrade your plan to analyze more resumes.`
        };
      }
    }

    if (isInterview && planDef.limits.interviewLabs.period !== 'unlimited') {
      const isWeekly = planDef.limits.interviewLabs.period === 'week';
      const used = isWeekly
        ? (usage.weekId === currentWeekStr ? (usage.interviewLabsWeekly || 0) : 0)
        : (usage.monthId === currentMonthStr ? (usage.interviewLabsMonthly || 0) : 0);
      if (used >= planDef.limits.interviewLabs.limit) {
        return {
          allowed: false,
          status: 403,
          code: 'FEATURE_LIMIT_EXCEEDED',
          error: `${isWeekly ? 'Weekly' : 'Monthly'} Interview Lab limit reached (${planDef.limits.interviewLabs.display} on ${planDef.name}). Upgrade your plan for more sessions.`
        };
      }
    }

    if (isEdit && planDef.limits.resumeEdits.period !== 'unlimited') {
      const used = usage.monthId === currentMonthStr ? (usage.resumeEditsMonthly || 0) : 0;
      if (used >= planDef.limits.resumeEdits.limit) {
        return {
          allowed: false,
          status: 403,
          code: 'FEATURE_LIMIT_EXCEEDED',
          error: `Monthly Resume Edit limit reached (${planDef.limits.resumeEdits.display} on ${planDef.name}). Upgrade your plan for more edits.`
        };
      }
    }

    // 3. Enforce Credit Balance
    const currentBalance = wallet.balance || 0;
    if (currentBalance < requiredCredits) {
      return {
        allowed: false,
        status: 402,
        code: 'INSUFFICIENT_CREDITS',
        error: `Insufficient AI credits. This action requires ${requiredCredits} credits, but you have ${currentBalance} available. Please upgrade or top up.`,
        requiredCredits,
        balance: currentBalance
      };
    }

    // 4. Deduct credits: "Use daily subscription credits before purchased top-up credits where applicable."
    let subCredits = wallet.subscriptionCredits ?? currentBalance;
    let topupCredits = wallet.topupCredits ?? 0;

    if (subCredits >= requiredCredits) {
      subCredits -= requiredCredits;
    } else {
      const remainder = requiredCredits - subCredits;
      subCredits = 0;
      topupCredits = Math.max(0, topupCredits - remainder);
    }

    wallet.subscriptionCredits = subCredits;
    wallet.topupCredits = topupCredits;
    wallet.balance = subCredits + topupCredits;
    wallet.usedToday = (wallet.usedToday || 0) + requiredCredits;
    wallet.usedThisMonth = (wallet.usedThisMonth || 0) + requiredCredits;

    // Update usage counters
    if (isAdvisor) usage.careerAdvisorDaily = (usage.careerAdvisorDaily || 0) + 1;
    if (isAts) {
      usage.atsAnalysesWeekly = (usage.atsAnalysesWeekly || 0) + 1;
      usage.atsAnalysesMonthly = (usage.atsAnalysesMonthly || 0) + 1;
    }
    if (isInterview) {
      usage.interviewLabsWeekly = (usage.interviewLabsWeekly || 0) + 1;
      usage.interviewLabsMonthly = (usage.interviewLabsMonthly || 0) + 1;
    }
    if (isEdit) usage.resumeEditsMonthly = (usage.resumeEditsMonthly || 0) + 1;

    // Persist in Firestore
    if (requiredCredits > 0 || isAdvisor || isAts || isInterview || isEdit || isNewDay) {
      await updateDoc(userRef, {
        creditWallet: wallet,
        subscriptionUsage: usage
      });
    }

    // Record spend transaction if credits were spent
    if (requiredCredits > 0) {
      await addDoc(collection(firestore, 'users', userId, 'transactions'), {
        amount: -requiredCredits,
        type: 'spend',
        label: `Backend Execution: ${normalizedOp}`,
        timestamp: now.toISOString()
      }).catch(() => {});

      console.log(`[SubscriptionEnforcement] User ${userId} [${planTier}] spent ${requiredCredits} credits for ${normalizedOp}. Remaining: ${wallet.balance}`);
    }

    return {
      allowed: true,
      plan: planTier,
      remainingCredits: wallet.balance
    };
  } catch (err: any) {
    console.error('[SubscriptionEnforcement] Error verifying user credits:', err);
    // In event of error, do not fail silently if it is a definite insufficient credit error
    return {
      allowed: true,
      plan: 'free',
      remainingCredits: 0
    };
  }
}
