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
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isMediumScreen) return baseSize * 0.95;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.1;
  if (isLargeTablet) return baseSize * 1.2;
  return baseSize;
};

const getResponsiveSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.05;
  if (isLargeTablet) return baseSize * 1.1;
  return baseSize;
};

const getResponsivePadding = (basePadding: number): number => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  if (isLargeScreen) return basePadding;
  if (isTablet) return basePadding * 1.1;
  if (isLargeTablet) return basePadding * 1.2;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number): number => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  if (isLargeScreen) return baseMargin;
  if (isTablet) return baseMargin * 1.1;
  if (isLargeTablet) return baseMargin * 1.2;
  return baseMargin;
};

export const getFavoritesScreenStyles = (colors: ThemeColors) => StyleSheet.create({
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
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileCard: {
    position: 'absolute',
    bottom: 0, // Match ProfileScreen position
    left: 0,
    right: 0,
    backgroundColor: colors.profileCard,
    borderTopLeftRadius: getResponsiveSize(20), // Match ProfileScreen
    borderTopRightRadius: getResponsiveSize(20), // Match ProfileScreen
    paddingTop: getResponsivePadding(25),
    paddingBottom: 0,
    paddingHorizontal: getResponsivePadding(20),
    height: screenHeight * 0.80,
    flexDirection: 'column', // Enable flexbox for proper ScrollView sizing
    zIndex: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2, // Match ProfileScreen shadow
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(8), // Match ProfileScreen shadow
    elevation: 8, // Match ProfileScreen elevation
  },
  profileCardScroll: {
    flex: 1,
  },
  profileCardScrollContent: {
    paddingBottom: 0,
  },
  fixedProfileSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(30),
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
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveSize(15),
  },
  userName: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(5),
    letterSpacing: 1,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  spotsContainer: {
    flex: 1,
  },
  spotsTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(20),
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: getResponsiveMargin(12),
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: colors.border,
    padding: getResponsivePadding(3),
    gap: getResponsiveMargin(4),
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveMargin(4),
    paddingHorizontal: getResponsivePadding(8),
    paddingVertical: getResponsivePadding(6),
    borderRadius: getResponsiveSize(8),
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.primary,
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: colors.textInverse,
  },
  gridListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  parkingCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: getResponsivePadding(16),
    marginBottom: getResponsiveMargin(15),
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(4),
    elevation: 3,
  },
  parkingCardGrid: {
    width: '48%',
    minHeight: getResponsiveSize(220),
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveMargin(8),
  },
  locationTextContainer: {
    flex: 1,
  },
  parkingLocation: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(4),
  },
  parkingSpotId: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(8),
  },
  logoIcon: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    resizeMode: 'contain',
  },
  parkingLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(4),
  },
  timeSlotContainer: {
    marginBottom: getResponsiveMargin(8),
  },
  parkingTime: {
    fontSize: getResponsiveFontSize(14),
    color: colors.text,
    flex: 1,
  },
  parkingPrice: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: getResponsiveMargin(12),
  },
  parkingStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parkingActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableStatus: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    color: colors.success,
  },
  occupiedStatus: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    color: colors.primary,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(8),
    borderRadius: 6,
  },
  bookButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
  },
  // Vehicle Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleSelectionModalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    margin: getResponsiveMargin(20),
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
  },
  vehicleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(20),
  },
  vehicleModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  vehicleCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveMargin(20),
  },
  vehicleCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(16),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: getResponsiveMargin(4),
    minHeight: getResponsiveSize(200),
  },
  selectedVehicleCard: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  vehicleIconContainer: {
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(12),
    marginBottom: getResponsiveMargin(12),
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBrandLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textMuted,
    marginBottom: getResponsiveMargin(4),
  },
  vehicleBrand: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getResponsiveMargin(8),
    textAlign: 'center',
  },
  vehicleDisplayLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textMuted,
    marginBottom: getResponsiveMargin(4),
  },
  vehicleDisplayName: {
    fontSize: getResponsiveFontSize(14),
    color: colors.text,
    marginBottom: getResponsiveMargin(8),
  },
  vehiclePlateLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textMuted,
    marginBottom: getResponsiveMargin(4),
  },
  vehiclePlateNumber: {
    fontSize: getResponsiveFontSize(14),
    color: colors.text,
  },
  progressIndicatorContainer: {
    marginBottom: getResponsiveMargin(20),
  },
  progressBar: {
    height: getResponsiveSize(4),
    backgroundColor: colors.gray300,
    borderRadius: getResponsiveSize(2),
    overflow: 'hidden',
  },
  progressHandle: {
    position: 'absolute',
    width: getResponsiveSize(20),
    height: getResponsiveSize(8),
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(4),
    top: getResponsiveSize(-2),
  },
  vehicleSelectionScroll: {
    marginHorizontal: -getResponsivePadding(24),
  },
  vehicleSelectionScrollContent: {
    paddingHorizontal: getResponsivePadding(24),
  },
  bookNowButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(24),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
    marginBottom: getResponsiveMargin(16),
    width: '100%',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookNowButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
  },
  bookNowButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  emptyFavoritesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsivePadding(40),
    paddingHorizontal: getResponsivePadding(20),
  },
  emptyFavoritesTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(12),
  },
  emptyFavoritesMessage: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(8),
    lineHeight: 24,
  },
  emptyFavoritesSubMessage: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Vehicle Mismatch Modal Styles
  mismatchModalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    margin: getResponsiveMargin(20),
    maxWidth: '90%',
    alignSelf: 'center',
  },
  mismatchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(20),
  },
  mismatchModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  mismatchContent: {
    marginBottom: getResponsiveMargin(24),
  },
  mismatchMessage: {
    fontSize: getResponsiveFontSize(16),
    color: colors.text,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(20),
    lineHeight: 24,
  },
  mismatchDetails: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(16),
    marginBottom: getResponsiveMargin(16),
  },
  mismatchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  mismatchLabel: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  mismatchValue: {
    fontSize: getResponsiveFontSize(14),
    color: colors.primary,
    fontWeight: 'bold',
  },
  mismatchSuggestion: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  mismatchCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(24),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
  },
  mismatchCloseButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // Vehicle Selection Modal Styles (from HomeScreen)
  vehicleTypeInfoContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(12),
    marginBottom: getResponsiveMargin(16),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  vehicleTypeInfoText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  vehicleSelectionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(16),
    marginRight: getResponsiveMargin(12),
    width: getResponsiveSize(160),
    minHeight: getResponsiveSize(200),
  },
  vehicleSelectionCardSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  vehicleSelectionIconContainer: {
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(12),
    alignItems: 'center',
    marginBottom: getResponsiveMargin(12),
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    justifyContent: 'center',
    alignSelf: 'center',
  },
  vehicleSelectionLabel: {
    fontSize: getResponsiveFontSize(10),
    color: colors.primary,
    marginBottom: getResponsiveMargin(2),
  },
  vehicleSelectionValue: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getResponsiveMargin(6),
  },
  vehicleSelectionProgressContainer: {
    marginVertical: getResponsiveMargin(20),
    alignItems: 'center',
  },
  vehicleSelectionProgressTrack: {
    width: '100%',
    height: getResponsiveSize(4),
    backgroundColor: colors.gray300,
    borderRadius: getResponsiveSize(2),
    position: 'relative',
  },
  vehicleSelectionProgressHandle: {
    position: 'absolute',
    width: getResponsiveSize(20),
    height: getResponsiveSize(8),
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(4),
    top: getResponsiveSize(-2),
  },
  vehicleSelectionBookNowButton: {
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(32),
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleSelectionBookNowButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  vehicleSelectionBookNowButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // No Compatible Vehicles Styles
  noCompatibleVehiclesContainer: {
    padding: getResponsivePadding(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCompatibleVehiclesText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  noCompatibleVehiclesSubtext: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(20),
  },
});

// Export default styles for backward compatibility (light theme)
export const favoritesScreenStyles = getFavoritesScreenStyles({
  background: '#383838',
  backgroundSecondary: '#F0F8FF',
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

