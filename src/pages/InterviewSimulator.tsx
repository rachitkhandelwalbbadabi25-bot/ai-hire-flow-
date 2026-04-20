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
  RotateCcw
} from 'lucide-react';
import { generateInterviewQuestions, evaluateInterviewAnswer } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface Question {
  id: string;
  question: string;
  category: string;
  rationale?: string;
}

interface Evaluation {
  feedback: string;
  improvementTips: string[];
  score: number;
  keyPointsMissing: string[];
}

interface InterviewSimulatorProps {
  user: User;
}

import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';

export default function InterviewSimulator() {
  const { user } = useAuth();
  const { checkAccess, deductCredit } = usePlan();
  const [step, setStep] = useState<'setup' | 'interview' | 'results'>('setup');
  
  const { hasAccess, remaining, limit } = checkAccess('interviewSessions');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [recentResumeText, setRecentResumeText] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);

  // Auto-load most recent resume for context if available
  useEffect(() => {
    const fetchResume = async () => {
      const q = query(
        collection(db, 'users', user.uid, 'resumes'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setRecentResumeText(snapshot.docs[0].data().content);
      }
    };
    fetchResume();
  }, [user.uid]);

  const startInterview = async () => {
    if (!jobDescription) return;
    
    setIsGenerating(true);
    setIsFromCache(false);

    try {
      // Key on combined JD + difficulty (or just JD part for simplicity)
      const cacheKey = cacheManager.generateInterviewKey(jobDescription.slice(0, 100));
      const cached = cacheManager.get<Question[]>(cacheKey);

      if (cached) {
        setQuestions(cached);
        setIsFromCache(true);
        setStep('interview');
        setCurrentIdx(0);
        setIsGenerating(false);
        return;
      }

      if (!hasAccess) {
        alert(`Simulation bandwidth reached: ${remaining}/${limit} sessions remaining. Please upgrade for more access.`);
        setIsGenerating(false);
        return;
      }

      await deductCredit('interviewSessions');
      const qs = await generateInterviewQuestions(jobDescription, recentResumeText);
      setQuestions(qs);
      
      // Cache for 6 hours
      cacheManager.set(cacheKey, qs, 6 * 60 * 60 * 1000);

      setStep('interview');
      setCurrentIdx(0);
    } catch (error: any) {
      console.error('Failed to generate questions:', error);
      alert(error.message || "Question Synthesis Failure.");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer || isEvaluating) return;
    setIsEvaluating(true);
    const currentQ = questions[currentIdx];
    try {
      const evaluation = await evaluateInterviewAnswer(currentQ.question, userAnswer, jobDescription);
      setEvaluations(prev => ({ ...prev, [currentQ.id]: evaluation }));
      
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setUserAnswer('');
      } else {
        setStep('results');
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetSimulator = () => {
    setStep('setup');
    setQuestions([]);
    setEvaluations({});
    setCurrentIdx(0);
    setUserAnswer('');
    setJobDescription('');
  };

  const calculateTotalScore = () => {
    if (questions.length === 0) return 0;
    let total = 0;
    Object.values(evaluations).forEach((e) => {
      total += (e as Evaluation).score;
    });
    return Math.round((total / questions.length) * 10);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <BrainCircuit className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Neural Simulation</span>
          </div>
          <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">High-Velocity Drill</h1>
          <p className="text-ink-dim font-medium text-lg max-w-2xl">
            Simulate high-stakes adversarial technical and behavioral vetting sessions.
          </p>
        </div>
        <div className="px-5 py-3 bg-surface border border-border rounded-2xl flex items-center gap-3 shadow-sm self-start md:self-auto">
           <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-ink uppercase tracking-wider">Sessions Ready</span>
              <span className="text-[10px] font-bold text-ink-dim uppercase">{remaining} / {limit} Units</span>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface p-8 rounded-[2rem] border border-border shadow-2xl"
          >
            <div className="mb-8">
              <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-4 block px-1">Target Intelligence (Job Description)</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description to vectorize simulation parameters..."
                className="w-full h-64 p-6 bg-background border border-border rounded-3xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-ink-dim italic text-xs">
                {recentResumeText ? (
                  <><ShieldCheck className="w-4 h-4 text-success" /> Resume Profile Integrated</>
                ) : (
                  <><AlertCircle className="w-4 h-4" /> No Resume Found (General Simulation)</>
                )}
              </div>
              <button
                onClick={startInterview}
                disabled={!jobDescription || isGenerating}
                className="bg-accent text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Agents...
                  </>
                ) : (
                  <>
                    Deploy Simulation <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {isFromCache && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Neural Mirroring (Cached Session)</span>
                </div>
              </div>
            )}
            {/* Progress */}
            <div className="bg-surface p-4 rounded-2xl border border-border flex items-center justify-between">
              <div className="flex gap-2">
                {(questions || []).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                      i < currentIdx ? 'bg-success' : i === currentIdx ? 'bg-accent animate-pulse' : 'bg-surface-light'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-ink-dim uppercase">Node {currentIdx + 1} of {questions.length}</span>
            </div>

            {/* Question Card */}
            <div className="bg-surface p-10 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <MessageSquare className="w-32 h-32" />
               </div>
               
               <div className="relative z-10">
                  <div className="inline-block px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[10px] font-bold uppercase tracking-widest mb-6">
                    {questions[currentIdx].category}
                  </div>
                  <h3 className="text-2xl font-bold text-ink mb-6 leading-tight">
                    {questions[currentIdx].question}
                  </h3>
                  {questions[currentIdx].rationale && (
                    <p className="text-xs text-ink-dim italic mb-8 max-w-lg">“{questions[currentIdx].rationale}”</p>
                  )}

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block px-1 font-sans">Neural Transmission (Your Answer)</label>
                      <textarea
                        autoFocus
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Synthesize your response..."
                        className="w-full h-48 p-6 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed font-sans disabled:opacity-50"
                      />
                    </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={submitAnswer}
                      disabled={!userAnswer || isEvaluating}
                      className="bg-accent text-white px-10 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center gap-2 group disabled:opacity-50"
                    >
                      {isEvaluating ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Signal...</>
                      ) : (
                        <>
                          Finalize Transmission <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-2xl relative overflow-hidden text-center">
              <div className="relative z-10">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/20">
                  <Zap className="w-10 h-10 text-accent animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-ink uppercase tracking-tight mb-2">Simulation Complete</h2>
                <p className="text-ink-dim text-sm max-w-md mx-auto">Neural evaluation finished. Total vectors processed: {questions.length}</p>
                
                <div className="mt-12 flex justify-center gap-12 border-t border-border pt-12">
                   <div>
                      <p className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2">Aggregate Velocity</p>
                      <p className="text-4xl font-black text-ink">
                        {calculateTotalScore()}%
                      </p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2">Nodes Cleared</p>
                      <p className="text-4xl font-black text-success">{questions.length}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.3em] px-2">Detailed Telemetry</h3>
              {questions.map((q) => {
                const evalData = evaluations[q.id];
                return (
                  <div key={q.id} className="bg-surface border border-border rounded-3xl p-8 group hover:border-accent/30 transition-all">
                    <div className="flex gap-6">
                       <div className="flex-1">
                          <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 block">{q.category}</span>
                          <h4 className="text-lg font-bold text-ink mb-4">{q.question}</h4>
                          <div className="bg-background/50 p-6 rounded-2xl border border-border">
                             <p className="text-sm text-ink-dim italic mb-4 leading-relaxed">"{evalData?.feedback}"</p>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                                <div>
                                   <p className="text-[10px] font-bold text-ink uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <RotateCcw className="w-3 h-3 text-accent" /> Refactoring Tips
                                   </p>
                                   <ul className="space-y-2">
                                      {(evalData?.improvementTips || []).map((tip: any, i: number) => (
                                        <li key={i} className="text-[11px] text-ink-dim flex gap-2">
                                           <span className="text-accent">•</span> {tip}
                                        </li>
                                      ))}
                                   </ul>
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-ink uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3 text-success" /> Integrity Score: {evalData?.score ?? 0}/10
                                   </p>
                                   {(evalData?.keyPointsMissing?.length ?? 0) > 0 && (
                                     <ul className="space-y-2">
                                        {(evalData?.keyPointsMissing || []).map((point: any, i: number) => (
                                          <li key={i} className="text-[11px] text-rose-400 flex gap-2">
                                             <span className="text-rose-400">•</span> {point}
                                          </li>
                                        ))}
                                     </ul>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center">
               <button 
                onClick={resetSimulator}
                className="bg-accent/10 text-accent border border-accent/20 px-10 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-accent/20 transition-all"
               >
                 Initialize New Simulation Cycle
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
