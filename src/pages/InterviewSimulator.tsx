import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  RotateCcw, 
  Search, 
  Briefcase,
  FileText,
  Sliders,
  Check,
  HelpCircle,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookOpen,
  Target,
  ExternalLink
} from 'lucide-react';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import { generateInterviewQuestions, evaluateInterviewAnswer } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link, useLocation } from 'react-router-dom';
import { formatCreditAvailability } from '../utils/formatters';
import { useSystemOS } from '../context/SystemOSContext';
import SkeletonLoader from '../components/SkeletonLoader';
import { INTERVIEW_QUESTION_BANK, BankQuestion, getQuestionsForRoleAndSkills, RubricCriteria } from '../data/interviewQuestionBank';
import { cn } from '../lib/utils';
import { isDemoRole } from '../utils/demoDataSanitizer';

interface Question {
  id: string;
  question: string;
  category: string;
  rationale?: string;
  rubric?: RubricCriteria;
  weakSkills?: string[];
}

interface Evaluation {
  feedback: string;
  improvementTips: string[];
  score: number;
  keyPointsMissing: string[];
  selfAssessed?: boolean;
  checkedKeyPoints?: string[];
  starScores?: {
    situation: number;
    task: number;
    action: number;
    result: number;
  };
  strengths?: string[];
  weaknesses?: string[];
}

const INTERVIEW_STORAGE_KEYS = {
  JOB_DESC: 'interview_sim_job_desc',
  MODE: 'interview_sim_mode',
  STEP: 'interview_sim_step',
  QUESTIONS: 'interview_sim_questions',
  CURRENT_IDX: 'interview_sim_current_idx',
  USER_ANSWER: 'interview_sim_user_answer',
  EVALUATIONS: 'interview_sim_evaluations',
  SELECTED_SKILLS: 'interview_sim_selected_skills',
  IS_DEGRADED: 'interview_sim_is_degraded',
  IS_FROM_CACHE: 'interview_sim_is_from_cache'
};

const getEffectiveRubric = (q?: Question): RubricCriteria => {
  if (q?.rubric) return q.rubric;
  return {
    basic: 'Mentions basic concepts but lacks architectural depth, real-world constraints, or production edge-cases (0-4 Pts).',
    proficient: 'Demonstrates clear technical competence, practical implementation knowledge, and expected workflows (5-7 Pts).',
    exemplary: 'Staff/Principal-level mastery: articulates architectural trade-offs, scalability, failure modes, and metrics (8-10 Pts).',
    proTip: 'Structure your answer using the STAR method or clear technical pillars: problem context, decisions, trade-offs, and measurable outcomes.',
    keyPoints: [
      'Directly addresses the primary question requirements',
      'Articulates system trade-offs and architectural alternatives',
      'Considers reliability, latency, scale, or failure modes',
      'Provides concrete engineering rationale and measurable impact'
    ]
  };
};

/**
 * Pure display-only helper to classify a question's evaluation state:
 * - Skipped: no evaluation entry for the question's id
 * - Self-assessed with rubric: selfAssessed && Array.isArray(checkedKeyPoints)
 * - Not scored: selfAssessed && !Array.isArray(checkedKeyPoints) (estimated from answer length)
 * - AI-evaluated: regular AI evaluation object
 */
type QuestionEvaluationKind = 'skipped' | 'rubric' | 'estimated' | 'ai';

const getQuestionEvaluationKind = (evalData?: Evaluation | null): QuestionEvaluationKind => {
  if (!evalData) return 'skipped';
  if (evalData.selfAssessed && Array.isArray(evalData.checkedKeyPoints)) return 'rubric';
  if (evalData.selfAssessed && !Array.isArray(evalData.checkedKeyPoints)) return 'estimated';
  return 'ai';
};

