import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import HireFlowLogo from './HireFlowLogo';

interface AuthGateModalProps {
  isOpen: boolean;
  actionLabel: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthGateModal({
  isOpen,
  actionLabel,
  onClose,
  onSuccess
}: AuthGateModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        onClose();
        if (onSuccess) {
          // Allow AuthContext state to propagate smoothly before continuing
          setTimeout(() => onSuccess(), 150);
        }
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/cancelled-popup-request' &&
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/user-cancelled'
      ) {
        setErrorMsg('Sign-in could not be completed. Please allow popups and try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          {/* Tactile Editorial Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[6px_6px_0px_var(--hf-shadow-color)] rounded-sm overflow-hidden"
          >
            {/* Header strip */}
            <div className="px-5 py-3.5 bg-[var(--hf-surface-secondary)] border-b-[1.5px] border-[var(--hf-ink-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HireFlowLogo className="w-6 h-6" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--hf-cta)]">
                  Free Account Required
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface)] rounded-sm border border-transparent hover:border-[var(--hf-ink-border)] transition-colors cursor-pointer"
                aria-label="Close sign in dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <h2
                  id="auth-gate-title"
                  className="font-serif-display text-2xl font-bold tracking-tight text-[var(--hf-text)] leading-snug"
                >
                  Sign in to {actionLabel}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  Create your free AI HireFlow account in one click with Google. Everything you typed stays right here.
                </p>
              </div>

              {/* Quick Benefits */}
              <div className="p-3.5 rounded-sm bg-[var(--hf-surface-secondary)]/70 border border-[var(--hf-border)] space-y-2">
                <div className="flex items-center gap-2.5 text-xs text-[var(--hf-text)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0" />
                  <span><strong>150 free AI credits</strong> refreshed every single day</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[var(--hf-text)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0" />
                  <span>Cloud sync for resumes, ATS scores &amp; tracked jobs</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[var(--hf-text)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0" />
                  <span>No credit card required — private to your Google account</span>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-[var(--hf-error)] bg-[var(--hf-error)]/10 border border-[var(--hf-error)]/30 rounded-sm px-3 py-2">
                  {errorMsg}
                </p>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="hf-btn-primary w-full min-h-[46px] text-sm font-semibold gap-2.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in with Google...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] transition-colors cursor-pointer"
                >
                  Keep exploring as guest
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
