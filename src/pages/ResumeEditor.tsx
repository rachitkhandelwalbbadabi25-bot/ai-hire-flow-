import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  RotateCcw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { improveBulletPointWithAI } from '../lib/gemini';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AIWritingAssistantModal from '../components/AIWritingAssistantModal';
import { BulletImprovementResult } from '../types/aiWritingAssistant';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { FadeInSection, SpotlightCard } from '../components/AnimatedPrimitives';

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

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'exp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export default function ResumeEditor() {
  const { user, requireAuth } = useAuth();
  const { triggerAction, checkAccess, deductCredit, openUpgradeModal } = usePlan();
  const editAccess = checkAccess('resumeEdits');
  
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
    if (!requireAuth('save your Master Resume')) return;
    if (!user?.uid) return;

    const access = checkAccess('resumeEdits');
    if (!access.hasAccess) {
      openUpgradeModal();
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'masterResume'), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await deductCredit('resumeEdits');
      if (triggerAction) {
        triggerAction('profile_complete').catch(console.error);
      }
    } catch (error) {
      console.error("Error saving resume:", error);
    } finally {
      setIsSaving(false);
    }
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
    const initialText = (text || '').trim();
    if (!initialText) return;
    if (!requireAuth('rewrite resume bullets with AI')) return;

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
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[var(--hf-cta)]" />
        <p className="text-sm text-[var(--hf-text-secondary)]">Loading master resume profile...</p>
      </div>
    );
  }

  const experienceList = Array.isArray(data?.experience) ? data.experience : [];
  const skillsList = Array.isArray(data?.skills) ? data.skills : [];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-32 relative">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b-[1.5px] border-[var(--hf-ink-border)]">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-1">
            Resume Tools
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight">Resume editor</h1>
          <p className="text-sm text-[var(--hf-text-secondary)] mt-1">
            Craft your master profile with Google's XYZ formula and real-time AI bullet rewrites.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium text-[var(--hf-text-secondary)] bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] px-3 py-1.5 rounded-sm hidden sm:inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--hf-cta)] inline-block"></span>
            {typeof editAccess.limit === 'number' && editAccess.limit < 9999 ? `${editAccess.remaining} edits left this month` : 'Unlimited edits'}
          </span>

          <button
            type="button"
            onClick={handleClearAll}
            className="hf-btn-secondary min-h-[42px] px-3.5 py-2 text-xs hover:text-[var(--hf-error)] gap-2"
            title="Reset editor"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="hf-btn-primary min-h-[42px] px-5 py-2 gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Syncing...' : saveSuccess ? 'Saved to cloud' : 'Save resume'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Professional Summary */}
        <FadeInSection delay={0.04}>
          <SpotlightCard hoverLift={false} className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--hf-border)]">
              <div>
                <h2 className="font-serif-display text-xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[var(--hf-cta)]" /> Professional summary
                </h2>
                <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                  Brief narrative highlighting your background, core specializations, and quantifiable career wins.
                </p>
              </div>
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
                className="self-start sm:self-auto min-h-[36px] px-3.5 py-1.5 rounded-sm border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-shadow-color)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer bg-[var(--hf-mint)] text-[var(--hf-success)] hover:-translate-y-0.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Improve with AI</span>
              </button>
            </div>
            <div className="relative">
              <textarea
                value={data.summary || ''}
                onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Introduce your engineering background, specializations, and quantifiable career achievements..."
                className="w-full min-h-[120px] p-4 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] resize-none leading-relaxed font-sans"
              />
            </div>
          </SpotlightCard>
        </FadeInSection>

        {/* Experience Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-serif-display text-2xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--hf-cta)]" /> Work experience
              </h2>
              <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                Google XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].
              </p>
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="self-start sm:self-auto hf-btn-secondary min-h-[40px] px-3.5 py-2 gap-2"
            >
              <Plus className="w-4 h-4" /> Add experience entry
            </button>
          </div>

          <div className="space-y-4">
            {experienceList.length === 0 ? (
              <div className="bg-[var(--hf-surface)] border-[1.5px] border-dashed border-[var(--hf-ink-border)] rounded-sm p-8 sm:p-10 text-center space-y-3">
                <Briefcase className="w-9 h-9 text-[var(--hf-text-muted)] mx-auto stroke-[1.5]" />
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[var(--hf-text)]">No experience entries added yet</h3>
                  <p className="text-xs text-[var(--hf-text-secondary)] mt-1 max-w-md mx-auto">
                    Add your previous roles to structure your accomplishments using Google's XYZ bullet formula.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="hf-btn-primary min-h-[40px] px-4 py-2 gap-2"
                >
                  <Plus className="w-4 h-4" /> Add first experience
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {experienceList.map((exp) => (
                  <motion.div
                    key={exp.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="hf-card overflow-hidden"
                  >
                    <div 
                      className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--hf-surface-secondary)]/50 transition-colors"
                      onClick={() => updateExperience(exp.id, 'isExpanded', !exp.isExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[var(--hf-surface-secondary)] rounded-sm flex items-center justify-center border border-[var(--hf-ink-border)] shrink-0 text-[var(--hf-cta)]">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--hf-text)] text-sm sm:text-base">{exp.company || 'New company / organization'}</h3>
                          <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">{exp.role || 'Role or title'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeExperience(exp.id); }}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] rounded-sm hover:bg-[var(--hf-surface-secondary)] transition-colors cursor-pointer mr-1"
                          aria-label="Delete experience"
                          title="Delete experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {exp.isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--hf-text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--hf-text-secondary)]" />}
                      </div>
                    </div>

                    {exp.isExpanded && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        className="px-4 sm:px-6 pb-6 pt-4 space-y-5 border-t-[1.5px] border-[var(--hf-ink-border)]"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          <div>
                            <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Company or organization</label>
                            <input 
                              value={exp.company || ''}
                              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              placeholder="e.g. Acme Corp"
                              className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Role or job title</label>
                            <input 
                              value={exp.role || ''}
                              onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                              placeholder="e.g. Senior Frontend Engineer"
                              className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[var(--hf-text)] mb-1.5 block">Timeline or period</label>
                            <input 
                              value={exp.period || ''}
                              onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                              className="w-full min-h-[42px] px-3.5 py-2 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                              placeholder="e.g. 2022 – Present"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-[var(--hf-text)] block">
                              Impact bullet points (Google XYZ formula)
                            </label>
                            <button 
                              type="button"
                              onClick={() => updateExperience(exp.id, 'bullets', [...(exp.bullets || []), ''])}
                              className="min-h-[36px] px-2.5 py-1 text-xs font-semibold text-[var(--hf-cta)] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add bullet
                            </button>
                          </div>
                          <div className="space-y-3">
                            {(exp.bullets || []).map((bullet, bIdx) => (
                              <div key={bIdx} className="bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-ink-border)] rounded-sm p-3 sm:p-3.5 space-y-2.5 transition-colors">
                                <textarea
                                  value={bullet || ''}
                                  onChange={(e) => {
                                    const newBullets = [...(exp.bullets || [])];
                                    newBullets[bIdx] = e.target.value;
                                    updateExperience(exp.id, 'bullets', newBullets);
                                  }}
                                  className="w-full p-3 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] resize-none leading-relaxed font-sans"
                                  rows={2}
                                  placeholder="Accomplished [X] as measured by [Y] by doing [Z]..."
                                />

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenWritingAssistant(bullet, 'bullet', exp.id, bIdx, exp.role, exp.company)}
                                    className="min-h-[36px] px-3 py-1.5 bg-[var(--hf-mint)] border border-[var(--hf-ink-border)] rounded-sm text-[var(--hf-success)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-[1px_1px_0px_var(--hf-shadow-color)] hover:-translate-y-0.5"
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
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] rounded-sm hover:bg-[var(--hf-surface)] transition-colors cursor-pointer"
                                    aria-label="Delete bullet"
                                    title="Delete bullet"
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
        <FadeInSection delay={0.1}>
          <SpotlightCard hoverLift={false} className="p-5 sm:p-6">
            <div className="mb-4 pb-3 border-b border-[var(--hf-border)]">
              <h2 className="font-serif-display text-xl font-normal text-[var(--hf-text)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--hf-cta)]" /> Core skills
              </h2>
              <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                Add technical, domain, and tool proficiencies. Type a skill and press Enter.
              </p>
            </div>
            <div className="space-y-4">
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
                  className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] rounded-sm text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] font-sans"
                  placeholder="Type a skill (e.g. React, Docker, Python) and press Enter..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, i) => (
                  <motion.span
                    key={`${skill}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] px-3 py-1.5 rounded-sm text-xs font-semibold text-[var(--hf-text)] flex items-center gap-2 shadow-[1px_1px_0px_var(--hf-shadow-color)]"
                  >
                    <span>{skill}</span>
                    <button 
                      type="button"
                      onClick={() => setData(prev => ({ ...prev, skills: (prev.skills || []).filter((_, idx) => idx !== i) }))}
                      className="min-h-[24px] min-w-[24px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] rounded-sm transition-colors cursor-pointer"
                      aria-label={`Remove skill ${skill}`}
                      title="Remove skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.span>
                ))}
                {skillsList.length === 0 && (
                  <p className="text-xs text-[var(--hf-text-muted)] italic">No skills added yet. Type a skill above and press Enter.</p>
                )}
              </div>
            </div>
          </SpotlightCard>
        </FadeInSection>

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
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] px-4 sm:px-5 py-2.5 rounded-sm shadow-[3px_3px_0px_var(--hf-shadow-color)] flex items-center gap-4 sm:gap-6 text-xs whitespace-nowrap">
        <div className="flex items-center gap-2 border-r border-[var(--hf-border)] pr-3 sm:pr-4">
          <div className="w-2 h-2 rounded-full bg-[var(--hf-success)]" />
          <span className="font-semibold text-[var(--hf-text)]">Master resume</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--hf-text-secondary)]">Bullets:</span>
            <span className="font-mono font-bold text-[var(--hf-text)] tabular-nums">{experienceList.reduce((acc, curr) => acc + (curr.bullets?.length || 0), 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--hf-text-secondary)]">Skills:</span>
            <span className="font-mono font-bold text-[var(--hf-text)] tabular-nums">{skillsList.length}</span>
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