export default function InterviewSimulator() {
  const { user } = useAuth();
  const location = useLocation();
  const { checkAccess, deductCredit, creditWallet, creditCosts, triggerAction } = usePlan();
  const { hasAccess, remaining, limit: sessionLimit } = checkAccess('interviewSessions');
  const { activeTargetRole, trackedJobs, currentActiveJob, clearCurrentJobContext } = useSystemOS();

  const [mode, setMode] = useState<'ai' | 'text_practice'>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.MODE);
      return (saved === 'ai' || saved === 'text_practice') ? saved : 'ai';
    } catch {
      return 'ai';
    }
  });

  const [step, setStep] = useState<'setup' | 'interview' | 'results'>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.STEP);
      return (saved === 'setup' || saved === 'interview' || saved === 'results') ? saved : 'setup';
    } catch {
      return 'setup';
    }
  });

  const [jobDescription, setJobDescription] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.JOB_DESC);
      if (saved && !isDemoRole(saved) && !saved.toLowerCase().includes('target organization') && !saved.toLowerCase().includes('sarvam')) {
        return saved;
      }
    } catch {}
    return '';
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.CURRENT_IDX);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [userAnswer, setUserAnswer] = useState<string>(() => {
    try {
      return sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.USER_ANSWER) || '';
    } catch {
      return '';
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.EVALUATIONS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeQuestionEvaluation, setActiveQuestionEvaluation] = useState<Evaluation | null>(null);
  const [recentResumeText, setRecentResumeText] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const [isDegradedFallback, setIsDegradedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rubric Self-Assessment States (for Text Practice / Degraded Mode)
  const [showRubricAssessment, setShowRubricAssessment] = useState(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [checkedKeyPoints, setCheckedKeyPoints] = useState<Record<string, boolean>>({});
  const [selfNotes, setSelfNotes] = useState('');
  const [selectedWeakSkills, setSelectedWeakSkills] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(INTERVIEW_STORAGE_KEYS.SELECTED_SKILLS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Preserve user's actual current work across navigation
  useEffect(() => {
    try {
      if (jobDescription && !isDemoRole(jobDescription) && !jobDescription.toLowerCase().includes('target organization') && !jobDescription.toLowerCase().includes('sarvam')) {
        sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.JOB_DESC, jobDescription);
      } else {
        sessionStorage.removeItem(INTERVIEW_STORAGE_KEYS.JOB_DESC);
      }
    } catch {}
  }, [jobDescription]);

  useEffect(() => {
    try {
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.MODE, mode);
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.STEP, step);
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.CURRENT_IDX, currentIdx.toString());
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.USER_ANSWER, userAnswer);
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.EVALUATIONS, JSON.stringify(evaluations));
      sessionStorage.setItem(INTERVIEW_STORAGE_KEYS.SELECTED_SKILLS, JSON.stringify(selectedWeakSkills));
    } catch {}
  }, [mode, step, currentIdx, userAnswer, questions, evaluations, selectedWeakSkills]);

  // Handle explicit route navigation with parameters or active selected job
  useEffect(() => {
    if (location.state?.jobDescription && !isDemoRole(location.state.jobDescription) && !location.state.jobDescription.toLowerCase().includes('target organization') && !location.state.jobDescription.toLowerCase().includes('sarvam')) {
      setJobDescription(location.state.jobDescription);
    } else if (location.state?.role && !isDemoRole(location.state.role) && !location.state.role.toLowerCase().includes('sarvam')) {
      setJobDescription(`Position: ${location.state.role}${location.state.company ? ` at ${location.state.company}` : ''}\nFocus: Technical interview, system design, and role-specific architecture.`);
    } else if (!jobDescription && currentActiveJob && !isDemoRole(currentActiveJob.title)) {
      // Auto-populate from explicitly selected real active job
      const activeDesc = currentActiveJob.description 
        ? `${currentActiveJob.title} at ${currentActiveJob.company}\nLocation: ${currentActiveJob.location || (currentActiveJob.isRemote ? 'Remote' : 'Not specified')}\n\n${currentActiveJob.description}`
        : `Position: ${currentActiveJob.title} at ${currentActiveJob.company}\nLocation: ${currentActiveJob.location || 'Not specified'}\nRemote: ${currentActiveJob.isRemote ? 'Yes' : 'No'}\nRequirements & Skills: ${(currentActiveJob.skills || []).join(', ')}`;
      setJobDescription(activeDesc);
    }
  }, [location.state, currentActiveJob]);

  // Explicit Reset/Clear Handler
  const handleResetInterview = () => {
    setStep('setup');
    setJobDescription('');
    setQuestions([]);
    setCurrentIdx(0);
    setUserAnswer('');
    setEvaluations({});
    setActiveQuestionEvaluation(null);
    setIsGenerating(false);
    setIsEvaluating(false);
    setError(null);
    setShowRubricAssessment(false);
    setCheckedKeyPoints({});
    setSelfScore(null);
    setSelfNotes('');
    setSelectedWeakSkills([]);
    clearCurrentJobContext();
    try {
      Object.values(INTERVIEW_STORAGE_KEYS).forEach(k => sessionStorage.removeItem(k));
    } catch {}
  };

  const hasActiveSession = Boolean(jobDescription || step !== 'setup' || questions.length > 0);

  // Auto-load most recent resume for context if available
  useEffect(() => {
    if (!user?.uid) return;
    const fetchResume = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'resumes'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setRecentResumeText(snapshot.docs[0].data().content);
        }
      } catch (err) {
        console.warn("Could not fetch resume context:", err);
      }
    };
    fetchResume();
  }, [user?.uid]);

  // Helper to initialize Static / Fallback questions bank
  const loadFallbackQuestions = () => {
    setIsDegradedFallback(true);
    const bankQs = getQuestionsForRoleAndSkills(activeTargetRole || jobDescription, selectedWeakSkills);
    const formatted: Question[] = bankQs.map(bq => ({
      id: bq.id,
      question: bq.question,
      category: bq.category,
      rationale: bq.rationale,
      rubric: bq.rubric,
      weakSkills: bq.weakSkills
    }));

    setQuestions(formatted);
    setStep('interview');
    setCurrentIdx(0);
    setUserAnswer('');
    setShowRubricAssessment(false);
    setCheckedKeyPoints({});
    setSelfScore(null);
    setSelfNotes('');
  };

  const startInterview = async () => {
    if (!jobDescription) return;
    
    // If user explicitly chose Text Practice / Static Rubric Mode
    if (mode === 'text_practice') {
      loadFallbackQuestions();
      return;
    }

    setIsGenerating(true);
    setIsFromCache(false);
    setIsDegradedFallback(false);
    setError(null);

    try {
      const cacheKey = cacheManager.generateInterviewKey(jobDescription.slice(0, 100));
      
      let cached = null;
      try {
        cached = cacheManager.get<Question[]>(cacheKey);
      } catch (e) {
        console.warn('Cache layer failure:', e);
      }

      if (cached && Array.isArray(cached) && cached.length > 0) {
        setQuestions(cached);
        setIsFromCache(true);
        setStep('interview');
        setCurrentIdx(0);
        setIsGenerating(false);
        return;
      }

      if (!hasAccess) {
        // Fall back gracefully to Text Practice mode without hard blocking
        loadFallbackQuestions();
        setIsGenerating(false);
        return;
      }

      await deductCredit('interviewSessions');
      const qs = await generateInterviewQuestions(jobDescription, recentResumeText);

      // Attach matching rubrics if available
      const enrichedQs: Question[] = qs.map(q => {
        const matchingBank = INTERVIEW_QUESTION_BANK.find(bq => 
          bq.category.toLowerCase() === q.category.toLowerCase() ||
          bq.question.toLowerCase().includes(q.category.toLowerCase())
        );
        return {
          ...q,
          rubric: matchingBank?.rubric
        };
      });

      setQuestions(enrichedQs);
      cacheManager.set(cacheKey, enrichedQs, 6 * 60 * 60 * 1000);

      setStep('interview');
      setCurrentIdx(0);
    } catch (error: any) {
      console.warn('Live AI generation failed, transitioning seamlessly to Curated Practice Mode:', error);
      // Graceful fallback: load static high-yield question bank instead of blocking
      loadFallbackQuestions();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenRubricEvaluation = () => {
    if (!userAnswer.trim()) return;
    setError(null);
    setSelfScore(null);
    setCheckedKeyPoints({});
    setSelfNotes('');
    setShowRubricAssessment(true);
  };

  const handleConfirmRubricScore = () => {
    const currentQ = questions[currentIdx];
    if (selfScore === null || !currentQ) return;
    const rubric = getEffectiveRubric(currentQ);
    const checkedList = rubric.keyPoints.filter(kp => checkedKeyPoints[kp]);
    const missingList = rubric.keyPoints.filter(kp => !checkedKeyPoints[kp]);

    const evaluation: Evaluation = {
      feedback: selfNotes.trim() 
        ? `Self-Reflection: ${selfNotes}`
        : (selfScore >= 8 
            ? 'Comprehensive response demonstrating deep architectural command.' 
            : selfScore >= 5 
            ? 'Solid coverage of foundational concepts with room for additional technical depth.'
            : 'Basic response. Focus on incorporating the missed key technical points and system trade-offs.'),
      improvementTips: missingList.length > 0 
        ? missingList.map(m => `Incorporate: ${m}`)
        : ['Continue practicing time-boxed verbal articulation using the STAR framework.'],
      score: selfScore,
      keyPointsMissing: missingList,
      selfAssessed: true,
      checkedKeyPoints: checkedList
    };

    setShowRubricAssessment(false);
    setError(null);
    finishQuestionEvaluation(currentQ.id, evaluation);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || isEvaluating) return;
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    setError(null);

    // If in Rubric Assessment mode
    if (showRubricAssessment) {
      handleConfirmRubricScore();
      return;
    }

    // AI Evaluation Mode
    setIsEvaluating(true);
    try {
      const evaluation = await evaluateInterviewAnswer(currentQ.question, userAnswer, jobDescription);
      setError(null);
      setShowRubricAssessment(false);
      finishQuestionEvaluation(currentQ.id, evaluation);
    } catch (err: any) {
      console.warn('AI evaluation API unavailable:', err);
      const safeErrorMsg = err?.message?.includes('resource_exhausted')
        ? 'AI rate limit or usage quota reached for this session. You can retry, self-assess using the rubric, or advance to the next question.'
        : 'AI Evaluator encountered a temporary issue. You can retry evaluation, self-assess with rubric, or advance to the next question.';
      setError(safeErrorMsg);
    } finally {
      setIsEvaluating(false);
    }
  };

  const finishQuestionEvaluation = (qId: string, evaluation: Evaluation) => {
    const updatedEvaluations = { ...evaluations, [qId]: evaluation };
    setEvaluations(updatedEvaluations);
    setActiveQuestionEvaluation(evaluation);
  };

  const handleProceedToNextQuestion = async () => {
    setError(null);
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      const nextQ = questions[nextIdx];
      setCurrentIdx(nextIdx);
      const nextEval = nextQ ? evaluations[nextQ.id] : null;
      setActiveQuestionEvaluation(nextEval || null);
      setUserAnswer('');
      setShowRubricAssessment(false);
      setCheckedKeyPoints({});
      setSelfScore(null);
      setSelfNotes('');
    } else {
      // Completed all questions
      let scoreSum = 0;
      Object.values(evaluations).forEach((e: any) => {
        scoreSum += (e?.score || 0);
      });
      const aggregateScore = questions.length > 0 ? Math.round((scoreSum / questions.length) * 10) : 0;

      // Persist locally for instant availability and fallback
      try {
        const simRecord = {
          jobDescription,
          score: aggregateScore,
          evaluations,
          questionsCount: questions.length,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('interview_sim_evaluations', JSON.stringify(evaluations));
        localStorage.setItem('interview_last_completed_sim', JSON.stringify(simRecord));
        if (user?.uid) {
          localStorage.setItem(`interview_last_completed_sim_${user.uid}`, JSON.stringify(simRecord));
        }
      } catch (storageErr) {
        console.warn('Local storage mirror notice:', storageErr);
      }

      if (user?.uid) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'simulations'), {
            jobDescription,
            questions,
            evaluations,
            score: aggregateScore,
            isDegradedFallback,
            createdAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.error('Failed to persist simulation record:', dbErr);
        }

        try {
          await triggerAction('practice_interview');
        } catch (actionErr) {
          console.warn('Action trigger notice:', actionErr);
        }
      }

      setActiveQuestionEvaluation(null);
      setStep('results');
    }
  };

  const resetSimulator = () => {
    handleResetInterview();
  };

  const calculateTotalScore = () => {
    if (questions.length === 0) return 0;
    let total = 0;
    Object.values(evaluations).forEach((e) => {
      total += (e as Evaluation).score;
    });
    return Math.round((total / questions.length) * 10);
  };

  const currentQ = questions[currentIdx];
  const currentEvaluation = activeQuestionEvaluation || (currentQ ? evaluations[currentQ.id] : null);
  const activeRubric = currentQ ? getEffectiveRubric(currentQ) : null;

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-cta)]" />
          <p className="text-sm font-medium text-[var(--hf-text-secondary)]">Loading interview practice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-1">
            Interview Prep
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight">
            Interview practice
          </h1>
          <p className="text-sm text-[var(--hf-text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
            Practice technical, system design, and role-specific questions with real-time feedback or self-assessment rubrics.
          </p>
        </div>

        {/* Status Row & Reset Action */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          {hasActiveSession && (
            <button
              onClick={handleResetInterview}
              className="hf-btn-secondary px-3 py-2 text-xs flex items-center gap-2 cursor-pointer"
              title="Clear all interview practice state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset session</span>
            </button>
          )}
          <div className="px-3.5 py-2 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] rounded-sm flex items-center gap-2.5">
            <div className="w-2 h-2 bg-[var(--hf-success)]" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--hf-text-muted)]">SESSIONS AVAILABLE</span>
              <span className="font-mono text-xs font-bold text-[var(--hf-text)]">
                {creditCosts?.interviewSession
                  ? formatCreditAvailability(creditWallet?.balance, creditCosts.interviewSession, 'sessions')
                  : `${creditWallet?.balance ?? 0} credits available`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="my-8 hf-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--hf-text)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--hf-cta)]" />
            <span>Preparing customized interview questions...</span>
          </div>
          <SkeletonLoader type="card" lines={4} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: SETUP */}
        {step === 'setup' && !isGenerating && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="hf-card p-6 sm:p-7 space-y-6"
          >
            {/* Mode Selection Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-[var(--hf-text)] block">
                  Select practice mode
                </label>
                <span className="text-xs text-[var(--hf-text-muted)]">Choose how questions and answers are scored</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={cn(
                    "p-4 rounded-sm border-[1.5px] text-left transition-all cursor-pointer flex flex-col justify-between",
                    mode === 'ai'
                      ? "bg-[var(--hf-surface)] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-cta)]"
                      : "bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] hover:border-[var(--hf-ink-border)]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[var(--hf-cta)]" />
                      <span className="font-serif-display text-base font-semibold text-[var(--hf-text)]">AI-evaluated practice</span>
                    </div>
                    <span className="hf-badge hf-badge-cta">
                      Uses 1 session
                    </span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    {creditCosts?.interviewSession
                      ? `Uses ${creditCosts.interviewSession} credits (1 session) to generate customized questions and evaluate each written answer. If credits run out or generation fails, built-in practice questions are used.`
                      : `Uses 1 interview session to generate customized questions and evaluate each written answer. If credits run out or generation fails, built-in practice questions are used.`
                    }
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('text_practice')}
                  className={cn(
                    "p-4 rounded-sm border-[1.5px] text-left transition-all cursor-pointer flex flex-col justify-between",
                    mode === 'text_practice'
                      ? "bg-[var(--hf-surface)] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-cta)]"
                      : "bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] hover:border-[var(--hf-ink-border)]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                      <span className="font-serif-display text-base font-semibold text-[var(--hf-text)]">Text practice with rubric</span>
                    </div>
                    <span className="hf-badge">
                      0 credits
                    </span>
                  </div>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    Uses curated questions from the built-in practice bank. You evaluate your own responses using a structured criteria rubric with no AI credits required.
                  </p>
                </button>
              </div>
            </div>

            {/* Target Role & Weak Skills Selection */}
            {mode === 'text_practice' && (
              <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--hf-text)] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" /> Focus on target weak skills
                  </span>
                  <span className="text-xs text-[var(--hf-text-muted)]">Optional topic filter</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'System Design', 
                    'React Performance', 
                    'SQL Optimization', 
                    'Kubernetes & Cloud', 
                    'Distributed Systems', 
                    'STAR Leadership',
                    'RAG & AI Engineering'
                  ].map(skill => {
                    const isSelected = selectedWeakSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          setSelectedWeakSkills(prev => 
                            isSelected ? prev.filter(s => s !== skill) : [...prev, skill]
                          );
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border",
                          isSelected
                            ? "bg-[var(--hf-cta)] border-[var(--hf-cta)] text-white"
                            : "bg-[var(--hf-surface)] border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Job Description / Interview Prompt */}
            <div className="space-y-3">
              {currentActiveJob && (
                <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Target className="w-4 h-4 text-[var(--hf-ai-teal)] shrink-0" />
                    <div className="text-xs text-[var(--hf-text)] truncate">
                      <span>Targeting active job: <strong>{currentActiveJob.title}</strong> at {currentActiveJob.company}</span>
                      {currentActiveJob.provider && (
                        <span className="ml-1.5 hf-badge text-[10px] font-medium">
                          {currentActiveJob.provider}
                        </span>
                      )}
                      {currentActiveJob.isRemote && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[color-mix(in_srgb,var(--hf-success)_12%,transparent)] border border-[color-mix(in_srgb,var(--hf-success)_30%,transparent)] text-[var(--hf-success)]">
                          Remote
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {currentActiveJob.link && (
                      <a
                        href={currentActiveJob.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--hf-cta)] hover:underline flex items-center gap-1 font-medium"
                      >
                        Listing <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        clearCurrentJobContext();
                        setJobDescription('');
                      }}
                      className="text-xs text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] transition-colors cursor-pointer"
                    >
                      Clear active job
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <label htmlFor="interview-job-desc" className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                    Target role or job description focus
                  </label>
                  {jobDescription && (
                    <button
                      type="button"
                      onClick={() => setJobDescription('')}
                      className="text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="interview-job-desc"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target role description, system design requirements, or interview topics..."
                  aria-label="Job description for interview simulation"
                  className="w-full h-36 p-3.5 sm:p-4 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--hf-cta)] focus:ring-1 focus:ring-[var(--hf-cta)] text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] resize-none leading-relaxed"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-[color-mix(in_srgb,var(--hf-warning)_12%,transparent)] border border-[color-mix(in_srgb,var(--hf-warning)_30%,transparent)] text-[var(--hf-text)] rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[var(--hf-warning)] shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
                <button
                  onClick={loadFallbackQuestions}
                  className="hf-btn-primary px-3 py-1.5 rounded-lg font-medium text-xs text-white shrink-0 cursor-pointer"
                >
                  Start rubric mode
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[var(--hf-border)]">
              <div className="flex items-center gap-2 text-xs">
                {recentResumeText ? (
                  <span className="flex items-center gap-1.5 text-[var(--hf-success)] font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0" /> Master resume attached
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[var(--hf-text-muted)]">
                    <HelpCircle className="w-4 h-4 shrink-0" /> General candidate drill
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={startInterview}
                disabled={!jobDescription || isGenerating}
                className="min-h-[42px] hf-btn-primary px-6 py-2.5 rounded-lg font-medium text-sm text-white shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {mode === 'ai' ? (
                  <>
                    <span>Start AI-evaluated practice</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Start text practice</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: ACTIVE INTERVIEW */}
        {step === 'interview' && currentQ && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Mode & Progress Row */}
            <div className="hf-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isDegradedFallback || mode === 'text_practice' ? (
                    <span className="hf-badge hf-badge-teal flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Text practice with rubric</span>
                    </span>
                  ) : (
                    <span className="hf-badge hf-badge-cta flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>AI-evaluated practice</span>
                    </span>
                  )}

                  {isDegradedFallback && (
                    <span className="hf-badge font-normal text-[var(--hf-text-secondary)]">
                      Standard question bank
                    </span>
                  )}

                  {isFromCache && (
                    <span className="hf-badge font-normal">
                      Cached questions
                    </span>
                  )}
                </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {questions.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 w-6 rounded-xs transition-all duration-200",
                        i < currentIdx 
                          ? "bg-[var(--hf-success)]" 
                          : i === currentIdx 
                          ? "bg-[var(--hf-cta)]" 
                          : "bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]"
                      )} 
                    />
                  ))}
                </div>
                <span className="font-mono text-xs font-medium text-[var(--hf-text-secondary)] tabular-nums">
                  {currentIdx + 1} / {questions.length}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="hf-card p-6 sm:p-7 space-y-6">
              <div>
                <span className="hf-badge mb-3 inline-block">
                  {currentQ.category}
                </span>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-[var(--hf-text)] tracking-tight leading-snug">
                  {currentQ.question}
                </h2>
                {currentQ.rationale && (
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-2 leading-relaxed italic">
                    &ldquo;{currentQ.rationale}&rdquo;
                  </p>
                )}
              </div>

              {/* Candidate Response Field */}
              {!currentEvaluation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="interview-user-response" className="text-xs font-semibold text-[var(--hf-text)] block">
                      Your technical answer
                    </label>
                    <span className="font-mono text-xs text-[var(--hf-text-muted)] tabular-nums">
                      {userAnswer.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    id="interview-user-response"
                    autoFocus
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Structure your answer clearly: outline core architecture, trade-offs, algorithms, failure modes, or STAR situation..."
                    aria-label="Your response to the interview question"
                    className="w-full h-48 sm:h-56 p-4 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] text-[var(--hf-text)] resize-none leading-relaxed transition-colors"
                  />
                </div>
              )}

              {/* Live Announcer for Evaluating State */}
              {isEvaluating && (
                <div aria-live="polite" className="sr-only">
                  Evaluating your answer against interview criteria...
                </div>
              )}

              {/* AI / Evaluation Error Banner with 3 Actionable Recovery Paths */}
              {error && !currentEvaluation && (
                <div 
                  role="alert" 
                  aria-live="assertive" 
                  className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-error)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 text-[var(--hf-error)]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-[var(--hf-text)] leading-relaxed">{error}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setError(null); submitAnswer(); }}
                      className="hf-btn-primary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry evaluation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        handleOpenRubricEvaluation();
                      }}
                      className="hf-btn-secondary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
                      <span>Self-assess with rubric</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
                        const fallbackScore = wordCount >= 60 ? 8 : (wordCount >= 25 ? 6 : 5);
                        const evaluation: Evaluation = {
                          feedback: `Answer recorded (${wordCount} words). Your response addresses the technical problem. Elaborate on concrete architectural decisions, edge-cases, and metrics to demonstrate senior depth.`,
                          improvementTips: [
                            'Use the STAR framework: clearly highlight your individual contributions and measurable outcomes.',
                            'Discuss system scalability and operational trade-offs.'
                          ],
                          score: fallbackScore,
                          keyPointsMissing: ['Detailed latency/scalability trade-offs', 'Concrete production metrics'],
                          selfAssessed: true
                        };
                        setError(null);
                        finishQuestionEvaluation(currentQ.id, evaluation);
                      }}
                      className="hf-btn-secondary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer hover:border-[var(--hf-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <span>Continue without scoring</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Evaluation Feedback Card (AI-evaluated answers only) */}
              {currentEvaluation && !currentEvaluation.selfAssessed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="p-6 sm:p-7 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl space-y-6 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--hf-border)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-[var(--hf-ai-teal)]" />
                        <h3 className="text-base sm:text-lg font-semibold text-[var(--hf-text)] tracking-tight">
                          AI answer evaluation
                        </h3>
                      </div>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                        Technical evaluation and STAR methodology analysis
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3.5 py-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-[var(--hf-text-secondary)]">AI score</span>
                        <span className="text-xl sm:text-2xl font-bold text-[var(--hf-text)] tabular-nums">
                          {currentEvaluation.score}
                        </span>
                        <span className="text-xs text-[var(--hf-text-muted)] font-normal">/ 10</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Submitted Answer Snapshot */}
                  {userAnswer && (
                    <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1">
                      <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                        Your submitted answer:
                      </span>
                      <p className="text-xs text-[var(--hf-text)] leading-relaxed line-clamp-3">
                        {userAnswer}
                      </p>
                    </div>
                  )}

                  {/* Recruiter / Evaluator Feedback Statement */}
                  {currentEvaluation.feedback && (
                    <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1.5">
                      <span className="text-xs font-medium text-[var(--hf-ai-teal)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" /> Evaluator feedback
                      </span>
                      <p className="text-xs sm:text-sm text-[var(--hf-text)] leading-relaxed">
                        "{currentEvaluation.feedback}"
                      </p>
                    </div>
                  )}

                  {/* STAR Breakdown if Available */}
                  {currentEvaluation.starScores && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                        STAR framework scoring
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { label: 'Situation', val: currentEvaluation.starScores.situation },
                          { label: 'Task', val: currentEvaluation.starScores.task },
                          { label: 'Action', val: currentEvaluation.starScores.action },
                          { label: 'Result', val: currentEvaluation.starScores.result }
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-center">
                            <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                              {item.label}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-[var(--hf-text)] tabular-nums mt-0.5 block">
                              {item.val} <span className="text-xs font-normal text-[var(--hf-text-muted)]">/ 10</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Weaknesses Grid */}
                  {((currentEvaluation.strengths && currentEvaluation.strengths.length > 0) || (currentEvaluation.weaknesses && currentEvaluation.weaknesses.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {currentEvaluation.strengths && currentEvaluation.strengths.length > 0 && (
                        <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2">
                          <p className="font-medium text-[var(--hf-success)] flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)]" /> Key strengths
                          </p>
                          <ul className="space-y-1.5">
                            {currentEvaluation.strengths.map((str, i) => (
                              <li key={i} className="text-[var(--hf-text)] flex items-start gap-2">
                                <span className="text-[var(--hf-success)] font-bold">•</span>
                                <span className="leading-relaxed">{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentEvaluation.weaknesses && currentEvaluation.weaknesses.length > 0 && (
                        <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2">
                          <p className="font-medium text-[var(--hf-warning)] flex items-center gap-1.5 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-[var(--hf-warning)]" /> Critical gaps & weaknesses
                          </p>
                          <ul className="space-y-1.5">
                            {currentEvaluation.weaknesses.map((weakness, i) => (
                              <li key={i} className="text-[var(--hf-text)] flex items-start gap-2">
                                <span className="text-[var(--hf-warning)] font-bold">•</span>
                                <span className="leading-relaxed">{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Improvement Tips */}
                  {currentEvaluation.improvementTips && currentEvaluation.improvementTips.length > 0 && (
                    <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2 text-xs">
                      <p className="font-medium text-[var(--hf-ai-teal)] flex items-center gap-1.5 text-xs">
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" /> Improvement tips
                      </p>
                      <ul className="space-y-1.5">
                        {currentEvaluation.improvementTips.map((tip, i) => (
                          <li key={i} className="text-[var(--hf-text)] flex items-start gap-2">
                            <span className="text-[var(--hf-ai-teal)] font-bold">•</span>
                            <span className="leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Keywords / Concepts */}
                  {currentEvaluation.keyPointsMissing && currentEvaluation.keyPointsMissing.length > 0 && (
                    <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2">
                      <p className="text-xs font-medium text-[var(--hf-text-secondary)] flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[var(--hf-text-secondary)]" /> Missing keywords & concepts
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentEvaluation.keyPointsMissing.map((kp, i) => (
                          <span key={i} className="hf-badge text-xs font-normal">
                            {kp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons inside Feedback Card */}
                  <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--hf-border)]">
                    <button
                      type="button"
                      onClick={() => setActiveQuestionEvaluation(null)}
                      className="hf-btn-secondary px-4 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise answer</span>
                    </button>

                    <button
                      id="next-question-btn"
                      data-testid="next-question-btn"
                      type="button"
                      onClick={handleProceedToNextQuestion}
                      className="hf-btn-primary px-6 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <span>{currentIdx < questions.length - 1 ? 'Next question' : 'View summary report'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Self-assessed or estimated answer note and actions */}
              {currentEvaluation && currentEvaluation.selfAssessed && (
                <div className="p-4 sm:p-5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                      <span className="text-sm font-semibold text-[var(--hf-text)]">
                        {Array.isArray(currentEvaluation.checkedKeyPoints)
                          ? 'Answer recorded & self-assessed'
                          : 'Answer recorded (not scored)'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--hf-text-secondary)]">
                      {Array.isArray(currentEvaluation.checkedKeyPoints) ? (
                        <>
                          Self-assessed score: <strong className="text-[var(--hf-text)] tabular-nums">{currentEvaluation.score} / 10</strong>. You can revise your response or continue to the next question.
                        </>
                      ) : (
                        <>
                          Not scored (estimated from answer length). You can revise your response or continue to the next question.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveQuestionEvaluation(null)}
                      className="hf-btn-secondary px-3.5 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise answer</span>
                    </button>
                    <button
                      id="next-question-action-btn"
                      data-testid="next-question-action-btn"
                      type="button"
                      onClick={handleProceedToNextQuestion}
                      className="hf-btn-primary px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      <span>{currentIdx < questions.length - 1 ? 'Next question' : 'View summary report'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Row when answer has not been submitted/evaluated yet */}
              {!currentEvaluation && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetSimulator}
                    className="px-3 py-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] text-xs font-medium transition-colors cursor-pointer text-left sm:text-center focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] rounded-lg"
                  >
                    Cancel practice
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5 justify-end">
                    {!showRubricAssessment && (
                      <button
                        type="button"
                        onClick={handleOpenRubricEvaluation}
                        disabled={!userAnswer.trim()}
                        className="hf-btn-secondary px-4 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
                        <span>Self-assess with rubric</span>
                      </button>
                    )}

                    {!showRubricAssessment && (
                      <button
                        id="submit-ai-evaluator-btn"
                        data-testid="submit-ai-evaluator-btn"
                        type="button"
                        onClick={submitAnswer}
                        disabled={!userAnswer.trim() || isEvaluating}
                        className="hf-btn-primary px-5 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                      >
                        {isEvaluating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Evaluating answer...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit for AI evaluation</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

                {/* INTERACTIVE SELF-ASSESSMENT RUBRIC SECTION */}
                {showRubricAssessment && activeRubric && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-6 border-t border-[var(--hf-border)] space-y-6"
                  >
                    <div className="hf-card p-5 sm:p-6 rounded-xl space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--hf-border)] pb-3">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                          <h3 className="text-sm font-semibold text-[var(--hf-text)]">
                            Self-assessment evaluation rubric
                          </h3>
                        </div>
                        <span className="text-xs text-[var(--hf-text-secondary)]">
                          Technical assessment criteria
                        </span>
                      </div>

                      {/* 3 Tier Level Cards (Text Labels Only: Basic 0-4, Proficient 5-7, Exemplary 8-10) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1.5">
                          <span className="text-xs font-semibold text-[var(--hf-text-secondary)] block">
                            Basic (0–4 pts)
                          </span>
                          <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                            {activeRubric.basic}
                          </p>
                        </div>

                        <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1.5">
                          <span className="text-xs font-semibold text-[var(--hf-text)] block">
                            Proficient (5–7 pts)
                          </span>
                          <p className="text-xs text-[var(--hf-text)] leading-relaxed">
                            {activeRubric.proficient}
                          </p>
                        </div>

                        <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1.5">
                          <span className="text-xs font-semibold text-[var(--hf-ai-teal)] block">
                            Exemplary (8–10 pts)
                          </span>
                          <p className="text-xs text-[var(--hf-text)] leading-relaxed">
                            {activeRubric.exemplary}
                          </p>
                        </div>
                      </div>

                      {/* Key Points Checklist */}
                      <div className="pt-1 space-y-2">
                        <label className="text-xs font-medium text-[var(--hf-text)] block">
                          Key technical points checklist (select the items your answer addressed):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeRubric.keyPoints.map((point, idx) => {
                            const isChecked = !!checkedKeyPoints[point];
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCheckedKeyPoints(prev => ({ ...prev, [point]: !prev[point] }));
                                }}
                                className={cn(
                                  "min-h-[44px] p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-start gap-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                                  isChecked
                                    ? "bg-[var(--hf-surface)] border-[var(--hf-ai-teal)] text-[var(--hf-text)] font-medium shadow-xs"
                                    : "bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                                  isChecked
                                    ? "bg-[var(--hf-ai-teal)] border-[var(--hf-ai-teal)] text-white"
                                    : "border-[var(--hf-border)] bg-[var(--hf-surface)]"
                                )}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="leading-snug">{point}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pro-Tip Callout */}
                      {activeRubric.proTip && (
                        <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg flex items-start gap-2.5 text-xs">
                          <Zap className="w-4 h-4 text-[var(--hf-ai-teal)] shrink-0 mt-0.5" />
                          <p className="text-[var(--hf-text-secondary)] leading-relaxed">
                            <strong className="text-[var(--hf-text)] font-medium">Evaluation tip: </strong>
                            {activeRubric.proTip}
                          </p>
                        </div>
                      )}

                      {/* Self-Score Selector */}
                      <div className="pt-3 border-t border-[var(--hf-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <label htmlFor="self-score-range" className="text-xs font-medium text-[var(--hf-text)] flex items-center gap-1.5 shrink-0">
                            <span>Your self-assessed score:</span>
                            {selfScore !== null ? (
                              <span className="text-[var(--hf-text)] font-bold tabular-nums">
                                {selfScore} / 10
                              </span>
                            ) : (
                              <span className="text-[var(--hf-text-muted)] font-normal italic text-xs">
                                (Choose 1–10)
                              </span>
                            )}
                          </label>

                          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Self-assessed score">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                              const isSelected = selfScore === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  onClick={() => setSelfScore(num)}
                                  className={cn(
                                    "min-w-[44px] min-h-[44px] px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]",
                                    isSelected
                                      ? "hf-btn-primary shadow-xs ring-2 ring-[var(--hf-cta)]"
                                      : "hf-btn-secondary"
                                  )}
                                >
                                  <span className="tabular-nums">{num}</span>
                                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          <button
                            type="button"
                            onClick={() => setShowRubricAssessment(false)}
                            className="hf-btn-secondary px-4 py-2.5 text-xs font-medium rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                          >
                            Cancel rubric
                          </button>
                          <button
                            id="confirm-rubric-score-btn"
                            data-testid="confirm-rubric-score-btn"
                            type="button"
                            onClick={handleConfirmRubricScore}
                            disabled={selfScore === null}
                            className="hf-btn-primary px-5 py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                          >
                            <span>Confirm score</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
          </motion.div>
        )}

        {/* STEP 3: SIMULATION RESULTS */}
        {step === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-8"
          >
            {/* Score Banner */}
            <div className="hf-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-[var(--hf-ink-border)] pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="hf-badge hf-badge-teal flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Interview practice complete</span>
                    </span>

                    {isDegradedFallback && (
                      <span className="hf-badge font-normal text-[var(--hf-text-secondary)]">
                        Standard question bank
                      </span>
                    )}

                    {isFromCache && (
                      <span className="hf-badge font-normal">
                        Cached questions
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-[var(--hf-text)] tracking-tight">
                    Practice summary report
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-1 max-w-xl leading-relaxed">
                    Review your completed questions, self-assessments, and AI feedback points below.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[3px_3px_0px_var(--hf-shadow-color)] p-4 rounded-sm self-start sm:self-auto shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                      Practice score
                    </span>
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tabular-nums">
                      {calculateTotalScore()}
                      <span className="text-xs sm:text-sm font-normal text-[var(--hf-text-muted)]"> / 100</span>
                    </span>
                  </div>
                  <div className="h-10 w-[1.5px] bg-[var(--hf-ink-border)]" aria-hidden="true" />
                  <div>
                    <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                      Questions
                    </span>
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tabular-nums">
                      {questions.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluation Breakdown Counts & Fixed Disclaimer */}
              {(() => {
                let aiCount = 0;
                let rubricCount = 0;
                let estimatedCount = 0;
                let skippedCount = 0;

                questions.forEach(q => {
                  const kind = getQuestionEvaluationKind(evaluations[q.id]);
                  if (kind === 'ai') aiCount++;
                  else if (kind === 'rubric') rubricCount++;
                  else if (kind === 'estimated') estimatedCount++;
                  else skippedCount++;
                });

                const summaryParts: string[] = [];
                if (aiCount > 0) summaryParts.push(`${aiCount} AI-evaluated`);
                if (rubricCount > 0) summaryParts.push(`${rubricCount} self-assessed`);
                if (estimatedCount > 0) summaryParts.push(`${estimatedCount} estimated`);
                if (skippedCount > 0) summaryParts.push(`${skippedCount} skipped`);

                return (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--hf-text-secondary)]">
                      <span className="font-medium text-[var(--hf-text)]">Session composition:</span>
                      <span>{summaryParts.join(', ') || 'No questions answered'}</span>
                    </div>
                    <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-[var(--hf-text-secondary)] leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
                      <span>
                        This score mixes AI-evaluated, self-assessed and estimated answers and is for practice only. It does not predict interview outcomes.
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-[var(--hf-text)]">
                  Question breakdown
                </h3>
                <span className="text-xs text-[var(--hf-text-secondary)] tabular-nums">
                  {questions.length} question{questions.length === 1 ? '' : 's'} drilled
                </span>
              </div>

              {questions.map((q, idx) => {
                const evalData = evaluations[q.id];
                const kind = getQuestionEvaluationKind(evalData);

                return (
                  <div key={q.id} className="hf-card p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-[1.5px] border-[var(--hf-ink-border)] pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[var(--hf-text-muted)] font-mono">
                          #{idx + 1}
                        </span>
                        <span className="hf-badge text-xs font-medium">
                          {q.category}
                        </span>

                        {/* Truthful Question Evaluation Kind Badge */}
                        {kind === 'ai' && (
                          <span className="hf-badge hf-badge-cta text-xs font-medium">
                            AI-evaluated
                          </span>
                        )}
                        {kind === 'rubric' && (
                          <span className="hf-badge hf-badge-teal text-xs font-medium">
                            Self-assessed with rubric
                          </span>
                        )}
                        {kind === 'estimated' && (
                          <span className="hf-badge text-xs font-normal text-[var(--hf-text-secondary)]">
                            Not scored (estimated from answer length)
                          </span>
                        )}
                        {kind === 'skipped' && (
                          <span className="hf-badge text-xs font-normal text-[var(--hf-text-muted)]">
                            Skipped
                          </span>
                        )}
                      </div>

                      {/* Score display (Only shown for AI-evaluated and Self-assessed) */}
                      {(kind === 'ai' || kind === 'rubric') && evalData && (
                        <div className="flex items-baseline gap-1 text-xs self-start sm:self-auto">
                          <span className="text-[var(--hf-text-secondary)] font-medium">Score:</span>
                          <span className="text-base font-bold text-[var(--hf-text)] tabular-nums">
                            {evalData.score}
                          </span>
                          <span className="text-[var(--hf-text-muted)]">/ 10</span>
                        </div>
                      )}
                    </div>

                    <h4 className="font-serif-display text-lg sm:text-xl font-normal text-[var(--hf-text)] leading-snug">
                      {q.question}
                    </h4>

                    {q.rationale && (
                      <p className="text-xs text-[var(--hf-text-secondary)] italic leading-relaxed">
                        &ldquo;{q.rationale}&rdquo;
                      </p>
                    )}

                    {evalData && (
                      <div className="bg-[var(--hf-surface-secondary)] p-4 rounded-sm border border-[var(--hf-ink-border)] space-y-4 text-xs">
                        {/* Feedback / Self-reflection quote */}
                        {evalData.feedback && (
                          <div>
                            <span className="font-medium text-[var(--hf-text-secondary)] block mb-1">
                              {kind === 'rubric' ? 'Self-reflection summary' : 'Evaluator assessment'}
                            </span>
                            <p className="text-[var(--hf-text)] leading-relaxed italic">
                              "{evalData.feedback}"
                            </p>
                          </div>
                        )}

                        {/* STAR Framework Scores (AI-evaluated answers ONLY) */}
                        {kind === 'ai' && evalData.starScores && (
                          <div className="pt-3 border-t border-[var(--hf-border)] space-y-2">
                            <span className="text-xs font-medium text-[var(--hf-text-secondary)] block">
                              STAR framework breakdown
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label: 'Situation', val: evalData.starScores.situation },
                                { label: 'Task', val: evalData.starScores.task },
                                { label: 'Action', val: evalData.starScores.action },
                                { label: 'Result', val: evalData.starScores.result }
                              ].map((item, starIdx) => (
                                <div key={starIdx} className="p-2.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-md text-center">
                                  <span className="text-[11px] text-[var(--hf-text-secondary)] block">
                                    {item.label}
                                  </span>
                                  <span className="text-sm font-bold text-[var(--hf-text)] tabular-nums">
                                    {item.val} <span className="text-[10px] font-normal text-[var(--hf-text-muted)]">/ 10</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strengths & Weaknesses (AI-evaluated answers ONLY) */}
                        {kind === 'ai' && ((evalData.strengths && evalData.strengths.length > 0) || (evalData.weaknesses && evalData.weaknesses.length > 0)) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--hf-border)]">
                            {evalData.strengths && evalData.strengths.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-medium text-[var(--hf-success)] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                                </span>
                                <ul className="space-y-1 text-[var(--hf-text)]">
                                  {evalData.strengths.map((str, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-[var(--hf-success)] font-bold">•</span>
                                      <span className="leading-relaxed">{str}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {evalData.weaknesses && evalData.weaknesses.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-medium text-[var(--hf-warning)] flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" /> Growth areas
                                </span>
                                <ul className="space-y-1 text-[var(--hf-text)]">
                                  {evalData.weaknesses.map((weakness, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-[var(--hf-warning)] font-bold">•</span>
                                      <span className="leading-relaxed">{weakness}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Key Concepts Mastered (Self-assessed with rubric ONLY) */}
                        {kind === 'rubric' && evalData.checkedKeyPoints && evalData.checkedKeyPoints.length > 0 && (
                          <div className="pt-3 border-t border-[var(--hf-border)] space-y-1.5">
                            <span className="font-medium text-[var(--hf-ai-teal)] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Key points confirmed in response
                            </span>
                            <ul className="space-y-1 text-[var(--hf-text)]">
                              {evalData.checkedKeyPoints.map((point: any, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-[var(--hf-ai-teal)] shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvement Tips / Next Focus Points */}
                        {evalData.improvementTips && evalData.improvementTips.length > 0 && (
                          <div className="pt-3 border-t border-[var(--hf-border)] space-y-1.5">
                            <span className="font-medium text-[var(--hf-text-secondary)] flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" /> Recommended focus areas
                            </span>
                            <ul className="space-y-1 text-[var(--hf-text)]">
                              {evalData.improvementTips.map((tip: any, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-[var(--hf-ai-teal)] font-bold">•</span>
                                  <span className="leading-relaxed">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Next Steps Bridge Card */}
            {(() => {
              const missingPoints = Object.values(evaluations).flatMap((e: any) => e?.keyPointsMissing || []);
              const totalScore = calculateTotalScore();
              return (
                <NextStepBridgeCard
                  title="Interview Practice Complete"
                  contextData={`Practice score: ${totalScore}/100 across ${questions.length} drilled questions. ${missingPoints.length > 0 ? `Identified growth areas: ${missingPoints.slice(0, 3).join(', ')}.` : 'Strong mastery demonstrated across all technical topics.'}`}
                  primaryStep={{
                    label: "Track active job applications",
                    icon: Briefcase,
                    to: "/jobs"
                  }}
                  secondaryStep={{
                    label: "Explore matched job openings",
                    icon: Search,
                    to: "/finder",
                    state: {
                      role: activeTargetRole || "Software Engineer",
                      autoSearch: true
                    }
                  }}
                />
              );
            })()}

            <div className="flex justify-center pt-2">
              <button 
                type="button"
                onClick={resetSimulator}
                className="hf-btn-primary px-6 py-3 text-xs font-semibold rounded-lg cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
              >
                Start new interview practice
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
