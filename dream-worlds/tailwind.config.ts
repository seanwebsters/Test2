import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#04060f",
          900: "#070b1a",
          850: "#0a1024",
          800: "#0e1530",
          700: "#151d40",
          600: "#1f2a55",
        },
        dusk: { 400: "#a99cf0", 500: "#8b7be8", 600: "#6c5bd4" },
        glow: { 300: "#9fd0ff", 400: "#6fb4ff", 500: "#4b93f0" },
        ember: { 200: "#f6e2b8", 300: "#ecc98a", 400: "#d9ae63" },
        mist: { 100: "#eef1fb", 200: "#d5dbef", 300: "#aab3d3", 400: "#7d87ab", 500: "#58618a" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { eyebrow: "0.22em" },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 20px 60px -20px rgba(0,0,0,0.6)",
        glow: "0 0 40px -6px rgba(111,180,255,0.45)",
        gold: "0 0 30px -8px rgba(236,201,138,0.5)",
      },
      keyframes: {
        drift: { "0%,100%": { transform: "translate3d(0,0,0)" }, "50%": { transform: "translate3d(0,-8px,0)" } },
        breathe: { "0%,100%": { opacity: "0.55", transform: "scale(1)" }, "50%": { opacity: "1", transform: "scale(1.06)" } },
        twinkle: { "0%,100%": { opacity: "0.25" }, "50%": { opacity: "1" } },
        pan: { "0%": { transform: "scale(1.08) translate3d(-1.5%,0,0)" }, "100%": { transform: "scale(1.08) translate3d(1.5%,-1%,0)" } },
      },
      animation: {
        drift: "drift 9s ease-in-out infinite",
        breathe: "breathe 7s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
        pan: "pan 40s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
export default config;
