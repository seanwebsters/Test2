import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3") },
        line: token("line"),
        teal: { DEFAULT: token("teal"), deep: token("teal-deep"), soft: token("teal-soft") },
        mint: { DEFAULT: token("mint"), soft: token("mint-soft") },
        coral: { DEFAULT: token("coral"), soft: token("coral-soft") },
        lavender: { DEFAULT: token("lavender"), soft: token("lavender-soft") },
        sun: { DEFAULT: token("sun"), soft: token("sun-soft") },
        navy: "#0E1B3D",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans Variable"', "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },
      boxShadow: {
        card: "0 1px 0 rgb(var(--line) / 1), 0 12px 32px -18px rgb(var(--shadow) / 0.35)",
        lift: "0 20px 40px -20px rgb(var(--shadow) / 0.45)",
        press: "0 4px 0 0 rgb(var(--teal-deep) / 1)",
        "press-ink": "0 4px 0 0 rgb(var(--ink) / 0.85)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        wiggle: { "0%,100%": { transform: "rotate(0)" }, "25%": { transform: "rotate(-8deg)" }, "75%": { transform: "rotate(8deg)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,.8,.2,1) both",
        float: "float 4s ease-in-out infinite",
        wiggle: "wiggle .6s ease-in-out",
        shimmer: "shimmer 2.4s linear infinite",
        "spin-slow": "spin-slow 18s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
