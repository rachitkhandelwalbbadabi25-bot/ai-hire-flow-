import { useState, ChangeEvent, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { extractTextFromPDF } from '../lib/pdf';
import { analyzeResume, generateCoverLetter } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { firestoreCache } from '../services/FirestoreCache';
import { motion, AnimatePresence } from 'motion/react';
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
  Edit3,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Layers,
  Scale,
  Clock,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AILoadingStepper from '../components/AILoadingStepper';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { formatCreditAvailability } from '../utils/formatters';
import SmartContextChips from '../components/SmartContextChips';
import { useSystemOS } from '../context/SystemOSContext';
import SkeletonLoader from '../components/SkeletonLoader';

interface MasterResumeData {
  summary?: string;
  experience?: {
    id: string;
    company: string;
    role: string;
    period: string;
    bullets: string[];
    isExpanded?: boolean;
  }[];
  skills?: string[];
  updatedAt?: string;
}

function formatMasterResumeToText(resume: MasterResumeData): string {
  const parts: string[] = [];
  if (resume.summary && resume.summary.trim()) {
    parts.push(`PROFESSIONAL SUMMARY:\n${resume.summary.trim()}`);
  }
  if (resume.skills && resume.skills.length > 0) {
    parts.push(`TECHNICAL & CORE SKILLS:\n${resume.skills.join(', ')}`);
  }
  if (resume.experience && resume.experience.length > 0) {
    const expLines: string[] = ['PROFESSIONAL EXPERIENCE:'];
    resume.experience.forEach(exp => {
      const header = [
        exp.role || 'Position',
        exp.company ? `at ${exp.company}` : '',
        exp.period ? `(${exp.period})` : ''
      ].filter(Boolean).join(' ');
      expLines.push(header);
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(b => {
          if (b && b.trim()) expLines.push(`• ${b.trim()}`);
        });
      }
      expLines.push('');
    });
    parts.push(expLines.join('\n'));
  }
  return parts.join('\n\n').trim();
}

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  if (!user) return null;
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [masterResume, setMasterResume] = useState<MasterResumeData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [useSavedResume, setUseSavedResume] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);

  const { hasAccess: canScan, remaining: scansLeft, limit: scanLimit } = checkAccess('resumeScans');
  const { hasAccess: canGenCL, remaining: clLeft, limit: clLimit } = checkAccess('coverLetters');

  const scanCreditCost = creditCosts?.resumeScan ?? 20;
  const coverLetterCreditCost = creditCosts?.coverLetter ?? 15;

  // Check for saved Master Resume in Resume Editor
  useEffect(() => {
    const fetchMasterResume = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'config', 'masterResume');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as MasterResumeData;
          const hasContent = !!(
            (data.summary && data.summary.trim()) ||
            (data.experience && data.experience.length > 0) ||
            (data.skills && data.skills.length > 0)
          );
          if (hasContent) {
            setMasterResume(data);
            setUseSavedResume(true);
            setIsUploadMode(false);
          } else {
            setMasterResume(null);
            setUseSavedResume(false);
            setIsUploadMode(true);
          }
        } else {
          setMasterResume(null);
          setUseSavedResume(false);
          setIsUploadMode(true);
        }
      } catch (err) {
        console.warn("Error loading master resume in analyzer:", err);
        setMasterResume(null);
        setUseSavedResume(false);
        setIsUploadMode(true);
      } finally {
        setLoadingMaster(false);
      }
    };
    fetchMasterResume();
  }, [user.uid]);

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
      setUseSavedResume(false);
      setError(null);
    }
  };

  const handleStartAnalysis = async () => {
    // Validation: Require either saved master resume OR uploaded PDF
    const isUsingMaster = useSavedResume && !!masterResume && !isUploadMode;
    
    if (!isUsingMaster && !file) {
      setError("Please select your saved Master Resume or upload a PDF file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCacheSource(null);

    try {
      let text = '';
      let resumeTitle = '';

      if (isUsingMaster && masterResume) {
        text = formatMasterResumeToText(masterResume);
        resumeTitle = `Master Resume (${masterResume.experience?.[0]?.role || 'Saved Profile'})`;
        if (!text || text.length < 20) {
          throw new Error("Saved Master Resume is empty. Please add details in Resume Editor or upload a PDF.");
        }
      } else if (file) {
        text = await extractTextFromPDF(file);
        resumeTitle = file.name;
      }
      
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
        fileName: resumeTitle,
        content: text,
        jobDesc: jobDesc,
        isMasterResume: isUsingMaster,
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
      setError(err.message || "Internal Analysis Error. Please ensure resume integrity.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isPrePopulated = !!masterResume && useSavedResume && !isUploadMode;

  const formattedLastUpdated = masterResume?.updatedAt 
    ? new Date(masterResume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently Saved';

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

      {!analysis ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Missing Master Resume Onboarding Nudge Banner */}
          {!loadingMaster && !masterResume && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider">
                      AI System Context Engine
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-background border border-border text-ink-dim rounded-full">
                      pre_populated: false
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-ink mt-0.5">
                    Save Your Master Resume Once to Skip PDF Uploads
                  </h3>
                  <p className="text-xs text-ink-dim mt-0.5 max-w-xl">
                    Create your profile in the Resume Editor once. The AI will automatically pre-populate every scan, drill, and cold pitch.
                  </p>
                </div>
              </div>
              <Link
                to="/editor"
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-black font-mono font-bold text-xs rounded-xl shadow-md shadow-accent/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Build Master Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          )}

          <SmartContextChips 
            onSelectRole={(role) => setJobDesc(`Target Role: ${role}\nResponsibilities: Software development, technical design, clean architecture.`)}
            onSelectJob={(jobTitle) => setJobDesc(`Position: ${jobTitle}\nKey Requirements: Technical leadership, system design, and software development.`)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Card: Master Resume Pre-Populated OR Upload Card */}
            <div className="bg-surface p-7 sm:p-8 rounded-3xl border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-5">
                  <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-widest">
                    {isPrePopulated ? (
                      <>
                        <Sparkles className="w-4 h-4 text-accent" /> Master Resume (Auto-Loaded)
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4 text-accent" /> Resume Source
                      </>
                    )}
                  </h3>

                  {isPrePopulated ? (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Pre-Populated
                    </span>
                  ) : masterResume ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadMode(false);
                        setUseSavedResume(true);
                        setFile(null);
                        setError(null);
                      }}
                      className="text-[10px] font-mono font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Use Saved Master Resume
                    </button>
                  ) : null}
                </div>

                {/* Pre-Populated Master Resume View */}
                {isPrePopulated && masterResume ? (
                  <div className="space-y-4">
                    <div className="bg-background/90 border border-accent/30 rounded-2xl p-5 relative overflow-hidden">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider block">
                            Saved Master Profile
                          </span>
                          <h4 className="text-base font-bold text-ink font-sans mt-0.5">
                            {masterResume.experience?.[0]?.role || 'Professional Profile'}
                          </h4>
                          {masterResume.experience?.[0]?.company && (
                            <p className="text-xs text-ink-dim">
                              Latest: {masterResume.experience[0].company} ({masterResume.experience[0].period || 'Present'})
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-mono text-ink-dim flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent" /> {formattedLastUpdated}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-ink-dim mt-1">
                            {masterResume.experience?.length || 0} Roles Added
                          </span>
                        </div>
                      </div>

                      {masterResume.summary && (
                        <p className="text-xs text-ink-dim font-sans line-clamp-2 leading-relaxed mb-3 bg-surface/50 p-2.5 rounded-xl border border-border/60">
                          "{masterResume.summary}"
                        </p>
                      )}

                      {/* Top Skills Tags */}
                      {masterResume.skills && masterResume.skills.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono font-bold text-ink-dim uppercase tracking-wider">
                            Synced Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto no-scrollbar">
                            {masterResume.skills.slice(0, 6).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-surface border border-border rounded-lg text-[10px] font-mono font-bold text-ink"
                              >
                                {skill}
                              </span>
                            ))}
                            {masterResume.skills.length > 6 && (
                              <span className="px-1.5 py-0.5 bg-surface-light text-[10px] font-mono text-ink-dim rounded-lg">
                                +{masterResume.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-dim px-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        No re-upload needed · Auto-synced
                      </span>
                      <Link to="/editor" className="text-accent hover:underline text-[11px] font-mono font-bold flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Edit Profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Standard PDF Upload Dropzone */
                  <div>
                    <label className={cn(
                      "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl h-56 cursor-pointer transition-all",
                      file ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                    )}>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf" 
                        onChange={handleFileChange}
                        aria-label="Upload resume PDF file" 
                      />
                      {file ? (
                        <div className="text-center px-4">
                          <div className="bg-accent p-3 rounded-full inline-block mb-2 shadow-md shadow-accent/20" aria-hidden="true">
                            <FileText className="w-6 h-6 text-black" />
                          </div>
                          <p className="font-bold text-ink text-sm">{file.name}</p>
                          <p className="text-[10px] text-accent mt-1 uppercase tracking-widest font-bold">PDF Ready to Analyze</p>
                        </div>
                      ) : (
                        <div className="text-center px-4">
                          <div className="bg-surface-light p-3 rounded-full inline-block mb-2" aria-hidden="true">
                            <FileUp className="w-6 h-6 text-ink-dim" />
                          </div>
                          <p className="font-bold text-ink text-sm">Select or Drop Resume PDF</p>
                          <p className="text-[10px] text-ink-dim mt-1 uppercase tracking-widest font-bold">PDF Format Only</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {error && (
                  <div role="alert" className="mt-4 p-4 bg-rose-500/10 text-rose-400 text-sm rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                    <button
                      onClick={handleStartAnalysis}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shrink-0 cursor-pointer"
                      aria-label="Retry resume analysis"
                    >
                      Retry Analysis
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Action: Always available toggle for uploading a different resume */}
              {isPrePopulated && (
                <div className="pt-4 mt-4 border-t border-border/80 flex items-center justify-between">
                  <span className="text-[11px] text-ink-dim font-sans">
                    Testing a different file?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadMode(true);
                      setUseSavedResume(false);
                    }}
                    className="px-3 py-1.5 bg-surface-light hover:bg-surface border border-border hover:border-accent/40 rounded-xl text-xs font-mono font-bold text-ink transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5 text-accent" />
                    <span>Upload Different Resume</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Card: Job Description Card */}
            <div className="bg-surface p-7 sm:p-8 rounded-3xl border border-border shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between gap-2 mb-5">
                  <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Target className="w-4 h-4 text-accent" aria-hidden="true" /> Target Job Description
                  </h3>
                  <span className="text-[9px] font-mono text-ink-dim uppercase">
                    Optional for ATS Match
                  </span>
                </div>

                <textarea
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the target job description or select a role chip above to generate match score and tailored cover letter..."
                  aria-label="Target job description"
                  className="w-full p-4 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none font-sans leading-relaxed text-ink disabled:opacity-50 min-h-[190px]"
                />
              </div>

              <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-ink-dim font-mono">
                <span>Tailored Cover Letter:</span>
                <span className={jobDesc.trim() ? "text-success font-bold" : "text-ink-dim"}>
                  {jobDesc.trim() ? "Enabled (+15 Credits)" : "Paste JD to Enable"}
                </span>
              </div>
            </div>

            {/* Bottom Full-Width CTA & Credit Cost Preview */}
            <div className="md:col-span-2 space-y-3">
              {isAnalyzing ? (
                <AILoadingStepper 
                  presetKey="resume_audit" 
                  title="ATS Structural & Keyword Audit Pipeline" 
                  className="mt-2"
                />
              ) : (
                <div className="bg-surface border border-accent/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-ink uppercase">
                          Analysis Credit Preview:
                        </span>
                        <span className="px-2 py-0.5 bg-accent text-black font-mono font-extrabold text-[11px] rounded-md shadow-sm">
                          {scanCreditCost + (jobDesc.trim() ? coverLetterCreditCost : 0)} Credits
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-dim font-sans mt-0.5">
                        {scanCreditCost} credits (Resume ATS Audit) {jobDesc.trim() ? `+ ${coverLetterCreditCost} credits (Cover Letter)` : ''} · Wallet Balance: {creditWallet?.balance ?? 0}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent/90 text-black font-mono font-extrabold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-accent/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BrainCircuit className="w-5 h-5" />
                    <span>
                      {isPrePopulated ? 'Use Saved Resume & Run Audit' : 'Analyze Uploaded Resume'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : analysis ? (
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
            <div className="bg-gradient-to-r from-accent/15 via-surface to-accent/5 p-6 md:p-8 rounded-3xl border border-accent/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-accent text-white text-[9px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <BrainCircuit className="w-3 h-3" /> Explainable AI Auditor
                  </span>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    Transparent Recruiter Calibration
                  </span>
                  {(analysis.score ?? 0) <= 65 ? (
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-amber-500/20">
                      Generic Baseline (40-65 Range)
                    </span>
                  ) : (analysis.score ?? 0) <= 79 ? (
                    <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-blue-500/20">
                      Competitive Alignment (66-79 Range)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-emerald-500/20">
                      Top-Tier Match (80-100 Range)
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight">Full Math Breakdown & Recruiter Rationale</h2>
                <p className="text-xs text-ink-dim mt-1 max-w-xl">
                  {(analysis.score ?? 0) <= 65 
                    ? "Honest Scoring Rule: Generic resumes lacking hard quantified metrics or direct role alignment calibrate between 40-65. Follow the rewrites below to break into 80+."
                    : "Calibrated against specific role requirements and company benchmarks with transparent category weights."}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-background/80 px-6 py-4 rounded-2xl border border-border shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider block">ATS Match Score</span>
                  <span className="text-3xl font-black text-accent">{analysis.score ?? 0} <span className="text-sm font-normal text-ink-dim">/ 100</span></span>
                </div>
                <span className={cn(
                  "status-pill text-xs font-bold",
                  (analysis.score ?? 0) >= 80 ? "status-offer" : (analysis.score ?? 0) >= 65 ? "status-applied" : "status-interview"
                )}>
                  {analysis.atsCompatibility || 'Calibrated'}
                </span>
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
                        Lead Recruiter Audit Memo <span className="text-[10px] lowercase text-ink-dim font-mono">(human_explanation)</span>
                      </h3>
                      <p className="text-xs text-ink-dim">Candid, transparent feedback written in plain English from hiring perspective</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(analysis.human_explanation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light border border-border rounded-xl text-[10px] font-bold text-ink-dim hover:text-accent hover:border-accent/30 transition-all uppercase tracking-widest"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Memo
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
                    Mathematical formula verifying how each category weight contributes to your final ATS score of {analysis?.score ?? 0}/100.
                  </p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-mono font-bold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Weight Total: 100%
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
                <span className="text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-accent" /> Total Mathematical Sum:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {(analysis.scoreBreakdown || []).map((cat: any, i: number) => (
                    <span key={i} className="text-ink font-bold">
                      {cat.earnedPoints ?? Math.round(((cat.score || 0) * (cat.weight || 0)) / 100)}{i < (analysis.scoreBreakdown || []).length - 1 ? " + " : ""}
                    </span>
                  ))}
                  <span className="text-accent font-black text-sm">= {analysis?.score ?? 0} / 100</span>
                </div>
              </div>
            </div>

            {/* Explicit vs Inferred Skills Audit Matrix */}
            {analysis.skillsAnalysis && analysis.skillsAnalysis.length > 0 && (
              <div className="bg-surface p-8 rounded-3xl border border-border">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" /> Audited Skills: Explicit vs. Inferred
                    </h3>
                    <p className="text-xs text-ink-dim mt-1">
                      Inferred skills (implied from tooling or frameworks) are lowered in confidence to preserve audit integrity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded-md border border-emerald-500/20">
                      Explicit
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[9px] font-bold uppercase rounded-md border border-purple-500/20">
                      Inferred
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.skillsAnalysis.map((sk: any, i: number) => (
                    <div key={i} className="bg-background p-4 rounded-2xl border border-border flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{sk.skill}</span>
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border",
                          sk.type === 'inferred' 
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {sk.type === 'inferred' ? 'Inferred' : 'Explicit'}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-dim leading-relaxed">{sk.evidence}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] font-mono">
                        <span className="text-ink-dim">Confidence:</span>
                        <span className={cn(
                          "font-bold uppercase",
                          sk.confidence_level === 'high' ? "text-emerald-400" : sk.confidence_level === 'medium' ? "text-amber-400" : "text-rose-400"
                        )}>
                          {sk.confidence_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword Analysis & Specific Rewrites per Gap */}
            <div className="bg-surface p-8 rounded-3xl border border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" /> Missing Keyword Rationale & Bullet Rewrites
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">
                    Recruiter explanation of WHY each gap matters for THIS role at THIS company + 1 specific metric rewrite per gap.
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" /> Missing Skill: {item.keyword}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg border",
                            item.confidence_level === 'high' 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.confidence_level === 'medium'
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}>
                            {item.confidence_level} Confidence
                          </span>
                          {item.isInferred && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded-lg border border-purple-500/20">
                              Inferred Gap
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Gap #{idx + 1}</span>
                      </div>

                      {item.inferredNote && (
                        <p className="text-[11px] text-purple-300/90 italic bg-purple-500/5 p-2.5 rounded-lg border border-purple-500/10">
                          <strong>Note on Inference:</strong> {item.inferredNote}
                        </p>
                      )}

                      <div>
                        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Why It Matters For THIS Role at THIS Company:</p>
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
            title="Resume evaluation complete"
            contextData={`ATS match score: ${analysis?.score ?? 0}%. ${(analysis?.missingKeywords || []).length > 0 ? `Identified ${(analysis?.missingKeywords || []).length} missing skill keywords (${(analysis?.missingKeywords || []).slice(0, 3).join(', ')}).` : 'High keyword alignment with target role specifications.'}`}
            primaryStep={{
              label: "Search matched jobs",
              icon: Search,
              to: "/jobs",
              state: {
                role: jobDesc ? jobDesc.split('\n')[0].slice(0, 50) : "Software Engineer",
                autoSearch: true
              }
            }}
            secondaryStep={{
              label: "Build 30-day skill roadmap",
              icon: GraduationCap,
              to: "/learning",
              state: {
                targetRole: jobDesc ? jobDesc.split('\n')[0].slice(0, 50) : "Software Engineer",
                missingSkills: analysis.missingKeywords || []
              }
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
      ) : null}
    </div>
  );
}
