import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#09090d", 2: "#111118", 3: "#18181f", 4: "#22222b", 5: "#2e2e38" },
        bone: { DEFAULT: "#f4efe6", 2: "#cfc9bd", 3: "#9b968c", 4: "#6c685f" },
        ember: { DEFAULT: "#ff6a3d", 2: "#ff8f5e", 3: "#ffb48a" },
        tide: "#3fd0c9",
        common: "#b8bcc8",
        uncommon: "#5fd39a",
        rare: "#4fa3ff",
        epic: "#b06bff",
        legendary: "#ffc247",
        mythic: "#ff5fd2",
      },
      fontFamily: {
        sans: ["'Manrope Variable'", "Manrope", "system-ui", "sans-serif"],
        brand: ["Unbounded", "'Manrope Variable'", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        card: "0 24px 60px -24px rgba(0,0,0,0.85), 0 8px 18px -10px rgba(0,0,0,0.6)",
        lift: "0 40px 80px -30px rgba(0,0,0,0.9)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
