import type { ThemeConfig } from 'antd';

/**
 * Landeseiten.de Color Palette
 * 
 * Primary: Deep Purple (#440C71 → #6B21A8)
 * Accent: Lavender (#A16ECC → #C084FC)
 * CTA: Green Gradient (#52B37C → #3AA68D)
 */

// Shared tokens
const sharedTokens = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  borderRadius: 12,
  borderRadiusLG: 16,
  borderRadiusSM: 8,
};

// Shared component styles
const sharedComponents = {
  Button: {
    controlHeight: 44,
    controlHeightLG: 52,
    controlHeightSM: 36,
    fontWeight: 600,
    borderRadius: 12,
  },
  Card: {
    borderRadiusLG: 20,
    paddingLG: 28,
  },
  Input: {
    controlHeight: 48,
    borderRadius: 12,
  },
  Select: {
    controlHeight: 48,
    borderRadius: 12,
  },
  Menu: {
    itemBorderRadius: 10,
    itemMarginInline: 8,
  },
  Table: {
    borderRadius: 12,
  },
};

/**
 * Light Theme Configuration
 */
export const lightTheme: ThemeConfig = {
  token: {
    ...sharedTokens,
    // Primary colors - Refined Deep Purple
    colorPrimary: '#7C3AED', // Vivid Violet
    colorPrimaryHover: '#8B5CF6',
    colorPrimaryActive: '#6D28D9',
    
    // Success - Modern Green
    colorSuccess: '#10B981', // Emerald
    colorSuccessHover: '#34D399',
    
    // Other semantic colors
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',
    
    // Background colors
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F8F9FC',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#F1F5F9',
    
    // Text colors
    colorText: '#1F1A23',
    colorTextSecondary: '#64748B',
    colorTextTertiary: '#94A3B8',
    colorTextQuaternary: '#CBD5E1',
    
    // Border colors
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    
    // Links
    colorLink: '#6B21A8',
    colorLinkHover: '#7C3AED',
    
    // Box shadow
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 2px 12px rgba(0, 0, 0, 0.04)',
  },
  components: {
    ...sharedComponents,
    Layout: {
      siderBg: '#1F1A23',
      headerBg: '#FFFFFF',
      bodyBg: '#F8F9FC',
    },
    Table: {
      ...sharedComponents.Table,
      headerBg: '#F8F9FC',
      headerColor: '#64748B',
      rowHoverBg: '#F8FAFC',
    },
  },
};

/**
 * Dark Theme Configuration
 */
export const darkTheme: ThemeConfig = {
  token: {
    ...sharedTokens,
    // Primary colors - Lighter purple for dark mode
    colorPrimary: '#A855F7',
    colorPrimaryHover: '#C084FC',
    colorPrimaryActive: '#9333EA',
    
    // Success - Brighter green for dark mode
    colorSuccess: '#34D399',
    colorSuccessHover: '#6EE7B7',
    
    // Other semantic colors
    colorWarning: '#FBBF24',
    colorError: '#F87171',
    colorInfo: '#60A5FA',
    
    // Background colors - Dark purple tones
    colorBgContainer: '#1F1A23',
    colorBgLayout: '#161218',
    colorBgElevated: '#2D2735',
    colorBgSpotlight: '#3D3347',
    
    // Text colors
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#475569',
    
    // Border colors
    colorBorder: '#3D3347',
    colorBorderSecondary: '#2D2735',
    
    // Links
    colorLink: '#C084FC',
    colorLinkHover: '#D8B4FE',
    
    // Box shadow - Subtle glow effect
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
    boxShadowSecondary: '0 2px 12px rgba(0, 0, 0, 0.2)',
  },
  components: {
    ...sharedComponents,
    Layout: {
      siderBg: '#161218',
      headerBg: '#1F1A23',
      bodyBg: '#161218',
    },
    Table: {
      ...sharedComponents.Table,
      headerBg: '#2D2735',
      headerColor: '#94A3B8',
      rowHoverBg: '#2D2735',
    },
  },
};

// Default export for backwards compatibility
export const theme = lightTheme;
