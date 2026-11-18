/**
 * AI HireFlow — Enterprise Design Tokens
 */

export const designTokens = {
  colors: {
    dark: {
      background: '#090D16',
      surface: '#111827',
      surfaceSecondary: '#1E293B',
      border: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      accent: '#3B82F6',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSecondary: '#F1F5F9',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      accent: '#1D4ED8',
      success: '#15803D',
      warning: '#B45309',
      error: '#B91C1C',
    },
  },
  typography: {
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: '"JetBrains Mono", "Geist Mono", monospace',
    headings: {
      h1: 'font-sans text-2xl md:text-3xl font-bold tracking-tight text-ink',
      h2: 'font-sans text-xl md:text-2xl font-bold tracking-tight text-ink',
      h3: 'font-sans text-lg font-semibold text-ink',
    },
    labels: {
      default: 'text-xs md:text-sm font-medium text-ink-dim',
      tinyCaps: 'text-xs font-medium text-ink-muted',
    },
  },
  radii: {
    none: '0px',
    sm: '0.25rem',
    default: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
  borders: {
    default: '1px solid var(--hf-border)',
    focus: '2px solid var(--hf-cta)',
  },
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-[var(--hf-cta)] focus:ring-offset-2 focus:ring-offset-background',
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
  },
  editorial: {
    colors: {
      light: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceSecondary: '#F1F5F9',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        cta: '#1D4ED8',
        navy: '#0F172A',
        darkPanel: '#0F172A',
        aiTeal: '#0F766E',
        mint: '#CCFBF1',
        success: '#15803D',
        warning: '#B45309',
        error: '#B91C1C',
        border: '#E2E8F0',
      },
      dark: {
        background: '#090D16',
        surface: '#111827',
        surfaceSecondary: '#1E293B',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        cta: '#3B82F6',
        navy: '#090D16',
        darkPanel: '#111827',
        aiTeal: '#2DD4BF',
        mint: '#115E59',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#1E293B',
      },
    },
    typography: {
      fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontMono: '"JetBrains Mono", "Geist Mono", monospace',
      headings: {
        h1: 'font-sans text-2xl md:text-3xl font-bold tracking-tight text-[var(--hf-text)]',
        h2: 'font-sans text-xl md:text-2xl font-bold tracking-tight text-[var(--hf-text)]',
        h3: 'font-sans text-lg font-semibold text-[var(--hf-text)]',
      },
      body: {
        base: 'font-sans text-sm md:text-base text-[var(--hf-text)] leading-relaxed',
        muted: 'font-sans text-sm text-[var(--hf-text-secondary)] leading-relaxed',
      },
      numbers: 'font-sans tabular-nums font-semibold',
    },
    radii: {
      sm: '0.375rem',
      md: '0.5rem',
      lg: '0.625rem',
      xl: '0.75rem',
    },
    borders: {
      default: '1px solid var(--hf-border)',
      focus: '2px solid var(--hf-cta)',
    },
    shadows: {
      card: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
      dropdown: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
    },
  },
} as const;

export const editorialTokens = designTokens.editorial;

export default designTokens;
