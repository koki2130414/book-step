import type { Config } from "tailwindcss";

// BOOK STEP デザイントークン
// 白を基調に、ベージュ/薄いブラウン/深緑をアクセントにした
// 「読書・学び・落ち着き・信頼感」を軸にした配色
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1120px" },
    },
    extend: {
      colors: {
        // ベース(ダークモード切り替え対応のためCSS変数経由で定義)
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        // ベージュ / ブラウン系(温かみ)
        beige: {
          50: "rgb(var(--color-beige-50) / <alpha-value>)",
          100: "rgb(var(--color-beige-100) / <alpha-value>)",
          200: "rgb(var(--color-beige-200) / <alpha-value>)",
          300: "rgb(var(--color-beige-300) / <alpha-value>)",
        },
        clay: {
          400: "#B79A73",
          500: "#93764F",
          600: "#C4995F",
        },
        // 深緑(信頼・成長のアクセント)
        forest: {
          50: "rgb(var(--color-forest-50) / <alpha-value>)",
          100: "rgb(var(--color-forest-100) / <alpha-value>)",
          400: "#5B8266",
          500: "#3E6449",
          600: "#2C4A34",
          700: "#1F3626",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2C4A34",
          foreground: "#FEFDFB",
        },
        secondary: {
          DEFAULT: "#F5EDE1",
          foreground: "#2B2724",
        },
        muted: {
          DEFAULT: "#F5EDE1",
          foreground: "#726A5F",
        },
        accent: {
          DEFAULT: "#EADFCB",
          foreground: "#2B2724",
        },
        destructive: {
          DEFAULT: "#B3452F",
          foreground: "#FEFDFB",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ['"Shippori Mincho"', "serif"],
        body: ['"Zen Kaku Gothic New"', "sans-serif"],
      },
      borderRadius: {
        lg: "0.9rem",
        md: "0.6rem",
        sm: "0.4rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
