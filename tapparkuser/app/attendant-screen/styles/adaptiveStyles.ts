import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Adaptive breakpoints
export const BREAKPOINTS = {
  small: 360,
  medium: 414,
  large: 768,
  xlarge: 1024,
};

// Device type detection
export const isTablet = Math.min(width, height) >= BREAKPOINTS.large;
export const isPhone = !isTablet;
export const isLandscape = width > height;

// Adaptive spacing functions
export const getAdaptiveSpacing = (baseSpacing: number): number => {
  if (isTablet) {
    return baseSpacing * 1.5;
  }
  if (width < BREAKPOINTS.small) {
    return baseSpacing * 0.8;
  }
  return baseSpacing;
};

export const getAdaptivePadding = (basePadding: number): number => {
  if (isTablet) {
    return basePadding * 1.3;
  }
  if (width < BREAKPOINTS.small) {
    return basePadding * 0.9;
  }
  return basePadding;
};

export const getAdaptiveFontSize = (baseSize: number): number => {
  if (isTablet) {
    return baseSize * 1.2;
  }
  if (width < BREAKPOINTS.small) {
    return baseSize * 0.9;
  }
  return baseSize;
};

export const getAdaptiveColumns = (baseColumns: number = 2): number => {
  if (isTablet) {
    return isLandscape ? baseColumns + 2 : baseColumns + 1;
  }
  return baseColumns;
};

// Adaptive styles
export const adaptiveStyles = StyleSheet.create({
  // Container styles
  adaptiveContainer: {
    padding: getAdaptivePadding(16),
  },
  
  // Header styles
  adaptiveHeader: {
    paddingHorizontal: getAdaptivePadding(20),
    paddingVertical: getAdaptivePadding(16),
  },
  
  // Section styles
  adaptiveSection: {
    marginHorizontal: getAdaptiveSpacing(16),
    marginVertical: getAdaptiveSpacing(8),
    padding: getAdaptivePadding(20),
  },
  
  // Text styles
  adaptiveTitle: {
    fontSize: getAdaptiveFontSize(18),
    fontWeight: 'bold',
  },
  
  adaptiveSubtitle: {
    fontSize: getAdaptiveFontSize(16),
    fontWeight: '600',
  },
  
  adaptiveBody: {
    fontSize: getAdaptiveFontSize(14),
  },
  
  adaptiveCaption: {
    fontSize: getAdaptiveFontSize(12),
  },
  
  // Button styles
  adaptiveButton: {
    paddingHorizontal: getAdaptivePadding(20),
    paddingVertical: getAdaptivePadding(12),
    borderRadius: getAdaptiveSpacing(8),
  },
  
  adaptiveButtonText: {
    fontSize: getAdaptiveFontSize(16),
    fontWeight: '600',
  },
  
  // Card styles
  adaptiveCard: {
    padding: getAdaptivePadding(16),
    marginHorizontal: getAdaptiveSpacing(8),
    borderRadius: getAdaptiveSpacing(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Grid styles
  adaptiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: getAdaptiveSpacing(8),
  },
  
  // List styles
  adaptiveList: {
    flexDirection: 'column',
    gap: getAdaptiveSpacing(8),
  },
  
  // Modal styles
  adaptiveModal: {
    width: isTablet ? '80%' : '90%',
    maxWidth: isTablet ? 600 : 400,
    maxHeight: '85%',
  },
  
  // Form styles
  adaptiveInput: {
    paddingHorizontal: getAdaptivePadding(12),
    paddingVertical: getAdaptivePadding(10),
    fontSize: getAdaptiveFontSize(14),
    borderRadius: getAdaptiveSpacing(6),
  },
  
  // Icon sizes
  adaptiveIconSmall: {
    width: isTablet ? 20 : 16,
    height: isTablet ? 20 : 16,
  },
  
  adaptiveIconMedium: {
    width: isTablet ? 28 : 24,
    height: isTablet ? 28 : 24,
  },
  
  adaptiveIconLarge: {
    width: isTablet ? 40 : 32,
    height: isTablet ? 40 : 32,
  },
  
  // Spacing utilities
  adaptiveMarginSmall: {
    margin: getAdaptiveSpacing(4),
  },
  
  adaptiveMarginMedium: {
    margin: getAdaptiveSpacing(8),
  },
  
  adaptiveMarginLarge: {
    margin: getAdaptiveSpacing(16),
  },
  
  adaptivePaddingSmall: {
    padding: getAdaptivePadding(8),
  },
  
  adaptivePaddingMedium: {
    padding: getAdaptivePadding(16),
  },
  
  adaptivePaddingLarge: {
    padding: getAdaptivePadding(24),
  },
});

// Responsive layout helpers
export const getResponsiveLayout = () => {
  if (isTablet && isLandscape) {
    return {
      columns: 4,
      cardWidth: '22%',
      spacing: getAdaptiveSpacing(12),
    };
  } else if (isTablet) {
    return {
      columns: 3,
      cardWidth: '30%',
      spacing: getAdaptiveSpacing(10),
    };
  } else if (width < BREAKPOINTS.small) {
    return {
      columns: 1,
      cardWidth: '100%',
      spacing: getAdaptiveSpacing(6),
    };
  } else {
    return {
      columns: 2,
      cardWidth: '48%',
      spacing: getAdaptiveSpacing(8),
    };
  }
};

// Device-specific styles
export const deviceStyles = StyleSheet.create({
  tablet: {
    ...(isTablet && {
      paddingHorizontal: 32,
      paddingVertical: 24,
    }),
  },
  
  phone: {
    ...(isPhone && {
      paddingHorizontal: 16,
      paddingVertical: 12,
    }),
  },
  
  landscape: {
    ...(isLandscape && {
      flexDirection: 'row',
      justifyContent: 'space-around',
    }),
  },
  
  portrait: {
    ...(!isLandscape && {
      flexDirection: 'column',
    }),
  },
});

export default adaptiveStyles;

