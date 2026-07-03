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
        bg: "#080C10",
        bgSoft: "#0D1117",
        surface: "#111827",
        surface2: "#151B23",
        surface3: "#1C2430",
        border: "#273241",
        borderSoft: "#1E293B",
        textMain: "#F8FAFC",
        textMuted: "#94A3B8",
        textSoft: "#64748B",
        primary: "#3B82F6",
        primaryHover: "#2563EB",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        editorBg: "#0D1117",
        ink: "#080C10",
        panel: "#111827",
        panelEdge: "#273241",
        gold: "#3B82F6",
        lime: "#22C55E",
        coral: "#EF4444",
        mist: "#F8FAFC"
      },
      boxShadow: {
        card: "0 14px 32px rgba(0, 0, 0, 0.24)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(244,189,81,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(149,223,97,0.14), transparent 25%)"
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
