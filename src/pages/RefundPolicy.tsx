import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { 
  RotateCcw, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Mail,
  ArrowLeft,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function RefundPolicy() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Refund & Cancellation Policy | AI HireFlow",
    "description": "Refund and Cancellation Policy for AI HireFlow detailing subscription cancellation, digital credit top-up packs, failed transaction resolution, and support protocols.",
    "publisher": {
      "@type": "Organization",
      "name": "AI HireFlow"
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-black">
      <SEOHead 
        title="Refund & Cancellation Policy | AI HireFlow"
        description="Review AI HireFlow's Refund and Cancellation Policy. Understand subscription renewals, consumable credit pack terms, duplicate transaction resolutions, and support procedures."
        canonicalPath="/refund"
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
            <RotateCcw className="w-3.5 h-3.5" /> Billing &amp; Cancellations
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight text-ink mb-4">
            Refund &amp; Cancellation Policy
          </h1>

          <p className="text-sm text-ink-dim font-mono">
            Effective Date: September 2026 &bull; Platform: AI HireFlow
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* 1. Overview */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">1. Overview of Digital Services</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow provides instant, web-based digital career intelligence services, including automated ATS resume diagnostics, AI mock interview simulations, tailored job searches, and on-demand AI Credits.
          </p>
          <p className="text-sm leading-relaxed text-ink-dim">
            Because our services deliver immediate digital compute, analysis, and consumables upon purchase, this Refund &amp; Cancellation Policy outlines how recurring subscriptions, one-time credit top-up packs, and billing discrepancies are managed.
          </p>
        </section>

        {/* 2. Subscription Cancellations */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">2. Subscription Cancellation Policy</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            If you have subscribed to a paid monthly plan (such as Pro or Premium), you have the freedom to cancel your subscription at any time:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>Cancellation Timing:</strong> You may cancel your active subscription prior to the start of your subsequent billing cycle directly through your account settings or by notifying our support desk.</li>
            <li><strong>Active Period Continuity:</strong> Upon canceling, your paid plan benefits, daily credit allocations, and higher feature limits will remain active until the end of your current prepaid monthly cycle.</li>
            <li><strong>No Renewal:</strong> Following the end of the active billing cycle, your account will automatically transition to the Free Tier without further charges.</li>
            <li><strong>Past Subscription Charges:</strong> Subscription fees paid for current or elapsed billing cycles are non-refundable, as platform compute and premium benefits were provisioned for that duration.</li>
          </ul>
        </section>

        {/* 3. Credit Top-Up Packs */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">3. AI Credit Top-Up Packs Policy</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow provides one-time digital credit top-up packs (100 Credits for &#8377;49, 300 Credits for &#8377;99, 750 Credits for &#8377;199, 2,000 Credits for &#8377;399) processed securely via Razorpay:
          </p>
          <ul className="list-disc list-inside text-sm text-ink-dim space-y-2 pl-2">
            <li><strong>Instant Digital Delivery:</strong> Top-up credits are consumable digital items deposited directly into your user account wallet immediately upon Razorpay payment confirmation.</li>
            <li><strong>Non-Refundable Once Credited:</strong> Because credit packs are provisioned instantly and provide immediate access to on-demand AI compute, credit pack purchases are generally non-refundable once credited to your account.</li>
            <li><strong>No Cash Redemption:</strong> Unused credits remain in your digital wallet for future platform usage and cannot be redeemed, transferred, or exchanged for cash or currency.</li>
          </ul>
        </section>

        {/* 4. Payment Failures & Duplicate Debits */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">4. Payment Issues, Duplicate Charges &amp; Technical Failures</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            We are committed to fair and transparent billing. If you encounter any of the following scenarios, we will investigate and resolve the issue:
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-lg bg-background border border-border">
              <p className="text-xs font-bold text-ink">Account Debited but Credits Not Deposited</p>
              <p className="text-xs text-ink-dim mt-1">
                If your bank or UPI account was debited, but due to a network drop or gateway verification delay your credit wallet was not updated, our system or support team will reconcile the transaction with Razorpay to credit your wallet or reverse the charge.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background border border-border">
              <p className="text-xs font-bold text-ink">Duplicate Debits</p>
              <p className="text-xs text-ink-dim mt-1">
                If your bank account was accidentally charged more than once for a single order due to a gateway double-submit, we will verify the duplicate Razorpay transaction IDs and initiate a refund for the excess charge back to the original source.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background border border-border">
              <p className="text-xs font-bold text-ink">Persistent Platform Technical Errors</p>
              <p className="text-xs text-ink-dim mt-1">
                If a confirmed platform-side bug completely prevented you from accessing purchased features after payment, we will review your account activity and work with you to ensure fair resolution.
              </p>
            </div>
          </div>
        </section>

        {/* 5. How to Request Assistance */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">5. How to Contact Us for Billing Inquiries</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            If you have a payment concern, duplicate debit, or billing question, please contact our support desk directly via email:
          </p>

          <div className="p-5 rounded-lg bg-background border border-border space-y-4">
            <div>
              <p className="text-xs text-ink-dim font-mono uppercase tracking-wider">Direct Billing Support</p>
              <a 
                href="mailto:rrachitkhandelwal@gmail.com" 
                className="text-base font-bold text-ink hover:text-accent font-mono transition-colors"
              >
                rrachitkhandelwal@gmail.com
              </a>
            </div>

            <div className="space-y-2 pt-3 border-t border-border/60">
              <p className="text-xs font-bold text-ink">Please include the following details in your message:</p>
              <ul className="list-disc list-inside text-xs text-ink-dim space-y-1 pl-1">
                <li>Your registered AI HireFlow account email address.</li>
                <li>The Razorpay Payment ID or Order ID (available in your payment receipt SMS/email).</li>
                <li>Date, timestamp, and amount (INR) of the disputed transaction.</li>
                <li>A brief description of the issue (e.g., duplicate deduction, credits not received).</li>
              </ul>
            </div>

            <p className="text-xs text-ink-dim/90">
              Our team reviews payment queries with Razorpay transaction logs and typically responds within 24 to 48 business hours. Approved refunds are processed directly through Razorpay back to your original payment method (bank account, card, or UPI handle).
            </p>
          </div>
        </section>

        {/* 6. Cautionary Notice */}
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">6. Outcome Disclaimers</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">
            AI HireFlow provides automated preparation and diagnostic tools. We do not offer refunds on the basis of employment results, job interview invitations, or employer hiring decisions. All AI-generated outputs are advisory in nature.
          </p>
        </section>

      </div>
    </div>
  );
}
