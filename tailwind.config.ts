import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Antique gold scale — brand 500 = #c9a959
        gold: {
          50:  "#fbf6e6",
          100: "#f4e9c5",
          200: "#e8d595",
          300: "#dbc070",
          400: "#d3b35e",
          500: "#c9a959",
          600: "#a88c45",
          700: "#8a7235",
          800: "#5e4c22",
          900: "#3d3216",
        },
        // Deep-navy scale — brand 900 = #1A2B56
        ink: {
          950: "#0e1a3e",
          900: "#1a2b56",
          800: "#243869",
          700: "#2e457c",
          600: "#3a5694",
        },
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #e8d595 0%, #c9a959 35%, #8a7235 100%)",
        "ink-gradient":
          "linear-gradient(180deg, #0e1a3e 0%, #1a2b56 60%, #243869 100%)",
        "panel-gradient":
          "linear-gradient(135deg, rgba(201,169,89,0.15) 0%, rgba(26,43,86,0.85) 60%)",
        "hero-radial":
          "radial-gradient(ellipse at top, rgba(201,169,89,0.25), transparent 60%), radial-gradient(ellipse at bottom right, rgba(232,213,149,0.10), transparent 50%)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        gold: "0 10px 30px -10px rgba(201,169,89,0.45)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "sparkle": "sparkle 2.4s ease-in-out infinite",
        "float-up": "floatUp 7s linear infinite",
        "wand-wiggle": "wandWiggle 2.6s ease-in-out infinite",
        "shimmer": "shimmer 3.5s linear infinite",
        "aura-pulse": "auraPulse 3.2s ease-in-out infinite",
        "marquee": "marquee 16s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0.4) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(180deg)" },
        },
        floatUp: {
          "0%": { transform: "translateY(20vh) translateX(0) scale(0.6)", opacity: "0" },
          "10%": { opacity: "0.9" },
          "90%": { opacity: "0.7" },
          "100%": { transform: "translateY(-30vh) translateX(40px) scale(1.1)", opacity: "0" },
        },
        wandWiggle: {
          "0%, 100%": { transform: "rotate(-12deg) translateY(0)" },
          "25%":      { transform: "rotate(18deg) translateY(-6px)" },
          "50%":      { transform: "rotate(-8deg) translateY(2px)" },
          "75%":      { transform: "rotate(14deg) translateY(-4px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        auraPulse: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%":      { opacity: "1",    transform: "scale(1.06)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
