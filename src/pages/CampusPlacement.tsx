import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, BookOpen, Search, Sparkles, Building2, ChevronRight, Zap, 
  Code, Play, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Loader2, 
  Lightbulb, HelpCircle, ArrowRight, Star, GraduationCap, 
  Check, RefreshCw, Send, Terminal, Award, BookCheck, MessageSquare, RotateCcw
} from 'lucide-react';
import { 
  generateCompanyPrep, 
  generateAptitudeQuestions, 
  generateStartupChallenge, 
  evaluateStartupSolution 
} from '../lib/gemini';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import { isDemoRole } from '../utils/demoDataSanitizer';
import { cn } from '../lib/utils';

const CAMPUS_STORAGE_KEYS = {
  SEARCH_QUERY: 'campus_prep_search_query',
  COMPANY_PREP: 'campus_prep_company_prep',
  ACTIVE_DRILL_TOPIC: 'campus_prep_active_drill_topic',
  DRILL_QUESTIONS: 'campus_prep_drill_questions',
  CURRENT_Q_INDEX: 'campus_prep_current_q_index',
  SELECTED_OPT_INDEX: 'campus_prep_selected_opt_index',
  IS_ANSWERED: 'campus_prep_is_answered',
  DRILL_SCORE: 'campus_prep_drill_score',
  DRILL_COMPLETE: 'campus_prep_drill_complete',
  DRILL_ATTEMPT_MAP: 'campus_prep_drill_attempt_map',
  PREV_QUESTIONS_MAP: 'campus_prep_prev_questions_map',
  ACTIVE_STARTUP_TRACK: 'campus_prep_active_startup_track',
  STARTUP_CHALLENGE: 'campus_prep_startup_challenge',
  PROPOSED_SOLUTION: 'campus_prep_proposed_solution',
  SOLUTION_FEEDBACK: 'campus_prep_solution_feedback'
};

