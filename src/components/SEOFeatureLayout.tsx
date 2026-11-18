import React, { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEOHead from './SEOHead';
import { SpotlightCard, FadeInSection } from './AnimatedPrimitives';

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
  { code: "01", name: "Resume Analyzer", path: "/resume-analyzer", desc: "ATS compatibility & keyword gap diagnostic." },
  { code: "02", name: "Resume Editor", path: "/resume-editor", desc: "Clean single-column ATS builder with bullet refinement." },
  { code: "03", name: "Live Job Index", path: "/job-finder", desc: "Live job discovery matching your exact skills." },
  { code: "04", name: "Application Tracker", path: "/job-tracker", desc: "Organize applications across pipeline stages." },
  { code: "05", name: "Career Roadmap", path: "/career-advisor", desc: "Personalized skill roadmaps and milestone learning." },
  { code: "06", name: "Interview Lab", path: "/interview-lab", desc: "Practice mock interview questions with STAR feedback." },
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

      {/* 1. Editorial Dossier Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--hf-surface-secondary)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[2px_2px_0px_var(--hf-ink-border)] rounded-sm mb-5">
              <span className="w-2 h-2 rounded-full bg-[var(--hf-cta)] inline-block" />
              <span className="font-sans text-xs font-semibold text-[var(--hf-text)]">
                {badgeText}
              </span>
            </div>

            <h1 className="font-serif-display font-normal text-4xl sm:text-5xl md:text-6xl tracking-tight text-[var(--hf-text)] leading-[1.08] mb-5">
              {h1}
            </h1>

            <p className="text-sm sm:text-base text-[var(--hf-text-secondary)] font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              {heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button
                type="button"
                onClick={onCtaClick}
                disabled={isCtaLoading}
                className="hf-btn-primary min-h-[46px] px-6 w-full sm:w-auto gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{isCtaLoading ? 'Opening...' : ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#how-it-works"
                className="hf-btn-secondary min-h-[46px] px-5 w-full sm:w-auto"
              >
                How it works
              </a>
            </div>
          </motion.div>

          {/* Framed Report Preview */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto bg-[var(--hf-surface)] border-[1.5px] border-[var(--hf-ink-border)] shadow-[5px_5px_0px_var(--hf-ink-border)] rounded-sm overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-[var(--hf-surface-secondary)] border-b-[1.5px] border-[var(--hf-ink-border)] flex items-center justify-between gap-3">
              <span className="font-sans text-xs font-semibold text-[var(--hf-text)]">
                Sample Preview · {badgeText}
              </span>
              <span className="font-sans text-[11px] font-semibold px-2.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-ink-border)] rounded-sm text-[var(--hf-cta)]">
                Interactive preview
              </span>
            </div>
            <div className="p-3 sm:p-5 bg-[var(--hf-bg)]/40">
              {sampleVisual}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. How It Works Section */}
      {howItWorks && howItWorks.length > 0 && (
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
          <div className="max-w-6xl mx-auto">
            <FadeInSection className="max-w-2xl mb-12">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                How it works
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
                {howItWorksTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
                {howItWorksSubtitle}
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {howItWorks.map((item, idx) => (
                <FadeInSection key={idx} delay={idx * 0.06}>
                  <SpotlightCard className="p-6 h-full space-y-3">
                    <span className="font-mono text-xs font-bold text-[var(--hf-text)] px-2 py-0.5 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm inline-block">
                      Step {item.step}
                    </span>
                    <h3 className="font-serif-display text-xl font-semibold text-[var(--hf-text)]">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">{item.desc}</p>
                  </SpotlightCard>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Capabilities / Benefits Grid */}
      {capabilities && capabilities.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
          <div className="max-w-6xl mx-auto">
            <FadeInSection className="max-w-2xl mb-12">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Key capabilities
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
                {capabilitiesTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2.5 leading-relaxed">
                {capabilitiesSubtitle}
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {capabilities.map((cap, idx) => {
                const IconComponent = cap.icon;
                return (
                  <FadeInSection key={idx} delay={idx * 0.08}>
                    <SpotlightCard className="p-6 h-full space-y-3">
                      <div className="w-9 h-9 bg-[var(--hf-surface-secondary)] border border-[var(--hf-ink-border)] rounded-sm text-[var(--hf-cta)] flex items-center justify-center">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <h3 className="font-serif-display text-xl font-semibold text-[var(--hf-text)]">{cap.title}</h3>
                      <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed">{cap.desc}</p>
                    </SpotlightCard>
                  </FadeInSection>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Extra Page-Specific Content */}
      {extraContent}

      {/* 5. Cross-Feature Exploration Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)] bg-[var(--hf-surface)]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="mb-8">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-1.5">
              Connected tools
            </span>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-normal tracking-tight text-[var(--hf-text)]">
              Explore other tools in AI HireFlow
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {otherFeatures.map((feat, idx) => (
              <FadeInSection key={idx} delay={idx * 0.05}>
                <Link to={feat.path} className="block h-full group">
                  <SpotlightCard className="p-4 h-full flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[var(--hf-cta)] block mb-1">
                        MODULE // {feat.code}
                      </span>
                      <h3 className="font-serif-display text-base font-bold text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] transition-colors mb-1">
                        {feat.name}
                      </h3>
                      <p className="text-[11px] text-[var(--hf-text-secondary)] leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--hf-text)] group-hover:text-[var(--hf-cta)] pt-3">
                      <span>INSPECT →</span>
                    </span>
                  </SpotlightCard>
                </Link>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      {faqItems && faqItems.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-b-[1.5px] border-[var(--hf-ink-border)]">
          <div className="max-w-3xl mx-auto">
            <FadeInSection className="mb-12">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--hf-cta)] block mb-2">
                Common questions
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
                {faqTitle}
              </h2>
              <p className="text-sm text-[var(--hf-text-secondary)] mt-2 leading-relaxed">
                {faqSubtitle}
              </p>
            </FadeInSection>

            <div className="space-y-3">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <FadeInSection key={idx} delay={idx * 0.04}>
                    <div className="hf-card overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full min-h-[52px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <span className="font-serif-display text-base sm:text-lg font-semibold text-[var(--hf-text)]">
                          {faq.q}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-[var(--hf-text)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--hf-cta)]' : ''}`} />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                              <p className="text-xs sm:text-sm text-[var(--hf-text-secondary)] leading-relaxed border-t border-[var(--hf-border)] pt-3">
                                {faq.a}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </FadeInSection>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. Final Conversion CTA */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 text-center bg-[var(--hf-surface)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hf-grid-canvas hf-radial-mask"
          aria-hidden="true"
        />
        <FadeInSection className="relative z-10 max-w-2xl mx-auto space-y-5">
          <h2 className="font-serif-display text-3xl sm:text-4xl font-normal tracking-tight text-[var(--hf-text)]">
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
              className="hf-btn-primary min-h-[46px] px-7 w-full sm:w-auto gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isCtaLoading ? 'Opening...' : finalCtaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/"
              className="hf-btn-secondary min-h-[46px] px-6 w-full sm:w-auto"
            >
              Back to overview
            </Link>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
