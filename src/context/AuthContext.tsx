import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserPlan = 'free' | 'premium' | 'admin';

const ADMIN_EMAILS = ["rrachitkhandelwal8@gmail.com"]; // User's email from runtime context

interface AuthContextType {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  isAdmin: boolean;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>('free');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time updates to user data
        const unsubDoc = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPlan(data.plan || 'free');
          } else {
            // Initial user creation
            const isEmailAdmin = firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email);
            const initialPlan: UserPlan = isEmailAdmin ? 'admin' : 'free';
            
            await setDoc(userRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              plan: initialPlan,
              createdAt: new Date().toISOString()
            }, { merge: true });
            
            setPlan(initialPlan);
          }
        });

        return () => unsubDoc();
      } else {
        setUser(null);
        setPlan('free');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update loading state once plan is determined
  useEffect(() => {
    if (user && plan) {
      setLoading(false);
    } else if (!user) {
      setLoading(false);
    }
  }, [user, plan]);

  const value = {
    user,
    loading,
    plan,
    isAdmin: plan === 'admin',
    isPremium: plan === 'premium' || plan === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAdmin() {
  const { isAdmin } = useAuth();
  return { isAdmin };
}
