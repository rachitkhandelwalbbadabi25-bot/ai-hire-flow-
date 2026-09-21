import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  Cpu, 
  CreditCard, 
  UserCheck, 
  FileText, 
  AlertCircle,
  Mail,
  ArrowLeft
} from 'lucide-react';

export default function PrivacyPolicy() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy | AI HireFlow",
    "url": "https://www.aihireflow.in/privacy",
    "description": "Privacy Policy for AI HireFlow detailing account security, data usage, AI processing via Velona API, payment processing via Razorpay, and user data rights.",
    "publisher": {
      "@type": "Organization",
      "name": "AI HireFlow",
      "url": "https://www.aihireflow.in/"
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="Privacy Policy | AI HireFlow"
        description="Learn how AI HireFlow collects, uses, and safeguards your resume data, account information, and payment details. Transparent privacy practices for our career operating system."
        canonicalPath="/privacy"
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
            <ShieldCheck className="w-3.5 h-3.5" /> Legal & Data Protection
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight text-ink mb-4">
            Privacy Policy
          </h1>

          <p className="text-sm text-ink-dim font-mono">
            Effective Date: September 2026 &bull; Platform: AI HireFlow
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* 1. Introduction */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">1. Introduction & Scope</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;platform&rdquo;) operates an intelligent career workspace offering resume diagnostics, ATS keyword gap analysis, resume building, AI-simulated interview preparation, semantic job search matching, and customized career roadmaps.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            This Privacy Policy explains how we collect, handle, process, and protect your information when you access or interact with AI HireFlow. We are committed to maintaining the confidentiality of your professional profile and handling all candidate data transparently and responsibly.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            If you have questions regarding this policy or our data practices, contact us at <a href="mailto:rrachitkhandelwal@gmail.com" className="text-accent underline font-mono">rrachitkhandelwal@gmail.com</a>.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">2. Information We Collect</h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-ink">A. Account & Authentication Information</h3>
            <p className="text-sm leading-relaxed text-ink-dim">
              We manage user authentication securely via <strong>Firebase Authentication</strong> (supporting Google OAuth sign-in and verified email authentication). When you create an account or sign in, we receive standard identity tokens including:
            </p>
            <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
              <li>Your unique user identifier (Firebase UID).</li>
              <li>Your primary email address.</li>
              <li>Your display name and public avatar/photo URL (if provided by Google OAuth).</li>
            </ul>
            <p className="text-xs text-ink-dim/80 italic">
              Note: We do not access, collect, or store Google account passwords. All authentication handshakes are managed by Google Identity infrastructure.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-base font-semibold text-ink">B. User-Provided Career & Resume Information</h3>
            <p className="text-sm leading-relaxed text-ink-dim">
              To deliver resume diagnostics, ATS scoring, and interview drills, you may upload or submit:
            </p>
            <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
              <li><strong>Resume Files:</strong> Resumes uploaded in PDF, DOCX, or plain text formats.</li>
              <li><strong>Extracted Resume Content:</strong> Employment history, education, certifications, project highlights, and technical or soft skill inventories.</li>
              <li><strong>Job Search Data:</strong> Target job titles, target companies, job descriptions, and tracked application statuses in the Job Tracker.</li>
              <li><strong>Interview Inputs:</strong> Written answers, speech-to-text transcripts, and self-assessment notes submitted during simulated mock interview sessions.</li>
              <li><strong>Outreach Information:</strong> Recruiter or hiring manager names, target company names, and referral email drafts stored within the Outreach Hub.</li>
            </ul>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-base font-semibold text-ink">C. Technical & Usage Information</h3>
            <p className="text-sm leading-relaxed text-ink-dim">
              When you interact with the application, our servers automatically log standard technical telemetry strictly needed for reliability, rate-limiting, and error diagnostics:
            </p>
            <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
              <li>Browser user-agent, operating system, and screen resolution.</li>
              <li>Timestamped feature requests, API response times, and error codes.</li>
              <li>Local client preferences stored in browser storage (e.g., active theme settings, accessibility modes).</li>
            </ul>
          </div>
        </section>

        {/* 3. How We Use Collected Information */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">3. How Your Information Is Used</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We use the information we collect solely to provide, operate, maintain, and enhance the core capabilities of AI HireFlow, specifically:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>ATS Compatibility Diagnostics:</strong> Evaluating technical keyword density, quantifying bullet points with STAR impact metrics, and flagging parsing anomalies.</li>
            <li><strong>AI Mock Interview Practice:</strong> Generating role-tailored technical and behavioral interview questions and evaluating candidate responses with constructive feedback.</li>
            <li><strong>Job Search & Match:</strong> Comparing candidate skills against role requirements to deliver objective compatibility match scores.</li>
            <li><strong>Career Roadmaps:</strong> Mapping structured step-by-step milestones to bridge skill gaps between candidate profiles and target positions.</li>
            <li><strong>Credit & Subscription Management:</strong> Tracking your AI credit balance, allocating daily/monthly quotas, and validating plan access limits.</li>
            <li><strong>Security & Diagnostics:</strong> Monitoring API availability, enforcing rate limits, preventing automated abuse, and troubleshooting technical errors.</li>
          </ul>
        </section>

        {/* 4. AI Processing Architecture & Velona API */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">4. AI Processing Architecture (Velona API)</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow utilizes advanced generative language models to power resume evaluation, bullet point revision, interview simulation, and career advice.
          </p>
          <div className="bg-background/60 border border-border/80 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-accent uppercase font-bold">
              <Lock className="w-3.5 h-3.5" /> Server-Side Isolated AI Execution
            </div>
            <p className="text-xs leading-relaxed text-ink-dim">
              All AI model completions are orchestrated server-side through the <strong>Velona API</strong> using the dedicated model <strong><code className="bg-surface px-1.5 py-0.5 rounded text-ink font-mono">z-ai/glm-5.3-flash</code></strong>.
            </p>
            <p className="text-xs leading-relaxed text-ink-dim">
              <strong>Credential Protection:</strong> All private API keys, authentication tokens, and system prompts reside strictly within secured server environments. Sensitive credentials are never exposed, bundled into client-side JavaScript, or transmitted to end-user browsers.
            </p>
            <p className="text-xs leading-relaxed text-ink-dim">
              <strong>Purpose-Bound Inference:</strong> Text payloads sent to the language model endpoint are processed transiently solely to compute the specific diagnostic or advisory response requested by you in real time.
            </p>
          </div>
        </section>

        {/* 5. Payment Processing via Razorpay */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">5. Payment Processing Through Razorpay</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            All commercial transactions—including subscription plan upgrades and one-time AI credit top-up pack purchases—are processed through <strong>Razorpay</strong> (Razorpay Software Private Limited).
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>No Stored Financial Credentials:</strong> AI HireFlow servers <strong>never</strong> collect, store, or process raw credit/debit card numbers, CVVs, net banking credentials, or UPI PINs. All payment data is entered directly into Razorpay&apos;s encrypted, PCI-DSS compliant payment modal.</li>
            <li><strong>Transaction Records:</strong> For order fulfillment and receipt generation, we receive and store non-sensitive payment metadata: Razorpay Order ID, Razorpay Payment ID, payment verification signature, transaction timestamp, payment status, and amount paid (INR).</li>
          </ul>
        </section>

        {/* 6. Third-Party Service Providers */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">6. Data Sharing & Third-Party Service Providers</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We do <strong>not</strong> sell, rent, monetize, or disclose your resume, contact information, or career documents to third-party advertisers or recruitment marketing agencies. Data is shared strictly with essential operational service providers required to deliver the platform:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-lg bg-background border border-border space-y-1">
              <p className="text-xs font-bold text-ink">Firebase / Google Cloud</p>
              <p className="text-xs text-ink-dim">User authentication, database storage (Firestore), and secure cloud hosting.</p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border space-y-1">
              <p className="text-xs font-bold text-ink">Velona API</p>
              <p className="text-xs text-ink-dim">Server-side language model inference using <code className="text-accent text-[11px]">z-ai/glm-5.3-flash</code>.</p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border space-y-1">
              <p className="text-xs font-bold text-ink">Razorpay</p>
              <p className="text-xs text-ink-dim">Payment processing for Indian Rupee subscription plans and credit top-up packs.</p>
            </div>
          </div>
        </section>

        {/* 7. Security Practices */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">7. Security Practices & Safeguards</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We employ industry-standard technical and operational safeguards designed to prevent unauthorized access, alteration, or disclosure of your information:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-1.5 pl-2">
            <li>HTTPS encryption (TLS 1.3) for all web traffic and API communications.</li>
            <li>Granular Firestore Security Rules ensuring users can only read and write documents belonging to their authenticated user identifier.</li>
            <li>Separation of client and server code so credentials, secrets, and API tokens remain protected.</li>
          </ul>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background border border-border/80 text-xs text-ink-dim">
            <AlertCircle className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <span>
              Please note that while we implement robust engineering controls, no internet-connected platform or electronic transmission can guarantee 100% invulnerability against all potential security risks.
            </span>
          </div>
        </section>

        {/* 8. User Rights & Data Management */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">8. User Rights & Data Management</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            You retain control over the information you provide to AI HireFlow:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>Access & Review:</strong> You can view your uploaded master resumes, stored editor sections, job tracking pipeline, and interview lab scores directly through your account dashboard.</li>
            <li><strong>Modification & Deletion:</strong> You can edit resume sections, remove tracked jobs, or overwrite your profile details at any time.</li>
            <li><strong>Account Deletion Requests:</strong> If you wish to delete your account and associated profile records from our database, email your request to <a href="mailto:rrachitkhandelwal@gmail.com" className="text-accent underline font-mono">rrachitkhandelwal@gmail.com</a> from your registered account email.</li>
          </ul>
        </section>

        {/* 9. Policy Updates */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">9. Updates to This Policy</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We may revise this Privacy Policy periodically to reflect enhancements to our features, operational updates, or changes in legal guidelines. The updated version will be indicated by the Effective Date at the top of this document. Continued use of AI HireFlow after any changes indicates your acknowledgment of the updated policy.
          </p>
        </section>

        {/* 10. Contact Information */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">10. Contact Information</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            For any questions, concerns, or inquiries regarding this Privacy Policy or your personal information, contact our support desk:
          </p>
          <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-ink-dim font-mono uppercase tracking-wider">Support Email</p>
              <a 
                href="mailto:rrachitkhandelwal@gmail.com" 
                className="text-sm font-bold text-ink hover:text-accent font-mono transition-colors"
              >
                rrachitkhandelwal@gmail.com
              </a>
            </div>
            <a
              href="mailto:rrachitkhandelwal@gmail.com?subject=AI%20HireFlow%20Privacy%20Inquiry"
              className="px-4 py-2 rounded-lg bg-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors"
            >
              Email Privacy Team
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
