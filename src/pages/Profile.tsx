import { motion } from 'motion/react';
import { User as UserIcon, LogOut, Zap, Shield, Sparkles, Award, Flame, Star, Coins } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, plan, isAdmin, isPremium } = useAuth();
  const { creditWallet } = usePlan();

  if (!user) return null;

  const planDisplay = isAdmin ? 'System Administrator' : isPremium ? 'Premium Member' : 'Free Tier Member';

  // Available Profile Badges based on accomplishments with requirements and rewards
  const premiumBadges = [
    { id: 'verified', label: 'Verified Candidate', color: 'bg-green-500/10 text-green-400 border-green-500/20', req: 'Verify your account email address', reward: '100 XP' },
    { id: 'resume', label: 'Resume Master', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', req: 'Analyze 3 resumes in AI Resume Analyzer', reward: '250 XP' },
    { id: 'interview', label: 'Interview Champion', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', req: 'Complete 1 mock interview session', reward: '300 XP' },
    { id: 'explorer', label: 'Career Explorer', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', req: 'Generate a customized learning roadmap', reward: '200 XP' },
    { id: 'ats', label: 'ATS Expert', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', req: 'Score 80+ on any resume optimization scan', reward: '500 XP' },
    { id: 'premium', label: 'Premium Member', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', req: 'Upgrade to Pro or Elite plan tier', reward: '1,000 XP' },
    { id: 'performer', label: 'Top Performer', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', req: 'Reach Level 3 or higher', reward: '500 XP' },
    { id: 'recruiter', label: 'Recruiter Favorite', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', req: 'Generate 5 referral pitches in Outreach Hub', reward: '250 XP' }
  ];

  // User unlocked badges
  const unlockedBadges = creditWallet?.unlockedBadges || ['Verified Candidate'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-ink tracking-tight uppercase">User Profile</h1>
        <p className="text-ink-dim font-medium text-sm mt-1">Identity configurations and gamified career dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-surface rounded-[2.5rem] border border-border p-8 flex flex-col items-center text-center shadow-lg">
            <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-6 border-2 border-accent/20 relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-10 h-10 text-accent" />
              )}
              {creditWallet?.level && (
                <span className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-surface font-mono">
                  L{creditWallet.level}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">{user.displayName}</h2>
            <p className="text-xs text-ink-dim font-mono mb-6">{user.email}</p>
            
            {/* Streak widget */}
            <div className="bg-surface-light border border-border/80 px-4 py-2 rounded-2xl flex items-center gap-2 mb-6 w-full justify-center">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                {creditWallet?.streak ?? 1} Day Streak
              </span>
            </div>

            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" /> Terminate Session
            </button>
          </div>
        </div>

        {/* Details Card */}
        <div className="md:col-span-2 space-y-8">
          {/* Active Level */}
          <div className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-lg">
            <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Active Access Level
            </h3>
            
            <div className="flex items-center justify-between group">
              <div>
                <p className={`text-lg font-bold text-ink px-3 py-1 border rounded-lg inline-block mb-2 uppercase ${
                  isAdmin ? 'bg-rose-500/10 border-rose-500/20' : 
                  isPremium ? 'bg-accent/10 border-accent/20' : 
                  'bg-ink-dim/5 border-border'
                }`}>
                  {planDisplay}
                </p>
                <p className="text-sm text-ink-dim font-semibold mt-1">
                  {isAdmin ? 'System Override Authorized. Total core database permissions granted.' : 
                   isPremium ? 'Premium AI intelligence modules and priority processing unlocked.' : 
                   'Standard intelligence processing with dynamic allowance bounds.'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold mb-1 uppercase ${isAdmin || isPremium ? 'text-success' : 'text-accent'}`}>
                  {isAdmin ? 'Master' : isPremium ? 'Verified' : 'Limited'}
                </p>
                <Link to="/credits" className="text-[10px] text-accent font-mono tracking-tighter uppercase font-bold underline">
                  Upgrade Plan
                </Link>
              </div>
            </div>
          </div>

          {/* Gamified leveling and credits */}
          <div className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-lg">
            <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Rank & Experience Points</span>
              <span className="text-amber-500 font-mono font-bold text-xs">{creditWallet?.xp ?? 0} XP</span>
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-black text-ink uppercase tracking-widest">Experience Level Progress</p>
                  <p className="text-[10px] font-mono text-ink-dim uppercase">
                    Level {creditWallet?.level ?? 1} / 5
                  </p>
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((creditWallet?.xp ?? 0) / 1000) * 100)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                  />
                </div>
              </div>

              <div className="bg-black/30 border border-border p-6 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-white">Credit Wallet</p>
                    <p className="text-[10px] text-ink-dim font-bold uppercase mt-0.5">Available for AI requests</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono text-white block">{creditWallet?.balance ?? 250}</span>
                  <Link to="/credits" className="text-[9px] text-accent font-black uppercase tracking-widest hover:underline">
                    Manage Wallet &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Profile Badges */}
          <div className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-lg">
            <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-6 border-b border-border pb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Star className="w-4 h-4 text-indigo-500" /> Profile Badges & Rewards</span>
              <span className="text-[10px] text-ink-dim font-bold uppercase">{unlockedBadges.length} / {premiumBadges.length} Unlocked</span>
            </h3>

            <div className="flex flex-wrap gap-3">
              {premiumBadges.map((badge) => {
                const isUnlocked = unlockedBadges.some(b => b.toLowerCase().includes(badge.label.toLowerCase()) || badge.label.toLowerCase().includes(b.toLowerCase()));
                return (
                  <div 
                    key={badge.id}
                    className="relative group cursor-pointer"
                  >
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                      isUnlocked 
                        ? badge.color + ' opacity-100 shadow-sm' 
                        : 'bg-surface-light/40 text-ink-dim border-border/60 opacity-50 hover:opacity-80'
                    }`}>
                      <span>{isUnlocked ? '✦' : '🔒'}</span>
                      <span>{badge.label}</span>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-56 p-3 bg-surface border border-border rounded-xl shadow-2xl text-left pointer-events-none">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-ink uppercase tracking-tight">{badge.label}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isUnlocked ? 'bg-success/20 text-success' : 'bg-surface-light text-ink-dim'}`}>
                          {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-dim font-medium leading-normal mb-2">
                        {badge.req}
                      </p>
                      <div className="text-[9px] font-bold text-amber-500 flex items-center gap-1 border-t border-border/50 pt-1.5">
                        <span>Reward:</span>
                        <span className="font-mono">+{badge.reward}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
