import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSystemOS } from '../context/SystemOSContext';
import { Link } from 'react-router-dom';

export default function NeuralStatus() {
  const { user } = useAuth();
  const { careerHealthScore } = useSystemOS();
  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
       <Link to="/" aria-label="Go to Dashboard Career Health Score">
         <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.03 }}
          className="bg-surface/80 hover:bg-surface backdrop-blur-xl border border-border hover:border-accent/40 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl transition-all cursor-pointer"
         >
            <div className="relative">
               <Activity className="w-3 h-3 text-accent" />
               <motion.div 
                 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute inset-0 bg-accent rounded-full blur-[2px]"
               />
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-ink uppercase tracking-widest leading-none">
                 Career Health: {careerHealthScore.totalScore}/100
               </span>
               <span className="text-[7px] font-mono text-accent uppercase mt-1">
                 {careerHealthScore.tier}
               </span>
            </div>
         </motion.div>
       </Link>
    </div>
  );
}

