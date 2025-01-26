export const theme = {
  colors: {
    primary: '#657567',
    cta: '#934b32',
    // Derived colors for different states
    ctaHover: '#833f2a',
    primaryLight: '#7a8a7a',
    primaryDark: '#4d594d',
    background: '#ffffff',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e5e7eb',
  },
  fonts: {
    lora: 'Lora, serif',
    manrope: 'Manrope, sans-serif',
  }
} as const;

export type Theme = typeof theme;

// Common text styles
export const textStyles = {
  h1: 'font-lora text-3xl font-normal leading-tight',
  h2: 'font-manrope text-2xl font-semibold leading-tight',
  h3: 'font-manrope text-xl font-semibold leading-tight',
  body: 'font-manrope text-base font-normal leading-relaxed',
  small: 'font-manrope text-sm font-normal leading-relaxed',
} as const;