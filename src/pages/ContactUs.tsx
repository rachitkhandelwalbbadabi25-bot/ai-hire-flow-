import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { 
  Mail, 
  MessageSquare, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  Copy, 
  Check, 
  ArrowLeft,
  Send,
  HelpCircle,
  Clock
} from 'lucide-react';

export default function ContactUs() {
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Payment & Billing');
  const [userSubject, setUserSubject] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const contactEmail = 'rrachitkhandelwal@gmail.com';

  const categories = [
    {
      id: 'Payment & Billing',
      label: 'Payments & Razorpay Billing',
      icon: CreditCard,
      description: 'Queries regarding failed transactions, duplicate charges, or invoices.'
    },
    {
      id: 'Credits & Balances',
      label: 'AI Credits & Wallet Balance',
      icon: Sparkles,
      description: 'Questions about daily credit allotments, top-up packs, or deductions.'
    },
    {
      id: 'AI Features & Diagnostics',
      label: 'AI Diagnostics & Features',
      icon: MessageSquare,
      description: 'Feedback or technical questions on ATS scoring, resume edits, or mock interviews.'
    },
    {
      id: 'Account & Authentication',
      label: 'Account & Sign-in Access',
      icon: UserCheck,
      description: 'Google OAuth issues, profile updates, or account login problems.'
    },
    {
      id: 'Subscriptions',
      label: 'Subscriptions & Plan Upgrades',
      icon: HelpCircle,
      description: 'Information regarding Pro or Premium monthly subscription features.'
    },
    {
      id: 'Privacy & Data Rights',
      label: 'Privacy & Data Requests',
      icon: ShieldCheck,
      description: 'Inquiries regarding personal resume data or account deletion requests.'
    }
  ];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const constructMailto = () => {
    const subjectLine = userSubject.trim() 
      ? `[${selectedCategory}] ${userSubject.trim()}`
      : `AI HireFlow Support: ${selectedCategory}`;
    
    const bodyContent = userMessage.trim()
      ? encodeURIComponent(userMessage.trim())
      : encodeURIComponent(`Hi AI HireFlow Support Team,\n\nCategory: ${selectedCategory}\n\n[Please describe your issue, registered email, and transaction ID if applicable]`);

    return `mailto:${contactEmail}?subject=${encodeURIComponent(subjectLine)}&body=${bodyContent}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Us | AI HireFlow",
    "url": "https://www.aihireflow.in/contact",
    "description": "Contact AI HireFlow support for billing, account assistance, AI diagnostics, credit balances, and data privacy inquiries.",
    "publisher": {
      "@type": "Organization",
      "name": "AI HireFlow",
      "url": "https://www.aihireflow.in/"
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="Contact Us | AI HireFlow Support"
        description="Get in touch with the AI HireFlow team for account help, payment issues, credit questions, and technical support. Direct support email: rrachitkhandelwal@gmail.com"
        canonicalPath="/contact"
        jsonLd={jsonLd}
      />

      {/* Header Banner */}
      <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface/50">
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-mono text-ink-dim hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 bg-surface px-3 py-1 rounded-full text-accent text-xs font-mono font-bold uppercase tracking-wider mb-4 border border-border">
            <Mail className="w-3.5 h-3.5" /> Customer Support Desk
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight text-ink mb-4">
            Contact Us
          </h1>

          <p className="text-base text-ink-dim max-w-2xl">
            Have a question about your AI HireFlow account, credit wallet, Razorpay payment, or resume diagnostics? We are here to assist you.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* Primary Support Card */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
            <div>
              <p className="text-xs font-mono text-ink-dim uppercase tracking-wider">Official Support Email</p>
              <div className="flex items-center gap-3 mt-1">
                <a 
                  href={`mailto:${contactEmail}`} 
                  className="text-lg sm:text-xl font-mono font-bold text-ink hover:text-accent transition-colors"
                >
                  {contactEmail}
                </a>
                <button
                  onClick={handleCopyEmail}
                  className="p-1.5 rounded-md hover:bg-background border border-border text-ink-dim hover:text-ink transition-colors"
                  title="Copy email address"
                  type="button"
                >
                  {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-dim font-mono bg-background px-3.5 py-2 rounded-lg border border-border/80">
              <Clock className="w-4 h-4 text-accent" />
              <span>Response within 24–48 business hours</span>
            </div>
          </div>

          {/* Inquiry Categories */}
          <div>
            <h2 className="text-base font-bold text-ink mb-2">Select Support Topic</h2>
            <p className="text-xs text-ink-dim mb-4">
              Select the relevant category to generate a structured email with all necessary context:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      isSelected 
                        ? 'bg-background border-accent ring-1 ring-accent' 
                        : 'bg-background/60 border-border hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-accent/10 text-accent' : 'bg-surface text-ink-dim'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? 'text-ink' : 'text-ink-dim'}`}>
                          {cat.label}
                        </p>
                        <p className="text-[11px] text-ink-dim/80 mt-1 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Email Launcher Form */}
          <div className="pt-4 border-t border-border/80 space-y-4">
            <h3 className="text-sm font-bold text-ink">Compose Message Helper</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-ink-dim mb-1">
                  Subject (Optional):
                </label>
                <input
                  type="text"
                  value={userSubject}
                  onChange={(e) => setUserSubject(e.target.value)}
                  placeholder={`e.g., Query regarding ${selectedCategory}`}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-ink placeholder:text-ink-dim/50 focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-dim mb-1">
                  Details / Message (Optional):
                </label>
                <textarea
                  rows={3}
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Describe what happened. For payment queries, please include your Razorpay Payment ID and registered email."
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-ink placeholder:text-ink-dim/50 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <p className="text-[11px] text-ink-dim font-mono">
                  Target: <span className="text-ink">{contactEmail}</span>
                </p>

                <a
                  href={constructMailto()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Launch Email Client
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Support Guidelines */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-ink">Helpful Tips for Faster Resolution</h2>
          </div>
          <p className="text-xs leading-relaxed text-ink-dim">
            To ensure your inquiry is resolved as swiftly as possible, please consider including:
          </p>
          <ul className="list-disc list-inside text-xs text-ink-dim space-y-1.5 pl-2">
            <li><strong>Registered Email:</strong> Email us from (or mention) the email address linked to your AI HireFlow account.</li>
            <li><strong>Payment Receipts:</strong> For transaction or credit balance issues, attach or quote your Razorpay Payment ID.</li>
            <li><strong>Technical Diagnostics:</strong> If encountering a problem with the ATS checker or interview lab, mention your browser and the job title or format you were testing.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
