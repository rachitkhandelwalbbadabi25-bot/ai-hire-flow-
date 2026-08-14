import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  X, 
  Check, 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Layers, 
  ArrowRight,
  Edit3,
  Copy,
  Info
} from 'lucide-react';
import { BulletAISuggestion, BulletImprovementResult, ConfidenceLevel } from '../types/aiWritingAssistant';

interface AIWritingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  roleContext?: string;
  companyContext?: string;
  result: BulletImprovementResult | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onApply: (appliedText: string) => void;
}

export default function AIWritingAssistantModal({
  isOpen,
  onClose,
  originalText,
  roleContext,
  companyContext,
  result,
  isLoading,
  onRegenerate,
  onApply,
}: AIWritingAssistantModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [customEdits, setCustomEdits] = useState<{ [key: number]: string }>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSuggestion = result?.suggestions?.[selectedIndex];
  const activeEditText = customEdits[selectedIndex] !== undefined 
    ? customEdits[selectedIndex] 
    : currentSuggestion?.rewritten || '';

  const getConfidenceBadge = (level?: ConfidenceLevel) => {
    switch (level) {
      case 'high':
        return {
          label: 'High Confidence',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          desc: 'Verified technical domain context & measurable impact.'
        };
      case 'medium':
        return {
          label: 'Medium Confidence',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          desc: 'Inferred scope with realistic metric proxy suggestions.'
        };
      default:
        return {
          label: 'Low Confidence',
          badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          desc: 'Abstract initial input. Review proxy metric carefully.'
        };
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assistant-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-surface border border-accent/30 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface-light/40 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 border border-accent/20 rounded-xl text-accent">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-assistant-modal-title" className="text-lg font-bold text-ink tracking-tight font-sans">
                  AI Writing Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent">
                  XYZ Formula Engine
                </span>
              </div>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                {roleContext ? `${roleContext}` : 'Target Role'}{companyContext ? ` • ${companyContext}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close AI Writing Assistant"
            className="p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Original Bullet Point */}
          <div className="bg-background/80 border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
                <Edit3 className="w-3 h-3 text-accent" /> Original Bullet Point
              </span>
              <span className="text-[10px] font-mono text-ink-dim">
                {originalText.length} characters
              </span>
            </div>
            <p className="text-sm text-ink-dim font-medium italic bg-surface/50 p-3 rounded-xl border border-border/60">
              "{originalText || 'No bullet text provided'}"
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <RefreshCw className="w-10 h-10 text-accent animate-spin" />
                <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-ink font-sans">
                  Synthesizing XYZ Impact Bullet...
                </h4>
                <p className="text-xs text-ink-dim font-mono mt-1 max-w-sm">
                  Deconstructing Accomplished [X], Measured by [Y], and Doing [Z] with honest metric proxies.
                </p>
              </div>
            </div>
          ) : result && result.suggestions && result.suggestions.length > 0 ? (
            <div className="space-y-6">
              {/* Suggestion Selector Tabs */}
              {result.suggestions.length > 1 && (
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim mb-2 block">
                    Choose Strategic Focus:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {result.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedIndex === idx
                            ? 'bg-accent/10 border-accent text-ink shadow-sm'
                            : 'bg-background/60 border-border hover:border-accent/30 text-ink-dim hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-accent uppercase">
                            Option {idx + 1}
                          </span>
                          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${getConfidenceBadge(sug.confidence_level).badge}`}>
                            {sug.confidence_level}
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate">
                          {sug.focusType || `Variation ${idx + 1}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Suggestion Card */}
              {currentSuggestion && (
                <div className="bg-surface-light/40 border border-accent/30 rounded-2xl p-5 space-y-5">
                  {/* Top Badges: Impact Estimate & Confidence */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-dim block">
                          Impact Estimate
                        </span>
                        <span className="text-xs font-mono font-bold text-accent">
                          {currentSuggestion.impact_estimate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${getConfidenceBadge(currentSuggestion.confidence_level).badge}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{getConfidenceBadge(currentSuggestion.confidence_level).label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rewritten Bullet Text Area (Editable for customization) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Rewritten Bullet (Google XYZ Format)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeEditText)}
                        className="text-[10px] font-mono text-ink-dim hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <textarea
                      value={activeEditText}
                      onChange={(e) => setCustomEdits({ ...customEdits, [selectedIndex]: e.target.value })}
                      className="w-full p-4 bg-background border border-accent/30 rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent font-sans leading-relaxed resize-none shadow-inner"
                      rows={3}
                      placeholder="Fine-tune your XYZ bullet point..."
                    />
                  </div>

                  {/* XYZ Formula Dissection */}
                  {currentSuggestion.xyzBreakdown && (
                    <div className="bg-background/90 border border-border rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-accent" /> XYZ Formula Dissection
                      </span>
                      <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                        <div className="flex items-start gap-2 bg-surface p-2.5 rounded-lg border border-border/80">
                          <span className="font-bold text-accent shrink-0">[X] Accomplished:</span>
                          <span className="text-ink font-sans">{currentSuggestion.xyzBreakdown.accomplishedX}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-surface p-2.5 rounded-lg border border-border/80">
                          <span className="font-bold text-amber-400 shrink-0">[Y] Measured By:</span>
                          <span className="text-ink font-sans">{currentSuggestion.xyzBreakdown.measuredByY}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-surface p-2.5 rounded-lg border border-border/80">
                          <span className="font-bold text-emerald-400 shrink-0">[Z] Doing:</span>
                          <span className="text-ink font-sans">{currentSuggestion.xyzBreakdown.doingZ}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metric Proxy Warning & Guidance (if no metric existed in original) */}
                  {currentSuggestion.hasMetricProxy && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <span className="font-mono font-bold text-amber-400 uppercase tracking-wider block text-[10px]">
                          Proxy Metric Detected • No Fake Numbers Rule
                        </span>
                        <p className="text-ink-dim leading-relaxed font-sans">
                          {currentSuggestion.metricGuidance || 
                            "The original bullet lacked quantitative metrics. We inserted realistic bracketed metric proxies. Be sure to replace the bracketed placeholders with your team's real production numbers."
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reasoning Block */}
                  <div className="bg-background/60 border border-border/80 rounded-xl p-3.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5 mb-1">
                      <Info className="w-3 h-3 text-accent" /> Recruiter & ATS Reasoning
                    </span>
                    <p className="text-xs text-ink leading-relaxed font-sans">
                      {currentSuggestion.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-ink-dim font-mono text-xs">
              No suggestions generated yet. Click "Generate Suggestions" below.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-surface-light/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 bg-surface border border-border hover:border-accent/40 rounded-xl text-xs font-mono font-bold text-ink transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
            <span>Try Alternative Angles</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-mono font-bold text-ink-dim hover:text-ink transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !activeEditText}
              onClick={() => onApply(activeEditText)}
              className="w-full sm:w-auto px-6 py-2.5 bg-accent hover:bg-accent/90 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Apply This Rewrite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
