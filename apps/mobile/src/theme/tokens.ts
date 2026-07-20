/**
 * Native semantic tokens sourced from `.designops/08-design-system/tokens.json`.
 * Values are copied once for React Native StyleSheet use; keep names aligned with the contract.
 */
export const tokens = {
  color: {
    canvas: "#111318",
    surface: "#1A1F29",
    text: {
      primary: "#F7F8FA",
      muted: "#B7C0CC",
    },
    signal: "#C8FF3D",
    action: {
      primary: "#C8FF3D",
      secondary: "#334155",
    },
    status: {
      safe: "#65D6A6",
      warning: "#F5C451",
      danger: "#FF7A90",
    },
  },
  typography: {
    weight: {
      regular: "400" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
    size: {
      body: 18,
      statement: 32,
      beacon: 12,
    },
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
  },
  radius: {
    control: 18,
    panel: 24,
  },
  target: {
    minimum: 56,
  },
} as const;
