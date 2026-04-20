import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserPlan = 'free' | 'standard' | 'premium' | 'admin';

const ADMIN_EMAILS = ["rrachitkhandelwal8@gmail.com"]; // User's email from runtime context

interface AuthContextType {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  isAdmin: boolean;
  isPremium: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>('free');

  const unsubRef = useRef<Unsubscribe | null>(null);

  const cleanup = () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  };

  useEffect(() => {
    // Set persistence to local (survives browser restart/refresh)
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanup();

      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time updates to user data
        unsubRef.current = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const isEmailAdmin = firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email);
            
            if (isEmailAdmin && data.plan !== 'admin') {
              await setDoc(userRef, { plan: 'admin' }, { merge: true });
              setPlan('admin');
            } else {
              setPlan(data.plan || 'free');
            }
          } else {
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
          setLoading(false);
        }, (err) => {
          console.error("Firestore Sync Error:", err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setPlan('free');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  // Update loading state once plan is determined
  useEffect(() => {
    if (user && plan) {
      setLoading(false);
    } else if (!user) {
      setLoading(false);
    }
  }, [user, plan]);

  const logout = async () => {
    cleanup();
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    plan,
    isAdmin: plan === 'admin',
    isPremium: plan === 'premium' || plan === 'admin',
    logout
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
