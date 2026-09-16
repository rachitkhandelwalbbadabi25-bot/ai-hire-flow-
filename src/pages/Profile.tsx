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
      {/* 1. HERO COMMAND HEADER: Identity, Status, Level & Actions                */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#14181f] to-[#0c0d10] border border-white/[0.08] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/[0.04] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Left: Avatar and Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Tech-accented Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-gradient-to-br from-accent/40 via-white/10 to-transparent border border-white/15 shadow-[0_0_20px_rgba(0,255,65,0.12)]">
                <div className="w-full h-full rounded-xl bg-[#12141a] overflow-hidden flex items-center justify-center">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Candidate Avatar'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-accent/80" />
                  )}
                </div>
              </div>
              {/* Level Pill Overlay */}
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg border border-black/60 font-mono flex items-center gap-1">
                <Zap className="w-3 h-3 fill-black" />
                LVL {userLevel}
              </div>
            </div>

            {/* Candidate Metadata */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-accent tracking-[0.2em] uppercase">
                  Candidate Dossier //
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border bg-accent/10 text-accent border-accent/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Online & Active
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  isAdmin 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                    : isPremium 
                    ? 'bg-accent/10 text-accent border-accent/30' 
                    : 'bg-white/5 text-ink-dim border-white/10'
                }`}>
                  {planDisplay}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {user.displayName || 'Anonymous Candidate'}
              </h1>

              <div className="flex items-center gap-3 text-xs text-ink-dim font-mono flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-accent/70" />
                  {user.email}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-white/60">
                  {user.emailVerified ? 'Verified Account' : 'Standard Authentication'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
            <Link
              to="/credits"
              className="px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent text-accent font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,65,0.08)] cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>Credit Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => signOut(auth)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title="End active session securely"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS STRIP: 4 High-Impact Metrics                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total XP */}
        <div className="bg-[#0e1015] border border-white/[0.08] hover:border-accent/40 rounded-xl p-5 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider">Total Experience</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">{xp}</span>
            <span className="text-xs font-mono font-bold text-amber-400">XP</span>
          </div>
          <p className="text-[11px] font-mono text-ink-dim mt-2 truncate">
            Rank: <span className="text-white font-semibold">{levelInfo.rank}</span>
          </p>
        </div>

        {/* Metric 2: Current Level */}
        <div className="bg-[#0e1015] border border-white/[0.08] hover:border-accent/40 rounded-xl p-5 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider">Current Level</span>
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">Level {userLevel}</span>
          </div>
          <p className="text-[11px] font-mono text-accent mt-2">
            {levelInfo.progress}% to next tier
          </p>
        </div>

        {/* Metric 3: Active Streak */}
        <div className="bg-[#0e1015] border border-white/[0.08] hover:border-accent/40 rounded-xl p-5 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider">Daily Streak</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4 fill-orange-500/30 text-orange-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">{currentStreak}</span>
            <span className="text-xs font-mono font-bold text-orange-400">Days</span>
          </div>
          <p className="text-[11px] font-mono text-ink-dim mt-2">
            Active daily bonus enabled
          </p>
        </div>

        {/* Metric 4: Badges Unlocked */}
        <div className="bg-[#0e1015] border border-white/[0.08] hover:border-accent/40 rounded-xl p-5 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider">Badges Unlocked</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">{unlockedBadges.length}</span>
            <span className="text-xs font-mono font-bold text-ink-dim">/ {premiumBadges.length}</span>
          </div>
          <p className="text-[11px] font-mono text-indigo-400 mt-2">
            {Math.round((unlockedBadges.length / premiumBadges.length) * 100)}% achievements cleared
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

          {/* SECTION A: XP & Level Progression Engine */}
          <div className="bg-[#0c0d10] border border-white/[0.08] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
                    Progression Engine //
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  Experience & Career Rank
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-bold text-white block">
                  {levelInfo.remaining > 0 ? `${levelInfo.remaining} XP until ${levelInfo.nextRank}` : 'Maximum Level Achieved'}
                </span>
                <span className="text-[10px] font-mono text-ink-dim">
                  Tier {userLevel} of 5 &bull; {xp} XP Accumulated
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  Level {userLevel}: {levelInfo.rank}
                </span>
                <span className="text-accent font-bold">
                  {levelInfo.progress}% Complete
                </span>
              </div>

              <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-accent to-[#00FF41] shadow-[0_0_12px_rgba(0,255,65,0.5)]"
                />
              </div>
            </div>

            {/* 5 Milestone Step Indicators */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {milestones.map((m) => {
                const isPassed = userLevel > m.lvl || (userLevel === m.lvl && xp >= m.xpReq);
                const isCurrent = userLevel === m.lvl;
                return (
                  <div 
                    key={m.lvl} 
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent 
                        ? 'bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(0,255,65,0.15)]' 
                        : isPassed 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                        : 'bg-black/30 border-white/[0.05] text-ink-dim opacity-40'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold block uppercase tracking-wider">
                      L{m.lvl}
                    </span>
                    <span className="text-[11px] font-bold block text-white truncate my-0.5">
                      {m.title}
                    </span>
                    <span className="text-[9px] font-mono text-ink-dim block">
                      {m.xpReq} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION B: Badges & Rewards Showcase */}
          <div className="bg-[#0c0d10] border border-white/[0.08] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                    Achievements Repository //
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  Profile Badges & Rewards
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl">
                <button
                  onClick={() => setBadgeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    badgeFilter === 'all' 
                      ? 'bg-accent text-black shadow-sm' 
                      : 'text-ink-dim hover:text-white'
                  }`}
                >
                  All ({premiumBadges.length})
                </button>
                <button
                  onClick={() => setBadgeFilter('unlocked')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    badgeFilter === 'unlocked' 
                      ? 'bg-accent text-black shadow-sm' 
                      : 'text-ink-dim hover:text-white'
                  }`}
                >
                  Unlocked ({unlockedBadges.length})
                </button>
                <button
                  onClick={() => setBadgeFilter('locked')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    badgeFilter === 'locked' 
                      ? 'bg-accent text-black shadow-sm' 
                      : 'text-ink-dim hover:text-white'
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
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                      isUnlocked
                        ? 'bg-[#10131a] border-accent/30 hover:border-accent/60 shadow-[0_0_15px_rgba(0,255,65,0.05)]'
                        : 'bg-[#0a0b0e]/70 border-white/[0.05] hover:border-white/15 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div>
                      {/* Badge Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                            isUnlocked 
                              ? 'bg-accent/15 border-accent/40 text-accent shadow-[0_0_10px_rgba(0,255,65,0.2)]' 
                              : 'bg-white/5 border-white/10 text-ink-dim'
                          }`}>
                            <BadgeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-tight">
                              {badge.label}
                            </h3>
                            <span className="text-[9px] font-mono text-amber-400 font-bold block">
                              +{badge.reward}
                            </span>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
                          isUnlocked 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1' 
                            : 'bg-white/5 text-ink-dim border-white/10 flex items-center gap-1'
                        }`}>
                          {isUnlocked ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              UNLOCKED
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              LOCKED
                            </>
                          )}
                        </span>
                      </div>

                      {/* Requirement description */}
                      <p className="text-[11px] text-ink-dim leading-relaxed mb-4">
                        {badge.req}
                      </p>
                    </div>

                    {/* Bottom Indicator */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                      <span className={isUnlocked ? 'text-accent font-bold' : 'text-ink-dim'}>
                        {isUnlocked ? 'Achieved & Credited' : 'Requirement Pending'}
                      </span>
                      {isUnlocked && (
                        <span className="text-[10px] text-accent">✦</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Prominent Credit Wallet & Account Governance              */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-6">

          {/* CARD 1: Credit Wallet (Visually Prominent!) */}
          <div className="bg-gradient-to-b from-accent/[0.08] via-[#0c0d10] to-[#0c0d10] border border-accent/40 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(0,255,65,0.08)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_10px_rgba(0,255,65,0.25)]">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest block">
                  AI Neural Compute //
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-tight">
                  Credit Wallet
                </h2>
              </div>
            </div>

            {/* Balance Big Readout */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-5 mb-5 text-center">
              <span className="text-[10px] font-mono text-ink-dim uppercase tracking-wider block mb-1">
                Available Request Balance
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black font-mono text-white tracking-tight">
                  {creditWallet?.balance ?? 250}
                </span>
                <span className="text-sm font-mono font-bold text-accent uppercase">
                  Credits
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 mt-4 pt-3 text-[10px] font-mono">
                <div>
                  <span className="text-ink-dim block">Cycle Usage:</span>
                  <span className="font-bold text-white">{creditWallet?.usedThisMonth ?? 0} Used</span>
                </div>
                <div>
                  <span className="text-ink-dim block">Total Granted:</span>
                  <span className="font-bold text-white">{creditWallet?.totalEarned ?? creditWallet?.balance ?? 250} Earned</span>
                </div>
              </div>
            </div>

            {/* Manage Wallet CTA */}
            <Link
              to="/credits"
              className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,65,0.25)] transition-all cursor-pointer mb-5"
            >
              <Coins className="w-4 h-4" />
              <span>Manage Wallet & Refill &rarr;</span>
            </Link>

            {/* Quick Credit Cost Cheat-Sheet */}
            <div className="border-t border-white/10 pt-4">
              <span className="text-[9px] font-mono font-bold text-ink-dim uppercase tracking-wider block mb-2.5">
                Feature Credit Consumption:
              </span>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-ink-dim">Resume Full Analysis</span>
                  <span className="text-accent font-bold">{DEFAULT_CREDIT_COSTS.resumeScan} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-ink-dim">ATS Optimization</span>
                  <span className="text-accent font-bold">{DEFAULT_CREDIT_COSTS.atsOptimization} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-ink-dim">Interactive Mock Session</span>
                  <span className="text-accent font-bold">{DEFAULT_CREDIT_COSTS.interviewSession} cr</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-ink-dim">Campus Placement Drill</span>
                  <span className="text-accent font-bold">{DEFAULT_CREDIT_COSTS.jobMatchAnalysis} cr</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-dim">Learning Path Roadmap</span>
                  <span className="text-accent font-bold">{DEFAULT_CREDIT_COSTS.careerRoadmap} cr</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Plan Tier & Security Governance */}
          <div className="bg-[#0c0d10] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Account Security & Tier
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-black/40 border border-white/[0.06] rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-ink-dim uppercase">Active Plan</span>
                  <span className={`text-[10px] font-mono font-bold uppercase ${isAdmin ? 'text-rose-400' : isPremium ? 'text-accent' : 'text-white'}`}>
                    {isAdmin ? 'Root Override' : isPremium ? 'Premium Active' : 'Free Tier'}
                  </span>
                </div>
                <p className="text-xs text-white font-bold mb-2">{planDisplay}</p>
                <p className="text-[11px] text-ink-dim leading-relaxed">
                  {isAdmin 
                    ? 'Total administrative authorization granted. System bypass active.' 
                    : isPremium 
                    ? 'Full access to high-priority AI queues and unlimited deep scans.' 
                    : 'Standard speed quota with daily reload triggers.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="text-ink-dim">Email Status</span>
                <span className={`font-bold ${user.emailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {user.emailVerified ? 'Verified' : 'Active Account'}
                </span>
              </div>

              <Link
                to="/credits"
                className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-ink-dim hover:text-white rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Change Plan Tier</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* CARD 3: Referral Network Code */}
          {creditWallet?.referralCode && (
            <div className="bg-[#0c0d10] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Referral Network Code
                </h3>
              </div>
              <p className="text-[11px] text-ink-dim mb-3">
                Share your personal code with engineers or classmates. Earn bonus credits upon their first login.
              </p>
              <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2 rounded-xl">
                <code className="flex-1 font-mono text-xs font-bold text-accent px-2">
                  {creditWallet.referralCode}
                </code>
                <button
                  onClick={handleCopyReferral}
                  className="px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedReferral ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
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

