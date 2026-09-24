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
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Initializing Learning Path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <Map className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Learning Roadmap</span>
          </div>
          <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">Learning Path</h1>
          <p className="text-ink-dim font-medium text-lg max-w-2xl">
            Convert alignment gaps into strategic growth trajectories using validated career requirements.
          </p>
        </div>
        {(targetRole || skillsStr || roadmap) && (
          <button
            onClick={handleResetLearningPath}
            className="px-3.5 py-2.5 bg-surface hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-ink-dim hover:text-rose-400 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all self-start md:self-auto shrink-0 cursor-pointer shadow-sm"
            title="Explicitly reset learning path state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Path</span>
          </button>
        )}
      </div>

      {/* Active Job Context Banner */}
      {currentActiveJob && (currentActiveJob.source || !isDemoRole(currentActiveJob.title)) && !currentActiveJob.title?.toLowerCase().includes('sarvam') && !currentActiveJob.company?.toLowerCase().includes('sarvam') && !currentActiveJob.company?.toLowerCase().includes('target organization') && (
        <div className="mb-6 p-4 rounded-2xl bg-accent/10 border border-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse mt-1 sm:mt-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Active Selected Real Job</p>
                {currentActiveJob.provider && (
                  <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md text-[9px] font-mono font-bold text-accent">
                    {currentActiveJob.provider}
                  </span>
                )}
                {currentActiveJob.isRemote && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[9px] font-mono font-bold text-emerald-400">
                    Verified Remote
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-ink mt-0.5">
                {currentActiveJob.title} <span className="text-ink-dim font-normal">at {currentActiveJob.company}</span>
                {currentActiveJob.location && (
                  <span className="text-xs text-ink-dim font-normal ml-2">({currentActiveJob.location})</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            {currentActiveJob.skills && currentActiveJob.skills.length > 0 && (
              <span className="text-[10px] font-bold bg-surface px-2.5 py-1 rounded-full text-ink-dim border border-border">
                {currentActiveJob.skills.length} skills from job
              </span>
            )}
            {currentActiveJob.link && (
              <a
                href={currentActiveJob.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider font-mono"
              >
                Official Posting <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={handleResetLearningPath}
              className="text-[10px] font-bold text-ink-dim hover:text-rose-400 uppercase tracking-wider transition-colors cursor-pointer"
            >
              Clear Job Context
            </button>
          </div>
        </div>
      )}

      {/* 2. Target Input Section (Full width, placed at the top) */}
      <div className="bg-surface p-6 sm:p-8 rounded-[2rem] border border-border shadow-2xl mb-10 w-full">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Target Role</label>
                <input 
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    userEditedRoleRef.current = true;
                  }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block px-1">Target Skills</label>
                <div className="flex items-center gap-3">
                  {currentActiveJob?.skills && currentActiveJob.skills.length > 0 && (
                    <button 
                      onClick={() => {
                        setSkillsStr(currentActiveJob.skills.join(', '));
                        userEditedSkillsRef.current = false;
                      }}
                      className="text-[9px] font-bold text-accent uppercase tracking-tighter hover:underline cursor-pointer"
                    >
                      Reset to Job Skills
                    </button>
                  )}
                  {recentAnalysis && (
                    <button 
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
                      className="text-[9px] font-bold text-accent uppercase tracking-tighter hover:underline cursor-pointer"
                    >
                      Load Analysis Gaps
                    </button>
                  )}
                </div>
              </div>
              <textarea 
                value={skillsStr}
                onChange={(e) => {
                  setSkillsStr(e.target.value);
                  userEditedSkillsRef.current = true;
                }}
                className="w-full h-28 sm:h-32 px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed"
                placeholder="Enter skills separated by commas (e.g. React, TypeScript, GraphQL)..."
              />
            </div>
          </div>

          <button 
            onClick={generatePath}
            disabled={loading || !targetRole.trim() || !skillsStr.trim()}
            className="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating Learning Path...' : 'Generate Learning Path'}
          </button>
        </div>
      </div>

      {/* 3. Complete Learning Roadmap (Full width) */}
      <div className="w-full">
        {error && !loading && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={generatePath}
              className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-colors uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!roadmap && !loading ? (
            <EmptyState
              icon={GraduationCap}
              title="Create your personalized learning path"
              targetRole={targetRole || undefined}
              description="Enter your target role and skills above, or load missing keywords from your resume analysis, then generate a customized skill roadmap."
              benefitMetric="Following a structured learning plan reduces interview prep time by 4 weeks"
            />
          ) : loading ? (
            <AILoadingStepper 
              presetKey="learning_roadmap" 
              title="Curriculum Dependency & Skill Graph Engine" 
            />
          ) : (
            <motion.div 
              key="roadmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Roadmap Header */}
              <div className="bg-accent/10 border border-accent/20 p-8 rounded-[3rem] text-center mb-8 relative">
                 <div className="flex justify-end mb-2">
                   <button
                     onClick={handleResetLearningPath}
                     className="px-3 py-1.5 text-xs text-ink-dim hover:text-rose-400 font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                     Reset Learning Path
                   </button>
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-black text-ink uppercase tracking-tight mb-2">{roadmap.roadmapTitle}</h2>
                 <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-accent uppercase tracking-[0.2em]">
                    <Zap className="w-3 h-3" /> Accelerated {roadmapType} Learning Protocol
                 </div>
              </div>

              {/* Milestone Sequence */}
              {(roadmap?.sections || []).map((section, idx) => (
                <div key={idx} className="relative pl-14 sm:pl-16 group">
                  {/* Vertical Line */}
                  {idx !== roadmap.sections.length - 1 && (
                    <div className="absolute left-[27px] top-14 bottom-0 w-0.5 bg-border group-hover:bg-accent/30 transition-colors" />
                  )}
                  
                  {/* Circle Node */}
                  <div className="absolute left-0 top-0 w-14 h-14 bg-surface border-2 border-accent rounded-full flex items-center justify-center font-bold text-accent text-base shadow-lg shadow-accent/10 z-10">
                    {idx + 1}
                  </div>

                  <div className="bg-surface border border-border rounded-[2rem] p-6 sm:p-8 hover:border-accent/40 transition-all shadow-sm">
                    <h3 className="text-xl sm:text-2xl font-bold text-ink mb-4">{section.title}</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {section.skillsCovered.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-background border border-border rounded-lg text-[10px] font-bold text-ink-dim uppercase">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.resources.map((resource, i) => (
                        <a 
                          key={i} 
                          href={resource.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-5 bg-background border border-border rounded-2xl hover:border-accent/40 transition-all group/res flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-accent bg-accent/10 p-1.5 rounded-lg flex items-center justify-center">
                                {getIcon(resource.type)}
                              </div>
                              <span className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">{resource.platform}</span>
                            </div>
                            <h4 className="text-sm font-bold text-ink group-hover/res:text-accent transition-colors line-clamp-1 mb-1">{resource.name}</h4>
                            <p className="text-[11px] text-ink-dim line-clamp-2 leading-relaxed italic">"{resource.description}"</p>
                          </div>
                          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-tighter opacity-0 group-hover/res:opacity-100 transition-opacity">
                            Initialize Module <ArrowRight className="w-3 h-3" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* 4. AI Journey Router (Rendered at bottom after all milestones) */}
              {roadmap && (
                <div className="pt-6">
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

              {/* Verified & Calibrated Footer */}
              <div className="text-center py-6">
                 <div className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-full text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                    <ShieldCheckIcon className="w-4 h-4 text-success" /> Skill Path Verified & Calibrated
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
