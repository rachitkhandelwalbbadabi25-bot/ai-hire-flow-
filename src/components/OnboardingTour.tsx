import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Sparkles, FileText, BarChart2, CheckCircle, ArrowRight, X } from 'lucide-react';

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
          // New user profile
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
      title: 'Step 1: Upload Your Resume',
      description: 'Start by uploading your current resume in PDF format to receive instant AI feedback and keyword matching.',
      path: '/analyzer',
      icon: FileText,
      accent: 'text-accent bg-accent/10 border-accent/20',
      actionText: 'Go to Resume Analyzer'
    },
    {
      title: 'Step 2: Check Your ATS Match Score',
      description: 'Analyze your compatibility against target job descriptions and optimize your resume keywords for applicant tracking systems.',
      path: '/analyzer',
      icon: BarChart2,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      actionText: 'View Analysis Setup'
    },
    {
      title: 'Step 3: Recommended Tasks Home Base',
      description: 'Your Dashboard features a live Recommended Tasks card—use it as your daily home base to track actions and placement progress.',
      path: '/dashboard',
      icon: CheckCircle,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      actionText: 'Finish Onboarding'
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          className="bg-surface border border-border p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={markCompleted}
            className="absolute top-6 right-6 p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all cursor-pointer"
            aria-label="Skip onboarding tour"
            title="Skip tour"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="text-xs font-bold text-accent uppercase tracking-widest font-mono">
              Quick Start Guide ({currentStep + 1}/{steps.length})
            </span>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className={`p-4 rounded-2xl border flex items-center justify-center shrink-0 ${step.accent}`} aria-hidden="true">
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 id="tour-step-title" className="text-xl font-bold text-ink mb-2 tracking-tight">{step.title}</h3>
              <p className="text-sm text-ink-dim leading-relaxed font-medium">{step.description}</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-between pt-6 border-t border-border" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
            <div className="flex gap-2" role="tablist" aria-label="Tour step indicators">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  role="tab"
                  aria-selected={idx === currentStep}
                  aria-label={`Step ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep ? 'w-8 bg-accent' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={markCompleted}
                className="text-xs font-bold text-ink-dim hover:text-ink px-3 py-2 rounded-xl transition-colors cursor-pointer"
                aria-label="Skip the onboarding walkthrough"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="bg-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
                aria-label={step.actionText}
              >
                <span>{step.actionText}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
