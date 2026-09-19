export type PlanTier = 'free' | 'pro' | 'standard' | 'premium' | 'admin';

export type FeatureLimitKey = 
  | 'jobSearches'
  | 'atsAnalyses'
  | 'interviewLabs'
  | 'jobsTracked'
  | 'resumeEdits'
  | 'careerAdvisor';

export interface PlanFeatureLimitItem {
  limit: number; // numeric limit or Infinity (999999)
  period: 'day' | 'week' | 'month' | 'unlimited';
  display: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'premium';
  name: string;
  badge?: string;
  tagline: string;
  price: {
    INR: number;
    USD: number;
  };
  priceFormatted: {
    INR: string;
    USD: string;
  };
  period: string;
  monthlyCredits: number;
  recommended?: boolean;
  limits: {
    jobSearches: PlanFeatureLimitItem;
    atsAnalyses: PlanFeatureLimitItem;
    interviewLabs: PlanFeatureLimitItem;
    jobsTracked: PlanFeatureLimitItem;
    resumeEdits: PlanFeatureLimitItem;
    careerAdvisor: PlanFeatureLimitItem;
  };
  bulletFeatures: string[];
  disclaimer?: string;
}

export const SUBSCRIPTION_PLANS: Record<'free' | 'pro' | 'premium', SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For exploring AI HireFlow',
    price: { INR: 0, USD: 0 },
    priceFormatted: { INR: '₹0', USD: '$0' },
    period: '/month',
    monthlyCredits: 200,
    limits: {
      jobSearches: { limit: 10, period: 'day', display: '10 Job Searches/day' },
      atsAnalyses: { limit: 5, period: 'week', display: '5 ATS Analyses/week' },
      interviewLabs: { limit: 3, period: 'week', display: '3 Interview Labs/week' },
      jobsTracked: { limit: 10, period: 'month', display: '10 new jobs tracked/month' },
      resumeEdits: { limit: 2, period: 'month', display: '2 Resume Edits/month' },
      careerAdvisor: { limit: 5, period: 'day', display: '5 Career Advisor chats/day' }
    },
    bulletFeatures: [
      '200 AI Credits/month',
      '10 Job Searches/day',
      '5 ATS Analyses/week',
      '3 Interview Labs/week',
      '10 new jobs tracked/month',
      '2 Resume Edits/month',
      '5 Career Advisor chats/day',
      'Earn additional credits through daily login, referrals, achievements, onboarding and campaigns',
      'Credit top-ups available'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'RECOMMENDED',
    tagline: 'For students & casual job seekers',
    price: { INR: 149, USD: 2 },
    priceFormatted: { INR: '₹149', USD: '$2' },
    period: '/month',
    monthlyCredits: 500,
    recommended: true,
    limits: {
      jobSearches: { limit: 30, period: 'day', display: '30 Job Searches/day' },
      atsAnalyses: { limit: 20, period: 'month', display: '20 ATS Analyses/month' },
      interviewLabs: { limit: 15, period: 'month', display: '15 Interview Labs/month' },
      jobsTracked: { limit: 75, period: 'month', display: '75 new jobs tracked/month' },
      resumeEdits: { limit: 10, period: 'month', display: '10 Resume Edits/month' },
      careerAdvisor: { limit: 30, period: 'day', display: '30 Career Advisor chats/day' }
    },
    bulletFeatures: [
      '500 AI Credits/month',
      '30 Job Searches/day',
      '20 ATS Analyses/month',
      '15 Interview Labs/month',
      '75 new jobs tracked/month',
      '10 Resume Edits/month',
      '30 Career Advisor chats/day'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'For active job seekers',
    price: { INR: 249, USD: 4 },
    priceFormatted: { INR: '₹249', USD: '$4' },
    period: '/month',
    monthlyCredits: 1500,
    limits: {
      jobSearches: { limit: 999999, period: 'unlimited', display: 'High/Unlimited Job Searches*' },
      atsAnalyses: { limit: 50, period: 'month', display: '50 ATS Analyses/month' },
      interviewLabs: { limit: 30, period: 'month', display: '30 Interview Labs/month' },
      jobsTracked: { limit: 999999, period: 'unlimited', display: 'Unlimited Job Tracker' },
      resumeEdits: { limit: 25, period: 'month', display: '25 Resume Edits/month' },
      careerAdvisor: { limit: 999999, period: 'unlimited', display: 'High Career Advisor usage' }
    },
    bulletFeatures: [
      '1,500 AI Credits/month',
      'High/Unlimited Job Searches*',
      '50 ATS Analyses/month',
      '30 Interview Labs/month',
      'Unlimited Job Tracker',
      '25 Resume Edits/month',
      'High Career Advisor usage'
    ],
    disclaimer: '*Fair-use limits may apply'
  }
};

export const ADMIN_PLAN_LIMITS = {
  monthlyCredits: Infinity,
  limits: {
    jobSearches: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited Job Searches' },
    atsAnalyses: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited ATS Analyses' },
    interviewLabs: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited Interview Labs' },
    jobsTracked: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited Job Tracker' },
    resumeEdits: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited Resume Edits' },
    careerAdvisor: { limit: Infinity, period: 'unlimited' as const, display: 'Unlimited Career Advisor usage' }
  },
  bulletFeatures: [
    'Unlimited AI Credits',
    'Unlimited Job Searches',
    'Unlimited ATS Analyses',
    'Unlimited Interview Labs',
    'Unlimited Job Tracker',
    'Unlimited Resume Edits',
    'Unlimited Career Advisor usage',
    'No subscription limits'
  ]
};

export const PLAN_MONTHLY_CREDITS: Record<'free' | 'pro' | 'standard' | 'premium' | 'admin', number> = {
  free: 200,
  pro: 500,
  standard: 500, // standard alias maps to pro
  premium: 1500,
  admin: 999999
};

export function normalizePlanTier(plan?: string | null): 'free' | 'pro' | 'premium' | 'admin' {
  if (!plan) return 'free';
  const clean = plan.toLowerCase().trim();
  if (clean === 'admin') return 'admin';
  if (clean === 'premium') return 'premium';
  if (clean === 'pro' || clean === 'standard') return 'pro';
  return 'free';
}

export function getPlanDefinition(planTier?: string | null): SubscriptionPlan {
  const norm = normalizePlanTier(planTier);
  if (norm === 'admin') {
    return {
      id: 'free',
      name: 'Admin Master',
      tagline: 'Full administrative access',
      price: { INR: 0, USD: 0 },
      priceFormatted: { INR: '₹0', USD: '$0' },
      period: '/unlimited',
      monthlyCredits: 999999,
      limits: {
        jobSearches: { limit: 999999, period: 'unlimited', display: 'Unlimited' },
        atsAnalyses: { limit: 999999, period: 'unlimited', display: 'Unlimited' },
        interviewLabs: { limit: 999999, period: 'unlimited', display: 'Unlimited' },
        jobsTracked: { limit: 999999, period: 'unlimited', display: 'Unlimited' },
        resumeEdits: { limit: 999999, period: 'unlimited', display: 'Unlimited' },
        careerAdvisor: { limit: 999999, period: 'unlimited', display: 'Unlimited' }
      },
      bulletFeatures: ADMIN_PLAN_LIMITS.bulletFeatures
    };
  }
  return SUBSCRIPTION_PLANS[norm];
}

export function getISOWeekString(d = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getMonthString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getDayString(d = new Date()): string {
  return d.toISOString().split('T')[0];
}
