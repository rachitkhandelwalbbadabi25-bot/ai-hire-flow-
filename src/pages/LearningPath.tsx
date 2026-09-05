import { useState, useEffect } from 'react';
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
  MessageSquare
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

export default function LearningPath() {
  const { user } = useAuth();
  if (!user) return null;
  const { plan, checkAccess, openUpgradeModal, deductCredit } = usePlan();
  const location = useLocation();

  // Learning Path inputs MUST start completely empty for fresh users. No demo careers.
  const [targetRole, setTargetRole] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [roadmapType, setRoadmapType] = useState<'personalized' | 'general'>('personalized');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [recentAnalysis, setRecentAnalysis] = useState<any>(null);

  const isFree = plan === 'free';
  const isPersonalized = roadmapType === 'personalized';

  const getJobTitle = (fullDesc: string) => {
    if (!fullDesc) return '';
    const firstLine = fullDesc.split('\n')[0].trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 50) + '...';
    }
    return firstLine;
  };

  // Only populate from navigation state if explicitly provided and not demo data
  useEffect(() => {
    if (location.state?.missingSkills && !isDemoSkills(location.state.missingSkills)) {
      setSkillsStr(location.state.missingSkills.join(', '));
    }
    if (location.state?.targetRole && !isDemoRole(location.state.targetRole)) {
      setTargetRole(location.state.targetRole);
    }
  }, [location.state]);

  // Load any previously saved REAL user learning path from Firestore
  useEffect(() => {
    const fetchSavedLearningPath = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'learningPaths'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docItem = snapshot.docs[0];
          const data = docItem.data();

          // If legacy demo data ("AI Engineer at Glean", etc.), delete and ignore
          if (isDemoRole(data.targetRole) || isDemoSkills(data.skillsStr)) {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'learningPaths', docItem.id));
            } catch (err) {}
            return;
          }

          // Real user-created roadmap
          if (data.roadmap) {
            setRoadmap(data.roadmap);
            if (!targetRole && data.targetRole) setTargetRole(data.targetRole);
            if (!skillsStr && data.skillsStr) setSkillsStr(data.skillsStr);
          }
        }
      } catch (err) {
        console.warn('Error checking saved learning paths:', err);
      }
    };

    fetchSavedLearningPath();
  }, [user.uid]);

  // Check recent analysis so user has the option to click "Load Analysis Gaps", without auto-filling
  useEffect(() => {
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
            setRecentAnalysis({
              ...data.analysis,
              detectedRole: data.jobDesc ? getJobTitle(data.jobDesc) : ''
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching recent analysis:', err);
      }
    };
    fetchRecentAnalysis();
  }, [user.uid]);

  const generatePath = async () => {
    if (!skillsStr.trim() || !targetRole.trim()) return;
    
    // Check credits for careerRoadmap
    const access = checkAccess('careerRoadmap');
    if (!access.hasAccess) {
      openUpgradeModal('careerRoadmap');
      return;
    }

    setLoading(true);
    try {
      await deductCredit('careerRoadmap');
      const missingSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateLearningPath(missingSkills, targetRole);
      setRoadmap(result);

      // Persist real user learning path so legitimate work is saved
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
    } catch (error) {
      console.error('Failed to generate learning path:', error);
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

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <div className="mb-12">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Config */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-2xl sticky top-24">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Target Role</label>
                <input 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block px-1">Target Skills</label>
                  {recentAnalysis && (
                    <button 
                      onClick={() => {
                        if (recentAnalysis.missingKeywords) {
                          setSkillsStr(recentAnalysis.missingKeywords.join(', '));
                        }
                        if (recentAnalysis.detectedRole && !targetRole) {
                          setTargetRole(recentAnalysis.detectedRole);
                        }
                      }}
                      className="text-[9px] font-bold text-accent uppercase tracking-tighter hover:underline cursor-pointer"
                    >
                      Load Analysis Gaps
                    </button>
                  )}
                </div>
                <textarea 
                  value={skillsStr}
                  disabled={isFree}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed disabled:opacity-50"
                  placeholder={!isFree ? "Enter skills separated by commas (e.g. React, TypeScript, GraphQL)..." : "Upgrade plan to unlock customized roadmaps."}
                />
              </div>

              {isFree && (
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl text-center space-y-3 shadow-sm">
                  <p className="text-[10px] font-bold text-ink uppercase tracking-wider">Roadmap Generation Locked</p>
                  <button 
                    onClick={() => openUpgradeModal('learningPath')}
                    className="block w-full text-[9px] font-bold text-white bg-accent py-3 rounded-xl uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              )}

              <button 
                onClick={generatePath}
                disabled={loading || !targetRole.trim() || !skillsStr.trim() || isFree}
                className="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating Learning Path...' : 'Generate Learning Path'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Roadmap */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!roadmap && !loading ? (
              <EmptyState
                icon={GraduationCap}
                title="Create your personalized learning path"
                targetRole={targetRole || "Engineering & Tech"}
                description="Generate a customized 30-day skill roadmap with key topics, project ideas, and documentation to prepare for your target role."
                benefitMetric="Following a structured learning plan reduces interview prep time by 4 weeks"
                primaryAction={{
                  label: "Generate frontend roadmap",
                  onClick: () => {
                    setTargetRole('Frontend Engineer');
                    setSkillsStr('React, TypeScript, Next.js, Tailwind CSS');
                  },
                  icon: Sparkles
                }}
                secondaryAction={{
                  label: "Generate full stack roadmap",
                  onClick: () => {
                    setTargetRole('Full Stack Engineer');
                    setSkillsStr('Node.js, PostgreSQL, System Design, GraphQL');
                  },
                  icon: Map
                }}
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
                <div className="bg-accent/10 border border-accent/20 p-8 rounded-[3rem] text-center mb-8">
                   <h2 className="text-2xl font-black text-ink uppercase tracking-tight mb-2">{roadmap.roadmapTitle}</h2>
                   <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-accent uppercase tracking-[0.2em]">
                      <Zap className="w-3 h-3" /> Accelerated {roadmapType} Learning Protocol
                   </div>
                </div>

                {(roadmap?.sections || []).map((section, idx) => (
                  <div key={idx} className="relative pl-12 group">
                    {/* Vertical Line */}
                    {idx !== roadmap.sections.length - 1 && (
                      <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-border group-hover:bg-accent/30 transition-colors" />
                    )}
                    
                    {/* Circle Node */}
                    <div className="absolute left-0 top-0 w-12 h-12 bg-surface border-2 border-accent rounded-full flex items-center justify-center font-bold text-accent text-sm shadow-lg shadow-accent/10 relative z-10">
                      {idx + 1}
                    </div>

                    <div className="bg-surface border border-border rounded-[2rem] p-8 hover:border-accent/40 transition-all shadow-sm">
                      <h3 className="text-xl font-bold text-ink mb-4">{section.title}</h3>
                      
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
                            className="p-4 bg-background border border-border rounded-2xl hover:border-accent/40 transition-all group/res flex flex-col justify-between"
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

                {roadmap && (
                  <NextStepBridgeCard
                    title="Learning roadmap generated"
                    contextData={`30-day curriculum tailored for "${targetRole || 'Full Stack Engineer'}". Mapped ${roadmap.sections.length} core milestone modules covering ${roadmap.sections.flatMap(s => s.skillsCovered).slice(0, 4).join(', ')}.`}
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
                )}

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
