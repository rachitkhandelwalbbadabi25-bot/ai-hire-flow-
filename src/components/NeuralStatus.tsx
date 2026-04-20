import { motion } from 'motion/react';
import { Bug, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NeuralStatus() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
       <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-surface/50 backdrop-blur-xl border border-border rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl"
       >
          <div className="relative">
             <Activity className="w-3 h-3 text-success" />
             <motion.div 
               animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute inset-0 bg-success rounded-full blur-[2px]"
             />
          </div>
          <div className="flex flex-col">
             <span className="text-[8px] font-black text-ink uppercase tracking-widest leading-none">System Healthy</span>
             <span className="text-[7px] font-mono text-ink-dim uppercase mt-1">Audit Mode: Active</span>
          </div>
       </motion.div>

       <motion.div 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="bg-accent p-3 rounded-full shadow-lg cursor-pointer border border-accent/20 group"
        onClick={() => window.location.href = '/rabbit'}
       >
          <Bug className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
       </motion.div>
    </div>
  );
}
