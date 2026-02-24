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

export const addVehicleScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: '#8A0000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: getResponsivePadding(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButton: {
    padding: 4,
    width: isSmallScreen ? 28 : 32,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: isSmallScreen ? 28 : 32,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: getResponsivePadding(24),
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    flex: 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: screenHeight * 0.05,
  },
  circleContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carContainer: {
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carImage: {
    width: getResponsiveSize(200),
    height: getResponsiveSize(120),
  },
  middleSection: {
    flex: 0.08,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: getResponsivePadding(10),
    marginTop: getResponsiveSize(5),
    paddingHorizontal: getResponsivePadding(20),
  },
  welcomeText: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(30),
    paddingHorizontal: getResponsivePadding(10),
    flexWrap: 'wrap',
  },
  inputSection: {
    flex: 0.42,
    justifyContent: 'flex-start',
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: getResponsivePadding(15),
    marginTop: getResponsiveSize(5),
  },
  dropdownContainer: {
    marginBottom: getResponsiveMargin(8),
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  dropdownHeader: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(14),
    borderRadius: getResponsiveSize(12),
  },
  dropdownText: {
    flex: 1,
    fontSize: getResponsiveFontSize(16),
    color: '#333',
  },
  errorText: {
    color: '#FF3B30',
  },
  errorHelperText: {
    fontSize: getResponsiveFontSize(12),
    color: '#FF3B30',
    marginTop: getResponsiveMargin(2),
    marginLeft: getResponsiveMargin(16),
    marginBottom: getResponsiveMargin(4),
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  chevronIcon: {
    marginLeft: getResponsivePadding(8),
  },
  dropdownContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#800000',
    borderRadius: 8,
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(12),
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveSize(6),
    color: '#1F2937',
    minHeight: isSmallScreen ? 40 : 48,
  },
  bottomSection: {
    flex: 0.25,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: getResponsivePadding(20),
    paddingTop: getResponsivePadding(15),
    marginTop: getResponsiveSize(5),
    marginBottom: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: getResponsiveSize(16),
  },
  goBackButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(16),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(48),
  },
  goBackButtonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#800000',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(16),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(48),
  },
  addButtonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
  dropdownItem: {
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  selectedDropdownItem: {
    backgroundColor: '#FEF2F2',
  },
  dropdownItemText: {
    fontSize: getResponsiveFontSize(16),
    color: '#1F2937',
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: '#800000',
    fontWeight: '600',
  },
});

