import React from 'react';
import { motion } from 'motion/react';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  type?: 'card' | 'text' | 'roadmap' | 'chat';
}

export default function SkeletonLoader({ lines = 4, className = '', type = 'text' }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <div className={`p-6 bg-surface/50 border border-border rounded-3xl space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="w-10 h-10 bg-white/10 rounded-xl"
          />
          <div className="space-y-2 flex-1">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: 0.1 }}
              className="h-4 bg-white/10 rounded w-1/3"
            />
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
              className="h-3 bg-white/10 rounded w-1/4"
            />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.15 }}
              className={`h-3 bg-white/10 rounded ${
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
      <div className={`space-y-6 ${className}`}>
        {[1, 2, 3].map((section) => (
          <div key={section} className="p-6 bg-surface/50 border border-border rounded-3xl space-y-4">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: section * 0.1 }}
              className="h-5 bg-white/10 rounded w-1/2"
            />
            <div className="flex gap-2">
              {[1, 2, 3].map((k) => (
                <motion.div
                  key={k}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay: k * 0.1 }}
                  className="h-6 w-20 bg-white/10 rounded-full"
                />
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="h-16 bg-white/10 rounded-2xl"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 bg-surface/30 border border-border/60 rounded-2xl ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
          className={`h-4 bg-white/10 rounded ${
            i === lines - 1 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-5/6'
          }`}
        />
      ))}
    </div>
  );
}
