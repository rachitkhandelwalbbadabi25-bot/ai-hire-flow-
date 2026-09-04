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
  GraduationCap, 
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
  BookOpen
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

export default function InterviewSimulator() {
  const { user } = useAuth();
  if (!user) return null;
  const location = useLocation();
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const { hasAccess, remaining, limit: sessionLimit } = checkAccess('interviewSessions');
  const { activeTargetRole, trackedJobs } = useSystemOS();

  const [mode, setMode] = useState<'ai' | 'text_practice'>('ai');
  const [step, setStep] = useState<'setup' | 'interview' | 'results'>('setup');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [activeQuestionEvaluation, setActiveQuestionEvaluation] = useState<Evaluation | null>(null);
  const [recentResumeText, setRecentResumeText] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const [isDegradedFallback, setIsDegradedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rubric Self-Assessment States (for Text Practice / Degraded Mode)
  const [showRubricAssessment, setShowRubricAssessment] = useState(false);
  const [selfScore, setSelfScore] = useState<number>(7);
  const [checkedKeyPoints, setCheckedKeyPoints] = useState<Record<string, boolean>>({});
  const [selfNotes, setSelfNotes] = useState('');
  const [selectedWeakSkills, setSelectedWeakSkills] = useState<string[]>([
    'System Design',
    'Concurrency & Performance',
    'React Performance',
    'SQL Optimization'
  ]);

  useEffect(() => {
    if (location.state?.jobDescription) {
      setJobDescription(location.state.jobDescription);
    } else if (location.state?.role) {
      setJobDescription(`Position: ${location.state.role}${location.state.company ? ` at ${location.state.company}` : ''}\nFocus: Technical interview, system design, and role-specific architecture.`);
    } else if (!jobDescription) {
      if (trackedJobs.length > 0) {
        setJobDescription(`Position: ${trackedJobs[0].role}\nCompany: ${trackedJobs[0].company}\nNotes: ${trackedJobs[0].notes || 'Engineering interview preparation'}`);
      } else if (activeTargetRole) {
        setJobDescription(`Target Position: ${activeTargetRole}\nCompany: Top Tier Technology Organization\nFocus: Technical architecture, high-concurrency scale, and leadership.`);
      }
    }
  }, [location.state, activeTargetRole, trackedJobs]);

  // Auto-load most recent resume for context if available
  useEffect(() => {
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
  }, [user.uid]);

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
    setShowRubricAssessment(true);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || isEvaluating) return;
    const currentQ = questions[currentIdx];

    // If in Degraded or Text Practice mode with Rubric Assessment
    if (isDegradedFallback || mode === 'text_practice' || !hasAccess) {
      const activeRubric = currentQ.rubric;
      const checkedList = activeRubric ? activeRubric.keyPoints.filter(kp => checkedKeyPoints[kp]) : [];
      const missingList = activeRubric ? activeRubric.keyPoints.filter(kp => !checkedKeyPoints[kp]) : [];

      const evaluation: Evaluation = {
        feedback: selfNotes.trim() 
          ? `Self-Reflection: ${selfNotes}`
          : (selfScore >= 8 
              ? 'Comprehensive response demonstrating deep architectural command.' 
              : selfScore >= 5 
              ? 'Solid coverage of foundational concepts with room for additional technical depth.'
              : 'Novice/Basic response. Focus on incorporating the missed key technical points.'),
        improvementTips: missingList.length > 0 
          ? missingList.map(m => `Incorporate: ${m}`)
          : ['Continue practicing time-boxed verbal articulation using the STAR framework.'],
        score: selfScore,
        keyPointsMissing: missingList,
        selfAssessed: true,
        checkedKeyPoints: checkedList
      };

      finishQuestionEvaluation(currentQ.id, evaluation);
      return;
    }

    // AI Evaluation Mode
    setIsEvaluating(true);
    try {
      const evaluation = await evaluateInterviewAnswer(currentQ.question, userAnswer, jobDescription);
      finishQuestionEvaluation(currentQ.id, evaluation);
    } catch (error) {
      console.warn('AI evaluation API unavailable, opening Rubric Self-Assessment:', error);
      setIsDegradedFallback(true);
      setShowRubricAssessment(true);
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
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer('');
      setActiveQuestionEvaluation(null);
      setShowRubricAssessment(false);
      setCheckedKeyPoints({});
      setSelfScore(7);
      setSelfNotes('');
    } else {
      // Completed all questions
      let scoreSum = 0;
      Object.values(evaluations).forEach((e: any) => {
        scoreSum += e.score;
      });
      const aggregateScore = questions.length > 0 ? Math.round((scoreSum / questions.length) * 10) : 0;

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

      setActiveQuestionEvaluation(null);
      setStep('results');
    }
  };

  const resetSimulator = () => {
    setStep('setup');
    setQuestions([]);
    setEvaluations({});
    setActiveQuestionEvaluation(null);
    setCurrentIdx(0);
    setUserAnswer('');
    setShowRubricAssessment(false);
    setIsDegradedFallback(false);
    setCheckedKeyPoints({});
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

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <BrainCircuit className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-[0.2em]">
              Interview Practice Suite
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight uppercase leading-none font-sans">
            Interview Simulator
          </h1>
          <p className="text-ink-dim text-sm sm:text-base mt-2 font-sans max-w-2xl leading-relaxed">
            Practice live technical, system design, and leadership interview drills with real-time feedback and structured rubrics.
          </p>
        </div>

        {/* Status Pill */}
        <div className="px-4 py-2.5 bg-surface border border-border rounded-2xl flex items-center gap-3 shadow-sm self-start md:self-auto shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-ink uppercase tracking-wider font-mono">Sessions Available</span>
            <span className="text-[10px] font-bold text-ink-dim uppercase font-mono">
              {formatCreditAvailability(creditWallet?.balance, creditCosts?.interviewSession ?? 25, 'sessions')}
            </span>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="my-8">
          <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing customized interview questions...
          </p>
          <SkeletonLoader type="card" lines={5} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: SETUP */}
        {step === 'setup' && !isGenerating && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-surface p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-xl space-y-6"
          >
            {/* Mode Selection Tabs */}
            <div>
              <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-3 font-mono">
                Select Simulation Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    mode === 'ai'
                      ? "bg-accent/10 border-accent text-ink ring-1 ring-accent/30"
                      : "bg-surface-light border-border text-ink-dim hover:text-ink"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold font-sans text-ink">Live AI Simulation</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase bg-accent/20 text-accent px-2 py-0.5 rounded-md">
                      Interactive AI
                    </span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-sans">
                    Custom-generated questions and automated real-time evaluation powered by Gemini.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('text_practice')}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    mode === 'text_practice'
                      ? "bg-accent/10 border-accent text-ink ring-1 ring-accent/30"
                      : "bg-surface-light border-border text-ink-dim hover:text-ink"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold font-sans text-ink">Practice with Text & Rubric</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-md">
                      Offline Ready
                    </span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-sans">
                    Distraction-free text drills using curated question banks & self-assessment rubrics. No streaming required.
                  </p>
                </button>
              </div>
            </div>

            {/* Target Role & Weak Skills Selection */}
            {mode === 'text_practice' && (
              <div className="p-4 bg-surface-light border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-accent" /> Focus on Target Weak Skills
                  </span>
                  <span className="text-[10px] text-ink-dim font-mono">Select topics to practice</span>
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
                          "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-accent text-black font-bold shadow-sm"
                            : "bg-surface border border-border text-ink-dim hover:text-ink"
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
            <div>
              <label htmlFor="interview-job-desc" className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1 font-mono">
                Target Role / Job Description Focus
              </label>
              <textarea
                id="interview-job-desc"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target role description, system design requirements, or interview topics..."
                aria-label="Job description for interview simulation"
                className="w-full h-40 p-4 sm:p-5 bg-background border border-border rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed font-sans"
              />
            </div>

            {error && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadFallbackQuestions}
                  className="px-3 py-1.5 bg-accent text-black rounded-xl font-bold font-mono text-[10px] uppercase hover:bg-accent/90 transition-colors shrink-0 cursor-pointer"
                >
                  Start Rubric Mode
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2.5 text-ink-dim text-xs">
                {recentResumeText ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium font-sans">
                    <ShieldCheck className="w-4 h-4 shrink-0" /> Master Resume Attached
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-ink-dim font-sans">
                    <HelpCircle className="w-4 h-4 shrink-0" /> General Candidate Drill
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={startInterview}
                disabled={!jobDescription || isGenerating}
                className="min-h-[44px] bg-accent text-black px-8 py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {mode === 'ai' ? (
                  <>
                    <span>Start Live AI Simulation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Start Practice Session</span>
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Mode Banner Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-2.5">
                {isDegradedFallback || mode === 'text_practice' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <BookOpen className="w-3 h-3" /> Practice with Rubric Mode
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent font-mono text-[10px] font-bold uppercase tracking-wider">
                    <Zap className="w-3 h-3" /> Live AI Interactive Mode
                  </div>
                )}

                {isFromCache && (
                  <span className="text-[10px] text-ink-dim font-mono">• Cached Session</span>
                )}
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {questions.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-all duration-300",
                        i < currentIdx ? "bg-emerald-400" : i === currentIdx ? "bg-accent animate-pulse" : "bg-surface-light border border-border"
                      )} 
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">
                  Q {currentIdx + 1} / {questions.length}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-surface p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
                    {currentQ.category}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-ink leading-snug font-sans">
                    {currentQ.question}
                  </h3>
                  {currentQ.rationale && (
                    <p className="text-xs text-ink-dim italic mt-2 font-sans">
                      “{currentQ.rationale}”
                    </p>
                  )}
                </div>

                {/* Candidate Response Field */}
                {!activeQuestionEvaluation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="interview-user-response" className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-widest block font-sans">
                        Your Technical Answer & Structured Response
                      </label>
                      <span className="text-[10px] text-ink-dim font-mono">
                        {userAnswer.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      id="interview-user-response"
                      autoFocus
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Structure your answer clearly: outline the core architecture, tradeoffs, algorithms, failure modes, or STAR situation..."
                      aria-label="Your response to the interview question"
                      className="w-full h-48 sm:h-56 p-4 sm:p-5 bg-background border border-border rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed font-sans"
                    />
                  </div>
                )}

                {/* ACTIVE QUESTION EVALUATION FEEDBACK CARD */}
                {activeQuestionEvaluation && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 sm:p-7 bg-surface-light border border-accent/30 rounded-3xl space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-accent" />
                          <h4 className="text-base sm:text-lg font-bold text-ink font-sans">
                            Candidate Response Evaluated
                          </h4>
                        </div>
                        <p className="text-xs text-ink-dim font-sans mt-0.5">
                          Evaluated against technical hiring benchmarks
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-accent/10 border border-accent/30 rounded-2xl flex items-baseline gap-1">
                          <span className="text-xs font-mono font-bold text-ink-dim uppercase">Score</span>
                          <span className="text-xl sm:text-2xl font-black font-mono text-accent">
                            {activeQuestionEvaluation.score}
                          </span>
                          <span className="text-xs font-mono text-ink-dim">/ 10</span>
                        </div>
                      </div>
                    </div>

                    {/* Candidate's Submitted Answer Snapshot */}
                    <div className="p-3.5 bg-background/60 border border-border/60 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider block">
                        Your Submitted Response:
                      </span>
                      <p className="text-xs text-ink/90 font-sans leading-relaxed line-clamp-3">
                        {userAnswer}
                      </p>
                    </div>

                    {/* Recruiter Feedback Statement */}
                    <div className="p-4 bg-background border border-border rounded-2xl space-y-2">
                      <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-accent" /> Recruiter Assessment
                      </span>
                      <p className="text-xs sm:text-sm text-ink font-sans leading-relaxed">
                        "{activeQuestionEvaluation.feedback}"
                      </p>
                    </div>

                    {/* STAR Breakdown if Available */}
                    {activeQuestionEvaluation.starScores && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-widest block">
                          STAR Framework Scoring
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                            { label: 'Situation', val: activeQuestionEvaluation.starScores.situation },
                            { label: 'Task', val: activeQuestionEvaluation.starScores.task },
                            { label: 'Action', val: activeQuestionEvaluation.starScores.action },
                            { label: 'Result', val: activeQuestionEvaluation.starScores.result }
                          ].map((item, idx) => (
                            <div key={idx} className="p-3 bg-background border border-border rounded-xl text-center">
                              <span className="text-[10px] font-mono font-bold text-ink-dim uppercase block">
                                {item.label}
                              </span>
                              <span className="text-base sm:text-lg font-black font-mono text-ink mt-0.5 block">
                                {item.val} <span className="text-[10px] text-ink-dim font-normal">/ 10</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths & Improvement Tips Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {activeQuestionEvaluation.strengths && activeQuestionEvaluation.strengths.length > 0 && (
                        <div className="p-4 bg-emerald-400/5 border border-emerald-400/20 rounded-2xl space-y-2">
                          <p className="font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Key Strengths
                          </p>
                          <ul className="space-y-1.5">
                            {activeQuestionEvaluation.strengths.map((str, i) => (
                              <li key={i} className="text-ink/90 flex items-start gap-2 font-sans">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl space-y-2">
                        <p className="font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Improvement Tips
                        </p>
                        <ul className="space-y-1.5">
                          {(activeQuestionEvaluation.improvementTips || []).map((tip, i) => (
                            <li key={i} className="text-ink/90 flex items-start gap-2 font-sans">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Advance Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleProceedToNextQuestion}
                        className="min-h-[44px] bg-accent text-black px-7 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <span>{currentIdx < questions.length - 1 ? 'Continue to Next Question' : 'View Full Simulation Report'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Action Row when not evaluating or reviewed */}
                {!activeQuestionEvaluation && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetSimulator}
                      className="min-h-[44px] px-4 py-2 text-ink-dim hover:text-ink text-xs font-mono font-bold uppercase transition-colors cursor-pointer text-left sm:text-center"
                    >
                      Cancel Drill
                    </button>

                    <div className="flex items-center gap-3">
                      {/* If in AI mode, give option to view rubric directly */}
                      {!showRubricAssessment && (
                        <button
                          type="button"
                          onClick={handleOpenRubricEvaluation}
                          disabled={!userAnswer.trim()}
                          className="min-h-[44px] px-5 py-2.5 bg-surface-light border border-border text-ink hover:bg-surface rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Sliders className="w-3.5 h-3.5 text-accent" />
                          <span>Self-Assess with Rubric</span>
                        </button>
                      )}

                      {!showRubricAssessment && mode === 'ai' && !isDegradedFallback && (
                        <button
                          type="button"
                          onClick={submitAnswer}
                          disabled={!userAnswer.trim() || isEvaluating}
                          className="min-h-[44px] bg-accent text-black px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isEvaluating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Evaluating AI Response...</span>
                            </>
                          ) : (
                            <>
                              <span>Submit to AI Evaluator</span>
                              <Send className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* INTERACTIVE SELF-ASSESSMENT RUBRIC SECTION */}
                {showRubricAssessment && currentQ.rubric && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-6 border-t border-border space-y-6"
                  >
                    <div className="bg-surface-light/80 border border-border p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                          <Award className="w-4 h-4" /> Standard Staff-Level Assessment Rubric
                        </span>
                        <span className="text-[10px] text-ink-dim font-mono">Industry Calibration Benchmarks</span>
                      </div>

                      {/* 3 Tier Level Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-surface border border-border/80 rounded-xl space-y-1">
                          <span className="text-[10px] font-mono font-bold text-ink-dim uppercase">
                            🥉 Level 1 (Basic / 0-4 Pts)
                          </span>
                          <p className="text-xs text-ink-dim leading-relaxed font-sans">
                            {currentQ.rubric.basic}
                          </p>
                        </div>

                        <div className="p-3.5 bg-surface border border-accent/30 rounded-xl space-y-1">
                          <span className="text-[10px] font-mono font-bold text-accent uppercase">
                            🥈 Level 2 (Proficient / 5-7 Pts)
                          </span>
                          <p className="text-xs text-ink/90 leading-relaxed font-sans font-medium">
                            {currentQ.rubric.proficient}
                          </p>
                        </div>

                        <div className="p-3.5 bg-surface border border-emerald-400/40 rounded-xl space-y-1">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                            🥇 Level 3 (Exemplary Staff / 8-10 Pts)
                          </span>
                          <p className="text-xs text-emerald-300/90 leading-relaxed font-sans">
                            {currentQ.rubric.exemplary}
                          </p>
                        </div>
                      </div>

                      {/* Key Points Checklist */}
                      <div className="pt-2">
                        <label className="text-[10px] font-mono font-bold text-ink uppercase tracking-wider block mb-2">
                          Key Technical Points Check (Did your response address these?):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentQ.rubric.keyPoints.map((point, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCheckedKeyPoints(prev => ({ ...prev, [point]: !prev[point] }));
                              }}
                              className={cn(
                                "p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-start gap-2.5",
                                checkedKeyPoints[point]
                                  ? "bg-emerald-400/10 border-emerald-400/40 text-emerald-300 font-medium"
                                  : "bg-surface border-border text-ink-dim hover:text-ink"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0",
                                checkedKeyPoints[point]
                                  ? "bg-emerald-400 border-emerald-400 text-black"
                                  : "border-border bg-surface-light"
                              )}>
                                {checkedKeyPoints[point] && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="leading-tight">{point}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Senior Pro-Tip Callout */}
                      <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-xl flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-ink/90 font-sans leading-relaxed">
                          <strong className="text-accent font-mono uppercase text-[10px]">Staff Pro-Tip: </strong>
                          {currentQ.rubric.proTip}
                        </p>
                      </div>

                      {/* Self-Score Selector */}
                      <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <label htmlFor="self-score-range" className="text-xs font-mono font-bold text-ink uppercase tracking-wider">
                            Your Self-Score:
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setSelfScore(num)}
                                className={cn(
                                  "w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                                  selfScore === num
                                    ? "bg-accent text-black shadow-sm"
                                    : "bg-surface border border-border text-ink-dim hover:text-ink"
                                )}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={submitAnswer}
                          className="min-h-[44px] bg-accent text-black px-6 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider hover:bg-accent/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <span>Confirm Score & Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SIMULATION RESULTS */}
        {step === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Score Banner */}
            <div className="bg-surface p-8 sm:p-10 rounded-[3rem] border border-border shadow-xl text-center relative overflow-hidden">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent/20 text-accent">
                <Zap className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink uppercase tracking-tight font-sans">
                Simulation Complete
              </h2>
              <p className="text-ink-dim text-xs sm:text-sm max-w-md mx-auto mt-1 font-sans">
                {isDegradedFallback || mode === 'text_practice' 
                  ? 'Session evaluated using standardized industry rubrics & self-calibration.' 
                  : 'AI Evaluation and score breakdown finalized.'}
              </p>
              
              <div className="mt-8 grid grid-cols-2 max-w-sm mx-auto border-t border-border/80 pt-6">
                <div>
                  <p className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-widest mb-1">Overall Score</p>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-ink">
                    {calculateTotalScore()}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-widest mb-1">Questions Drilled</p>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">{questions.length}</p>
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-ink-dim uppercase tracking-[0.2em] px-2">
                Detailed Evaluation Breakdown
              </h3>
              {questions.map((q) => {
                const evalData = evaluations[q.id];
                return (
                  <div key={q.id} className="bg-surface border border-border rounded-3xl p-6 sm:p-8 hover:border-accent/30 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
                        {q.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-ink">
                          Score: {evalData?.score ?? 0} / 10
                        </span>
                        {evalData?.selfAssessed && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                            Rubric Calibrated
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-ink font-sans">
                      {q.question}
                    </h4>

                    <div className="bg-surface-light p-4 sm:p-5 rounded-2xl border border-border/80 space-y-4">
                      <p className="text-xs text-ink-dim italic leading-relaxed font-sans">
                        "{evalData?.feedback}"
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-xs">
                        <div>
                          <p className="font-mono font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[10px]">
                            <RotateCcw className="w-3.5 h-3.5 text-accent" /> Growth Areas & Missed Concepts
                          </p>
                          <ul className="space-y-1.5">
                            {(evalData?.improvementTips || []).map((tip: any, i: number) => (
                              <li key={i} className="text-ink-dim flex items-start gap-2">
                                <span className="text-rose-400 mt-0.5">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {evalData?.checkedKeyPoints && evalData.checkedKeyPoints.length > 0 && (
                          <div>
                            <p className="font-mono font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Key Concepts Mastered
                            </p>
                            <ul className="space-y-1.5">
                              {evalData.checkedKeyPoints.map((point: any, i: number) => (
                                <li key={i} className="text-emerald-300/90 flex items-start gap-2">
                                  <span className="text-emerald-400 mt-0.5">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Steps Bridge */}
            {(() => {
              const missingPoints = Object.values(evaluations).flatMap((e: any) => e?.keyPointsMissing || []);
              const totalScore = calculateTotalScore();
              return (
                <NextStepBridgeCard
                  title="Interview Practice Complete"
                  contextData={`Overall score: ${totalScore}% across ${questions.length} drilled questions. ${missingPoints.length > 0 ? `Identified growth areas: ${missingPoints.slice(0, 3).join(', ')}.` : 'Strong mastery demonstrated across all technical topics.'}`}
                  primaryStep={{
                    label: "Close skill gaps in learning path",
                    icon: GraduationCap,
                    to: "/learning",
                    state: {
                      targetRole: activeTargetRole || "Software Engineer",
                      missingSkills: missingPoints
                    }
                  }}
                  secondaryStep={{
                    label: "Track active job applications",
                    icon: Briefcase,
                    to: "/jobs"
                  }}
                />
              );
            })()}

            <div className="flex justify-center pt-4">
              <button 
                type="button"
                onClick={resetSimulator}
                className="min-h-[44px] bg-accent text-black px-8 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest hover:bg-accent/90 transition-all cursor-pointer shadow-lg shadow-accent/20"
              >
                Start New Interview Drill
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
