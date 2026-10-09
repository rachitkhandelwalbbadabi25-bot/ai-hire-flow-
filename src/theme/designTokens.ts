/**
 * Premium Enterprise Design Tokens
 * 
 * Aesthetic Rules:
 * - NO glassmorphism (no backdrop-blur, no bg-opacity layers)
 * - NO neon glows (no box-shadow with purple/blue/cyan spread)
 * - NO gradient backgrounds
 * - Primary bg: #000000, Surface: #121212, Border: #171717
 * - Accent: #00FF41 (Electric Green) - reserved strictly for CTAs, success, progress, active indicators
 * - Text: #FFFFFF primary, #A3A3A3 secondary, #525252 muted
 * - Typography: JetBrains Mono / Geist Mono for Headings (H1-H3), Inter for Body
 * - Border Radius: max lg (0.5rem / 8px)
 * - Focus States: 2px solid #00FF41 ring, offset 2px
 * - Light Mode: #F8FAFC bg, #0F172A text, same green accent
 */

export const designTokens = {
  colors: {
    dark: {
      background: '#000000',
      surface: '#121212',
      surfaceSecondary: '#1A1A1A',
      border: '#171717',
      textPrimary: '#FFFFFF',
      textSecondary: '#A3A3A3',
      textMuted: '#525252',
      accent: '#00FF41', // Electric Green
      success: '#00FF41',
      warning: '#EAB308',
      error: '#EF4444',
    },
    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSecondary: '#F1F5F9',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      accent: '#00FF41',
      success: '#00FF41',
      warning: '#D97706',
      error: '#DC2626',
    },
  },
  typography: {
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: '"JetBrains Mono", "Geist Mono", monospace',
    headings: {
      h1: 'font-mono text-2xl md:text-3xl font-bold tracking-tight text-ink',
      h2: 'font-mono text-xl md:text-2xl font-bold tracking-tight text-ink',
      h3: 'font-mono text-lg font-bold text-ink',
    },
    labels: {
      default: 'text-xs md:text-sm font-medium text-ink-dim',
      tinyCaps: 'text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted',
    },
  },
  radii: {
    none: '0px',
    sm: '0.125rem', // 2px
    default: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px (MAX border radius)
  },
  borders: {
    default: '1px solid var(--border)',
    focus: '2px solid #00FF41',
  },
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-background',
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  /**
   * AI HireFlow Editorial Design System (Phase 1 Tokens)
   * Light-first career SaaS with dark mode variant
   */
  editorial: {
    colors: {
      light: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceSecondary: '#F1F5F9',
        textPrimary: '#15263B',
        textSecondary: '#526174',
        textMuted: '#68778A',
        cta: '#2563EB',
        navy: '#0F1720',
        darkPanel: '#151D28',
        aiTeal: '#0F766E',
        mint: '#CCFBF1',
        success: '#15803D',
        warning: '#A16207',
        error: '#B42318',
        border: '#DCE3EC',
      },
      dark: {
        background: '#0F1720',
        surface: '#151D28',
        surfaceSecondary: '#1E293B',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        cta: '#3B82F6',
        navy: '#0F1720',
        darkPanel: '#151D28',
        aiTeal: '#14B8A6',
        mint: '#134E4A',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#273549',
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
      sm: '0.375rem', // 6px
      md: '0.5rem',   // 8px
      lg: '0.625rem', // 10px
      xl: '0.75rem',  // 12px
    },
    borders: {
      default: '1px solid var(--hf-border)',
      focus: '2px solid var(--hf-cta)',
    },
    shadows: {
      card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    },
  },
} as const;

export const editorialTokens = designTokens.editorial;

export default designTokens;
