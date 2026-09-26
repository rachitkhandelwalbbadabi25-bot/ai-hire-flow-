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
import { extractJobSkills, getActiveJobKey, formatActiveJobDescription, getStoredActiveJob } from '../utils/jobContextManager';
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
  BookOpen,
  X,
  ExternalLink
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

    // Case 1: An active job is selected, and it is DIFFERENT from what Analyzer was previously bound to
    if (currentJobKey && savedAnalyzerJobKey !== currentJobKey) {
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

    // Case 2: No active job is selected, but analyzer was bound to a previous active job
    if (!currentJobKey && savedAnalyzerJobKey) {
      sessionStorage.removeItem('resume_analyzer_active_job_key');
      sessionStorage.removeItem('resume_analyzer_result');
      sessionStorage.removeItem('resume_analyzer_cover_letter');
      sessionStorage.removeItem('resume_analyzer_cache_source');
      sessionStorage.removeItem('resume_analyzer_job_desc');

      return {
        jobDesc: '',
        analysis: null,
        coverLetter: null,
        cacheSource: null as 'browser' | 'persistent' | null,
        activeJobKey: null
      };
    }

    // Case 3: Same active job key or preserving custom manual JD input
    const savedDesc = sessionStorage.getItem('resume_analyzer_job_desc');
    let effectiveDesc = savedDesc ?? '';
    if (!effectiveDesc && currentStoredJob) {
      effectiveDesc = formatActiveJobDescription(currentStoredJob);
      sessionStorage.setItem('resume_analyzer_job_desc', effectiveDesc);
    }

    const rawAnalysis = sessionStorage.getItem('resume_analyzer_result');
    const savedAnalysis = rawAnalysis ? JSON.parse(rawAnalysis) : null;
    const savedCL = sessionStorage.getItem('resume_analyzer_cover_letter') || null;
    const savedCache = (sessionStorage.getItem('resume_analyzer_cache_source') as any) || null;

    return {
      jobDesc: effectiveDesc,
      analysis: savedAnalysis,
      coverLetter: savedCL,
      cacheSource: savedCache,
      activeJobKey: currentJobKey || savedAnalyzerJobKey || null
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
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const isGeneratingCLRef = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('Auditing resume against ATS benchmarks...');
  const [analysis, setAnalysis] = useState<any>(initialAnalyzerState.analysis);
  const [coverLetter, setCoverLetter] = useState<string | null>(initialAnalyzerState.coverLetter);
  const [error, setError] = useState<string | null>(null);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'browser' | 'persistent' | null>(initialAnalyzerState.cacheSource);
  const activeJobKeyRef = useRef<string | null>(initialAnalyzerState.activeJobKey);
  const analyzerGeneratedJobKeyRef = useRef<string | null>(null);

  // Sync state to sessionStorage to preserve across navigation (NAVIGATION != RESET)
  useEffect(() => {
    try {
      if (analysis) {
        sessionStorage.setItem('resume_analyzer_result', JSON.stringify(analysis));
      } else {
        sessionStorage.removeItem('resume_analyzer_result');
      }
    } catch (e) {}
  }, [analysis]);

  useEffect(() => {
    try {
      if (coverLetter) {
        sessionStorage.setItem('resume_analyzer_cover_letter', coverLetter);
      } else {
        sessionStorage.removeItem('resume_analyzer_cover_letter');
      }
    } catch (e) {}
  }, [coverLetter]);

  useEffect(() => {
    try {
      if (cacheSource) {
        sessionStorage.setItem('resume_analyzer_cache_source', cacheSource);
      } else {
        sessionStorage.removeItem('resume_analyzer_cache_source');
      }
    } catch (e) {}
  }, [cacheSource]);

  useEffect(() => {
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
      setAnalysisStatus('Auditing resume against ATS benchmarks with Velona GLM 5.3 Flash...');

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
    setAnalysis(null);
    setCoverLetter(null);
    setFile(null);
    setExtractedDoc(null);
    setJobDesc('');
    setError(null);
    setCacheSource(null);
    clearCurrentJobContext();
    activeJobKeyRef.current = null;
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

    // If the active job has changed from what Analyzer is currently bound to
    if (activeJobKeyRef.current !== currentKey) {
      activeJobKeyRef.current = currentKey;

      // Do not treat the active-job context published by this Analyzer result
      // as an external Job Finder selection that should clear the fresh result.
      if (analyzerGeneratedJobKeyRef.current === currentKey) {
        analyzerGeneratedJobKeyRef.current = null;
        return;
      }

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

    const finalScore = analysis.score ?? 75;
    const atsCompatibility = analysis.atsCompatibility || (finalScore >= 80 ? 'High' : finalScore >= 60 ? 'Moderate' : 'Low');

    // Strengths: Ensure array of distinct items
    const strengths: string[] = Array.isArray(analysis.strengths) && analysis.strengths.length > 0
      ? analysis.strengths.map(String).filter(Boolean)
      : (analysis.scoreBreakdown || [])
          .filter((cat: any) => (cat.score ?? 0) >= 70)
          .map((cat: any) => `${cat.category}: ${cat.explanation || 'Demonstrated foundational technical capabilities.'}`);

    // Weaknesses: Normalized with problem, whyItMatters, and howToFix
    const weaknesses = Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0
      ? analysis.weaknesses.map((w: any) => {
          if (typeof w === 'object' && w !== null) {
            return {
              problem: String(w.problem || w.issue || w.gap || w.title || '').trim(),
              whyItMatters: String(w.whyItMatters || w.why || w.impact || 'ATS parsers and technical screeners look for verified metrics to gauge candidate qualification.').trim(),
              howToFix: String(w.howToFix || w.fix || w.recommendation || 'Quantify bullet points with specific metrics, percentages, and role-aligned tools.').trim()
            };
          }
          const str = String(w || '').trim();
          return {
            problem: str,
            whyItMatters: 'Recruiters and automated screeners downgrade resumes with unverified or unquantified claims.',
            howToFix: 'Strengthen this section with measurable accomplishments, industry-standard keywords, and technical context.'
          };
        }).filter((w: any) => Boolean(w.problem))
      : (analysis.scoreBreakdown || [])
          .filter((cat: any) => (cat.score ?? 0) < 75)
          .map((cat: any) => ({
            problem: `${cat.category} score is calibrated below top-tier threshold (${cat.score ?? 0}/100).`,
            whyItMatters: cat.explanation || 'Deficiencies in this category directly reduce recruiter screening pass-rates.',
            howToFix: Array.isArray(cat.recommendations) && cat.recommendations[0]
              ? cat.recommendations[0]
              : 'Add concrete metrics, throughput improvements, and role-specific keywords.'
          }));

    // Formatting & Structural Strategy
    const formattingSuggestions: string[] = Array.isArray(analysis.formattingSuggestions) && analysis.formattingSuggestions.length > 0
      ? analysis.formattingSuggestions.map(String).filter(Boolean)
      : (analysis.scoreBreakdown || []).find((b: any) => b.category?.includes('Structure'))?.recommendations || [
          "Ensure standard section headers (Experience, Technical Skills, Education) for clean ATS column parsing.",
          "Keep bullet lengths between 1-2 lines for optimal recruiter scanning velocity."
        ];

    // Specific Resume Improvements: concrete issue -> recommended change pairs
    const specificImprovements: { issue: string; recommendedChange: string }[] = [];
    if (Array.isArray(analysis.impactSuggestions) && analysis.impactSuggestions.length > 0) {
      analysis.impactSuggestions.forEach((imp: string, idx: number) => {
        specificImprovements.push({
          issue: `Experience bullet #${idx + 1} lacks quantifiable metrics`,
          recommendedChange: imp
        });
      });
    } else {
      const impactCat = (analysis.scoreBreakdown || []).find((b: any) => b.category?.includes('Impact'));
      if (impactCat && Array.isArray(impactCat.recommendations)) {
        impactCat.recommendations.forEach((rec: string, idx: number) => {
          specificImprovements.push({
            issue: `Impact opportunity #${idx + 1}`,
            recommendedChange: rec
          });
        });
      }
    }

    // Identified Target Keywords
    const keywordsFound: string[] = Array.isArray(analysis.keywordsFound) && analysis.keywordsFound.length > 0
      ? analysis.keywordsFound.map(String).filter(Boolean)
      : (analysis.skillsAnalysis || []).filter((s: any) => s.type === 'explicit').map((s: any) => s.skill);

    // Missing Keywords
    const missingKeywords: string[] = Array.isArray(analysis.missingKeywords)
      ? analysis.missingKeywords.map(String).filter(Boolean)
      : [];

    return {
      ...analysis,
      score: finalScore,
      atsCompatibility,
      strengths: strengths.length > 0 ? strengths : ['Strong foundational technical background aligned with industry baselines.'],
      weaknesses: weaknesses.length > 0 ? weaknesses : [{
        problem: 'Limited quantifiable scale metrics in project descriptions.',
        whyItMatters: 'ATS algorithms favor bullet points with numbers and verifiable impact.',
        howToFix: 'Add specific percentage increases, user counts, or latency reductions to your experience.'
      }],
      formattingSuggestions,
      specificImprovements: specificImprovements.length > 0 ? specificImprovements : [{
        issue: 'Bullet points list duties rather than business outcomes',
        recommendedChange: 'Rewrite bullets using the [Action Verb] + [Context/Tool] + [Quantified Result] formula.'
      }],
      keywordsFound,
      missingKeywords
    };
  }, [analysis]);

  // Dedicated on-demand cover letter generator
  const handleGenerateCoverLetter = async () => {
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
      setAnalysisStatus('Auditing resume against ATS benchmarks with Velona GLM 5.3 Flash...');
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

      // Synchronize active job context across system modules
      const derivedCtx = getAnalyzerJobContext(analysisResult);
      if (derivedCtx.role) {
        const analyzerActiveJob = {
          title: derivedCtx.role,
          company: derivedCtx.company || 'Target Opportunity',
          skills: derivedCtx.skills,
          description: jobDesc || derivedCtx.description,
          source: 'analyzer',
          selectedAt: Date.now()
        };
        analyzerGeneratedJobKeyRef.current = getActiveJobKey(analyzerActiveJob);
        setCurrentActiveJob(analyzerActiveJob);
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
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Initializing Resume Analyzer...</p>
        </div>
      </div>
    );
  }

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

      {error && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="my-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-400">
                {error.toLowerCase().includes('gateway') || error.toLowerCase().includes('502') || error.toLowerCase().includes('503') || error.toLowerCase().includes('520') || error.toLowerCase().includes('524') || error.toLowerCase().includes('cloudflare')
                  ? 'Provider Gateway Error'
                  : error.toLowerCase().includes('time') || error.toLowerCase().includes('504')
                  ? 'Provider Timeout'
                  : error.toLowerCase().includes('auth') || error.toLowerCase().includes('api key')
                  ? 'Authentication Error'
                  : error.toLowerCase().includes('balance') || error.toLowerCase().includes('credit') || error.toLowerCase().includes('rate')
                  ? 'Rate Limit / Quota Notice'
                  : error.toLowerCase().includes('parse') || error.toLowerCase().includes('schema') || error.toLowerCase().includes('truncated')
                  ? 'Response Parsing Error'
                  : 'Analysis Error'}
              </h4>
              <p className="text-xs text-ink-dim mt-0.5">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isAnalyzing ? 'Analyzing...' : 'Retry Analysis'}
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1.5 text-ink-dim hover:text-ink transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Dedicated ANALYZING State - Single unified processing view */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          id="ats-processing-section"
        >
          <AILoadingStepper 
            presetKey="resume_audit" 
            title="ATS Structural & Keyword Audit Pipeline" 
          />
        </motion.div>
      )}

      {/* Normal Input Setup Section (Hidden during active analysis and when results are shown) */}
      {!analysis && !isAnalyzing ? (
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
                      Master Resume Profile
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
                  /* Standard PDF / Scanned / Image Upload Dropzone */
                  <div>
                    <label 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDrop}
                      className={cn(
                        "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl min-h-[14rem] p-4 cursor-pointer transition-all",
                        extractedDoc ? "border-accent bg-accent/5" : (file && error) ? "border-rose-500/50 bg-rose-500/5" : "border-border hover:border-accent/40",
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
                        <div className="text-center px-4">
                          <div className="bg-accent/10 border border-accent/30 p-3 rounded-full inline-block mb-2 animate-pulse" aria-hidden="true">
                            <Loader2 className="w-6 h-6 text-accent animate-spin" />
                          </div>
                          <p className="font-bold text-ink text-sm">{file?.name || 'Resume Document'}</p>
                          <p className="text-[10px] text-accent mt-1 uppercase tracking-widest font-bold">
                            {extractionStatus || 'Extracting Resume Text...'}
                          </p>
                        </div>
                      ) : extractedDoc ? (
                        <div className="text-center px-4">
                          <div className="bg-accent p-3 rounded-full inline-block mb-2 shadow-md shadow-accent/20" aria-hidden="true">
                            <FileText className="w-6 h-6 text-black" />
                          </div>
                          <p className="font-bold text-ink text-sm">{extractedDoc.fileName}</p>
                          <p className="text-[10px] text-accent mt-1 uppercase tracking-widest font-bold">Document Ready to Analyze</p>
                          <span className="text-[10px] font-mono text-ink-dim block mt-0.5">
                            {extractedDoc.charCount.toLocaleString()} characters extracted · Fast Cache Active
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveUploadedFile();
                            }}
                            className="mt-2 text-[11px] text-ink-dim hover:text-rose-400 font-mono underline transition-colors cursor-pointer"
                          >
                            Remove / Change File
                          </button>
                        </div>
                      ) : file && error ? (
                        <div className="text-center px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-full inline-block mb-2" aria-hidden="true">
                            <AlertCircle className="w-6 h-6 text-rose-400" />
                          </div>
                          <p className="font-bold text-ink text-sm">{file.name}</p>
                          <p className="text-xs text-rose-400 mt-1 max-w-sm mx-auto font-medium">
                            Could not extract readable text from this resume.
                          </p>
                          <div className="flex items-center justify-center gap-3 mt-3">
                            <button
                              type="button"
                              onClick={handleRetryExtraction}
                              className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded-lg hover:bg-accent/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Retry Extraction
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveUploadedFile}
                              className="px-3 py-1.5 bg-surface border border-border text-ink hover:text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                            >
                              Remove Resume
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center px-4">
                          <div className="bg-surface-light p-3 rounded-full inline-block mb-2" aria-hidden="true">
                            <FileUp className="w-6 h-6 text-ink-dim" />
                          </div>
                          <p className="font-bold text-ink text-sm">Select or Drop Resume</p>
                          <p className="text-[10px] text-ink-dim mt-1 uppercase tracking-widest font-bold">PDF, DOCX, TXT, or Images (JPG, PNG)</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {error && !file && (
                  <div role="alert" className="mt-4 p-4 bg-rose-500/10 text-rose-400 text-sm rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                    <button
                      onClick={handleStartAnalysis}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Retry resume analysis"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Retry Analysis'}
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
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Target className="w-4 h-4 text-accent" aria-hidden="true" /> Target Job Description
                  </h3>
                  <span className="text-[9px] font-mono text-ink-dim uppercase">
                    Optional for ATS Match
                  </span>
                </div>

                {currentActiveJob && (
                  <div className="mb-3 p-3 bg-accent/10 border border-accent/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Target className="w-3.5 h-3.5 text-accent shrink-0" />
                      <div className="text-xs text-ink truncate font-sans">
                        <span>Target Real Job: <strong>{currentActiveJob.title}</strong> at {currentActiveJob.company}</span>
                        {currentActiveJob.location && (
                          <span className="ml-1 text-ink-dim font-normal">
                            ({currentActiveJob.location})
                          </span>
                        )}
                        {currentActiveJob.provider && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-[9px] font-mono text-accent font-bold">
                            {currentActiveJob.provider}
                          </span>
                        )}
                        {currentActiveJob.isRemote && (
                          <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-mono text-emerald-400 font-bold">
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
                          className="text-[10px] text-accent hover:underline flex items-center gap-1 font-mono"
                        >
                          Official Listing <ExternalLink className="w-2.5 h-2.5" />
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
                        className="text-[10px] text-ink-dim hover:text-rose-400 underline font-mono cursor-pointer"
                      >
                        Clear Active Job
                      </button>
                    </div>
                  </div>
                )}

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
                          disabled={isAnalyzing || isExtracting || !canAnalyze}
                          className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent/90 text-black font-mono font-extrabold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-accent/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isExtracting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Reading Document...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="w-5 h-5" />
                              <span>
                                {isPrePopulated ? 'Use Saved Resume & Run Audit' : 'Analyze Uploaded Resume'}
                              </span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                        {!canAnalyze && file && !isExtracting && (
                          <span className="text-[11px] text-rose-400 font-mono">
                            Resume text could not be extracted yet.
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

          {/* Explainable AI Engine - Complete 12-Section Recruiter Audit */}
          <div className="space-y-8">
            {/* 1. ATS COMPATIBILITY SCORE */}
            <div id="section-ats-score" className="bg-gradient-to-r from-accent/15 via-surface to-accent/5 p-6 md:p-8 rounded-3xl border border-accent/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-accent text-white text-[9px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <BrainCircuit className="w-3 h-3" /> Explainable AI Auditor
                  </span>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    Transparent Recruiter Calibration
                  </span>
                  {(normalizedAnalysis.score ?? 0) <= 65 ? (
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-amber-500/20">
                      Generic Baseline (40-65 Range)
                    </span>
                  ) : (normalizedAnalysis.score ?? 0) <= 79 ? (
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
                  {(normalizedAnalysis.score ?? 0) <= 65 
                    ? "Honest Scoring Rule: Generic resumes lacking hard quantified metrics or direct role alignment calibrate between 40-65. Follow the rewrites below to break into 80+."
                    : "Calibrated against specific role requirements and company benchmarks with transparent category weights."}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-background/80 px-6 py-4 rounded-2xl border border-border shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider block">ATS Match Score</span>
                  <span className="text-3xl font-black text-accent">{normalizedAnalysis.score ?? 0} <span className="text-sm font-normal text-ink-dim">/ 100</span></span>
                </div>
                <span className={cn(
                  "status-pill text-xs font-bold",
                  (normalizedAnalysis.score ?? 0) >= 80 ? "status-offer" : (normalizedAnalysis.score ?? 0) >= 65 ? "status-applied" : "status-interview"
                )}>
                  {normalizedAnalysis.atsCompatibility || 'Calibrated'}
                </span>
              </div>
            </div>

            {/* 2. OVERALL RECRUITER SUMMARY */}
            <div id="section-recruiter-summary" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-2xl text-accent">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                      Overall Recruiter Summary & Audit Memo
                    </h3>
                    <p className="text-xs text-ink-dim">Comprehensive executive evaluation from hiring manager and ATS lens</p>
                  </div>
                </div>
                {normalizedAnalysis.human_explanation && (
                  <button
                    onClick={() => navigator.clipboard.writeText(normalizedAnalysis.human_explanation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light border border-border rounded-xl text-[10px] font-bold text-ink-dim hover:text-accent hover:border-accent/30 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Memo
                  </button>
                )}
              </div>

              {normalizedAnalysis.summary && (
                <div className="p-4 bg-surface-light rounded-2xl border border-border/80">
                  <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider block mb-1.5">
                    Executive Recruiter Summary:
                  </span>
                  <p className="text-sm text-ink leading-relaxed font-sans">
                    {normalizedAnalysis.summary}
                  </p>
                </div>
              )}

              {normalizedAnalysis.human_explanation && (
                <div className="bg-background/80 p-5 rounded-2xl border border-border text-ink leading-relaxed font-sans text-sm whitespace-pre-wrap">
                  <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider block mb-2">
                    Candid Recruiter Notes:
                  </span>
                  {normalizedAnalysis.human_explanation}
                </div>
              )}
            </div>

            {/* 3. STRENGTHS (WHAT IS GOOD IN MY RESUME) */}
            <div id="section-strengths" className="bg-surface p-6 sm:p-8 rounded-3xl border border-emerald-500/20 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm uppercase tracking-widest flex items-center gap-2">
                    Key Strengths & Competitive Advantages
                  </h3>
                  <p className="text-xs text-ink-dim">Demonstrated qualifications and verifiable accomplishments that pass ATS screens</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {normalizedAnalysis.strengths.map((str: string, idx: number) => (
                  <div key={idx} className="bg-background p-4 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
                    <div className="p-1 bg-emerald-500/10 rounded-md text-emerald-400 mt-0.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-ink leading-relaxed font-sans">{str}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. WEAKNESSES / AREAS TO IMPROVE */}
            <div id="section-weaknesses" className="bg-surface p-6 sm:p-8 rounded-3xl border border-rose-500/20 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm uppercase tracking-widest flex items-center gap-2">
                    Critical Gaps & Areas to Improve
                  </h3>
                  <p className="text-xs text-ink-dim">Recruiter-audited deficiencies with 3-part structured breakdown</p>
                </div>
              </div>

              <div className="space-y-4">
                {normalizedAnalysis.weaknesses.map((w: any, idx: number) => (
                  <div key={idx} className="bg-background p-5 rounded-2xl border border-border space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Defect #{idx + 1}: {w.problem}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-border rounded-lg text-ink-dim uppercase">
                        High Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="bg-surface/60 p-3 rounded-xl border border-border/70">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
                          Why It Matters To Recruiters:
                        </span>
                        <p className="text-ink-dim leading-relaxed font-sans">{w.whyItMatters}</p>
                      </div>

                      <div className="bg-surface/60 p-3 rounded-xl border border-border/70">
                        <span className="text-[10px] font-mono font-bold text-success uppercase tracking-wider block mb-1">
                          How To Fix It:
                        </span>
                        <p className="text-ink leading-relaxed font-sans">{w.howToFix}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. SCORE BREAKDOWN (4-Category Weighted Math) */}
            <div id="section-score-breakdown" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-accent" /> 4-Category Weighted Math Breakdown
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">
                    Mathematical formula verifying how each category weight contributes to your final ATS score of {normalizedAnalysis?.score ?? 0}/100.
                  </p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-mono font-bold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Weight Total: 100%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {(normalizedAnalysis.scoreBreakdown || []).map((cat: any, idx: number) => (
                  <div key={idx} className="bg-background p-6 rounded-2xl border border-border flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-ink uppercase tracking-wider">{cat.category}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-surface border border-border rounded-lg text-accent">
                          Weight: {cat.weight}%
                        </span>
                      </div>
                      <p className="text-xs text-ink-dim leading-relaxed">{cat.explanation}</p>

                      {/* Extracted Evidence from Resume */}
                      {cat.evidence && (
                        <div className="bg-surface/70 border border-border/80 p-3 rounded-xl">
                          <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-wider block mb-1">
                            Audited Resume Evidence:
                          </span>
                          <p className="text-xs text-ink italic font-sans">"{cat.evidence}"</p>
                        </div>
                      )}

                      {/* Actionable Recommendations */}
                      {Array.isArray(cat.recommendations) && cat.recommendations.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-mono font-bold text-ink-dim uppercase tracking-wider block">
                            Recommendations:
                          </span>
                          <ul className="space-y-1">
                            {cat.recommendations.map((rec: string, rIdx: number) => (
                              <li key={rIdx} className="text-[11px] text-ink-dim flex items-start gap-1.5 leading-snug">
                                <span className="text-accent font-bold mt-0.5">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60">
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
                          {cat.mathExplanation || `(${cat.score}/100) × ${cat.weight}% = ${cat.earnedPoints ?? Math.round(((cat.score || 0) * (cat.weight || 0)) / 100)} pts`}
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
                  {(normalizedAnalysis.scoreBreakdown || []).map((cat: any, i: number) => (
                    <span key={i} className="text-ink font-bold">
                      {cat.earnedPoints ?? Math.round(((cat.score || 0) * (cat.weight || 0)) / 100)}{i < (normalizedAnalysis.scoreBreakdown || []).length - 1 ? " + " : ""}
                    </span>
                  ))}
                  <span className="text-accent font-black text-sm">= {normalizedAnalysis?.score ?? 0} / 100</span>
                </div>
              </div>
            </div>

            {/* 6. TECHNICAL / SKILL MATCH ANALYSIS */}
            {normalizedAnalysis.skillsAnalysis && normalizedAnalysis.skillsAnalysis.length > 0 && (
              <div id="section-skills-matrix" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-4 flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" /> Audited Skills: Explicit vs. Inferred
                    </h3>
                    <p className="text-xs text-ink-dim mt-1">
                      Inferred skills (implied from tooling or frameworks) are calibrated with transparent confidence ratings.
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
                  {normalizedAnalysis.skillsAnalysis.map((sk: any, i: number) => (
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

            {/* 7. IDENTIFIED TARGET KEYWORDS */}
            <div id="section-identified-keywords" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border flex-wrap gap-2">
                <h3 className="font-bold text-ink flex items-center gap-2 text-xs uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Identified Target Keywords ({normalizedAnalysis.keywordsFound.length})
                </h3>
                <span className="text-[10px] font-mono text-ink-dim uppercase">
                  Verified In Resume Text
                </span>
              </div>
              {normalizedAnalysis.keywordsFound.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {normalizedAnalysis.keywordsFound.map((k: string, i: number) => (
                    <span key={i} className="bg-background text-ink px-3 py-1.5 rounded-xl text-xs font-semibold border border-border flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                      <span>{k}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-ink-dim text-xs italic">
                  No specific target technical keywords were identified in this document. Incorporate industry-standard keywords from the job description below.
                </p>
              )}
            </div>

            {/* 8. MISSING KEYWORDS / SKILL GAPS */}
            <div id="section-missing-keywords" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" /> Missing Keyword Rationale & Bullet Rewrites
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">
                    Recruiter explanation of WHY each gap matters for this role + 1 concrete metric bullet rewrite per gap.
                  </p>
                </div>

                {normalizedAnalysis.missingKeywords.length > 0 && (
                  <button 
                    onClick={handleNavigateToLearningPath}
                    className="text-[9px] font-bold text-accent px-3.5 py-2 bg-accent/10 border border-accent/20 rounded-xl hover:bg-accent/20 transition-all uppercase tracking-widest shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Generate Skill Roadmap
                  </button>
                )}
              </div>

              {(normalizedAnalysis.missingKeywordAnalysis || []).length > 0 ? (
                <div className="space-y-6">
                  {normalizedAnalysis.missingKeywordAnalysis.map((item: any, idx: number) => (
                    <div key={idx} className="bg-background p-6 rounded-2xl border border-border space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" /> Missing Skill: {item.keyword}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-lg border",
                            item.isInferred 
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}>
                            {item.isInferred ? 'Inferred from Role' : 'Listing Fact: Required in Job Posting'}
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
                        </div>
                        <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Gap #{idx + 1}</span>
                      </div>

                      {item.inferredNote && (
                        <p className="text-[11px] text-purple-300/90 italic bg-purple-500/5 p-2.5 rounded-lg border border-purple-500/10">
                          <strong>Note on Inference:</strong> {item.inferredNote}
                        </p>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-1.5 py-0.5 bg-accent/15 text-accent text-[9px] font-mono font-bold rounded uppercase">
                            GLM 5.3 Flash Analysis
                          </span>
                          <p className="text-xs font-bold text-accent uppercase tracking-wider">Why It Matters For THIS Role at THIS Company:</p>
                        </div>
                        <p className="text-xs text-ink leading-relaxed font-sans">{item.whyItMatters}</p>
                      </div>

                      <div className="bg-surface p-4 rounded-xl border border-border/80">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-success/15 text-success text-[9px] font-mono font-bold rounded uppercase">
                              GLM Recommendation
                            </span>
                            <p className="text-[10px] font-bold text-success uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Suggested Metric Bullet Rewrite:
                            </p>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(item.suggestedRewrite)}
                            className="text-[9px] font-bold text-ink-dim hover:text-ink flex items-center gap-1 uppercase tracking-wider cursor-pointer"
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
                  {normalizedAnalysis.missingKeywords.map((k: string, i: number) => (
                    <span key={i} className="bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/20">
                      {k}
                    </span>
                  ))}
                  {normalizedAnalysis.missingKeywords.length === 0 && (
                    <p className="text-ink-dim text-xs italic">Optimal keyword alignment achieved! No missing critical terms found.</p>
                  )}
                </div>
              )}
            </div>

            {/* 9. ATS STRUCTURE & FORMATTING ANALYSIS */}
            <div id="section-formatting" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" /> ATS Structure & Formatting Strategy
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">Single-column parsability, section header hygiene, and layout compatibility</p>
                </div>
                <span className="px-2.5 py-1 bg-accent/10 text-accent font-mono text-[10px] font-bold rounded-lg border border-accent/20 uppercase">
                  ATS Parser Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {normalizedAnalysis.formattingSuggestions.map((s: string, i: number) => (
                  <div key={i} className="bg-background p-4 rounded-2xl border border-border flex items-start gap-3">
                    <span className="text-accent font-mono text-[10px] font-bold bg-accent/10 px-2 py-0.5 rounded shrink-0 mt-0.5">
                      0{i+1}
                    </span>
                    <p className="text-xs text-ink leading-relaxed font-sans">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 10. SPECIFIC RESUME IMPROVEMENTS */}
            <div id="section-improvements" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-ink uppercase text-xs tracking-widest flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-accent" /> Specific Resume Bullet Improvements
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">Direct upgrades to elevate bullet points with quantifiable metrics and business impact</p>
                </div>
              </div>

              <div className="space-y-4">
                {normalizedAnalysis.specificImprovements.map((imp: any, i: number) => (
                  <div key={i} className="bg-background p-5 rounded-2xl border border-border flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                      Target Area: {imp.issue}
                    </span>
                    <div className="bg-surface/70 p-3.5 rounded-xl border border-border/70 flex items-start justify-between gap-3">
                      <p className="text-xs text-ink font-sans leading-relaxed">
                        <strong className="text-success font-mono uppercase text-[10px] block mb-1">Recommended Upgrade:</strong>
                        {imp.recommendedChange}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(imp.recommendedChange)}
                        className="text-[9px] font-bold text-ink-dim hover:text-accent flex items-center gap-1 uppercase tracking-wider shrink-0 mt-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 11. ACTIONABLE RECOMMENDATIONS (NEXT STEPS) */}
            <div id="section-recommendations" className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              <h3 className="font-bold text-ink mb-6 uppercase text-xs tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Actionable Next Steps Before Applying
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background p-4 rounded-2xl border border-border space-y-2">
                  <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-ink">Update Master Resume</h4>
                  <p className="text-[11px] text-ink-dim leading-relaxed">Incorporate the suggested metric rewrites into your Resume Editor profile.</p>
                </div>
                <div className="bg-background p-4 rounded-2xl border border-border space-y-2">
                  <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-ink">Close Missing Gaps</h4>
                  <p className="text-[11px] text-ink-dim leading-relaxed">Add highlighted technical keywords in the skills and experience sections.</p>
                </div>
                <div className="bg-background p-4 rounded-2xl border border-border space-y-2">
                  <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-ink">Target Cover Letter</h4>
                  <p className="text-[11px] text-ink-dim leading-relaxed">Submit the matched 3-paragraph cover letter alongside your updated CV.</p>
                </div>
              </div>
            </div>

            {/* 12. TAILORED COVER LETTER */}
            <div id="section-cover-letter" className="bg-surface-light p-6 sm:p-8 rounded-3xl border border-border shadow-xl">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Terminal className="w-4 h-4 text-accent" /> Tailored Cover Letter
                  </h3>
                  <p className="text-xs text-ink-dim mt-1">Custom 3-paragraph letter aligning candidate background with target job requirements</p>
                </div>

                <div className="flex items-center gap-2">
                  {coverLetter && (
                    <button 
                      onClick={() => navigator.clipboard.writeText(coverLetter)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-xl text-[10px] font-bold text-ink-dim hover:text-ink transition-colors uppercase tracking-widest cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Letter
                    </button>
                  )}
                  {(!coverLetter || coverLetter.length < 120) && (
                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={isGeneratingCL || !jobDesc.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-mono font-bold rounded-xl text-xs hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isGeneratingCL ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Drafting Letter...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Tailored Cover Letter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {coverLetterError && !isGeneratingCL && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-400">Cover Letter Notice</h4>
                      <p className="text-[11px] text-ink-dim mt-0.5">{coverLetterError}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCL || !jobDesc.trim()}
                    className="px-3 py-1.5 bg-accent text-black font-mono font-bold rounded-xl text-xs hover:bg-accent/90 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
                  >
                    Retry Cover Letter
                  </button>
                </div>
              )}

              {isGeneratingCL ? (
                <div className="bg-background p-8 rounded-2xl border border-border text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="font-mono text-xs font-bold text-ink">Drafting tailored 3-paragraph cover letter with Velona GLM 5.3 Flash...</p>
                  <p className="text-[11px] text-ink-dim">Aligning your audited achievements with the specific requirements in the job description.</p>
                </div>
              ) : coverLetter && coverLetter.length >= 120 ? (
                <div className="bg-background p-6 sm:p-8 rounded-2xl border border-border text-ink-dim text-sm leading-relaxed font-sans whitespace-pre-wrap max-h-[420px] overflow-y-auto no-scrollbar">
                  {coverLetter}
                </div>
              ) : (
                <div className="bg-background/60 p-6 rounded-2xl border border-border/80 text-center space-y-2">
                  <p className="text-xs text-ink-dim font-sans">
                    {jobDesc.trim() 
                      ? "A tailored cover letter can be generated directly using this resume and target job." 
                      : "Paste a job description to generate a tailored, ATS-aligned cover letter."}
                  </p>
                  {jobDesc.trim() && (
                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={isGeneratingCL}
                      className="mt-2 text-xs font-mono font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Click to generate full cover letter (+15 Credits)
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
                try {
                  sessionStorage.removeItem('resume_analyzer_result');
                  sessionStorage.removeItem('resume_analyzer_cover_letter');
                } catch (e) {}
              }}
              className="px-4 py-2.5 bg-surface-light hover:bg-surface border border-border text-ink hover:text-accent font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent" />
              Modify Target Job & Re-Analyze
            </button>
            <button 
              onClick={handleFullReset}
              className="px-4 py-2 text-ink-dim hover:text-rose-400 font-bold transition-all flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Terminal / New Resume
            </button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
