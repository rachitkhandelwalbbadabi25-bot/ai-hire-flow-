import { useState, useEffect } from 'react';
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
  Briefcase,
  Search, 
  FileText,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { improveBulletPointWithAI } from '../lib/gemini';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AIWritingAssistantModal from '../components/AIWritingAssistantModal';
import { BulletImprovementResult } from '../types/aiWritingAssistant';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  period: string;
  bullets: string[];
  isExpanded?: boolean;
}

interface ResumeData {
  summary: string;
  experience: ExperienceEntry[];
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

const DEMO_RESUME_DATA: ResumeData = {
  summary: "Results-driven Full-Stack Engineer with 5+ years of experience designing, scaling, and maintaining high-traffic web applications in React, TypeScript, Node.js, and Cloud Infrastructure (AWS/GCP). Proven track record of reducing page load latency by 42% and architecting microservices handling 2M+ daily active API requests.",
  experience: [
    {
      id: 'exp_1',
      company: 'CloudScale Technologies',
      role: 'Senior Software Engineer',
      period: 'March 2022 – Present',
      bullets: [
        'Architected a real-time data dashboard using React, TypeScript, and WebSockets, reducing customer query latency by 42% for 50,000+ enterprise users.',
        'Led the migration from a monolithic backend to Node.js / Docker microservices, increasing platform uptime to 99.98%.',
        'Engineered an automated CI/CD pipeline using GitHub Actions and AWS EKS, cutting production release cycles from 2 days to under 25 minutes.'
      ],
      isExpanded: true
    },
    {
      id: 'exp_2',
      company: 'PixelFlow Digital',
      role: 'Full-Stack Developer',
      period: 'June 2019 – February 2022',
      bullets: [
        'Developed and shipped 12+ responsive web applications using React, Tailwind CSS, and RESTful APIs.',
        'Integrated Stripe and Razorpay payment gateways with automated invoice generation, processing over $3.2M in annual revenue.',
        'Optimized PostgreSQL database indexes and Redis cache layers, improving database throughput by 35%.'
      ],
      isExpanded: false
    }
  ],
  skills: [
    'TypeScript', 'React 18', 'Next.js', 'Node.js', 'Express', 'PostgreSQL', 
    'Redis', 'Docker', 'AWS', 'Tailwind CSS', 'GraphQL', 'CI/CD'
  ]
};

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'exp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export default function ResumeEditor() {
  const { user } = useAuth();
  const { triggerAction } = usePlan();
  
