/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--color-base, #09090C)',
        surface: 'var(--color-surface, #121217)',
        elevated: 'var(--color-elevated, #1C1C24)',
        sidebar: 'var(--color-sidebar, #050508)',
        border: 'var(--color-border, #1E1E24)',
        neon: {
          green: 'var(--color-accent-green, #30D158)',
          amber: 'var(--color-accent-amber, #FF9F0A)',
          red: 'var(--color-accent-red, #FF453A)',
          blue: 'var(--color-accent-blue, #0A84FF)',
          purple: 'var(--color-accent-purple, #BF5AF2)',
        },
        chalk: 'var(--color-chalk, #FFFFFF)',
        muted: 'var(--color-muted, #9E9EAD)',
        dim: 'var(--color-dim, #3E3E4F)',
        signal: {
          red: 'var(--color-accent-red, #FF453A)',
          amber: 'var(--color-accent-amber, #FF9F0A)',
          emerald: 'var(--color-accent-green, #30D158)',
          blue: 'var(--color-accent-blue, #0A84FF)',
        },
        tier: {
          critical: 'var(--color-tier-critical, #FF453A)',
          high: 'var(--color-tier-high, #FF9F0A)',
          medium: 'var(--color-tier-medium, #FFD60A)',
          low: 'var(--color-tier-low, #30D158)',
        },
      },
      fontFamily: {
        heading: ['Inter', '"SF Pro Display"', '-apple-system', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
        body: ['Inter', '"SF Pro Text"', '-apple-system', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      boxShadow: {
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.15), 0 0 60px rgba(0, 255, 136, 0.05)',
        'neon-amber': '0 0 20px rgba(255, 184, 0, 0.15), 0 0 60px rgba(255, 184, 0, 0.05)',
        'neon-red': '0 0 20px rgba(255, 51, 102, 0.15), 0 0 60px rgba(255, 51, 102, 0.05)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.15), 0 0 60px rgba(59, 130, 246, 0.05)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'card': '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,136,0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'glow-line': 'glowLine 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'count-up': 'countUp 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(60px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseNeon: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 40px rgba(0, 255, 136, 0.4)' },
        },
        glowLine: {
          '0%, 100%': { opacity: '0.3', width: '40%' },
          '50%': { opacity: '1', width: '60%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
