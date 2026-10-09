import React, { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight, ChevronDown, Sparkles, CheckCircle2 } from 'lucide-react';
import SEOHead from './SEOHead';

export interface SEOFeatureStep {
  step: string;
  title: string;
  desc: string;
}

export interface SEOFeatureCapability {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface SEOFaqItem {
  q: string;
  a: string;
}

export interface SEOFeatureLayoutProps {
  // SEO Metadata
  title: string;
  metaDescription: string;
  canonicalPath: string;
  jsonLd: Record<string, any>;

  // Hero
  badgeText: string;
  h1: string;
  heroDescription: string;
  ctaLabel: string;
  onCtaClick: () => Promise<void> | void;
  isCtaLoading?: boolean;

  // Hero Sample Visual
  sampleVisual: ReactNode;

  // Workflow
  howItWorksTitle?: string;
  howItWorksSubtitle?: string;
  howItWorks: SEOFeatureStep[];

  // Capabilities / Benefits
  capabilitiesTitle?: string;
  capabilitiesSubtitle?: string;
  capabilities: SEOFeatureCapability[];

  // Extra Page-Specific Sections (preserving all existing SEO copy)
  extraContent?: ReactNode;

  // FAQ
  faqTitle?: string;
  faqSubtitle?: string;
  faqItems: SEOFaqItem[];

  // Final CTA
  finalCtaTitle: string;
  finalCtaDesc: string;
  finalCtaLabel: string;
}

const ALL_FEATURES = [
  { name: "AI Resume Analyzer", path: "/resume-analyzer", desc: "ATS compatibility & keyword gap diagnostic." },
  { name: "AI Resume Editor", path: "/resume-editor", desc: "Clean single-column ATS builder with AI bullet refinement." },
  { name: "AI Job Finder", path: "/job-finder", desc: "Semantic job discovery matching your exact skills." },
  { name: "AI Job Tracker", path: "/job-tracker", desc: "Organize applications across pipeline stages." },
  { name: "AI Career Advisor", path: "/career-advisor", desc: "Personalized skill roadmaps and milestone learning." },
  { name: "AI Interview Lab", path: "/interview-lab", desc: "Practice mock interview questions with STAR feedback." },
];

export default function SEOFeatureLayout({
  title,
  metaDescription,
  canonicalPath,
  jsonLd,
  badgeText,
  h1,
  heroDescription,
  ctaLabel,
  onCtaClick,
  isCtaLoading = false,
  sampleVisual,
  howItWorksTitle = "How It Works",
  howItWorksSubtitle = "A structured workflow to elevate your preparation.",
  howItWorks,
  capabilitiesTitle = "System Capabilities",
  capabilitiesSubtitle = "Engineered with precision for career growth.",
  capabilities,
  extraContent,
  faqTitle = "Frequently Asked Questions",
  faqSubtitle = "Answers to common questions about this module.",
  faqItems,
  finalCtaTitle,
  finalCtaDesc,
  finalCtaLabel
}: SEOFeatureLayoutProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const otherFeatures = ALL_FEATURES.filter(f => f.path !== canonicalPath);

  return (
    <div className="flex flex-col bg-[var(--hf-bg)] text-[var(--hf-text)] selection:bg-[var(--hf-cta)] selection:text-white min-h-screen">
      <SEOHead 
        title={title}
        description={metaDescription}
        canonicalPath={canonicalPath}
        jsonLd={jsonLd}
      />

      {/* 1. Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--hf-surface-secondary)] text-[var(--hf-ai-teal)] border border-[var(--hf-border)] mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--hf-ai-teal)]" />
              <span>{badgeText}</span>
            </div>

            <h1 className="font-sans font-bold text-3xl sm:text-5xl md:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.1] mb-6">
              {h1}
            </h1>

            <p className="text-base sm:text-lg text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              {heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button
                type="button"
                onClick={onCtaClick}
                disabled={isCtaLoading}
                className="hf-btn-primary min-h-[48px] px-6 text-sm w-full sm:w-auto gap-2 shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <span>{isCtaLoading ? 'Opening...' : ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#how-it-works"
                className="hf-btn-secondary min-h-[48px] px-6 text-sm w-full sm:w-auto"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Sample Product Visual */}
          <div className="max-w-4xl mx-auto">
            {sampleVisual}
          </div>
        </div>
      </section>

      {/* 2. How It Works Section */}
      {howItWorks && howItWorks.length > 0 && (
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="hf-badge hf-badge-teal mb-3">Workflow</span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
                {howItWorksTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
                {howItWorksSubtitle}
              </p>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(howItWorks.length, 4)} gap-6`}>
              {howItWorks.map((item, idx) => (
                <div key={idx} className="hf-card p-6 space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] flex items-center justify-center text-xs font-bold text-[var(--hf-cta)]">
                    {item.step}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--hf-text)]">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Capabilities / Benefits Grid */}
      {capabilities && capabilities.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="hf-badge hf-badge-teal mb-3">Capabilities</span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
                {capabilitiesTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
                {capabilitiesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((cap, idx) => {
                const IconComponent = cap.icon;
                return (
                  <div key={idx} className="hf-card p-6 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center mb-2">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--hf-text)]">{cap.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">{cap.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Extra Page-Specific Content (Preserving any extra body copy) */}
      {extraContent}

      {/* 5. Cross-Feature Exploration Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="hf-badge hf-badge-teal mb-2">Ecosystem</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
              Explore other AI HireFlow modules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {otherFeatures.map((feat, idx) => (
              <Link
                key={idx}
                to={feat.path}
                className="hf-card p-4 flex flex-col justify-between hover:border-[var(--hf-cta)] transition-colors group"
              >
                <div>
                  <h3 className="text-xs font-semibold text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] transition-colors mb-1">
                    {feat.name}
                  </h3>
                  <p className="text-[11px] text-[var(--hf-text-secondary)] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--hf-cta)] pt-3">
                  <span>Learn more</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      {faqItems && faqItems.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="hf-badge hf-badge-teal mb-3">FAQ</span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
                {faqTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-3 leading-relaxed">
                {faqSubtitle}
              </p>
            </div>

            <div className="space-y-3.5">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="hf-card overflow-hidden transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full min-h-[48px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[var(--hf-text)]">
                        {faq.q}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[var(--hf-text-secondary)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                        <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-3">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. Final Conversion CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative bg-[var(--hf-surface)]">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--hf-text)]">
            {finalCtaTitle}
          </h2>
          <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] leading-relaxed max-w-lg mx-auto">
            {finalCtaDesc}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCtaClick}
              disabled={isCtaLoading}
              className="hf-btn-primary min-h-[48px] px-8 text-sm w-full sm:w-auto gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isCtaLoading ? 'Opening...' : finalCtaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/"
              className="hf-btn-secondary min-h-[48px] px-6 text-sm w-full sm:w-auto"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
