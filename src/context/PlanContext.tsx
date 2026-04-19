import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, getDoc, updateDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, UserPlan } from './AuthContext';

export interface UserCredits {
  jobSearches: number;
  jobSearchesLastReset: any;
  resumeScans: number;
  resumeScansLastReset: any;
  interviewSessions: number;
  interviewSessionsLastReset: any;
  coverLetters: number;
  coverLettersLastReset: any;
  jobsTracked: number;
}

interface FeatureLimits {
  jobSearches: number;
  resumeScans: number;
  interviewSessions: number;
  jobsTracked: number;
  coverLetters: number;
  learningPath: 'basic' | 'full' | 'personalized';
  resumeEditor: boolean;
}

export const PLAN_LIMITS: Record<UserPlan, FeatureLimits> = {
  free: {
    jobSearches: 5,
    resumeScans: 3,
    interviewSessions: 5,
    jobsTracked: 10,
    coverLetters: 2,
    learningPath: 'basic',
    resumeEditor: false
  },
  standard: {
    jobSearches: 20,
    resumeScans: 15,
    interviewSessions: 20,
    jobsTracked: 50,
    coverLetters: 10,
    learningPath: 'full',
    resumeEditor: true
  },
  premium: {
    jobSearches: Infinity,
    resumeScans: Infinity,
    interviewSessions: Infinity,
    jobsTracked: Infinity,
    coverLetters: Infinity,
    learningPath: 'personalized',
    resumeEditor: true
  },
  admin: {
    jobSearches: Infinity,
    resumeScans: Infinity,
    interviewSessions: Infinity,
    jobsTracked: Infinity,
    coverLetters: Infinity,
    learningPath: 'personalized',
    resumeEditor: true
  }
};

type Feature = keyof FeatureLimits;

interface PlanContextType {
  plan: UserPlan;
  credits: UserCredits | null;
  checkAccess: (feature: Feature, currentUsageOverride?: number) => { hasAccess: boolean; remaining: number | string; limit: number | string };
  deductCredit: (feature: Feature) => Promise<void>;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: (feature?: Feature) => void;
  closeUpgradeModal: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, plan } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [triggeredFeature, setTriggeredFeature] = useState<Feature | undefined>();

  useEffect(() => {
    if (!user) {
      setCredits(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCredits(data.credits || null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const checkAccess = (feature: Feature, currentUsageOverride?: number) => {
    const limits = PLAN_LIMITS[plan];
    const limit = limits[feature];

    if (limit === Infinity) return { hasAccess: true, remaining: 'Unlimited', limit: 'Unlimited' };
    if (typeof limit === 'boolean') return { hasAccess: limit, remaining: limit ? 'Unlocked' : 'Locked', limit: limit ? 'Unlocked' : 'Locked' };
    if (typeof limit === 'string') return { hasAccess: true, remaining: limit, limit };

    const currentUsage = currentUsageOverride !== undefined ? currentUsageOverride : (credits?.[feature as keyof UserCredits] || 0);
    
    const hasAccess = currentUsage < limit;
    
    return { 
      hasAccess, 
      remaining: Math.max(0, limit - (currentUsage as number)),
      limit 
    };
  };

  const deductCredit = async (feature: Feature) => {
    if (!user || plan === 'premium' || plan === 'admin') return;

    const { hasAccess } = checkAccess(feature);
    if (!hasAccess) {
      openUpgradeModal(feature);
      throw new Error(`Limit reached for ${feature}`);
    }

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      [`credits.${feature}`]: increment(1)
    });
  };

  const openUpgradeModal = (feature?: Feature) => {
    setTriggeredFeature(feature);
    setIsUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setTriggeredFeature(undefined);
  };

  const value = {
    plan,
    credits,
    checkAccess,
    deductCredit,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
