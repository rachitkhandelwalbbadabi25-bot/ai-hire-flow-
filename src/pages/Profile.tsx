import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Shield, Zap, Sparkles, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-ink tracking-tight uppercase">User Profile</h1>
        <p className="text-ink-dim font-medium text-sm mt-1">Identity configuration and terminal settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-surface rounded-3xl border border-border p-8 flex flex-col items-center text-center shadow-sm">
            <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-6 border-2 border-accent/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-10 h-10 text-accent" />
              )}
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">{user.displayName}</h2>
            <p className="text-xs text-ink-dim font-mono mb-6">{user.email}</p>
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
          <div className="bg-surface rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Active Plan
            </h3>
            
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-lg font-bold text-ink px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg inline-block mb-2 uppercase">Elite Professional</p>
                <p className="text-sm text-ink-dim font-medium">Enterprise-grade AI intelligence and unlimited lifecycle tracking.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-success mb-1 uppercase">Pro Active</p>
                <p className="text-[10px] text-ink-dim font-mono tracking-tighter">Renewal: 2026-05-18</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center gap-2">
               Sub-Sector Usage
            </h3>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-bold text-ink uppercase tracking-widest">Neural Scans</p>
                  <p className="text-[10px] font-mono text-ink-dim uppercase">Unlimited / Month</p>
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-bold text-ink uppercase tracking-widest">Job Pipeline Slots</p>
                  <p className="text-[10px] font-mono text-ink-dim uppercase">42 / ∞</p>
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '45%' }}
                    className="h-full bg-success rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
