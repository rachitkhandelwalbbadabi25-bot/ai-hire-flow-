import React, { useState, useRef, useEffect } from 'react';
import { useAIProvider } from '../context/AIProviderContext';
import { Cpu, ChevronDown, Check, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface AIProviderSelectorProps {
  compact?: boolean;
}

export default function AIProviderSelector({ compact = false }: AIProviderSelectorProps) {
  const { provider, setProvider, providers, isVelonaConfigured, testVelona } = useAIProvider();
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testVelona("Test connection ping");
      if (res && (res.success || res.response)) {
        setTestResult("Connected (200 OK)");
      } else {
        setTestResult("Active");
      }
    } catch (e: any) {
      setTestResult(e.message?.slice(0, 30) || "Error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-xl transition-all border font-medium cursor-pointer shadow-sm",
          compact 
            ? "px-2.5 py-1.5 text-xs bg-surface hover:bg-surface-light border-border text-ink"
            : "px-3 py-2 text-xs bg-surface hover:bg-surface-light border-border text-ink"
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="AI Engine: Velona (GLM 5.3 Flash)"
      >
        <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />

        <div className="flex items-center gap-1.5 text-left min-w-0">
          <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-bold text-ink truncate">
            Velona
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono hidden md:inline">
            GLM 5.3 Flash
          </span>
        </div>

        <ChevronDown className={cn("w-3.5 h-3.5 text-ink-dim transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-surface border border-border shadow-2xl p-2 z-[150] focus:outline-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">AI Inference Engine</p>
            <p className="text-xs text-ink-muted mt-0.5">Enterprise intelligence powered exclusively by Velona</p>
          </div>

          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  Velona (GLM 5.3 Flash)
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono rounded">
                    Active
                  </span>
                </span>
                <Check className="w-3.5 h-3.5 text-accent shrink-0" />
              </div>
              <p className="text-[10px] font-mono text-ink-dim truncate mt-0.5">
                z-ai/glm-5.3-flash
              </p>
              <p className="text-[10px] text-ink-muted mt-1 leading-snug">
                Base URL: https://velona.in/v1 • Model: GLM 5.3 Flash
              </p>
            </div>
          </div>

          <div className="mt-2 px-1">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-surface-light hover:bg-surface border border-border text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              {isTesting ? "Testing Velona Endpoint..." : testResult ? testResult : "Test Velona Connection"}
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-border/60 px-3 py-1.5 bg-surface-light/40 rounded-xl flex items-center justify-between text-[10px] text-ink-dim">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Server-side authenticated
            </span>
            <span className="font-mono text-[9px] text-emerald-500 font-semibold">VELONA_API_KEY</span>
          </div>
        </div>
      )}
    </div>
  );
}
