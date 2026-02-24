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

// Enhanced responsive calculations
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


export const getActiveParkingScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12, // Match HomeScreen
    paddingBottom: 12,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingTop: getResponsivePadding(20),
    paddingHorizontal: getResponsivePadding(12),
    paddingBottom: getResponsivePadding(80), // Increased bottom padding to compensate for removing SafeAreaView
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(15),
    textAlign: 'left',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(15),
  },
  durationText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.card,
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(6),
    borderRadius: getResponsiveSize(6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    padding: getResponsivePadding(4),
  },
  balanceValue: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveMargin(15),
    padding: getResponsivePadding(4),
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: getResponsiveSize(52),
  },
  tab: {
    flex: 1,
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(8),
    borderRadius: getResponsiveSize(6),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(48),
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: isSmallScreen ? getResponsiveFontSize(12) : getResponsiveFontSize(14),
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: isSmallScreen ? getResponsiveFontSize(12) : getResponsiveFontSize(14),
    textAlign: 'center',
  },
  ticketContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: colors.primary,
    flex: 1,
    maxWidth: '100%',
    width: '100%',
  },
  ticketContentContainer: {
    padding: getResponsivePadding(20),
    paddingBottom: getResponsivePadding(30),
    flexGrow: 1,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? getResponsivePadding(40) : isTablet ? getResponsivePadding(100) : getResponsivePadding(80),
    marginTop: isSmallScreen ? getResponsivePadding(20) : isTablet ? getResponsivePadding(50) : getResponsivePadding(40),
    justifyContent: 'center',
  },
  qrContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    marginTop: isSmallScreen ? getResponsiveMargin(20) : isTablet ? getResponsiveMargin(50) : getResponsiveMargin(40),
    marginBottom: getResponsiveMargin(12),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isSmallScreen ? getResponsiveSize(200) : isTablet ? getResponsiveSize(300) : getResponsiveSize(250),
  },
  qrInstruction: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#8A0000',
    borderStyle: 'dashed',
    marginVertical: getResponsiveMargin(10),
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsColumn: {
    flex: 1,
    paddingHorizontal: getResponsivePadding(10),
    justifyContent: 'space-around',
  },
  detailRow: {
    marginBottom: getResponsiveMargin(8),
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(4),
    textAlign: 'center',
  },
  detailValue: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
  },
  placeholderContainer: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(40),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: getResponsiveMargin(20),
  },
  placeholderText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    alignSelf: 'center',
    minWidth: getResponsiveSize(200),
    marginTop: getResponsiveMargin(10),
    marginBottom: getResponsiveMargin(20), // Add bottom margin to avoid Android navigation buttons
  },
  favoritesText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveMargin(10),
  },


  // QR Placeholder Styles for Backend Integration
  qrPlaceholder: {
    width: isSmallScreen ? getResponsiveSize(200) : getResponsiveSize(240),
    height: isSmallScreen ? getResponsiveSize(200) : getResponsiveSize(240),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsivePadding(20),
  },
  qrPlaceholderEmoji: {
    fontSize: getResponsiveFontSize(48),
    marginBottom: getResponsiveMargin(8),
  },
  qrPlaceholderText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(4),
  },
  qrPlaceholderSubtext: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Parking Time Tab Styles
  timeContainer: {
    flex: 1,
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: getResponsivePadding(10),
    paddingBottom: getResponsivePadding(5),
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: getResponsiveMargin(15),
    flex: 0.6, // Reduce flex to make room for details card
    justifyContent: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBackgroundCircle: {
    position: 'absolute',
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    borderRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    backgroundColor: colors.backgroundSecondary,
    borderWidth: getResponsiveSize(10),
    borderColor: colors.border,
  },
  timerProgressContainer: {
    position: 'absolute',
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerProgressSvg: {
    position: 'absolute',
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    borderRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  timerProgressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    borderTopRightRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    width: '100%',
  },
  timerProgressArc: {
    position: 'absolute',
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    borderRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    borderWidth: getResponsiveSize(10),
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  timerCircle: {
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    borderRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    backgroundColor: colors.backgroundSecondary,
    borderWidth: getResponsiveSize(10),
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerProgress: {
    position: 'absolute',
    width: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    height: isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220),
    borderRadius: isSmallScreen ? getResponsiveSize(90) : getResponsiveSize(110),
    borderWidth: getResponsiveSize(10),
    borderColor: 'transparent',
    borderTopColor: '#8A0000',
    borderRightColor: '#8A0000',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure content stays above progress fill
  },
  timerText: {
    fontSize: getResponsiveFontSize(36),
    fontWeight: 'bold',
    marginBottom: getResponsiveMargin(8),
  },
  timerLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: isSmallScreen ? getResponsiveSize(120) : getResponsiveSize(150),
  },
  timerLabel: {
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
  },
  parkingDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(16),
    borderWidth: 2,
    borderColor: colors.primary,
    padding: getResponsivePadding(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: getResponsiveMargin(10),
    marginBottom: getResponsiveMargin(10),
    flex: 0.4, // Ensure it takes up remaining space
    minHeight: getResponsiveSize(120), // Ensure minimum height
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateMessage: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  emptyStateSubMessage: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  goBackButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  goBackButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },

  // Interactive Parking Layout Styles
  layoutContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(20),
    paddingBottom: getResponsivePadding(30),
    borderWidth: 1,
    borderColor: colors.primary,
    // Remove minHeight constraint to allow larger SVG
    maxWidth: '100%',
    width: '100%',
  },
  layoutScrollContent: {
    padding: getResponsivePadding(15),
  },
  svgContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically (cross axis)
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(5), // Almost no padding - MAXIMUM SPACE!
    paddingBottom: getResponsivePadding(5), // Almost no padding
    // Remove all height limitations to fill maroon border completely
    overflow: 'hidden',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  mapContainer: {
    flex: 1, // Use flex to fill all available space
    width: '100%',
    backgroundColor: colors.backgroundSecondary || '#F8F9FA',
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(2), // Almost no padding - MAXIMUM SPACE!
    marginBottom: getResponsiveMargin(2), // Almost no margin
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically (cross axis)
    // Remove all height limitations to fill maroon border completely
    overflow: 'hidden',
  },
  legendContainer: {
    backgroundColor: colors.card || '#FFFFFF',
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: colors.border || '#E5E7EB',
    padding: getResponsivePadding(12),
    marginTop: getResponsiveMargin(16),
  },
  legendTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    color: colors.text || '#000000',
    marginBottom: getResponsiveMargin(8),
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: getResponsiveSize(12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: getResponsiveSize(12),
    height: getResponsiveSize(12),
    borderRadius: getResponsiveSize(2),
    marginRight: getResponsiveSize(4),
    borderWidth: 1,
  },
  legendText: {
    fontSize: getResponsiveFontSize(12),
    color: colors.text || '#000000',
  },
  layoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(15),
    paddingHorizontal: getResponsivePadding(10),
  },
  layoutTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(6),
    borderRadius: getResponsiveSize(6),
    marginLeft: getResponsiveMargin(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotTouchArea: {
    position: 'absolute',
    zIndex: 10,
  },
  spotOverlay: {
    width: '100%',
    height: '100%',
    borderRadius: getResponsiveSize(3),
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'solid',
  },
  spotOverlayText: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  parkingInfoContainer: {
    paddingHorizontal: getResponsivePadding(10),
  },
  parkingInfoTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(15),
    textAlign: 'center',
  },
  currentSpotInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(15),
    marginBottom: getResponsiveMargin(20),
    borderWidth: 1,
    borderColor: colors.primary,
  },
  currentSpotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveMargin(10),
  },
  currentSpotTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusIndicator: {
    width: getResponsiveSize(12),
    height: getResponsiveSize(12),
    borderRadius: getResponsiveSize(6),
  },
  spotDetails: {
    gap: getResponsiveMargin(5),
  },
  spotDetailText: {
    fontSize: getResponsiveFontSize(14),
    color: '#333333',
  },
  spotDetailLabel: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  spotTypesContainer: {
    marginBottom: getResponsiveMargin(10),
  },
  spotTypesTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(10),
  },
  spotTypesItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  spotTypeItem: {
    alignItems: 'center',
  },
  spotTypeIcon: {
    fontSize: getResponsiveFontSize(24),
    marginBottom: getResponsiveMargin(4),
  },
  spotTypeText: {
    fontSize: getResponsiveFontSize(12),
    color: '#333333',
    textAlign: 'center',
  },
  statisticsContainer: {
    marginBottom: getResponsiveMargin(20),
  },
  statisticsTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(10),
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statisticItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(12),
    alignItems: 'center',
    marginBottom: getResponsiveMargin(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statisticNumber: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(4),
  },
  statisticLabel: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(15),
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: getResponsiveMargin(10),
  },
  instructionsText: {
    fontSize: getResponsiveFontSize(14),
    color: '#333333',
    lineHeight: getResponsiveFontSize(20),
  },

  // Spot Modal Styles
  spotModalContent: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(20),
    margin: getResponsiveMargin(20),
    maxWidth: screenWidth - 40,
    alignSelf: 'center',
  },
  spotModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: getResponsiveMargin(20),
  },
  spotModalInfo: {
    marginBottom: getResponsiveMargin(20),
  },
  spotModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveMargin(12),
  },
  spotModalLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#333333',
  },
  spotModalValue: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
  },
  spotModalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotModalStatusIndicator: {
    width: getResponsiveSize(12),
    height: getResponsiveSize(12),
    borderRadius: getResponsiveSize(6),
    marginRight: getResponsiveMargin(8),
  },
  spotModalStatusText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
  },
  spotModalCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
  },
  spotModalCloseText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // Parking End Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parkingEndModalContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
  },
  parkingEndModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(20),
    textAlign: 'center',
  },
  parkingEndDetailsContainer: {
    width: '100%',
    marginBottom: getResponsiveMargin(24),
  },
  parkingEndDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsivePadding(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  parkingEndDetailLabel: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  parkingEndDetailValue: {
    fontSize: getResponsiveFontSize(14),
    color: '#1F2937',
    fontWeight: 'bold',
  },
  parkingEndModalButton: {
    backgroundColor: colors.primary,
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(32),
    width: '100%',
    alignItems: 'center',
  },
  parkingEndModalButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  
  // Grace Period Modal Styles
  gracePeriodModalContainer: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: '90%',
    maxWidth: getResponsiveSize(400),
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
  },
  gracePeriodModalHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(20),
  },
  gracePeriodModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginTop: getResponsivePadding(12),
  },
  gracePeriodModalContent: {
    width: '100%',
    marginBottom: getResponsivePadding(24),
  },
  gracePeriodModalText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsivePadding(12),
  },
  gracePeriodDeadlineContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFB800',
    borderWidth: 2,
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(16),
    marginVertical: getResponsivePadding(16),
    alignItems: 'center',
  },
  gracePeriodDeadlineText: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
  },
  gracePeriodModalButton: {
    backgroundColor: '#FF9500',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(32),
    width: '100%',
    alignItems: 'center',
  },
  gracePeriodModalButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  
  // Expiration Modal Styles
  expirationModalContainer: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(24),
    width: '90%',
    maxWidth: getResponsiveSize(400),
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
  },
  expirationModalHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(20),
  },
  expirationModalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.error,
    textAlign: 'center',
    marginTop: getResponsivePadding(12),
  },
  expirationModalContent: {
    width: '100%',
    marginBottom: getResponsivePadding(24),
  },
  expirationModalText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsivePadding(12),
  },
  expirationModalButton: {
    backgroundColor: colors.error,
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsivePadding(14),
    paddingHorizontal: getResponsivePadding(32),
    width: '100%',
    alignItems: 'center',
  },
  expirationModalButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // Billing Breakdown Styles
  billingBreakdownContainer: {
    backgroundColor: colors.gray50,
    borderRadius: getResponsiveSize(8),
    padding: getResponsivePadding(16),
    marginTop: getResponsiveMargin(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingBreakdownTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: getResponsiveMargin(8),
    textAlign: 'center',
  },
  billingBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(8),
  },
  billingBreakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: getResponsivePadding(8),
    marginTop: getResponsiveMargin(4),
  },
  billingBreakdownLabel: {
    fontSize: getResponsiveFontSize(13),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  billingBreakdownValue: {
    fontSize: getResponsiveFontSize(13),
    color: colors.text,
    fontWeight: '600',
  },
  billingBreakdownFormula: {
    fontSize: getResponsiveFontSize(11),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: getResponsiveMargin(8),
    backgroundColor: colors.primaryLight + '20',
    padding: getResponsivePadding(8),
    borderRadius: getResponsiveSize(4),
  },
  billingBreakdownNote: {
    fontSize: getResponsiveFontSize(12),
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: getResponsiveMargin(12),
    padding: getResponsivePadding(8),
    backgroundColor: colors.warning + '15',
    borderRadius: getResponsiveSize(4),
  },
});

// Export default styles for backward compatibility (light theme)
export const activeParkingScreenStyles = getActiveParkingScreenStyles({
  background: '#F5F7FA',
  backgroundSecondary: '#F0F0F0',
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
});

export default getActiveParkingScreenStyles;
