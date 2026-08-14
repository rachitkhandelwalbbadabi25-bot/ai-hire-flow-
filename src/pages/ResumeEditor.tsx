import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileEdit, 
  Sparkles, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Wand2, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  BrainCircuit, 
  AlertCircle, 
  Briefcase,
  Search, 
  FileText
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { refactorResumeText, improveBulletPointWithAI } from '../lib/gemini';
import { cn } from '../lib/utils';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AIWritingAssistantModal from '../components/AIWritingAssistantModal';
import { BulletImprovementResult } from '../types/aiWritingAssistant';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';

interface ResumeData {
  summary: string;
  experience: {
    id: string;
    company: string;
    role: string;
    period: string;
    bullets: string[];
    isExpanded?: boolean;
  }[];
  skills: string[];
}

interface ActiveAssistantTarget {
  expId?: string;
  bulletIdx?: number;
  type: 'bullet' | 'summary';
  originalText: string;
  roleContext?: string;
  companyContext?: string;
}

export default function ResumeEditor() {
  const { user, plan } = useAuth();
  const { checkAccess, openUpgradeModal } = usePlan();
  
  const { hasAccess: isUnlocked } = checkAccess('resumeEditor');
  const canRefactor = plan === 'premium' || plan === 'admin';
  
  const [data, setData] = useState<ResumeData>({
    summary: '',
    experience: [],
    skills: []
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refactoringId, setRefactoringId] = useState<string | null>(null);

  // AI Writing Assistant Modal State
  const [activeAssistantTarget, setActiveAssistantTarget] = useState<ActiveAssistantTarget | null>(null);
  const [assistantResult, setAssistantResult] = useState<BulletImprovementResult | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  useEffect(() => {
    const fetchMasterResume = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'config', 'masterResume');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data() as ResumeData);
        }
      } catch (error) {
        console.error("Error fetching master resume:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMasterResume();
  }, [user.uid]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'masterResume'), data);
    } catch (error) {
      console.error("Error saving resume:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addExperience = () => {
    const newExp = {
      id: crypto.randomUUID(),
      company: '',
      role: '',
      period: '',
      bullets: [''],
      isExpanded: true
    };
    setData(prev => ({ ...prev, experience: [newExp, ...prev.experience] }));
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id: string) => {
    setData(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
  };

  const handleOpenWritingAssistant = async (
    text: string, 
    type: 'bullet' | 'summary', 
    expId?: string, 
    bulletIdx?: number, 
    roleContext?: string, 
    companyContext?: string
  ) => {
    if (!text.trim()) {
      text = type === 'summary' ? 'Experienced software engineer delivering scalable applications.' : 'Engineered microservices and user interfaces.';
    }

    const target: ActiveAssistantTarget = {
      expId,
      bulletIdx,
      type,
      originalText: text,
      roleContext,
      companyContext
    };

    setActiveAssistantTarget(target);
    setIsAssistantLoading(true);
    setAssistantResult(null);

    try {
      const result = await improveBulletPointWithAI(text, roleContext, companyContext);
      setAssistantResult(result);
    } catch (error) {
      console.error("Failed to generate AI writing suggestions:", error);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const handleApplyAssistantRewrite = (appliedText: string) => {
    if (!activeAssistantTarget) return;

    const { type, expId, bulletIdx } = activeAssistantTarget;

    if (type === 'summary') {
      setData(prev => ({ ...prev, summary: appliedText }));
    } else if (expId !== undefined && bulletIdx !== undefined) {
      setData(prev => ({
        ...prev,
        experience: prev.experience.map(exp => {
          if (exp.id === expId) {
            const newBullets = [...exp.bullets];
            newBullets[bulletIdx] = appliedText;
            return { ...exp, bullets: newBullets };
          }
          return exp;
        })
      }));
    }

    setActiveAssistantTarget(null);
    setAssistantResult(null);
  };

  const handleRegenerateAssistant = async () => {
    if (!activeAssistantTarget) return;
    setIsAssistantLoading(true);
    try {
      const result = await improveBulletPointWithAI(
        activeAssistantTarget.originalText,
        activeAssistantTarget.roleContext,
        activeAssistantTarget.companyContext
      );
      setAssistantResult(result);
    } catch (error) {
      console.error("Failed to regenerate AI suggestions:", error);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-32 relative">
      {!isUnlocked && (
        <div className="absolute inset-0 z-[50] bg-background/40 backdrop-blur-md rounded-[3rem] flex flex-col items-center justify-center text-center p-8">
           <div className="bg-surface p-12 rounded-[3.5rem] border border-border shadow-2xl max-w-lg">
              <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-accent/20">
                 <Wand2 className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-3xl font-bold text-ink uppercase tracking-tight mb-4">Master Editor Restricted</h2>
              <p className="text-ink-dim text-sm mb-10 leading-relaxed">
                Unlock the AI Resume Editor to sync your master resume across all application areas. Standard tier access required.
              </p>
              <button 
                onClick={() => openUpgradeModal('resumeEditor')}
                className="w-full bg-accent text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-accent/40 hover:opacity-90 transition-all"
              >
                Upgrade Now
              </button>
           </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <FileEdit className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Master Resume</span>
          </div>
          <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-2">Resume Editor</h1>
          <p className="text-ink-dim font-medium text-lg">
            Refine your experience with real-time AI assistance & XYZ impact formula.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-accent/40 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Syncing...' : 'Save Resume'}
        </button>
      </div>

      <div className="space-y-12">
        {/* Professional Summary */}
        <section className="bg-surface p-10 rounded-[3rem] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
              <BrainCircuit className="w-4 h-4 text-accent" /> Professional Summary
            </h3>
            <button
              onClick={() => handleOpenWritingAssistant(data.summary, 'summary', undefined, undefined, data.experience[0]?.role, data.experience[0]?.company)}
              className="group flex items-center gap-2 text-xs font-mono font-bold text-accent uppercase tracking-wider bg-accent/10 hover:bg-accent/20 px-3.5 py-1.5 rounded-xl border border-accent/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Improve with AI</span>
            </button>
          </div>
          <div className="relative group/summary-box">
            <textarea
              value={data.summary}
              onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Introduce your background and high-impact competencies..."
              className="w-full h-40 p-6 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed font-sans"
            />
          </div>
        </section>

        {/* Experience Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <div>
              <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                <Briefcase className="w-4 h-4 text-accent" /> Work Experience
              </h3>
              <p className="text-[11px] text-ink-dim font-mono mt-0.5">
                Bullet points use Google's XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].
              </p>
            </div>
            <button
              onClick={addExperience}
              className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-4 py-2 rounded-xl hover:bg-accent/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {data.experience.map((exp) => (
                <motion.div
                  key={exp.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface border border-border rounded-[2.5rem] overflow-hidden"
                >
                  <div 
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-light/30 transition-colors"
                    onClick={() => updateExperience(exp.id, 'isExpanded', !exp.isExpanded)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center border border-border">
                        <Briefcase className="w-5 h-5 text-ink-dim" />
                      </div>
                      <div>
                        <h4 className="font-bold text-ink">{exp.company || 'New Entry'}</h4>
                        <p className="text-xs text-ink-dim uppercase tracking-widest font-bold font-mono">{exp.role || 'Role Specification'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); removeExperience(exp.id); }}
                        className="p-2 text-ink-dim hover:text-rose-500 transition-colors mr-2 cursor-pointer"
                        title="Delete Experience"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       {exp.isExpanded ? <ChevronUp className="w-5 h-5 text-ink-dim" /> : <ChevronDown className="w-5 h-5 text-ink-dim" />}
                    </div>
                  </div>

                  {exp.isExpanded && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      className="px-8 pb-8 space-y-6 border-t border-border mt-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                         <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">ENTITY / COMPANY</label>
                            <input 
                              value={exp.company}
                              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              placeholder="e.g. Acme Corp"
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">ROLE / TITLE</label>
                            <input 
                              value={exp.role}
                              onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                              placeholder="e.g. Senior Frontend Engineer"
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-2 block px-1">PERIOD</label>
                            <input 
                              value={exp.period}
                              onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                              placeholder="e.g. 2022 - Present"
                            />
                         </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block px-1">
                            Impact Bullet Points (XYZ Formula)
                          </label>
                          <button 
                            onClick={() => updateExperience(exp.id, 'bullets', [...exp.bullets, ''])}
                            className="text-[9px] font-bold text-accent uppercase tracking-widest hover:underline cursor-pointer"
                          >
                            + Add Bullet
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(exp?.bullets || []).map((bullet, bIdx) => (
                            <div key={bIdx} className="bg-background/50 border border-border/80 rounded-2xl p-3.5 space-y-2.5 transition-all hover:border-accent/30">
                              <textarea
                                value={bullet}
                                onChange={(e) => {
                                  const newBullets = [...exp.bullets];
                                  newBullets[bIdx] = e.target.value;
                                  updateExperience(exp.id, 'bullets', newBullets);
                                }}
                                className="w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none font-sans leading-relaxed"
                                rows={2}
                                placeholder="Accomplished [X] as measured by [Y] by doing [Z]..."
                              />

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenWritingAssistant(bullet, 'bullet', exp.id, bIdx, exp.role, exp.company)}
                                  className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                  <span>Improve with AI</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const newBullets = exp.bullets.filter((_, i) => i !== bIdx);
                                    updateExperience(exp.id, 'bullets', newBullets);
                                  }}
                                  className="p-1.5 text-ink-dim hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Delete Bullet"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Skills Section */}
        <section className="bg-surface p-10 rounded-[3rem] border border-border shadow-sm">
          <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em] mb-8">
            <CheckCircle2 className="w-4 h-4 text-accent" /> Skillset Taxonomy
          </h3>
          <div className="space-y-6">
            <div className="flex gap-2">
              <input 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !data.skills.includes(val)) {
                      setData(prev => ({ ...prev, skills: [...prev.skills, val] }));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                placeholder="Type skill and press Enter..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(data?.skills || []).map((skill, i) => (
                <span key={i} className="group relative bg-background border border-border px-4 py-2 rounded-xl text-xs font-bold text-ink-dim flex items-center gap-2">
                  {skill}
                  <button 
                    onClick={() => setData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))}
                    className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>

        <NextStepBridgeCard
          title="Master resume calibrated"
          contextData={`Updated profile for ${data?.experience?.[0]?.role || 'Software Engineer'} with ${data?.skills?.length || 0} core competencies and ${(data?.experience || []).length} professional experience entries.`}
          primaryStep={{
            label: "Audit ATS score in analyzer",
            icon: FileText,
            to: "/analyzer",
            state: {
              targetRole: data?.experience?.[0]?.role || "Software Engineer",
              jobDescription: `Target Position: ${data?.experience?.[0]?.role || 'Software Engineer'}\nSkills: ${(data?.skills || []).join(', ')}`
            }
          }}
          secondaryStep={{
            label: "Search matched jobs",
            icon: Search,
            to: "/jobs",
            state: {
              role: data?.experience?.[0]?.role || "Software Engineer",
              autoSearch: true
            }
          }}
        />
      </div>

      {/* Floating Status Bar */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 bg-surface border border-border p-4 rounded-3xl shadow-2xl flex items-center gap-6">
         <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className="w-4 h-4 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-bold text-ink uppercase tracking-widest">Master Resume v1.0</span>
         </div>
         <div className="flex items-center gap-6 pr-4">
            <div className="flex flex-col">
               <span className="text-[9px] font-bold text-ink-dim uppercase">Tokens</span>
               <span className="text-xs font-bold text-ink">{(data?.experience || []).reduce((acc, curr) => acc + (curr.bullets?.length || 0), 0)}</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-bold text-ink-dim uppercase">Skills</span>
               <span className="text-xs font-bold text-ink">{data.skills.length}</span>
            </div>
         </div>
      </div>

      {/* AI WRITING ASSISTANT MODAL (XYZ Formula Engine) */}
      <AIWritingAssistantModal
        isOpen={!!activeAssistantTarget}
        onClose={() => {
          setActiveAssistantTarget(null);
          setAssistantResult(null);
        }}
        originalText={activeAssistantTarget?.originalText || ''}
        roleContext={activeAssistantTarget?.roleContext}
        companyContext={activeAssistantTarget?.companyContext}
        result={assistantResult}
        isLoading={isAssistantLoading}
        onRegenerate={handleRegenerateAssistant}
        onApply={handleApplyAssistantRewrite}
      />
    </div>
  );
}

