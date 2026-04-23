import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BookOpen, Code, Trophy, Target, Sparkles, Building2, ChevronRight, Zap, PlayCircle, X, Loader2, BookCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { generateLearningPath } from '../lib/gemini';

export default function CampusPlacement() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  
  const mncRoles = [
    { title: "TCS Ninja / Digital", focus: "Aptitude, Coding, HR Protocols", color: "bg-blue-500" },
    { title: "Infosys System Engineer", focus: "Infosys Certified Software Programmer Rounds", color: "bg-orange-500" },
    { title: "Wipro Turbo/Elite", focus: "AMCAT based Aptitude, Essay Writing", color: "bg-purple-500" },
    { title: "SDE Tier-1 (Cisco/D.E. Shaw)", focus: "OS, DBMS, Networking, Advanced DSA", color: "bg-emerald-500" }
  ];

  const startupRoles = [
    { title: "Front-end Specialist", focus: "React, Next.js, Performance Optimization", color: "bg-rose-500" },
    { title: "Back-end Architect", focus: "System Design, Microservices, Scalability", color: "bg-indigo-500" }
  ];

  const handleInitializePath = async (role: string) => {
    setLoading(true);
    setShowModal(true);
    try {
      // We'll treat common campus requirements as "missing skills" to generate a solid roadmap
      const roadmap = await generateLearningPath(['Aptitude', 'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems'], role);
      setSelectedPath(roadmap);
    } catch (error) {
      console.error("Failed to generate roadmap", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-[2.5rem] shadow-2xl p-8 lg:p-12 relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-8 right-8 p-2 hover:bg-accent/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-ink-dim" />
              </button>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-accent animate-spin" />
                  <p className="text-sm font-bold text-ink uppercase tracking-widest">Architecting Neural Roadmap...</p>
                </div>
              ) : selectedPath ? (
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20">
                      <BookCheck className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-ink uppercase tracking-tight">{selectedPath.roadmapTitle}</h2>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest">AI-Engineered Placement Strategy</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedPath.sections.map((section: any, idx: number) => (
                      <div key={idx} className="bg-background border border-border rounded-3xl p-6">
                        <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px]">{idx + 1}</span>
                          {section.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {section.skillsCovered.map((skill: string, sIdx: number) => (
                            <span key={sIdx} className="px-2 py-1 bg-surface-light text-ink-dim text-[9px] font-bold uppercase rounded-md border border-border">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {section.resources.map((res: any, rIdx: number) => (
                            <a 
                              key={rIdx} 
                              href={res.link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border hover:border-accent/40 group transition-all"
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-ink uppercase">{res.name}</span>
                                <span className="text-[8px] text-ink-dim uppercase">{res.platform} • {res.type}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-accent transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-accent/10 p-2 rounded-xl border border-accent/20">
            <Trophy className="w-5 h-5 text-accent" />
          </div>
          <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Placement War-Room</span>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight uppercase leading-none mb-4">India Campus Readiness</h1>
        <p className="text-ink-dim font-medium text-lg max-w-2xl">
          Precision preparation for the Indian engineering placement season. 
          Bridge the gap between academic theory and corporate entry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Core Prep Sections */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface border border-border rounded-[2rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-ink uppercase tracking-tight flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-accent" />
                Muls-tier MNC Roadmap
              </h3>
              <div className="px-3 py-1 bg-accent/10 text-accent text-[8px] font-bold uppercase rounded-full">
                Service Sector Optimized
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mncRoles.map((role, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-6 bg-background border border-border rounded-2xl hover:border-accent/40 transition-all group"
                >
                  <div className={`w-8 h-8 ${role.color}/10 rounded-lg flex items-center justify-center mb-4 border border-${role.color}/20`}>
                    <Building2 className={`w-4 h-4 text-${role.color === 'bg-blue-500' ? 'blue-500' : 
                                                role.color === 'bg-orange-500' ? 'orange-500' : 
                                                role.color === 'bg-purple-500' ? 'purple-500' : 'emerald-500'}`} />
                  </div>
                  <h4 className="font-bold text-ink mb-1">{role.title}</h4>
                  <p className="text-xs text-ink-dim italic mb-4">"{role.focus}"</p>
                  <button 
                    onClick={() => handleInitializePath(role.title)}
                    className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all outline-none"
                  >
                    Initialize Path <ChevronRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[2rem] p-8">
             <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-ink uppercase tracking-tight flex items-center gap-3">
                <Target className="w-5 h-5 text-emerald-500" />
                Aptitude & Technical Drill
              </h3>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-xl group">
                   <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                     <Zap className="w-5 h-5 text-emerald-500" />
                   </div>
                   <div className="flex-1">
                     <h5 className="text-xs font-bold text-ink uppercase">Logical Reasoning & Quantitative</h5>
                     <p className="text-[10px] text-ink-dim tracking-tight">Focus: Probability, P&C, Time-Distance, Syllogisms.</p>
                   </div>
                   <PlayCircle 
                      onClick={() => handleInitializePath("Logical Reasoning Aptitude")}
                      className="w-6 h-6 text-ink-dim hover:text-emerald-500 cursor-pointer transition-colors" 
                   />
                </div>
                <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-xl group">
                   <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                     <Code className="w-5 h-5 text-blue-500" />
                   </div>
                   <div className="flex-1">
                     <h5 className="text-xs font-bold text-ink uppercase">CS Fundamentals</h5>
                     <p className="text-[10px] text-ink-dim tracking-tight">Object Oriented Programming, Database Joins, OS Threading.</p>
                   </div>
                   <PlayCircle 
                      onClick={() => handleInitializePath("Computer Science Fundamentals (OOPS/DBMS/OS)")}
                      className="w-6 h-6 text-ink-dim hover:text-blue-500 cursor-pointer transition-colors" 
                   />
                </div>
            </div>
          </div>
        </div>

        {/* Startup & Product Section */}
        <div className="space-y-8">
           <div className="bg-[#0a0a0a] border border-accent/20 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px] -mr-16 -mt-16 group-hover:bg-accent/30 transition-all"></div>
              <Sparkles className="w-8 h-8 text-accent mb-6" />
              <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Startup Elite Program</h3>
              <p className="text-xs text-white/60 mb-8 leading-relaxed font-sans">
                Curated vectors for Series A+ high-growth vectors. For the builders and shifters.
              </p>
              
              <div className="space-y-3 mb-8">
                {startupRoles.map((role, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                    <h4 className="text-xs font-bold tracking-widest uppercase">{role.title}</h4>
                    <p className="text-[9px] text-white/40 mt-1 uppercase tracking-tighter">{role.focus}</p>
                  </div>
                ))}
              </div>

              <button className="w-full bg-accent text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all">
                Enter Elite Channel
              </button>
           </div>

           <div className="bg-surface border border-border rounded-[2rem] p-8">
              <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-6">Trending This Placement Cycle</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <p className="text-[10px] text-ink-dim font-medium">Mass recruitment surges in BFSI vertical (Global Capability Centers).</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  <p className="text-[10px] text-ink-dim font-medium">Increased focus on 'Prompt Engineering' as a core competency for Junior Devs.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  <p className="text-[10px] text-ink-dim font-medium">Shift from pure DSA to Application Security and System Resilience.</p>
                </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
