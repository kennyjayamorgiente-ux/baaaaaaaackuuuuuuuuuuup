import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isMediumScreen) return baseSize * 0.95;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.1;
  if (isLargeTablet) return baseSize * 1.2;
  return baseSize;
};

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.05;
  if (isLargeTablet) return baseSize * 1.1;
  return baseSize;
};

const getResponsivePadding = (basePadding: number) => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  if (isLargeScreen) return basePadding;
  if (isTablet) return basePadding * 1.1;
  if (isLargeTablet) return basePadding * 1.2;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number) => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  if (isLargeScreen) return baseMargin;
  if (isTablet) return baseMargin * 1.1;
  if (isLargeTablet) return baseMargin * 1.2;
  return baseMargin;
};

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(24),
    paddingTop: getResponsivePadding(40),
    
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(500) : '100%',
    alignSelf: 'center',
    width: '100%',
    minHeight: screenHeight * 0.9,
    backgroundColor: '#F8F8F8',
  },
  topSection: {
    flex: 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: getResponsiveMargin(screenHeight * 0.08),
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
    width: getResponsiveSize(240),
    height: getResponsiveSize(144),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(280) : getResponsiveSize(240),
    maxHeight: isTablet || isLargeTablet ? getResponsiveSize(168) : getResponsiveSize(144),
  },
  middleSection: {
    flex: 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: getResponsivePadding(20),
    marginTop: getResponsiveMargin(20),
    paddingHorizontal: getResponsivePadding(15),
  },
  parkWithEaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
    marginTop: getResponsiveMargin(10),

  },
  parkWithEaseText: {
    fontSize: getResponsiveFontSize(18),
    color: '#6B7280',
    marginLeft: getResponsiveSize(6),
  },
  welcomeText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(24),
    paddingHorizontal: getResponsivePadding(10),
    flexWrap: 'wrap',
    width: '100%',
  },
  inputSection: {
    flex: 0.38,
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(5),
    //paddingTop: getResponsivePadding(10),
    //marginTop: getResponsiveMargin(5),
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCDFE6',
    borderRadius: getResponsiveSize(8),
    paddingHorizontal: getResponsivePadding(14),
    paddingVertical: getResponsivePadding(12),
    fontSize: getResponsiveFontSize(17),
    marginBottom: getResponsiveMargin(10),
    color: '#1F2937',
    minHeight: getResponsiveSize(44),
  },
  emailField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCDFE6',
    borderRadius: getResponsiveSize(8),
    paddingHorizontal: getResponsivePadding(14),
    paddingVertical: getResponsivePadding(12),
    fontSize: getResponsiveFontSize(17),
    marginBottom: getResponsiveMargin(6),
    color: '#1F2937',
    minHeight: getResponsiveSize(44),
  },
  bottomSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: getResponsivePadding(20),
    //paddingTop: getResponsivePadding(10),
    //marginTop: getResponsiveMargin(5),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: getResponsiveSize(16),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(400) : '100%',
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
  signupButton: {
    flex: 1,
    backgroundColor: '#800000',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(18),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(48),
  },
  signupButtonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default signupStyles;