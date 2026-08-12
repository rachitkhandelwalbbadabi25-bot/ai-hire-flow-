import React from 'react';
import { useSystemOS } from '../context/SystemOSContext';
import { Cpu, Sparkles, FileText, Briefcase, GraduationCap, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface SmartContextChipsProps {
  onSelectRole?: (role: string) => void;
  onSelectSkill?: (skill: string) => void;
  onSelectJob?: (companyRole: string) => void;
  title?: string;
  className?: string;
}

export default function SmartContextChips({
  onSelectRole,
  onSelectSkill,
  onSelectJob,
  title = "Unified System OS Context",
  className = ""
}: SmartContextChipsProps) {
  const {
    latestResume,
    trackedJobs,
    latestRoadmap,
    activeTargetRole,
    allMissingSkills,
    smartSuggestions
  } = useSystemOS();

  const hasAnyData = Boolean(latestResume || trackedJobs.length > 0 || latestRoadmap);

  if (!hasAnyData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface/90 border border-accent/25 rounded-2xl p-4 shadow-md relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-accent/10 text-accent rounded-lg">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          Synced Across Screens
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Active Target Role Chip */}
        {activeTargetRole && (
          <button
            type="button"
            onClick={() => onSelectRole && onSelectRole(activeTargetRole)}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl text-xs font-mono font-bold text-accent transition-all cursor-pointer"
            title="Auto-fill target role from your system context"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Target Role: {activeTargetRole}</span>
            {onSelectRole && <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        )}

        {/* Master Resume Score Chip */}
        {latestResume && (
          <button
            type="button"
            onClick={() => {
              if (onSelectRole && latestResume.targetRole) onSelectRole(latestResume.targetRole);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light border border-border/80 hover:border-accent/40 rounded-xl text-xs font-mono font-semibold text-ink transition-all cursor-pointer"
            title={`Score: ${latestResume.score}% • Evaluated Resume Context`}
          >
            <FileText className="w-3.5 h-3.5 text-accent" />
            <span>Master Resume: {latestResume.score}% ATS Score</span>
          </button>
        )}

        {/* Missing Skill Gap Chips */}
        {allMissingSkills.slice(0, 3).map((skill, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSkill && onSelectSkill(skill)}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-mono font-medium text-amber-500 transition-all cursor-pointer"
            title="Auto-fill skill gap identified from resume audit"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Skill Gap: {skill}</span>
            {onSelectSkill && <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        ))}

        {/* Tracked Applications Chips */}
        {trackedJobs.slice(0, 2).map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelectJob && onSelectJob(`${job.role} at ${job.company}`)}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-mono font-medium text-indigo-400 transition-all cursor-pointer"
            title={`Status: ${job.status}`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Tracked: {job.company} ({job.role})</span>
            {onSelectJob && <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
