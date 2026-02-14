/**
 * Ciri Theme Constants
 *
 * These are the hex color values for the "Lavender Dream" / Nordic Sage theme.
 * Use these constants for PDF generation, canvas rendering, or anywhere CSS variables aren't available.
 *
 * IMPORTANT: This is the source of truth for Ciri brand colors.
 * The theme is NOT purple/lavender - it's a Nordic Sage/Teal palette.
 */

export const CIRI_THEME = {
  // Primary colors - Deep Teal family
  primary: {
    main: "#3E715C",      // Deep Teal - main brand color (primary-600)
    light: "#5B906F",     // Jungle Teal (primary-400)
    dark: "#2d5446",      // Dark Teal (primary-800)
    darker: "#1e3830",    // Darker Teal (primary-900)
  },

  // Secondary colors - Olive/Sage family
  secondary: {
    main: "#9AAD83",      // Muted Olive (secondary-400)
    light: "#CFCEA1",     // Dry Sage (secondary-200)
    dark: "#7a8d68",      // Dark Olive (secondary-600)
  },

  // Accent colors - Grey/Sage family
  accent: {
    main: "#96AFA8",      // Ash Grey (accent-400)
    light: "#b5c9c4",     // Light Ash (accent-200)
    dark: "#6f8a83",      // Dark Ash (accent-600)
  },

  // Background colors
  background: {
    light: "#f5f7f6",     // Very light sage tint
    accent: "#e8f0ed",    // Light teal tint
    muted: "#f0f2f1",     // Neutral light
    card: "#ffffff",      // Card background
  },

  // Semantic colors (these are standard, not theme-specific)
  semantic: {
    success: "#059669",   // Emerald green
    error: "#dc2626",     // Red
    warning: "#d97706",   // Amber
    info: "#0284c7",      // Blue
  },

  // Text colors
  text: {
    primary: "#374151",   // Dark grey
    secondary: "#6b7280", // Medium grey
    muted: "#9ca3af",     // Light grey
    inverse: "#ffffff",   // White (for dark backgrounds)
  },

  // Border colors
  border: {
    light: "#e5e7eb",     // Light border
    default: "#d1d5db",   // Default border
    dark: "#9ca3af",      // Dark border
  },
} as const;

/**
 * Get theme colors for PDF generation
 * Returns a flat object with commonly used colors
 */
export function getPdfThemeColors() {
  return {
    primary: CIRI_THEME.primary.main,
    primaryLight: CIRI_THEME.primary.light,
    primaryDark: CIRI_THEME.primary.dark,
    secondary: CIRI_THEME.secondary.main,
    accent: CIRI_THEME.accent.main,
    sage: CIRI_THEME.secondary.light,
    bgLight: CIRI_THEME.background.light,
    bgAccent: CIRI_THEME.background.accent,
    textPrimary: CIRI_THEME.text.primary,
    textSecondary: CIRI_THEME.text.secondary,
    textMuted: CIRI_THEME.text.muted,
    borderLight: CIRI_THEME.border.light,
    success: CIRI_THEME.semantic.success,
    error: CIRI_THEME.semantic.error,
    warning: CIRI_THEME.semantic.warning,
  };
}

export type CiriTheme = typeof CIRI_THEME;
