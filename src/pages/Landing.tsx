import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';
import { FileSearch, Sparkles, Target, Zap, Map, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex flex-col bg-background text-ink overflow-hidden min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-4 overflow-hidden flex items-center justify-center">
        {/* Soft Radial Ambient Lighting Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] -z-10 opacity-60">
          <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[20%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 bg-surface/40 backdrop-blur-md px-4 py-1.5 rounded-full text-accent text-xs font-bold uppercase tracking-widest mb-10 border border-border"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI CAREER OPERATING SYSTEM
          </motion.div>
          
          <h1 className="font-sans font-black text-6xl md:text-8xl tracking-tight text-ink leading-[0.95] mb-8 max-w-4xl mx-auto">
            Engineering your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-violet-400 to-indigo-400">perfect career</span> with AI.
          </h1>
          
          <p className="text-lg md:text-xl text-ink-dim max-w-2xl mx-auto mb-12 font-sans font-medium leading-relaxed">
            Next-generation resume intelligence, precision matching, and live-cycle interview simulations. All synchronized on a high-performance terminal designed for top performers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 max-w-md mx-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={signInWithGoogle}
              className="bg-accent text-white px-8 py-4 rounded-2xl text-base font-bold hover:opacity-95 transition-all shadow-xl shadow-accent/25 w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              Initialize System <ArrowRight className="w-4 h-4" />
            </motion.button>
            
            <a 
              href="#features"
              className="text-ink-dim hover:text-ink px-8 py-4 rounded-2xl text-base font-bold border border-border bg-surface/40 backdrop-blur-md hover:bg-surface-light transition-all w-full sm:w-auto text-center"
            >
              Explore Capabilities
            </a>
          </div>


        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-28 bg-surface/30 backdrop-blur-sm border-t border-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-bold text-accent uppercase tracking-[0.3em] mb-3">SYSTEM CAPABILITIES</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight uppercase">High-Performance Career Operations</p>
            <p className="text-sm text-ink-dim mt-4">Every component is engineered with elite, custom-trained intelligence pipelines to accelerate your placement cycle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileSearch,
                title: "Resume Intelligence",
                desc: "Deep-layer mapping of ATS compatibility, keyword density audits, and professional impact scoring."
              },
              {
                icon: Target,
                title: "Precision Matching",
                desc: "Sub-second semantic alignment analysis comparing your background with target job requirements."
              },
              {
                icon: Zap,
                title: "Job Finder",
                desc: "Deploy smart search tools to scan listings and extract career opportunities optimized for you."
              },
              {
                icon: Sparkles,
                title: "Interview Lab",
                desc: "Conduct high-stakes mock interviews with real-time feedback on behavioral and technical performance."
              },
              {
                icon: Map,
                title: "Career Roadmap",
                desc: "Automatically map skill gaps to targeted Coursera, Udemy, and industry-recommended courses."
              },
              {
                icon: Briefcase,
                title: "Pipeline Tracking",
                desc: "An elegant, interactive Kanban board tracking your interview stages and offers side-by-side."
              }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="glass-card p-10 flex flex-col items-start hover:border-accent/40"
              >
                <div className="bg-surface p-3.5 rounded-2xl border border-border text-accent mb-8 flex items-center justify-center">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-extrabold text-xl text-ink mb-3 uppercase tracking-tight">{f.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed font-sans">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
