import React from 'react';
import { motion } from 'motion/react';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  type?: 'card' | 'text' | 'roadmap' | 'chat';
}

const pulseAnim = {
  opacity: [0.35, 0.75, 0.35],
};

const pulseTransition = (delay = 0) => ({
  repeat: Infinity,
  duration: 1.4,
  delay,
  ease: "easeInOut" as const,
});

export default function SkeletonLoader({ lines = 4, className = '', type = 'text' }: SkeletonLoaderProps) {
  const barClass = "bg-slate-300/50 dark:bg-slate-700/60 rounded-md";

  if (type === 'card') {
    return (
      <div className={`p-6 hf-card space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <motion.div
            animate={pulseAnim}
            transition={pulseTransition(0)}
            className={`w-10 h-10 ${barClass}`}
          />
          <div className="space-y-2 flex-1">
            <motion.div
              animate={pulseAnim}
              transition={pulseTransition(0.1)}
              className={`h-4 ${barClass} w-1/3`}
            />
            <motion.div
              animate={pulseAnim}
              transition={pulseTransition(0.2)}
              className={`h-3 ${barClass} w-1/4`}
            />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              animate={pulseAnim}
              transition={pulseTransition(i * 0.12)}
              className={`h-3 ${barClass} ${
                i === lines - 1 ? 'w-1/2' : i % 2 === 0 ? 'w-full' : 'w-5/6'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'roadmap') {
    return (
      <div className={`space-y-5 ${className}`}>
        {[1, 2, 3].map((section) => (
          <div key={section} className="p-5 hf-card space-y-4">
            <motion.div
              animate={pulseAnim}
              transition={pulseTransition(section * 0.1)}
              className={`h-4 ${barClass} w-1/2`}
            />
            <div className="flex gap-2">
              {[1, 2, 3].map((k) => (
                <motion.div
                  key={k}
                  animate={pulseAnim}
                  transition={pulseTransition(k * 0.1)}
                  className={`h-5 w-20 ${barClass}`}
                />
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <motion.div
                animate={pulseAnim}
                transition={pulseTransition(0.2)}
                className={`h-14 ${barClass}`}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-5 hf-card ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          animate={pulseAnim}
          transition={pulseTransition(i * 0.1)}
          className={`h-3.5 ${barClass} ${
            i === lines - 1 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-5/6'
          }`}
        />
      ))}
    </div>
  );
}
