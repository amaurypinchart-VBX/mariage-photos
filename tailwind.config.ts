import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        sage: "var(--sage)",
        "sage-strong": "var(--sage-strong)",
        "sage-tint": "var(--sage-tint)",
        champ: "var(--champ)",
        "champ-tint": "var(--champ-tint)",
        "on-accent": "var(--on-accent)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Times New Roman", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        field: "13px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(35,43,37,.05), 0 8px 24px -12px rgba(35,43,37,.18)",
        lift: "0 2px 4px rgba(35,43,37,.06), 0 20px 40px -16px rgba(35,43,37,.28)",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
