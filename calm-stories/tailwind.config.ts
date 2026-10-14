import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: "#07152E", 2: "#0D1E3B", 3: "#132a4f", 4: "#1b3561" },
        lavender: "#A99BF4",
        periwinkle: "#8B9DF4",
        mist: "#AAB6CF",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        glow: "0 0 40px -8px rgba(169,155,244,0.45)",
        card: "0 18px 40px -18px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        twinkle: { "0%,100%": { opacity: "0.3" }, "50%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up .5s ease-out both",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
