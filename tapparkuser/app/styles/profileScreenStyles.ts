import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isShortScreenHeight = screenHeight < 750;
const isVeryShortScreenHeight = screenHeight < 640;

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

// Enhanced responsive calculation functions - keeping same layout, just making it adaptive
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const applyHeightScale = (value: number): number => {
  if (isVeryShortScreenHeight) return value * 0.78;
  if (isShortScreenHeight) return value * 0.88;
  if (screenHeight >= 900) return value * 1.05;
  return value;
};

const getResponsiveFontSize = (size: number): number => {
  let scaledSize = size;
  if (isSmallScreen) scaledSize *= 0.85;
  else if (isMediumScreen) scaledSize *= 0.95;
  else if (isTablet) scaledSize *= 1.1;
  else if (isLargeTablet) scaledSize *= 1.2;
  return applyHeightScale(scaledSize);
};

const getResponsiveSize = (size: number): number => {
  let scaledSize = size;
  if (isSmallScreen) scaledSize *= 0.8;
  else if (isMediumScreen) scaledSize *= 0.9;
  else if (isTablet) scaledSize *= 1.05;
  else if (isLargeTablet) scaledSize *= 1.1;
  return applyHeightScale(scaledSize);
};

const getResponsivePadding = (size: number): number => {
  let scaledSize = size;
  if (isSmallScreen) scaledSize *= 0.8;
  else if (isMediumScreen) scaledSize *= 0.9;
  else if (isTablet) scaledSize *= 1.1;
  else if (isLargeTablet) scaledSize *= 1.2;
  return applyHeightScale(scaledSize);
};

const getResponsiveMargin = (size: number): number => {
  let scaledSize = size;
  if (isSmallScreen) scaledSize *= 0.8;
  else if (isMediumScreen) scaledSize *= 0.9;
  else if (isTablet) scaledSize *= 1.1;
  else if (isLargeTablet) scaledSize *= 1.2;
  return applyHeightScale(scaledSize);
};

export const getProfileScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0, // Remove any top padding that might push content down
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: getResponsivePadding(isVeryShortScreenHeight ? 32 : 48),
  },
  backgroundSection: {
    height: isVeryShortScreenHeight
      ? screenHeight * 0.22
      : isShortScreenHeight
        ? screenHeight * 0.27
        : screenHeight * 0.3,
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
    borderWidth: 0,
    borderColor: 'transparent',
    paddingTop: getResponsivePadding(25),
    paddingBottom: 0,
    paddingHorizontal: getResponsivePadding(20),
    height: isVeryShortScreenHeight
      ? screenHeight * 0.7
      : isShortScreenHeight
        ? screenHeight * 0.75
        : screenHeight * 0.8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
    zIndex: 2,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: getResponsivePadding(25),
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getResponsiveSize(60),
    marginBottom: getResponsivePadding(12),
    backgroundColor: 'transparent',
    borderRadius: getResponsiveSize(80),
    width: getResponsiveSize(170),
    height: getResponsiveSize(170),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    width: getResponsiveSize(110),
    height: getResponsiveSize(110),
    borderRadius: getResponsiveSize(55),
    backgroundColor: colors.primary,
    borderWidth: getResponsiveSize(2.5),
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profilePictureImage: {
    borderRadius: getResponsiveSize(55),
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -getResponsiveSize(16),
    right: -getResponsiveSize(16),
    backgroundColor: colors.primary,
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.textSecondary,
  },
  menuContainer: {
    marginBottom: getResponsivePadding(25),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.gray500 || '#6B7280',
    backgroundColor: colors.profileCard,
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveMargin(8),
  },
  menuItemText: {
    fontSize: getResponsiveFontSize(18),
    color: colors.primary,
    marginLeft: getResponsivePadding(15),
    fontWeight: '500',
  },
  helpButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(30),
    borderRadius: getResponsiveSize(25),
    shadowColor: '#8A0000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(4),
    elevation: 5,
  },
  helpButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    marginLeft: getResponsivePadding(10),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.primary,
    marginTop: getResponsiveMargin(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(8),
    elevation: 10,
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(20),
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveMargin(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  modalButtonRemove: {
    backgroundColor: 'transparent',
    width: '100%',
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveMargin(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  modalButtonTextRemove: {
    color: colors.error,
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveMargin(8),
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: getResponsiveFontSize(16),
    fontWeight: '500',
  },
  
  // Rating Modal Styles
  ratingModalContainer: {
    width: '90%',
    maxWidth: getResponsiveSize(400),
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(20),
    padding: getResponsivePadding(24),
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: getResponsiveSize(10) },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(20),
    elevation: 10,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: getResponsiveMargin(20),
  },
  ratingModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  ratingModalCloseButton: {
    fontSize: getResponsiveFontSize(24),
    color: colors.textSecondary,
    fontWeight: '300',
    padding: getResponsivePadding(8),
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: getResponsiveMargin(20),
    gap: getResponsiveSize(12),
  },
  starButton: {
    padding: getResponsivePadding(8),
  },
  ratingLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(20),
    textAlign: 'center',
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: getResponsiveMargin(24),
  },
  feedbackLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '500',
    color: colors.text,
    marginBottom: getResponsiveMargin(8),
  },
  feedbackInput: {
    width: '100%',
    minHeight: getResponsiveSize(80),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlignVertical: 'top',
  },
  ratingModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: getResponsiveSize(12),
  },
  ratingModalCancelButton: {
    flex: 1,
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingModalCancelButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  ratingModalSubmitButton: {
    flex: 1,
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  ratingModalSubmitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  ratingModalSubmitButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.textInverse,
  },
});

// Export default styles for backward compatibility (light theme)
export const profileScreenStyles = getProfileScreenStyles({
  background: '#383838',
  backgroundSecondary: '#2C2C2E',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  textInverse: '#FFFFFF',
  primary: '#8A0000',
  primaryDark: '#800000',
  primaryLight: '#ff4444',
  border: '#F0F0F0',
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







