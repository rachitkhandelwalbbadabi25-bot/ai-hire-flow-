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
  Zap
} from 'lucide-react';
import { generateLearningPath } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

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

interface Roadmap {
  roadmapTitle: string;
  sections: Section[];
}

interface LearningPathProps {
  user: User;
}

import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';

export default function LearningPath() {
  const { user } = useAuth();
  const { plan, checkAccess, openUpgradeModal } = usePlan();
  
  const { remaining: roadmapType } = checkAccess('learningPath'); // Basic, Full, Personalized
  const isFree = plan === 'free';
  const isPersonalized = roadmapType === 'personalized';

  const [targetRole, setTargetRole] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [recentAnalysis, setRecentAnalysis] = useState<any>(null);

  useEffect(() => {
    const fetchRecentAnalysis = async () => {
      const q = query(
        collection(db, 'users', user.uid, 'resumes'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.analysis && data.analysis.missingKeywords) {
          setRecentAnalysis(data.analysis);
          setSkillsStr(data.analysis.missingKeywords.join(', '));
        }
      }
    };
    fetchRecentAnalysis();
  }, [user.uid]);

  const generatePath = async () => {
    if (!skillsStr || !targetRole) return;
    setLoading(true);
    try {
      const missingSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateLearningPath(missingSkills, targetRole);
      setRoadmap(result);
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
          <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Neural Roadmap</span>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">Skill Acquisition Path</h1>
        <p className="text-ink-dim font-medium text-lg max-w-2xl">
          Convert alignment gaps into strategic growth trajectories using validated global intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Config */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-2xl sticky top-24">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-3 block px-1">Target Mission (Role)</label>
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
                      onClick={() => setSkillsStr(recentAnalysis.missingKeywords.join(', '))}
                      className="text-[9px] font-bold text-accent uppercase tracking-tighter hover:underline"
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
                  placeholder={!isFree ? "Enter skills separated by commas..." : "Premium trajectory mapping locked."}
                />
              </div>

              {isFree && (
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl text-center space-y-3 shadow-sm">
                  <p className="text-[10px] font-bold text-ink uppercase tracking-wider">Complex Roadmap Generation Locked</p>
                  <button 
                    onClick={() => openUpgradeModal('learningPath')}
                    className="block w-full text-[9px] font-bold text-white bg-accent py-3 rounded-xl uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              )}

              <button 
                onClick={generatePath}
                disabled={loading || !targetRole || !skillsStr || isFree}
                className="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/40 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Synthesizing Roadmap...' : 'Generate Neural Path'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Roadmap */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!roadmap && !loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface/50 border-2 border-dashed border-border rounded-[3rem] p-12 text-center"
              >
                <div className="bg-surface w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                  <Search className="w-8 h-8 text-ink-dim" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2 uppercase tracking-tight">No Trajectory Initialized</h3>
                <p className="text-ink-dim text-sm max-w-sm mx-auto">
                  Enter your target role and the skills you wish to acquire to generate a verified learning roadmap.
                </p>
              </motion.div>
            ) : loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface p-8 rounded-[2rem] border border-border animate-pulse">
                    <div className="h-6 bg-surface-light rounded w-1/3 mb-6"></div>
                    <div className="space-y-4">
                      <div className="h-4 bg-surface-light rounded w-3/4"></div>
                      <div className="h-4 bg-surface-light rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
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

                <div className="text-center py-12">
                   <div className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-full text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                      <ShieldCheckIcon className="w-4 h-4 text-success" /> Trajectory Validated by Neural Intelligence
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
