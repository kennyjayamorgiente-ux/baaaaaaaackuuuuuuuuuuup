import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Type for theme colors
type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
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

export const getHomeScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 0,
    paddingTop: 0,
    // No space between header and ScrollView
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sloganSection: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: getResponsivePadding(30),
    alignItems: 'flex-start',
  },
  parkingText: {
    fontSize: getResponsiveFontSize(36),
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: getResponsiveFontSize(42),
  },
  madeEasyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  madeText: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.text,
    lineHeight: getResponsiveFontSize(34),
  },
  easyText: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: getResponsiveFontSize(34),
  },
  section: {
    paddingHorizontal: getResponsivePadding(20),
    marginBottom: getResponsiveMargin(30),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(16),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: colors.text,
    marginLeft: getResponsiveMargin(8),
  },
  horizontalScroll: {
    marginHorizontal: -getResponsivePadding(20),
  },
  horizontalScrollContent: {
    paddingHorizontal: getResponsivePadding(20),
  },
  vehicleCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: getResponsivePadding(16),
    marginRight: getResponsiveMargin(16),
    width: getResponsiveSize(180),
    minHeight: getResponsiveSize(200),
    justifyContent: 'space-between',
    flex: 1,
  },
  vehicleIconContainer: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: getResponsivePadding(18),
    alignItems: 'center',
    marginBottom: getResponsiveMargin(16),
    width: getResponsiveSize(90),
    height: getResponsiveSize(90),
    justifyContent: 'center',
    alignSelf: 'center',
  },
  vehicleInfoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  vehicleLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.primary,
    marginBottom: getResponsiveMargin(4),
  },
  vehicleValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getResponsiveMargin(8),
  },
  parkingCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: getResponsivePadding(16),
    marginRight: getResponsiveMargin(12),
    width: getResponsiveSize(200),
    minHeight: getResponsiveSize(180),
    justifyContent: 'space-between',
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
  parkingLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(4),
  },
  timeSlotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 'auto',
    paddingTop: getResponsivePadding(8),
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
    minWidth: getResponsiveSize(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveMargin(16),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.background,
    width: getResponsiveSize(160),
    alignSelf: 'flex-start',
  },
  seeAllText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.primary,
    marginLeft: getResponsiveMargin(8),
    fontWeight: '600',
  },
  areaCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: getResponsivePadding(16),
    marginRight: getResponsiveMargin(12),
    width: getResponsiveSize(260),
    minHeight: getResponsiveSize(145),
    justifyContent: 'center',
    flex: 1,
  },
  areaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  areaTextContainer: {
    flex: 1,
    paddingRight: getResponsivePadding(8),
  },
  areaMarkerSlot: {
    width: getResponsiveSize(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaName: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  areaSpotsText: {
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveMargin(4),
  },
  areaCapacityText: {
    fontSize: getResponsiveFontSize(11),
    marginTop: getResponsiveMargin(2),
  },
  addVehicleSection: {
    paddingHorizontal: getResponsivePadding(20),
    paddingBottom: getResponsivePadding(30),
  },
  addVehicleButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addVehicleText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    marginLeft: getResponsiveMargin(8),
  },
  logoIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
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
  areaLogoIcon: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: getResponsiveMargin(8),
  },
  progressSection: {
    paddingHorizontal: getResponsivePadding(20),
    marginBottom: getResponsiveMargin(20),
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: getResponsiveSize(4),
    backgroundColor: colors.gray300,
    borderRadius: getResponsiveSize(2),
    position: 'relative',
  },
  scrollHandle: {
    position: 'absolute',
    width: getResponsiveSize(20),
    height: getResponsiveSize(8),
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(4),
    top: getResponsiveSize(-2),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(8),
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  expirationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveMargin(8),
    marginBottom: getResponsiveMargin(12),
  },
  expirationModalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#FF3B30',
    flex: 1,
    flexWrap: 'wrap',
  },
  expirationModalContent: {
    marginBottom: getResponsiveMargin(16),
    gap: getResponsiveMargin(10),
  },
  expirationModalText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.text,
    lineHeight: getResponsiveFontSize(20),
  },
  billingBreakdownContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(12),
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: getResponsiveMargin(4),
    gap: getResponsiveMargin(6),
  },
  billingBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingBreakdownLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
  },
  billingBreakdownValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  billingBreakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: getResponsivePadding(6),
    marginTop: getResponsiveMargin(4),
  },
  billingBreakdownFormula: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
  },
  expirationModalButton: {
    marginTop: getResponsiveMargin(12),
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(14),
    borderRadius: getResponsiveSize(10),
    alignItems: 'center',
  },
  expirationModalButtonText: {
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: getResponsiveFontSize(16),
  },
  modalSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(24),
    textAlign: 'center',
  },
  parkingAreaButtons: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: getResponsiveMargin(24),
    gap: getResponsiveMargin(12),
  },
  // Step Flow Indicator Styles
  stepFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveMargin(20),
    paddingHorizontal: getResponsivePadding(16),
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
  },
  stepText: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepTextCompleted: {
    color: colors.success,
    fontWeight: '600',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray300,
    marginHorizontal: getResponsiveMargin(8),
  },
  stepDividerActive: {
    backgroundColor: colors.primary,
  },
  stepDividerCompleted: {
    backgroundColor: colors.success,
  },
  // Parking Area Section Styles
  parkingAreaSection: {
    marginBottom: getResponsiveMargin(20),
  },
  parkingAreaSectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: colors.primary,
    marginBottom: getResponsiveMargin(12),
    paddingHorizontal: getResponsivePadding(4),
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: getResponsivePadding(8),
  },
  parkingAreaSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: getResponsiveMargin(16),
    marginHorizontal: getResponsivePadding(8),
  },
  parkingAreaButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    paddingTop: getResponsivePadding(20),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(80),
    width: '100%',
  },
  parkingAreaButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: getResponsiveMargin(4),
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  parkingAreaLocation: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: getResponsiveMargin(4),
    flexWrap: 'wrap',
  },
  closeButton: {
    paddingVertical: getResponsivePadding(8),
    paddingHorizontal: getResponsivePadding(16),
  },
  closeButtonText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Booking Modal Styles
  bookingModalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
  },
  bookingModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(16),
    textAlign: 'center',
  },
  bookingModalText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(12),
    textAlign: 'left',
    lineHeight: getResponsiveFontSize(20),
    paddingBottom: 0,
  },
  assignedSlotId: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getResponsiveMargin(24),
    textAlign: 'center',
  },
  spotTypeText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    marginBottom: getResponsiveMargin(5),
    textAlign: 'center',
  },
  bookNowButton: {
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(16),
    paddingHorizontal: getResponsivePadding(32),
    marginBottom: getResponsiveMargin(16),
    width: '100%',
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
  bookNowButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
  },
  // Vehicle Selection Modal Styles (matching FavoritesScreen design)
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
  vehicleSelectionScroll: {
    marginHorizontal: -getResponsivePadding(24),
  },
  vehicleSelectionScrollContent: {
    paddingHorizontal: getResponsivePadding(24),
  },
  vehicleSelectionCard: {
    backgroundColor: colors.background,
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
  },
  bookNowButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  // Loading and Empty State Styles
  loadingContainer: {
    padding: getResponsivePadding(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    marginTop: getResponsiveMargin(12),
  },
  emptyStateContainer: {
    padding: getResponsivePadding(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  emptyStateSubtext: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(16),
  },
  addVehicleButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: getResponsivePadding(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  emptySubtext: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Mismatch Modal Styles
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
  // Spot Modal Styles (from ActiveParkingScreen)
  spotModalContent: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    flexDirection: 'column',
  },
  spotModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(16),
    textAlign: 'center',
  },
  spotModalInfo: {
    width: '100%',
    marginTop: getResponsiveMargin(8),
  },
  spotModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsivePadding(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  spotModalLabel: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  spotModalValue: {
    fontSize: getResponsiveFontSize(16),
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: getResponsiveMargin(16),
  },
  spotModalCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(24),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
    marginTop: getResponsiveMargin(24),
  },
  spotModalCloseText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // Insufficient Balance Modal Styles
  insufficientBalanceModalContainer: {
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(20),
    marginHorizontal: getResponsiveMargin(20),
    maxWidth: screenWidth * 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  insufficientBalanceModalHeader: {
    alignItems: 'center',
    paddingTop: getResponsivePadding(24),
    paddingHorizontal: getResponsivePadding(24),
    paddingBottom: getResponsivePadding(16),
  },
  insufficientBalanceModalIconContainer: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(40),
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(16),
  },
  insufficientBalanceModalTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  insufficientBalanceModalSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(22),
  },
  insufficientBalanceModalContent: {
    paddingHorizontal: getResponsivePadding(24),
    paddingBottom: getResponsivePadding(32),
  },
  insufficientBalanceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    padding: getResponsivePadding(16),
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsiveMargin(16),
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  insufficientBalanceMessageText: {
    flex: 1,
    fontSize: getResponsiveFontSize(15),
    color: colors.text,
    marginLeft: getResponsiveMargin(12),
    lineHeight: getResponsiveFontSize(20),
  },
  insufficientBalanceSuggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: getResponsivePadding(12),
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  insufficientBalanceSuggestionText: {
    flex: 1,
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    marginLeft: getResponsiveMargin(8),
  },
  insufficientBalanceModalActions: {
    flexDirection: 'row',
    paddingHorizontal: getResponsivePadding(24),
    paddingBottom: getResponsivePadding(20),
    gap: getResponsiveSize(12),
    marginTop: getResponsiveMargin(8),
  },
  insufficientBalanceModalCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(40),
  },
  insufficientBalanceModalCancelText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  insufficientBalanceModalPrimaryButton: {
    flex: 1.5,
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSize(6),
    minHeight: getResponsiveSize(40),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  insufficientBalanceModalPrimaryText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: colors.textInverse,
  },
});

// Export default styles for backward compatibility (light theme)
export const homeScreenStyles = getHomeScreenStyles({
  background: '#FFFFFF',
  backgroundSecondary: '#F0F8FF',
  card: '#fcfcfc',
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
