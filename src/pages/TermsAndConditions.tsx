import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  CreditCard, 
  ShieldAlert, 
  Scale, 
  Mail,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export default function TermsAndConditions() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Terms & Conditions | AI HireFlow",
    "description": "Terms and Conditions governing the use of AI HireFlow, covering account responsibilities, AI usage limitations, credit top-up packs, Razorpay billing, and service terms.",
    "publisher": {
      "@type": "Organization",
      "name": "AI HireFlow"
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="Terms & Conditions | AI HireFlow"
        description="Read the Terms and Conditions for AI HireFlow. Covers account rules, AI advisory limitations, credit top-up packs, Razorpay payment processing, and usage guidelines."
        canonicalPath="/terms"
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
            <Scale className="w-3.5 h-3.5" /> Platform Terms
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight text-ink mb-4">
            Terms &amp; Conditions
          </h1>

          <p className="text-sm text-ink-dim font-mono">
            Effective Date: September 2026 &bull; Platform: AI HireFlow
          </p>
        </div>
      </div>

      {/* Main Terms Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* 1. Acceptance */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">1. Acceptance of Terms</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and <strong>AI HireFlow</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;platform&rdquo;). By creating an account, accessing, or using any feature of AI HireFlow, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            If you do not agree to these Terms in their entirety, you must immediately discontinue your use of AI HireFlow.
          </p>
        </section>

        {/* 2. Account Responsibility */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">2. Account Responsibility &amp; Authentication</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            User authentication is managed via Firebase Authentication using Google OAuth and email verification.
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>Accuracy of Information:</strong> You agree to provide accurate, current, and complete information when creating or maintaining your profile.</li>
            <li><strong>Credential Confidentiality:</strong> You are solely responsible for maintaining the confidentiality of your credentials and authentication tokens, and for all activities that occur under your account.</li>
            <li><strong>Unauthorized Access:</strong> You agree to immediately notify us at <a href="mailto:rrachitkhandelwal@gmail.com" className="text-accent underline font-mono">rrachitkhandelwal@gmail.com</a> if you suspect any unauthorized access or compromise of your account.</li>
          </ul>
        </section>

        {/* 3. Permitted & Appropriate Use */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">3. Appropriate &amp; Permitted Use</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow provides tools for individual job seekers, candidates, students, and professionals to:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
            <li>Audit, parse, and improve resume documents against applicant tracking system (ATS) criteria.</li>
            <li>Simulate technical and behavioral interview practice questions and review feedback.</li>
            <li>Discover relevant job listings and track ongoing job application milestones.</li>
            <li>Generate customized professional learning paths and networking outreach templates.</li>
          </ul>
          <p className="text-sm leading-relaxed text-ink-dim">
            The platform is intended exclusively for personal, professional career development. You may not license, sublicense, sell, resell, or exploit any portion of AI HireFlow for commercial resale or agency operations without explicit written permission.
          </p>
        </section>

        {/* 4. AI-Generated Content & User Verification Responsibilities */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">4. AI Content Limitations &amp; User Verification</h2>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
            <p className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
              Critical Notice: Review Before Submitting Applications
            </p>
            <p className="text-sm leading-relaxed text-ink-dim">
              AI HireFlow uses generative artificial intelligence via the server-side Velona API (<code className="text-accent font-mono text-xs">z-ai/glm-5.3-flash</code>) to produce resume bullet rewrites, ATS match scores, mock interview questions, and career advice.
            </p>
            <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-1">
              <li><strong>Advisory &amp; Informational Only:</strong> All AI-generated suggestions, bullet points, skills analyses, and interview answers are advisory suggestions intended to assist your preparation.</li>
              <li><strong>Possibility of Inaccuracies:</strong> Generative models may occasionally generate incomplete, out-of-date, or factually inaccurate text, numbers, or qualifications.</li>
              <li><strong>User Responsibility:</strong> You hold sole responsibility for reviewing, fact-checking, and verifying all generated bullet points, project details, and employment history before incorporating them into your official resumes or communicating them to hiring managers.</li>
              <li><strong>No Hiring Guarantees:</strong> AI HireFlow does <strong>not</strong> guarantee employment, interview callbacks, job offers, salary benchmarks, or hiring outcomes from any company.</li>
            </ul>
          </div>
        </section>

        {/* 5. AI Credits & Usage Rules */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Coins className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">5. AI Credits System &amp; Usage Rules</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            Certain generative AI tools in the application consume digital AI Credits based on compute requirements (such as in-depth ATS resume audits, interview lab drills, cover letter writing, and learning path synthesis).
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>Credit Deductions:</strong> Credits are deducted from your account wallet immediately upon the successful initiation and delivery of an AI analysis task.</li>
            <li><strong>Wallet Balances:</strong> Active credit balances and daily/monthly plan allocations are displayed in your account dashboard and credit wallet.</li>
            <li><strong>Non-Transferable:</strong> AI Credits are tied to your authenticated user account and may not be transferred, exchanged, or resold to other accounts.</li>
          </ul>
        </section>

        {/* 6. Subscriptions & Credit Top-Up Packs */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">6. Subscription Plans &amp; Credit Top-Up Packs</h2>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-ink">A. Subscription Plans</h3>
            <p className="text-sm leading-relaxed text-ink-dim">
              AI HireFlow offers a Free Tier and paid subscription tiers (Pro and Premium) with recurring monthly billing and elevated feature quotas. Plan details, daily credit allotments, and feature allowances are displayed on the platform&apos;s pricing screens.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-base font-semibold text-ink">B. Existing Credit Top-Up Packs</h3>
            <p className="text-sm leading-relaxed text-ink-dim">
              Users may purchase one-time credit top-up packs to add credits directly to their digital wallet:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink font-mono">100 Credits</span>
                    <span className="text-[10px] font-mono font-bold bg-surface px-1.5 py-0.5 rounded border border-border text-ink-dim">MINI</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Quick boost for a few extra AI actions</p>
                </div>
                <span className="text-base font-bold text-accent font-mono">&#8377;49</span>
              </div>

              <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink font-mono">300 Credits</span>
                    <span className="text-[10px] font-mono font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">BOOST</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Popular pack for actively applying</p>
                </div>
                <span className="text-base font-bold text-accent font-mono">&#8377;99</span>
              </div>

              <div className="p-4 rounded-lg bg-background border border-accent/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink font-mono">750 Credits</span>
                    <span className="text-[10px] font-mono font-bold bg-accent text-black px-1.5 py-0.5 rounded">JOB HUNT</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Best value for serious job hunters</p>
                </div>
                <span className="text-base font-bold text-accent font-mono">&#8377;199</span>
              </div>

              <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink font-mono">2,000 Credits</span>
                    <span className="text-[10px] font-mono font-bold bg-surface px-1.5 py-0.5 rounded border border-border text-ink-dim">CAREER</span>
                  </div>
                  <p className="text-xs text-ink-dim mt-0.5">Comprehensive pack for full job search</p>
                </div>
                <span className="text-base font-bold text-accent font-mono">&#8377;399</span>
              </div>
            </div>

            <p className="text-xs text-ink-dim/80">
              Prices are denominated in Indian Rupees (INR). Credit top-ups are consumable digital goods credited immediately upon payment verification.
            </p>
          </div>
        </section>

        {/* 7. Payments via Razorpay */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">7. Payment Processing via Razorpay</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            All credit pack and subscription payments are facilitated via <strong>Razorpay</strong>. By selecting a payment method (UPI, card, net banking), you authorize Razorpay to process your transaction and agree to Razorpay&apos;s applicable terms of service.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            Transactions are verified through cryptographic webhook signature validation. Once Razorpay confirms successful payment, credits are allocated to your user account in real time.
          </p>
        </section>

        {/* 8. Intellectual Property & User Content */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">8. Intellectual Property &amp; User Content</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            <strong>Your Content:</strong> You retain complete ownership and intellectual property rights over the resumes, job descriptions, and career information you upload to AI HireFlow. You grant AI HireFlow a limited, non-exclusive license solely to process and analyze this data to deliver requested platform features.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            <strong>Platform IP:</strong> The AI HireFlow logo, software code, user interface, visual identity, diagnostic algorithms, and documentation are the proprietary intellectual property of AI HireFlow. You may not copy, modify, distribute, or reverse-engineer any component of the platform.
          </p>
        </section>

        {/* 9. Prohibited Activities */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">9. Prohibited Activities</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            You agree not to engage in any of the following prohibited behaviors:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li>Attempting to reverse engineer, decompile, extract, or exploit the underlying source code, system prompts, or backend APIs.</li>
            <li>Using automated crawlers, bots, scrapers, or scripts to flood endpoints or circumvent credit limits and rate limits.</li>
            <li>Attempting to probe, scan, or compromise server infrastructure, database security rules, or payment verification routines.</li>
            <li>Uploading malicious files containing viruses, worms, or harmful executable scripts.</li>
            <li>Submitting defamatory, unlawful, obscene, or fraudulent content.</li>
            <li>Sharing account access or reselling credit quotas to third parties.</li>
          </ul>
        </section>

        {/* 10. Account Suspension & Termination */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">10. Account Suspension &amp; Termination</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We reserve the right to temporarily suspend or permanently terminate your account and access to AI HireFlow, without prior notice or liability, if:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
            <li>You breach any provision of these Terms or our Privacy Policy.</li>
            <li>We identify fraudulent, suspicious, or disputed payment activities related to your account.</li>
            <li>Your account causes malicious, excessive, or abusive strain on server infrastructure or AI provider endpoints.</li>
          </ul>
        </section>

        {/* 11. Third-Party Services */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">11. Third-Party Services &amp; Links</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow integrates third-party tools (such as Firebase, Velona API, and Razorpay) and may display links to external job boards or company career pages. We are not responsible for the availability, terms, content, or practices of third-party websites or services.
          </p>
        </section>

        {/* 12. Disclaimers & Limitation of Liability */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">12. Disclaimer of Warranties &amp; Limitation of Liability</h2>
          </div>
          <div className="bg-background/80 border border-border rounded-lg p-5 space-y-3 text-xs leading-relaxed text-ink-dim">
            <p>
              <strong>&ldquo;AS IS&rdquo; &amp; &ldquo;AS AVAILABLE&rdquo;:</strong> AI HireFlow is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
            <p>
              <strong>NO OUTCOME GUARANTEES:</strong> We do not warrant that the service will meet your specific employment requirements, that generated resumes will pass all proprietary enterprise ATS filters, or that use of the service will result in job offers, interviews, or career progression.
            </p>
            <p>
              <strong>LIMITATION OF DAMAGES:</strong> To the maximum extent permitted by applicable law, in no event shall AI HireFlow, its developers, operators, or service partners be liable for any indirect, incidental, special, consequential, or punitive damages (including loss of profits, loss of opportunities, loss of data, or operational interruptions) arising out of or related to your use or inability to use the platform.
            </p>
            <p>
              <strong>AGGREGATE LIABILITY CAP:</strong> Our total aggregate liability to you for all claims arising out of or relating to these Terms or the service shall not exceed the actual amount paid by you to AI HireFlow in the twelve (12) months preceding the incident giving rise to the claim.
            </p>
          </div>
        </section>

        {/* 13. Contact Information */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">13. Contact Information</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            If you have questions, feedback, or legal inquiries regarding these Terms &amp; Conditions, contact us:
          </p>
          <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-ink-dim font-mono uppercase tracking-wider">Support &amp; Inquiries</p>
              <a 
                href="mailto:rrachitkhandelwal@gmail.com" 
                className="text-sm font-bold text-ink hover:text-accent font-mono transition-colors"
              >
                rrachitkhandelwal@gmail.com
              </a>
            </div>
            <a
              href="mailto:rrachitkhandelwal@gmail.com?subject=AI%20HireFlow%20Terms%20Inquiry"
              className="px-4 py-2 rounded-lg bg-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors"
            >
              Email Legal Desk
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
