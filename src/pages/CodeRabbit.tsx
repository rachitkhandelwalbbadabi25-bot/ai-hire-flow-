import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bug, 
  Terminal, 
  Sparkles, 
  Code2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Mic
} from 'lucide-react';
import SmartContextChips from '../components/SmartContextChips';
import { useSystemOS } from '../context/SystemOSContext';
import NextStepBridgeCard from '../components/NextStepBridgeCard';
import AILoadingStepper from '../components/AILoadingStepper';
import { auditCode } from '../lib/gemini';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { cn } from '../lib/utils';

interface AuditResult {
  explanation: string;
  rootCause: string;
  fixedCode: string;
  bestPractices: string[];
}

export default function CodeRabbit() {
  const { user } = useAuth();
  if (!user) return null;
  const { checkAccess, deductCredit, openUpgradeModal } = usePlan();
  
  const [code, setCode] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-5));
  };

  const handleAudit = async () => {
    if (!code.trim()) return;
    
    // Check credit access for code auditing (mapped to portfolioReview, 30 CR)
    const access = checkAccess('portfolioReview');
    if (!access.hasAccess) {
      openUpgradeModal('portfolioReview');
      return;
    }
    
    setIsAuditing(true);
    setError(null);
    setResult(null);
    setLogs([]);
    
    addLog("Initializing Code Audit...");
    addLog("Checking logic chains...");
    
    try {
      await deductCredit('portfolioReview');
      await new Promise(r => setTimeout(r, 800));
      addLog("Analyzing syntax tree with Velona GLM 5.3 Flash...");
      
      const response = await auditCode(code, { 
        platform: 'React',
        env: 'Vite',
        user: user.email 
      });
      
      addLog("Identifying issue...");
      addLog("Fix recommendations generated.");
      setResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network connection error. Please try again.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-accent selection:text-white pb-32">
      {/* Structural Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent p-2 rounded-lg shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]">
                <Bug className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Sub-System // Alpha</span>
                <span className="text-xs font-mono text-zinc-500">Log: Code Auditor v2.4.0</span>
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6 leading-[0.85]">
              Code <br /> Rabbit
            </h1>
            <p className="text-zinc-400 font-medium text-lg leading-relaxed max-w-xl">
              Automated code reviewer designed to analyze, debug, and optimize your application codebase.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800">
               <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
               <span className="text-[10px] font-bold text-success uppercase tracking-widest leading-none">Core Online</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">Lat: 24ms // Seg: Primary</p>
          </div>
        </div>

        <SmartContextChips 
          className="mb-8"
          onSelectSkill={(skill) => setCode(`// Code exercise or debug task for skill gap: ${skill}\nfunction process${skill.replace(/[^a-zA-Z0-9]/g, '')}() {\n  // TODO: Implement solution for ${skill}\n}`)}
        />

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Input Panel */}
          <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
            <div className="bg-[#111] rounded-[2rem] border border-zinc-800 p-8 shadow-2xl relative overflow-hidden group">
               {/* Accent Corner */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl pointer-events-none group-hover:bg-accent/10 transition-all" />
               
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-accent" /> Logic Signal
                  </h3>
                  <button 
                    onClick={() => setCode('')}
                    className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-accent transition-all"
                  >
                    Purge Buffer
                  </button>
               </div>

               <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste code snippet or error stack trace..."
                className="w-full h-[450px] bg-black border border-zinc-900 rounded-2xl p-8 text-sm font-mono text-accent leading-relaxed focus:outline-none focus:border-accent/40 transition-all custom-scrollbar resize-none"
               />

               <button
                onClick={handleAudit}
                disabled={!code.trim() || isAuditing}
                className="mt-8 w-full bg-accent text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:opacity-90 disabled:opacity-30 transition-all shadow-2xl shadow-accent/20"
               >
                 {isAuditing ? (
                   <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Auditing Logic...
                   </>
                 ) : (
                   <>
                    Initiate Code Audit <Zap className="w-4 h-4" />
                   </>
                 )}
               </button>
            </div>

            {/* Internal Logs View */}
            <div className="bg-[#0d0d0d] rounded-2xl border border-zinc-800/50 p-6 font-mono">
               <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase">Audit Logs</span>
               </div>
               <div className="space-y-2">
                 {logs.length > 0 ? logs.map((log, i) => (
                   <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="text-[10px] text-zinc-500 flex gap-3"
                   >
                     <span className="text-accent/40 opacity-40">::</span>
                     {log}
                   </motion.div>
                 )) : (
                   <div className="text-[10px] text-zinc-800 italic">No output detected in the stream.</div>
                 )}
               </div>
            </div>
          </div>

          {/* Results Side */}
          <div className="lg:col-span-12 xl:col-span-5 relative">
            <AnimatePresence mode="wait">
              {!result && !isAuditing ? (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#111]/30 border border-dashed border-zinc-800 rounded-[2rem] h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12"
                >
                   <div className="relative mb-8">
                      <div className="w-24 h-24 border border-zinc-800 rounded-full flex items-center justify-center">
                         <div className="w-20 h-20 border border-zinc-800 rounded-full flex items-center justify-center animate-pulse">
                            <Bug className="w-8 h-8 text-zinc-800" />
                         </div>
                      </div>
                   </div>
                   <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Awaiting Code</h4>
                   <p className="text-xs text-zinc-600 max-w-xs leading-relaxed uppercase font-bold tracking-tighter">
                     Code auditor is on standby. Input your code snippet to begin analysis.
                   </p>
                </motion.div>
              ) : isAuditing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#111] border border-zinc-800 rounded-[2rem] h-full min-h-[500px] p-6 sm:p-8 flex items-center justify-center"
                >
                  <AILoadingStepper 
                    presetKey="code_audit" 
                    title="AST Static Analysis & Vulnerability Engine" 
                    className="w-full max-w-xl"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Analysis Result */}
                  <div className="bg-[#111] rounded-[2rem] border border-zinc-800 p-10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="bg-success/20 p-2 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                       </div>
                       <span className="text-[10px] font-black text-success uppercase tracking-[0.3em]">Analysis Complete</span>
                    </div>

                    <div className="space-y-8">
                       <div>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Root Cause</label>
                          <p className="text-sm text-zinc-300 leading-relaxed font-medium capitalize-first">{result?.rootCause}</p>
                       </div>
                       <div>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">AI Guidance</label>
                          <p className="text-xs text-zinc-500 italic leading-relaxed">"{result?.explanation}"</p>
                       </div>
                    </div>
                  </div>

                  {/* Refactored Code */}
                  <div className="bg-[#111] rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl">
                     <div className="bg-[#1a1a1a] px-8 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="w-4 h-4 text-accent" />
                           <span className="text-[9px] font-black text-white uppercase tracking-widest">Refactored Code</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(result?.fixedCode || '');
                            addLog("Refactored code copied to clipboard.");
                          }}
                          className="text-[10px] font-bold text-accent uppercase tracking-widest hover:text-white transition-all"
                        >
                          Copy Fix
                        </button>
                     </div>
                     <div className="p-8 bg-[#0a0a0a] font-mono text-xs leading-relaxed overflow-x-auto custom-scrollbar min-h-[300px]">
                        <pre className="text-white">
                          {result?.fixedCode}
                        </pre>
                     </div>
                  </div>

                  {/* Best Practices Rail */}
                  <div className="bg-[#111] rounded-3xl border border-zinc-800 p-8">
                     <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 border-b border-zinc-900 pb-4">Architectural Hardening System</h4>
                     <div className="grid grid-cols-1 gap-4">
                        {result?.bestPractices.map((bp, i) => (
                          <div key={i} className="flex gap-4 items-start group">
                             <div className="w-1 h-1 bg-accent rounded-full mt-1.5 transition-all group-hover:scale-[2]" />
                             <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors leading-tight font-medium uppercase tracking-tight">{bp}</span>
                          </div>
                        ))}
                     </div>
                  </div>

                  <NextStepBridgeCard
                    title="Code audit complete"
                    contextData={`Synthesized refactored implementation with ${result?.bestPractices?.length || 0} architectural hardening guidelines. Root cause resolved: ${result?.rootCause ? (result.rootCause.length > 80 ? result.rootCause.slice(0, 80) + '...' : result.rootCause) : 'Code structure optimization.'}`}
                    primaryStep={{
                      label: "Simulate technical interview",
                      icon: Mic,
                      to: "/interview",
                      state: {
                        role: "Software Engineer",
                        jobDescription: "Technical code interview focusing on clean architecture, bug prevention, and performance optimization."
                      }
                    }}
                    secondaryStep={{
                      label: "Search software engineering roles",
                      icon: Search,
                      to: "/jobs",
                      state: {
                        role: "Software Engineer",
                        autoSearch: true
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
           <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-rose-600 text-white px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(225,29,72,0.4)] flex items-center gap-4"
           >
              <AlertTriangle className="w-6 h-6" />
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest">System Overload</span>
                 <span className="text-xs font-medium">{error}</span>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
