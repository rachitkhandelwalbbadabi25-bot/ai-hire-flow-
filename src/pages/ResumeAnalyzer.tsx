import { useState, ChangeEvent, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { extractTextFromPDF } from '../lib/pdf';
import { analyzeResume, generateCoverLetter } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { firestoreCache } from '../services/FirestoreCache';
import { motion } from 'motion/react';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  Copy,
  Terminal,
  BrainCircuit,
  Target,
  Sparkles,
  Calculator,
  Mail,
  UserCheck,
  Zap,
  ArrowRight,
  Search, 
  Edit3
} from 'lucide-react';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AILoadingStepper from '../components/AILoadingStepper';
import { cn } from '../lib/utils';

interface ResumeAnalyzerProps {
  user: User;
}

import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';
import { formatCreditAvailability } from '../utils/formatters';
import SmartContextChips from '../components/SmartContextChips';
import { useSystemOS } from '../context/SystemOSContext';
import SkeletonLoader from '../components/SkeletonLoader';

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  if (!user) return null;
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState('');

  const { hasAccess: canScan, remaining: scansLeft, limit: scanLimit } = checkAccess('resumeScans');
  const { hasAccess: canGenCL, remaining: clLeft, limit: clLimit } = checkAccess('coverLetters');

  useEffect(() => {
    if (location.state?.jobDescription) {
      setJobDesc(location.state.jobDescription);
    }
  }, [location.state]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'browser' | 'persistent' | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      setError("Please upload a resume (PDF) first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCacheSource(null);

    try {
      const text = await extractTextFromPDF(file);
      
      // STEP 1: Check In-Memory (Browser) Cache
      const inMemoryKey = cacheManager.generateResumeKey(text, jobDesc);
      
      let inMemoryCached = null;
      try {
        inMemoryCached = cacheManager.get<{ analysis: any, coverLetter: string | null }>(inMemoryKey);
      } catch (e) {
        console.warn('In-memory cache retrieval error:', e);
      }

      if (inMemoryCached && typeof inMemoryCached === 'object' && 'analysis' in inMemoryCached) {
        setAnalysis(inMemoryCached.analysis);
        setCoverLetter(inMemoryCached.coverLetter);
        setCacheSource('browser');
        setIsAnalyzing(false);
        return;
      }

      // STEP 2: Check Persistent (Firestore) Cache
      let persistentCached = null;
      try {
        persistentCached = await firestoreCache.getCache(user.uid, text, jobDesc);
      } catch (e) {
        console.warn('Persistent cache retrieval error:', e);
      }

      if (persistentCached && typeof persistentCached === 'object' && 'analysis' in persistentCached) {
        setAnalysis(persistentCached.analysis);
        setCoverLetter(persistentCached.coverLetter);
        setCacheSource('persistent');
        
        // Sync back to in-memory for even faster subsequent access
        try {
          cacheManager.set(inMemoryKey, { 
            analysis: persistentCached.analysis, 
            coverLetter: persistentCached.coverLetter 
          }, 24 * 60 * 60 * 1000);
        } catch (e) {
          console.warn('Failed to sync Firestore cache to runtime memory');
        }
        
        setIsAnalyzing(false);
        return;
      }

      // STEP 3: Fallback to Gemini API
      if (!canScan) {
        setError(`Analysis capacity reached: ${scansLeft}/${scanLimit} scans remaining. Upgrade for more bandwidth.`);
        setIsAnalyzing(false);
        return;
      }
      
      if (jobDesc && !canGenCL) {
        setError(`Cover Letter capacity reached: ${clLeft}/${clLimit} generations remaining. Upgrade for more bandwidth.`);
        setIsAnalyzing(false);
        return;
      }
      
      await deductCredit('resumeScans');
      
      const resumeRef = await addDoc(collection(db, 'users', user.uid, 'resumes'), {
        fileName: file.name,
        content: text,
        jobDesc: jobDesc,
        createdAt: new Date().toISOString()
      });

      const analysisResult = await analyzeResume(text, jobDesc);
      let cl: string | null = null;
      
      if (jobDesc) {
        await deductCredit('coverLetters');
        const clResult = await generateCoverLetter(text, jobDesc);
        cl = clResult.content;
      }

      const resultsToStore = {
        analysis: analysisResult,
        coverLetter: cl
      };

      await updateDoc(doc(db, 'users', user.uid, 'resumes', resumeRef.id), resultsToStore);

      setAnalysis(analysisResult);
      setCoverLetter(cl);
      
      // Save to both caches
      cacheManager.set(inMemoryKey, resultsToStore, 24 * 60 * 60 * 1000);
      await firestoreCache.setCache(user.uid, text, jobDesc, resultsToStore);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Internal Analysis Error. Please ensure PDF integrity.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight mb-2 uppercase">Resume Analyzer</h1>
          <p className="text-ink-dim font-medium">Analyze your resume compatibility with target jobs and build custom cover letters.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">
               {formatCreditAvailability(creditWallet?.balance, creditCosts?.resumeScan ?? 20, 'scans')}
             </span>
          </div>
          <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">
               {formatCreditAvailability(creditWallet?.balance, creditCosts?.coverLetter ?? 15, 'letters')}
             </span>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="my-8">
          <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing resume against target parameters...
          </p>
          <SkeletonLoader type="card" lines={6} />
        </div>
      )}

      {!analysis && !isAnalyzing ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <SmartContextChips 
            onSelectRole={(role) => setJobDesc(`Target Role: ${role}\nResponsibilities: Software development, technical design, clean architecture.`)}
            onSelectJob={(jobTitle) => setJobDesc(`Position: ${jobTitle}\nKey Requirements: Technical leadership, system design, and software development.`)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Card */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <FileUp className="w-4 h-4 text-accent" /> Upload Resume
            </h3>
            
            <label className={cn(
              "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl h-64 cursor-pointer transition-all",
              file ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
            )}>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              {file ? (
                <div className="text-center">
                  <div className="bg-accent p-3 rounded-full inline-block mb-3">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-ink">{file.name}</p>
                  <p className="text-[10px] text-accent mt-1 uppercase tracking-widest font-bold">Uploaded Successfully</p>
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="bg-surface-light p-3 rounded-full inline-block mb-3">
                    <FileUp className="w-6 h-6 text-ink-dim" />
                  </div>
                  <p className="font-bold text-ink">Select Resume</p>
                  <p className="text-[10px] text-ink-dim mt-1 uppercase tracking-widest font-bold">PDF Format Only</p>
                </div>
              )}
            </label>
            
            {error && (
              <div className="mt-4 p-4 bg-rose-500/10 text-rose-400 text-sm rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={handleStartAnalysis}
                  className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shrink-0"
                >
                  Retry Analysis
                </button>
              </div>
            )}
          </div>

          {/* Job Description Card */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm flex flex-col relative overflow-hidden">
            <h3 className="font-bold text-ink mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Target className="w-4 h-4 text-accent" /> Job Description
            </h3>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the target job description here to check compatibility..."
              className="flex-1 w-full p-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none font-sans leading-relaxed text-ink disabled:opacity-50 min-h-[160px]"
            />
          </div>

          <div className="md:col-span-2">
            {isAnalyzing ? (
              <AILoadingStepper 
                presetKey="resume_audit" 
                title="ATS Structural & Keyword Audit Pipeline" 
                className="mt-2"
              />
            ) : (
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-accent text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-accent/20 overflow-hidden relative cursor-pointer"
              >
                <BrainCircuit className="w-6 h-6" />
                Analyze Resume
              </button>
            )}
          </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {cacheSource && (
            <div className="flex justify-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 border rounded-full shadow-sm transition-all",
                cacheSource === 'browser' 
                  ? "bg-accent/10 border-accent/20 text-accent" 
                  : "bg-success/10 border-success/20 text-success"
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {cacheSource === 'browser' ? 'Instant Recovery (Browser)' : 'Persistent Recovery (Cloud)'}
                </span>
              </div>
            </div>
          )}
          {/* Explainable AI Engine - Analysis View */}
          <div className="space-y-8">
            {/* Header Explainable Banner */}
            <div className="bg-gradient-to-r from-accent/15 via-surface to-accent/5 p-6 rounded-3xl border border-accent/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-accent text-white text-[9px] font-extrabold uppercase tracking-widest rounded-full">
                    Explainable AI Engine
                  </span>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    100% Transparent ATS Audit
                  </span>
                </div>
                <h2 className="text-xl font-bold text-ink tracking-tight">Full Math Breakdown & Recruiter Rationale</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-accent">{analysis.score}%</span>
                <span className="status-pill status-applied text-xs">{analysis.atsCompatibility}</span>
              </div>
            </div>

            {/* Recruiter Email Memo Card (human_explanation) */}
            {analysis.human_explanation && (
              <div className="bg-surface p-8 rounded-3xl border border-border shadow-md">
                <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-2xl text-accent">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                        Recruiter Audit Feedback <span className="text-[10px] lowercase text-ink-dim font-mono">(human_explanation)</span>
                      </h3>
                      <p className="text-xs text-ink-dim">Direct feedback written in plain English by Lead Technical Recruiter</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(analysis.human_explanation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light border border-border rounded-xl text-[10px] font-bold text-ink-dim hover:text-accent hover:border-accent/30 transition-all uppercase tracking-widest"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Email
                  </button>
                </div>

                <div className="bg-background/80 p-6 rounded-2xl border border-border text-ink leading-relaxed font-sans text-sm whitespace-pre-wrap">
                  {analysis.human_explanation}
                </div>
              </div>
            )}

            {/* 4 Weighted Categories & Scoring Math */}
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-accent" /> 4-Category Weighted Math Breakdown
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">
                    Mathematical proof showing exact weight formulas contributing to your final ATS score of {analysis.score}%.
                  </p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-mono font-bold">
                  Weight Total: 100%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {(analysis.scoreBreakdown || []).map((cat: any, idx: number) => (
                  <div key={idx} className="bg-background p-6 rounded-2xl border border-border flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-ink uppercase tracking-wider">{cat.category}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-surface border border-border rounded-lg text-accent">
                          Weight: {cat.weight}%
                        </span>
                      </div>
                      <p className="text-xs text-ink-dim leading-relaxed mb-4">{cat.explanation}</p>
                    </div>

                    <div>
                      {/* Progress Bar */}
                      <div className="w-full bg-surface-light h-2 rounded-full overflow-hidden mb-3 border border-border">
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-500" 
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-ink-dim">Category Score: <strong className="text-ink">{cat.score}/100</strong></span>
                        <span className="text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                          {cat.mathExplanation || `(${cat.score}/100) × ${cat.weight}% = ${cat.earnedPoints} pts`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Math Equation Formula Bar */}
              <div className="bg-surface-light p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <span className="text-ink-dim font-bold uppercase tracking-wider">Total Mathematical Calculation:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {(analysis.scoreBreakdown || []).map((cat: any, i: number) => (
                    <span key={i} className="text-ink font-bold">
                      {cat.earnedPoints ?? Math.round(((cat.score || 0) * (cat.weight || 0)) / 100)}{i < (analysis.scoreBreakdown || []).length - 1 ? " + " : ""}
                    </span>
                  ))}
                  <span className="text-accent font-black text-sm">= {analysis.score} / 100</span>
                </div>
              </div>
            </div>

            {/* Keyword Analysis & Specific Rewrites per Gap */}
            <div className="bg-surface p-8 rounded-3xl border border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" /> Missing Keyword Rationale & Bullet Rewrites
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">
                    Recruiter explanation of WHY each missing keyword matters for this specific role + 1 high-impact rewrite per gap.
                  </p>
                </div>

                {(analysis.missingKeywords || []).length > 0 && (
                  <button 
                    onClick={() => {
                      const getJobTitle = (desc: string) => {
                        if (!desc) return '';
                        const firstLine = desc.split('\n')[0].trim();
                        return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
                      };
                      navigate('/learning', {
                        state: {
                          missingSkills: analysis.missingKeywords,
                          targetRole: getJobTitle(jobDesc)
                        }
                      });
                    }}
                    className="text-[9px] font-bold text-accent px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl hover:bg-accent/20 transition-all uppercase tracking-widest shrink-0"
                  >
                    Generate Skill Roadmap
                  </button>
                )}
              </div>

              {(analysis.missingKeywordAnalysis || []).length > 0 ? (
                <div className="space-y-6">
                  {analysis.missingKeywordAnalysis.map((item: any, idx: number) => (
                    <div key={idx} className="bg-background p-6 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" /> Missing Skill: {item.keyword}
                        </span>
                        <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Gap #{idx + 1}</span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Why It Matters For This Specific Job Title & Company:</p>
                        <p className="text-xs text-ink leading-relaxed font-sans">{item.whyItMatters}</p>
                      </div>

                      <div className="bg-surface p-4 rounded-xl border border-border/80">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-bold text-success uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Suggested Metric Bullet Rewrite:
                          </p>
                          <button
                            onClick={() => navigator.clipboard.writeText(item.suggestedRewrite)}
                            className="text-[9px] font-bold text-ink-dim hover:text-ink flex items-center gap-1 uppercase tracking-wider"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-xs font-mono text-ink leading-relaxed">"{item.suggestedRewrite}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(analysis.missingKeywords || []).map((k: string, i: number) => (
                    <span key={i} className="bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/20">
                      {k}
                    </span>
                  ))}
                  {(analysis.missingKeywords || []).length === 0 && (
                    <p className="text-ink-dim text-xs italic">Optimal keyword alignment achieved! No missing critical terms found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Found Keywords & Optimization Strategy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-surface p-8 rounded-3xl border border-border">
                <h3 className="font-bold text-ink mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Identified Target Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.keywordsFound || []).map((k: string, i: number) => (
                    <span key={i} className="bg-background text-ink px-3 py-1.5 rounded-lg text-xs font-semibold border border-border">
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-8 rounded-3xl border border-border">
                <h3 className="font-bold text-ink mb-6 uppercase text-xs tracking-widest">Formatting & Structural Strategy</h3>
                <ul className="space-y-3">
                  {(analysis.formattingSuggestions || []).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-ink-dim flex gap-3 leading-relaxed">
                      <span className="text-accent font-mono text-[10px] bg-accent/10 px-1.5 py-0.5 rounded shrink-0">0{i+1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cover Letter */}
            {coverLetter && (
              <div className="bg-surface-light p-8 rounded-3xl border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Terminal className="w-4 h-4 text-accent" /> Tailored Cover Letter
                  </h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(coverLetter)}
                    className="flex items-center gap-2 text-[10px] font-bold text-ink-dim hover:text-ink transition-colors uppercase tracking-widest"
                  >
                    <Copy className="w-3 h-3" /> Copy Cover Letter
                  </button>
                </div>
                <div className="bg-background p-8 rounded-2xl border border-border text-ink-dim text-sm leading-relaxed font-sans whitespace-pre-wrap h-[350px] overflow-y-auto no-scrollbar">
                  {coverLetter}
                </div>
              </div>
            )}
          </div>

          <NextStepBridgeCard
            title="Resume Evaluation Complete"
            contextData={`ATS Compatibility Score: ${analysis.score}%. ${analysis.missingKeywords?.length > 0 ? `Identified ${analysis.missingKeywords.length} missing skill keywords (${analysis.missingKeywords.slice(0, 3).join(', ')}).` : 'High alignment with target specifications.'}`}
            primaryStep={{
              label: "Search Matched Jobs",
              icon: Search,
              to: "/finder"
            }}
            secondaryStep={{
              label: "Refine Resume in Editor",
              icon: Edit3,
              to: "/editor"
            }}
          />

          <div className="flex justify-center pt-4">
            <button 
              onClick={() => { setAnalysis(null); setCoverLetter(null); setFile(null); setJobDesc(''); }}
              className="text-ink-dim hover:text-accent font-bold transition-all flex items-center gap-2 uppercase text-[10px] tracking-widest"
            >
              Reset Terminal
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
