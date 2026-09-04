import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, BookOpen, Search, Sparkles, Building2, ChevronRight, Zap, 
  Code, Play, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Loader2, 
  Lightbulb, HelpCircle, ArrowRight, Star, GraduationCap, 
  Check, RefreshCw, Send, Terminal, Award, BookCheck, MessageSquare
} from 'lucide-react';
import { 
  generateCompanyPrep, 
  generateAptitudeQuestions, 
  generateStartupChallenge, 
  evaluateStartupSolution 
} from '../lib/gemini';
import AILoadingStepper from '../components/AILoadingStepper';
import NextStepBridgeCard from '../components/NextStepBridgeCard';

export default function CampusPlacement() {
  // Company Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [companyPrep, setCompanyPrep] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Suggested companies for quick searching
  const suggestedCompanies = [
    "TCS Ninja / Digital",
    "Infosys",
    "Wipro Elite",
    "Google India",
    "Zoho",
    "Zomato",
    "Razorpay",
    "Cisco"
  ];

  // Interactive Aptitude Drill State
  const [activeDrillTopic, setActiveDrillTopic] = useState<string | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [drillScore, setDrillScore] = useState(0);
  const [drillComplete, setDrillComplete] = useState(false);

  // Startup Elite Program State
  const [activeStartupTrack, setActiveStartupTrack] = useState<string | null>(null);
  const [loadingStartup, setLoadingStartup] = useState(false);
  const [startupChallenge, setStartupChallenge] = useState<any>(null);
  const [proposedSolution, setProposedSolution] = useState('');
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [solutionFeedback, setSolutionFeedback] = useState<any>(null);

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

  const handleStartAptitudeDrill = async (topic: string) => {
    setActiveDrillTopic(topic);
    setLoadingDrill(true);
    setDrillQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setDrillScore(0);
    setDrillComplete(false);
    try {
      const data = await generateAptitudeQuestions(topic);
      if (data && data.questions) {
        setDrillQuestions(data.questions);
      } else {
        setSearchError("Could not generate questions. Please try again.");
      }
    } catch (err) {
      console.error(err);
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
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
            <Trophy className="w-5 h-5 text-accent" />
          </div>
          <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Placement War-Room</span>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">India Campus Prep Hub</h1>
        <p className="text-ink-dim font-medium text-lg max-w-2xl">
          Search specific tech companies for customized prep guidelines, practice interactive drills, and test yourself with startup architecture boards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Company Search & Aptitude Drill */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECTION 1: Company Prep Search Engine */}
          <div className="glass-panel">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                <Search className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink uppercase tracking-tight">Company Placement Prep</h2>
                <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Search any company to construct custom preparation plans</p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="bg-background border border-border p-4 rounded-2xl mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text"
                  placeholder="Type any company (e.g. Zoho, Google, TCS, Zomato, Razorpay...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch(searchQuery)}
                  className="flex-1 bg-surface border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-accent text-ink font-semibold"
                />
                <button 
                  onClick={() => handleCompanySearch(searchQuery)}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-accent text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-accent/20 disabled:opacity-50"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Get Company Prep
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="mb-6">
              <span className="text-[9px] font-bold text-ink-dim uppercase tracking-widest block mb-3">Popular Target Hubs:</span>
              <div className="flex flex-wrap gap-2">
                {suggestedCompanies.map((company, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(company);
                      handleCompanySearch(company);
                    }}
                    className="px-3 py-1.5 bg-surface hover:bg-accent/10 border border-border hover:border-accent/30 rounded-xl text-xs font-semibold text-ink-dim hover:text-accent transition-all uppercase"
                  >
                    {company}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {searchError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-medium mb-6">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* SEARCH RESULTS INTERACTIVE PANEL */}
            <AnimatePresence mode="wait">
              {searching && (
                <div className="py-6 max-w-2xl mx-auto">
                  <AILoadingStepper 
                    presetKey="company_prep" 
                    title={`Enterprise Hiring Tactics: ${searchQuery || 'Target Company'}`} 
                  />
                </div>
              )}

              {companyPrep && !searching && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 bg-surface-light/30 border border-border p-6 rounded-3xl"
                >
                  {/* Results Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                      <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Tailored Recruitment Plan</span>
                      <h3 className="text-2xl font-bold text-ink uppercase tracking-tight flex items-center gap-2 mt-1">
                        <Building2 className="w-6 h-6 text-accent" />
                        {companyPrep.companyName}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-3 py-1.5 bg-background border border-border rounded-xl text-center">
                        <span className="text-[8px] font-bold text-ink-dim uppercase block">Difficulty</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          companyPrep.difficulty === "Hard" ? "text-rose-500" : 
                          companyPrep.difficulty === "Medium" ? "text-warning" : "text-success"
                        }`}>{companyPrep.difficulty}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-background border border-border rounded-xl text-center">
                        <span className="text-[8px] font-bold text-ink-dim uppercase block">Prep Time</span>
                        <span className="text-[10px] font-bold text-ink uppercase tracking-wide">{companyPrep.estimatedPrepTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recruitment Rounds Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-accent" />
                      Interviews & Placement Rounds
                    </h4>
                    <div className="space-y-3">
                      {companyPrep.roundBreakdown?.map((round: any, rIdx: number) => (
                        <div key={rIdx} className="bg-background border border-border p-4 rounded-2xl hover:border-accent/20 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                              {rIdx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-ink uppercase">{round.roundName}</h5>
                          </div>
                          <p className="text-xs text-ink-dim mb-3 font-medium">{round.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {round.focusTopics?.map((topic: string, tIdx: number) => (
                              <span key={tIdx} className="px-2 py-0.5 bg-surface-light border border-border rounded text-[9px] font-mono text-ink-dim uppercase font-semibold">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Frequently Asked Questions */}
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-accent" />
                      High-Probability Questions Asked
                    </h4>
                    <div className="space-y-3">
                      {companyPrep.topQuestions?.map((qObj: any, qIdx: number) => (
                        <div key={qIdx} className="bg-background border border-border p-4 rounded-2xl">
                          <div className="flex items-start gap-2.5 mb-2">
                            <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <span className="text-xs font-bold text-ink leading-relaxed">{qObj.question}</span>
                          </div>
                          <div className="pl-6.5 mt-2 flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-accent uppercase tracking-wider">Concept: {qObj.topic}</span>
                            <div className="bg-surface p-3 rounded-xl border border-border border-dashed flex items-start gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                              <p className="text-[11px] text-ink-dim leading-relaxed font-medium"><strong className="text-ink">Passing Tip:</strong> {qObj.tip}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preparation Strategy Quote */}
                  <div className="bg-[#0b0b0b] border border-border p-5 rounded-2xl text-white">
                    <span className="text-[9px] font-bold text-accent uppercase tracking-[0.2em] block mb-2">Expert Tactical Directives</span>
                    <p className="text-xs text-white/70 italic leading-relaxed font-sans">
                      "{companyPrep.prepStrategy}"
                    </p>
                  </div>

                  <NextStepBridgeCard
                    title="Placement blueprint synthesized"
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

          {/* SECTION 2: Interactive Aptitude & Technical Practice Drills */}
          <div className="glass-panel">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                <Code className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink uppercase tracking-tight">Interactive Aptitude Drills</h2>
                <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">Test your placement competencies in live MCQ practice sessions</p>
              </div>
            </div>

            {/* Drill Topic Selector */}
            {!activeDrillTopic && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Logical & Quantitative", desc: "Probability, P&C, Time & Speed, Syllogisms", icon: Zap, color: "text-amber-500" },
                  { title: "CS Fundamentals", desc: "Object-Oriented Programming, OS, DBMS Joins", icon: Code, color: "text-blue-500" },
                  { title: "System Design", desc: "Caching, Load Balancers, Databases, API Scaling", icon: Star, color: "text-emerald-500" }
                ].map((drill, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStartAptitudeDrill(drill.title)}
                    className="p-5 bg-background border border-border hover:border-accent/40 rounded-2xl transition-all text-left flex flex-col justify-between group h-full"
                  >
                    <div>
                      <div className="bg-surface border border-border p-2 rounded-xl w-fit mb-4">
                        <drill.icon className={`w-5 h-5 ${drill.color}`} />
                      </div>
                      <h4 className="font-bold text-ink text-sm group-hover:text-accent transition-colors uppercase">{drill.title}</h4>
                      <p className="text-[10px] text-ink-dim mt-2 leading-normal">{drill.desc}</p>
                    </div>
                    <div className="text-[9px] font-bold text-accent uppercase tracking-widest flex items-center gap-1 mt-6">
                      Launch Drill <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ACTIVE DRILL WORKSPACE */}
            {activeDrillTopic && (
              <div className="border border-border bg-background/30 rounded-3xl p-6">
                
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                  <div>
                    <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Live Interactive Practice</span>
                    <h4 className="text-sm font-bold text-ink uppercase tracking-tight mt-1">{activeDrillTopic}</h4>
                  </div>
                  <button
                    onClick={() => setActiveDrillTopic(null)}
                    className="text-[9px] font-bold text-ink-dim hover:text-rose-400 border border-border hover:border-rose-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                  >
                    Quit Session
                  </button>
                </div>

                {loadingDrill ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <span className="text-[10px] font-bold text-ink-dim uppercase tracking-widest animate-pulse">Generating Interview Questions...</span>
                  </div>
                ) : drillComplete ? (
                  /* Score and completion view */
                  <div className="text-center py-10 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-ink uppercase tracking-tight mb-2">Practice Complete!</h3>
                    <p className="text-xs text-ink-dim mb-6">Excellent job practicing dynamic aptitude drills. Consistency is the key to passing MNC technical rounds.</p>
                    
                    <div className="bg-surface border border-border p-4 rounded-2xl mb-8 flex items-center justify-around">
                      <div>
                        <span className="text-[10px] font-bold text-ink-dim uppercase block">Questions Answered</span>
                        <span className="text-lg font-bold text-ink">{drillQuestions.length}</span>
                      </div>
                      <div className="border-r border-border h-8"></div>
                      <div>
                        <span className="text-[10px] font-bold text-ink-dim uppercase block">Correct Answers</span>
                        <span className="text-lg font-bold text-success">{drillScore} / {drillQuestions.length}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStartAptitudeDrill(activeDrillTopic)}
                        className="flex-1 bg-accent text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-accent/20"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                      <button
                        onClick={() => setActiveDrillTopic(null)}
                        className="flex-1 bg-surface border border-border text-ink py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-accent/40 transition-all"
                      >
                        Choose Topic
                      </button>
                    </div>
                  </div>
                ) : drillQuestions.length > 0 ? (
                  /* Standard Question State */
                  <div>
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-[10px] font-bold text-ink-dim uppercase tracking-wider mb-2">
                        <span>Question {currentQuestionIndex + 1} of {drillQuestions.length}</span>
                        <span>Score: {drillScore}</span>
                      </div>
                      <div className="w-full bg-surface border border-border h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-accent h-full transition-all duration-300" 
                          style={{ width: `${((currentQuestionIndex + 1) / drillQuestions.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-background border border-border p-5 rounded-2xl mb-6">
                      <p className="text-xs font-bold text-ink leading-relaxed font-sans">
                        {drillQuestions[currentQuestionIndex].question}
                      </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2.5 mb-6">
                      {drillQuestions[currentQuestionIndex].options?.map((opt: string, optIdx: number) => {
                        const isSelected = selectedOptionIndex === optIdx;
                        const correctIdx = drillQuestions[currentQuestionIndex].correctIndex;
                        
                        let cardStyle = "bg-background border-border hover:border-accent/30 text-ink";
                        if (isAnswered) {
                          if (optIdx === correctIdx) {
                            cardStyle = "bg-success/10 border-success text-success font-semibold";
                          } else if (isSelected) {
                            cardStyle = "bg-rose-500/10 border-rose-500 text-rose-500 font-semibold";
                          } else {
                            cardStyle = "bg-background/40 border-border/50 text-ink-dim opacity-70";
                          }
                        } else if (isSelected) {
                          cardStyle = "bg-accent/5 border-accent text-accent font-semibold";
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`w-full p-4 border text-left rounded-xl text-xs transition-all flex items-center justify-between ${cardStyle}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && optIdx === correctIdx && (
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            )}
                            {isAnswered && isSelected && optIdx !== correctIdx && (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-border pt-6">
                      {isAnswered ? (
                        <div className="w-full">
                          {/* Explanation Card */}
                          <div className="bg-surface border border-border p-4 rounded-2xl mb-4 text-xs">
                            <span className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-2">Step-by-Step Logic Breakdown</span>
                            <p className="text-ink-dim leading-relaxed font-medium">
                              {drillQuestions[currentQuestionIndex].explanation}
                            </p>
                          </div>
                          <button
                            onClick={handleNextQuestion}
                            className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1 hover:opacity-90 transition-all shadow-md shadow-accent/20"
                          >
                            {currentQuestionIndex + 1 === drillQuestions.length ? "Finish Drill" : "Next Question"}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleConfirmAnswer}
                          disabled={selectedOptionIndex === null}
                          className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1 hover:opacity-90 transition-all disabled:opacity-40"
                        >
                          Check Answer
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-ink-dim font-medium">
                    No questions generated. Please restart.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Startup Elite Program Simulator */}
        <div className="lg:col-span-4 space-y-8">
          
          <div className="bg-[#0a0a0a] border border-accent/20 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px] -mr-16 -mt-16 group-hover:bg-accent/30 transition-all"></div>
            <Sparkles className="w-8 h-8 text-accent mb-6" />
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Startup Elite Prep</h3>
            <p className="text-xs text-white/60 mb-6 leading-relaxed font-sans">
              Test your architecture against elite-level engineering scenarios. Startups look for rapid prototyping and core performance optimization.
            </p>

            {/* Specialization Options */}
            {!activeStartupTrack ? (
              <div className="space-y-2.5 mb-2">
                {[
                  "Frontend Specialist (React)",
                  "Backend Architect (Node)",
                  "Full-Stack Builder"
                ].map((track, i) => (
                  <button 
                    key={i}
                    onClick={() => handleStartStartupChallenge(track)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold tracking-widest uppercase text-white group-hover:text-accent transition-colors">{track.split(' (')[0]}</h4>
                      <p className="text-[9px] text-white/40 mt-1 uppercase tracking-tighter">
                        {track.includes('Frontend') ? 'React, Next.js, Performance' : 
                         track.includes('Backend') ? 'System Design, Microservices, Scale' : 'End-to-End System Integration'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              /* ACTIVE CHALLENGE VIEW */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Active Bootcamp</span>
                  <button 
                    onClick={() => {
                      setActiveStartupTrack(null);
                      setStartupChallenge(null);
                      setSolutionFeedback(null);
                    }}
                    className="text-[9px] font-bold text-white/50 hover:text-rose-400 uppercase transition-colors"
                  >
                    Change Track
                  </button>
                </div>

                {loadingStartup ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest animate-pulse">Synthesizing Challenge...</span>
                  </div>
                ) : startupChallenge ? (
                  <div className="space-y-4">
                    {/* Challenge Prompt */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{startupChallenge.title}</h4>
                      <p className="text-[11px] text-white/70 leading-relaxed mb-3 font-sans">
                        {startupChallenge.description}
                      </p>
                      <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest font-mono">Scale Constraint: {startupChallenge.scaleContext}</span>
                      </div>
                    </div>

                    {/* Core Architectural Task */}
                    <div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Your Engineering Task:</span>
                      <p className="text-[10px] text-white/80 leading-relaxed font-sans">{startupChallenge.coreTask}</p>
                    </div>

                    {/* Requirements checklist */}
                    <div className="space-y-1">
                      {startupChallenge.checklist?.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[9px] text-white/50">
                          <Check className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Input Solution */}
                    {!solutionFeedback && (
                      <div className="space-y-2 mt-4">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Propose Your Solution Strategy:</span>
                        <textarea
                          placeholder="Detail your database choice, system architecture, caching strategy, and framework pathways to solve this..."
                          value={proposedSolution}
                          onChange={(e) => setProposedSolution(e.target.value)}
                          rows={6}
                          className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent font-sans"
                        />
                        <button
                          onClick={handleSubmitStartupSolution}
                          disabled={submittingSolution || !proposedSolution.trim()}
                          className="w-full bg-accent text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-[1.01] transition-all disabled:opacity-40"
                        >
                          {submittingSolution ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Evaluating Solutions...
                            </span>
                          ) : (
                            "Submit Proposal To CTO"
                          )}
                        </button>
                      </div>
                    )}

                    {/* CTO Evaluation Feedback */}
                    {solutionFeedback && (
                      <div className="space-y-4 mt-6 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">CTO Assessment Grade:</span>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            solutionFeedback.grade.includes('Elite') || solutionFeedback.score >= 85 ? 'bg-success/15 text-success' :
                            solutionFeedback.score >= 65 ? 'bg-warning/15 text-warning' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {solutionFeedback.grade} ({solutionFeedback.score}/100)
                          </span>
                        </div>

                        {/* CTO Critique */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs leading-normal">
                          <span className="text-[9px] font-bold text-accent uppercase block mb-1">Scale Strategy Critique:</span>
                          <p className="text-white/80 font-sans">{solutionFeedback.scaleCheck}</p>
                          
                          <span className="text-[9px] font-bold text-accent uppercase block mt-3 mb-1">Architecture & Code Feedback:</span>
                          <p className="text-white/60 font-sans whitespace-pre-line">{solutionFeedback.feedback}</p>
                        </div>

                        <div className="bg-[#121212] border border-white/10 p-4 rounded-xl text-[10.5px]">
                          <span className="text-[9px] font-bold text-white/50 uppercase block mb-2">CTO Model Solution Reference:</span>
                          <p className="text-white/40 leading-relaxed font-sans">{startupChallenge.modelSolutionArchitecture}</p>
                        </div>

                        <button 
                          onClick={() => {
                            setSolutionFeedback(null);
                            setProposedSolution('');
                          }}
                          className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all"
                        >
                          Revise Solution
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Quick Stats cycle */}
          <div className="glass-panel">
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-6 flex items-center gap-2">
              <BookCheck className="w-4.5 h-4.5 text-accent" />
              Trending Indian Placement Trends
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <p className="text-[10px] text-ink-dim font-medium leading-normal">Global Capability Centers (GCCs) in Bengaluru & Hyderabad are increasing hiring for System Performance developers.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[10px] text-ink-dim font-medium leading-normal">Mass recruitment rounds are transitioning from classic aptitude tests to live programming challenges on platforms like HackerEarth.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <p className="text-[10px] text-ink-dim font-medium leading-normal">Full-stack competencies, responsive routing, and custom local storage persistence are highly requested for fast-scaling elite Indian startups.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
