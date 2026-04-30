// Giraffe Wallet brand tokens. Mirrored as CSS variables in globals.css; this
// module is the source of truth for any TS-side use (chart colors, exported
// tokens, etc.).

export const BRAND = {
  name: "Giraffe Wallet",
  colors: {
    purple: "#4B2F79",
    purpleDark: "#2E1B4D",
    purpleLight: "#7A5BA8",
    purpleSoft: "#EDE8F4",
    ink: "#0F0A1A",
    paper: "#FAF9FC",
    paperWarm: "#F2EFE8",
    line: "#E5E1EE",
    muted: "#6B6478",
    success: "#1F7A4D",
    warning: "#B8801F",
    danger: "#A1322B",
  },
  fonts: {
    headline: '"Bebas Neue", sans-serif',
    body: '"DM Sans", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  radius: {
    card: "12px",
    button: "8px",
    chip: "999px",
  },
} as const;
