import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "amber",
  fontFamily:
    "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily:
      "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "700",
  },
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(10),
    lg: rem(14),
    xl: rem(20),
  },
  defaultRadius: "md",
  colors: {
    // Primary Accent: Warm Amber / Luxury Gold
    amber: [
      "#FFFBEB", // 0
      "#FEF3C7", // 1
      "#FDE68A", // 2
      "#FCD34D", // 3
      "#FBBF24", // 4: Luminous Gold
      "#F59E0B", // 5: Amber
      "#D97706", // 6: Deep Amber (Primary Light)
      "#B45309", // 7: Saddle Gold
      "#92400E", // 8
      "#78350F", // 9: Burnished Amber
    ],
    // Secondary Accent: Saddle Leather / Dark Tan
    leather: [
      "#FAF4ED",
      "#F3E6D5",
      "#E7CFB3",
      "#DBB891",
      "#C68E58", // 4: Light Tan (Dark mode accent)
      "#B37B47",
      "#8B5E34", // 6: Saddle Leather
      "#754E29",
      "#5E3D1F",
      "#3E2C22", // 9: Dark Mocha
    ],
    // Success: Emerald Green
    green: [
      "#F0FDF4",
      "#DCFCE7",
      "#BBF7D0",
      "#86EFAC",
      "#4ADE80",
      "#22C55E", // 5: Success Green
      "#16A34A",
      "#15803D",
      "#166534",
      "#14532D",
    ],
    // Danger / Warning: Terracotta & Crimson
    red: [
      "#FEF2F2",
      "#FEE2E2",
      "#FECACA",
      "#FCA5A5",
      "#F87171",
      "#EF4444", // 5: Crimson
      "#DC2626",
      "#B91C1C",
      "#991B1B",
      "#7F1D1D",
    ],
    // Info & Processing: Cobalt Blue
    blue: [
      "#EFF6FF",
      "#DBEAFE",
      "#BFDBFE",
      "#93C5FD",
      "#60A5FA",
      "#3B82F6", // 5: Cobalt
      "#2563EB",
      "#1D4ED8",
      "#1E40AF",
      "#1E3A8A",
    ],
    // Dark mode: Deep Obsidian / Carbon scale
    dark: [
      "#F4F4F5", // 0: Frosted Silk (Text)
      "#E4E4E7", // 1
      "#A1A1AA", // 2: Muted Zinc
      "#71717A", // 3: Zinc 500
      "#52525B", // 4: Zinc 600
      "#3F3F46", // 5: Border Subtle
      "#27272A", // 6: Zinc 800 (Card borders / Hover)
      "#18181B", // 7: Zinc 900 (Surface / Cards)
      "#121215", // 8: Deep Carbon (App Background)
      "#09090B", // 9: Pitch Obsidian
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
        color: "amber",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    InputWrapper: {
      styles: {
        label: {
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          marginBottom: "4px",
          fontSize: "var(--mantine-font-size-sm)",
          fontWeight: 500,
          lineHeight: "1.4",
          boxSizing: "border-box",
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
    Table: {
      defaultProps: {
        highlightOnHover: true,
        verticalSpacing: "sm",
        horizontalSpacing: "md",
        withRowBorders: true,
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "md",
        color: "amber",
      },
    },
    Switch: {
      defaultProps: {
        color: "amber",
      },
    },
    Checkbox: {
      defaultProps: {
        color: "amber",
      },
    },
    Tabs: {
      defaultProps: {
        color: "amber",
      },
    },
    Loader: {
      defaultProps: {
        color: "amber",
      },
    },
    DatePickerInput: {
      defaultProps: {
        highlightToday: true,
      },
    },
    Skeleton: {
      defaultProps: {
        radius: "md",
        animate: true,
      },
    },
  },
});
