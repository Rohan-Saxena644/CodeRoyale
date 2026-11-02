import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F7F9FC",
        bgSoft: "#F8FAFC",
        surface: "#FFFFFF",
        surface2: "#F1F5FB",
        surface3: "#E8EEF7",
        border: "#DCE3ED",
        borderSoft: "#E8EDF4",
        textMain: "#172B4D",
        textMuted: "#4B5F7A",
        textSoft: "#607089",
        primary: "#2459D3",
        primaryHover: "#1C46AB",
        success: "#16734C",
        warning: "#956000",
        danger: "#C33443",
        editorBg: "#FFFFFF",
        ink: "#172B4D",
        panel: "#FFFFFF",
        panelEdge: "#DCE3ED",
        gold: "#2459D3",
        lime: "#16734C",
        coral: "#C33443",
        mist: "#172B4D"
      },
      boxShadow: {
        card: "0 8px 30px -12px rgba(30, 64, 120, 0.12)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(36,89,211,0.05), transparent 45%)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
