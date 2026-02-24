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

export const getBalanceScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: getResponsivePadding(20),
  },
  scrollTopButton: {
    position: 'absolute',
    right: getResponsivePadding(24),
    bottom: getResponsivePadding(28),
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 8,
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
    paddingTop: getResponsivePadding(10),
    paddingBottom: 0,
    paddingHorizontal: getResponsivePadding(20),
    height: screenHeight * 0.80,
    zIndex: 2,
  },
  profilePictureSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(10),
  },
  profileContentScroll: {
    flex: 1,
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
    marginTop: getResponsiveSize(5),
  },
  userName: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsivePadding(8),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(18),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  debitCardContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(16),
    padding: isSmallScreen ? getResponsivePadding(25) : getResponsivePadding(40),
    marginBottom: getResponsivePadding(30),
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: getResponsiveSize(200),
    // Add responsive constraints for better mobile experience
    maxWidth: isTablet ? screenWidth * 0.9 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  ownerNameSection: {
    marginBottom: getResponsivePadding(20),
  },
  ownerNameText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  studentIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsivePadding(40),
  },
  studentIdInfo: {
    flex: 1,
  },
  topRightLogo: {
    position: 'absolute',
    top: getResponsivePadding(60),
    right: getResponsivePadding(20),
    zIndex: 1,
  },
  studentIdLabel: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    marginBottom: getResponsivePadding(15),
  },
  studentIdText: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 2,
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: getResponsivePadding(20),
    // Better responsiveness for small screens
    flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    // Allow balance info to grow on small screens
    flex: isSmallScreen ? 1 : 0,
  },
  balanceText: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: getResponsivePadding(10),
    // Prevent text overflow on small screens
    flexShrink: 1,
    minWidth: 0,
  },
  topUpButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    // Ensure button is not too small on mobile
    minWidth: getResponsiveSize(120),
    // Allow button to shrink on small screens if needed
    flexShrink: isSmallScreen ? 1 : 0,
  },
  topUpText: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  transactionsSection: {
    marginTop: getResponsivePadding(10),
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsivePadding(10),
    marginBottom: getResponsivePadding(10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getResponsiveSize(10),
    paddingHorizontal: getResponsivePadding(10),
    minHeight: getResponsiveSize(40),
  },
  searchInput: {
    flex: 1,
    marginLeft: getResponsivePadding(8),
    color: colors.text,
    fontSize: getResponsiveFontSize(14),
    paddingVertical: getResponsivePadding(8),
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(8),
    paddingHorizontal: getResponsivePadding(10),
    backgroundColor: colors.card,
    gap: getResponsivePadding(4),
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.primary,
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: colors.textInverse,
  },
  filterRow: {
    marginBottom: getResponsivePadding(12),
    zIndex: 20,
    elevation: 20,
  },
  filterDropdownAnchor: {
    position: 'relative',
  },
  filterDropdownTrigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsivePadding(6),
    paddingVertical: getResponsivePadding(8),
    paddingHorizontal: getResponsivePadding(12),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterDropdownTriggerText: {
    color: colors.text,
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  filterDropdownMenuInline: {
    position: 'absolute',
    top: getResponsiveSize(44),
    left: 0,
    minWidth: getResponsiveSize(200),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(12),
  },
  filterDropdownItemActive: {
    backgroundColor: colors.gray100,
  },
  filterDropdownItemText: {
    color: colors.text,
    fontSize: getResponsiveFontSize(14),
  },
  filterDropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  customFilterModalContainer: {
    width: '92%',
    backgroundColor: colors.background,
    borderRadius: getResponsiveSize(14),
    padding: getResponsivePadding(14),
    maxHeight: screenHeight * 0.84,
  },
  customFilterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsivePadding(10),
  },
  customFilterModalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: colors.primary,
  },
  customFilterHint: {
    fontSize: getResponsiveFontSize(13),
    color: colors.textSecondary,
    marginBottom: getResponsivePadding(8),
  },
  customRangePreview: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(10),
    padding: getResponsivePadding(10),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: getResponsivePadding(10),
  },
  customRangePreviewText: {
    fontSize: getResponsiveFontSize(13),
    color: colors.text,
    marginBottom: getResponsivePadding(4),
  },
  customCalendar: {
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  customFilterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: getResponsivePadding(10),
    marginTop: getResponsivePadding(12),
  },
  customFilterClearButton: {
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(16),
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  customFilterClearText: {
    color: colors.text,
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  customFilterApplyButton: {
    paddingVertical: getResponsivePadding(10),
    paddingHorizontal: getResponsivePadding(16),
    borderRadius: getResponsiveSize(8),
    backgroundColor: colors.primary,
  },
  customFilterApplyText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsivePadding(15),
  },
  transactionsTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: getResponsivePadding(10),
  },
  transactionsList: {
    paddingLeft: getResponsivePadding(10),
    maxHeight: getResponsiveSize(200),
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(8),
    paddingHorizontal: getResponsivePadding(12),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionItemGrid: {
    width: '48%',
    marginRight: '0%',
    minHeight: getResponsiveSize(100),
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingVertical: getResponsivePadding(10),
  },
  gridListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transactionIconContainer: {
    marginRight: getResponsivePadding(10),
  },
  transactionInfo: {
    flex: 1,
    marginRight: getResponsivePadding(10),
  },
  transactionInfoGrid: {
    width: '100%',
    marginRight: 0,
  },
  transactionAmount: {
    fontSize: getResponsiveFontSize(16),
    color: colors.primary,
    fontWeight: '600',
  },
  transactionPlanName: {
    fontSize: getResponsiveFontSize(12),
    color: colors.textSecondary,
    marginTop: getResponsivePadding(2),
  },
  transactionDateText: {
    fontSize: getResponsiveFontSize(11),
    color: colors.textMuted,
    marginTop: getResponsivePadding(4),
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
  transactionsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
  },
  transactionsLoadingText: {
    fontSize: getResponsiveFontSize(14),
    color: colors.primary,
    marginTop: getResponsiveMargin(8),
  },
  emptyTransactionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
  },
  emptyTransactionsText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsiveMargin(8),
  },
  emptyTransactionsSubtext: {
    fontSize: getResponsiveFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(15),
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: getResponsivePadding(15),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: colors.primary,
  },
  closeButton: {
    width: getResponsiveSize(30),
    height: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: getResponsiveFontSize(18),
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: getResponsivePadding(15),
    maxHeight: screenHeight * 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsivePadding(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  detailValue: {
    fontSize: getResponsiveFontSize(16),
    color: colors.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  amountValue: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: colors.primary,
  },
  transactionId: {
    fontSize: getResponsiveFontSize(12),
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  modalFooter: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: getResponsivePadding(15),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
});

// Export default styles for backward compatibility (light theme)
export const balanceScreenStyles = getBalanceScreenStyles({
  background: '#383838',
  backgroundSecondary: '#F8F8F8',
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
