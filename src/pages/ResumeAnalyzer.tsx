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
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ResumeAnalyzerProps {
  user: User;
}

import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  const { checkAccess, deductCredit } = usePlan();
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
      const inMemoryCached = cacheManager.get<{ analysis: any, coverLetter: string | null }>(inMemoryKey);

      if (inMemoryCached) {
        setAnalysis(inMemoryCached.analysis);
        setCoverLetter(inMemoryCached.coverLetter);
        setCacheSource('browser');
        setIsAnalyzing(false);
        return;
      }

      // STEP 2: Check Persistent (Firestore) Cache
      const persistentCached = await firestoreCache.getCache(user.uid, text, jobDesc);
      if (persistentCached) {
        setAnalysis(persistentCached.analysis);
        setCoverLetter(persistentCached.coverLetter);
        setCacheSource('persistent');
        
        // Sync back to in-memory for even faster subsequent access
        cacheManager.set(inMemoryKey, { 
          analysis: persistentCached.analysis, 
          coverLetter: persistentCached.coverLetter 
        }, 24 * 60 * 60 * 1000);
        
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
          <h1 className="text-3xl font-bold text-ink tracking-tight mb-2 uppercase">Resume Intelligence</h1>
          <p className="text-ink-dim font-medium">Deploying neural analysis on your professional trajectory.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Scans: {scansLeft} / {scanLimit}</span>
          </div>
          <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
             <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Letters: {clLeft} / {clLimit}</span>
          </div>
        </div>
      </div>

      {!analysis ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Upload Card */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
            <h3 className="font-bold text-ink mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <FileUp className="w-4 h-4 text-accent" /> Data Ingestion
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
                  <p className="text-[10px] text-accent mt-1 uppercase tracking-widest font-bold">Vectorized</p>
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
              <div className="mt-4 p-3 bg-rose-500/10 text-rose-400 text-sm rounded-xl flex items-center gap-2 font-medium border border-rose-500/20">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>

          {/* Job Description Card */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm flex flex-col relative overflow-hidden">
            <h3 className="font-bold text-ink mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Target className="w-4 h-4 text-accent" /> Alignment Target
            </h3>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Input target job specification for comparative matching..."
              className="flex-1 w-full p-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none font-sans leading-relaxed text-ink disabled:opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-accent text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-accent/20 overflow-hidden relative"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="animate-pulse">Synthesizing Report...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-6 h-6" />
                  Initiate AI Audit
                </>
              )}
            </button>
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
          {/* Analysis View */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-light p-10 rounded-3xl border border-border flex flex-col items-center justify-center text-center">
              <p className="text-ink-dim text-[10px] font-bold uppercase tracking-widest mb-6">Neural Compatibility Score</p>
              <div className="relative w-32 h-32 rounded-full border-8 border-background flex flex-col items-center justify-center mb-4">
                <span className="text-4xl font-black text-success leading-none">{analysis.score}</span>
                <span className="text-[8px] text-ink-dim font-bold mt-1">PERCENT</span>
              </div>
              <span className="status-pill status-applied">{analysis.atsCompatibility}</span>
            </div>

            <div className="md:col-span-2 space-y-8">
               <div className="bg-surface p-8 rounded-3xl border border-border">
                  <h3 className="font-bold text-ink mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4 text-success" /> Tokenized Strengths
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
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-ink flex items-center gap-2 text-xs uppercase tracking-widest">
                      <AlertCircle className="w-4 h-4 text-rose-500" /> Alignment Gaps
                    </h3>
                    {(analysis.missingKeywords || []).length > 0 && (
                      <button 
                        onClick={() => navigate('/learning')}
                        className="text-[9px] font-bold text-accent px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-all uppercase tracking-widest"
                      >
                        Generate roadmap
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.missingKeywords || []).length > 0 ? (analysis.missingKeywords || []).map((k: string, i: number) => (
                      <span key={i} className="bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/20">
                        {k}
                      </span>
                    )) : (
                      <p className="text-ink-dim text-xs italic">Optimal alignment achieved.</p>
                    )}
                  </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            {/* Suggestions */}
            <div className="bg-surface p-8 rounded-3xl border border-border">
              <h3 className="font-bold text-ink mb-8 uppercase text-xs tracking-widest">Optimization Strategy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <p className="text-ink-dim text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-border pb-2 inline-block">Structure & Formatting</p>
                  <ul className="space-y-4">
                    {(analysis.formattingSuggestions || []).map((s: string, i: number) => (
                      <li key={i} className="text-sm text-ink-dim flex gap-4 leading-relaxed">
                        <span className="text-accent font-mono text-[10px] bg-accent/10 px-1.5 rounded">0{i+1}</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-ink-dim text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-border pb-2 inline-block">Impact & Depth</p>
                  <ul className="space-y-4">
                    {(analysis.impactSuggestions || []).map((s: string, i: number) => (
                      <li key={i} className="text-sm text-ink-dim flex gap-4 leading-relaxed">
                        <span className="text-success font-mono text-[10px] bg-success/10 px-1.5 rounded">0{i+1}</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
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
                    <Copy className="w-3 h-3" /> Copy Manifest
                  </button>
                </div>
                <div className="bg-background p-8 rounded-2xl border border-border text-ink-dim text-sm leading-relaxed font-sans whitespace-pre-wrap h-[450px] overflow-y-auto no-scrollbar">
                  {coverLetter}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-8">
            <button 
              onClick={() => { setAnalysis(null); setCoverLetter(null); setFile(null); }}
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
