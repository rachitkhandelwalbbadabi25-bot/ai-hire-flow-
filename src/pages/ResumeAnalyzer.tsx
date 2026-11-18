import { useState, ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { extractTextFromFile } from '../lib/pdf';
import { analyzeResume, generateCoverLetter } from '../lib/gemini';
import { cacheManager } from '../lib/CacheManager';
import { firestoreCache } from '../services/FirestoreCache';
import { analysisJobService } from '../services/AnalysisJobService';
import { motion, AnimatePresence } from 'motion/react';
import { useSystemOS } from '../context/SystemOSContext';
import { isDemoRole, isDemoSkills } from '../utils/demoDataSanitizer';
import { ActiveJobContext, extractJobSkills, getActiveJobKey, formatActiveJobDescription, getStoredActiveJob } from '../utils/jobContextManager';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  Copy,
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
  BookOpen,
  X,
  ExternalLink,
  Info
} from 'lucide-react';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AILoadingStepper from '../components/AILoadingStepper';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { formatCreditAvailability } from '../utils/formatters';

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

const extractedFileCache = new Map<string, string>();

interface ExtractedDoc {
  text: string;
  fileName: string;
  fileType: string;
  charCount: number;
}

/**
 * Resolves the initial state for the Resume Analyzer, ensuring that when a new active job
 * was selected in Job Finder, stale job descriptions and prior analysis results are not loaded.
 */
