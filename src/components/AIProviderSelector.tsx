import React, { useState, useRef, useEffect } from 'react';
import { useAIProvider } from '../context/AIProviderContext';
import { AIProviderId } from '../lib/aiProvider';
import { Sparkles, Cpu, ChevronDown, Check, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface AIProviderSelectorProps {
  compact?: boolean;
}

export default function AIProviderSelector({ compact = false }: AIProviderSelectorProps) {
  const { provider, setProvider, providers, isVelonaConfigured } = useAIProvider();
  const [isOpen, setIsOpen] = useState(false);
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

  const activeMeta = providers.find(p => p.id === provider) || {
    id: provider,
    name: provider === 'velona' ? 'Velona GLM 5.3 Flash' : 'Gemini 3.7 Flash',
    model: provider === 'velona' ? 'z-ai/glm-5.3-flash' : 'gemini-3.7-flash',
    providerName: provider === 'velona' ? 'Z.ai via Velona' : 'Google DeepMind',
    configured: true,
    isDefault: provider === 'gemini'
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
        title={`Active AI Engine: ${activeMeta.name} (${activeMeta.model})`}
      >
        <div className={cn(
          "w-2 h-2 rounded-full shrink-0 animate-pulse",
          provider === 'velona' ? "bg-emerald-500" : "bg-blue-500"
        )} />

        <div className="flex items-center gap-1.5 text-left min-w-0">
          {provider === 'velona' ? (
            <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          <span className="font-bold text-ink truncate">
            {provider === 'velona' ? 'Velona' : 'Gemini'}
          </span>
          <span className="text-[10px] text-ink-dim hidden md:inline font-mono">
            {provider === 'velona' ? 'GLM 5.3' : '3.7 Flash'}
          </span>
        </div>

        <ChevronDown className={cn("w-3.5 h-3.5 text-ink-dim transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-surface border border-border shadow-2xl p-2 z-[150] focus:outline-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <p className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">AI Inference Provider</p>
            <p className="text-xs text-ink-muted mt-0.5">Choose which enterprise AI model executes audits & intelligence</p>
          </div>

          <div className="space-y-1">
            {(providers.length > 0 ? providers : [
              {
                id: 'gemini' as AIProviderId,
                name: 'Gemini 3.7 Flash',
                providerName: 'Google DeepMind',
                model: 'gemini-3.7-flash',
                configured: true,
                isDefault: true
              },
              {
                id: 'velona' as AIProviderId,
                name: 'Velona GLM 5.3 Flash',
                providerName: 'Z.ai via Velona',
                model: 'z-ai/glm-5.3-flash',
                configured: isVelonaConfigured,
                isDefault: false
              }
            ]).map((p) => {
              const isSelected = provider === p.id;
              const isVelona = p.id === 'velona';

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setProvider(p.id as AIProviderId);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer group",
                    isSelected 
                      ? "bg-accent/10 border border-accent/20" 
                      : "hover:bg-surface-light border border-transparent"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 mt-0.5",
                    isVelona ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {isVelona ? <Cpu className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                        {p.name}
                        {isVelona && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono rounded">
                            Z.ai
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </div>
                    <p className="text-[10px] font-mono text-ink-dim truncate mt-0.5">
                      {p.model}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-1 leading-snug">
                      {p.providerName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-border/60 px-3 py-1.5 bg-surface-light/40 rounded-xl flex items-center justify-between text-[10px] text-ink-dim">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Server-side authenticated
            </span>
            <span className="font-mono text-[9px] text-accent">Active: {provider}</span>
          </div>
        </div>
      )}
    </div>
  );
}
