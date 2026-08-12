import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface ResumeContext {
  id?: string;
  targetRole?: string;
  score?: number;
  missingKeywords?: string[];
  keywordsFound?: string[];
  content?: string;
  createdAt?: any;
}

export interface TrackedJobContext {
  id: string;
  company: string;
  role: string;
  status: string;
  matchScore?: number;
  notes?: string;
}

export interface ContactContext {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
}

export interface RoadmapContext {
  id?: string;
  targetRole?: string;
  missingSkills?: string[];
  createdAt?: any;
}

export interface SmartSuggestionChip {
  id: string;
  sourceModule: string;
  label: string;
  value: string;
  type: 'role' | 'skill' | 'company' | 'description' | 'action';
  extraData?: any;
}

interface SystemOSContextType {
  latestResume: ResumeContext | null;
  trackedJobs: TrackedJobContext[];
  outreachContacts: ContactContext[];
  latestRoadmap: RoadmapContext | null;
  activeTargetRole: string;
  allMissingSkills: string[];
  interviewingCompanies: string[];
  smartSuggestions: SmartSuggestionChip[];
  loadingSystemContext: boolean;
  refreshSystemContext: () => Promise<void>;
}

const SystemOSContext = createContext<SystemOSContextType>({
  latestResume: null,
  trackedJobs: [],
  outreachContacts: [],
  latestRoadmap: null,
  activeTargetRole: 'Software Engineer',
  allMissingSkills: [],
  interviewingCompanies: [],
  smartSuggestions: [],
  loadingSystemContext: true,
  refreshSystemContext: async () => {},
});

export const SystemOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [latestResume, setLatestResume] = useState<ResumeContext | null>(null);
  const [trackedJobs, setTrackedJobs] = useState<TrackedJobContext[]>([]);
  const [outreachContacts, setOutreachContacts] = useState<ContactContext[]>([]);
  const [latestRoadmap, setLatestRoadmap] = useState<RoadmapContext | null>(null);
  const [loadingSystemContext, setLoadingSystemContext] = useState<boolean>(true);

  const fetchSystemContext = async () => {
    if (!user) {
      setLatestResume(null);
      setTrackedJobs([]);
      setOutreachContacts([]);
      setLatestRoadmap(null);
      setLoadingSystemContext(false);
      return;
    }

    try {
      // 1. Fetch Latest Evaluated Resume
      const resumeQ = query(
        collection(db, 'users', user.uid, 'resumes'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const resumeSnap = await getDocs(resumeQ);
      if (!resumeSnap.empty) {
        const d = resumeSnap.docs[0].data();
        setLatestResume({
          id: resumeSnap.docs[0].id,
          targetRole: d.targetRole || d.title || 'Software Engineer',
          score: d.score || d.atsScore || 78,
          missingKeywords: d.missingKeywords || d.missingSkills || [],
          keywordsFound: d.keywordsFound || [],
          content: d.content || d.resumeText || '',
          createdAt: d.createdAt
        });
      }

      // 2. Fetch Tracked Job Applications
      const jobsQ = query(
        collection(db, 'users', user.uid, 'jobs'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const jobsSnap = await getDocs(jobsQ);
      const fetchedJobs: TrackedJobContext[] = jobsSnap.docs.map(doc => ({
        id: doc.id,
        company: doc.data().company || '',
        role: doc.data().role || '',
        status: doc.data().status || 'Applied',
        matchScore: doc.data().matchScore,
        notes: doc.data().notes
      }));
      setTrackedJobs(fetchedJobs);

      // 3. Fetch Outreach Contacts
      const contactsQ = query(
        collection(db, 'users', user.uid, 'contacts'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const contactsSnap = await getDocs(contactsQ);
      const fetchedContacts: ContactContext[] = contactsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        company: doc.data().company || '',
        role: doc.data().role || '',
        email: doc.data().email || ''
      }));
      setOutreachContacts(fetchedContacts);

      // 4. Fetch Latest Learning Roadmap
      const roadmapQ = query(
        collection(db, 'users', user.uid, 'learningPaths'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const roadmapSnap = await getDocs(roadmapQ);
      if (!roadmapSnap.empty) {
        const rd = roadmapSnap.docs[0].data();
        setLatestRoadmap({
          id: roadmapSnap.docs[0].id,
          targetRole: rd.targetRole,
          missingSkills: rd.skillsStr ? rd.skillsStr.split(',').map((s: string) => s.trim()) : [],
          createdAt: rd.createdAt
        });
      }
    } catch (err) {
      console.warn("SystemOSContext fetch error:", err);
    } finally {
      setLoadingSystemContext(false);
    }
  };

  useEffect(() => {
    fetchSystemContext();
  }, [user]);

  // Derived properties
  const activeTargetRole = 
    latestResume?.targetRole || 
    (trackedJobs.length > 0 ? trackedJobs[0].role : '') || 
    latestRoadmap?.targetRole || 
    'Full Stack Engineer';

  const allMissingSkills = Array.from(new Set([
    ...(latestResume?.missingKeywords || []),
    ...(latestRoadmap?.missingSkills || [])
  ])).filter(Boolean);

  const interviewingCompanies = Array.from(new Set(
    trackedJobs
      .filter(j => j.status === 'Interviewing' || j.status === 'Applied')
      .map(j => j.company)
  )).filter(Boolean);

  // Generate dynamic Cross-Module Smart Suggestion Chips
  const smartSuggestions: SmartSuggestionChip[] = [];

  if (activeTargetRole) {
    smartSuggestions.push({
      id: 'target_role_chip',
      sourceModule: latestResume ? 'Master Resume' : 'Tracked Application',
      label: `Role: ${activeTargetRole}`,
      value: activeTargetRole,
      type: 'role'
    });
  }

  allMissingSkills.slice(0, 4).forEach((skill, idx) => {
    smartSuggestions.push({
      id: `missing_skill_${idx}`,
      sourceModule: 'Resume Gap Audit',
      label: `Gap: ${skill}`,
      value: skill,
      type: 'skill'
    });
  });

  trackedJobs.slice(0, 3).forEach((job) => {
    smartSuggestions.push({
      id: `tracked_job_${job.id}`,
      sourceModule: `Job Tracker (${job.status})`,
      label: `${job.company} - ${job.role}`,
      value: `${job.role} at ${job.company}`,
      type: 'company',
      extraData: job
    });
  });

  return (
    <SystemOSContext.Provider
      value={{
        latestResume,
        trackedJobs,
        outreachContacts,
        latestRoadmap,
        activeTargetRole,
        allMissingSkills,
        interviewingCompanies,
        smartSuggestions,
        loadingSystemContext,
        refreshSystemContext: fetchSystemContext
      }}
    >
      {children}
    </SystemOSContext.Provider>
  );
};

export const useSystemOS = () => useContext(SystemOSContext);
