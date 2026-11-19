import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { motion, useInView, useScroll, useSpring } from 'motion/react';
import { cn } from '../lib/utils';

/**
 * 1. SpotlightCard — Mouse-tracking radial glow + spring hover elevation (Linear / Stripe style)
 */
interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
  onClick?: () => void;
  key?: React.Key;
}

export function SpotlightCard({
  children,
  className = '',
  hoverLift = true,
  onClick
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onClick={onClick}
      whileHover={hoverLift ? { y: -3, scale: 1.004 } : undefined}
      whileTap={onClick ? { scale: 0.992 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className={cn(
        'hf-card hf-card-interactive relative overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(460px circle at ${position.x}px ${position.y}px, var(--hf-spotlight), transparent 48%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-0"
        style={{
          opacity: opacity * 0.75,
          background: `radial-gradient(240px circle at ${position.x}px ${position.y}px, rgba(var(--accent-rgb), 0.14), transparent 60%)`,
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1.5px',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

/**
 * 2. AnimatedCounter — Smooth number count-up when entering the viewport
 */
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 900,
  suffix = '',
  prefix = '',
  className = ''
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let startTime: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, isInView]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

/**
 * 3. AnimatedCircularGauge — Radial SVG progress ring with spring stroke animation
 */
interface AnimatedCircularGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function AnimatedCircularGauge({
  score,
  size = 88,
  strokeWidth = 7,
  label,
  sublabel,
  className = ''
}: AnimatedCircularGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  const strokeColor =
    clampedScore >= 80
      ? 'var(--hf-success)'
      : clampedScore >= 60
      ? 'var(--hf-cta)'
      : clampedScore > 0
      ? 'var(--hf-warning)'
      : 'var(--hf-border)';

  return (
    <div ref={ref} className={cn('inline-flex items-center gap-3.5', className)}>
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--hf-border)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isInView ? offset : circumference }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tracking-tight text-[var(--hf-text)] tabular-nums leading-none">
            {clampedScore > 0 ? <AnimatedCounter value={clampedScore} /> : '—'}
          </span>
          <span className="text-[10px] font-medium text-[var(--hf-text-muted)] mt-0.5">/100</span>
        </div>
      </div>

      {(label || sublabel) && (
        <div className="min-w-0">
          {label && <p className="text-xs font-semibold text-[var(--hf-text)]">{label}</p>}
          {sublabel && <p className="text-[11px] text-[var(--hf-text-secondary)] mt-0.5">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * 4. FadeInSection — Scroll-triggered viewport reveal with subtle spring physics
 */
interface FadeInSectionProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  key?: React.Key;
}

export function FadeInSection({
  children,
  delay = 0,
  y = 16,
  className = ''
}: FadeInSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 5. ScrollProgressBar — Ultra-thin spring-smoothed reading progress bar
 */
export function ScrollProgressBar({ className = '' }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className={cn(
        'h-[2px] w-full origin-left bg-[var(--hf-cta)] pointer-events-none',
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * 6. StaggerContainer & StaggerItem — Orchestrated viewport grid reveals
 */
export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.06,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
