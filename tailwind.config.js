/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand: indigo/violet accent, deep neutral canvas
        brand: {
          50: "#eef1ff",
          100: "#e0e4ff",
          200: "#c7ccfe",
          300: "#a5a8fc",
          400: "#8b83f8",
          500: "#7c65f1",
          600: "#6d47e5",
          700: "#5d37c9",
          800: "#4c2fa2",
          900: "#402c80",
          950: "#261a4d",
        },
        ink: {
          950: "#0a0a12",
          900: "#0f0f1a",
          850: "#14141f",
          800: "#1a1a28",
          700: "#242438",
          600: "#33334d",
          // 500 is used only for muted text; lifted from #4a4a68 (~2.2:1 on the
          // dark canvas, below the readable floor) to ~3.3:1 while staying secondary.
          500: "#626282",
          400: "#6c6c8a",
          300: "#9494b0",
          200: "#c4c4d6",
          100: "#e6e6f0",
        },
        correct: {
          DEFAULT: "#10b981",
          soft: "#064e3b",
        },
        wrong: {
          DEFAULT: "#ef4444",
          soft: "#4c1414",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,101,241,0.25), 0 8px 40px -12px rgba(124,101,241,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -18px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,101,241,0.18), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