export default function CampusPlacement() {
  // Company Search State - starts cleanly empty on fresh start
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.SEARCH_QUERY);
      if (saved && !isDemoRole(saved) && !saved.toLowerCase().includes('sarvam') && !saved.toLowerCase().includes('target organization')) {
        return saved;
      }
      return '';
    } catch {
      return '';
    }
  });
  const [searching, setSearching] = useState(false);
  const [companyPrep, setCompanyPrep] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.COMPANY_PREP);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !isDemoRole(parsed.companyName) && !parsed.companyName?.toLowerCase().includes('sarvam') && !parsed.companyName?.toLowerCase().includes('target organization')) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [searchError, setSearchError] = useState<string | null>(null);

  // Interactive Aptitude Drill State
  const [activeDrillTopic, setActiveDrillTopic] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(CAMPUS_STORAGE_KEYS.ACTIVE_DRILL_TOPIC) || null;
    } catch {
      return null;
    }
  });
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<any[]>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.DRILL_QUESTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.CURRENT_Q_INDEX);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.SELECTED_OPT_INDEX);
      return saved !== null ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [isAnswered, setIsAnswered] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(CAMPUS_STORAGE_KEYS.IS_ANSWERED) === 'true';
    } catch {
      return false;
    }
  });
  const [drillScore, setDrillScore] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.DRILL_SCORE);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [drillComplete, setDrillComplete] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(CAMPUS_STORAGE_KEYS.DRILL_COMPLETE) === 'true';
    } catch {
      return false;
    }
  });
  const [drillError, setDrillError] = useState<string | null>(null);
  const [drillAttemptMap, setDrillAttemptMap] = useState<Record<string, number>>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.DRILL_ATTEMPT_MAP);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [previousQuestionsMap, setPreviousQuestionsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.PREV_QUESTIONS_MAP);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Startup Elite Program State
  const [activeStartupTrack, setActiveStartupTrack] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(CAMPUS_STORAGE_KEYS.ACTIVE_STARTUP_TRACK) || null;
    } catch {
      return null;
    }
  });
  const [loadingStartup, setLoadingStartup] = useState(false);
  const [startupChallenge, setStartupChallenge] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.STARTUP_CHALLENGE);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [proposedSolution, setProposedSolution] = useState<string>(() => {
    try {
      return sessionStorage.getItem(CAMPUS_STORAGE_KEYS.PROPOSED_SOLUTION) || '';
    } catch {
      return '';
    }
  });
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [solutionFeedback, setSolutionFeedback] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem(CAMPUS_STORAGE_KEYS.SOLUTION_FEEDBACK);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync state to sessionStorage to preserve across navigation (NAVIGATION != RESET)
  useEffect(() => {
    try {
      if (searchQuery) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.SEARCH_QUERY, searchQuery);
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SEARCH_QUERY);
      }
    } catch {}
  }, [searchQuery]);

  useEffect(() => {
    try {
      if (companyPrep) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.COMPANY_PREP, JSON.stringify(companyPrep));
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.COMPANY_PREP);
      }
    } catch {}
  }, [companyPrep]);

  useEffect(() => {
    try {
      if (activeDrillTopic) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.ACTIVE_DRILL_TOPIC, activeDrillTopic);
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.ACTIVE_DRILL_TOPIC);
      }
    } catch {}
  }, [activeDrillTopic]);

  useEffect(() => {
    try {
      if (drillQuestions.length > 0) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.DRILL_QUESTIONS, JSON.stringify(drillQuestions));
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.DRILL_QUESTIONS);
      }
    } catch {}
  }, [drillQuestions]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.CURRENT_Q_INDEX, currentQuestionIndex.toString());
      if (selectedOptionIndex !== null) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.SELECTED_OPT_INDEX, selectedOptionIndex.toString());
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SELECTED_OPT_INDEX);
      }
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.IS_ANSWERED, isAnswered ? 'true' : 'false');
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.DRILL_SCORE, drillScore.toString());
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.DRILL_COMPLETE, drillComplete ? 'true' : 'false');
    } catch {}
  }, [currentQuestionIndex, selectedOptionIndex, isAnswered, drillScore, drillComplete]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.DRILL_ATTEMPT_MAP, JSON.stringify(drillAttemptMap));
    } catch {}
  }, [drillAttemptMap]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CAMPUS_STORAGE_KEYS.PREV_QUESTIONS_MAP, JSON.stringify(previousQuestionsMap));
    } catch {}
  }, [previousQuestionsMap]);

  useEffect(() => {
    try {
      if (activeStartupTrack) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.ACTIVE_STARTUP_TRACK, activeStartupTrack);
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.ACTIVE_STARTUP_TRACK);
      }
    } catch {}
  }, [activeStartupTrack]);

  useEffect(() => {
    try {
      if (startupChallenge) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.STARTUP_CHALLENGE, JSON.stringify(startupChallenge));
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.STARTUP_CHALLENGE);
      }
    } catch {}
  }, [startupChallenge]);

  useEffect(() => {
    try {
      if (proposedSolution) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.PROPOSED_SOLUTION, proposedSolution);
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.PROPOSED_SOLUTION);
      }
    } catch {}
  }, [proposedSolution]);

  useEffect(() => {
    try {
      if (solutionFeedback) {
        sessionStorage.setItem(CAMPUS_STORAGE_KEYS.SOLUTION_FEEDBACK, JSON.stringify(solutionFeedback));
      } else {
        sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SOLUTION_FEEDBACK);
      }
    } catch {}
  }, [solutionFeedback]);

  // ----------------------------------------------------
  // Explicit Reset & Clear Handlers (Only explicit reset removes state)
  // ----------------------------------------------------
  const handleClearCompanyPrep = () => {
    setCompanyPrep(null);
    setSearchQuery('');
    setSearchError(null);
    try {
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.COMPANY_PREP);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SEARCH_QUERY);
    } catch {}
  };

  const handleQuitDrill = () => {
    setActiveDrillTopic(null);
    setDrillQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setDrillScore(0);
    setDrillComplete(false);
    setDrillError(null);
    try {
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.ACTIVE_DRILL_TOPIC);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.DRILL_QUESTIONS);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.CURRENT_Q_INDEX);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SELECTED_OPT_INDEX);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.IS_ANSWERED);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.DRILL_SCORE);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.DRILL_COMPLETE);
    } catch {}
  };

  const handleClearStartupTrack = () => {
    setActiveStartupTrack(null);
    setStartupChallenge(null);
    setProposedSolution('');
    setSolutionFeedback(null);
    try {
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.ACTIVE_STARTUP_TRACK);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.STARTUP_CHALLENGE);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.PROPOSED_SOLUTION);
      sessionStorage.removeItem(CAMPUS_STORAGE_KEYS.SOLUTION_FEEDBACK);
    } catch {}
  };

  const handleResetAllCampusPrep = () => {
    handleClearCompanyPrep();
    handleQuitDrill();
    handleClearStartupTrack();
    setDrillAttemptMap({});
    setPreviousQuestionsMap({});
    try {
      Object.values(CAMPUS_STORAGE_KEYS).forEach(k => sessionStorage.removeItem(k));
    } catch {}
  };

  const hasAnySavedData = Boolean(companyPrep || activeDrillTopic || activeStartupTrack);

  // ----------------------------------------------------
  // API Core Callers
  // ----------------------------------------------------

  const handleCompanySearch = async (company: string) => {
    if (!company.trim()) return;
    setSearching(true);
    setSearchError(null);
    setCompanyPrep(null);
    try {
      const data = await generateCompanyPrep(company.trim());
      setCompanyPrep(data);
    } catch (err) {
      console.error(err);
      setSearchError("Failed to generate custom placement plan for this company. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleStartAptitudeDrill = async (topic: string | null) => {
    if (!topic || loadingDrill) return;

    // Reset drill UI state and clear errors
    setActiveDrillTopic(topic);
    setLoadingDrill(true);
    setDrillError(null);
    setDrillQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setDrillScore(0);
    setDrillComplete(false);

    const nextAttempt = (drillAttemptMap[topic] || 0) + 1;
    setDrillAttemptMap(prev => ({ ...prev, [topic]: nextAttempt }));

    const previousQuestions = previousQuestionsMap[topic] || [];

    try {
      const data = await generateAptitudeQuestions(topic, {
        attempt: nextAttempt,
        previousQuestions,
        seed: `${topic}-${nextAttempt}-${Date.now()}`
      });

      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setDrillQuestions(data.questions);
        const newQuestions = data.questions.map((q: any) => q.question);
        setPreviousQuestionsMap(prev => ({
          ...prev,
          [topic]: [...(prev[topic] || []), ...newQuestions].slice(-30)
        }));
      } else {
        throw new Error(`No questions generated for "${topic}". Please try again.`);
      }
    } catch (err: any) {
      console.error('[CampusPrep] Drill generation error:', err);
      setDrillError(err?.message || `Failed to generate a new drill for "${topic}". Please try again.`);
    } finally {
      setLoadingDrill(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOptionIndex(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOptionIndex === null || isAnswered) return;
    setIsAnswered(true);
    if (selectedOptionIndex === drillQuestions[currentQuestionIndex].correctIndex) {
      setDrillScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < drillQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
    } else {
      setDrillComplete(true);
    }
  };

  const handleStartStartupChallenge = async (track: string) => {
    setActiveStartupTrack(track);
    setLoadingStartup(true);
    setStartupChallenge(null);
    setProposedSolution('');
    setSolutionFeedback(null);
    try {
      const data = await generateStartupChallenge(track);
      setStartupChallenge(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStartup(false);
    }
  };

  const handleSubmitStartupSolution = async () => {
    if (!proposedSolution.trim() || !startupChallenge) return;
    setSubmittingSolution(true);
    setSolutionFeedback(null);
    try {
      const requirementsText = `Title: ${startupChallenge.title}\nRequirements: ${startupChallenge.description}\nScale context: ${startupChallenge.scaleContext}`;
      const data = await evaluateStartupSolution(
        startupChallenge.title,
        requirementsText,
        proposedSolution.trim()
      );
      setSolutionFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingSolution(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-[var(--hf-ai-teal)]" />
            </div>
            <span className="hf-badge hf-badge-teal text-xs font-medium">
              Campus preparation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--hf-text)] tracking-tight">
            Campus placement preparation
          </h1>
          <p className="text-sm text-[var(--hf-text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
            Search tech companies for tailored recruitment guidelines, practice interactive aptitude drills, and solve startup architecture challenges.
          </p>
        </div>
        {hasAnySavedData && (
          <button
            type="button"
            onClick={handleResetAllCampusPrep}
            className="hf-btn-secondary min-h-[44px] px-4 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] self-start sm:self-auto"
            title="Explicitly clear all cached prep, drills, and challenges"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset all prep</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Company Search & Aptitude Drill */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECTION 1: Company Prep Search Engine */}
          <div className="hf-card p-6 sm:p-7 rounded-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center">
                <Search className="w-4.5 h-4.5 text-[var(--hf-ai-teal)]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--hf-text)] tracking-tight">
                  Company recruitment preparation
                </h2>
                <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                  Generate tailored interview and aptitude guidelines for a target tech company or campus recruiter
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text"
                  placeholder="Enter target company (e.g. Infosys, TCS, Google, Amazon, Zoho)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch(searchQuery)}
                  aria-label="Target company name"
                  className="flex-1 bg-[var(--hf-surface)] border border-[var(--hf-border)] px-4 py-3 rounded-lg text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors min-h-[44px]"
                />
                <button 
                  type="button"
                  onClick={() => handleCompanySearch(searchQuery)}
                  disabled={searching || !searchQuery.trim()}
                  className="hf-btn-primary min-h-[44px] px-5 py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] shrink-0"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate company plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message with role="alert" */}
            {searchError && (
              <div 
                role="alert" 
                aria-live="assertive"
                className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-error)] rounded-xl flex items-center gap-3 text-xs"
              >
                <AlertCircle className="w-4 h-4 text-[var(--hf-error)] shrink-0" />
                <span className="text-[var(--hf-text)] leading-relaxed font-medium">{searchError}</span>
              </div>
            )}

            {/* SEARCH RESULTS INTERACTIVE PANEL */}
            <AnimatePresence mode="wait">
              {searching && (
                <div 
                  aria-live="polite" 
                  className="py-10 flex flex-col items-center justify-center gap-3 text-center"
                >
                  <Loader2 className="w-7 h-7 text-[var(--hf-cta)] animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--hf-text)]">
                      Preparing recruitment plan for {searchQuery || 'your target company'}...
                    </p>
                    <p className="text-xs text-[var(--hf-text-secondary)]">
                      Analyzing hiring rounds, core technical questions, and interview strategy.
                    </p>
                  </div>
                </div>
              )}

              {companyPrep && !searching && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-6 pt-2"
                >
                  {/* Results Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hf-border)] pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="hf-badge hf-badge-teal text-xs font-medium">
                          Company preparation guide
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-[var(--hf-text)] tracking-tight flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[var(--hf-ai-teal)]" />
                        <span>{companyPrep.companyName}</span>
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {companyPrep.difficulty && (
                        <div className="px-3 py-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-left">
                          <span className="text-[11px] font-medium text-[var(--hf-text-secondary)] block">
                            Difficulty (AI estimate)
                          </span>
                          <span className={cn(
                            "text-xs font-semibold",
                            companyPrep.difficulty === "Hard" ? "text-[var(--hf-error)]" : 
                            companyPrep.difficulty === "Medium" ? "text-[var(--hf-warning)]" : "text-[var(--hf-success)]"
                          )}>
                            {companyPrep.difficulty}
                          </span>
                        </div>
                      )}

                      {companyPrep.estimatedPrepTime && (
                        <div className="px-3 py-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-left">
                          <span className="text-[11px] font-medium text-[var(--hf-text-secondary)] block">
                            Prep timeline (AI estimate)
                          </span>
                          <span className="text-xs font-semibold text-[var(--hf-text)]">
                            {companyPrep.estimatedPrepTime}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleClearCompanyPrep}
                        className="hf-btn-secondary min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                        title="Clear company preparation plan"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear plan</span>
                      </button>
                    </div>
                  </div>

                  {/* Fixed Honesty Disclaimer Note */}
                  <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
                    <span>
                      AI-generated plan. It may not match this company's actual hiring process. Check official sources and recent candidate reports.
                    </span>
                  </div>

                  {/* Recruitment Rounds Breakdown */}
                  {Array.isArray(companyPrep.roundBreakdown) && companyPrep.roundBreakdown.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                        <h4 className="text-xs font-semibold text-[var(--hf-text)] uppercase tracking-wider">
                          Interviews & placement stages
                        </h4>
                      </div>
                      <div className="space-y-2.5">
                        {companyPrep.roundBreakdown.map((round: any, rIdx: number) => (
                          <div 
                            key={rIdx} 
                            className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text)] flex items-center justify-center text-xs font-semibold">
                                {rIdx + 1}
                              </span>
                              <h5 className="text-xs font-semibold text-[var(--hf-text)]">
                                {round.roundName}
                              </h5>
                            </div>
                            {round.description && (
                              <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed pl-7.5">
                                {round.description}
                              </p>
                            )}
                            {Array.isArray(round.focusTopics) && round.focusTopics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-7.5 pt-1">
                                {round.focusTopics.map((topic: string, tIdx: number) => (
                                  <span 
                                    key={tIdx} 
                                    className="px-2 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded text-[11px] font-mono text-[var(--hf-text-secondary)]"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practice Questions (renamed from High-Probability Questions) */}
                  {Array.isArray(companyPrep.topQuestions) && companyPrep.topQuestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                        <h4 className="text-xs font-semibold text-[var(--hf-text)] uppercase tracking-wider">
                          Practice questions
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {companyPrep.topQuestions.map((qObj: any, qIdx: number) => (
                          <div 
                            key={qIdx} 
                            className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <HelpCircle className="w-4 h-4 text-[var(--hf-ai-teal)] shrink-0 mt-0.5" />
                              <span className="text-xs font-semibold text-[var(--hf-text)] leading-relaxed">
                                {qObj.question}
                              </span>
                            </div>

                            <div className="pl-6.5 space-y-2">
                              {qObj.topic && (
                                <span className="text-[11px] text-[var(--hf-text-secondary)] font-medium block">
                                  Topic focus: <span className="text-[var(--hf-text)]">{qObj.topic}</span>
                                </span>
                              )}
                              {qObj.tip && (
                                <div className="p-3 bg-[var(--hf-surface)] rounded-md border border-[var(--hf-border)] flex items-start gap-2 text-xs">
                                  <Lightbulb className="w-3.5 h-3.5 text-[var(--hf-warning)] shrink-0 mt-0.5" />
                                  <p className="text-[var(--hf-text-secondary)] leading-relaxed">
                                    <strong className="text-[var(--hf-text)] font-medium">Preparation tip: </strong>
                                    {qObj.tip}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preparation Strategy Quote */}
                  {companyPrep.prepStrategy && (
                    <div className="p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg space-y-1 text-xs">
                      <span className="font-semibold text-[var(--hf-text)] block">
                        Preparation advice
                      </span>
                      <p className="text-[var(--hf-text-secondary)] leading-relaxed italic">
                        "{companyPrep.prepStrategy}"
                      </p>
                    </div>
                  )}

                  {/* Contextual Next Step Bridge Card */}
                  <NextStepBridgeCard
                    title="Preparation plan"
                    contextData={`Generated interview blueprint for ${searchQuery || 'Target Enterprise'} with ${companyPrep.rounds?.length || 0} evaluation stages and ${companyPrep.topQuestions?.length || 0} core technical drill questions.`}
                    primaryStep={{
                      label: `Simulate ${searchQuery || 'Company'} interview`,
                      icon: MessageSquare,
                      to: "/interview",
                      state: {
                        company: searchQuery || "Campus Recruiter",
                        role: "Software Development Engineer",
                        jobDescription: `Company: ${searchQuery || 'Enterprise'}\nBlueprint Strategy: ${companyPrep.prepStrategy || ''}`
                      }
                    }}
                    secondaryStep={{
                      label: "Find open roles",
                      icon: Search,
                      to: "/jobs",
                      state: {
                        query: `${searchQuery || 'Tech'} Software Engineer`,
                        autoSearch: true
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 2: AI-Generated Aptitude & Technical Practice Drills */}
          <div className="hf-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                <Code className="w-5 h-5 text-[var(--hf-ai-teal)]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--hf-text)]">
                  Aptitude practice drills
                </h2>
                <p className="text-xs text-[var(--hf-text-secondary)]">
                  AI-generated practice questions to test problem-solving and fundamentals
                </p>
              </div>
            </div>

            {/* Fixed Accuracy & Source Notice */}
            <div className="mb-6 p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-xs text-[var(--hf-text-secondary)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
              <span>
                Questions and answer explanations are AI-generated and may contain mistakes. Verify anything you are unsure about.
              </span>
            </div>

            {/* Drill Topic Selector */}
            {!activeDrillTopic && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Logical & Quantitative", desc: "Probability, P&C, Time & Speed, Syllogisms", icon: Zap },
                  { title: "CS Fundamentals", desc: "Object-Oriented Programming, OS, DBMS Joins", icon: Code },
                  { title: "System Design", desc: "Caching, Load Balancers, Databases, API Scaling", icon: Star }
                ].map((drill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStartAptitudeDrill(drill.title)}
                    className="p-5 bg-[var(--hf-surface)] border border-[var(--hf-border)] hover:border-[var(--hf-cta)] rounded-lg transition-all text-left flex flex-col justify-between group h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]/20"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center mb-3">
                        <drill.icon className="w-4 h-4 text-[var(--hf-ai-teal)]" />
                      </div>
                      <h3 className="font-semibold text-sm text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] transition-colors">
                        {drill.title}
                      </h3>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-1.5 leading-normal">
                        {drill.desc}
                      </p>
                    </div>
                    <div className="text-xs font-medium text-[var(--hf-cta)] flex items-center gap-1 mt-5">
                      Start drill <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ACTIVE DRILL WORKSPACE */}
            {activeDrillTopic && (
              <div className="border border-[var(--hf-border)] bg-[var(--hf-surface)] rounded-lg p-5 sm:p-6">
                
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-[var(--hf-border)] pb-4 mb-6">
                  <div>
                    <span className="text-xs text-[var(--hf-text-secondary)] block">
                      Practice session
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--hf-text)] mt-0.5">
                      {activeDrillTopic}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuitDrill}
                    className="hf-btn-secondary text-xs px-3 py-1.5 cursor-pointer"
                  >
                    End session
                  </button>
                </div>

                {loadingDrill ? (
                  <div className="py-14 flex flex-col items-center justify-center gap-3 text-center" aria-live="polite">
                    <Loader2 className="w-7 h-7 text-[var(--hf-ai-teal)] animate-spin" />
                    <div>
                      <span className="text-sm font-medium text-[var(--hf-text)] block">
                        Generating practice questions...
                      </span>
                      <span className="text-xs text-[var(--hf-text-secondary)] mt-1 block">
                        Attempt {(drillAttemptMap[activeDrillTopic || ''] || 1)}
                      </span>
                    </div>
                  </div>
                ) : drillError ? (
                  <div className="py-10 px-4 text-center max-w-md mx-auto" role="alert" aria-live="assertive">
                    <div className="w-10 h-10 bg-[var(--hf-error)]/10 border border-[var(--hf-error)]/20 text-[var(--hf-error)] rounded-lg flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--hf-text)] mb-1">
                      Failed to load drill
                    </h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] mb-5 leading-relaxed">
                      {drillError}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartAptitudeDrill(activeDrillTopic)}
                        disabled={loadingDrill}
                        className="hf-btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={handleQuitDrill}
                        className="hf-btn-secondary flex-1 text-xs py-2.5 cursor-pointer"
                      >
                        Choose topic
                      </button>
                    </div>
                  </div>
                ) : drillComplete ? (
                  /* Score and completion view */
                  <div className="text-center py-8 max-w-md mx-auto">
                    <div className="w-12 h-12 bg-[var(--hf-success)]/10 border border-[var(--hf-success)]/20 text-[var(--hf-success)] rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--hf-text)] mb-1">
                      Drill complete
                    </h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] mb-6">
                      You finished all questions in this practice set.
                    </p>
                    
                    <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-4 rounded-lg mb-6 flex items-center justify-around">
                      <div>
                        <span className="text-xs text-[var(--hf-text-secondary)] block">
                          Questions
                        </span>
                        <span className="text-lg font-semibold text-[var(--hf-text)]">
                          {drillQuestions.length}
                        </span>
                      </div>
                      <div className="border-r border-[var(--hf-border)] h-8"></div>
                      <div>
                        <span className="text-xs text-[var(--hf-text-secondary)] block">
                          Result
                        </span>
                        <span className="text-lg font-semibold text-[var(--hf-success)]">
                          {drillScore} of {drillQuestions.length} correct
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--hf-text-muted)] mb-6">
                      Result measures answers you got right in this practice drill.
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartAptitudeDrill(activeDrillTopic)}
                        disabled={loadingDrill}
                        className="hf-btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingDrill ? 'animate-spin' : ''}`} />
                        Practice again
                      </button>
                      <button
                        type="button"
                        onClick={handleQuitDrill}
                        disabled={loadingDrill}
                        className="hf-btn-secondary flex-1 text-xs py-2.5 cursor-pointer"
                      >
                        Choose topic
                      </button>
                    </div>
                  </div>
                ) : drillQuestions.length > 0 ? (
                  /* Standard Question State */
                  <div>
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-[var(--hf-text-secondary)] mb-2">
                        <span>Question {currentQuestionIndex + 1} of {drillQuestions.length}</span>
                        <span>{drillScore} of {drillQuestions.length} correct</span>
                      </div>
                      <div className="w-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[var(--hf-cta)] h-full transition-all duration-300" 
                          style={{ width: `${((currentQuestionIndex + 1) / drillQuestions.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-4 sm:p-5 rounded-lg mb-5">
                      <p className="text-sm font-medium text-[var(--hf-text)] leading-relaxed">
                        {drillQuestions[currentQuestionIndex].question}
                      </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2.5 mb-6">
                      {drillQuestions[currentQuestionIndex].options?.map((opt: string, optIdx: number) => {
                        const isSelected = selectedOptionIndex === optIdx;
                        const correctIdx = drillQuestions[currentQuestionIndex].correctIndex;
                        
                        let cardStyle = "bg-[var(--hf-surface)] border-[var(--hf-border)] hover:border-[var(--hf-cta)]/50 text-[var(--hf-text)]";
                        if (isAnswered) {
                          if (optIdx === correctIdx) {
                            cardStyle = "bg-[var(--hf-success)]/10 border-[var(--hf-success)] text-[var(--hf-success)] font-medium";
                          } else if (isSelected) {
                            cardStyle = "bg-[var(--hf-error)]/10 border-[var(--hf-error)] text-[var(--hf-error)] font-medium";
                          } else {
                            cardStyle = "bg-[var(--hf-surface)] border-[var(--hf-border)]/50 text-[var(--hf-text-secondary)] opacity-60";
                          }
                        } else if (isSelected) {
                          cardStyle = "bg-[var(--hf-cta)]/5 border-[var(--hf-cta)] text-[var(--hf-cta)] font-medium";
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`w-full p-3.5 border text-left rounded-lg text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${cardStyle}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && optIdx === correctIdx && (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-success)] shrink-0 ml-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Correct</span>
                              </span>
                            )}
                            {isAnswered && isSelected && optIdx !== correctIdx && (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hf-error)] shrink-0 ml-2">
                                <XCircle className="w-4 h-4" />
                                <span>Incorrect</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions Panel */}
                    <div className="border-t border-[var(--hf-border)] pt-5">
                      {isAnswered ? (
                        <div className="w-full space-y-4">
                          {/* Explanation Card */}
                          <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-4 rounded-lg text-xs">
                            <span className="font-semibold text-[var(--hf-text)] block mb-1">
                              Explanation
                            </span>
                            <p className="text-[var(--hf-text-secondary)] leading-relaxed">
                              {drillQuestions[currentQuestionIndex].explanation}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="hf-btn-primary w-full py-2.5 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>{currentQuestionIndex + 1 === drillQuestions.length ? "Finish drill" : "Next question"}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmAnswer}
                          disabled={selectedOptionIndex === null}
                          className="hf-btn-primary w-full py-2.5 text-xs sm:text-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Check answer
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center max-w-sm mx-auto space-y-4">
                    <p className="text-xs text-[var(--hf-text-secondary)]">
                      No questions generated for this drill topic.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartAptitudeDrill(activeDrillTopic)}
                      disabled={loadingDrill}
                      className="hf-btn-primary text-xs px-4 py-2 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate questions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Startup Architecture Challenge & Hiring Notes */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="hf-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[var(--hf-ai-teal)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--hf-text)]">
                  Startup architecture challenge
                </h2>
                <p className="text-xs text-[var(--hf-text-secondary)]">
                  AI-evaluated scenarios testing system choices and scale constraints
                </p>
              </div>
            </div>

            {/* Fixed Disclaimer */}
            <div className="mb-5 p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-xs text-[var(--hf-text-secondary)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
              <span>
                AI-generated scenario. Challenges and evaluations test reasoning against hypothetical constraints.
              </span>
            </div>

            {/* Specialization Options */}
            {!activeStartupTrack ? (
              <div className="space-y-3">
                {[
                  { title: "Frontend Specialist (React)", role: "Frontend", desc: "State management, performance, core web vitals" },
                  { title: "Backend Architect (Node)", role: "Backend", desc: "System design, microservices, database scale" },
                  { title: "Full-Stack Builder", role: "Full-Stack", desc: "End-to-end integration, API contracts, deployment" }
                ].map((track, i) => (
                  <button 
                    key={i}
                    type="button"
                    onClick={() => handleStartStartupChallenge(track.title)}
                    className="w-full p-4 bg-[var(--hf-surface)] border border-[var(--hf-border)] hover:border-[var(--hf-cta)] rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]/20"
                  >
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] transition-colors">
                        {track.role}
                      </h3>
                      <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                        {track.desc}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--hf-text-muted)] group-hover:text-[var(--hf-cta)] transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            ) : (
              /* ACTIVE CHALLENGE VIEW: Dark panel allowed for focused challenge area */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hf-border)] pb-3">
                  <div>
                    <span className="text-xs text-[var(--hf-text-secondary)] block">
                      Active scenario
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--hf-text)]">
                      {activeStartupTrack.split(' (')[0]}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleClearStartupTrack}
                    className="hf-btn-secondary text-xs px-2.5 py-1.5 cursor-pointer"
                  >
                    Change track
                  </button>
                </div>

                {loadingStartup ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center" aria-live="polite">
                    <Loader2 className="w-7 h-7 text-[var(--hf-ai-teal)] animate-spin" />
                    <div>
                      <span className="text-xs sm:text-sm font-medium text-[var(--hf-text)] block">
                        Synthesizing challenge...
                      </span>
                      <span className="text-xs text-[var(--hf-text-secondary)] mt-0.5 block">
                        Preparing system requirements and scale constraints
                      </span>
                    </div>
                  </div>
                ) : startupChallenge ? (
                  <div className="space-y-4">
                    {/* Focused Challenge Card */}
                    <div className="p-4 bg-[var(--hf-dark-panel)] border border-[var(--hf-border)] rounded-lg text-[#F8FAFC]">
                      <span className="hf-badge hf-badge-teal text-xs mb-2">
                        AI-generated scenario
                      </span>
                      <h3 className="text-sm font-semibold text-white mt-1 mb-1.5">
                        {startupChallenge.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {startupChallenge.description}
                      </p>
                      <div className="p-2.5 bg-black/25 border border-white/10 rounded-md flex items-start gap-2">
                        <Terminal className="w-4 h-4 text-[var(--hf-ai-teal)] shrink-0 mt-0.5" />
                        <span className="text-xs font-mono text-slate-200">
                          Scale constraint: {startupChallenge.scaleContext}
                        </span>
                      </div>
                    </div>

                    {/* Core Architectural Task */}
                    <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg">
                      <span className="text-xs font-semibold text-[var(--hf-text)] block mb-1">
                        Your engineering task
                      </span>
                      <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                        {startupChallenge.coreTask}
                      </p>
                    </div>

                    {/* Requirements checklist */}
                    {startupChallenge.checklist?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-[var(--hf-text)] block mb-1">
                          Key requirements to address
                        </span>
                        {startupChallenge.checklist.map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-[var(--hf-text-secondary)]">
                            <Check className="w-3.5 h-3.5 text-[var(--hf-ai-teal)] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input Solution */}
                    {!solutionFeedback && (
                      <div className="space-y-2.5 pt-2">
                        <label 
                          htmlFor="solution-strategy-input"
                          className="text-xs font-semibold text-[var(--hf-text)] block"
                        >
                          Proposed architecture solution
                        </label>
                        <textarea
                          id="solution-strategy-input"
                          placeholder="Detail your database choice, system architecture, caching strategy, and framework pathways to solve this..."
                          value={proposedSolution}
                          onChange={(e) => setProposedSolution(e.target.value)}
                          rows={6}
                          className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] p-3 rounded-lg text-sm text-[var(--hf-text)] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]/20 focus:border-[var(--hf-cta)] resize-y min-h-[120px]"
                        />
                        <button
                          type="button"
                          onClick={handleSubmitStartupSolution}
                          disabled={submittingSolution || !proposedSolution.trim()}
                          className="hf-btn-primary w-full py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {submittingSolution ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Evaluating solution...
                            </span>
                          ) : (
                            "Submit solution"
                          )}
                        </button>
                      </div>
                    )}

                    {/* Technical Architecture Evaluation Feedback */}
                    {solutionFeedback && (
                      <div className="space-y-4 pt-3 border-t border-[var(--hf-border)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg">
                          <div>
                            <span className="text-xs text-[var(--hf-text-secondary)] block">
                              Technical architecture evaluation
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-[var(--hf-text)]">
                              AI estimate: {solutionFeedback.score} / 100
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold self-start sm:self-auto ${
                            solutionFeedback.score >= 80 ? 'bg-[var(--hf-success)]/10 text-[var(--hf-success)] border border-[var(--hf-success)]/20' :
                            solutionFeedback.score >= 60 ? 'bg-[var(--hf-warning)]/10 text-[var(--hf-warning)] border border-[var(--hf-warning)]/20' : 
                            'bg-[var(--hf-error)]/10 text-[var(--hf-error)] border border-[var(--hf-error)]/20'
                          }`}>
                            {solutionFeedback.grade}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--hf-text-muted)]">
                          This is an AI evaluation of your written solution. It is not a hiring decision and may miss or misjudge details. Measures how well the written solution covers stated requirements and scale constraints.
                        </p>

                        {/* Scale Strategy Critique */}
                        <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-xs space-y-3">
                          <div>
                            <span className="font-semibold text-[var(--hf-text)] block mb-1">
                              Scale strategy critique
                            </span>
                            <p className="text-[var(--hf-text-secondary)] leading-relaxed">
                              {solutionFeedback.scaleCheck}
                            </p>
                          </div>
                          
                          <div className="border-t border-[var(--hf-border)] pt-2.5">
                            <span className="font-semibold text-[var(--hf-text)] block mb-1">
                              Architecture & implementation feedback
                            </span>
                            <p className="text-[var(--hf-text-secondary)] leading-relaxed whitespace-pre-line">
                              {solutionFeedback.feedback}
                            </p>
                          </div>
                        </div>

                        {/* Reference Approach */}
                        <div className="p-3.5 bg-[var(--hf-dark-panel)] border border-[var(--hf-border)] rounded-lg text-xs text-slate-200">
                          <span className="text-xs font-semibold text-white block mb-1.5">
                            Reference approach (AI-generated)
                          </span>
                          <p className="text-slate-300 leading-relaxed font-sans">
                            {startupChallenge.modelSolutionArchitecture}
                          </p>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setSolutionFeedback(null);
                            setProposedSolution('');
                          }}
                          className="hf-btn-secondary w-full py-2 text-xs cursor-pointer"
                        >
                          Revise solution
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* General Campus Hiring Notes */}
          <div className="hf-card p-6">
            <h3 className="text-sm font-semibold text-[var(--hf-text)] mb-2 flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-[var(--hf-ai-teal)]" />
              General campus hiring notes
            </h3>
            
            <p className="text-xs text-[var(--hf-text-muted)] mb-4">
              General observations written into the app. They are not live data and may be out of date.
            </p>

            <ul className="space-y-3.5 text-xs text-[var(--hf-text-secondary)]">
              <li className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--hf-cta)] shrink-0" />
                <p className="leading-relaxed">
                  Global Capability Centers (GCCs) in Bengaluru & Hyderabad are increasing hiring for System Performance developers.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--hf-ai-teal)] shrink-0" />
                <p className="leading-relaxed">
                  Mass recruitment rounds are transitioning from classic aptitude tests to live programming challenges on platforms like HackerEarth.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--hf-warning)] shrink-0" />
                <p className="leading-relaxed">
                  Full-stack competencies, responsive routing, and custom local storage persistence are highly requested for fast-scaling elite Indian startups.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
