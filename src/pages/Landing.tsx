import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';
import { FileSearch, Sparkles, Target, Zap, Map, Briefcase } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex flex-col bg-background text-ink">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1)_0%,transparent_50%)]" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-surface px-3 py-1 rounded-full text-ink-dim text-xs font-bold uppercase tracking-widest mb-8 border border-border"
          >
            <Zap className="w-3 h-3 fill-accent text-accent" /> AI-Powered Career Efficiency
          </motion.div>
          
          <h1 className="font-sans font-bold text-6xl md:text-8xl tracking-tighter text-ink leading-[0.9] mb-8">
            Engineering your <span className="text-accent">perfect career</span> with AI.
          </h1>
          
          <p className="text-xl text-ink-dim max-w-2xl mx-auto mb-12 font-sans font-medium">
            Next-generation resume intelligence, precision matching, and lifecycle tracking. 
            All in one high-performance dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={signInWithGoogle}
              className="bg-accent text-white px-8 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all shadow-2xl shadow-accent/20 w-full sm:w-auto"
            >
              Get Started for Free
            </button>
            <button className="text-ink px-8 py-4 rounded-xl text-lg font-bold border border-border bg-surface hover:bg-surface-light transition-all w-full sm:w-auto">
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileSearch,
                title: "Resume Intelligence",
                desc: "Deep-layer mapping of ATS compatibility, keyword density, and organizational impact."
              },
              {
                icon: Target,
                title: "Precision Matching",
                desc: "Sub-second comparison between your profile and global job signals for mission-critical tailoring."
              },
              {
                icon: Zap,
                title: "Neural Job Finder",
                desc: "Deploy AI agents to scan professional networks and extract optimal career acquisitions."
              },
              {
                icon: Sparkles,
                title: "Interview Lab",
                desc: "Simulate high-stakes vetting sessions with AI-driven behavioral and technical evaluation."
              },
              {
                icon: Map,
                title: "Neural Roadmap",
                desc: "Convert alignment gaps into strategic growth trajectories using validated global intelligence."
              },
              {
                icon: Briefcase,
                title: "Pipeline Tracking",
                desc: "Monitor your progression through every stage of the application and interview pipeline."
              }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-10 rounded-[2.5rem] border border-border bg-background hover:bg-surface-light/30 transition-all hover:shadow-2xl hover:shadow-accent/5"
              >
                <div className="bg-surface-light w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-accent transition-colors">
                  <f.icon className="w-7 h-7 text-ink group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-sans font-bold text-2xl text-ink mb-4">{f.title}</h3>
                <p className="text-ink-dim font-medium leading-relaxed italic">"{f.desc}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
