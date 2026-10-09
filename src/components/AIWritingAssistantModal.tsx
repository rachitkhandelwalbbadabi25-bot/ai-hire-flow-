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
  Info,
  Loader2
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
          label: 'High confidence',
          badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          desc: 'Verified technical domain context and measurable impact.'
        };
      case 'medium':
        return {
          label: 'Medium confidence',
          badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          desc: 'Inferred scope with realistic metric proxy suggestions.'
        };
      default:
        return {
          label: 'Low confidence',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl w-full max-w-3xl shadow-xl overflow-hidden my-auto relative max-h-[90vh] flex flex-col text-[var(--hf-text)]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--hf-border)] flex items-center justify-between bg-[var(--hf-surface-secondary)]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[color-mix(in_srgb,var(--hf-ai-teal)_12%,transparent)] border border-[color-mix(in_srgb,var(--hf-ai-teal)_25%,transparent)] text-[var(--hf-ai-teal)] flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-assistant-modal-title" className="text-base sm:text-lg font-semibold text-[var(--hf-text)] tracking-tight">
                  AI writing assistant
                </h2>
                <span className="hf-badge hf-badge-teal text-[10px]">
                  Google XYZ formula
                </span>
              </div>
              <p className="text-xs text-[var(--hf-text-secondary)] mt-0.5">
                {roleContext ? roleContext : 'Target role'}{companyContext ? ` • ${companyContext}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close AI writing assistant"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg hover:bg-[var(--hf-surface-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Original Bullet Point */}
          <div className="bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] rounded-lg p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Original bullet point
              </span>
              <span className="text-xs text-[var(--hf-text-muted)] tabular-nums">
                {originalText.length} characters
              </span>
            </div>
            <p className="text-sm text-[var(--hf-text-secondary)] italic bg-[var(--hf-surface)] p-3 rounded-lg border border-[var(--hf-border)] mt-2 leading-relaxed">
              "{originalText || 'No bullet text provided'}"
            </p>
          </div>

          {isLoading ? (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--hf-cta)] animate-spin" />
              <div>
                <h3 className="text-base font-semibold text-[var(--hf-text)]">
                  Synthesizing Google XYZ impact bullet...
                </h3>
                <p className="text-xs text-[var(--hf-text-secondary)] mt-1 max-w-sm">
                  Deconstructing accomplished [X], measured by [Y], and doing [Z] with honest metric proxies.
                </p>
              </div>
            </div>
          ) : result && result.suggestions && result.suggestions.length > 0 ? (
            <div className="space-y-5">
              {/* Suggestion Selector Tabs */}
              {result.suggestions.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-[var(--hf-text)] mb-2 block">
                    Choose strategic focus:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {result.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer min-h-[44px] ${
                          selectedIndex === idx
                            ? 'bg-[color-mix(in_srgb,var(--hf-cta)_8%,transparent)] border-[var(--hf-cta)] text-[var(--hf-text)] shadow-xs'
                            : 'bg-[var(--hf-surface)] border-[var(--hf-border)] hover:bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[var(--hf-cta)]">
                            Option {idx + 1}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getConfidenceBadge(sug.confidence_level).badge}`}>
                            {sug.confidence_level}
                          </span>
                        </div>
                        <p className="text-xs font-semibold truncate mt-1 text-[var(--hf-text)]">
                          {sug.focusType || `Variation ${idx + 1}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Suggestion Card */}
              {currentSuggestion && (
                <div className="bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg p-4 sm:p-5 space-y-4 shadow-xs">
                  {/* Top Badges: Impact Estimate & Confidence */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--hf-border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--hf-ai-teal)_10%,transparent)] text-[var(--hf-ai-teal)] flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-[var(--hf-text-secondary)] block">
                          Impact estimate
                        </span>
                        <span className="text-xs font-semibold text-[var(--hf-text)]">
                          {currentSuggestion.impact_estimate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${getConfidenceBadge(currentSuggestion.confidence_level).badge}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{getConfidenceBadge(currentSuggestion.confidence_level).label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rewritten Bullet Text Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Rewritten bullet (Google XYZ format)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeEditText)}
                        className="min-h-[32px] px-2.5 py-1 text-xs text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg border border-[var(--hf-border)] hover:bg-[var(--hf-surface-secondary)] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <textarea
                      value={activeEditText}
                      onChange={(e) => setCustomEdits({ ...customEdits, [selectedIndex]: e.target.value })}
                      className="w-full p-3.5 bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] rounded-lg text-sm text-[var(--hf-text)] focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] focus:border-transparent font-sans leading-relaxed resize-none"
                      rows={3}
                      placeholder="Fine-tune your XYZ bullet point..."
                    />
                  </div>

                  {/* XYZ Formula Dissection */}
                  {currentSuggestion.xyzBreakdown && (
                    <div className="bg-[var(--hf-surface-secondary)]/50 border border-[var(--hf-border)] rounded-lg p-3.5 space-y-2">
                      <span className="text-xs font-semibold text-[var(--hf-text)] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> XYZ formula breakdown
                      </span>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex items-start gap-2 bg-[var(--hf-surface)] p-2.5 rounded-lg border border-[var(--hf-border)]">
                          <span className="font-semibold text-[var(--hf-cta)] shrink-0 text-xs">[X] Accomplished:</span>
                          <span className="text-xs text-[var(--hf-text)] font-sans">{currentSuggestion.xyzBreakdown.accomplishedX}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-[var(--hf-surface)] p-2.5 rounded-lg border border-[var(--hf-border)]">
                          <span className="font-semibold text-[var(--hf-warning)] shrink-0 text-xs">[Y] Measured by:</span>
                          <span className="text-xs text-[var(--hf-text)] font-sans">{currentSuggestion.xyzBreakdown.measuredByY}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-[var(--hf-surface)] p-2.5 rounded-lg border border-[var(--hf-border)]">
                          <span className="font-semibold text-[var(--hf-success)] shrink-0 text-xs">[Z] By doing:</span>
                          <span className="text-xs text-[var(--hf-text)] font-sans">{currentSuggestion.xyzBreakdown.doingZ}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metric Proxy Warning & Guidance */}
                  {currentSuggestion.hasMetricProxy && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3.5 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-semibold text-amber-900 dark:text-amber-300 block text-xs">
                          Proxy metric detected • No fake numbers rule
                        </span>
                        <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed font-sans">
                          {currentSuggestion.metricGuidance || 
                            "The original bullet lacked quantitative metrics. We inserted realistic bracketed metric proxies. Be sure to replace the bracketed placeholders with your team's real production numbers."
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reasoning Block */}
                  <div className="bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] rounded-lg p-3.5">
                    <span className="text-xs font-semibold text-[var(--hf-text-secondary)] flex items-center gap-1.5 mb-1">
                      <Info className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Recruiter and ATS reasoning
                    </span>
                    <p className="text-xs text-[var(--hf-text)] leading-relaxed font-sans">
                      {currentSuggestion.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-[var(--hf-text-secondary)] text-xs">
              No suggestions generated yet. Click "Generate Suggestions" below.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--hf-border)] bg-[var(--hf-surface-secondary)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="hf-btn-secondary min-h-[44px] w-full sm:w-auto px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--hf-cta)] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Try alternative angles</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-medium text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !activeEditText}
              onClick={() => onApply(activeEditText)}
              className="hf-btn-primary min-h-[44px] w-full sm:w-auto px-5 py-2 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <span>Apply this rewrite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
