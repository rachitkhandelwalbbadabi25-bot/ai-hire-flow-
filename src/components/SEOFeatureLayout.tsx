import React, { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight, ChevronDown } from 'lucide-react';
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
  title: string;
  metaDescription: string;
  canonicalPath: string;
  jsonLd: Record<string, any>;

  badgeText: string;
  h1: string;
  heroDescription: string;
  ctaLabel: string;
  onCtaClick: () => Promise<void> | void;
  isCtaLoading?: boolean;

  sampleVisual: ReactNode;

  howItWorksTitle?: string;
  howItWorksSubtitle?: string;
  howItWorks: SEOFeatureStep[];

  capabilitiesTitle?: string;
  capabilitiesSubtitle?: string;
  capabilities: SEOFeatureCapability[];

  extraContent?: ReactNode;

  faqTitle?: string;
  faqSubtitle?: string;
  faqItems: SEOFaqItem[];

  finalCtaTitle: string;
  finalCtaDesc: string;
  finalCtaLabel: string;
}

const ALL_FEATURES = [
  { name: "Resume Analyzer", path: "/resume-analyzer", desc: "ATS compatibility & keyword gap diagnostic." },
  { name: "Resume Editor", path: "/resume-editor", desc: "Clean single-column ATS builder with bullet refinement." },
  { name: "Job Finder", path: "/job-finder", desc: "Live job discovery matching your exact skills." },
  { name: "Application Tracker", path: "/job-tracker", desc: "Organize applications across pipeline stages." },
  { name: "Career Roadmap", path: "/career-advisor", desc: "Personalized skill roadmaps and milestone learning." },
  { name: "Interview Lab", path: "/interview-lab", desc: "Practice mock interview questions with STAR feedback." },
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--hf-surface)] text-[var(--hf-text-secondary)] border border-[var(--hf-border)] shadow-2xs mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--hf-cta)]" />
              <span>{badgeText}</span>
            </div>

            <h1 className="font-sans font-bold text-3xl sm:text-5xl tracking-tight text-[var(--hf-text)] leading-[1.1] mb-5">
              {h1}
            </h1>

            <p className="text-base sm:text-lg text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              {heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={onCtaClick}
                disabled={isCtaLoading}
                className="hf-btn-primary min-h-[46px] px-6 text-sm w-full sm:w-auto gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{isCtaLoading ? 'Opening...' : ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#how-it-works"
                className="hf-btn-secondary min-h-[46px] px-6 text-sm w-full sm:w-auto"
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
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
                {howItWorksTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
                {howItWorksSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {howItWorks.map((item, idx) => (
                <div key={idx} className="hf-card p-6 space-y-3">
                  <span className="font-mono text-xs font-semibold text-[var(--hf-cta)] px-2 py-0.5 rounded bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] inline-block">
                    STEP {item.step}
                  </span>
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
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Architecture &amp; Benefits
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
                {capabilitiesTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
                {capabilitiesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {capabilities.map((cap, idx) => {
                const IconComponent = cap.icon;
                return (
                  <div key={idx} className="hf-card p-6 space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] text-[var(--hf-cta)] flex items-center justify-center">
                      <IconComponent className="w-4 h-4" />
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

      {/* 4. Extra Page-Specific Content */}
      {extraContent}

      {/* 5. Cross-Feature Exploration Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--hf-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-1.5">
              Connected Platform
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hf-text)]">
              Explore other modules in the workspace
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {otherFeatures.map((feat, idx) => (
              <Link
                key={idx}
                to={feat.path}
                className="hf-card p-4 flex flex-col justify-between hover:border-[var(--hf-border-hover)] transition-colors group"
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
                  <span>Explore</span>
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
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
                {faqTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
                {faqSubtitle}
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="hf-card overflow-hidden transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full min-h-[48px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center relative bg-[var(--hf-surface)]">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hf-text)]">
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
              className="hf-btn-primary min-h-[46px] px-7 text-sm w-full sm:w-auto gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isCtaLoading ? 'Opening...' : finalCtaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/"
              className="hf-btn-secondary min-h-[46px] px-6 text-sm w-full sm:w-auto"
            >
              Back to platform overview
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