function getInitialAnalyzerState() {
  try {
    const currentStoredJob = getStoredActiveJob();
    const currentJobKey = getActiveJobKey(currentStoredJob);
    const savedAnalyzerJobKey = sessionStorage.getItem('resume_analyzer_active_job_key');

    const rawAnalysis = sessionStorage.getItem('resume_analyzer_result');
    const savedAnalysis = rawAnalysis ? JSON.parse(rawAnalysis) : null;
    const savedCL = sessionStorage.getItem('resume_analyzer_cover_letter') || null;
    const savedCache = (sessionStorage.getItem('resume_analyzer_cache_source') as any) || null;
    const savedDesc = sessionStorage.getItem('resume_analyzer_job_desc');

    // Case 1: An active job is selected from Job Finder, and it is DIFFERENT from what Analyzer was previously bound to
    const isDifferentJobFinderTarget = !!(
      currentStoredJob &&
      currentStoredJob.source !== 'analyzer' &&
      currentJobKey &&
      savedAnalyzerJobKey &&
      savedAnalyzerJobKey !== currentJobKey
    );

    if (isDifferentJobFinderTarget) {
      sessionStorage.removeItem('resume_analyzer_result');
      sessionStorage.removeItem('resume_analyzer_cover_letter');
      sessionStorage.removeItem('resume_analyzer_cache_source');

      const newDesc = currentStoredJob ? formatActiveJobDescription(currentStoredJob) : '';
      sessionStorage.setItem('resume_analyzer_job_desc', newDesc);
      sessionStorage.setItem('resume_analyzer_active_job_key', currentJobKey);

      return {
        jobDesc: newDesc,
        analysis: null,
        coverLetter: null,
        cacheSource: null as 'browser' | 'persistent' | null,
        activeJobKey: currentJobKey
      };
    }

    // Case 2: An active job is selected in Job Finder for the first time (no saved analysis yet)
    if (currentJobKey && currentStoredJob?.source !== 'analyzer' && savedAnalyzerJobKey !== currentJobKey && !savedAnalysis) {
      const newDesc = currentStoredJob ? formatActiveJobDescription(currentStoredJob) : '';
      sessionStorage.setItem('resume_analyzer_job_desc', newDesc);
      sessionStorage.setItem('resume_analyzer_active_job_key', currentJobKey);

      return {
        jobDesc: newDesc,
        analysis: null,
        coverLetter: null,
        cacheSource: null as 'browser' | 'persistent' | null,
        activeJobKey: currentJobKey
      };
    }

    // Case 3: Same active job key, analyzer context, or preserving custom manual JD input across normal navigation
    let effectiveDesc = savedDesc ?? '';
    if (!effectiveDesc && currentStoredJob) {
      effectiveDesc = formatActiveJobDescription(currentStoredJob);
      sessionStorage.setItem('resume_analyzer_job_desc', effectiveDesc);
    }

    const effectiveKey = currentJobKey || savedAnalyzerJobKey || null;
    if (effectiveKey) {
      sessionStorage.setItem('resume_analyzer_active_job_key', effectiveKey);
    }

    return {
      jobDesc: effectiveDesc,
      analysis: savedAnalysis,
      coverLetter: savedCL,
      cacheSource: savedCache,
      activeJobKey: effectiveKey
    };
  } catch (e) {
    return {
      jobDesc: '',
      analysis: null,
      coverLetter: null,
      cacheSource: null as 'browser' | 'persistent' | null,
      activeJobKey: null
    };
  }
}

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  const { checkAccess, deductCredit, creditWallet, creditCosts } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();

  const initialAnalyzerState = useMemo(() => getInitialAnalyzerState(), []);
  const [file, setFile] = useState<File | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDoc | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [jobDesc, setJobDesc] = useState<string>(initialAnalyzerState.jobDesc);
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
    if (!user?.uid) {
      setLoadingMaster(false);
      return;
    }
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
  }, [user?.uid]);

  const { currentActiveJob, setCurrentActiveJob, clearCurrentJobContext } = useSystemOS();
  const isAnalyzingRef = useRef(false);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setElapsedSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleCancelAnalysis = () => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    const activeId = analysisJobService.getActiveJobId();
    if (activeId) {
      analysisJobService.cancelJob(activeId, user?.uid);
      analysisJobService.clearActiveJobId();
    }
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
    setAnalysisStatus('');
    setIsCanceled(true);
  };

  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const isGeneratingCLRef = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('Auditing resume against ATS benchmarks...');
  const [analysis, setAnalysis] = useState<any>(initialAnalyzerState.analysis);
  const [coverLetter, setCoverLetter] = useState<string | null>(initialAnalyzerState.coverLetter);
  const [error, setError] = useState<string | null>(null);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'browser' | 'persistent' | null>(initialAnalyzerState.cacheSource);
  const activeJobKeyRef = useRef<string | null>(initialAnalyzerState.activeJobKey);
  const analyzerGeneratedJobKeyRef = useRef<string | null>(
    currentActiveJob?.source === 'analyzer' ? getActiveJobKey(currentActiveJob) : null
  );
  const analyzerPersistenceReadyRef = useRef<boolean>(false);

  useEffect(() => {
    analyzerPersistenceReadyRef.current = true;
  }, []);

  // Sync state to sessionStorage to preserve across navigation (NAVIGATION != RESET)
  useEffect(() => {
    if (!analyzerPersistenceReadyRef.current && !analysis) {
      return;
    }
    try {
      if (analysis) {
        sessionStorage.setItem('resume_analyzer_result', JSON.stringify(analysis));
      } else {
        sessionStorage.removeItem('resume_analyzer_result');
      }
    } catch (e) {}
  }, [analysis]);

  useEffect(() => {
    if (!analyzerPersistenceReadyRef.current && !coverLetter) {
      return;
    }
    try {
      if (coverLetter) {
        sessionStorage.setItem('resume_analyzer_cover_letter', coverLetter);
      } else {
        sessionStorage.removeItem('resume_analyzer_cover_letter');
      }
    } catch (e) {}
  }, [coverLetter]);

  useEffect(() => {
    if (!analyzerPersistenceReadyRef.current && !cacheSource) {
      return;
    }
    try {
      if (cacheSource) {
        sessionStorage.setItem('resume_analyzer_cache_source', cacheSource);
      } else {
        sessionStorage.removeItem('resume_analyzer_cache_source');
      }
    } catch (e) {}
  }, [cacheSource]);

  useEffect(() => {
    if (!analyzerPersistenceReadyRef.current && !jobDesc) {
      return;
    }
    try {
      if (jobDesc) {
        sessionStorage.setItem('resume_analyzer_job_desc', jobDesc);
      } else {
        sessionStorage.removeItem('resume_analyzer_job_desc');
      }
    } catch (e) {}
  }, [jobDesc]);

  // Reconnect to active background job if navigating back or refreshing
  useEffect(() => {
    const activeJobId = analysisJobService.getActiveJobId();
    if (activeJobId && !analysis) {
      let isMounted = true;
      setIsAnalyzing(true);
      isAnalyzingRef.current = true;
      setAnalysisStatus('Auditing resume against ATS benchmarks...');

      const checkActiveJob = async () => {
        try {
          const statusData = await analysisJobService.getJobStatus(activeJobId);
          if (!isMounted) return;

          if (statusData.status === 'completed' && statusData.result) {
            setAnalysis(statusData.result);
            analysisJobService.clearActiveJobId();
            setIsAnalyzing(false);
            isAnalyzingRef.current = false;
          } else if (statusData.status === 'failed') {
            analysisJobService.clearActiveJobId();
            setIsAnalyzing(false);
            isAnalyzingRef.current = false;
            setError(statusData.error || 'Analysis is taking longer than expected. Please retry in a moment.');
          } else {
            // Poll until completion
            const interval = setInterval(async () => {
              try {
                const s = await analysisJobService.getJobStatus(activeJobId);
                if (!isMounted) {
                  clearInterval(interval);
                  return;
                }
                if (s.status === 'completed' && s.result) {
                  clearInterval(interval);
                  setAnalysis(s.result);
                  analysisJobService.clearActiveJobId();
                  setIsAnalyzing(false);
                  isAnalyzingRef.current = false;
                } else if (s.status === 'failed') {
                  clearInterval(interval);
                  analysisJobService.clearActiveJobId();
                  setIsAnalyzing(false);
                  isAnalyzingRef.current = false;
                  setError(s.error || 'Analysis is taking longer than expected. Please retry in a moment.');
                }
              } catch (e) {
                // Keep polling
              }
            }, 2500);

            return () => clearInterval(interval);
          }
        } catch (e) {
          if (isMounted) {
            analysisJobService.clearActiveJobId();
            setIsAnalyzing(false);
            isAnalyzingRef.current = false;
          }
        }
      };

      checkActiveJob();

      return () => {
        isMounted = false;
      };
    }
  }, []);

  // Complete fresh start for Resume Analyzer
  const handleFullReset = () => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    const activeId = analysisJobService.getActiveJobId();
    if (activeId) {
      analysisJobService.cancelJob(activeId, user?.uid);
    }
    analysisJobService.clearActiveJobId();
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
    setIsCanceled(false);
    setAnalysis(null);
    setCoverLetter(null);
    setFile(null);
    setExtractedDoc(null);
    setJobDesc('');
    setError(null);
    setCacheSource(null);
    clearCurrentJobContext();
    activeJobKeyRef.current = null;
    analyzerGeneratedJobKeyRef.current = null;
    try {
      sessionStorage.removeItem('resume_analyzer_active_job_key');
      sessionStorage.removeItem('resume_analyzer_result');
      sessionStorage.removeItem('resume_analyzer_cover_letter');
      sessionStorage.removeItem('resume_analyzer_cache_source');
      sessionStorage.removeItem('resume_analyzer_job_desc');
    } catch (e) {}
  };

  // Detect active job changes and automatically synchronize Analyzer
  useEffect(() => {
    const currentKey = getActiveJobKey(currentActiveJob);

    // If active job matches the key generated by Analyzer itself, do NOT treat it as a new job change
    if (currentKey && analyzerGeneratedJobKeyRef.current === currentKey) {
      activeJobKeyRef.current = currentKey;
      try {
        sessionStorage.setItem('resume_analyzer_active_job_key', currentKey);
      } catch (e) {}
      return;
    }

    // If the active job has changed from what Analyzer is currently bound to
    if (activeJobKeyRef.current !== currentKey) {
      activeJobKeyRef.current = currentKey;

      // Cancel any running background analysis job from the previous job
      if (analysisAbortRef.current) {
        analysisAbortRef.current.abort();
        analysisAbortRef.current = null;
      }
      const activeBackgroundId = analysisJobService.getActiveJobId();
      if (activeBackgroundId) {
        analysisJobService.cancelJob(activeBackgroundId, user?.uid);
        analysisJobService.clearActiveJobId();
        setIsAnalyzing(false);
        isAnalyzingRef.current = false;
      }

      // If active job was set by Analyzer itself (e.g. derived context after analysis or learning path bridge),
      // NEVER clear the analyzer result! Keep active job key in sync.
      if (currentActiveJob?.source === 'analyzer') {
        analyzerGeneratedJobKeyRef.current = currentKey;
        try {
          if (currentKey) {
            sessionStorage.setItem('resume_analyzer_active_job_key', currentKey);
          }
        } catch (e) {}
        return;
      }

      if (currentActiveJob && currentKey) {
        // Automatically load the NEW active job's title, company, location, and description
        const newDesc = formatActiveJobDescription(currentActiveJob);
        setJobDesc(newDesc);
        // Clear previous job-specific analysis, cover letter, and cache
        setAnalysis(null);
        setCoverLetter(null);
        setCacheSource(null);
        setError(null);

        try {
          sessionStorage.setItem('resume_analyzer_active_job_key', currentKey);
          sessionStorage.setItem('resume_analyzer_job_desc', newDesc);
          sessionStorage.removeItem('resume_analyzer_result');
          sessionStorage.removeItem('resume_analyzer_cover_letter');
          sessionStorage.removeItem('resume_analyzer_cache_source');
        } catch (e) {}
      } else {
        // Active job was unselected / cleared
        // Only reset if there is NO existing completed analysis to prevent normal navigation from wiping results
        const hasExistingResult = !!sessionStorage.getItem('resume_analyzer_result');
        if (!hasExistingResult) {
          setJobDesc('');
          setAnalysis(null);
          setCoverLetter(null);
          setCacheSource(null);
          setError(null);

          try {
            sessionStorage.removeItem('resume_analyzer_active_job_key');
            sessionStorage.removeItem('resume_analyzer_job_desc');
            sessionStorage.removeItem('resume_analyzer_result');
            sessionStorage.removeItem('resume_analyzer_cover_letter');
            sessionStorage.removeItem('resume_analyzer_cache_source');
          } catch (e) {}
        }
      }
    }
  }, [currentActiveJob, user?.uid]);

  // Support explicit route navigation (e.g. from "Analyze Compatibility")
  useEffect(() => {
    if (location.state?.jobDescription) {
      setJobDesc(location.state.jobDescription);
      try {
        sessionStorage.setItem('resume_analyzer_job_desc', location.state.jobDescription);
      } catch (e) {}
      if (location.state?.forceResetAnalysis) {
        setAnalysis(null);
        setCoverLetter(null);
        setCacheSource(null);
        setError(null);
        try {
          sessionStorage.removeItem('resume_analyzer_result');
          sessionStorage.removeItem('resume_analyzer_cover_letter');
          sessionStorage.removeItem('resume_analyzer_cache_source');
        } catch (e) {}
      }
    }
  }, [location.state]);

  // Derive complete Analyzer Job Context for inter-module cross-pollination (Learning Path, Simulator, Tracker)
  const getAnalyzerJobContext = (overrideAnalysis?: any) => {
    const activeAnalysis = overrideAnalysis || analysis;
    let role = '';

    // 1. Current active job from context (if set and not demo)
    if (currentActiveJob?.title && !isDemoRole(currentActiveJob.title)) {
      role = currentActiveJob.title;
    }

    // 2. Direct analysis targetRole if returned by AI
    if (!role && activeAnalysis?.targetRole && !isDemoRole(activeAnalysis.targetRole)) {
      role = activeAnalysis.targetRole;
    }
    if (!role && activeAnalysis?.targetJobTitle && !isDemoRole(activeAnalysis.targetJobTitle)) {
      role = activeAnalysis.targetJobTitle;
    }

    // 3. Extract role title from job description
    if (!role && jobDesc && jobDesc.trim()) {
      // Check explicit labels
      const labelMatch = jobDesc.match(/(?:job\s+title|target\s+role|role|position|opening)\s*[:\-]\s*([^\n\r]+)/i);
      if (labelMatch && labelMatch[1]) {
        const cleaned = labelMatch[1].replace(/^(?:looking for|hiring|seeking)\s+/i, '').trim();
        if (cleaned.length > 2 && cleaned.length < 60 && !isDemoRole(cleaned)) {
          role = cleaned;
        }
      }

      if (!role) {
        // Inspect first 3 non-empty lines for role title
        const lines = jobDesc.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines.slice(0, 3)) {
          const cleaned = line.replace(/^(role|position|job title|title|target role)\s*[:\-]\s*/i, '').trim();
          if (
            cleaned.length > 2 && 
            cleaned.length < 60 && 
            !/^(about|overview|company|responsibilities|qualifications|requirements|we are|who we are|location|salary|benefits)/i.test(cleaned) &&
            !isDemoRole(cleaned)
          ) {
            role = cleaned;
            break;
          }
        }
      }

      if (!role) {
        // Match common job title phrases
        const titleMatch = jobDesc.match(/\b([A-Za-z\s]{3,35}\s(?:Engineer|Developer|Architect|Manager|Designer|Analyst|Scientist|DevOps|Lead|Consultant|Specialist|Administrator))\b/i);
        if (titleMatch && titleMatch[1] && !isDemoRole(titleMatch[1])) {
          role = titleMatch[1].trim();
        }
      }
    }

    // 4. Extract from summary / headline or master resume if available
    if (!role && activeAnalysis?.summary) {
      const summaryMatch = activeAnalysis.summary.match(/\b([A-Za-z\s]{3,35}\s(?:Engineer|Developer|Architect|Manager|Designer|Analyst|Scientist|DevOps|Lead|Consultant|Specialist|Administrator))\b/i);
      if (summaryMatch && summaryMatch[1] && !isDemoRole(summaryMatch[1])) {
        role = summaryMatch[1].trim();
      }
    }

    if (!role && masterResume?.experience && masterResume.experience.length > 0) {
      const expRole = masterResume.experience[0]?.role;
      if (expRole && !isDemoRole(expRole)) {
        role = expRole.trim();
      }
    }

    if (!role && extractedDoc?.fileName) {
      const cleanDocTitle = extractedDoc.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const docMatch = cleanDocTitle.match(/\b([A-Za-z\s]{3,35}\s(?:Engineer|Developer|Architect|Manager|Designer|Analyst|Scientist|DevOps|Lead|Consultant|Specialist|Administrator))\b/i);
      if (docMatch && docMatch[1] && !isDemoRole(docMatch[1])) {
        role = docMatch[1].trim();
      }
    }

    // 5. Default fallback if analysis exists
    if (!role && activeAnalysis) {
      role = 'Software Engineer';
    }

    // Extract skills and gaps
    const skillsSet = new Set<string>();

    // Priority A: Missing skill keywords from ATS audit
    if (activeAnalysis?.missingKeywords && Array.isArray(activeAnalysis.missingKeywords)) {
      activeAnalysis.missingKeywords.forEach((s: any) => {
        if (typeof s === 'string' && s.trim().length > 0 && !isDemoSkills(s)) {
          const clean = s.trim();
          if (clean !== 'undefined' && clean !== 'null') skillsSet.add(clean);
        }
      });
    }

    // Priority B: Skills analysis
    if (activeAnalysis?.skillsAnalysis && Array.isArray(activeAnalysis.skillsAnalysis)) {
      activeAnalysis.skillsAnalysis.forEach((item: any) => {
        const skillName = typeof item === 'string' ? item : item?.skill;
        if (typeof skillName === 'string' && skillName.trim().length > 0 && !isDemoSkills(skillName)) {
          const clean = skillName.trim();
          if (clean !== 'undefined' && clean !== 'null') skillsSet.add(clean);
        }
      });
    }

    // Priority C: Current active job skills
    if (currentActiveJob?.skills && Array.isArray(currentActiveJob.skills)) {
      currentActiveJob.skills.forEach((s: any) => {
        if (typeof s === 'string' && s.trim().length > 0 && !isDemoSkills(s)) {
          const clean = s.trim();
          if (clean !== 'undefined' && clean !== 'null') skillsSet.add(clean);
        }
      });
    }

    // Priority D: Extract from job description if still few skills
    if (skillsSet.size < 3 && jobDesc && jobDesc.trim()) {
      const extracted = extractJobSkills({ title: role || 'Software Engineer', description: jobDesc });
      extracted.forEach((s: string) => {
        if (typeof s === 'string' && s.trim().length > 0 && !isDemoSkills(s)) {
          const clean = s.trim();
          if (clean !== 'undefined' && clean !== 'null') skillsSet.add(clean);
        }
      });
    }

    // Extract recommendations
    const recommendations: string[] = [];
    if (activeAnalysis?.recommendations && Array.isArray(activeAnalysis.recommendations)) {
      activeAnalysis.recommendations.forEach((rec: any) => {
        const text = typeof rec === 'string' ? rec : (rec?.recommendation || rec?.action || '');
        if (typeof text === 'string' && text.trim().length > 0) {
          recommendations.push(text.trim());
        }
      });
    }

    let company = currentActiveJob?.company || '';
    if (!company && jobDesc) {
      const match = jobDesc.match(/(?:at|company:?|organization:?)\s+([A-Z][A-Za-z0-9&., ]{1,30})/);
      if (match && match[1]) {
        company = match[1].trim();
      }
    }

    const skills = Array.from(skillsSet).slice(0, 8);

    return {
      role: role.trim(),
      skills,
      recommendations,
      company: (company || (role ? 'Target Opportunity' : '')).trim(),
      description: jobDesc || currentActiveJob?.description || ''
    };
  };

  // Dedicated reliable context transfer from Resume Analyzer to Learning Path
  const handleNavigateToLearningPath = () => {
    const ctx = getAnalyzerJobContext();
    const cleanRole = ctx.role || 'Software Engineer';
    const cleanSkills = ctx.skills || [];
    const skillsStr = cleanSkills.join(', ');

    // 1. Persist directly to sessionStorage for bulletproof persistence across page loads & refreshes
    try {
      sessionStorage.setItem('learning_path_target_role', cleanRole);
      if (skillsStr) {
        sessionStorage.setItem('learning_path_skills', skillsStr);
      }
      sessionStorage.setItem('learning_path_analyzer_context', JSON.stringify({
        from: 'analyzer',
        targetRole: cleanRole,
        missingSkills: cleanSkills,
        targetSkills: cleanSkills,
        recommendations: ctx.recommendations || [],
        atsScore: normalizedAnalysis?.score ?? 0,
        jobContext: {
          title: cleanRole,
          company: ctx.company || 'Target Opportunity',
          skills: cleanSkills,
          description: jobDesc,
          source: 'analyzer'
        },
        transferredAt: Date.now()
      }));
    } catch (e) {
      console.warn('SessionStorage write error for learning path context:', e);
    }

    // 2. Set current active job in system OS context
    if (currentActiveJob && (currentActiveJob.title.toLowerCase() === cleanRole.toLowerCase() || !isDemoRole(currentActiveJob.title))) {
      // Preserve the real job metadata intact
      setCurrentActiveJob({
        ...currentActiveJob,
        skills: cleanSkills.length > 0 ? cleanSkills : currentActiveJob.skills,
        description: jobDesc || currentActiveJob.description,
        selectedAt: Date.now()
      });
    } else {
      setCurrentActiveJob({
        title: cleanRole,
        company: ctx.company || 'Target Opportunity',
        skills: cleanSkills,
        description: jobDesc,
        source: 'analyzer',
        selectedAt: Date.now()
      });
    }

    // 3. React Router navigation with explicit state payload
    navigate('/learning', {
      state: {
        from: 'analyzer',
        targetRole: cleanRole,
        missingSkills: cleanSkills,
        targetSkills: cleanSkills,
        recommendations: ctx.recommendations || [],
        jobContext: {
          title: cleanRole,
          company: ctx.company || 'Target Opportunity',
          skills: cleanSkills,
          description: jobDesc,
          source: currentActiveJob?.source || 'analyzer',
          provider: currentActiveJob?.provider,
          link: currentActiveJob?.link,
          isRemote: currentActiveJob?.isRemote,
          location: currentActiveJob?.location
        }
      }
    });
  };

  // Normalized ATS Audit Object guaranteeing all 12 sections have recruiter-grade data
  const normalizedAnalysis = useMemo(() => {
    if (!analysis) return null;

    const activeResumeText = (useSavedResume && masterResume ? formatMasterResumeToText(masterResume) : extractedDoc?.text) || '';
    const activeResumeLower = activeResumeText.toLowerCase();
    const activeJDLower = (jobDesc || '').toLowerCase();

    const isVueInJD = /\b(vue|vuejs|vue\.js)\b/i.test(activeJDLower);
    const isVueInResume = /\b(vue|vuejs|vue\.js)\b/i.test(activeResumeLower);

    // 4-Category Weighted Score Breakdown Normalization
    const canonicalCategories = [
      { name: 'Core Technical & Skill Match', weight: 40 },
      { name: 'Measurable Impact & Hard Metrics', weight: 25 },
      { name: 'Role & Domain Relevance', weight: 20 },
      { name: 'Structure & ATS Parsability', weight: 15 }
    ];

    const rawBreakdown = Array.isArray(analysis.scoreBreakdown) ? analysis.scoreBreakdown : [];
    const fallbackCategoryScore = typeof analysis.score === 'number' && !isNaN(analysis.score)
      ? Math.min(100, Math.max(0, Math.round(analysis.score)))
      : 50;

    let totalScore = 0;
    const normalizedBreakdown = canonicalCategories.map((canon, idx) => {
      const matched = rawBreakdown.find((item: any) =>
        item?.category && item.category.toLowerCase().includes(canon.name.toLowerCase().split('&')[0].trim().toLowerCase())
      ) || rawBreakdown[idx] || {};

      const rawCatScore = typeof matched.score === 'number' ? matched.score : Number(matched.score);
      const catScore = !isNaN(rawCatScore) ? Math.min(100, Math.max(0, Math.round(rawCatScore))) : fallbackCategoryScore;
      
      // Full-precision calculation, 1-decimal rounding for display
      const rawEarned = (catScore / 100) * canon.weight;
      totalScore += rawEarned;
      const earned = Number(rawEarned.toFixed(1));

      // Ensure category explanation is coherent with the category score
      let explanation = typeof matched.explanation === 'string' && matched.explanation.trim()
        ? matched.explanation.trim()
        : '';

      if (!explanation || (catScore < 60 && explanation.toLowerCase().includes('strong')) || (catScore >= 75 && explanation.toLowerCase().includes('lacks'))) {
        if (catScore < 60) {
          if (canon.name.includes('Core Technical')) {
            explanation = 'Key role-specific technologies from the target job are not evidenced in candidate experience bullets.';
          } else if (canon.name.includes('Impact')) {
            explanation = 'Experience descriptions focus on routine tasks without verifiable metrics, latency figures, or scale.';
          } else if (canon.name.includes('Domain')) {
            explanation = 'Demonstrated project scope and domain experience show limited direct alignment with target benchmarks.';
          } else {
            explanation = 'Formatting and section hierarchy require standardized ATS column parsing structure.';
          }
        } else if (catScore < 75) {
          explanation = `Candidate demonstrates competitive baseline competency in ${canon.name.toLowerCase()}, with opportunities to expand evidence.`;
        } else {
          explanation = `Strong validated competency in ${canon.name.toLowerCase()} supported by concrete resume evidence.`;
        }
      }

      const evidence = typeof matched.evidence === 'string' && matched.evidence.trim()
        ? matched.evidence.trim()
        : (catScore >= 70 ? 'Identified relevant experience in resume.' : 'Limited verifiable evidence in candidate bullets.');

      return {
        ...matched,
        category: canon.name,
        weight: canon.weight,
        score: catScore,
        earnedPoints: earned,
        mathExplanation: `(${catScore}/100) × ${canon.weight}% ≈ ${earned.toFixed(1)} pts`,
        explanation,
        evidence,
        recommendations: Array.isArray(matched.recommendations) && matched.recommendations.length > 0
          ? matched.recommendations.map((r: any) => String(r).trim()).filter(Boolean)
          : [`Enhance ${canon.name.toLowerCase()} with further specific achievements.`]
      };
    });

    const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));
    const atsCompatibility = analysis.atsCompatibility || (finalScore >= 80 ? 'High' : finalScore >= 60 ? 'Moderate' : 'Low');

    // 1. Identified Target Keywords: verified in resume text
    const rawKeywords = Array.isArray(analysis.keywordsFound) && analysis.keywordsFound.length > 0
      ? analysis.keywordsFound.map(String).filter(Boolean)
      : (analysis.skillsAnalysis || []).filter((s: any) => s.type === 'explicit').map((s: any) => s.skill);

    let keywordsFound = rawKeywords;
    if (!isVueInJD && !isVueInResume) {
      keywordsFound = keywordsFound.filter((k: string) => !/\b(vue|vuejs|vue\.js)\b/i.test(k));
    }
    const keywordsFoundLower = new Set(keywordsFound.map((k: string) => k.toLowerCase().trim()));

    // 2. Missing Keywords: strictly mutually exclusive with keywordsFound & resume evidence
    let rawMissingKeywords: string[] = Array.isArray(analysis.missingKeywords)
      ? analysis.missingKeywords
          .map(String)
          .filter((k: string) => {
            const cleanK = k.toLowerCase().trim();
            if (!cleanK) return false;
            if (keywordsFoundLower.has(cleanK)) return false;
            if (activeResumeLower.includes(cleanK) && cleanK.length >= 3) return false;
            return true;
          })
      : [];

    if (!isVueInJD && !isVueInResume) {
      rawMissingKeywords = rawMissingKeywords.filter((k: string) => !/\b(vue|vuejs|vue\.js)\b/i.test(k));
    }

    // Helper for generating distinct, gap-specific rationale and actions
    const generateGapSpecificAction = (kw: string, hasDirectMention: boolean, idx: number) => {
      const kwLower = kw.toLowerCase();
      let gapType = 'genuine_gap';
      let why = '';
      let rewrite = '';

      if (hasDirectMention) {
        gapType = 'direct_evidence_unclear';
        why = `This position requires proven competency in ${kw}. While your resume mentions ${kw}, it is not clearly tied to an outcome-oriented project bullet.`;
        rewrite = `Move your existing ${kw} implementation into a dedicated project bullet and explicitly describe the technical scope, components, and delivered functionality.`;
      } else if (/\b(docker|kubernetes|k8s|container|helm|podman)\b/i.test(kwLower)) {
        gapType = 'genuine_gap';
        why = `Target job specifications emphasize ${kw} to ensure reproducible production environments, container orchestration, and reliable deployment workflows.`;
        rewrite = `Build a containerized deployment workflow or Dockerfile configuration for one of your existing backend repositories to establish verifiable proof of work with ${kw}.`;
      } else if (/\b(aws|gcp|azure|cloud|terraform|ansible|lambda|cloudformation)\b/i.test(kwLower)) {
        gapType = 'genuine_gap';
        why = `Cloud infrastructure and ${kw} expertise are key role criteria for provisioning scalable distributed systems and cloud services.`;
        rewrite = `Deploy one of your existing full-stack projects to cloud infrastructure (${kw}) and document the architecture and cloud services in a dedicated project bullet.`;
      } else if (/\b(jest|cypress|pytest|testing|ci\/cd|github actions|jenkins|automation)\b/i.test(kwLower)) {
        gapType = 'genuine_gap';
        why = `Production engineering environments require ${kw} to maintain high test coverage, reliable CI validation, and regression prevention.`;
        rewrite = `Incorporate automated test suites (${kw}) into an existing codebase and document your testing coverage standards in your experience section.`;
      } else if (/\b(sql|postgres|postgresql|mysql|mongodb|redis|database|nosql)\b/i.test(kwLower)) {
        gapType = 'genuine_gap';
        why = `Data persistence and ${kw} query proficiency are core requirements for architecting performant data layers and managing relational or key-value schemas.`;
        rewrite = `Document the schema design, indexing strategies, and query optimizations involving ${kw} in your backend project descriptions.`;
      } else if (/\b(react|typescript|next\.js|angular|tailwind|javascript)\b/i.test(kwLower)) {
        gapType = 'genuine_gap';
        why = `Target specifications mandate production-grade ${kw} experience to build responsive, accessible, and high-performance client architectures.`;
        rewrite = `Develop a focused technical proof-of-work project implementing ${kw} with component state management and modular architecture.`;
      } else if (idx === 1) {
        gapType = 'transferable_evidence';
        why = `Recruiters look for direct hands-on experience with ${kw}. Your background demonstrates transferable engineering foundations, but the specific tool is not highlighted.`;
        rewrite = `Your technical projects demonstrate relevant software delivery, but ${kw} is not explicitly evidenced. If your work actually involved ${kw}, name it directly in the relevant project bullet.`;
      } else if (idx === 3) {
        gapType = 'weak_evidence';
        why = `Technical screeners discount standalone skills without implementation context. Detail how you practically applied ${kw} in your work.`;
        rewrite = `You mention ${kw} in your skills list, but your resume does not explain how it was applied. Expand the relevant project bullet with the actual steps, configuration, or workflows you performed.`;
      } else {
        gapType = 'genuine_gap';
        why = `Target job requirements specify ${kw} as a key qualification. Your resume does not currently show evidence of this tool or workflow.`;
        rewrite = `No direct evidence of ${kw} was found in your resume. Do not add a ${kw} bullet unless you have actually built an end-to-end workflow with it. If you have, add the real project and describe the actual pipeline.`;
      }

      return { gapType, why, rewrite };
    };

    // Missing Keyword Analysis: situational, truthful, non-repetitive
    const missingKeywordAnalysis = (
      Array.isArray(analysis.missingKeywordAnalysis) && analysis.missingKeywordAnalysis.length > 0
        ? analysis.missingKeywordAnalysis
        : rawMissingKeywords.slice(0, 4).map((kw: string) => ({
            keyword: kw,
            whyItMatters: '',
            suggestedRewrite: '',
            confidence_level: 'high',
            isInferred: false,
            inferredNote: ''
          }))
    )
      .filter((item: any) => {
        const kw = String(item.keyword || '').trim().toLowerCase();
        if (!kw || keywordsFoundLower.has(kw)) return false;
        if (!isVueInJD && !isVueInResume && /\b(vue|vuejs|vue\.js)\b/i.test(kw)) return false;
        return true;
      })
      .slice(0, 4)
      .map((item: any, idx: number) => {
        const kw = String(item.keyword || '').trim();
        let why = String(item.whyItMatters || '').trim();
        let rewrite = String(item.suggestedRewrite || '').trim();
        let gapType = item.gapType || '';

        const hasDirectMention = activeResumeLower.includes(kw.toLowerCase());

        // Detect generic repetitive template strings or fabricated 20%/30% metrics
        const isGeneric = !rewrite
          || rewrite.includes('Add a verified bullet demonstrating')
          || rewrite.includes('improving throughput by')
          || rewrite.includes('improved efficiency by')
          || rewrite.includes('throughput by 20%')
          || rewrite.includes('efficiency by 20%')
          || rewrite.includes('throughput by 30%');

        if (isGeneric || !why || why.includes('to verify qualification') || why.includes('Recruiters require')) {
          const generated = generateGapSpecificAction(kw, hasDirectMention, idx);
          gapType = generated.gapType;
          why = generated.why;
          rewrite = generated.rewrite;
        }

        if (!gapType) {
          gapType = hasDirectMention ? 'direct_evidence_unclear' : (idx === 1 ? 'transferable_evidence' : (idx === 3 ? 'weak_evidence' : 'genuine_gap'));
        }

        return {
          ...item,
          keyword: kw,
          gapType,
          whyItMatters: why,
          suggestedRewrite: rewrite
        };
      });

    const finalMissingKeywords: string[] = missingKeywordAnalysis.length > 0
      ? missingKeywordAnalysis.map((m: any) => String(m.keyword || ''))
      : rawMissingKeywords;
    const finalMissingKeywordsLower = new Set<string>(finalMissingKeywords.map((k: string) => k.toLowerCase().trim()));

    // 3. Strengths: Ensure array of distinct items & filter unsupported tool claims & missing keywords
    const rawStrengths = Array.isArray(analysis.strengths) && analysis.strengths.length > 0
      ? analysis.strengths.map(String).filter(Boolean)
      : normalizedBreakdown
          .filter((cat: any) => (cat.score ?? 0) >= 70)
          .map((cat: any) => `${cat.category}: ${cat.explanation || 'Demonstrated foundational technical capabilities.'}`);

    const unsupportedToolsToCheck = [
      'cursor', 'copilot', 'github copilot', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
      'vue', 'angular', 'graphql', 'next.js', 'redis', 'kafka', 'jenkins', 'ci/cd', 'terraform'
    ];

    let strengths = rawStrengths.filter((str: string) => {
      const sLower = str.toLowerCase();
      // Never claim a tool that is currently in missing keywords
      for (const missingKw of finalMissingKeywordsLower) {
        if (missingKw && sLower.includes(missingKw)) return false;
      }
      for (const tool of unsupportedToolsToCheck) {
        if (sLower.includes(tool)) {
          if (!activeResumeLower.includes(tool) && !keywordsFoundLower.has(tool)) {
            return false;
          }
        }
      }
      return true;
    });

    if (strengths.length === 0 && keywordsFound.length > 0) {
      strengths = keywordsFound.slice(0, 3).map((k: string) => `${k} implementation directly evidenced in candidate experience.`);
    } else if (strengths.length === 0) {
      strengths = ['Demonstrated foundational technical capabilities aligned with role expectations.'];
    }

    // 4. Weaknesses / Defects: Non-duplicate diagnosis, degree positioning conversion
    const degreeRegex = /\b(bba|bachelor of business|mba|degree|non-tech|non-cs|major in business|academic background|computer science degree|cs degree)\b/i;

    const orthogonalWeaknessPool = [
      {
        problem: 'Lack of quantified business impact and operational metrics across project bullets.',
        whyItMatters: 'Recruiters evaluate candidate seniority and engineering ROI through concrete numbers, scale, and measurable deliverables.',
        howToFix: 'Quantify at least 2-3 project achievements with measurable throughput, user adoption, latency, or velocity figures.'
      },
      {
        problem: 'Absence of architectural context and system design trade-offs in project descriptions.',
        whyItMatters: 'Senior screeners look for architectural rationale, schema choices, and technical trade-offs to verify engineering maturity.',
        howToFix: 'Describe technical problem constraints, architectural components, and design decisions alongside routine implementation details.'
      },
      {
        problem: 'Task-oriented bullet phrasing without explicit technical ownership scope.',
        whyItMatters: 'Recruiters discount passive or responsibility-based descriptions in favor of proactive engineering ownership.',
        howToFix: 'Begin bullets with strong technical action verbs indicating end-to-end design, delivery, and operational ownership.'
      },
      {
        problem: 'Under-specified testing and automated quality assurance workflows in delivery bullets.',
        whyItMatters: 'Production environments require robust unit, integration, and CI validation to ensure system reliability.',
        howToFix: 'Specify test frameworks, automated pipeline triggers, or code-coverage standards utilized in your projects.'
      }
    ];

    let orthogonalIdx = 0;
    const rawWeaknesses = Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0
      ? analysis.weaknesses
      : normalizedBreakdown
          .filter((cat: any) => (cat.score ?? 0) < 75)
          .map((cat: any) => ({
            problem: `${cat.category} score is calibrated below top-tier threshold (${cat.score ?? 0}/100).`,
            whyItMatters: cat.explanation || 'Deficiencies in this category directly reduce recruiter screening pass-rates.',
            howToFix: Array.isArray(cat.recommendations) && cat.recommendations[0]
              ? cat.recommendations[0]
              : 'Add concrete metrics, throughput improvements, and role-specific keywords.'
          }));

    const weaknesses = rawWeaknesses.map((w: any) => {
      let problem = '';
      let whyItMatters = '';
      let howToFix = '';

      if (typeof w === 'object' && w !== null) {
        problem = String(w.problem || w.issue || w.gap || w.title || '').trim();
        whyItMatters = String(w.whyItMatters || w.why || w.impact || 'ATS parsers and technical screeners look for verified metrics to gauge candidate qualification.').trim();
        howToFix = String(w.howToFix || w.fix || w.recommendation || 'Quantify bullet points with specific metrics, percentages, and role-aligned tools.').trim();
      } else {
        problem = String(w || '').trim();
        whyItMatters = 'Recruiters and automated screeners downgrade resumes with unverified or unquantified claims.';
        howToFix = 'Strengthen this section with measurable accomplishments, industry-standard keywords, and technical context.';
      }

      // Convert degree / BBA background to Positioning Recommendation
      if (degreeRegex.test(problem) || degreeRegex.test(whyItMatters)) {
        return {
          problem: 'Positioning Recommendation: Academic background alignment',
          whyItMatters: "The candidate's academic background (such as a BBA or non-CS degree) is fixed and not a defect. Technical recruiters evaluate hands-on technical proficiency rather than degree title alone.",
          howToFix: 'Compensate for academic alignment by emphasizing relevant technical projects, concrete proof of work, software internships, and recognized certifications directly in your experience section.'
        };
      }

      // GAP ↔ DEFECT DEDUPLICATION (Requirement C & K):
      // If this defect duplicates a missing keyword (e.g. "Lacks React"), substitute an orthogonal weakness
      const fullDefectText = (problem + ' ' + whyItMatters + ' ' + howToFix).toLowerCase();
      for (const missingKw of finalMissingKeywordsLower) {
        if (missingKw && fullDefectText.includes(missingKw)) {
          const fallback = orthogonalWeaknessPool[orthogonalIdx % orthogonalWeaknessPool.length];
          orthogonalIdx++;
          return { ...fallback };
        }
      }

      // Vue consistency: strip hallucinated Vue weakness if not in JD
      if (!isVueInJD && !isVueInResume && /\b(vue|vuejs|vue\.js)\b/i.test(problem + ' ' + whyItMatters)) {
        problem = problem.replace(/\bvue(\.js)?\b/gi, 'modern frontend tools');
        whyItMatters = whyItMatters.replace(/\bvue(\.js)?\b/gi, 'target technical specifications');
      }

      return { problem, whyItMatters, howToFix };
    }).filter((w: any) => Boolean(w.problem));

    // 5. Skills Table (skillsAnalysis): Cross-checked against missing keywords and resume evidence
    const rawSkillsAnalysis = Array.isArray(analysis.skillsAnalysis) && analysis.skillsAnalysis.length > 0
      ? analysis.skillsAnalysis
      : keywordsFound.slice(0, 5).map((kw: string) => ({
          skill: kw,
          type: 'explicit',
          confidence_level: 'high',
          evidence: 'Identified directly in candidate resume'
        }));

    const skillsAnalysis = rawSkillsAnalysis
      .filter((s: any) => {
        const sk = String(s.skill || '').trim();
        if (!sk) return false;
        if (!isVueInJD && !isVueInResume && /\b(vue|vuejs|vue\.js)\b/i.test(sk)) return false;
        return true;
      })
      .slice(0, 6)
      .map((s: any) => {
        const sk = String(s.skill || '').trim();
        const skLower = sk.toLowerCase();
        const hasDirectEvidence = activeResumeLower.includes(skLower);
        const isMissing = finalMissingKeywordsLower.has(skLower);

        if (isMissing && !hasDirectEvidence) {
          return {
            skill: sk,
            type: 'inferred' as const,
            confidence_level: 'low' as const,
            evidence: 'Not evidenced in the resume.'
          };
        }

        return {
          skill: sk,
          type: hasDirectEvidence ? 'explicit' : ((s.type === 'explicit' || s.type === 'inferred') ? s.type : 'inferred'),
          confidence_level: (s.confidence_level === 'high' || s.confidence_level === 'medium') ? s.confidence_level : 'high',
          evidence: String(s.evidence || (hasDirectEvidence ? 'Identified directly in candidate resume' : 'Not evidenced in the resume.')).trim()
        };
      });

    // Formatting & Structural Strategy
    const formattingSuggestions: string[] = Array.isArray(analysis.formattingSuggestions) && analysis.formattingSuggestions.length > 0
      ? analysis.formattingSuggestions.map(String).filter(Boolean)
      : normalizedBreakdown.find((b: any) => b.category?.includes('Structure'))?.recommendations || [
          "Ensure standard section headers (Experience, Technical Skills, Education) for clean ATS column parsing.",
          "Keep bullet lengths between 1-2 lines for optimal recruiter scanning velocity."
        ];

    // Extract real candidate resume bullets for anchoring
    const realResumeBullets: string[] = [];
    if (activeResumeText) {
      const lines = activeResumeText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 25);
      const bulletPrefix = /^([•\*\-–—\u2022\u25cf\u25cb\u25aa]|\d+[\.\)])\s*/;
      const actionVerb = /^(built|developed|engineered|designed|implemented|created|led|managed|collaborated|architected|automated|optimized|spearheaded|directed|analyzed|integrated|configured|deployed|maintained|translated|delivered|conducted|established|executed|orchestrated|authored|facilitated|worked|assisted)\b/i;
      for (const line of lines) {
        const cleanL = line.replace(bulletPrefix, '').trim();
        if (cleanL.length >= 25 && cleanL.length <= 350) {
          if (bulletPrefix.test(line) || actionVerb.test(cleanL)) {
            realResumeBullets.push(cleanL);
          }
        }
      }
      if (realResumeBullets.length === 0) {
        for (const line of lines) {
          if (line.length >= 35 && line.length <= 250 && !line.includes('http') && !line.includes('@')) {
            realResumeBullets.push(line);
          }
        }
      }
    }

    // Specific Resume Improvements: grounded in real bullets with Original, Issue, and Improved
    const rawSpecific = Array.isArray(analysis.specificImprovements) && analysis.specificImprovements.length > 0
      ? analysis.specificImprovements
      : (Array.isArray(analysis.bulletImprovements) ? analysis.bulletImprovements : []);

    const specificImprovements: { original: string; issue: string; improved: string; recommendedChange: string }[] = [];
    if (rawSpecific.length > 0) {
      rawSpecific.slice(0, 3).forEach((imp: any, idx: number) => {
        let original = String(imp.original || '').trim();
        let issue = String(imp.issue || imp.problem || '').trim();
        let improved = String(imp.improved || imp.recommendedChange || '').trim();

        // Check if original exists in candidate resume or is a placeholder
        const originalSnippet = original.toLowerCase().slice(0, 30);
        const existsInResume = original.length >= 15 && (activeResumeLower.includes(originalSnippet) || realResumeBullets.some(b => b.toLowerCase().includes(originalSnippet)));

        if (!existsInResume || original.toLowerCase().includes('bullet #') || original.toLowerCase().includes('experience bullet') || original.toLowerCase().includes('add metrics')) {
          original = realResumeBullets[idx] || realResumeBullets[0] || 'Technical project implementation bullet';
        }

        if (!issue || issue.toLowerCase() === 'add metrics' || issue.toLowerCase() === 'improve impact' || issue.toLowerCase().includes('experience bullet')) {
          issue = 'Bullet describes task execution but lacks explicit technical scope, architectural context, and verifiable business outcomes.';
        }

        improved = improved
          .replace(/\b(improving|increased|reduced|boosted)\s+throughput\s+by\s+\d+%/gi, 'improving system reliability and delivery velocity')
          .replace(/\bby\s+(?:20|25|30|40|50)%\b/gi, '')
          .trim();

        if (!improved || improved.length < 15 || improved.toLowerCase().includes('experience bullet')) {
          improved = `${original.replace(/\.$/, '')}, establishing scalable implementation workflows. (Add a measurable result here if you have a verified figure.)`;
        } else if (!improved.includes('(Add a measurable result') && !/\d+/.test(improved)) {
          improved = `${improved.replace(/\.$/, '')}. (Add a measurable result here if you have a verified figure.)`;
        }

        specificImprovements.push({
          original,
          issue,
          improved,
          recommendedChange: improved
        });
      });
    } else if (realResumeBullets.length > 0) {
      realResumeBullets.slice(0, 3).forEach((bullet) => {
        specificImprovements.push({
          original: bullet,
          issue: 'Bullet describes task execution but lacks explicit technical scope and verifiable business outcomes.',
          improved: `${bullet.replace(/\.$/, '')}, establishing scalable implementation workflows. (Add a measurable result here if you have a verified figure.)`,
          recommendedChange: `${bullet.replace(/\.$/, '')}, establishing scalable implementation workflows. (Add a measurable result here if you have a verified figure.)`
        });
      });
    } else {
      const impactCat = normalizedBreakdown.find((b: any) => b.category?.includes('Impact'));
      const rec = (impactCat?.recommendations && impactCat.recommendations[0]) || 'Include specific technical outcomes in work experience.';
      specificImprovements.push({
        original: 'Technical experience bullet',
        issue: 'Bullet lists tasks without technical architecture context or verifiable outcomes.',
        improved: `${rec} (Add a measurable result here if you have a verified figure.)`,
        recommendedChange: `${rec} (Add a measurable result here if you have a verified figure.)`
      });
    }

    // 6. Executive Summary: coherent with score, strengths, and missing keywords
    let summary = typeof analysis.summary === 'string' && analysis.summary.trim()
      ? analysis.summary.trim()
      : '';

    // Clean summary of any claims of proficiency in missing keywords
    for (const missingKw of finalMissingKeywordsLower) {
      if (missingKw && summary.toLowerCase().includes(missingKw)) {
        summary = '';
        break;
      }
    }

    if (!isVueInJD && !isVueInResume && summary) {
      summary = summary.replace(/\b(vue|vuejs|vue\.js)\b/gi, 'modern frontend technologies');
    }

    if (!summary) {
      if (finalScore >= 80) {
        summary = `Candidate exhibits strong qualification alignment (${finalScore}/100) with target benchmarks, backed by verified experience in ${keywordsFound.slice(0, 2).join(' and ') || 'core technical competencies'}. Expanding hard delivery metrics will further optimize screening rank.`;
      } else if (finalScore >= 65) {
        summary = `Candidate demonstrates competitive baseline alignment (${finalScore}/100) with target role specifications, though key proficiencies (${finalMissingKeywords[0] || 'core tools'}) and quantified impact require clearer technical evidence.`;
      } else {
        summary = `Candidate demonstrates emerging technical alignment (${finalScore}/100); key target qualifications (${finalMissingKeywords.slice(0, 2).join(' and ') || 'required skills'}) are not evidenced in the resume, and bullets lack quantifiable business outcomes.`;
      }
    }

    return {
      ...analysis,
      score: finalScore,
      atsCompatibility,
      summary,
      scoreBreakdown: normalizedBreakdown,
      strengths: strengths.length > 0 ? strengths : ['Strong foundational technical background aligned with industry baselines.'],
      weaknesses: weaknesses.length > 0 ? weaknesses : [{
        problem: 'Limited quantifiable scale metrics in project descriptions.',
        whyItMatters: 'ATS algorithms favor bullet points with numbers and verifiable impact.',
        howToFix: 'Add specific percentage increases, user counts, or latency reductions to your experience.'
      }],
      formattingSuggestions,
      specificImprovements,
      keywordsFound,
      missingKeywords: finalMissingKeywords,
      missingKeywordAnalysis
    };
  }, [analysis, jobDesc, extractedDoc, useSavedResume, masterResume]);

  // Dedicated on-demand cover letter generator
  const handleGenerateCoverLetter = async () => {
    if (!user?.uid) return;
    if (isGeneratingCLRef.current) return;
    if (!canGenCL) {
      setCoverLetterError(`Cover letter capacity reached: ${clLeft}/${clLimit} remaining.`);
      return;
    }
    let text = '';
    const isUsingMaster = useSavedResume && !!masterResume && !isUploadMode;
    if (isUsingMaster && masterResume) {
      text = formatMasterResumeToText(masterResume);
    } else if (extractedDoc && extractedDoc.text) {
      text = extractedDoc.text;
    }
    if (!text || text.trim().length < 25) {
      setCoverLetterError('Please upload a resume or select a master profile first.');
      return;
    }
    if (!jobDesc || jobDesc.trim().length < 10) {
      setCoverLetterError('Please provide a target job description to generate a tailored cover letter.');
      return;
    }

    isGeneratingCLRef.current = true;
    setIsGeneratingCL(true);
    setCoverLetterError(null);

    const clRequestId = `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const clStart = Date.now();
    console.log(`[AI HireFlow][Diagnostics] request_id=${clRequestId}, request_purpose=COVER_LETTER, endpoint=/api/velona/generate, status=initiated`);

    try {
      const res = await generateCoverLetter(text, jobDesc, clRequestId);
      const clDuration = Date.now() - clStart;
      if (res?.content && res.content.trim().length >= 120) {
        const fullCL = res.content.trim();
        setCoverLetter(fullCL);
        setCoverLetterError(null);
        await deductCredit('coverLetters');
        console.log(`[AI HireFlow][Diagnostics] request_id=${clRequestId}, request_purpose=COVER_LETTER, endpoint=/api/velona/generate, provider_duration_ms=${clDuration}, http_status=200, finish_reason=stop, parse_status=SUCCESS, failure_category=none, request_count=1`);

        // Update caches and store
        const inMemoryKey = cacheManager.generateResumeKey(text, jobDesc);
        const updatedStore = {
          analysis: analysis,
          coverLetter: fullCL
        };
        cacheManager.set(inMemoryKey, updatedStore, 24 * 60 * 60 * 1000);
        try {
          await firestoreCache.setCache(user.uid, text, jobDesc, updatedStore);
        } catch (e) {
          console.warn('Failed to update cache with cover letter:', e);
        }
      } else {
        const clDuration = Date.now() - clStart;
        console.warn(`[AI HireFlow][Diagnostics] request_id=${clRequestId}, request_purpose=COVER_LETTER, endpoint=/api/velona/generate, provider_duration_ms=${clDuration}, http_status=200, finish_reason=truncated, parse_status=INCOMPLETE, failure_category=OUTPUT_TRUNCATED, request_count=1`);
        setCoverLetterError('Cover letter output was incomplete or truncated. Please click Retry Cover Letter.');
      }
    } catch (e: any) {
      const clDuration = Date.now() - clStart;
      const isTimeout = e.message?.toLowerCase().includes('timed out') || e.status === 504;
      const isTruncated = e.code === 'OUTPUT_TRUNCATED' || e.code === 'AI_RESPONSE_TRUNCATED' || e.message?.includes('too large');
      const failureCategory = isTimeout ? 'TIMEOUT' : isTruncated ? 'OUTPUT_TRUNCATED' : (e.status === 502 || e.status === 520 ? 'UPSTREAM_ERROR' : 'PROVIDER_ERROR');
      console.warn(`[AI HireFlow][Diagnostics] request_id=${clRequestId}, request_purpose=COVER_LETTER, endpoint=/api/velona/generate, provider_duration_ms=${clDuration}, http_status=${e.status || 500}, finish_reason=${isTruncated ? 'length' : 'error'}, parse_status=FAILED, failure_category=${failureCategory}, request_count=1`);
      
      let friendlyMsg = 'Cover letter generation failed. Please click Retry Cover Letter.';
      if (isTimeout) {
        friendlyMsg = 'Cover letter generation timed out. Please click Retry Cover Letter.';
      } else if (isTruncated) {
        friendlyMsg = 'Cover letter reached the token limit. Please click Retry Cover Letter.';
      } else if (e.status === 502 || e.status === 503 || e.status === 520 || e.status === 524 || e.message?.includes('520') || e.message?.includes('502') || e.message?.includes('Cloudflare') || e.message?.includes('temporarily unavailable')) {
        friendlyMsg = 'AI provider is temporarily unavailable. Please try again later.';
      }
      setCoverLetterError(friendlyMsg);
    } finally {
      isGeneratingCLRef.current = false;
      setIsGeneratingCL(false);
    }
  };

  const processSelectedFile = async (selected: File) => {
    setFile(selected);
    setUseSavedResume(false);
    setError(null);
    setExtractedDoc(null);
    setIsExtracting(true);
    setExtractionStatus('Reading resume file...');

    const cacheKey = `${selected.name}-${selected.size}-${selected.lastModified}`;
    if (extractedFileCache.has(cacheKey)) {
      const cachedText = extractedFileCache.get(cacheKey)!;
      setExtractedDoc({
        text: cachedText,
        fileName: selected.name,
        fileType: selected.name.split('.').pop() || 'pdf',
        charCount: cachedText.length
      });
      setIsExtracting(false);
      return;
    }

    try {
      const text = await extractTextFromFile(selected, (status) => setExtractionStatus(status));
      if (!text || text.trim().length < 25) {
        throw new Error('Could not extract readable text from this resume.');
      }
      extractedFileCache.set(cacheKey, text);
      setExtractedDoc({
        text: text.trim(),
        fileName: selected.name,
        fileType: selected.name.split('.').pop() || 'pdf',
        charCount: text.trim().length
      });
      setError(null);
    } catch (err: any) {
      console.error('[ResumeAnalyzer] Text extraction failed:', err);
      setExtractedDoc(null);
      setError(err.message || 'Could not extract readable text from this resume.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processSelectedFile(selected);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnalyzing || isExtracting) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processSelectedFile(droppedFile);
    }
  };

  const handleRetryExtraction = async () => {
    if (!file || isExtracting || isAnalyzing) return;
    setError(null);
    setIsExtracting(true);
    setExtractionStatus('Retrying text extraction & OCR...');

    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    extractedFileCache.delete(cacheKey);

    try {
      const text = await extractTextFromFile(file, (status) => setExtractionStatus(status));
      if (!text || text.trim().length < 25) {
        throw new Error('Could not extract readable text from this resume.');
      }
      extractedFileCache.set(cacheKey, text);
      setExtractedDoc({
        text: text.trim(),
        fileName: file.name,
        fileType: file.name.split('.').pop() || 'pdf',
        charCount: text.trim().length
      });
      setError(null);
    } catch (err: any) {
      console.error('[ResumeAnalyzer] Retry extraction failed:', err);
      setExtractedDoc(null);
      setError(err.message || 'Could not extract readable text from this resume.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemoveUploadedFile = () => {
    setFile(null);
    setExtractedDoc(null);
    setError(null);
    setIsExtracting(false);
  };

  const handleStartAnalysis = async () => {
    if (!user?.uid) return;
    if (isAnalyzing || isAnalyzingRef.current) return; // Synchronous guard against concurrent submissions!
    isAnalyzingRef.current = true;

    // Validation: Require either saved master resume OR successfully extracted resume text
    const isUsingMaster = useSavedResume && !!masterResume && !isUploadMode;
    
    if (isExtracting) {
      setError("Document text extraction is in progress. Please wait a moment.");
      isAnalyzingRef.current = false;
      return;
    }

    if (!isUsingMaster && (!extractedDoc || !extractedDoc.text || extractedDoc.text.trim().length < 25)) {
      setError("Resume text could not be extracted yet. Please upload a resume or retry extraction.");
      isAnalyzingRef.current = false;
      return;
    }

    // Cancel any previous in-flight request
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
    }
    const abortController = new AbortController();
    analysisAbortRef.current = abortController;
    const requestJobKey = activeJobKeyRef.current;

    setIsAnalyzing(true);
    setIsCanceled(false);
    setError(null);
    setCacheSource(null);
    setAnalysis(null);
    setCoverLetter(null);
    setAnalysisStatus('Auditing resume against ATS benchmarks...');

    try {
      let text = '';
      let resumeTitle = '';
      let fileType = 'pdf';

      if (isUsingMaster && masterResume) {
        text = formatMasterResumeToText(masterResume);
        resumeTitle = `Master Resume (${masterResume.experience?.[0]?.role || 'Saved Profile'})`;
        fileType = 'master_resume';
        if (!text || text.length < 20) {
          throw new Error("Saved Master Resume is empty. Please add details in Resume Editor or upload a PDF/document.");
        }
      } else if (extractedDoc && extractedDoc.text) {
        // STRICT: REUSE ALREADY EXTRACTED RESUME TEXT — ZERO RE-EXTRACTION / ZERO RE-OCR!
        text = extractedDoc.text;
        resumeTitle = extractedDoc.fileName;
        fileType = extractedDoc.fileType;
      } else {
        throw new Error("Resume text could not be extracted yet. Please upload a resume or retry extraction.");
      }
      
      const fileTypeForAnalysis = fileType;

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
        // Only restore valid, complete cover letters (>= 120 chars)
        const validCL = inMemoryCached.coverLetter && inMemoryCached.coverLetter.trim().length >= 120 ? inMemoryCached.coverLetter.trim() : null;
        setCoverLetter(validCL);
        setCacheSource('browser');
        isAnalyzingRef.current = false;
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
        const validCL = persistentCached.coverLetter && persistentCached.coverLetter.trim().length >= 120 ? persistentCached.coverLetter.trim() : null;
        setCoverLetter(validCL);
        setCacheSource('persistent');
        
        // Sync back to in-memory for even faster subsequent access
        try {
          cacheManager.set(inMemoryKey, { 
            analysis: persistentCached.analysis, 
            coverLetter: validCL 
          }, 24 * 60 * 60 * 1000);
        } catch (e) {
          console.warn('Failed to sync Firestore cache to runtime memory');
        }
        
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        return;
      }

      // STEP 3: Execute Fast Velona ATS Scan
      if (!canScan) {
        setError(`Analysis capacity reached: ${scansLeft}/${scanLimit} scans remaining. Upgrade for more bandwidth.`);
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        return;
      }
      
      // Execute primary resume audit via Asynchronous Job Architecture
      setAnalysisStatus('Auditing resume against ATS benchmarks...');
      const analysisResult = await analysisJobService.runAsyncAnalysis({
        userId: user.uid,
        resumeText: text,
        jobDesc,
        fileType: fileTypeForAnalysis,
        onProgress: (statusText) => setAnalysisStatus(statusText),
        signal: abortController.signal
      });

      // Prevent stale results from overwriting newer active job context:
      if (activeJobKeyRef.current !== requestJobKey) {
        console.warn('[ResumeAnalyzer] Active job context changed during analysis; discarding stale result.');
        return;
      }

      // Deduct credit strictly ONCE upon successful completion of the analysis
      await deductCredit('resumeScans');

      // Immediate display of primary ATS analysis
      setAnalysis(analysisResult);
      try {
        sessionStorage.setItem('resume_analyzer_result', JSON.stringify(analysisResult));
      } catch (e) {}

      // Synchronize active job context across system modules
      const derivedCtx = getAnalyzerJobContext(analysisResult);
      const targetRole = derivedCtx.role || currentActiveJob?.title;
      if (targetRole) {
        const syncedJob: ActiveJobContext = currentActiveJob && !isDemoRole(currentActiveJob.title)
          ? {
              ...currentActiveJob,
              skills: derivedCtx.skills.length > 0 ? derivedCtx.skills : currentActiveJob.skills,
              description: jobDesc || currentActiveJob.description,
              selectedAt: Date.now()
            }
          : {
              title: targetRole,
              company: derivedCtx.company || 'Target Opportunity',
              skills: derivedCtx.skills,
              description: jobDesc || derivedCtx.description,
              source: 'analyzer',
              selectedAt: Date.now()
            };
        const syncedKey = getActiveJobKey(syncedJob);
        analyzerGeneratedJobKeyRef.current = syncedKey;
        activeJobKeyRef.current = syncedKey;
        try {
          if (syncedKey) {
            sessionStorage.setItem('resume_analyzer_active_job_key', syncedKey);
          }
        } catch (e) {}
        setCurrentActiveJob(syncedJob);
      }

      // Note: Cover letter generation is kept strictly on-demand in the Cover Letter card
      // to ensure ATS audit completion is completely isolated and never blocked or degraded.

      const resultsToStore = {
        analysis: analysisResult,
        coverLetter: null
      };

      try {
        await addDoc(collection(db, 'users', user.uid, 'resumes'), {
          fileName: resumeTitle,
          content: text,
          jobDesc: jobDesc,
          isMasterResume: isUsingMaster,
          createdAt: new Date().toISOString(),
          ...resultsToStore
        });
      } catch (dbErr) {
        console.warn("Firestore resume persistence warning:", dbErr);
      }

      // Save to both caches
      cacheManager.set(inMemoryKey, resultsToStore, 24 * 60 * 60 * 1000);
      try {
        await firestoreCache.setCache(user.uid, text, jobDesc, resultsToStore);
      } catch (cacheErr) {
        console.warn("Firestore cache set error:", cacheErr);
      }

    } catch (err: any) {
      if (abortController.signal.aborted || err?.message === 'Analysis was cancelled.') {
        console.log('[ResumeAnalyzer] Analysis request aborted or superseded.');
        return;
      }
      const rawMsg = typeof err === 'string' ? err : (err?.message || "Resume analysis failed. Please try again.");
      let userFriendlyMsg = rawMsg;
      if (
        rawMsg.includes('Unexpected token') ||
        rawMsg.includes('is not valid JSON') ||
        rawMsg.includes('520') ||
        rawMsg.includes('502') ||
        rawMsg.includes('503') ||
        rawMsg.includes('524') ||
        rawMsg.includes('Bad gateway') ||
        rawMsg.includes('temporarily unavailable') ||
        rawMsg.includes('Cloudflare') ||
        rawMsg.includes('<!DOCTYPE') ||
        rawMsg.includes('<!doctype') ||
        rawMsg.includes('<html')
      ) {
        userFriendlyMsg = "AI provider is temporarily unavailable. Please try again later.";
      } else if (rawMsg.toLowerCase().includes('taking longer than expected') || rawMsg.toLowerCase().includes('timed out') || rawMsg.includes('504')) {
        userFriendlyMsg = "Resume analysis timed out while contacting the AI provider. Please click Retry Analysis to run a fresh audit.";
      } else if (rawMsg.toLowerCase().includes('invalid response') || rawMsg.toLowerCase().includes('parse') || rawMsg.toLowerCase().includes('structure')) {
        userFriendlyMsg = "Analysis was unable to parse the AI response. Please click Retry Analysis to run a fresh audit.";
      }
      console.error('[ResumeAnalyzer] Analysis error:', userFriendlyMsg);
      setError(userFriendlyMsg);
    } finally {
      if (analysisAbortRef.current === abortController) {
        analysisAbortRef.current = null;
      }
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const isPrePopulated = !!masterResume && useSavedResume && !isUploadMode;

  const formattedLastUpdated = masterResume?.updatedAt 
    ? new Date(masterResume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently Saved';

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hf-cta)]" />
          <p className="text-xs text-[var(--hf-text-muted)] tracking-wide animate-pulse">Initializing resume analyzer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b-[1.5px] border-[var(--hf-ink-border)] flex flex-col md:flex-row md:items-end justify-between gap-4 font-sans">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
            Resume Tools
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight">
            Resume analyzer
          </h1>
          <p className="text-sm text-[var(--hf-text-secondary)] mt-1.5 max-w-2xl">
            Audit resume compatibility against target roles, identify keyword gaps, and generate tailored cover letters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 border-[1.5px] border-[var(--hf-ink-border)] rounded-sm bg-[var(--hf-surface)] shadow-[2px_2px_0px_var(--hf-ink-border)] flex items-center gap-2 text-xs text-[var(--hf-text)]">
            <span className="w-2 h-2 bg-[var(--hf-ai-teal)]" aria-hidden="true" />
            <span className="font-mono font-bold tabular-nums">
              {formatCreditAvailability(creditWallet?.balance, creditCosts?.resumeScan ?? 20, 'scans')}
            </span>
          </div>
          <div className="px-3 py-1.5 border-[1.5px] border-[var(--hf-ink-border)] rounded-sm bg-[var(--hf-surface)] shadow-[2px_2px_0px_var(--hf-ink-border)] flex items-center gap-2 text-xs text-[var(--hf-text)]">
            <span className="w-2 h-2 bg-[var(--hf-success)]" aria-hidden="true" />
            <span className="font-mono font-bold tabular-nums">
              {formatCreditAvailability(creditWallet?.balance, creditCosts?.coverLetter ?? 15, 'letters')}
            </span>
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {error && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          aria-live="assertive"
          className="my-6 p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-error)]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-error)]/30 text-[var(--hf-error)] flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="hf-badge text-[var(--hf-error)] bg-[var(--hf-error)]/10 border-[var(--hf-error)]/20">
                  {error.toLowerCase().includes('gateway') || error.toLowerCase().includes('502') || error.toLowerCase().includes('503') || error.toLowerCase().includes('520') || error.toLowerCase().includes('524') || error.toLowerCase().includes('cloudflare')
                    ? 'Provider gateway error'
                    : error.toLowerCase().includes('time') || error.toLowerCase().includes('504')
                    ? 'Request timeout'
                    : error.toLowerCase().includes('auth') || error.toLowerCase().includes('api key')
                    ? 'Authentication notice'
                    : error.toLowerCase().includes('balance') || error.toLowerCase().includes('credit') || error.toLowerCase().includes('rate')
                    ? 'Credit quota notice'
                    : error.toLowerCase().includes('parse') || error.toLowerCase().includes('schema') || error.toLowerCase().includes('truncated')
                    ? 'Response parsing error'
                    : 'Analysis error'}
                </span>
              </div>
              <p className="text-xs text-[var(--hf-text-secondary)] mt-1.5 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="hf-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAnalyzing ? 'Analyzing...' : 'Retry analysis'}</span>
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss alert"
              title="Dismiss"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Canceled State Banner */}
      {isCanceled && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          aria-live="polite"
          className="my-6 p-4 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)] flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="hf-badge">Analysis canceled</span>
              </div>
              <p className="text-xs text-[var(--hf-text-secondary)] mt-1 leading-relaxed">
                No credits were deducted. Your resume source and job description were retained.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCanceled(false)}
            className="hf-btn-secondary px-3.5 py-2 text-xs font-semibold shrink-0 cursor-pointer min-h-[44px]"
          >
            Resume setup
          </button>
        </motion.div>
      )}

      {/* Analyzing State - Honest Indeterminate State with Elapsed Time */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          id="ats-processing-section"
          role="status"
          aria-live="polite"
          className="hf-card p-6 sm:p-8 space-y-5 my-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--hf-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-mint)] text-[var(--hf-ai-teal)] flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="hf-badge hf-badge-teal">Audit in progress</span>
                  <span className="text-xs font-mono text-[var(--hf-text-muted)] tabular-nums">
                    Elapsed: {elapsedSeconds}s
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--hf-text)] mt-1">
                  Analyzing your resume...
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelAnalysis}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] border border-[var(--hf-border)] hover:bg-[var(--hf-surface-secondary)] transition-colors self-start sm:self-center cursor-pointer min-h-[44px]"
            >
              Cancel analysis
            </button>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 w-full bg-[var(--hf-surface-secondary)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--hf-cta)] rounded-full animate-pulse w-2/3" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--hf-text-secondary)]">
              <span>{analysisStatus || "Auditing resume against ATS benchmarks..."}</span>
              <span className="text-[var(--hf-text-muted)] text-[11px]">Typical runtime: 10–25s</span>
            </div>
          </div>

          <p className="text-xs text-[var(--hf-text-muted)] leading-relaxed">
            The analysis engine checks ATS readability, identifies missing technical keywords against target specifications, and evaluates verifiable impact metrics.
          </p>
        </motion.div>
      )}

      {/* Normal Input Setup Section (Hidden during active analysis and when results are shown) */}
      {!analysis && !isAnalyzing ? (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Missing Master Resume Onboarding Nudge Banner */}
          {!loadingMaster && !masterResume && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="hf-card p-5 bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-md bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-cta)] shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="hf-badge">Master profile</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--hf-text)] mt-1">
                    Save your master resume once to skip PDF uploads
                  </h3>
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5 max-w-xl leading-relaxed">
                    Structure your career history in the resume editor once. Every scan, mock drill, and application will pre-populate automatically.
                  </p>
                </div>
              </div>
              <Link
                to="/editor"
                className="hf-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer min-h-[44px]"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Build master resume</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Master Resume Pre-Populated OR Upload Card */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="font-semibold text-sm text-[var(--hf-text)] flex items-center gap-2">
                    {isPrePopulated ? (
                      <>
                        <Sparkles className="w-4 h-4 text-[var(--hf-cta)]" aria-hidden="true" />
                        <span>Resume source</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4 text-[var(--hf-cta)]" aria-hidden="true" />
                        <span>Resume source</span>
                      </>
                    )}
                  </h2>

                  {isPrePopulated ? (
                    <span className="hf-badge hf-badge-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      <span>Pre-populated</span>
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
                      className="text-xs font-medium text-[var(--hf-cta)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Use saved resume</span>
                    </button>
                  ) : null}
                </div>

                {/* Pre-Populated Master Resume View */}
                {isPrePopulated && masterResume ? (
                  <div className="space-y-4">
                    <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-medium text-[var(--hf-text-secondary)] block">
                            Saved master profile
                          </span>
                          <h4 className="text-sm font-semibold text-[var(--hf-text)] mt-0.5">
                            {masterResume.experience?.[0]?.role || 'Professional Profile'}
                          </h4>
                          {masterResume.experience?.[0]?.company && (
                            <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                              Latest: {masterResume.experience[0].company} ({masterResume.experience[0].period || 'Present'})
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end shrink-0 text-right">
                          <span className="text-[11px] text-[var(--hf-text-muted)] flex items-center gap-1">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{formattedLastUpdated}</span>
                          </span>
                          <span className="text-[11px] font-medium text-[var(--hf-text-secondary)] mt-0.5">
                            {masterResume.experience?.length || 0} roles added
                          </span>
                        </div>
                      </div>

                      {masterResume.summary && (
                        <p className="text-xs text-[var(--hf-text-secondary)] line-clamp-2 leading-relaxed bg-[var(--hf-surface)] p-2.5 rounded-md border border-[var(--hf-border)] italic">
                          &ldquo;{masterResume.summary}&rdquo;
                        </p>
                      )}

                      {/* Synced Skills Tags */}
                      {masterResume.skills && masterResume.skills.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-medium text-[var(--hf-text-secondary)] block">
                            Synced skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                            {masterResume.skills.slice(0, 6).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[11px] bg-[var(--hf-surface)] text-[var(--hf-text)] border border-[var(--hf-border)] font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {masterResume.skills.length > 6 && (
                              <span className="px-1.5 py-0.5 text-[11px] text-[var(--hf-text-muted)]">
                                +{masterResume.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--hf-text-secondary)] px-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)]" aria-hidden="true" />
                        <span>No re-upload needed · Auto-synced</span>
                      </span>
                      <Link to="/editor" className="text-[var(--hf-cta)] hover:underline font-medium flex items-center gap-1">
                        <Edit3 className="w-3 h-3" aria-hidden="true" />
                        <span>Edit profile</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Standard PDF / Scanned / Image Upload Dropzone */
                  <div>
                    <label 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDrop}
                      role="region"
                      aria-label="Upload resume file"
                      className={cn(
                        "relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg min-h-[14rem] p-6 cursor-pointer transition-colors text-center",
                        extractedDoc ? "border-[var(--hf-cta)] bg-[var(--hf-surface-secondary)]" : (file && error) ? "border-[var(--hf-error)]/40 bg-[var(--hf-error)]/5" : "border-[var(--hf-border)] hover:border-[var(--hf-cta)]",
                        (isAnalyzing || isExtracting) && "pointer-events-none opacity-80"
                      )}
                    >
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" 
                        onChange={handleFileChange}
                        disabled={isAnalyzing || isExtracting}
                        aria-label="Upload resume file (PDF, DOCX, TXT, or Image)" 
                      />
                      {isExtracting ? (
                        <div className="text-center px-4" role="status" aria-live="polite">
                          <div className="w-10 h-10 rounded-lg bg-[var(--hf-mint)] text-[var(--hf-ai-teal)] flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                          <p className="font-semibold text-[var(--hf-text)] text-sm">{file?.name || 'Resume document'}</p>
                          <p className="text-xs text-[var(--hf-ai-teal)] font-medium mt-1">
                            {extractionStatus || 'Extracting resume text...'}
                          </p>
                        </div>
                      ) : extractedDoc ? (
                        <div className="text-center px-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                            <FileText className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-[var(--hf-text)] text-sm">{extractedDoc.fileName}</p>
                          <p className="text-xs text-[var(--hf-success)] font-medium mt-1 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Document ready to analyze</span>
                          </p>
                          <span className="text-[11px] text-[var(--hf-text-muted)] block mt-1 tabular-nums">
                            {extractedDoc.charCount.toLocaleString()} characters extracted
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveUploadedFile();
                            }}
                            className="mt-3 text-xs text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] underline transition-colors cursor-pointer min-h-[44px] flex items-center justify-center mx-auto"
                          >
                            Remove / change file
                          </button>
                        </div>
                      ) : file && error ? (
                        <div className="text-center px-4" onClick={(e) => e.stopPropagation()} role="alert">
                          <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-error)]/30 text-[var(--hf-error)] flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-[var(--hf-text)] text-sm">{file.name}</p>
                          <p className="text-xs text-[var(--hf-error)] mt-1 max-w-sm mx-auto leading-relaxed">
                            Could not extract readable text from this resume.
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                              type="button"
                              onClick={handleRetryExtraction}
                              className="hf-btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Retry extraction</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveUploadedFile}
                              className="hf-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer min-h-[44px]"
                            >
                              Remove file
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center px-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-text-secondary)] flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                            <FileUp className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-[var(--hf-text)] text-sm">Select or drop resume</p>
                          <p className="text-xs text-[var(--hf-text-muted)] mt-1">
                            PDF, DOCX, TXT, or Images (JPG, PNG) up to 10MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {error && !file && (
                  <div role="alert" className="mt-4 p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-error)]/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[var(--hf-text)]">
                      <AlertCircle className="w-4 h-4 text-[var(--hf-error)] shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      disabled={isAnalyzing}
                      className="hf-btn-primary px-3 py-1.5 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Retry analysis'}
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Action: Toggle for uploading a different resume */}
              {isPrePopulated && (
                <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--hf-text-muted)]">
                    Testing a different document?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadMode(true);
                      setUseSavedResume(false);
                    }}
                    className="hf-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Upload different file</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Card: Job Description Card */}
            <div className="hf-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label 
                    htmlFor="target-job-description" 
                    className="block text-sm font-semibold text-[var(--hf-text)] flex items-center gap-1.5"
                  >
                    <Target className="w-4 h-4 text-[var(--hf-cta)]" aria-hidden="true" />
                    <span>Target job description</span>
                  </label>
                  <span className="text-[11px] text-[var(--hf-text-muted)]">
                    Optional for ATS audit
                  </span>
                </div>
                <p className="text-xs text-[var(--hf-text-muted)] mb-3 leading-relaxed">
                  Paste the requirements to evaluate role compatibility, identify missing keywords, and draft a tailored cover letter.
                </p>

                {currentActiveJob && (
                  <div className="mb-3 p-3 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Target className="w-3.5 h-3.5 text-[var(--hf-cta)] shrink-0" aria-hidden="true" />
                      <div className="text-xs text-[var(--hf-text)] truncate">
                        <span>Role: <strong>{currentActiveJob.title}</strong> at {currentActiveJob.company}</span>
                        {currentActiveJob.location && (
                          <span className="ml-1 text-[var(--hf-text-muted)] font-normal">
                            ({currentActiveJob.location})
                          </span>
                        )}
                        {currentActiveJob.isRemote && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--hf-mint)] text-[var(--hf-ai-teal)] font-medium">
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
                          className="text-[11px] text-[var(--hf-cta)] hover:underline flex items-center gap-1"
                        >
                          Listing <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          clearCurrentJobContext();
                          setJobDesc('');
                          setAnalysis(null);
                          setCoverLetter(null);
                          setCacheSource(null);
                          activeJobKeyRef.current = null;
                          try {
                            sessionStorage.removeItem('resume_analyzer_active_job_key');
                            sessionStorage.removeItem('resume_analyzer_result');
                            sessionStorage.removeItem('resume_analyzer_cover_letter');
                            sessionStorage.removeItem('resume_analyzer_cache_source');
                            sessionStorage.removeItem('resume_analyzer_job_desc');
                          } catch (e) {}
                        }}
                        className="text-[11px] text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] underline cursor-pointer"
                      >
                        Clear active job
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  id="target-job-description"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the target job description or responsibilities here..."
                  aria-label="Target job description"
                  className="w-full p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] focus:border-transparent resize-y font-sans leading-relaxed disabled:opacity-50 min-h-[190px]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs text-[var(--hf-text-secondary)]">
                <span>Tailored cover letter:</span>
                <span className={jobDesc.trim() ? "text-[var(--hf-success)] font-medium" : "text-[var(--hf-text-muted)]"}>
                  {jobDesc.trim() ? "Enabled (+15 credits)" : "Paste job description to enable"}
                </span>
              </div>
            </div>

            {/* Bottom Action Bar & Credit Cost Preview */}
            <div className="md:col-span-2">
              <div className="hf-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 self-start sm:self-center">
                  <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--hf-text)]">
                        Credit cost preview:
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] border border-[var(--hf-border)] tabular-nums">
                        {scanCreditCost + (jobDesc.trim() ? coverLetterCreditCost : 0)} credits
                      </span>
                    </div>
                    <p className="text-xs text-[var(--hf-text-muted)] mt-0.5">
                      {scanCreditCost} credits (ATS scan) {jobDesc.trim() ? `+ ${coverLetterCreditCost} credits (Cover letter)` : ''} · Wallet balance: {creditWallet?.balance ?? 0}
                    </p>
                    {!canScan && (
                      <p role="alert" className="text-xs text-[var(--hf-warning)] font-medium mt-1">
                        Low credit balance: you have {creditWallet?.balance ?? 0} credits, but {scanCreditCost} are required. <Link to="/credits" className="underline font-semibold">Add credits</Link>
                      </p>
                    )}
                  </div>
                </div>

                {(() => {
                  const isUsingMaster = useSavedResume && !!masterResume && !isUploadMode;
                  const canAnalyze = isUsingMaster 
                    ? Boolean(masterResume) 
                    : Boolean(extractedDoc && extractedDoc.text && extractedDoc.text.trim().length >= 25);

                  return (
                    <div className="flex flex-col sm:items-end items-center gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleStartAnalysis}
                        disabled={isAnalyzing || isExtracting || !canAnalyze || !canScan}
                        className="w-full sm:w-auto hf-btn-primary px-8 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>Reading document...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" aria-hidden="true" />
                            <span>
                              {isPrePopulated ? 'Analyze saved resume' : 'Analyze uploaded resume'}
                            </span>
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </>
                        )}
                      </button>
                      {!canAnalyze && file && !isExtracting && (
                        <span className="text-[11px] text-[var(--hf-error)] font-medium">
                          {extractedDoc && extractedDoc.text.trim().length < 25 
                            ? 'Insufficient text: document contains fewer than 25 characters.'
                            : 'Resume text could not be extracted yet.'}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Real ATS Analysis Result Area */}
      {normalizedAnalysis && !isAnalyzing ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
          id="ats-complete-audit-results"
        >
          {cacheSource && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--hf-border)] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[var(--hf-teal)]" />
                <span>
                  {cacheSource === 'browser' ? 'Loaded from browser storage' : 'Loaded from cloud cache'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* 1. ATS COMPATIBILITY SCORE */}
            {(() => {
              const scoreVal = typeof normalizedAnalysis.score === 'number' ? normalizedAnalysis.score : 0;
              const isHigh = scoreVal >= 80;
              const isMedium = scoreVal >= 65 && scoreVal < 80;
              const bandLabel = isHigh 
                ? (normalizedAnalysis.atsCompatibility || 'Strong match') 
                : isMedium 
                  ? (normalizedAnalysis.atsCompatibility || 'Competitive alignment') 
                  : (normalizedAnalysis.atsCompatibility || 'Needs improvement');
              const hasJobDesc = !!(jobDesc && jobDesc.trim());
              const jobContext = getAnalyzerJobContext();
              const targetRoleName = hasJobDesc ? (jobContext.role || 'Target job role') : null;
              const targetCompanyName = hasJobDesc && jobContext.company && jobContext.company !== 'Target Opportunity' ? jobContext.company : null;

              return (
                <div id="section-ats-score" className="hf-card p-6 md:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[var(--hf-border)]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-full",
                          isHigh 
                            ? "bg-[var(--hf-mint)]/30 text-[var(--hf-success)] border border-[var(--hf-success)]/20"
                            : isMedium
                              ? "bg-[var(--hf-cta)]/10 text-[var(--hf-cta)] border border-[var(--hf-cta)]/20"
                              : "bg-[var(--hf-warning)]/10 text-[var(--hf-warning)] border border-[var(--hf-warning)]/20"
                        )}>
                          {bandLabel}
                        </span>
                        <span className="text-xs text-[var(--hf-text-muted)]">
                          {hasJobDesc && targetRoleName ? (
                            <>Target role: <strong className="text-[var(--hf-text)]">{targetRoleName}{targetCompanyName ? ` (${targetCompanyName})` : ''}</strong></>
                          ) : (
                            'General ATS audit (no target job description provided)'
                          )}
                        </span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-[var(--hf-text)] tracking-tight">
                        ATS compatibility evaluation
                      </h2>
                      <p className="text-sm text-[var(--hf-text-secondary)] max-w-2xl leading-relaxed">
                        Evaluates resume readability, keyword relevance, quantifiable impact, and structural formatting against applicant tracking standards.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] shrink-0 self-start md:self-center">
                      <div>
                        <span className="text-xs font-medium text-[var(--hf-text-muted)] block">ATS match score</span>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-3xl font-bold tabular-nums",
                            isHigh ? "text-[var(--hf-success)]" : isMedium ? "text-[var(--hf-cta)]" : "text-[var(--hf-warning)]"
                          )}>
                            {scoreVal}
                          </span>
                          <span className="text-sm font-normal text-[var(--hf-text-muted)]">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Limitations notice under score */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs text-[var(--hf-text-secondary)]">
                    <Info className="w-4 h-4 text-[var(--hf-text-muted)] mt-0.5 shrink-0" />
                    <p className="leading-relaxed">
                      <strong>Limitations notice:</strong> This score is an AI estimate. Employer ATS configurations and recruiter screening criteria vary, and an ATS score is not a guarantee of interviews or employment offers.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 2. 4-CATEGORY WEIGHTED BREAKDOWN */}
            {normalizedAnalysis.scoreBreakdown && Array.isArray(normalizedAnalysis.scoreBreakdown) && normalizedAnalysis.scoreBreakdown.length > 0 && (
              <div id="section-score-breakdown" className="hf-card p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--hf-border)]">
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)] flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[var(--hf-teal)]" />
                      Weighted category breakdown
                    </h3>
                    <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                      Breakdown of how each weighted category contributes to your overall score of {normalizedAnalysis.score ?? 0}/100.
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-xs font-medium text-[var(--hf-text-secondary)] flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[var(--hf-text-muted)]" />
                    Total weight: 100%
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {normalizedAnalysis.scoreBreakdown.map((cat: any, idx: number) => {
                    const catScore = typeof cat.score === 'number' ? cat.score : 0;
                    const catWeight = typeof cat.weight === 'number' ? cat.weight : 0;
                    const isCatHigh = catScore >= 80;
                    const isCatMed = catScore >= 65 && catScore < 80;
                    const earned = typeof cat.earnedPoints === 'number'
                      ? cat.earnedPoints.toFixed(1)
                      : Math.round((catScore * catWeight) / 100);

                    return (
                      <div key={idx} className="p-4 sm:p-5 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[var(--hf-text)]">{cat.category}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded border border-[var(--hf-border)] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] tabular-nums">
                              Weight: {catWeight}%
                            </span>
                          </div>

                          {cat.explanation && (
                            <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">{cat.explanation}</p>
                          )}

                          {/* Extracted evidence from resume */}
                          {cat.evidence && typeof cat.evidence === 'string' && cat.evidence.trim().length > 0 && (
                            <div className="p-3 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)] text-xs">
                              <span className="font-semibold text-[var(--hf-text)] block mb-1">
                                Evidence from resume:
                              </span>
                              <p className="text-[var(--hf-text-secondary)] italic leading-relaxed">
                                &ldquo;{cat.evidence}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Recommendations */}
                          {Array.isArray(cat.recommendations) && cat.recommendations.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-xs font-semibold text-[var(--hf-text)] block">
                                Recommendations:
                              </span>
                              <ul className="space-y-1 text-xs text-[var(--hf-text-secondary)]">
                                {cat.recommendations.map((rec: string, rIdx: number) => (
                                  <li key={rIdx} className="flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-[var(--hf-teal)] font-bold mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-[var(--hf-border)] space-y-2">
                          <div className="w-full bg-[var(--hf-surface)] h-2 rounded-full overflow-hidden border border-[var(--hf-border)]">
                            <div 
                              className={cn(
                                "h-full rounded-full motion-reduce:transition-none transition-all duration-500",
                                isCatHigh 
                                  ? "bg-[var(--hf-success)]" 
                                  : isCatMed 
                                    ? "bg-[var(--hf-cta)]" 
                                    : "bg-[var(--hf-warning)]"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, catScore))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span className="text-[var(--hf-text-muted)]">
                              Score: <strong className="text-[var(--hf-text)] font-semibold">{catScore} / 100</strong>
                            </span>
                            <span className="font-medium text-[var(--hf-text-secondary)] px-2 py-0.5 rounded bg-[var(--hf-surface)] border border-[var(--hf-border)]">
                              {cat.mathExplanation || `${catScore}/100 × ${catWeight}% = ${earned} pts`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Formula equation summary bar */}
                <div className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] flex flex-col gap-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[var(--hf-teal)]" />
                      Weighted points contribution:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap tabular-nums font-medium text-[var(--hf-text)]">
                      {normalizedAnalysis.scoreBreakdown.map((cat: any, i: number) => {
                        const pts = typeof cat.earnedPoints === 'number' 
                          ? cat.earnedPoints.toFixed(1) 
                          : Math.round(((cat.score || 0) * (cat.weight || 0)) / 100);
                        return (
                          <span key={i}>
                            {pts}
                            {i < normalizedAnalysis.scoreBreakdown.length - 1 ? " + " : ""}
                          </span>
                        );
                      })}
                      <span className="text-[var(--hf-text-secondary)] font-normal">
                        = <strong className="text-[var(--hf-text)] font-semibold">{normalizedAnalysis.score ?? 0} / 100</strong>
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--hf-text-muted)]">
                    Category points reflect weighted contributions based on target ATS scoring criteria.
                  </p>
                </div>
              </div>
            )}

            {/* 3. EXECUTIVE SUMMARY */}
            {normalizedAnalysis.summary && typeof normalizedAnalysis.summary === 'string' && normalizedAnalysis.summary.trim().length > 0 && (
              <div id="section-recruiter-summary" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex justify-between items-center gap-3 pb-3 border-b border-[var(--hf-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                        Executive summary
                      </h3>
                      <p className="text-xs text-[var(--hf-text-muted)]">High-level evaluation of resume alignment</p>
                    </div>
                  </div>
                  {normalizedAnalysis.human_explanation && (
                    <button
                      onClick={() => navigator.clipboard.writeText(normalizedAnalysis.human_explanation)}
                      className="hf-btn-ghost text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px] px-3"
                      aria-label="Copy recruiter notes"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy notes</span>
                    </button>
                  )}
                </div>

                <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed font-sans">
                  {normalizedAnalysis.summary}
                </p>

                {normalizedAnalysis.human_explanation && (
                  <div className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-xs text-[var(--hf-text-secondary)] leading-relaxed font-sans whitespace-pre-wrap">
                    <span className="font-semibold text-[var(--hf-text)] block mb-1">
                      Recruiter notes:
                    </span>
                    {normalizedAnalysis.human_explanation}
                  </div>
                )}
              </div>
            )}

            {/* 4. KEY STRENGTHS */}
            {Array.isArray(normalizedAnalysis.strengths) && normalizedAnalysis.strengths.length > 0 && (
              <div id="section-strengths" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="p-2 rounded-lg bg-[var(--hf-mint)]/30 border border-[var(--hf-success)]/20 text-[var(--hf-success)]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Key strengths
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Demonstrated qualifications and accomplishments that support your candidacy
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {normalizedAnalysis.strengths.map((str: string, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] flex items-start gap-3">
                      <div className="p-1 rounded-md bg-[var(--hf-mint)]/30 text-[var(--hf-success)] mt-0.5 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs text-[var(--hf-text)] leading-relaxed font-sans">{str}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. AREAS TO IMPROVE */}
            {Array.isArray(normalizedAnalysis.weaknesses) && normalizedAnalysis.weaknesses.length > 0 && (
              <div id="section-weaknesses" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="p-2 rounded-lg bg-[var(--hf-warning)]/10 border border-[var(--hf-warning)]/20 text-[var(--hf-warning)]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Areas to improve
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Identified gaps and recommended adjustments to strengthen your resume
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {normalizedAnalysis.weaknesses.map((w: any, idx: number) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[var(--hf-warning)] shrink-0" />
                        <h4 className="text-xs font-semibold text-[var(--hf-text)]">
                          Issue {idx + 1}: {w.problem}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {w.whyItMatters && (
                          <div className="p-3 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                            <span className="font-semibold text-[var(--hf-text)] block mb-1">
                              Why it matters:
                            </span>
                            <p className="text-[var(--hf-text-secondary)] leading-relaxed font-sans">
                              {w.whyItMatters}
                            </p>
                          </div>
                        )}

                        {w.howToFix && (
                          <div className="p-3 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                            <span className="font-semibold text-[var(--hf-text)] block mb-1">
                              How to fix:
                            </span>
                            <p className="text-[var(--hf-text-secondary)] leading-relaxed font-sans">
                              {w.howToFix}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. TECHNICAL / SKILL MATCH ANALYSIS */}
            {Array.isArray(normalizedAnalysis.skillsAnalysis) && normalizedAnalysis.skillsAnalysis.length > 0 && (
              <div id="section-skills-matrix" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--hf-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                        Skills analysis: explicit vs. inferred
                      </h3>
                      <p className="text-xs text-[var(--hf-text-muted)]">
                        Distinguishing skills stated directly on your resume from skills inferred by experience and tooling
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-teal)]" />
                      Explicitly stated
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text-muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-text-muted)]" />
                      Inferred from experience
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {normalizedAnalysis.skillsAnalysis.map((sk: any, i: number) => {
                    const isInferred = sk.type === 'inferred';
                    const confLevel = (sk.confidence_level || '').toLowerCase();
                    const confText = confLevel === 'high' ? 'High confidence' : confLevel === 'medium' ? 'Medium confidence' : confLevel === 'low' ? 'Low confidence' : 'Confidence assessed';
                    return (
                      <div key={i} className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] flex flex-col justify-between space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--hf-text)] break-words">{sk.skill}</span>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded-md border shrink-0",
                            isInferred
                              ? "bg-[var(--hf-surface)] text-[var(--hf-text-muted)] border-[var(--hf-border)]"
                              : "bg-[var(--hf-surface)] text-[var(--hf-teal)] border-[var(--hf-teal)]/30"
                          )}>
                            {isInferred ? 'Inferred from your experience' : 'Explicitly stated'}
                          </span>
                        </div>
                        {sk.evidence && (
                          <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed font-sans">{sk.evidence}</p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--hf-border)] text-xs">
                          <span className="text-[var(--hf-text-muted)]">Confidence:</span>
                          <span className={cn(
                            "font-medium",
                            confLevel === 'high'
                              ? "text-[var(--hf-success)]"
                              : confLevel === 'medium'
                              ? "text-[var(--hf-warning)]"
                              : "text-[var(--hf-text-muted)]"
                          )}>
                            {confText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. IDENTIFIED TARGET KEYWORDS */}
            {Array.isArray(normalizedAnalysis.keywordsFound) && normalizedAnalysis.keywordsFound.length > 0 && (
              <div id="section-identified-keywords" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--hf-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--hf-mint)]/30 border border-[var(--hf-success)]/20 text-[var(--hf-success)]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                        Keywords found in resume ({normalizedAnalysis.keywordsFound.length})
                      </h3>
                      <p className="text-xs text-[var(--hf-text-muted)]">
                        Target role terms and competencies identified in your resume text
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {normalizedAnalysis.keywordsFound.map((k: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0" />
                      <span>{k}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 8. MISSING KEYWORDS / SKILL GAPS */}
            {((Array.isArray(normalizedAnalysis.missingKeywordAnalysis) && normalizedAnalysis.missingKeywordAnalysis.length > 0) ||
              (Array.isArray(normalizedAnalysis.missingKeywords) && normalizedAnalysis.missingKeywords.length > 0)) && (
              <div id="section-missing-keywords" className="hf-card p-6 md:p-8 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[var(--hf-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--hf-warning)]/10 border border-[var(--hf-warning)]/20 text-[var(--hf-warning)]">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                        Missing keywords and skill gaps
                      </h3>
                      <p className="text-xs text-[var(--hf-text-muted)]">
                        Identified role requirements not clearly evidenced in your current resume
                      </p>
                    </div>
                  </div>

                  {Array.isArray(normalizedAnalysis.missingKeywords) && normalizedAnalysis.missingKeywords.length > 0 && (
                    <button 
                      type="button"
                      onClick={handleNavigateToLearningPath}
                      className="hf-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px] px-3.5 shrink-0"
                    >
                      <GraduationCap className="w-4 h-4 text-[var(--hf-teal)]" />
                      <span>Build skill roadmap</span>
                    </button>
                  )}
                </div>

                {Array.isArray(normalizedAnalysis.missingKeywordAnalysis) && normalizedAnalysis.missingKeywordAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {normalizedAnalysis.missingKeywordAnalysis.map((item: any, idx: number) => {
                      const confLevel = (item.confidence_level || '').toLowerCase();
                      const confText = confLevel === 'high' ? 'High confidence' : confLevel === 'medium' ? 'Medium confidence' : confLevel === 'low' ? 'Low confidence' : null;
                      return (
                        <div key={idx} className="p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 bg-[var(--hf-warning)]/10 text-[var(--hf-warning)] font-semibold text-xs rounded-lg border border-[var(--hf-warning)]/20 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Missing skill: {item.keyword}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-[var(--hf-border)] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)]">
                                {item.isInferred ? 'Inferred from role description' : 'Required in job posting'}
                              </span>
                              {confText && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-[var(--hf-border)] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)]">
                                  {confText}
                                </span>
                              )}
                              {item.gapType && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-[var(--hf-border)] bg-[var(--hf-surface)] text-[var(--hf-text-secondary)]">
                                  {item.gapType === 'direct_evidence_unclear' && 'Direct evidence unclear'}
                                  {item.gapType === 'transferable_evidence' && 'Transferable experience'}
                                  {item.gapType === 'weak_evidence' && 'Weak implementation evidence'}
                                  {item.gapType === 'genuine_gap' && 'Skill gap'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[var(--hf-text-muted)] font-medium">Gap {idx + 1}</span>
                          </div>

                          {item.inferredNote && (
                            <p className="text-xs text-[var(--hf-text-muted)] italic bg-[var(--hf-surface)] p-3 rounded-lg border border-[var(--hf-border)]">
                              <strong className="not-italic text-[var(--hf-text)]">Inference context:</strong> {item.inferredNote}
                            </p>
                          )}

                          {item.whyItMatters && (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-[var(--hf-text)] block">
                                Why it matters for this role:
                              </span>
                              <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed font-sans">
                                {item.whyItMatters}
                              </p>
                            </div>
                          )}

                          {item.suggestedRewrite && (
                            <div className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface)] space-y-2.5">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <span className="text-xs font-semibold text-[var(--hf-teal)]">
                                  Suggested bullet / draft action:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(item.suggestedRewrite)}
                                  className="hf-btn-ghost text-xs flex items-center gap-1.5 px-3 min-h-[44px] cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy draft</span>
                                </button>
                              </div>
                              <p className="text-xs text-[var(--hf-text)] font-sans leading-relaxed">
                                {item.suggestedRewrite.startsWith('Add a verified') ||
                                 item.suggestedRewrite.startsWith('Add a real') ||
                                 item.suggestedRewrite.startsWith('No direct evidence') ||
                                 item.suggestedRewrite.startsWith('Move your') ||
                                 item.suggestedRewrite.startsWith('Your ') ||
                                 item.suggestedRewrite.startsWith('You mention') ||
                                 item.suggestedRewrite.startsWith('Do not add') ||
                                 item.suggestedRewrite.startsWith('Expand ')
                                  ? item.suggestedRewrite
                                  : `"${item.suggestedRewrite}"`}
                              </p>
                              <p className="text-[11px] text-[var(--hf-text-muted)] italic border-t border-[var(--hf-border)] pt-2">
                                Draft suggestion: verify personal experience before adding. Only include skills and projects you have actually executed.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(normalizedAnalysis.missingKeywords || []).map((k: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text)]">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 9. ATS STRUCTURE & FORMATTING ANALYSIS */}
            {Array.isArray(normalizedAnalysis.formattingSuggestions) && normalizedAnalysis.formattingSuggestions.length > 0 && (
              <div id="section-formatting" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Formatting and structure suggestions
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Recommendations for layout compatibility, column parsing, and section hierarchy
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {normalizedAnalysis.formattingSuggestions.map((s: string, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] flex items-start gap-3">
                      <span className="text-[11px] font-semibold text-[var(--hf-teal)] bg-[var(--hf-surface)] border border-[var(--hf-border)] px-2 py-0.5 rounded shrink-0 mt-0.5 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-xs text-[var(--hf-text)] leading-relaxed font-sans">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. SPECIFIC RESUME IMPROVEMENTS */}
            {Array.isArray(normalizedAnalysis.specificImprovements) && normalizedAnalysis.specificImprovements.length > 0 && (
              <div id="section-improvements" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Resume bullet rewrites
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Before and after bullet revisions focused on measurable outcomes and technical scope
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {normalizedAnalysis.specificImprovements.map((imp: any, i: number) => (
                    <div key={i} className="p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--hf-text)]">
                          Bullet rewrite {i + 1}
                        </span>
                      </div>

                      {imp.original && (
                        <div className="p-3.5 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                          <span className="text-[11px] font-semibold text-[var(--hf-text-muted)] block mb-1">
                            Original bullet:
                          </span>
                          <p className="text-xs text-[var(--hf-text-secondary)] italic font-sans">
                            &ldquo;{imp.original}&rdquo;
                          </p>
                        </div>
                      )}

                      {imp.issue && (
                        <div className="p-3.5 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                          <span className="text-[11px] font-semibold text-[var(--hf-warning)] block mb-1">
                            Issue identified:
                          </span>
                          <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed font-sans">
                            {imp.issue}
                          </p>
                        </div>
                      )}

                      {(imp.improved || imp.recommendedChange) && (
                        <div className="p-3.5 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                            <span className="text-[11px] font-semibold text-[var(--hf-teal)]">
                              Improved draft:
                            </span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(imp.improved || imp.recommendedChange)}
                              className="hf-btn-ghost text-xs flex items-center gap-1.5 px-3 min-h-[44px] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy bullet</span>
                            </button>
                          </div>
                          <p className="text-xs text-[var(--hf-text)] font-sans font-medium leading-relaxed">
                            &ldquo;{imp.improved || imp.recommendedChange}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. ACTIONABLE RECOMMENDATIONS */}
            {Array.isArray(normalizedAnalysis.recommendations) && normalizedAnalysis.recommendations.length > 0 && (
              <div id="section-recommendations" className="hf-card p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--hf-border)]">
                  <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Actionable recommendations
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Targeted steps to improve candidate competitiveness before applying
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {normalizedAnalysis.recommendations.map((rec: any, idx: number) => {
                    const recText = typeof rec === 'string' ? rec : (rec?.recommendation || rec?.action || '');
                    if (!recText) return null;
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] space-y-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-teal)] text-xs font-semibold flex items-center justify-center tabular-nums">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-[var(--hf-text)] leading-relaxed font-sans">{recText}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 12. TAILORED COVER LETTER */}
            <div id="section-cover-letter" className="hf-card p-6 md:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-[var(--hf-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-teal)]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--hf-text)]">
                      Tailored cover letter
                    </h3>
                    <p className="text-xs text-[var(--hf-text-muted)]">
                      Custom 3-paragraph letter aligning candidate background with target job requirements
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {coverLetter && (
                    <button 
                      type="button"
                      onClick={() => navigator.clipboard.writeText(coverLetter)}
                      className="hf-btn-secondary text-xs flex items-center gap-1.5 px-3 min-h-[44px] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy letter</span>
                    </button>
                  )}
                  {(!coverLetter || coverLetter.length < 120) && (
                    <button
                      type="button"
                      onClick={handleGenerateCoverLetter}
                      disabled={isGeneratingCL || !jobDesc.trim()}
                      className="hf-btn-primary text-xs flex items-center gap-2 px-4 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingCL ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Drafting letter...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate tailored cover letter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {coverLetterError && !isGeneratingCL && (
                <div 
                  role="alert"
                  className="p-4 rounded-xl bg-[var(--hf-surface-secondary)] border border-[var(--hf-warning)]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-[var(--hf-warning)] shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--hf-text)]">Cover letter notice</h4>
                      <p className="text-xs text-[var(--hf-text-muted)] mt-0.5">{coverLetterError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCL || !jobDesc.trim()}
                    className="hf-btn-secondary text-xs px-3 min-h-[44px] cursor-pointer shrink-0 self-end sm:self-auto"
                  >
                    Retry cover letter
                  </button>
                </div>
              )}

              {isGeneratingCL ? (
                <div className="p-8 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[var(--hf-teal)] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[var(--hf-text)]">Drafting tailored 3-paragraph cover letter...</p>
                  <p className="text-xs text-[var(--hf-text-muted)]">Aligning your audited achievements with the specific requirements in the job description.</p>
                </div>
              ) : coverLetter && coverLetter.length >= 120 ? (
                <div className="p-5 sm:p-6 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap max-h-[420px] overflow-y-auto">
                  {coverLetter}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-center space-y-2">
                  <p className="text-xs text-[var(--hf-text-muted)] font-sans">
                    {jobDesc.trim() 
                      ? "A tailored cover letter can be generated directly using this resume and target job." 
                      : "Paste a job description to generate a tailored, ATS-aligned cover letter."}
                  </p>
                  {jobDesc.trim() && (
                    <button
                      type="button"
                      onClick={handleGenerateCoverLetter}
                      disabled={isGeneratingCL}
                      className="mt-2 text-xs font-medium text-[var(--hf-teal)] hover:underline inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] px-3"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Click to generate full cover letter (+15 credits)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <NextStepBridgeCard
            title="Resume evaluation complete"
            contextData={`ATS match score: ${normalizedAnalysis?.score ?? 0}%. ${(normalizedAnalysis?.missingKeywords || []).length > 0 ? `Identified ${(normalizedAnalysis?.missingKeywords || []).length} missing skill keywords (${(normalizedAnalysis?.missingKeywords || []).slice(0, 3).join(', ')}).` : 'High keyword alignment with target role specifications.'}`}
            primaryStep={{
              label: "Search matched jobs",
              icon: Search,
              to: "/jobs",
              state: {
                role: getAnalyzerJobContext().role || "Software Engineer",
                autoSearch: true
              }
            }}
            secondaryStep={{
              label: "Build 30-day skill roadmap",
              icon: GraduationCap,
              to: "/learning",
              state: (() => {
                const ctx = getAnalyzerJobContext();
                const cleanRole = ctx.role || 'Software Engineer';
                return {
                  from: 'analyzer',
                  targetRole: cleanRole,
                  missingSkills: ctx.skills,
                  targetSkills: ctx.skills,
                  recommendations: ctx.recommendations,
                  jobContext: {
                    title: cleanRole,
                    company: ctx.company || 'Target Opportunity',
                    skills: ctx.skills,
                    description: jobDesc,
                    source: 'analyzer'
                  }
                };
              })(),
              onClick: handleNavigateToLearningPath
            }}
          />

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => { 
                setAnalysis(null); 
                setCoverLetter(null); 
                analyzerGeneratedJobKeyRef.current = null;
                try {
                  sessionStorage.removeItem('resume_analyzer_result');
                  sessionStorage.removeItem('resume_analyzer_cover_letter');
                } catch (e) {}
              }}
              className="hf-btn-secondary text-xs flex items-center gap-2 cursor-pointer min-h-[44px] px-4"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--hf-teal)]" />
              <span>Modify target job and re-analyze</span>
            </button>
            <button 
              onClick={handleFullReset}
              className="hf-btn-ghost text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px] px-4"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start new analysis</span>
            </button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
