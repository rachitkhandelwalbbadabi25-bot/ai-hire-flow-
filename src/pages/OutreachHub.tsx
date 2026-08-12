import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Inbox,
  Send,
  Plus,
  Users,
  UserCheck,
  ExternalLink,
  Zap,
  X,
  Loader2,
  Copy,
  CheckCircle2,
  Trash2,
  Sparkles,
  FileText,
  RefreshCw,
  Mic,
  Briefcase,
} from "lucide-react";
import NextStepBridgeCard from "../components/NextStepBridgeCard";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { generateOutreachEmail } from "../lib/gemini";
import SmartContextChips from "../components/SmartContextChips";
import { useSystemOS } from "../context/SystemOSContext";
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";

export default function OutreachHub() {
  const { user } = useAuth();

  // Gmail sync and persistence
  const [gmailAddress, setGmailAddress] = useState(() => {
    return localStorage.getItem("outreach_gmail") || user?.email || "";
  });
  const [syncing, setSyncing] = useState(false);

  // Candidate Context & Bio
  const [candidateContext, setCandidateContext] = useState(
    "Candidate: Product-focused developer skilled in React, Node.js, and TypeScript. Experience building intuitive SaaS products and scalable microservices.",
  );
  const [loadingContext, setLoadingContext] = useState(false);

  // Contacts / Referral Matrix
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Pitch generation modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [outreachTone, setOutreachTone] = useState("Professional yet warm");

  // Copy feedback triggers
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Sync Gmail address state
  useEffect(() => {
    if (gmailAddress) {
      localStorage.setItem("outreach_gmail", gmailAddress);
    }
  }, [gmailAddress]);

  // Load candidate's latest analyzed resume if available
  const loadLatestResumeContext = async () => {
    if (!user) return;
    setLoadingContext(true);
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "resumes"));
      if (!snap.empty) {
        // Sort in memory to avoid firestore index requirement
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as any)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        const latest = sorted[0];
        if (latest && latest.content) {
          // Extract a concise candidate summary or first 1000 characters
          const preview = latest.content.substring(0, 1000);
          setCandidateContext(
            `Candidate Background based on latest resume:\n---\n${preview}\n---\nKey Target Focus: Dynamic engineering or development roles.`,
          );
        }
      }
    } catch (err) {
      console.error("Failed to load latest resume context:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLatestResumeContext();
    }
  }, [user]);

  // Load contacts
  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const snap = await getDocs(
          collection(db, "users", user.uid, "outreach_contacts"),
        );
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setContacts(list);
      } catch (err) {
        console.error("Failed to load outreach contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [user]);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || !newCompany.trim() || !newEmail.trim())
      return;

    setAddingContact(true);
    const newContact = {
      name: newName.trim(),
      company: newCompany.trim(),
      email: newEmail.trim(),
      status: "Pending Response",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(
        collection(db, "users", user.uid, "outreach_contacts"),
        newContact,
      );
      setContacts((prev) => [{ id: docRef.id, ...newContact }, ...prev]);
      setNewName("");
      setNewCompany("");
      setNewEmail("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding contact:", err);
    } finally {
      setAddingContact(false);
    }
  };

  const handleToggleStatus = async (
    contactId: string,
    currentStatus: string,
  ) => {
    if (!user) return;
    const statuses = ["Pending Response", "Requested", "Referred"];
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    try {
      await updateDoc(
        doc(db, "users", user.uid, "outreach_contacts", contactId),
        {
          status: nextStatus,
        },
      );
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, status: nextStatus } : c,
        ),
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "outreach_contacts", contactId),
      );
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  };

  const handleGeneratePitch = async (contact: any, selectedTone: string = outreachTone) => {
    setSelectedContact(contact);
    setShowGenModal(true);
    setGeneratingPitch(true);
    setGeneratedSubject("");
    setGeneratedBody("");

    try {
      const pitch = await generateOutreachEmail(
        candidateContext,
        contact.company,
        contact.name,
        selectedTone,
        contact.role || contact.title || "Team Leader"
      );
      setGeneratedSubject(
        pitch.subject || `${contact.company} tech initiatives / quick 15-min chat`,
      );
      setGeneratedBody(
        pitch.body ||
          `Hi ${contact.name},\n\nLoved ${contact.company}'s recent technical scaling engineering milestones.\n\nWould love to learn about your team's workflow and share a quick bit about my background in full-stack architecture.\n\nDo you have 15 minutes for a quick virtual coffee next week?\n\nBest,\n[Your Name]`,
      );
    } catch (error) {
      console.error("Failed generating neural pitch:", error);
      setGeneratedSubject(
        `Quick question on ${contact.company}'s engineering focus`,
      );
      setGeneratedBody(
        `Hi ${contact.name},\n\nImpressed by the product developments happening at ${contact.company}.\n\nI'm building scalable web platforms and would appreciate 15 minutes to learn about your engineering culture.\n\nWould a brief 15-min chat next week fit your calendar?\n\nBest,\n[Your Name]`,
      );
    } finally {
      setGeneratingPitch(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-ink tracking-tight mb-2 uppercase">
          Outreach Hub
        </h1>
        <p className="text-ink-dim font-medium text-sm">
          Draft professional cold Gmail pitches and coordinate warm corporate
          connections dynamically.
        </p>
      </div>

      <SmartContextChips 
        className="mb-8"
        onSelectJob={(jobDesc) => {
          const parts = jobDesc.split(' at ');
          if (parts.length === 2) {
            setNewCompany(parts[1]);
          } else {
            setNewCompany(jobDesc);
          }
          setShowAddModal(true);
        }}
      />

      {/* Add Connection Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-md relative overflow-hidden"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-accent/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-ink-dim" />
              </button>

              <h3 className="text-lg font-bold text-ink uppercase tracking-tight mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Add Referral Connection
              </h3>

              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Priyesh Patel"
                    className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                    Corporate Hub / Company
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                    Gmail / Email Identifier
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. contact@company.com"
                    className="w-full bg-background border border-border px-4 py-3 rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingContact}
                  className="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-6 shadow-md shadow-accent/20"
                >
                  {addingContact ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Connection
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generated Pitch Modal */}
      <AnimatePresence>
        {showGenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-xl relative overflow-hidden"
            >
              <button
                onClick={() => setShowGenModal(false)}
                className="absolute top-8 right-8 p-2 hover:bg-accent/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-ink-dim" />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-ink uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  Email Composer
                </h3>
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
                  Generating customized referral email for{" "}
                  {selectedContact?.name} @ {selectedContact?.company}
                </p>
              </div>

              {generatingPitch ? (
                <div className="p-6 space-y-4">
                  <p className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing
                    personalized outreach pitch...
                  </p>
                  <SkeletonLoader type="card" lines={4} />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Subject field */}
                  <div className="bg-background border border-border p-4 rounded-2xl">
                    <label className="text-[9px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                      Subject line
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={generatedSubject}
                        onChange={(e) => setGeneratedSubject(e.target.value)}
                        className="flex-1 bg-surface border border-border px-4 py-2.5 rounded-xl text-xs text-ink font-sans focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedSubject);
                          setCopiedSubject(true);
                          setTimeout(() => setCopiedSubject(false), 2000);
                        }}
                        className="p-2.5 bg-surface border border-border text-ink-dim hover:text-accent rounded-xl text-xs transition-colors flex items-center gap-1.5"
                        title="Copy Subject"
                      >
                        {copiedSubject ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {copiedSubject ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Body field */}
                  <div className="bg-background border border-border p-4 rounded-2xl">
                    <label className="text-[9px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                      Cold outreach body
                    </label>
                    <textarea
                      value={generatedBody}
                      onChange={(e) => setGeneratedBody(e.target.value)}
                      rows={8}
                      className="w-full bg-surface border border-border p-4 rounded-xl text-xs text-ink font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedBody);
                          setCopiedBody(true);
                          setTimeout(() => setCopiedBody(false), 2000);
                        }}
                        className="p-2.5 bg-surface border border-border text-ink-dim hover:text-accent rounded-xl text-xs transition-colors flex items-center gap-1.5"
                      >
                        {copiedBody ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {copiedBody ? "Body Copied" : "Copy Body"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        const fullMail = `Subject: ${generatedSubject}\n\n${generatedBody}`;
                        navigator.clipboard.writeText(fullMail);
                        setCopiedAll(true);
                        setTimeout(() => setCopiedAll(false), 2000);
                      }}
                      className="flex-1 bg-surface border border-border text-ink py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:border-accent transition-colors"
                    >
                      {copiedAll ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedAll ? "Entire Copy Complete" : "Copy Entire Pitch"}
                    </button>

                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedContact?.email || "")}&su=${encodeURIComponent(generatedSubject)}&body=${encodeURIComponent(generatedBody)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Send in Gmail
                    </a>
                  </div>

                  <NextStepBridgeCard
                    title="Outreach Pitch Generated"
                    contextData={`Tailored referral pitch synthesized for ${selectedContact?.name || 'Recruiter'} at ${selectedContact?.company || 'Target Company'}.`}
                    primaryStep={{
                      label: "Simulate Technical Interview",
                      icon: Mic,
                      to: "/campus"
                    }}
                    secondaryStep={{
                      label: "Track Pipeline Status",
                      icon: Briefcase,
                      to: "/jobs"
                    }}
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Alerts, Sync, and Elevator Pitch */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
          {/* Synced Settings */}
          <div className="glass-panel shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink uppercase tracking-tight">
                  Gmail Integration
                </h2>
                <p className="text-[9px] font-bold text-ink-dim uppercase tracking-widest">
                  Connect Pipeline to Personal Mail
                </p>
              </div>
            </div>

            <div className="bg-background border border-border p-5 rounded-2xl mb-6">
              <label className="text-[9px] font-bold text-ink-dim uppercase tracking-widest block mb-2">
                Connected Gmail Account
              </label>
              <div className="flex gap-2">
                <div className="bg-surface border border-border px-3.5 py-3 rounded-xl text-sm text-ink-dim flex items-center">
                  <Inbox className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="your.name@gmail.com"
                  className="flex-1 bg-surface border border-border px-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent text-ink font-mono font-semibold"
                />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-surface-light/50 rounded-xl border border-border">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="text-[11px] font-bold text-ink uppercase tracking-tight">
                    Pitch Draft Auto-Synthesis
                  </span>
                </div>
                <div className="w-9 h-5 bg-accent/20 rounded-full flex items-center px-0.5 border border-accent/30 cursor-pointer">
                  <div className="w-3.5 h-3.5 bg-accent rounded-full ml-auto" />
                </div>
              </div>
            </div>

            <button
              onClick={handleSync}
              className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-md shadow-accent/20"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verify Connection"
              )}
              {!syncing && (
                <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              )}
            </button>
          </div>

          {/* Elevator Pitch and Candidate Background */}
          <div className="glass-panel shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-ink tracking-tight">
                    Outreach Background
                  </h3>
                  <p className="text-[9px] font-mono text-ink-dim uppercase tracking-widest">
                    Controls AI Personalization Pitch
                  </p>
                </div>
              </div>

              <button
                onClick={loadLatestResumeContext}
                disabled={loadingContext}
                className="p-2 border border-border rounded-xl text-ink-dim hover:text-accent transition-all hover:bg-accent/5"
                title="Sync from latest resume"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingContext ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <p className="text-xs text-ink-dim mb-4 leading-relaxed font-medium">
              We personalize cold referral requests based on this bio. It has
              been preloaded with content from your latest analyzed resume. Feel
              free to refine it below:
            </p>

            <textarea
              value={candidateContext}
              onChange={(e) => setCandidateContext(e.target.value)}
              rows={8}
              className="w-full bg-background border border-border p-4 rounded-2xl text-xs text-ink font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Detail your technology stack, notable milestones, and what specific types of positions you are seeking..."
            />
          </div>

          <div className="bg-[#0c0c0c] border border-border rounded-[2rem] p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                Cold Pitch Intelligence
              </h3>
            </div>
            <p className="text-xs text-white/50 leading-relaxed font-sans mb-4 italic">
              "We leverage structural narrative synthesis. By comparing your
              precise elevator pitch against the target contact's corporate
              profile, we generate highly strategic referrals that bypass
              initial filter barriers."
            </p>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] font-bold text-white/70 uppercase font-mono">
                Email Assistant Ready
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Referral Matrix */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
          <div className="glass-panel shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2.5 rounded-2xl border border-accent/20">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink uppercase tracking-tight">
                    Referral Matrix
                  </h2>
                  <p className="text-[10px] font-bold text-ink-dim uppercase tracking-[0.2em] mt-0.5">
                    Target Contact Hub
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="p-2.5 bg-background border border-border rounded-xl text-ink-dim hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Add Contact
                </span>
              </button>
            </div>

            {loadingContacts ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                  Loading Referral Matrix...
                </span>
              </div>
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Initiate Direct Recruiter & Hiring Leader Outreach"
                targetRole="Engineering & Tech Hiring Managers"
                description="Add key hiring managers, tech leads, and internal recruiters at target enterprise companies to craft high-converting, metric-backed cold pitches."
                benefitMetric="Direct recruiter emails yield 4.8x higher interview response rates than portal applications"
                primaryAction={{
                  label: "Add Target Recruiter Contact",
                  onClick: () => setShowAddModal(true),
                  icon: Plus
                }}
                secondaryAction={{
                  label: "Preload Tech Lead Profile",
                  onClick: () => {
                    setNewName("Sarah Lin");
                    setNewCompany("Stripe");
                    setNewEmail("sarah.lin@stripe.com");
                    setShowAddModal(true);
                  },
                  icon: Sparkles
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                        Connection
                      </th>
                      <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                        Corporate Hub
                      </th>
                      <th className="pb-4 text-left text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                        Status
                      </th>
                      <th className="pb-4 text-right text-[10px] font-bold text-ink-dim uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.map((ref) => (
                      <tr
                        key={ref.id}
                        className="group hover:bg-accent/[0.01] transition-colors"
                      >
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                              {ref.name[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-ink">
                                {ref.name}
                              </span>
                              <span className="text-[10px] font-mono text-ink-dim mt-0.5">
                                {ref.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-5">
                          <span className="text-xs font-semibold text-ink uppercase tracking-tight">
                            {ref.company}
                          </span>
                        </td>
                        <td className="py-5">
                          <button
                            onClick={() =>
                              handleToggleStatus(ref.id, ref.status)
                            }
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer border hover:border-accent transition-colors ${
                              ref.status === "Referred"
                                ? "bg-success/10 text-success border-success/20"
                                : ref.status === "Requested"
                                  ? "bg-warning/10 text-warning border-warning/20"
                                  : "bg-surface-light text-ink-dim border-border"
                            }`}
                            title="Click to toggle status"
                          >
                            {ref.status}
                          </button>
                        </td>
                        <td className="py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleGeneratePitch(ref)}
                              className="text-[9px] font-bold text-accent uppercase tracking-widest py-2 px-3 border border-accent/20 rounded-xl hover:bg-accent/10 transition-all font-sans flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Pitch
                            </button>
                            <button
                              onClick={() => handleDeleteContact(ref.id)}
                              className="p-2 border border-border hover:border-rose-500/30 text-ink-dim hover:text-rose-400 rounded-xl transition-colors"
                              title="Delete connection"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-12 p-6 bg-surface-light border border-border rounded-2xl border-dashed">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-accent/5 rounded-full flex items-center justify-center mb-3 border border-accent/10">
                  <UserCheck className="w-5 h-5 text-accent" />
                </div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-1.5">
                  Elevate Response Probability
                </h4>
                <p className="text-xs text-ink-dim max-w-sm leading-relaxed mb-4">
                  Add actual professionals from target tech companies. A
                  customized email asking for advice or feedback can increase
                  interview rates by up to 5x.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
