import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Activity, 
  FileText, 
  Mic, 
  Briefcase, 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import { CareerHealthScoreData, CategoryHealthMetric } from '../types/careerHealthScore';

interface CareerHealthScoreProps {
  scoreData: CareerHealthScoreData;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  className?: string;
}

export default function CareerHealthScore({
  scoreData,
  onRefresh,
  isRefreshing = false,
  className = ''
}: CareerHealthScoreProps) {
  const navigate = useNavigate();
  const { totalScore, tier, ratingHeadline, honestAssessment, primaryBottleneckId, categoriesList } = scoreData;

  const getTierBadgeStyle = () => {
    switch (tier) {
      case 'Elite Readiness':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'Competitive Candidate':
        return 'bg-accent/10 border-accent/30 text-accent';
      case 'Developing Foundation':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    }
  };

  const getPillarIcon = (id: CategoryHealthMetric['id']) => {
    switch (id) {
      case 'resume':
        return FileText;
      case 'interview':
        return Mic;
      case 'application':
        return Briefcase;
      case 'skills':
        return GraduationCap;
    }
  };

  // SVG Gauge calculations
  const radius = 64;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (totalScore / 100) * circumference;

  return (
    <section 
      id="career-health-score-section"
      aria-label="Unified Career Health Score"
      className={`bg-surface border border-accent/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl ${className}`}
    >
      {/* Background Accent Mesh */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header & Telemetry Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent">
              <Activity className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">
              AI SYSTEM INTEGRATOR • UNIFIED TELEMETRY
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${getTierBadgeStyle()}`}>
              {tier}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-sans">
            Unified Career Health Score
          </h2>
          <p className="text-ink-dim text-xs sm:text-sm mt-1 max-w-2xl">
            Aggregated cross-module index weighted across 4 core dimensions (25% each): Resume Strength, Interview Readiness, Application Activity, and Skill Growth.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Recalculate Career Health Score"
            className="self-start lg:self-center px-4 py-2 bg-surface-light hover:bg-surface border border-border hover:border-accent/40 rounded-xl text-xs font-mono font-bold text-ink transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing Telemetry...' : 'Recalculate Score'}</span>
          </button>
        )}
      </div>

      {/* Hero Overview Block: Circular Score Gauge + Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center relative z-10">
        {/* Left: Interactive Circular Score Meter */}
        <div className="lg:col-span-4 bg-background/80 border border-border/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative">
          <div className="relative w-40 h-40 flex items-center justify-center my-2">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="rotate-[-90deg] transition-all duration-1000 ease-out"
            >
              {/* Background Track */}
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                className="text-border/60"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* Animated Progress Stroke */}
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                className="text-accent transition-all duration-1000 ease-out"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>

            {/* Score in Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-extrabold font-mono text-ink tracking-tight">
                {totalScore}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink-dim mt-0.5">
                / 100 PTS
              </span>
            </div>
          </div>

          <div className="mt-3">
            <h3 className="text-base font-bold text-ink tracking-tight font-mono">{ratingHeadline}</h3>
            <p className="text-[11px] text-ink-dim mt-1 font-mono">
              Composite index from 4 verified pillars (25 pts max each).
            </p>
          </div>
        </div>

        {/* Right: Honest Assessment Diagnosis & Weight Formula */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div className="bg-background/80 border border-border/80 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest font-mono">
                SYSTEM INTEGRATOR DIAGNOSIS
              </span>
            </div>
            <p className="text-sm sm:text-base text-ink font-medium leading-relaxed font-sans">
              "{honestAssessment}"
            </p>
          </div>

          {/* Formula Transparency Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoriesList.map((cat) => (
              <div 
                key={cat.id} 
                className={`p-3 rounded-xl border transition-all ${
                  cat.id === primaryBottleneckId
                    ? 'bg-accent/5 border-accent/40'
                    : 'bg-background/50 border-border/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono text-ink-dim font-bold uppercase truncate">{cat.name}</span>
                  {cat.id === primaryBottleneckId && (
                    <span className="text-[8px] font-mono font-bold text-accent bg-accent/10 px-1.5 py-0.2 rounded shrink-0">
                      BOTTLENECK
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold font-mono text-ink">
                    {cat.hasData ? `${cat.rawScore}%` : '0%'}
                  </span>
                  <span className="text-[10px] font-mono text-ink-dim">
                    {cat.weightedScore}/25 pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The 4 Core Dimension Cards (25% Each) */}
      <div className="space-y-4 pt-4 border-t border-border/80 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-ink uppercase tracking-widest font-mono flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-accent" /> 4-Pillar Detailed Breakdown & Action Plan
          </h3>
          <span className="text-[10px] font-mono text-ink-dim">
            25% Weight per Module
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoriesList.map((category) => {
            const Icon = getPillarIcon(category.id);
            const isBottleneck = category.id === primaryBottleneckId;

            return (
              <div
                key={category.id}
                className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                  category.hasData
                    ? isBottleneck
                      ? 'bg-surface-light border-accent/40 hover:border-accent'
                      : 'bg-surface-light border-border hover:border-accent/30'
                    : 'bg-background/60 border-dashed border-border/90'
                }`}
              >
                <div>
                  {/* Card Header: Icon, Name, Status, Score */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        category.hasData 
                          ? 'bg-accent/10 border-accent/20 text-accent' 
                          : 'bg-surface border-border text-ink-dim'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-ink font-sans tracking-tight">
                            {category.name}
                          </h4>
                          <span className="text-[9px] font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-ink-dim">
                            25% Weight
                          </span>
                        </div>
                        <p className="text-xs text-ink-dim font-mono mt-0.5">
                          {category.statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold font-mono text-ink">
                        {category.hasData ? `${category.rawScore}` : '0'}<span className="text-xs text-ink-dim font-normal">/100</span>
                      </div>
                      <span className="text-[10px] font-mono text-accent font-bold">
                        +{category.weightedScore} pts
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-background border border-border/80 h-2 rounded-full overflow-hidden mb-4 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        category.hasData ? 'bg-accent' : 'bg-transparent'
                      }`}
                      style={{ width: `${category.hasData ? category.rawScore : 0}%` }}
                    />
                  </div>

                  {/* Category Action or Onboarding Step */}
                  <div className="mb-4">
                    {category.hasData ? (
                      <div className="bg-background/90 border border-border/80 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider">
                            Single Improvement Action
                          </span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed font-medium">
                          {category.improvementAction}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                            Onboarding Step Required (0 Pts)
                          </span>
                        </div>
                        <p className="text-xs text-ink-dim leading-relaxed">
                          {category.onboardingStep}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(category.ctaLink)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      category.hasData
                        ? 'bg-surface hover:bg-surface-light border border-border hover:border-accent/40 text-ink shadow-sm'
                        : 'bg-accent text-black hover:bg-accent/90 shadow-md shadow-accent/15'
                    }`}
                  >
                    <span>{category.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
