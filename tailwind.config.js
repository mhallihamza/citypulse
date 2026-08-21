/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CITYPULSE brand - "signal blue"
        pulse: {
          50: "#EEF6FF",
          100: "#DBEAFF",
          200: "#B5D5FF",
          300: "#86B9FF",
          400: "#5193FF",
          500: "#246BFF",
          600: "#0B5FE8",
          700: "#0A4CB8",
          800: "#0C3E8C",
          900: "#0D326B",
          950: "#071B3E",
        },
        // Deep operational navy (sidebar / hero)
        ink: {
          50: "#F4F6FA",
          100: "#E8ECF3",
          200: "#D4DBE6",
          300: "#A9B6C9",
          400: "#7C8CA6",
          500: "#5A6B85",
          600: "#42526B",
          700: "#2E3B52",
          800: "#1B2739",
          900: "#111A2A",
          950: "#0A1220",
        },
        // Live / connection green
        live: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        alert: {
          warning: "#F59E0B",
          critical: "#EF4444",
          signal: "#246BFF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        "card-hover":
          "0 8px 24px -8px rgba(16,24,40,.14), 0 2px 6px rgba(16,24,40,.06)",
        pop: "0 16px 48px -8px rgba(10,18,32,.25)",
        glow: "0 0 0 1px rgba(36,107,255,.18), 0 8px 28px -6px rgba(36,107,255,.35)",
      },
      borderRadius: {
        xl: "0.9rem",
      },
      animation: {
        "live-ring": "liveRing 2.2s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "soft-pulse": "softPulse 3.5s ease-in-out infinite",
        "feed-in": "feedIn .45s ease-out both",
        "rise-in": "riseIn .5s cubic-bezier(.2,.7,.3,1) both",
        "dash-flow": "dashFlow 1.6s linear infinite",
        "fade-up": "fadeUp .6s ease-out both",
        marquee: "marquee 32s linear infinite",
      },
      keyframes: {
        liveRing: {
          "0%": { transform: "scale(0.6)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        softPulse: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        feedIn: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dashFlow: {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-12" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};