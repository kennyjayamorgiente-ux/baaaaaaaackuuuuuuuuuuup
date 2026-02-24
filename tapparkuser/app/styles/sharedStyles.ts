import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive calculation functions
export const isSmallScreen = screenWidth < 400;
export const isTablet = screenWidth >= 768 && screenWidth < 1024;
export const isLargeTablet = screenWidth >= 1024;

export const getResponsiveFontSize = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

export const getResponsiveSize = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

export const getResponsivePadding = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

export const getResponsiveMargin = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

// Common color constants
export const colors = {
  primary: '#8A0000',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: '#4CAF50',
  error: '#FF4444',
  warning: '#FFA500',
  info: '#2196F3',
};

// Common shared styles
export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flex: 1,
  },
  backgroundSection: {
    height: screenHeight * 0.3,
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: getResponsiveSize(20),
    borderTopRightRadius: getResponsiveSize(20),
    paddingTop: getResponsivePadding(25),
    paddingBottom: getResponsivePadding(35),
    paddingHorizontal: getResponsivePadding(20),
    maxHeight: screenHeight * 0.75,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getResponsiveSize(70),
    marginRight: getResponsivePadding(20),
    backgroundColor: 'black',
    borderRadius: getResponsiveSize(60),
    width: getResponsiveSize(120),
    height: getResponsiveSize(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
    backgroundColor: 'black',
    borderWidth: getResponsiveSize(3),
    borderColor: 'white',
  },
  userName: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsivePadding(8),
  },
  userEmail: {
    fontSize: getResponsiveFontSize(18),
    color: colors.gray[500],
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
    paddingHorizontal: getResponsivePadding(35),
    borderRadius: getResponsiveSize(25),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(4),
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    marginLeft: getResponsivePadding(10),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(16),
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: getResponsivePadding(8),
    paddingHorizontal: getResponsivePadding(16),
  },
  closeButtonText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.gray[500],
    textAlign: 'center',
  },
});















