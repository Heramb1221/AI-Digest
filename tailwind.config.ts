import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens — ink-on-paper palette
        ink: {
          DEFAULT: "#0f0f0f",
          muted:   "#6b6b6b",
          faint:   "#a3a3a3",
        },
        paper: {
          DEFAULT: "#fafaf9",
          raised:  "#ffffff",
          sunken:  "#f3f3f1",
        },
        accent: {
          DEFAULT: "#2563eb",  // electric blue — only used for CTAs
          hover:   "#1d4ed8",
          subtle:  "#eff6ff",
        },
        border: {
          DEFAULT: "#e5e5e3",
          strong:  "#d4d4d0",
        },
        // Category badge colours
        technical: { bg: "#f0f9ff", text: "#0369a1" },
        business:  { bg: "#fefce8", text: "#854d0e" },
        trends:    { bg: "#fdf4ff", text: "#7e22ce" },
        tools:     { bg: "#f0fdf4", text: "#166534" },
        news:      { bg: "#fff7ed", text: "#c2410c" },
      },
      fontFamily: {
        sans:  ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:  ["var(--font-geist-mono)", "monospace"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card:  "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        panel: "0 4px 16px 0 rgb(0 0 0 / 0.08)",
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-out",
        "slide-in":   "slideIn 0.25s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn:   { from: { transform: "translateX(-8px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
