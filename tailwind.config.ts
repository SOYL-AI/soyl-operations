import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // SOYL brand palette derived from brand guidelines
        ink: {
          DEFAULT: "#030709",
          900: "#030709",
          800: "#0a1014",
          700: "#11181d",
          600: "#1a2229",
          500: "#252e36",
          400: "#3a434d",
          300: "#535467",
        },
        bone: {
          DEFAULT: "#F5F5FD",
          50: "#FAFAFE",
          100: "#F5F5FD",
          200: "#E7E7EE",
          300: "#C8C8D2",
        },
        mint: {
          DEFAULT: "#AFD0CC",
          50: "#EDF6F4",
          100: "#DCEDEA",
          200: "#C3DFDB",
          300: "#AFD0CC",
          400: "#8DBBB5",
          500: "#6BA59E",
        },
        slate2: {
          DEFAULT: "#535467",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(175,208,204,0.18), 0 12px 40px -12px rgba(175,208,204,0.18)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(175,208,204,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(175,208,204,0.05) 1px, transparent 1px)",
        "radial-mint":
          "radial-gradient(60% 60% at 50% 0%, rgba(175,208,204,0.18) 0%, rgba(3,7,9,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
