import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Bell, MessageCircle, Send, Plus, Users, UserCheck, Smartphone, Settings, ExternalLink, Zap, X, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { generateCoverLetter } from '../lib/gemini';

export default function OutreachHub() {
  const { t } = useLanguage();
  const [waNumber, setWaNumber] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const referrals = [
    { name: "Rahul S.", company: "Zomato", status: "Requested", date: "24 Apr" },
    { name: "Priya V.", company: "Google India", status: "Referred", date: "20 Apr" },
    { name: "Anish K.", company: "Infosys", status: "Pending Response", date: "18 Apr" }
  ];

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const generateMessage = async (contact: any) => {
    setSelectedContact(contact);
    setShowGenModal(true);
    setLoadingMsg(true);
    try {
      // Reusing cover letter logic for outreach messages since it requires similar context
      const res = await generateCoverLetter("Candidate: Final Year Engineering Student. Skills: React, Node.js, Python. Looking for referral in India.", `Company: ${contact.company}`);
      setGeneratedMessage(res.content);
    } catch (error) {
      console.error("Failed to generate message", error);
      setGeneratedMessage("Hi " + contact.name + ", I hope you're doing well! I'm really interested in " + contact.company + " and was wondering if you could help with a referral. Thanks!");
    } finally {
      setLoadingMsg(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <AnimatePresence>
        {showGenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-surface border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative"
            >
               <button 
                  onClick={() => setShowGenModal(false)}
                  className="absolute top-8 right-8 p-2 hover:bg-accent/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-ink-dim" />
                </button>

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-ink uppercase tracking-tight">Neural Referrer Direct</h3>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Generating personalized pitch for {selectedContact?.name}</p>
                </div>

                <div className="bg-background border border-border p-6 rounded-3xl min-h-[200px] relative font-sans text-sm leading-relaxed text-ink">
                  {loadingMsg ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-8 h-8 text-accent animate-spin" />
                       <span className="text-[10px] font-bold text-ink-dim uppercase">Crafting Narrative...</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{generatedMessage}</p>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                   <button 
                    onClick={copyToClipboard}
                    className="flex-1 bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                   >
                     {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                     {copied ? "Copied" : "Copy Neural Pitch"}
                   </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Alerts & Automation */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
          <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-8">
                <div className="bg-success/10 p-2.5 rounded-2xl border border-success/20">
                   <MessageCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-ink uppercase tracking-tight">WhatsApp Neural Alerts</h2>
                   <p className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em]">Automated Opportunity Pipeline</p>
                </div>
             </div>

             <div className="bg-background border border-border p-6 rounded-3xl mb-8">
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-3">WhatsApp Identifier (India)</label>
                <div className="flex gap-2">
                   <div className="bg-surface border border-border px-4 py-3 rounded-xl text-sm font-bold text-ink-dim flex items-center">+91</div>
                   <input 
                      type="text" 
                      value={waNumber}
                      onChange={(e) => setWaNumber(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 bg-surface border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-success/20 text-ink"
                   />
                </div>
             </div>

             <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-surface-light/50 rounded-2xl border border-border">
                   <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-warning" />
                      <span className="text-xs font-bold text-ink uppercase tracking-tight">Market Scans (Daily)</span>
                   </div>
                   <div className="w-10 h-6 bg-success/20 rounded-full flex items-center px-1 border border-success/30">
                      <div className="w-4 h-4 bg-success rounded-full ml-auto" />
                   </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-light/50 rounded-2xl border border-border opacity-50">
                   <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-ink-dim" />
                      <span className="text-xs font-bold text-ink uppercase tracking-tight">Direct Agency Pings</span>
                   </div>
                   <div className="w-10 h-6 bg-surface-light rounded-full flex items-center px-1 border border-border">
                      <div className="w-4 h-4 bg-white/20 rounded-full" />
                   </div>
                </div>
             </div>

             <button 
              onClick={handleSync}
              className="w-full bg-success text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-success/20"
             >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Synchronize Pipeline"} 
                {!syncing && <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
             </button>

             <p className="mt-4 text-[9px] text-center text-ink-dim uppercase font-mono tracking-tighter">
                Requires Neural Shield Tier-2 or Twilio Key Integration.
             </p>
          </div>

          <div className="bg-[#0a0a0a] border border-border rounded-[2.5rem] p-8 text-white">
             <div className="flex items-center gap-3 mb-6">
                <Smartphone className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Alert Logic</h3>
             </div>
             <p className="text-xs text-white/50 leading-relaxed font-sans mb-6 italic">
                "Our crawler will monitor Naukri and LinkedIn 24/7. When a high-match JD (85%+) appears, we distribute a simplified briefing directly to your encrypted mobile device."
             </p>
             <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold text-white/70 uppercase">Monitoring Active Sectors</span>
             </div>
          </div>
        </div>

        {/* Right Column - Referral Tracker */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
          <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                      <Users className="w-5 h-5 text-accent" />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold text-ink uppercase tracking-tight">Referral Matrix</h2>
                   </div>
                </div>
                <button className="p-2 bg-background border border-border rounded-xl text-ink-dim hover:text-accent transition-colors">
                   <Plus className="w-6 h-6" />
                </button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                      <tr className="border-b border-border">
                         <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">Connect</th>
                         <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">Corporate Hub</th>
                         <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">Status</th>
                         <th className="pb-4 text-right text-[10px] font-bold text-ink-dim uppercase tracking-widest">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {referrals.map((ref, i) => (
                         <tr key={i} className="group">
                            <td className="py-6">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                     {ref.name[0]}
                                  </div>
                                  <span className="text-sm font-bold text-ink">{ref.name}</span>
                               </div>
                            </td>
                            <td className="py-6">
                               <span className="text-xs font-medium text-ink-dim uppercase tracking-tight">{ref.company}</span>
                            </td>
                            <td className="py-6">
                               <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  ref.status === 'Referred' ? 'bg-success/10 text-success border border-success/20' : 
                                  ref.status === 'Requested' ? 'bg-warning/10 text-warning border border-warning/20' : 
                                  'bg-surface-light text-ink-dim border border-border'
                               }`}>
                                  {ref.status}
                               </div>
                            </td>
                            <td className="py-6 text-right">
                                <button 
                                  onClick={() => generateMessage(ref)}
                                  className="text-[9px] font-bold text-accent uppercase tracking-widest p-2 px-4 border border-accent/20 rounded-xl hover:bg-accent/10 transition-all font-sans"
                                >
                                  Generate Pitch
                                </button>
                             </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="mt-12 p-8 bg-surface-light border border-border rounded-3xl border-dashed">
                <div className="flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-accent/5 rounded-full flex items-center justify-center mb-4">
                      <UserCheck className="w-6 h-6 text-accent" />
                   </div>
                   <h4 className="text-sm font-bold text-ink uppercase tracking-widest mb-2">Build Your Signal Strength</h4>
                   <p className="text-xs text-ink-dim max-w-sm leading-relaxed mb-6">
                      Add contacts from LinkedIn who can vouch for your neural capability. Referrals increase response rates by 400%.
                   </p>
                   <button className="px-6 py-2 bg-white border border-border rounded-xl text-[10px] font-bold text-ink uppercase tracking-widest hover:border-accent transition-colors flex items-center gap-2">
                      <Bell className="w-3 h-3" /> Sync Contacts
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
