import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  AlertCircle,
  Lightbulb,
  Clock,
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
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";

export default function OutreachHub() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Gmail sync and persistence
  const [gmailAddress, setGmailAddress] = useState(() => {
    return localStorage.getItem("outreach_gmail") || user?.email || "";
  });
  const [syncing, setSyncing] = useState(false);

  // Candidate Context & Bio
  const [candidateContext, setCandidateContext] = useState("");
  const [loadingContext, setLoadingContext] = useState(false);

  // Contacts & Referrals
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Handle incoming routing state (e.g. from JobFinder or Dashboard)
  useEffect(() => {
    if (location.state?.company) {
      setNewCompany(location.state.company);
      if (location.state?.name) {
        setNewName(location.state.name);
      }
      if (location.state?.openModal) {
        setShowAddModal(true);
      }
    }
  }, [location.state]);

  // Pitch generation state
  const [viewMode, setViewMode] = useState<"hub" | "pitch_result">("hub");
  const [pitchError, setPitchError] = useState<string | null>(null);
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
    if (!user?.uid) {
      setLoadingContacts(false);
      return;
    }

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

  const handleClosePitchResult = () => {
    setViewMode("hub");
    setPitchError(null);
  };

  const handleGeneratePitch = async (contact: any, selectedTone: string = outreachTone) => {
    setSelectedContact(contact);
    setViewMode("pitch_result");
    setGeneratingPitch(true);
    setPitchError(null);
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
      if (!pitch || (!pitch.subject && !pitch.body)) {
        throw new Error("Unable to synthesize email pitch. Please click Retry.");
      }
      setGeneratedSubject(
        pitch.subject || `${contact.company} tech initiatives / quick 15-min chat`,
      );
      setGeneratedBody(
        pitch.body ||
          `Hi ${contact.name},\n\nLoved ${contact.company}'s recent technical scaling engineering milestones.\n\nWould love to learn about your team's workflow and share a quick bit about my background in full-stack architecture.\n\nDo you have 15 minutes for a quick virtual coffee next week?\n\nBest,\n[Your Name]`,
      );
    } catch (error: any) {
      console.error("Failed generating pitch draft:", error);
      setPitchError(
        error?.message || "An unexpected error occurred while generating the outreach pitch. Please try again."
      );
    } finally {
      setGeneratingPitch(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {viewMode === "pitch_result" ? (
        <div className="max-w-4xl mx-auto">
          {/* Top Navigation: Back / Close */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleClosePitchResult}
              className="inline-flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-ink-dim hover:text-accent transition-colors cursor-pointer py-2.5 px-4 rounded-xl hover:bg-surface border border-border"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Outreach Hub
            </button>
            <button
              onClick={handleClosePitchResult}
              className="p-2.5 text-ink-dim hover:text-ink hover:bg-surface rounded-xl border border-border transition-colors cursor-pointer"
              title="Close Pitch Result"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold font-mono px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Outreach Pitch Generated
              </span>
              {selectedContact && (
                <span className="text-xs text-ink-dim font-medium">
                  for <strong className="text-ink">{selectedContact.name}</strong> @ <strong className="text-ink">{selectedContact.company}</strong>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight uppercase">
              Tailored Referral Pitch
            </h1>
            <p className="text-xs text-ink-dim mt-1 font-medium">
              Review and copy your customized cold outreach email before contacting recruiters or hiring managers.
            </p>
          </div>

          {/* Body: Loading vs Error vs Result */}
          {generatingPitch ? (
            <div className="glass-panel p-10 sm:p-14 text-center rounded-3xl border border-border">
              <Loader2 className="w-9 h-9 text-accent animate-spin mx-auto mb-4" />
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-2">
                Synthesizing Personalized Pitch...
              </h3>
              <p className="text-xs text-ink-dim max-w-md mx-auto mb-6">
                Generating custom referral pitch for {selectedContact?.name || "Recruiter"} at {selectedContact?.company || "Target Company"} aligned with your background.
              </p>
              <div className="max-w-md mx-auto">
                <SkeletonLoader type="card" lines={4} />
              </div>
            </div>
          ) : pitchError ? (
            <div className="glass-panel p-8 sm:p-12 text-center rounded-3xl border border-rose-500/20 bg-rose-500/5 max-w-lg mx-auto">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-2">
                Pitch Generation Issue
              </h3>
              <p className="text-xs text-ink-dim mb-6 leading-relaxed">
                {pitchError}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleGeneratePitch(selectedContact, outreachTone)}
                  disabled={generatingPitch}
                  className="bg-accent text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-accent/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
                <button
                  onClick={handleClosePitchResult}
                  className="bg-surface border border-border text-ink py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest hover:border-accent/40 transition-all cursor-pointer"
                >
                  Back / Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-border space-y-6">
              {/* Subject field */}
              <div className="bg-background border border-border p-4 rounded-2xl">
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-2 font-mono">
                  Subject line
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={generatedSubject}
                    onChange={(e) => setGeneratedSubject(e.target.value)}
                    className="flex-1 bg-surface border border-border px-4 py-3 rounded-xl text-xs text-ink font-sans focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedSubject);
                      setCopiedSubject(true);
                      setTimeout(() => setCopiedSubject(false), 2000);
                    }}
                    className="p-3 bg-surface border border-border text-ink-dim hover:text-accent rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Copy Subject"
                  >
                    {copiedSubject ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
                      {copiedSubject ? "Copied" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Body field */}
              <div className="bg-background border border-border p-4 rounded-2xl">
                <label className="text-[10px] font-bold text-ink-dim uppercase tracking-widest block mb-2 font-mono">
                  Cold outreach body
                </label>
                <textarea
                  value={generatedBody}
                  onChange={(e) => setGeneratedBody(e.target.value)}
                  rows={10}
                  className="w-full bg-surface border border-border p-4 rounded-xl text-xs text-ink font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedBody);
                      setCopiedBody(true);
                      setTimeout(() => setCopiedBody(false), 2000);
                    }}
                    className="p-2.5 bg-surface border border-border text-ink-dim hover:text-accent rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedBody ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-widest font-mono">
                      {copiedBody ? "Body Copied" : "Copy Body"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const fullMail = `Subject: ${generatedSubject}\n\n${generatedBody}`;
                    navigator.clipboard.writeText(fullMail);
                    setCopiedAll(true);
                    setTimeout(() => setCopiedAll(false), 2000);
                  }}
                  className="flex-1 bg-surface border border-border text-ink py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:border-accent transition-colors cursor-pointer"
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
                  className="flex-1 bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Send in Gmail
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--hf-text)] tracking-tight mb-2">
              Outreach drafts
            </h1>
            <p className="text-sm text-[var(--hf-text-secondary)] font-normal">
              Draft personalized cold emails to contacts. Review and edit before sending.
            </p>
          </div>

          {/* Add Connection Modal */}
          <AnimatePresence>
            {showAddModal && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-contact-title"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="hf-card w-full max-w-md p-6 relative shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    aria-label="Close dialog"
                    className="absolute top-4 right-4 p-2.5 rounded-lg text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h2 id="add-contact-title" className="text-base font-semibold text-[var(--hf-text)] mb-5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--hf-cta)]" />
                    Add contact
                  </h2>

                  <form onSubmit={handleAddContact} className="space-y-4">
                    <div>
                      <label htmlFor="new-contact-name" className="block text-xs font-medium text-[var(--hf-text)] mb-1.5">
                        Contact name
                      </label>
                      <input
                        id="new-contact-name"
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Priyesh Patel"
                        className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-contact-company" className="block text-xs font-medium text-[var(--hf-text)] mb-1.5">
                        Company
                      </label>
                      <input
                        id="new-contact-company"
                        type="text"
                        required
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="e.g. Google India"
                        className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-contact-email" className="block text-xs font-medium text-[var(--hf-text)] mb-1.5">
                        Email address
                      </label>
                      <input
                        id="new-contact-email"
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. contact@example.com"
                        className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors min-h-[44px]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingContact}
                      className="hf-btn-primary w-full min-h-[44px] py-2.5 text-sm flex items-center justify-center gap-2 mt-4 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                    >
                      {addingContact ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Adding contact...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Add contact</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Email settings, Candidate background, and Drafting tips */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          {/* Email settings card */}
          <div className="hf-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[var(--hf-cta)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--hf-text)]">
                  Your email address
                </h2>
                <p className="text-xs text-[var(--hf-text-secondary)]">
                  Used for pre-filling outgoing links
                </p>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="outreach-gmail-input" className="block text-xs font-medium text-[var(--hf-text)] mb-1.5">
                Gmail or sender address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--hf-text-secondary)]">
                  <Inbox className="w-4 h-4" />
                </div>
                <input
                  id="outreach-gmail-input"
                  type="email"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="your.name@gmail.com"
                  className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors min-h-[44px] pl-9"
                />
              </div>
            </div>

            <div className="p-3 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg text-xs text-[var(--hf-text-secondary)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--hf-text-secondary)] shrink-0 mt-0.5" />
              <span>
                Saved on this device only, and used to pre-fill the Gmail compose link. Nothing is sent from this page.
              </span>
            </div>
          </div>

          {/* Candidate background card */}
          <div className="hf-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[var(--hf-cta)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--hf-text)]">
                    Candidate background
                  </h2>
                  <p className="text-xs text-[var(--hf-text-secondary)]">
                    Context used by AI to personalize outreach drafts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadLatestResumeContext}
                disabled={loadingContext}
                className="hf-btn-secondary text-xs min-h-[44px] px-3.5 py-2 inline-flex items-center justify-center gap-2"
                title="Load from latest resume"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingContext ? "animate-spin" : ""}`}
                />
                <span>{loadingContext ? "Loading resume..." : "Load from latest resume"}</span>
              </button>
            </div>

            <p className="text-xs text-[var(--hf-text-secondary)] mb-3 leading-relaxed">
              Summarize your skills, recent experience, and target roles. This is included in the prompt when generating drafts.
            </p>

            <div>
              <label htmlFor="outreach-candidate-context" className="block text-xs font-medium text-[var(--hf-text)] mb-1.5">
                Background summary
              </label>
              <textarea
                id="outreach-candidate-context"
                value={candidateContext}
                onChange={(e) => setCandidateContext(e.target.value)}
                rows={7}
                className="w-full bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-lg p-3 text-sm text-[var(--hf-text)] placeholder-[var(--hf-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] transition-colors resize-y"
                placeholder="Detail your technology stack, notable milestones, and what specific types of positions you are seeking..."
              />
              <div className="mt-2 text-xs text-[var(--hf-text-secondary)]">
                <span className="tabular-nums font-medium">{candidateContext.length}</span> characters
              </div>
            </div>
          </div>

          {/* Drafting tips card */}
          <div className="hf-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-[var(--hf-warning)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--hf-text)]">
                Drafting tips
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--hf-text-secondary)] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[var(--hf-cta)] font-bold shrink-0">•</span>
                <span><strong>Be specific:</strong> Mention a relevant project, shared connection, or specific initiative at the company.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--hf-cta)] font-bold shrink-0">•</span>
                <span><strong>Keep it short:</strong> Aim for 3–5 sentences so the email is quick to read on a phone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--hf-cta)] font-bold shrink-0">•</span>
                <span><strong>Ask for advice, not a job:</strong> Request 10–15 minutes for advice or questions rather than directly asking for a referral or interview.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column - Referral Contacts */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="hf-card p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[var(--hf-cta)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--hf-text)]">
                    Referral contacts
                  </h2>
                  <p className="text-xs text-[var(--hf-text-secondary)]">
                    Target contacts for outreach
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="hf-btn-primary text-xs min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
              >
                <Plus className="w-4 h-4" />
                <span>Add contact</span>
              </button>
            </div>

            {loadingContacts ? (
              <div className="flex flex-col items-center justify-center p-16 gap-3 text-center">
                <Loader2 className="w-6 h-6 text-[var(--hf-cta)] animate-spin" />
                <span className="text-xs text-[var(--hf-text-secondary)]">
                  Loading contacts...
                </span>
              </div>
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Start your recruiter outreach"
                targetRole="Tech Recruiters & Engineering Managers"
                description="Add hiring managers and recruiters at your target companies to generate personalized email pitches."
                benefitMetric="Personalized emails that mention a specific project or ask for advice tend to get more thoughtful replies."
                primaryAction={{
                  label: "Add recruiter contact",
                  onClick: () => setShowAddModal(true),
                  icon: Plus
                }}
                secondaryAction={{
                  label: "Explore companies in Job Finder",
                  onClick: () => navigate('/finder'),
                  icon: Briefcase
                }}
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--hf-border)] text-xs font-semibold text-[var(--hf-text-secondary)]">
                        <th className="pb-3 pr-4">Contact</th>
                        <th className="pb-3 pr-4">Company</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hf-border)] text-sm">
                      {contacts.map((ref) => (
                        <tr
                          key={ref.id}
                          className="hover:bg-[var(--hf-surface-secondary)]/50 transition-colors"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-semibold text-[var(--hf-text)] shrink-0">
                                {ref.name?.[0]?.toUpperCase() || "C"}
                              </div>
                              <div>
                                <div className="font-medium text-[var(--hf-text)]">
                                  {ref.name}
                                </div>
                                <div className="text-xs text-[var(--hf-text-secondary)]">
                                  {ref.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="font-medium text-[var(--hf-text)]">
                              {ref.company}
                            </span>
                            {ref.role ? (
                              <div className="text-xs text-[var(--hf-text-secondary)]">
                                {ref.role}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3.5 pr-4">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStatus(ref.id, ref.status)
                              }
                              title="Click to change status"
                              aria-label={`Status: ${ref.status || "Pending Response"}. Click to change status`}
                              className="hf-btn-secondary min-h-[44px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                            >
                              {ref.status === "Referred" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0" />
                                  <span className="text-[var(--hf-success)] font-medium">Referred</span>
                                </>
                              ) : ref.status === "Requested" ? (
                                <>
                                  <Mail className="w-3.5 h-3.5 text-[var(--hf-warning)] shrink-0" />
                                  <span className="text-[var(--hf-warning)] font-medium">Requested</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-[var(--hf-text-secondary)] shrink-0" />
                                  <span className="text-[var(--hf-text-secondary)] font-medium">Pending Response</span>
                                </>
                              )}
                              <span className="text-[11px] text-[var(--hf-text-muted)] ml-1">(Change)</span>
                            </button>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleGeneratePitch(ref)}
                                className="hf-btn-primary min-h-[44px] text-xs px-3 py-2 inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Draft email</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(ref.id)}
                                className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg border border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] hover:border-[var(--hf-error)] transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--hf-error)]"
                                aria-label={`Delete contact ${ref.name}`}
                                title={`Delete contact ${ref.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {contacts.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-4 rounded-lg bg-[var(--hf-surface-secondary)]/40 border border-[var(--hf-border)] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-semibold text-[var(--hf-text)] shrink-0">
                            {ref.name?.[0]?.toUpperCase() || "C"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-[var(--hf-text)] truncate">
                              {ref.name}
                            </div>
                            <div className="text-xs text-[var(--hf-text-secondary)] truncate">
                              {ref.email}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(ref.id)}
                          className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg border border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:text-[var(--hf-error)] hover:border-[var(--hf-error)] transition-colors flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--hf-error)]"
                          aria-label={`Delete contact ${ref.name}`}
                          title={`Delete contact ${ref.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs">
                        <span className="text-[var(--hf-text-secondary)]">Company: </span>
                        <span className="font-medium text-[var(--hf-text)]">{ref.company}</span>
                        {ref.role ? (
                          <span className="text-[var(--hf-text-secondary)]"> • {ref.role}</span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--hf-border)]">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ref.id, ref.status)}
                          title="Click to change status"
                          aria-label={`Status: ${ref.status || "Pending Response"}. Click to change status`}
                          className="hf-btn-secondary min-h-[44px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                        >
                          {ref.status === "Referred" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--hf-success)] shrink-0" />
                              <span className="text-[var(--hf-success)] font-medium">Referred</span>
                            </>
                          ) : ref.status === "Requested" ? (
                            <>
                              <Mail className="w-3.5 h-3.5 text-[var(--hf-warning)] shrink-0" />
                              <span className="text-[var(--hf-warning)] font-medium">Requested</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-[var(--hf-text-secondary)] shrink-0" />
                              <span className="text-[var(--hf-text-secondary)] font-medium">Pending Response</span>
                            </>
                          )}
                          <span className="text-[11px] text-[var(--hf-text-muted)] ml-1">(Change)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGeneratePitch(ref)}
                          className="hf-btn-primary min-h-[44px] text-xs px-3.5 py-2 inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)]"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Draft email</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-8 p-4 bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--hf-surface)] border border-[var(--hf-border)] flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4 text-[var(--hf-cta)]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--hf-text)] mb-1">
                    Reaching out to contacts
                  </h4>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    Personalized emails that mention a specific project or ask for advice tend to get more thoughtful replies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Journey Router / Recommendations */}
      <NextStepBridgeCard
        className="mt-12"
        title="Accelerate your outreach momentum"
        contextData={
          contacts.length > 0
            ? `Tracking ${contacts.length} referral contact${contacts.length > 1 ? "s" : ""} across ${Array.from(new Set(contacts.map((c: any) => c.company))).slice(0, 3).join(", ")}. Keep pitching hiring managers and simulate target company interviews.`
            : "Expand your professional footprint by adding recruiter contacts from your target tech firms and simulating live interviews."
        }
        primaryStep={{
          label:
            contacts.length > 0 && contacts[0]?.company
              ? `Simulate ${contacts[0].company} interview`
              : "Simulate company interview",
          icon: Mic,
          to: "/interview",
          state: {
            company: contacts.length > 0 ? contacts[0]?.company : "Target Company",
            role: contacts.length > 0 ? (contacts[0]?.role || "Software Engineer") : "Software Engineer",
            jobDescription: `Target Company: ${contacts.length > 0 ? contacts[0]?.company : "Target Enterprise"}\nFocus: Technical architecture, team collaboration, and behavioral leadership.`
          }
        }}
        secondaryStep={{
          label: "Track in application pipeline",
          icon: Briefcase,
          to: "/jobs",
          state: {
            company: contacts.length > 0 ? contacts[0]?.company : undefined
          }
        }}
      />
    </>
  )}
</div>
);
}
