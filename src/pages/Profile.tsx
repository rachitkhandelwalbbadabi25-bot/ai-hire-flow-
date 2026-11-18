import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User as UserIcon, LogOut, Zap, Shield, Sparkles, Award, Flame, Star, Coins, 
  Loader2, CheckCircle2, Lock, ArrowRight, ExternalLink, TrendingUp, Target, 
  Compass, FileText, Copy, Check, Info, ShieldCheck, Mail
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { usePlan, DEFAULT_CREDIT_COSTS } from '../context/PlanContext';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, isAdmin, isPremium } = useAuth();
  const { creditWallet } = usePlan();
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!user) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-xs font-mono text-ink-dim uppercase tracking-wider animate-pulse">Loading Profile Dashboard...</p>
        </div>
      </div>
    );
  }

  const planDisplay = isAdmin ? 'System Administrator' : isPremium ? 'Premium Member' : 'Free Tier Member';
  const xp = creditWallet?.xp ?? 0;
  const currentStreak = creditWallet?.streak ?? 1;

  // Level Progression Calculation using the exact engine thresholds from PlanContext
  // Level 1: <100, Level 2: 100-299, Level 3: 300-599, Level 4: 600-999, Level 5: 1000+
  const getLevelDetails = (currentXp: number) => {
    if (currentXp >= 1000) {
      return { 
        level: 5, 
        rank: 'Career Architect', 
        minXp: 1000, 
        nextXp: 1000, 
        progress: 100, 
        remaining: 0,
        nextRank: 'Max Level Reached'
      };
    } else if (currentXp >= 600) {
      const prog = Math.min(100, Math.round(((currentXp - 600) / 400) * 100));
      return { 
        level: 4, 
        rank: 'Interview Warrior', 
        minXp: 600, 
        nextXp: 1000, 
        progress: prog, 
        remaining: 1000 - currentXp,
        nextRank: 'Career Architect'
      };
    } else if (currentXp >= 300) {
      const prog = Math.min(100, Math.round(((currentXp - 300) / 300) * 100));
      return { 
        level: 3, 
        rank: 'Resume Ninja', 
        minXp: 300, 
        nextXp: 600, 
        progress: prog, 
        remaining: 600 - currentXp,
        nextRank: 'Interview Warrior'
      };
    } else if (currentXp >= 100) {
      const prog = Math.min(100, Math.round(((currentXp - 100) / 200) * 100));
      return { 
        level: 2, 
        rank: 'Career Explorer', 
        minXp: 100, 
        nextXp: 300, 
        progress: prog, 
        remaining: 300 - currentXp,
        nextRank: 'Resume Ninja'
      };
    } else {
      const prog = Math.min(100, Math.round((currentXp / 100) * 100));
      return { 
        level: 1, 
        rank: 'Career Beginner', 
        minXp: 0, 
        nextXp: 100, 
        progress: prog, 
        remaining: 100 - currentXp,
        nextRank: 'Career Explorer'
      };
    }
  };

  const levelInfo = getLevelDetails(xp);
  const userLevel = creditWallet?.level || levelInfo.level;

  // Available Profile Badges based on accomplishments with requirements and rewards
  const premiumBadges = [
    { 
      id: 'verified', 
      label: 'Verified Candidate', 
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', 
      req: 'Verify your account email address', 
      reward: '100 XP', 
      icon: CheckCircle2 
    },
    { 
      id: 'resume', 
      label: 'Resume Master', 
      color: 'border-blue-500/30 text-blue-400 bg-blue-500/10', 
      req: 'Analyze 3 resumes in AI Resume Analyzer', 
      reward: '250 XP', 
      icon: FileText 
    },
    { 
      id: 'interview', 
      label: 'Interview Champion', 
      color: 'border-purple-500/30 text-purple-400 bg-purple-500/10', 
      req: 'Complete 1 mock interview session', 
      reward: '300 XP', 
      icon: Target 
    },
    { 
      id: 'explorer', 
      label: 'Career Explorer', 
      color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10', 
      req: 'Generate a customized learning roadmap', 
      reward: '200 XP', 
      icon: Compass 
    },
    { 
      id: 'ats', 
      label: 'ATS Expert', 
      color: 'border-rose-500/30 text-rose-400 bg-rose-500/10', 
      req: 'Score 80+ on any resume optimization scan', 
      reward: '500 XP', 
      icon: Zap 
    },
    { 
      id: 'premium', 
      label: 'Premium Member', 
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/10', 
      req: 'Upgrade to Pro or Elite plan tier', 
      reward: '1,000 XP', 
      icon: Sparkles 
    },
    { 
      id: 'performer', 
      label: 'Top Performer', 
      color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10', 
      req: 'Reach Level 3 or higher', 
      reward: '500 XP', 
      icon: TrendingUp 
    },
    { 
      id: 'recruiter', 
      label: 'Recruiter Favorite', 
      color: 'border-pink-500/30 text-pink-400 bg-pink-500/10', 
      req: 'Generate 5 referral pitches in Outreach Hub', 
      reward: '250 XP', 
      icon: Award 
    }
  ];

  // User unlocked badges
  const unlockedBadges = creditWallet?.unlockedBadges || ['Verified Candidate'];

  const filteredBadges = premiumBadges.filter(badge => {
    const isUnlocked = unlockedBadges.some(
      b => b.toLowerCase().includes(badge.label.toLowerCase()) || badge.label.toLowerCase().includes(b.toLowerCase())
    );
    if (badgeFilter === 'unlocked') return isUnlocked;
    if (badgeFilter === 'locked') return !isUnlocked;
    return true;
  });

  const handleCopyReferral = () => {
    if (creditWallet?.referralCode) {
      navigator.clipboard.writeText(creditWallet.referralCode);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  // Milestone tier markers
  const milestones = [
    { lvl: 1, title: 'Beginner', xpReq: 0 },
    { lvl: 2, title: 'Explorer', xpReq: 100 },
    { lvl: 3, title: 'Ninja', xpReq: 300 },
    { lvl: 4, title: 'Warrior', xpReq: 600 },
    { lvl: 5, title: 'Architect', xpReq: 1000 }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2 space-y-8">
      
      {/* ========================================================================= */}
      {/* 1. ACCOUNT PROFILE HEADER: Identity, Status, Level & Actions             */}
      {/* ========================================================================= */}
      <div className="hf-card p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Avatar and Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Level Overlay */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User avatar'} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-[var(--hf-text-secondary)]" />
                )}
              </div>
              {/* Level Pill Overlay */}
              <div className="absolute -bottom-2 -right-2 bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text)] text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3 text-[var(--hf-warning)] fill-[var(--hf-warning)]" />
                <span>Level {userLevel}</span>
              </div>
            </div>

            {/* Candidate Metadata */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--hf-cta)]">
                  09 // CANDIDATE PROFILE
                </span>
                <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider border-[1.5px] border-[var(--hf-ink-border)] shadow-[1px_1px_0px_var(--hf-ink-border)] ${
                  isAdmin 
                    ? 'bg-[var(--hf-error)]/10 text-[var(--hf-error)]' 
                    : isPremium 
                    ? 'bg-[var(--hf-cta)]/10 text-[var(--hf-cta)]' 
                    : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-secondary)]'
                }`}>
                  {planDisplay}
                </span>
              </div>

              <h1 className="font-serif-display text-3xl sm:text-4xl font-normal text-[var(--hf-text)] tracking-tight">
                {user.displayName || 'Candidate'}
              </h1>

              <div className="flex items-center gap-3 text-sm text-[var(--hf-text-secondary)] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[var(--hf-text-secondary)]" />
                  <span>{user.email}</span>
                </span>
                <span className="text-[var(--hf-border)]">•</span>
                <span>
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[var(--hf-success)] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified account
                    </span>
                  ) : (
                    <span>Standard account</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0 flex-wrap">
            <Link
              to="/credits"
              className="hf-btn-secondary min-h-[44px] px-4 py-2.5 text-sm inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
            >
              <Coins className="w-4 h-4 text-[var(--hf-cta)]" />
              <span>Credit wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => signOut(auth)}
              className="hf-btn-secondary min-h-[44px] px-4 py-2.5 text-sm inline-flex items-center gap-2 text-[var(--hf-error)] hover:border-[var(--hf-error)]/40 hover:bg-[var(--hf-error)]/5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-error)]"
              title="Sign out of your account"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS STRIP: 4 Metrics                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total XP */}
        <div className="hf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--hf-text-secondary)]">Total experience</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-warning)]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight tabular-nums">{xp}</span>
            <span className="text-xs font-semibold text-[var(--hf-text-secondary)]">XP</span>
          </div>
          <p className="text-xs text-[var(--hf-text-secondary)] mt-2 truncate">
            Rank: <span className="font-semibold text-[var(--hf-text)]">{levelInfo.rank}</span>
          </p>
        </div>

        {/* Metric 2: Current Level */}
        <div className="hf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--hf-text-secondary)]">Current level</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight tabular-nums">Level {userLevel}</span>
          </div>
          <p className="text-xs text-[var(--hf-cta)] font-medium mt-2 tabular-nums">
            {levelInfo.progress}% to next tier
          </p>
        </div>

        {/* Metric 3: Active Streak */}
        <div className="hf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--hf-text-secondary)]">Daily streak</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-warning)]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight tabular-nums">{currentStreak}</span>
            <span className="text-xs font-semibold text-[var(--hf-text-secondary)]">{currentStreak === 1 ? 'day' : 'days'}</span>
          </div>
          <p className="text-xs text-[var(--hf-text-secondary)] mt-2">
            Consecutive login days
          </p>
        </div>

        {/* Metric 4: Badges Unlocked */}
        <div className="hf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--hf-text-secondary)]">Badges unlocked</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight tabular-nums">{unlockedBadges.length}</span>
            <span className="text-xs font-semibold text-[var(--hf-text-secondary)] tabular-nums">/ {premiumBadges.length}</span>
          </div>
          <p className="text-xs text-[var(--hf-text-secondary)] mt-2 tabular-nums">
            {Math.round((unlockedBadges.length / premiumBadges.length) * 100)}% completed
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT GRID: 8 Cols Left (XP + Badges), 4 Cols Right   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: XP Progression Engine & Badges Showcase                    */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-8">

          {/* SECTION A: Career Progression & Milestones */}
          <div className="hf-card p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hf-border)] pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[var(--hf-cta)]" />
                  <span className="text-xs font-semibold text-[var(--hf-cta)]">
                    Career progression
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--hf-text)] tracking-tight">
                  Experience & rank milestones
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-sm font-semibold text-[var(--hf-text)] block tabular-nums">
                  {levelInfo.remaining > 0 ? `${levelInfo.remaining} XP until ${levelInfo.nextRank}` : 'Maximum level achieved'}
                </span>
                <span className="text-xs text-[var(--hf-text-secondary)] block tabular-nums">
                  Level {userLevel} of 5 &bull; {xp} XP accumulated
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2.5 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--hf-text)] flex items-center gap-2">
                  Level {userLevel}: {levelInfo.rank}
                </span>
                <span className="text-[var(--hf-cta)] font-semibold tabular-nums">
                  {levelInfo.progress}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-[var(--hf-surface-secondary)] rounded-full overflow-hidden border border-[var(--hf-border)]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-[var(--hf-cta)]"
                />
              </div>
            </div>

            {/* 5 Milestone Step Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
              {milestones.map((m) => {
                const isPassed = userLevel > m.lvl || (userLevel === m.lvl && xp >= m.xpReq);
                const isCurrent = userLevel === m.lvl;
                return (
                  <div 
                    key={m.lvl} 
                    className={`p-3 rounded-xl border transition-colors flex flex-col justify-between ${
                      m.lvl === 5 ? 'col-span-2 sm:col-span-1' : ''
                    } ${
                      isCurrent 
                        ? 'bg-[var(--hf-cta)]/10 border-[var(--hf-cta)] text-[var(--hf-text)] shadow-sm' 
                        : isPassed 
                        ? 'bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] text-[var(--hf-text)]' 
                        : 'bg-[var(--hf-surface)]/40 border-[var(--hf-border)]/60 text-[var(--hf-text-muted)] opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-semibold ${
                          isCurrent ? 'text-[var(--hf-cta)]' : isPassed ? 'text-[var(--hf-text-secondary)]' : 'text-[var(--hf-text-muted)]'
                        }`}>
                          Level {m.lvl}
                        </span>
                        <span className="text-xs text-[var(--hf-text-muted)] tabular-nums">
                          {m.xpReq} XP
                        </span>
                      </div>
                      <span className="text-sm font-bold block text-[var(--hf-text)] truncate my-0.5">
                        {m.title}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[var(--hf-border)]/40">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--hf-cta)]">
                          Current rank
                        </span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--hf-success)]">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Reached
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--hf-text-muted)]">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION B: Badges & Rewards Showcase */}
          <div className="hf-card p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hf-border)] pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-[var(--hf-cta)]" />
                  <span className="text-xs font-semibold text-[var(--hf-cta)]">
                    Achievements
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--hf-text)] tracking-tight">
                  Profile badges
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-1 rounded-xl flex-wrap">
                <button
                  type="button"
                  onClick={() => setBadgeFilter('all')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] ${
                    badgeFilter === 'all' 
                      ? 'bg-[var(--hf-cta)] text-white shadow-sm' 
                      : 'text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface)]'
                  }`}
                >
                  All ({premiumBadges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeFilter('unlocked')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] ${
                    badgeFilter === 'unlocked' 
                      ? 'bg-[var(--hf-cta)] text-white shadow-sm' 
                      : 'text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface)]'
                  }`}
                >
                  Unlocked ({unlockedBadges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeFilter('locked')}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] ${
                    badgeFilter === 'locked' 
                      ? 'bg-[var(--hf-cta)] text-white shadow-sm' 
                      : 'text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface)]'
                  }`}
                >
                  Locked ({Math.max(0, premiumBadges.length - unlockedBadges.length)})
                </button>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredBadges.map((badge) => {
                const isUnlocked = unlockedBadges.some(
                  b => b.toLowerCase().includes(badge.label.toLowerCase()) || badge.label.toLowerCase().includes(b.toLowerCase())
                );
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                      isUnlocked
                        ? 'bg-[var(--hf-surface)] border-[var(--hf-border)] shadow-sm'
                        : 'bg-[var(--hf-surface-secondary)]/40 border-[var(--hf-border)]/60 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Badge Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                            isUnlocked 
                              ? 'bg-[var(--hf-cta)]/10 border-[var(--hf-cta)]/20 text-[var(--hf-cta)]' 
                              : 'bg-[var(--hf-surface-secondary)] border-[var(--hf-border)] text-[var(--hf-text-muted)]'
                          }`}>
                            <BadgeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--hf-text)]">
                              {badge.label}
                            </h3>
                            <span className="text-xs font-medium text-[var(--hf-warning)] tabular-nums">
                              +{badge.reward}
                            </span>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${
                          isUnlocked 
                            ? 'bg-[var(--hf-success)]/10 text-[var(--hf-success)] border-[var(--hf-success)]/20 inline-flex items-center gap-1' 
                            : 'bg-[var(--hf-surface-secondary)] text-[var(--hf-text-muted)] border-[var(--hf-border)] inline-flex items-center gap-1'
                        }`}>
                          {isUnlocked ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Unlocked
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Locked
                            </>
                          )}
                        </span>
                      </div>

                      {/* Requirement description */}
                      <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed mb-4">
                        {badge.req}
                      </p>
                    </div>

                    {/* Bottom Indicator */}
                    <div className="pt-2 border-t border-[var(--hf-border)]/50 flex items-center justify-between text-xs font-medium">
                      {isUnlocked ? (
                        <span className="text-[var(--hf-success)]">Completed</span>
                      ) : (
                        <span className="text-[var(--hf-text-muted)]">In progress</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Credit Wallet & Account Governance                        */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-6">

          {/* CARD 1: Credit Wallet */}
          <div className="hf-card p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-[var(--hf-cta)]">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[var(--hf-cta)] block">
                  AI usage
                </span>
                <h2 className="text-base font-bold text-[var(--hf-text)] tracking-tight">
                  Credit balance
                </h2>
              </div>
            </div>

            {/* Balance Big Readout */}
            <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl p-5 mb-5 text-center">
              <span className="text-xs text-[var(--hf-text-secondary)] block mb-1">
                Available balance
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-[var(--hf-text)] tracking-tight tabular-nums">
                  {creditWallet?.balance ?? 250}
                </span>
                <span className="text-sm font-semibold text-[var(--hf-cta)]">
                  credits
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[var(--hf-border)] mt-4 pt-3 text-xs">
                <div>
                  <span className="text-[var(--hf-text-secondary)] block">Monthly usage</span>
                  <span className="font-semibold text-[var(--hf-text)] tabular-nums">{creditWallet?.usedThisMonth ?? 0} used</span>
                </div>
                <div>
                  <span className="text-[var(--hf-text-secondary)] block">Total granted</span>
                  <span className="font-semibold text-[var(--hf-text)] tabular-nums">{creditWallet?.totalEarned ?? creditWallet?.balance ?? 250} earned</span>
                </div>
              </div>
            </div>

            {/* Manage Wallet CTA */}
            <Link
              to="/credits"
              className="hf-btn-primary w-full min-h-[44px] py-2.5 px-4 text-sm inline-flex items-center justify-center gap-2 mb-5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
            >
              <Coins className="w-4 h-4" />
              <span>Manage credits & refill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Quick Credit Cost Cheat-Sheet */}
            <div className="border-t border-[var(--hf-border)] pt-4">
              <h3 className="text-xs font-semibold text-[var(--hf-text-secondary)] mb-2.5">
                Credit cost per action
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[var(--hf-border)]/40">
                  <span className="text-[var(--hf-text-secondary)]">Resume analysis</span>
                  <span className="font-semibold text-[var(--hf-cta)] tabular-nums">{DEFAULT_CREDIT_COSTS.resumeScan} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--hf-border)]/40">
                  <span className="text-[var(--hf-text-secondary)]">ATS optimization</span>
                  <span className="font-semibold text-[var(--hf-cta)] tabular-nums">{DEFAULT_CREDIT_COSTS.atsOptimization} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--hf-border)]/40">
                  <span className="text-[var(--hf-text-secondary)]">Interactive mock interview</span>
                  <span className="font-semibold text-[var(--hf-cta)] tabular-nums">{DEFAULT_CREDIT_COSTS.interviewSession} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--hf-border)]/40">
                  <span className="text-[var(--hf-text-secondary)]">Campus placement drill</span>
                  <span className="font-semibold text-[var(--hf-cta)] tabular-nums">{DEFAULT_CREDIT_COSTS.jobMatchAnalysis} cr</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--hf-text-secondary)]">Learning path roadmap</span>
                  <span className="font-semibold text-[var(--hf-cta)] tabular-nums">{DEFAULT_CREDIT_COSTS.careerRoadmap} cr</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Plan Tier & Security Governance */}
          <div className="hf-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-[var(--hf-cta)]" />
              <h3 className="text-sm font-bold text-[var(--hf-text)]">
                Account membership
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[var(--hf-text-secondary)]">Active plan</span>
                  <span className={`text-xs font-semibold ${isAdmin ? 'text-[var(--hf-error)]' : isPremium ? 'text-[var(--hf-cta)]' : 'text-[var(--hf-text)]'}`}>
                    {isAdmin ? 'Administrator' : isPremium ? 'Premium' : 'Free tier'}
                  </span>
                </div>
                <p className="text-sm text-[var(--hf-text)] font-bold mb-1.5">{planDisplay}</p>
                <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                  {isAdmin 
                    ? 'Full administrative access and testing controls enabled.' 
                    : isPremium 
                    ? 'Full access to all AI career tools with high monthly credit allocations.' 
                    : 'Standard monthly credit allocation for core career tools.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)]">
                <span className="text-[var(--hf-text-secondary)]">Email status</span>
                <span className={`font-semibold inline-flex items-center gap-1 ${user.emailVerified ? 'text-[var(--hf-success)]' : 'text-[var(--hf-warning)]'}`}>
                  {user.emailVerified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </>
                  ) : (
                    'Standard account'
                  )}
                </span>
              </div>

              <Link
                to="/credits"
                className="hf-btn-secondary w-full min-h-[44px] py-2 px-3 text-xs inline-flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
              >
                <span>Change plan tier</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* CARD 3: Referral Network Code */}
          {creditWallet?.referralCode && (
            <div className="hf-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[var(--hf-cta)]" />
                <h3 className="text-sm font-bold text-[var(--hf-text)]">
                  Referral code
                </h3>
              </div>
              <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed mb-3">
                Share your referral code with peers. Earn bonus credits when they join.
              </p>
              <div className="flex items-center gap-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] p-1.5 rounded-xl">
                <code className="flex-1 text-sm font-semibold text-[var(--hf-cta)] px-2 font-mono tracking-wide">
                  {creditWallet.referralCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="hf-btn-secondary min-h-[44px] px-3.5 py-2 text-xs inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                >
                  {copiedReferral ? (
                    <>
                      <Check className="w-4 h-4 text-[var(--hf-success)]" />
                      <span className="text-[var(--hf-success)] font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

