import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#111114", 2: "#1D1D22", 3: "#26262D", 4: "#33333C" },
        lime: { DEFAULT: "#DFFF57", deep: "#B8D92E" },
        lavender: "#B6A1FF",
        coral: "#FF7768",
        cobalt: "#587BFF",
        bubblegum: "#FF92C7",
        cream: { DEFAULT: "#F7F4E9", dim: "#B9B6AC", mute: "#7C7A73" },
      },
      fontFamily: {
        sans: ['"Space Grotesk Variable"', "system-ui", "sans-serif"],
        display: ['"Unbounded Variable"', '"Space Grotesk Variable"', "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        spinslow: { to: { transform: "rotate(360deg)" } },
        eq: { "0%,100%": { transform: "scaleY(0.3)" }, "50%": { transform: "scaleY(1)" } },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        shimmer: "shimmer 1.6s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        spinslow: "spinslow 24s linear infinite",
        eq: "eq 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
