// Tailwind CSS configuration file for the SalesPulse application
// Configures the design system, color palette, and custom utilities
// Integrates with shadcn/ui components and custom CSS variables

import type { Config } from "tailwindcss";

// Export the Tailwind configuration
export default {
  // Enable dark mode with class-based switching
  darkMode: ["class"],
  // Specify content paths for Tailwind to scan for class usage
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  // CSS prefix (empty means no prefix)
  prefix: "",
  // Theme configuration
  theme: {
    // Container settings
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    // Extend default theme with custom values
    extend: {
      // Custom color palette using CSS variables
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        sales: {
          primary: 'hsl(var(--sales-primary))',
          'primary-light': 'hsl(var(--sales-primary-light))',
          secondary: 'hsl(var(--sales-secondary))',
          accent: 'hsl(var(--sales-accent))',
          warning: 'hsl(var(--sales-warning))',
          danger: 'hsl(var(--sales-danger))'
        }
      },
      // Custom background images using CSS variables
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-card': 'var(--gradient-card)'
      },
      // Custom box shadows using CSS variables
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)'
      },
      // Custom border radius using CSS variables
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      // Custom keyframes for animations
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      // Custom animations
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  // Tailwind plugins
  plugins: [require("tailwindcss-animate")],
} satisfies Config;