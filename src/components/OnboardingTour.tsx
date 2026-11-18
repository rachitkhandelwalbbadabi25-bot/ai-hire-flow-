import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FileText, BarChart2, CheckCircle, ArrowRight, X } from 'lucide-react';

export default function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkOnboardingStatus = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (!data.hasCompletedOnboarding) {
            setShowTour(true);
          }
        } else {
          setShowTour(true);
        }
      } catch (e) {
        console.warn('Failed to check onboarding status:', e);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const markCompleted = async () => {
    setShowTour(false);
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { hasCompletedOnboarding: true }, { merge: true });
      } catch (e) {
        console.error('Failed to update onboarding status:', e);
      }
    }
  };

  const steps = [
    {
      title: '1. Upload your resume',
      description: 'Upload your current resume in PDF or DOCX format to calculate baseline ATS readability and keyword coverage.',
      path: '/analyzer',
      icon: FileText,
      actionText: 'Go to Resume Analyzer'
    },
    {
      title: '2. Compare against a target role',
      description: 'Paste any job description to inspect your 4-factor compatibility score and rewrite experience bullets.',
      path: '/analyzer',
      icon: BarChart2,
      actionText: 'Continue'
    },
    {
      title: '3. Manage your search from the Dashboard',
      description: 'Use your workspace dashboard to track applications, run mock interviews, and monitor weekly momentum.',
      path: '/dashboard',
      icon: CheckCircle,
      actionText: 'Complete Setup'
    }
  ];

  if (!showTour) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (step.path && location.pathname !== step.path) {
      navigate(step.path);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markCompleted();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          className="bg-[var(--hf-surface)] border border-[var(--hf-border)] p-6 sm:p-7 rounded-xl max-w-md w-full shadow-xl relative overflow-hidden"
        >
          <button
            onClick={markCompleted}
            className="absolute top-4 right-4 p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors cursor-pointer"
            aria-label="Skip onboarding tour"
            title="Skip tour"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)]">
              Workspace Guide ({currentStep + 1} of {steps.length})
            </span>
          </div>

          <div className="flex items-start gap-3.5 mb-6">
            <div className="p-3 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center shrink-0" aria-hidden="true">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="tour-step-title" className="text-base font-semibold text-[var(--hf-text)] mb-1 tracking-tight">{step.title}</h3>
              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">{step.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--hf-border)]">
            <div className="flex gap-1.5" role="tablist" aria-label="Tour step indicators">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  role="tab"
                  aria-selected={idx === currentStep}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-6 bg-[var(--hf-cta)]' : 'w-1.5 bg-[var(--hf-border)]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markCompleted}
                className="px-3 py-1.5 text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="hf-btn-primary px-4 py-2 text-xs gap-1.5"
              >
                <span>{step.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
