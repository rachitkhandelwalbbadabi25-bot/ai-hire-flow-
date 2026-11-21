import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AuthGateModal from '../components/AuthGateModal';

export type UserPlan = 'free' | 'pro' | 'standard' | 'premium' | 'admin';

const ADMIN_EMAILS = ["rrachitkhandelwal8@gmail.com"]; // User's email from runtime context

interface AuthContextType {
  user: User | null;
  loading: boolean;
  plan: UserPlan;
  isAdmin: boolean;
  isPremium: boolean;
  logout: () => Promise<void>;
  /**
   * Checks if user is signed in. If not, opens the Sign-In modal for `actionLabel` and returns false.
   * Pass an optional `onAuthorized` callback to resume right after Google Sign-In succeeds.
   */
  requireAuth: (actionLabel?: string, onAuthorized?: () => void) => boolean;
  openAuthModal: (actionLabel?: string, onAuthorized?: () => void) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan>('free');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authActionLabel, setAuthActionLabel] = useState('unlock this AI feature');
  const pendingActionRef = useRef<(() => void) | undefined>(undefined);

  const unsubRef = useRef<Unsubscribe | null>(null);

  const cleanup = () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanup();

      if (firebaseUser) {
        const isEmailAdmin = !!(firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email));
        if (isEmailAdmin) {
          setPlan('admin');
        }
        setUser(firebaseUser);
        setLoading(false);
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time updates to user data
        unsubRef.current = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            // Respect stored user plan, normalize 'standard' to 'pro', default to admin if admin email and no plan set
            const rawPlan = data.plan || (isEmailAdmin ? 'admin' : 'free');
            const currentPlan: UserPlan = (rawPlan === 'standard' ? 'pro' : rawPlan);
            setPlan(currentPlan);
          } else {
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

  const openAuthModal = useCallback((actionLabel = 'continue with AI HireFlow', onAuthorized?: () => void) => {
    setAuthActionLabel(actionLabel);
    pendingActionRef.current = onAuthorized;
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    pendingActionRef.current = undefined;
  }, []);

  const requireAuth = useCallback((actionLabel = 'use this feature', onAuthorized?: () => void): boolean => {
    if (user) return true;
    openAuthModal(actionLabel, onAuthorized);
    return false;
  }, [user, openAuthModal]);

  const handleAuthModalSuccess = useCallback(() => {
    const callback = pendingActionRef.current;
    pendingActionRef.current = undefined;
    if (callback) {
      callback();
    }
  }, []);

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
    logout,
    requireAuth,
    openAuthModal,
    closeAuthModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthGateModal
        isOpen={authModalOpen}
        actionLabel={authActionLabel}
        onClose={closeAuthModal}
        onSuccess={handleAuthModalSuccess}
      />
    </AuthContext.Provider>
  );
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
