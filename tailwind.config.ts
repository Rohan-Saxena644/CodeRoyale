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
        ink: "#121212",
        panel: "#1f1e1a",
        panelEdge: "#3d3a31",
        gold: "#f4bd51",
        lime: "#95df61",
        coral: "#f07b6e",
        mist: "#ebe4d4"
      },
      boxShadow: {
        card: "0 18px 40px rgba(0, 0, 0, 0.28)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(244,189,81,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(149,223,97,0.14), transparent 25%)"
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: [
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
