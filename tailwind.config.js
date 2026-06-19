/** @type {import('tailwindcss').Config} */

// Scholar tokens are stored as "R G B" channels in tailwind.css; wrap each so
// Tailwind's opacity modifiers (bg-primary/10, hover:bg-primary/90) resolve to
// rgb(... / <alpha-value>). Lines (border/input) bake a low alpha for a soft,
// warm hairline by default.
const channel = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgb(var(--color-border) / 0.12)",
        input: "rgb(var(--color-input) / 0.16)",
        ring: channel("--color-ring"),
        background: channel("--color-background"),
        foreground: channel("--color-foreground"),
        primary: {
          DEFAULT: channel("--color-primary"),
          foreground: channel("--color-primary-foreground"),
        },
        secondary: {
          DEFAULT: channel("--color-secondary"),
          foreground: channel("--color-secondary-foreground"),
        },
        destructive: {
          DEFAULT: channel("--color-destructive"),
          foreground: channel("--color-destructive-foreground"),
        },
        muted: {
          DEFAULT: channel("--color-muted"),
          foreground: channel("--color-muted-foreground"),
        },
        accent: {
          DEFAULT: channel("--color-accent"),
          foreground: channel("--color-accent-foreground"),
        },
        popover: {
          DEFAULT: channel("--color-popover"),
          foreground: channel("--color-popover-foreground"),
        },
        card: {
          DEFAULT: channel("--color-card"),
          foreground: channel("--color-card-foreground"),
        },
        success: {
          DEFAULT: channel("--color-success"),
          foreground: channel("--color-success-foreground"),
        },
        warning: {
          DEFAULT: channel("--color-warning"),
          foreground: channel("--color-warning-foreground"),
        },
        error: {
          DEFAULT: channel("--color-error"),
          foreground: channel("--color-error-foreground"),
        },
      },
      borderRadius: {
        '2xl': "calc(var(--radius) + 8px)",
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.05' }],
        '6xl': ['3.75rem', { lineHeight: '1.02' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(28, 27, 25, 0.06)',
        'DEFAULT': '0 2px 8px rgba(28, 27, 25, 0.06), 0 1px 2px rgba(28, 27, 25, 0.04)',
        'md': '0 6px 16px rgba(28, 27, 25, 0.08)',
        'lg': '0 12px 28px rgba(28, 27, 25, 0.10)',
        'xl': '0 20px 48px rgba(28, 27, 25, 0.12)',
        'glow': '0 0 0 1px rgb(var(--color-primary) / 0.08), 0 8px 24px rgb(var(--color-primary) / 0.12)',
        'none': 'none',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "fadeInUp": "fadeInUp 0.6s ease-out",
        "reveal": "reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "float": "float 6s ease-in-out infinite",
        "gentle-pulse": "gentle-pulse 4s ease-in-out infinite",
        "drift": "drift 8s ease-in-out infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "fadeInUp": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "reveal": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "gentle-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
        "drift": {
          "0%, 100%": { transform: "translateX(0px) translateY(0px)" },
          "33%": { transform: "translateX(10px) translateY(-10px)" },
          "66%": { transform: "translateX(-5px) translateY(5px)" },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      zIndex: {
        '1000': '1000',
        '1010': '1010',
        '1020': '1020',
        '1030': '1030',
        '1040': '1040',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
