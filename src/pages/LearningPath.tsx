import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Search, 
  Loader2, 
  ExternalLink, 
  ArrowRight,
  GraduationCap,
  Youtube,
  Globe,
  FileText,
  Map,
  Zap,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { generateLearningPath } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import AILoadingStepper from '../components/AILoadingStepper';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import { isDemoRole, isDemoSkills } from '../utils/demoDataSanitizer';

interface Resource {
  name: string;
  platform: string;
  link: string;
  description: string;
  type: string;
}

interface Section {
  title: string;
  skillsCovered: string[];
  resources: Resource[];
}

export interface Roadmap {
  roadmapTitle: string;
  sections: Section[];
}

interface LearningPathProps {
  user: User;
}

import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link, useLocation } from 'react-router-dom';
import { useSystemOS } from '../context/SystemOSContext';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// Safe normalizers for incoming job role and skills
function normalizeIncomingRole(rawRole?: any): string {
  if (!rawRole || typeof rawRole !== 'string') return '';
  const trimmed = rawRole.trim();
  if (
    isDemoRole(trimmed) || 
    trimmed.toLowerCase().includes('sarvam') || 
    trimmed.toLowerCase().includes('glean') ||
    trimmed.toLowerCase().includes('target organization') ||
    trimmed.toLowerCase().includes('sample role') ||
    trimmed.toLowerCase().includes('demo role')
  ) {
    return '';
  }
  return trimmed;
}

function normalizeIncomingSkills(rawSkills?: any): string {
  if (!rawSkills) return '';
  let arr: string[] = [];
  if (Array.isArray(rawSkills)) {
    arr = rawSkills.map(s => {
      if (typeof s === 'string') return s.trim();
      if (s && typeof s === 'object' && s.skill) return String(s.skill).trim();
      return '';
    }).filter(Boolean);
  } else if (typeof rawSkills === 'string') {
    arr = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
  }

  const cleanArr = arr.filter(s => 
    s.length > 0 && 
    s !== 'undefined' && 
    s !== 'null' && 
    !isDemoSkills(s) &&
    !s.toLowerCase().includes('indic') && 
    !s.toLowerCase().includes('copilot')
  );

  // Case-insensitive deduplication
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of cleanArr) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(item);
    }
  }

  return unique.join(', ');
}

