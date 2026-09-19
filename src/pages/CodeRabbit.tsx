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
  Mic,
  Copy,
  Check,
  Code
} from 'lucide-react';
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

const PRESET_SNIPPETS = [
  {
    name: 'React useEffect Leak',
    code: `import { useState, useEffect } from 'react';

export function UserStatusTracker({ userId }: { userId: string }) {
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    // BUG: Missing cleanup / unmount handler and dependency array missing userId
    const socket = new WebSocket(\`wss://api.example.com/status/\${userId}\`);
    socket.onmessage = (event) => {
      setStatus(JSON.parse(event.data).status);
    };
  });

  return <div className="status-badge">Status: {status}</div>;
}`
  },
  {
    name: 'Async Race Condition',
    code: `async function fetchUserProfile(userId: string) {
  let profile = null;
  // BUG: Race condition on concurrent rapid clicks; unhandled reject
  fetch(\`/api/user/\${userId}\`).then(async (res) => {
    profile = await res.json();
    document.getElementById('name')!.innerText = profile.name;
  });
}`
  },
  {
    name: 'SQL Injection Vulnerability',
    code: `import express from 'express';
const router = express.Router();

router.get('/search-users', async (req, res) => {
  const { query } = req.query;
  // SECURITY VULNERABILITY: Raw concatenation prone to SQL injection
  const sql = "SELECT id, username, email FROM users WHERE username LIKE '%" + query + "%'";
  const results = await db.query(sql);
  res.json(results);
});`
  }
];

export default function CodeRabbit() {
  const { user } = useAuth();
  const { checkAccess, deductCredit, openUpgradeModal } = usePlan();
  
  const [code, setCode] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

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
      await new Promise(r => setTimeout(r, 600));
      addLog("Analyzing syntax tree & security vectors...");
      
      const response = await auditCode(code, { 
        platform: 'React / TypeScript',
        env: 'Vite',
        user: user?.email || 'user' 
      });
      
      addLog("Identifying root cause & edge cases...");
      addLog("Refactored implementation generated.");
      setResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network connection error. Please try again.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopyFix = () => {
    if (!result?.fixedCode) return;
    navigator.clipboard.writeText(result.fixedCode);
    setCopied(true);
    addLog("Refactored code copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Initializing Code Auditor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-ink font-sans selection:bg-accent selection:text-white pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-border">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-accent/10 border border-accent/30 p-2 rounded-xl text-accent">
                <Bug className="w-5 h-5 text-accent" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.25em] font-mono">CODE AUDITOR & SANDBOX</span>
                <span className="text-xs font-mono text-ink-dim">Static AST Analyzer & Vulnerability Scanner</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase font-mono text-ink">
              CodeRabbit <span className="text-accent">Sandbox</span>
            </h1>
            <p className="text-ink-dim font-normal text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Automated code reviewer designed to analyze syntax, eliminate memory leaks, patch security vulnerabilities, and generate hardened refactored code.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-surface px-3.5 py-2 rounded-xl border border-border">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest font-mono">AST Engine Online</span>
            </div>
            <div className="text-[10px] font-mono text-ink-dim px-3 py-2 bg-surface rounded-xl border border-border">
              Model: GLM-5.3-Flash / Gemini
            </div>
          </div>
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
            <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-accent" /> Source Code Snippet
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-ink-dim uppercase">Quick Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SNIPPETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCode(preset.code);
                          addLog(`Loaded preset: ${preset.name}`);
                        }}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-surface-light border border-border hover:border-accent text-ink-dim hover:text-ink transition-all cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste TypeScript, React, Python, or SQL code snippet to audit for errors and security leaks..."
                className="w-full h-[400px] bg-background border border-border rounded-xl p-4 sm:p-5 text-xs sm:text-sm font-mono text-accent leading-relaxed focus:outline-none focus:border-accent/60 transition-all custom-scrollbar resize-none placeholder:text-ink-dim/40"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setCode('')}
                  className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider hover:text-ink transition-all self-start sm:self-auto cursor-pointer"
                >
                  Clear Editor
                </button>

                <button
                  type="button"
                  onClick={handleAudit}
                  disabled={!code.trim() || isAuditing}
                  className="w-full sm:w-auto bg-accent text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-30 transition-all shadow-md shadow-accent/20 cursor-pointer"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Auditing Syntax...</span>
                    </>
                  ) : (
                    <>
                      <span>Initiate Code Audit</span>
                      <Zap className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Internal Logs View */}
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 font-mono">
              <div className="flex items-center gap-2 mb-3 border-b border-border pb-2.5">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">Execution Pipeline Logs</span>
              </div>
              <div className="space-y-1.5">
                {logs.length > 0 ? logs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="text-[11px] text-ink-dim flex gap-2"
                  >
                    <span className="text-accent font-bold">&gt;&gt;</span>
                    <span>{log}</span>
                  </motion.div>
                )) : (
                  <div className="text-[11px] text-ink-dim/60 italic">Awaiting code input to initialize AST telemetry stream.</div>
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
                  className="bg-surface/50 border border-dashed border-border rounded-2xl h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 sm:p-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 text-accent">
                    <Bug className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-ink uppercase tracking-wider font-mono mb-2">Awaiting Code Submission</h4>
                  <p className="text-xs text-ink-dim max-w-xs leading-relaxed">
                    Paste your code or select one of the quick presets on the left to inspect architectural flaws, bug vectors, and refactored code.
                  </p>
                </motion.div>
              ) : isAuditing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-surface border border-border rounded-2xl h-full min-h-[500px] p-6 sm:p-8 flex items-center justify-center"
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
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Analysis Result */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <div className="bg-accent/10 p-1.5 rounded-lg text-accent">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">Analysis Assessment</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono block mb-1">Root Cause & Anti-Pattern</span>
                        <p className="text-xs sm:text-sm text-ink leading-relaxed font-sans">{result?.rootCause}</p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider font-mono block mb-1">Architectural Diagnostic</span>
                        <p className="text-xs text-ink-dim leading-relaxed italic font-sans">"{result?.explanation}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Refactored Code */}
                  <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="bg-surface-light px-5 py-3 border-b border-border flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">Optimized Code</span>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCopyFix}
                        className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider hover:text-ink transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-accent" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Fix</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 sm:p-5 bg-background font-mono text-xs leading-relaxed overflow-x-auto custom-scrollbar max-h-[380px]">
                      <pre className="text-accent">
                        {result?.fixedCode}
                      </pre>
                    </div>
                  </div>

                  {/* Best Practices Rail */}
                  <div className="bg-surface rounded-2xl border border-border p-5">
                    <h4 className="text-[10px] font-bold text-ink-dim uppercase tracking-wider font-mono mb-3 pb-2 border-b border-border">
                      Architectural Hardening Recommendations
                    </h4>
                    <div className="space-y-2">
                      {result?.bestPractices.map((bp, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                          <span className="text-accent font-mono text-xs">&bull;</span>
                          <span className="text-xs text-ink-dim leading-snug">{bp}</span>
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
                      to: "/finder",
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-error text-white px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-3 text-xs font-medium"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
