import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Type for theme colors
type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  profileCard: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  border: string;
  shadow: string;
  overlay: string;
  success: string;
  error: string;
  warning: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
};

// Responsive calculation functions
const isSmallScreen = screenWidth < 400;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

const getResponsiveSize = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

const getResponsivePadding = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

const getResponsiveMargin = (size: number): number => {
  if (isSmallScreen) return size * 0.9;
  if (isTablet) return size * 1.1;
  if (isLargeTablet) return size * 1.2;
  return size;
};

export const getRegisteredVehiclesScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.profileCard,
    borderTopLeftRadius: getResponsiveSize(20),
    borderTopRightRadius: getResponsiveSize(20),
    paddingTop: getResponsivePadding(25),
    paddingBottom: 0,
    paddingHorizontal: getResponsivePadding(20),
    height: screenHeight * 0.80,
    zIndex: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
  },
  fixedProfileSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(25),
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getResponsiveSize(70),
    backgroundColor: 'transparent',
    borderRadius: getResponsiveSize(90),
    width: getResponsiveSize(200),
    height: getResponsiveSize(200),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    width: getResponsiveSize(120),
    height: getResponsiveSize(120),
    borderRadius: getResponsiveSize(60),
    backgroundColor: colors.primary,
    borderWidth: getResponsiveSize(3),
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -getResponsiveSize(5),
    right: -getResponsiveSize(5),
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(12),
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveSize(15),
  },
  userName: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: '#8A0000',
    marginBottom: getResponsivePadding(8),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(18),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  profileCardScroll: {
    flex: 1,
  },
  profilePictureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsivePadding(20),
  },
  vehiclesContainer: {
    paddingBottom: getResponsivePadding(20),
  },
  vehicleCategory: {
    marginBottom: getResponsivePadding(20),
  },
  categoryTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: '#8A0000',
    marginBottom: getResponsivePadding(20),
  },
  horizontalScroll: {
    marginBottom: getResponsivePadding(10),
  },
  horizontalScrollContent: {
    paddingRight: getResponsivePadding(20),
  },
  vehicleCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(15),
    marginRight: getResponsivePadding(15),
    width: screenWidth * 0.8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: colors.primary,
    position: 'relative',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsivePadding(8),
  },
  vehicleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsivePadding(10),
  },
  vehicleLabel: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  vehicleValue: {
    fontSize: getResponsiveFontSize(16),
    color: colors.text,
    fontWeight: '600',
  },
  addVehicleButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
    paddingHorizontal: getResponsivePadding(35),
    borderRadius: getResponsiveSize(25),
    marginTop: getResponsivePadding(25),
    shadowColor: '#8A0000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(4),
    elevation: 5,
  },
  addVehicleText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    marginLeft: getResponsivePadding(10),
  },
  scrollIndicatorContainer: {
    alignItems: 'center',
    marginTop: getResponsivePadding(10),
  },
  scrollIndicatorTrack: {
    width: '100%',
    height: getResponsiveSize(4),
    backgroundColor: colors.gray300,
    borderRadius: getResponsiveSize(2),
    position: 'relative',
  },
  scrollIndicatorHandle: {
    position: 'absolute',
    width: getResponsiveSize(20),
    height: getResponsiveSize(8),
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(4),
    top: getResponsiveSize(-2),
  },
  deleteButton: {
    position: 'absolute',
    bottom: getResponsivePadding(10),
    right: getResponsivePadding(10),
    backgroundColor: 'rgba(138, 0, 0, 0.1)',
    borderRadius: getResponsiveSize(15),
    width: getResponsiveSize(30),
    height: getResponsiveSize(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getResponsiveMargin(16),
    textAlign: 'center',
  },
  vehicleDetailText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(8),
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  confirmationText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(24),
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(22),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: getResponsiveMargin(12),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.textInverse,
  },
});

// Export default styles for backward compatibility (light theme)
export const registeredVehiclesScreenStyles = getRegisteredVehiclesScreenStyles({
  background: '#383838',
  backgroundSecondary: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  textInverse: '#FFFFFF',
  primary: '#8A0000',
  primaryDark: '#800000',
  primaryLight: '#ff4444',
  border: '#E0E0E0',
  shadow: '#000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  success: '#4CAF50',
  error: '#FF4444',
  warning: '#FFA500',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#E0E0E0',
  gray400: '#CCCCCC',
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#4B5563',
  gray800: '#374151',
  gray900: '#1F2937',
} as ThemeColors);