  const [data, setData] = useState<ResumeData>({
    summary: '',
    experience: [],
    skills: []
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Writing Assistant Modal State
  const [activeAssistantTarget, setActiveAssistantTarget] = useState<ActiveAssistantTarget | null>(null);
  const [assistantResult, setAssistantResult] = useState<BulletImprovementResult | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMasterResume = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid, 'config', 'masterResume');
        const docSnap = await getDoc(docRef);
        if (isMounted && docSnap.exists()) {
          const raw = docSnap.data();
          setData({
            summary: typeof raw.summary === 'string' ? raw.summary : '',
            experience: Array.isArray(raw.experience) ? raw.experience : [],
            skills: Array.isArray(raw.skills) ? raw.skills : []
          });
        }
      } catch (error) {
        console.error("Error fetching master resume:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMasterResume();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'masterResume'), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (triggerAction) {
        triggerAction('profile_complete').catch(console.error);
      }
    } catch (error) {
      console.error("Error saving resume:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDemo = () => {
    setData(DEMO_RESUME_DATA);
  };

  const handleClearAll = () => {
    setData({
      summary: '',
      experience: [],
      skills: []
    });
  };

  const addExperience = () => {
    const newExp: ExperienceEntry = {
      id: generateUniqueId(),
      company: '',
      role: '',
      period: '',
      bullets: [''],
      isExpanded: true
    };
    setData(prev => ({ ...prev, experience: [newExp, ...(prev.experience || [])] }));
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      experience: (prev.experience || []).map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id: string) => {
    setData(prev => ({ ...prev, experience: (prev.experience || []).filter(exp => exp.id !== id) }));
  };

  const handleOpenWritingAssistant = async (
    text: string, 
    type: 'bullet' | 'summary', 
    expId?: string, 
    bulletIdx?: number, 
    roleContext?: string, 
    companyContext?: string
  ) => {
    let initialText = text;
    if (!initialText || !initialText.trim()) {
      initialText = type === 'summary' 
        ? 'Experienced software engineer delivering scalable applications and cloud solutions.' 
        : 'Engineered microservices and frontend user interfaces with React and TypeScript.';
    }

    const target: ActiveAssistantTarget = {
      expId,
      bulletIdx,
      type,
      originalText: initialText,
      roleContext,
      companyContext
    };

    setActiveAssistantTarget(target);
    setIsAssistantLoading(true);
    setAssistantResult(null);

    try {
      const result = await improveBulletPointWithAI(initialText, roleContext, companyContext);
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
        experience: (prev.experience || []).map(exp => {
          if (exp.id === expId) {
            const newBullets = [...(exp.bullets || [])];
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

  const experienceList = Array.isArray(data?.experience) ? data.experience : [];
  const skillsList = Array.isArray(data?.skills) ? data.skills : [];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-32 relative">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
              <FileEdit className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Master Resume Profile</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-2">Resume Editor</h1>
          <p className="text-ink-dim font-medium text-sm md:text-base">
            Craft your master profile with Google's XYZ formula and real-time AI bullet rewrites.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="bg-surface hover:bg-surface-light text-ink border border-border px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-accent/40"
            title="Load demo data for Alex Morgan"
          >
            <UserCheck className="w-4 h-4 text-accent" />
            <span>Load Demo Data</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="bg-surface hover:bg-surface-light text-ink-dim hover:text-rose-400 border border-border px-3.5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Reset Editor"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-accent text-white px-7 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-accent/30 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Syncing...' : saveSuccess ? 'Saved to Cloud' : 'Save Resume'}
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Professional Summary */}
        <section className="bg-surface p-8 sm:p-10 rounded-[2.5rem] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
              <BrainCircuit className="w-4 h-4 text-accent" /> Professional Summary
            </h3>
            <button
              type="button"
              onClick={() => handleOpenWritingAssistant(
                data.summary, 
                'summary', 
                undefined, 
                undefined, 
                experienceList[0]?.role, 
                experienceList[0]?.company
              )}
              className="group flex items-center gap-2 text-xs font-mono font-bold text-accent uppercase tracking-wider bg-accent/10 hover:bg-accent/20 px-3.5 py-1.5 rounded-xl border border-accent/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Improve with AI</span>
            </button>
          </div>
          <div className="relative group/summary-box">
            <textarea
              value={data.summary || ''}
              onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Introduce your engineering background, specializations, and quantifiable career achievements..."
              className="w-full h-36 p-5 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none leading-relaxed font-sans"
            />
          </div>
        </section>

        {/* Experience Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
            <div>
              <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                <Briefcase className="w-4 h-4 text-accent" /> Work Experience
              </h3>
              <p className="text-[11px] text-ink-dim font-mono mt-0.5">
                Google XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].
              </p>
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest bg-accent/10 hover:bg-accent/20 px-4 py-2.5 rounded-xl border border-accent/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Experience Entry
            </button>
          </div>

          <div className="space-y-6">
            {experienceList.length === 0 ? (
              <div className="bg-surface/50 border border-dashed border-border rounded-3xl p-10 text-center space-y-4">
                <Briefcase className="w-10 h-10 text-ink-dim mx-auto stroke-[1.5]" />
                <div>
                  <h4 className="text-base font-bold text-ink">No experience entries added yet</h4>
                  <p className="text-xs text-ink-dim mt-1 max-w-md mx-auto">
                    Add your previous roles or click &quot;Load Demo Data&quot; at the top to see how high-impact XYZ bullet points work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="bg-accent/10 hover:bg-accent/20 text-accent font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add First Experience
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {experienceList.map((exp) => (
                  <motion.div
                    key={exp.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-sm"
                  >
                    <div 
                      className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-surface-light/40 transition-colors"
                      onClick={() => updateExperience(exp.id, 'isExpanded', !exp.isExpanded)}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center border border-border shrink-0">
                          <Briefcase className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-bold text-ink text-sm sm:text-base">{exp.company || 'New Company / Entity'}</h4>
                          <p className="text-xs text-ink-dim font-mono font-medium">{exp.role || 'Role Specification'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeExperience(exp.id); }}
                          className="p-2 text-ink-dim hover:text-rose-500 transition-colors mr-1 cursor-pointer"
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
                        className="px-6 sm:px-8 pb-8 space-y-6 border-t border-border mt-2"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                          <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-1.5 block px-1">COMPANY / ORGANIZATION</label>
                            <input 
                              value={exp.company || ''}
                              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              placeholder="e.g. Acme Corp"
                              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-1.5 block px-1">ROLE / TITLE</label>
                            <input 
                              value={exp.role || ''}
                              onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                              placeholder="e.g. Senior Frontend Engineer"
                              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest mb-1.5 block px-1">TIMELINE / PERIOD</label>
                            <input 
                              value={exp.period || ''}
                              onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
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
                              type="button"
                              onClick={() => updateExperience(exp.id, 'bullets', [...(exp.bullets || []), ''])}
                              className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Bullet
                            </button>
                          </div>
                          <div className="space-y-3">
                            {(exp.bullets || []).map((bullet, bIdx) => (
                              <div key={bIdx} className="bg-background/60 border border-border rounded-2xl p-4 space-y-3 transition-all hover:border-accent/30">
                                <textarea
                                  value={bullet || ''}
                                  onChange={(e) => {
                                    const newBullets = [...(exp.bullets || [])];
                                    newBullets[bIdx] = e.target.value;
                                    updateExperience(exp.id, 'bullets', newBullets);
                                  }}
                                  className="w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink resize-none font-sans leading-relaxed"
                                  rows={2}
                                  placeholder="Accomplished [X] as measured by [Y] by doing [Z]..."
                                />

                                <div className="flex flex-wrap items-center justify-between gap-2">
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
                                      const newBullets = (exp.bullets || []).filter((_, i) => i !== bIdx);
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
            )}
          </div>
        </section>

        {/* Skills Section */}
        <section className="bg-surface p-8 sm:p-10 rounded-[2.5rem] border border-border shadow-sm">
          <h3 className="font-bold text-ink flex items-center gap-2 uppercase text-xs tracking-[0.2em] mb-6">
            <CheckCircle2 className="w-4 h-4 text-accent" /> Skillset Taxonomy
          </h3>
          <div className="space-y-6">
            <div className="flex gap-2">
              <input 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !skillsList.includes(val)) {
                      setData(prev => ({ ...prev, skills: [...(prev.skills || []), val] }));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink"
                placeholder="Type a skill (e.g. React, Docker, Python) and press Enter..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {skillsList.map((skill, i) => (
                <span key={i} className="group relative bg-background border border-border px-3.5 py-1.5 rounded-xl text-xs font-bold text-ink flex items-center gap-2">
                  {skill}
                  <button 
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, skills: (prev.skills || []).filter((_, idx) => idx !== i) }))}
                    className="p-0.5 text-ink-dim hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {skillsList.length === 0 && (
                <p className="text-xs text-ink-dim italic">No skills added yet. Type a skill above and press Enter.</p>
              )}
            </div>
          </div>
        </section>

        {/* Next Step Bridge Card */}
        <NextStepBridgeCard
          title="Master resume profile ready"
          contextData={`Profile has ${experienceList[0]?.role || 'Software Engineer'} experience with ${skillsList.length} core skills and ${experienceList.length} past roles.`}
          primaryStep={{
            label: "Audit ATS score in analyzer",
            icon: FileText,
            to: "/analyzer",
            state: {
              targetRole: experienceList[0]?.role || "Software Engineer",
              jobDescription: `Target Position: ${experienceList[0]?.role || 'Software Engineer'}\nSkills: ${skillsList.join(', ')}`
            }
          }}
          secondaryStep={{
            label: "Search matched jobs",
            icon: Search,
            to: "/finder",
            state: {
              role: experienceList[0]?.role || "Software Engineer",
              autoSearch: true
            }
          }}
        />
      </div>

      {/* Floating Status Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-md border border-border px-6 py-3 rounded-full shadow-xl flex items-center gap-6">
        <div className="flex items-center gap-2.5 border-r border-border pr-4">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[11px] font-bold text-ink uppercase tracking-wider">Master Resume</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink-dim uppercase">Bullets:</span>
            <span className="text-xs font-bold text-accent">{experienceList.reduce((acc, curr) => acc + (curr.bullets?.length || 0), 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink-dim uppercase">Skills:</span>
            <span className="text-xs font-bold text-accent">{skillsList.length}</span>
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