export default function LearningPath() {
  const { user } = useAuth();
  const { plan, checkAccess, openUpgradeModal, deductCredit } = usePlan();
  const location = useLocation();
  const { currentActiveJob, setCurrentActiveJob, clearCurrentJobContext } = useSystemOS();

  // Learning Path inputs: Initialize from location.state or sessionStorage context
  const [targetRole, setTargetRole] = useState(() => {
    // 1. Direct location.state (e.g. from Resume Analyzer)
    const stateRole = location.state?.targetRole || location.state?.role || location.state?.jobContext?.title;
    const cleanStateRole = normalizeIncomingRole(stateRole);
    if (cleanStateRole) return cleanStateRole;

    // 2. Persistent storage
    try {
      const saved = sessionStorage.getItem('learning_path_target_role');
      const cleanSaved = normalizeIncomingRole(saved);
      if (cleanSaved) return cleanSaved;

      const analyzerCtx = sessionStorage.getItem('learning_path_analyzer_context');
      if (analyzerCtx) {
        const parsed = JSON.parse(analyzerCtx);
        const ctxRole = normalizeIncomingRole(parsed?.targetRole || parsed?.jobContext?.title);
        if (ctxRole) return ctxRole;
      }
    } catch (e) {}
    return '';
  });

  const [skillsStr, setSkillsStr] = useState(() => {
    // 1. Direct location.state
    const stateSkills = location.state?.missingSkills || location.state?.targetSkills || location.state?.skills || location.state?.jobContext?.skills;
    const cleanStateSkills = normalizeIncomingSkills(stateSkills);
    if (cleanStateSkills) return cleanStateSkills;

    // 2. Persistent storage
    try {
      const saved = sessionStorage.getItem('learning_path_skills');
      const cleanSaved = normalizeIncomingSkills(saved);
      if (cleanSaved) return cleanSaved;

      const analyzerCtx = sessionStorage.getItem('learning_path_analyzer_context');
      if (analyzerCtx) {
        const parsed = JSON.parse(analyzerCtx);
        const ctxSkills = normalizeIncomingSkills(parsed?.missingSkills || parsed?.targetSkills || parsed?.jobContext?.skills);
        if (ctxSkills) return ctxSkills;
      }
    } catch (e) {}
    return '';
  });
  const [roadmapType, setRoadmapType] = useState<'personalized' | 'general'>('personalized');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(() => {
    try {
      const stored = sessionStorage.getItem('learning_path_roadmap');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && !isDemoRole(parsed.role) && !isDemoSkills(parsed.skillsGained) && !parsed.role?.toLowerCase().includes('sarvam')) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [recentAnalysis, setRecentAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if user explicitly typed custom values so we do not overwrite them involuntarily
  const userEditedRoleRef = useRef(false);
  const userEditedSkillsRef = useRef(false);
  // Track current active job key to detect when active job changes between searches
  const activeJobKeyRef = useRef<string | null>(
    sessionStorage.getItem('learning_path_active_job_key') || null
  );
  const handledLocationKeyRef = useRef<string | null>(null);

  // Sync state to sessionStorage to preserve across navigation (NAVIGATION != RESET)
  useEffect(() => {
    try {
      if (roadmap) {
        sessionStorage.setItem('learning_path_roadmap', JSON.stringify(roadmap));
      } else {
        sessionStorage.removeItem('learning_path_roadmap');
      }
    } catch (e) {}
  }, [roadmap]);

  useEffect(() => {
    try {
      if (targetRole) {
        sessionStorage.setItem('learning_path_target_role', targetRole);
      } else {
        sessionStorage.removeItem('learning_path_target_role');
      }
    } catch (e) {}
  }, [targetRole]);

  useEffect(() => {
    try {
      if (skillsStr) {
        sessionStorage.setItem('learning_path_skills', skillsStr);
      } else {
        sessionStorage.removeItem('learning_path_skills');
      }
    } catch (e) {}
  }, [skillsStr]);

  // Complete fresh start reset for Learning Path
  const handleResetLearningPath = () => {
    setRoadmap(null);
    setRecentAnalysis(null);
    setError(null);
    setTargetRole('');
    setSkillsStr('');
    userEditedRoleRef.current = false;
    userEditedSkillsRef.current = false;
    activeJobKeyRef.current = null;
    handledLocationKeyRef.current = null;
    clearCurrentJobContext();
    try {
      sessionStorage.removeItem('learning_path_roadmap');
      sessionStorage.removeItem('learning_path_target_role');
      sessionStorage.removeItem('learning_path_skills');
      sessionStorage.removeItem('learning_path_active_job_key');
      sessionStorage.removeItem('learning_path_analyzer_context');
    } catch (e) {}
  };

  const isPersonalized = roadmapType === 'personalized';

  const getJobTitle = (fullDesc: string) => {
    if (!fullDesc) return '';
    const firstLine = fullDesc.split('\n')[0].trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 50) + '...';
    }
    return firstLine;
  };

  // State synchronization & Stale-data clearing:
  // When navigating with context (e.g. from Resume Analyzer), populate target role and skills seamlessly.
  useEffect(() => {
    // 1. Explicit navigation state takes first priority (e.g. from Resume Analyzer)
    const incomingRole = normalizeIncomingRole(location.state?.targetRole || location.state?.role || location.state?.jobContext?.title);
    const rawSkills = location.state?.missingSkills || location.state?.targetSkills || location.state?.skills || location.state?.jobContext?.skills;
    const incomingSkills = normalizeIncomingSkills(rawSkills);
    const isFromAnalyzer = location.state?.from === 'analyzer' || !!sessionStorage.getItem('learning_path_analyzer_context');

    if (incomingRole || incomingSkills) {
      const locKey = location.key || `${incomingRole}__${incomingSkills}__${Date.now()}`;
      if (handledLocationKeyRef.current !== locKey) {
        handledLocationKeyRef.current = locKey;

        if (incomingRole && !userEditedRoleRef.current) {
          setTargetRole(incomingRole);
        }
        if (incomingSkills && !userEditedSkillsRef.current) {
          setSkillsStr(incomingSkills);
        }
        setRoadmap(null);
        setRecentAnalysis(null);
        setError(null);

        // Sync or establish current active job context so the Active Job Context banner displays properly
        const incomingJob = location.state?.jobContext;
        const jobTitle = incomingRole || incomingJob?.title || 'Target Role';
        const jobCompany = incomingJob?.company || currentActiveJob?.company || (isFromAnalyzer ? 'Target Opportunity' : '');
        const jobSkills = incomingSkills ? incomingSkills.split(', ') : (incomingJob?.skills || currentActiveJob?.skills || []);
        const jobDesc = incomingJob?.description || currentActiveJob?.description || '';

        const activeJobPayload = {
          id: incomingJob?.id || currentActiveJob?.id,
          title: jobTitle,
          company: jobCompany,
          location: incomingJob?.location || currentActiveJob?.location,
          description: jobDesc,
          skills: jobSkills,
          datePosted: incomingJob?.datePosted || currentActiveJob?.datePosted,
          retrievedAt: incomingJob?.retrievedAt || currentActiveJob?.retrievedAt,
          isRemote: incomingJob?.isRemote ?? currentActiveJob?.isRemote,
          jobType: incomingJob?.jobType || currentActiveJob?.jobType,
          matchScore: incomingJob?.matchScore ?? currentActiveJob?.matchScore,
          roleTier: incomingJob?.roleTier || currentActiveJob?.roleTier,
          link: incomingJob?.link || currentActiveJob?.link,
          provider: incomingJob?.provider || currentActiveJob?.provider || (isFromAnalyzer ? 'Analyzer Context' : 'Manual'),
          source: (incomingJob?.source || currentActiveJob?.source || (isFromAnalyzer ? 'analyzer' : 'manual')) as any,
          selectedAt: Date.now()
        };

        setCurrentActiveJob(activeJobPayload);
        const newKey = `${jobTitle}__${jobCompany}__${activeJobPayload.selectedAt}`;
        activeJobKeyRef.current = newKey;
        try {
          sessionStorage.setItem('learning_path_active_job_key', newKey);
          if (incomingRole) {
            sessionStorage.setItem('learning_path_target_role', incomingRole);
          }
          if (incomingSkills) {
            sessionStorage.setItem('learning_path_skills', incomingSkills);
          }
        } catch (e) {}
      }
      return;
    }

    // 2. Manage currentActiveJob lifecycle for job changes outside of direct state navigation
    const currentKey = currentActiveJob 
      ? `${currentActiveJob.title}__${currentActiveJob.company}__${currentActiveJob.selectedAt || 0}` 
      : null;
    
    // If active job changed (e.g. from Job A to Job B, or from Job A to null upon new search)
    if (activeJobKeyRef.current !== currentKey) {
      const prevKey = activeJobKeyRef.current;
      activeJobKeyRef.current = currentKey;
      try {
        if (currentKey) {
          sessionStorage.setItem('learning_path_active_job_key', currentKey);
        } else {
          sessionStorage.removeItem('learning_path_active_job_key');
        }
      } catch (e) {}

      const cleanJobTitle = normalizeIncomingRole(currentActiveJob?.title);
      const isCurrentJobDemo = !cleanJobTitle || (
        currentActiveJob && (
          currentActiveJob.company?.toLowerCase().includes('sarvam') ||
          currentActiveJob.company?.toLowerCase().includes('target organization') ||
          (!currentActiveJob.source && isDemoRole(currentActiveJob.title))
        )
      );

      if (currentActiveJob && !isCurrentJobDemo) {
        // Only reset if this is truly a newly selected job, not a restoration of active job
        const hasSavedRoadmap = !!sessionStorage.getItem('learning_path_roadmap');
        if (!hasSavedRoadmap || prevKey !== null) {
          // Job changed: replace target role with current active job if user hasn't explicitly typed their own
          if (!userEditedRoleRef.current && cleanJobTitle) {
            setTargetRole(cleanJobTitle);
          }

          // Replace target skills strictly with current job's skills - CLEAN REPLACE, NEVER MERGE
          if (!userEditedSkillsRef.current) {
            if (currentActiveJob.skills && currentActiveJob.skills.length > 0) {
              const cleanSkills = normalizeIncomingSkills(currentActiveJob.skills);
              setSkillsStr(cleanSkills);
            } else {
              setSkillsStr('');
            }
          }

          // Clear any old roadmap generated for a previous job
          setRoadmap(null);
          setRecentAnalysis(null);
          setError(null);
        }
      } else if (!currentActiveJob && prevKey !== null) {
        // Active job context was explicitly cleared by user action
        if (!userEditedRoleRef.current) setTargetRole('');
        if (!userEditedSkillsRef.current) setSkillsStr('');
        setRoadmap(null);
        setRecentAnalysis(null);
        setError(null);
      }
    }
  }, [location.key, location.state, currentActiveJob]);

  // Clean up legacy demo records from Firestore. On fresh start, do NOT auto-fill stale demo data.
  useEffect(() => {
    if (!user?.uid) return;

    const cleanupAndCheckSaved = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'learningPaths'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        for (const docItem of snapshot.docs) {
          const data = docItem.data();

          // If legacy demo/sample data, permanently purge from Firestore
          if (
            isDemoRole(data.targetRole) || 
            isDemoSkills(data.skillsStr) ||
            (typeof data.targetRole === 'string' && (data.targetRole.toLowerCase().includes('sarvam') || data.targetRole.toLowerCase().includes('glean') || data.targetRole.toLowerCase().includes('target organization'))) ||
            (typeof data.skillsStr === 'string' && (data.skillsStr.toLowerCase().includes('indic') || data.skillsStr.toLowerCase().includes('copilot')))
          ) {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'learningPaths', docItem.id));
            } catch (err) {}
          }
        }
      } catch (err) {
        console.warn('Error verifying saved learning paths:', err);
      }
    };

    cleanupAndCheckSaved();
  }, [user?.uid]);

  // Check recent analysis so user has the option to click "Load Analysis Gaps", without auto-filling
  useEffect(() => {
    // 1. First check local session for recent analyzer evaluation result
    try {
      const storedAnalyzer = sessionStorage.getItem('resume_analyzer_result');
      if (storedAnalyzer) {
        const parsed = JSON.parse(storedAnalyzer);
        const cleanRole = normalizeIncomingRole(parsed?.targetRole || parsed?.role);
        const cleanSkills = normalizeIncomingSkills(parsed?.missingKeywords);
        if (cleanSkills) {
          setRecentAnalysis({
            ...parsed,
            missingKeywords: cleanSkills.split(', '),
            detectedRole: cleanRole
          });
          return;
        }
      }
      const analyzerCtx = sessionStorage.getItem('learning_path_analyzer_context');
      if (analyzerCtx) {
        const parsed = JSON.parse(analyzerCtx);
        const cleanRole = normalizeIncomingRole(parsed?.targetRole);
        const cleanSkills = normalizeIncomingSkills(parsed?.missingSkills || parsed?.targetSkills);
        if (cleanSkills) {
          setRecentAnalysis({
            missingKeywords: cleanSkills.split(', '),
            detectedRole: cleanRole
          });
          return;
        }
      }
    } catch (e) {}

    if (!user?.uid) return;
    const fetchRecentAnalysis = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'resumes'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docItem = snapshot.docs[0];
          const data = docItem.data();

          // If legacy demo resume, delete and ignore
          if (isDemoRole(data.jobDesc) || isDemoRole(data.targetRole) || isDemoSkills(data.analysis?.missingKeywords)) {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'resumes', docItem.id));
            } catch (err) {}
            return;
          }

          if (data.analysis && data.analysis.missingKeywords && !isDemoSkills(data.analysis.missingKeywords)) {
            const detectedRole = data.jobDesc ? getJobTitle(data.jobDesc) : (data.targetRole || '');
            
            // Only suggest analysis if it matches the current active job strictly (by company or exact role)
            if (currentActiveJob) {
              const matchesCompany = Boolean(
                currentActiveJob.company && 
                data.company && 
                data.company.toLowerCase().trim() === currentActiveJob.company.toLowerCase().trim()
              );
              const matchesExactRole = Boolean(
                detectedRole && 
                detectedRole.toLowerCase().trim() === currentActiveJob.title.toLowerCase().trim()
              );

              if (matchesCompany || matchesExactRole) {
                setRecentAnalysis({
                  ...data.analysis,
                  detectedRole
                });
              } else {
                setRecentAnalysis(null);
              }
            } else {
              setRecentAnalysis(null);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching recent analysis:', err);
      }
    };
    fetchRecentAnalysis();
  }, [user?.uid, currentActiveJob]);

  const generatePath = async () => {
    if (loading) return;
    if (!skillsStr.trim() || !targetRole.trim()) return;
    
    // Check access for learningPath (available for free users)
    const access = checkAccess('learningPath');
    if (!access.hasAccess) {
      openUpgradeModal('learningPath');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const missingSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateLearningPath(missingSkills, targetRole.trim());
      setRoadmap(result);

      // Persist real user learning path so legitimate work is saved
      if (user?.uid) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'learningPaths'), {
            targetRole: targetRole.trim(),
            skillsStr: skillsStr.trim(),
            roadmap: result,
            createdAt: new Date().toISOString()
          });
        } catch (saveErr) {
          console.warn('Error saving generated learning path:', saveErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate learning path:', err);
      setError(err?.message || 'Failed to generate 30-day learning roadmap. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Youtube className="w-4 h-4" />;
      case 'course': return <GraduationCap className="w-4 h-4" />;
      case 'book': return <BookOpen className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--hf-primary)]" />
          <p className="text-sm font-medium text-[var(--hf-text-secondary)]">Loading career roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* 1. Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-[var(--hf-ai-teal)]" aria-hidden="true">
              <Map className="w-4 h-4" />
            </div>
            <span className="hf-badge hf-badge-teal text-xs">
              Career advisor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight">
            Learning path
          </h1>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] font-normal leading-relaxed max-w-2xl mt-1.5">
            Turn skill and role alignment gaps into a structured, step-by-step career learning plan.
          </p>
        </div>
        {(targetRole || skillsStr || roadmap) && (
          <button
            onClick={handleResetLearningPath}
            className="hf-btn-ghost text-xs text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] border border-[var(--hf-border)] px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors self-start md:self-auto shrink-0 cursor-pointer"
            title="Reset role, skills, and roadmap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset path</span>
          </button>
        )}
      </div>

      {/* Active Job Context Banner */}
      {currentActiveJob && (currentActiveJob.source || !isDemoRole(currentActiveJob.title)) && !currentActiveJob.title?.toLowerCase().includes('sarvam') && !currentActiveJob.company?.toLowerCase().includes('sarvam') && !currentActiveJob.company?.toLowerCase().includes('target organization') && (
        <div className="mb-6 p-4 sm:p-5 rounded-xl bg-[var(--hf-surface)] border border-[var(--hf-border)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--hf-ai-teal)] shrink-0 mt-1.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="hf-badge hf-badge-teal text-[11px] py-0.5">
                  Active target job
                </span>
                {currentActiveJob.provider && (
                  <span className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded text-[11px] font-medium text-[var(--hf-text-secondary)]">
                    {currentActiveJob.provider}
                  </span>
                )}
                {currentActiveJob.isRemote && (
                  <span className="px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded text-[11px] font-medium text-[var(--hf-text-secondary)]">
                    Remote
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[var(--hf-text)] mt-1 truncate">
                {currentActiveJob.title}{' '}
                <span className="font-normal text-[var(--hf-text-secondary)]">
                  at {currentActiveJob.company}
                </span>
                {currentActiveJob.location && (
                  <span className="text-xs text-[var(--hf-text-muted)] font-normal ml-1.5">
                    ({currentActiveJob.location})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            {currentActiveJob.skills && currentActiveJob.skills.length > 0 && (
              <span className="text-xs text-[var(--hf-text-secondary)] bg-[var(--hf-surface-secondary)] px-2.5 py-1 rounded-md border border-[var(--hf-border)]">
                {currentActiveJob.skills.length} skills from job
              </span>
            )}
            {currentActiveJob.link && (
              <a
                href={currentActiveJob.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[var(--hf-primary)] hover:underline flex items-center gap-1"
              >
                <span>{currentActiveJob.provider ? `${currentActiveJob.provider} posting` : 'Job posting'}</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
            <button
              onClick={handleResetLearningPath}
              className="text-xs font-medium text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] transition-colors cursor-pointer"
            >
              Clear context
            </button>
          </div>
        </div>
      )}

      {/* 2. Target Input Section (Full width, placed at the top) */}
      <div className="hf-card p-6 sm:p-7 mb-8 w-full">
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--hf-text)]">
              Target role & skill targets
            </h2>
            <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-0.5">
              Configure the career role and specific competency gaps you want your 30-day curriculum to bridge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label 
                htmlFor="target-role-input"
                className="text-xs font-medium text-[var(--hf-text)] block"
              >
                Target role
              </label>
              <input 
                id="target-role-input"
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value);
                  userEditedRoleRef.current = true;
                }}
                className="hf-input w-full text-sm"
                placeholder="e.g. Senior Software Engineer"
              />
              <p className="text-xs text-[var(--hf-text-muted)]">
                Enter the position you are aiming for or currently interviewing toward.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label 
                  htmlFor="target-skills-input"
                  className="text-xs font-medium text-[var(--hf-text)] block"
                >
                  Target skills
                </label>
                <div className="flex items-center gap-2">
                  {currentActiveJob?.skills && currentActiveJob.skills.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setSkillsStr(currentActiveJob.skills.join(', '));
                        userEditedSkillsRef.current = false;
                      }}
                      className="text-xs font-medium text-[var(--hf-primary)] hover:underline cursor-pointer"
                    >
                      Reset to job skills
                    </button>
                  )}
                  {recentAnalysis && (
                    <button 
                      type="button"
                      onClick={() => {
                        if (recentAnalysis.missingKeywords) {
                          const clean = normalizeIncomingSkills(recentAnalysis.missingKeywords);
                          if (clean) {
                            setSkillsStr(clean);
                            userEditedSkillsRef.current = true;
                          }
                        }
                        if (recentAnalysis.detectedRole && !targetRole) {
                          const cleanRole = normalizeIncomingRole(recentAnalysis.detectedRole);
                          if (cleanRole) {
                            setTargetRole(cleanRole);
                            userEditedRoleRef.current = true;
                          }
                        }
                      }}
                      className="text-xs font-medium text-[var(--hf-ai-teal)] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Load analysis gaps
                    </button>
                  )}
                </div>
              </div>
              <textarea 
                id="target-skills-input"
                value={skillsStr}
                onChange={(e) => {
                  setSkillsStr(e.target.value);
                  userEditedSkillsRef.current = true;
                }}
                className="hf-input w-full h-28 sm:h-32 text-sm resize-none leading-relaxed"
                placeholder="Enter skills separated by commas (e.g. React, TypeScript, System Design, GraphQL)..."
              />
              <p className="text-xs text-[var(--hf-text-muted)]">
                Separate skills with commas. Focus on 3–6 key competencies for best results.
              </p>
            </div>
          </div>

          <button 
            onClick={generatePath}
            disabled={loading || !targetRole.trim() || !skillsStr.trim()}
            className="hf-btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
            <span>{loading ? 'Generating 30-day learning roadmap...' : 'Generate 30-day learning roadmap'}</span>
          </button>
        </div>
      </div>

      {/* 3. Complete Learning Roadmap (Full width) */}
      <div className="w-full">
        {error && !loading && (
          <div className="p-4 mb-6 rounded-lg bg-[var(--hf-error-bg)] border border-[var(--hf-error)]/30 text-[var(--hf-error)] text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
            <button
              onClick={generatePath}
              className="hf-btn-danger text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!roadmap && !loading ? (
            <EmptyState
              icon={GraduationCap}
              title="Create your personalized learning path"
              targetRole={targetRole || undefined}
              description="Enter your target role and skills above, or load missing keywords from your resume analysis, then generate a customized 30-day learning roadmap."
            />
          ) : loading ? (
            <AILoadingStepper 
              presetKey="learning_roadmap" 
              title="Generating 30-day learning roadmap" 
            />
          ) : (
            <motion.div 
              key="roadmap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Roadmap Header Card */}
              <div className="hf-card p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--hf-border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hf-badge hf-badge-teal text-xs">
                      {roadmapType === 'personalized' ? 'Personalized to skill gaps' : 'General skill roadmap'}
                    </span>
                    {targetRole && (
                      <span className="text-xs font-medium text-[var(--hf-text-secondary)]">
                        Target role: <strong className="font-semibold text-[var(--hf-text)]">{targetRole}</strong>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleResetLearningPath}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset path
                  </button>
                </div>

                <div className="pt-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--hf-text)] tracking-tight">
                    {roadmap?.roadmapTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] mt-1.5">
                    {roadmap?.sections?.length || 0} milestone {(roadmap?.sections?.length || 0) === 1 ? 'phase' : 'phases'} covering targeted skills and practical project milestones.
                  </p>
                </div>

                {/* AI Suggestions Guidance Note */}
                <div className="mt-5 flex items-start gap-2.5 p-3 rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface-secondary)] text-xs text-[var(--hf-text-secondary)]">
                  <AlertCircle className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0 mt-0.5" />
                  <span>AI-generated suggestions. Check that each link works and fits you before relying on it.</span>
                </div>
              </div>

              {/* Milestone Sequence */}
              <div className="space-y-6">
                {(roadmap?.sections || []).map((section, idx) => (
                  <div key={idx} className="relative pl-12 sm:pl-16">
                    {/* Vertical Connecting Line */}
                    {idx !== (roadmap?.sections?.length || 0) - 1 && (
                      <div 
                        className="absolute left-[19px] sm:left-[23px] top-12 bottom-0 w-px bg-[var(--hf-border)]" 
                        aria-hidden="true"
                      />
                    )}
                    
                    {/* Circle Node with Step Index */}
                    <div 
                      className="absolute left-0 top-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full border border-[var(--hf-border)] bg-[var(--hf-surface)] flex items-center justify-center font-bold text-sm sm:text-base text-[var(--hf-text)] shadow-xs z-10"
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </div>

                    <div className="hf-card p-5 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-[var(--hf-ai-teal)]">
                          Phase {idx + 1} of {roadmap?.sections?.length || 0}
                        </span>
                        <span className="text-xs text-[var(--hf-text-muted)] font-normal">
                          {section.resources?.length || 0} suggested {(section.resources?.length || 0) === 1 ? 'resource' : 'resources'}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-[var(--hf-text)] mb-3">
                        {section.title}
                      </h3>
                      
                      {section.skillsCovered?.length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs font-medium text-[var(--hf-text-muted)] mb-2">Skills covered</p>
                          <div className="flex flex-wrap gap-1.5">
                            {section.skillsCovered.map((skill, i) => (
                              <span 
                                key={i} 
                                className="px-2.5 py-1 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-md text-xs font-medium text-[var(--hf-text)]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested resources */}
                      {section.resources?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--hf-text)] mb-3">
                            Suggested resources
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {section.resources.map((resource, i) => {
                              const hasLink = Boolean(resource.link && resource.link.trim());
                              const cardContent = (
                                <div className="flex flex-col h-full justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                      <div className="p-1.5 rounded-md bg-[var(--hf-surface-secondary)] text-[var(--hf-ai-teal)]">
                                        {getIcon(resource.type)}
                                      </div>
                                      <span className="text-xs font-medium text-[var(--hf-text-muted)] truncate max-w-[150px]">
                                        {resource.platform || 'Online'}
                                      </span>
                                    </div>
                                    <h5 className="text-sm font-semibold text-[var(--hf-text)] group-hover:text-[var(--hf-primary)] transition-colors line-clamp-1 mb-1">
                                      {resource.name}
                                    </h5>
                                    {resource.description && (
                                      <p className="text-xs text-[var(--hf-text-secondary)] line-clamp-2 leading-relaxed">
                                        {resource.description}
                                      </p>
                                    )}
                                  </div>
                                  {hasLink && (
                                    <div className="mt-4 pt-3 border-t border-[var(--hf-border)] flex items-center justify-between text-xs font-medium text-[var(--hf-primary)]">
                                      <span>Open resource</span>
                                      <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                  )}
                                </div>
                              );

                              return hasLink ? (
                                <a 
                                  key={i} 
                                  href={resource.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group block p-4 sm:p-5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl hover:border-[var(--hf-border-hover)] hover:shadow-xs transition-all"
                                >
                                  {cardContent}
                                </a>
                              ) : (
                                <div 
                                  key={i} 
                                  className="p-4 sm:p-5 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl"
                                >
                                  {cardContent}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Journey Router Bridge */}
              {roadmap && (
                <div className="pt-4">
                  <NextStepBridgeCard
                    title="Learning roadmap generated"
                    contextData={`30-day curriculum tailored for "${targetRole || 'Target Role'}". Mapped ${roadmap.sections.length} core milestone modules covering ${roadmap.sections.flatMap(s => s.skillsCovered).slice(0, 4).join(', ')}.`}
                    primaryStep={{
                      label: "Practice in interview simulator",
                      icon: MessageSquare,
                      to: "/interview",
                      state: {
                        role: targetRole || "Software Engineer",
                        jobDescription: `Target Position: ${targetRole || 'Software Engineer'}\nSkills & Core Focus: ${skillsStr || 'Technical systems, architecture, and problem solving'}`
                      }
                    }}
                    secondaryStep={{
                      label: "Search matched job openings",
                      icon: Search,
                      to: "/jobs",
                      state: {
                        role: targetRole || "Software Engineer",
                        autoSearch: true
                      }
                    }}
                  />
                </div>
              )}

              {/* Plain Roadmap Footnote */}
              <div className="text-center py-6 border-t border-[var(--hf-border)]">
                <p className="text-xs text-[var(--hf-text-muted)]">
                  {roadmap?.roadmapTitle} · Target role: {targetRole || 'Target role'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
