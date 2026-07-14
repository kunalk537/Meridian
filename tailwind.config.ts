import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Meridian design tokens are declared as CSS variables in app/globals.css
 * (.th-dark / .th-light). Tailwind colors map onto those variables so utilities
 * like `bg-panel` or `text-ink2` resolve to the active theme.
 */
const config: Config = {
  darkMode: ["class", ".th-dark"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        field: "var(--field)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        ink3: "var(--ink3)",
        line: "var(--line)",
        line2: "var(--line2)",
        acc: "var(--acc)",
        acc2: "var(--acc2)",
        onacc: "var(--onacc)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        bad: "var(--bad)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "2px",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
      animation: {
        fadeUp: "fadeUp .25s ease both",
        fadeIn: "fadeIn .2s ease both",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
