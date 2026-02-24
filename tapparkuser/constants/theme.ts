/**
 * Root Color Theme System
 * 
 * This file contains all color definitions for both light and dark modes.
 * Use the `useThemeColors()` hook to access theme colors in components.
 * 
 * To add new colors:
 * 1. Add the color to both `light` and `dark` objects
 * 2. Use `useThemeColors()` hook in your component
 * 3. Access colors via `colors.primary`, `colors.background`, etc.
 */

import { Platform } from 'react-native';

// Root Theme Colors - Complete color palette for the app
export const AppTheme = {
  light: {
    // Primary brand colors
    primary: '#800000',
    primaryDark: '#5E0000',
    primaryLight: '#9A1A1A',
    
    // Background colors (clean light mode)
    background: '#F5F5F5',
    backgroundSecondary: '#EFEFEF',
    card: '#FFFFFF',
    profileCard: '#FFFFFF',
    cardBorder: '#D9D9D9',
    
    // Text colors
    text: '#1F1F1F',
    textSecondary: '#383838',
    textMuted: '#6F6F6F',
    textInverse: '#FFFFFF',
    
    // UI element colors
    header: '#800000',
    headerText: '#FFFFFF',
    divider: '#D9D9D9',
    border: '#D0D0D0',
    
    // Status colors
    success: '#4CAF50',
    error: '#FF4444',
    warning: '#FFA500',
    info: '#2196F3',
    
    // Interactive colors
    button: '#800000',
    buttonText: '#FFFFFF',
    buttonSecondary: '#EFEFEF',
    buttonSecondaryText: '#383838',
    
    // Icon colors
    icon: '#383838',
    iconActive: '#800000',
    
    // Drawer/Sidebar
    drawer: '#FFFFFF',
    drawerText: '#383838',
    drawerActive: '#C60000',
    drawerActiveText: '#FFFFFF',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // Gray scale
    gray50: '#F7F7F7',
    gray100: '#EFEFEF',
    gray200: '#E1E1E1',
    gray300: '#D0D0D0',
    gray400: '#B0B0B0',
    gray500: '#8F8F8F',
    gray600: '#6F6F6F',
    gray700: '#575757',
    gray800: '#464646',
    gray900: '#383838',
  },
  dark: {
    // Primary brand colors
    primary: '#D80000',
    primaryDark: '#960000',
    primaryLight: '#FF3B3B',
    
    // Background colors (based on #383838 dark mode reference)
    background: '#2F2F2F',
    backgroundSecondary: '#383838',
    card: '#404040',
    profileCard: '#404040',
    cardBorder: '#4A4A4A',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textMuted: '#C7C7C7',
    textInverse: '#FFFFFF',
    
    // UI element colors
    header: '#383838',
    headerText: '#FFFFFF',
    divider: '#4A4A4A',
    border: '#4A4A4A',
    
    // Status colors
    success: '#4CAF50',
    error: '#FF6666',
    warning: '#FFB84D',
    info: '#4A9EFF',
    
    // Interactive colors
    button: '#D80000',
    buttonText: '#FFFFFF',
    buttonSecondary: '#4A4A4A',
    buttonSecondaryText: '#FFFFFF',
    
    // Icon colors
    icon: '#E0E0E0',
    iconActive: '#FFFFFF',
    
    // Drawer/Sidebar
    drawer: '#2F2F2F',
    drawerText: '#FFFFFF',
    drawerActive: '#D80000',
    drawerActiveText: '#FFFFFF',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.25)',
    
    // Gray scale
    gray: '#383838',
    grayLight: '#9A9A9A',
    gray50: '#2D2D2D',
    gray100: '#333333',
    gray200: '#383838',
    gray300: '#444444',
    gray400: '#555555',
    gray500: '#666666',
    gray600: '#777777',
    gray700: '#888888',
    gray800: '#9A9A9A',
    gray900: '#B5B5B5',
  },
};

// Legacy Colors export (for backward compatibility)
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: AppTheme.light.text,
    background: AppTheme.light.background,
    tint: tintColorLight,
    icon: AppTheme.light.icon,
    tabIconDefault: AppTheme.light.icon,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppTheme.dark.text,
    background: AppTheme.dark.background,
    tint: tintColorDark,
    icon: AppTheme.dark.icon,
    tabIconDefault: AppTheme.dark.icon,
    tabIconSelected: tintColorDark,
    cardBg: AppTheme.dark.card,
    textMuted: AppTheme.dark.textMuted,
    sidebarBg: AppTheme.dark.drawer,
    sidebarText: AppTheme.dark.drawerText,
    sidebarActive: AppTheme.dark.drawerActive,
    sidebarActiveText: AppTheme.dark.drawerActiveText,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
