import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, Zap, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-[#111] border-2 border-rose-500/20 rounded-[2.5rem] p-12 text-center shadow-[0_0_50px_rgba(244,63,94,0.1)]"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Neural Fracture Detected</h1>
            <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
              A logical anomaly has breached the system core. Our AI agents are ready to re-synchronize the codebase.
            </p>

            <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6 mb-8 text-left font-mono">
               <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Error Trace</span>
               </div>
               <p className="text-rose-400 text-xs overflow-x-auto whitespace-pre-wrap">
                  {this.state.error?.toString()}
               </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <button 
                onClick={() => window.location.href = '/rabbit'}
                className="flex-1 bg-accent text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
               >
                 <Zap className="w-4 h-4" /> Ask Code Rabbit for Fix
               </button>
               <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-zinc-900 text-zinc-400 border border-zinc-800 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all"
               >
                 Re-initialize Interface
               </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
