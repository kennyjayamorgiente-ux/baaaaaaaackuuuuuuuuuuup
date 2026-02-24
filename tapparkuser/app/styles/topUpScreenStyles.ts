import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

export const topUpScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#383838',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: getResponsivePadding(20),
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
    paddingTop: getResponsivePadding(10),
    paddingBottom: getResponsivePadding(35),
    paddingHorizontal: getResponsivePadding(20),
    maxHeight: screenHeight * 0.75,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(12),
    elevation: 12,
  },
  profilePictureSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(10),
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getResponsiveSize(70),
    backgroundColor: 'transparent',
    borderRadius: getResponsiveSize(90),
    width: getResponsiveSize(180),
    height: getResponsiveSize(180),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    backgroundColor: '#8A0000',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#FFFFFF',
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
    color: '#8A0000',
    marginBottom: getResponsivePadding(8),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(18),
    color: '#666',
    textAlign: 'center',
  },
  profileCardScroll: {
    flex: 1,
  },
  plansSection: {
    marginTop: getResponsivePadding(10),
  },
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsivePadding(15),
  },
  plansTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: '#8A0000',
    marginLeft: getResponsivePadding(10),
  },
  plansList: {
    paddingLeft: getResponsivePadding(10),
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsivePadding(15),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  planHeader: {
    backgroundColor: '#F5F5F5',
    padding: getResponsivePadding(15),
  },
  planTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: getResponsivePadding(5),
  },
  planSubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: '#666',
  },
  planContent: {
    padding: getResponsivePadding(15),
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: getResponsivePadding(15),
  },
  price: {
    fontSize: getResponsiveFontSize(32),
    fontWeight: 'bold',
    color: '#8A0000',
  },
  currency: {
    fontSize: getResponsiveFontSize(16),
    color: '#000',
    marginLeft: getResponsivePadding(5),
  },
  hoursSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsivePadding(20),
  },
  hoursText: {
    fontSize: getResponsiveFontSize(16),
    color: '#8A0000',
    marginLeft: getResponsivePadding(10),
    fontWeight: 'bold',
  },
  selectButton: {
    backgroundColor: '#8A0000',
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: getResponsiveSize(8),
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModalContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(16),
    padding: getResponsivePadding(20),
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: screenHeight * 0.75,
    minHeight: screenHeight * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(20),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  closeXButton: {
    fontSize: getResponsiveFontSize(20),
    color: '#8A0000',
    fontWeight: 'bold',
  },
  planDetailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 0,
  },
  planInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: getResponsiveSize(12),
    padding: getResponsivePadding(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 1,
    marginBottom: getResponsiveMargin(16),
  },
  planInfoTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: 'bold',
    color: '#8A0000',
    marginBottom: getResponsiveMargin(5),
  },
  planInfoSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: '#666666',
    marginBottom: getResponsiveMargin(15),
  },
  planInfoContent: {
    flex: 1,
  },
  priceInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(15),
    paddingBottom: getResponsivePadding(15),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  priceInfoLabel: {
    fontSize: getResponsiveFontSize(16),
    color: '#333333',
    fontWeight: '600',
  },
  priceInfoValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceInfoAmount: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: '#8A0000',
  },
  priceInfoCurrency: {
    fontSize: getResponsiveFontSize(16),
    color: '#8A0000',
    marginLeft: getResponsivePadding(5),
  },
  hoursInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(15),
  },
  hoursInfoText: {
    fontSize: getResponsiveFontSize(16),
    color: '#8A0000',
    marginLeft: getResponsivePadding(10),
    fontWeight: '600',
  },
  planDescription: {
    fontSize: getResponsiveFontSize(14),
    color: '#666666',
    lineHeight: getResponsiveFontSize(20),
    fontStyle: 'italic',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveMargin(12),
    marginTop: getResponsiveMargin(20),
    marginBottom: getResponsiveMargin(10),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(44),
  },
  cancelButtonText: {
    fontSize: getResponsiveFontSize(14),
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#8A0000',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(12),
    paddingHorizontal: getResponsivePadding(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(44),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(40),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(16),
    color: '#8A0000',
    marginTop: getResponsivePadding(10),
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
});
