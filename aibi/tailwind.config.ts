import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka Variable"', '"Nunito Variable"', "system-ui", "sans-serif"],
        sans: ['"Nunito Variable"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: { DEFAULT: "#1E1538", soft: "#4A3F6B", mute: "#857BA3" },
        grape: {
          50: "#F5F1FF", 100: "#ECE4FF", 200: "#D9CBFF", 300: "#BCA3FF",
          400: "#9C77FF", 500: "#7C4DFF", 600: "#6A35F0", 700: "#5726CC",
          800: "#43209C", 900: "#2E1870",
        },
        lav: { 50: "#FAF8FF", 100: "#F3EFFF", 200: "#E8E1FF" },
        mint: { 100: "#DDF8E6", 400: "#4CD47E", 500: "#2DBE63", 600: "#22A152" },
        coral: { 100: "#FFE3E1", 400: "#FF7A70", 500: "#F5564A", 600: "#D93D32" },
        sun: { 100: "#FFF3D1", 300: "#FFD66B", 400: "#FFC53D", 500: "#F5A70B" },
        sky: { 100: "#DDF0FF", 400: "#4FB2FF", 500: "#2696F0" },
        rose: { 400: "#FF6FB5", 500: "#F0479A" },
      },
      boxShadow: {
        tactile: "0 4px 0 0 rgba(67,32,156,0.9)",
        "tactile-sm": "0 3px 0 0 rgba(67,32,156,0.9)",
        card: "0 1px 2px rgba(46,24,112,0.06), 0 8px 24px -8px rgba(46,24,112,0.16)",
        float: "0 20px 50px -18px rgba(76,35,190,0.45)",
        glow: "0 0 0 6px rgba(124,77,255,0.18), 0 0 40px rgba(124,77,255,0.45)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseRing: { "0%": { transform: "scale(0.9)", opacity: "0.7" }, "100%": { transform: "scale(1.5)", opacity: "0" } },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        floaty: "floaty 3.2s ease-in-out infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
