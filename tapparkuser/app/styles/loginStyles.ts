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

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(24),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(500) : '100%',
    alignSelf: 'center',
    width: '100%',
    minHeight: screenHeight * 0.9, // Ensure minimum height
    backgroundColor: '#F8F8F8', // Match container background
  },
  topSection: {
    minHeight: getResponsiveSize(180),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: getResponsiveMargin(screenHeight * 0.15),
    paddingVertical: getResponsivePadding(30),
    paddingHorizontal: getResponsivePadding(30),
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
    minHeight: getResponsiveSize(80),
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: getResponsivePadding(20),
    marginTop: getResponsiveMargin(10),
    paddingHorizontal: getResponsivePadding(20),
    paddingBottom: getResponsivePadding(10),
  },
  parkWithEaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  parkWithEaseText: {
    fontSize: getResponsiveFontSize(18),
    color: '#6B7280',
    marginLeft: getResponsiveSize(6),
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
    minHeight: getResponsiveSize(200),
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: getResponsivePadding(20),
    marginTop: getResponsiveMargin(10),
    paddingBottom: getResponsivePadding(20),
  },
  inputField: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#800000',
    borderRadius: getResponsiveSize(8),
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(16),
    fontSize: getResponsiveFontSize(18),
    marginBottom: getResponsiveMargin(8),
    color: '#1F2937',
    minHeight: getResponsiveSize(48),
  },
  passwordField: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#800000',
    borderRadius: getResponsiveSize(8),
    paddingLeft: getResponsivePadding(16),
    paddingRight: getResponsivePadding(50), // Extra padding for eye icon
    paddingVertical: getResponsivePadding(16),
    fontSize: getResponsiveFontSize(18),
    marginBottom: getResponsiveMargin(8),
    color: '#1F2937',
    minHeight: getResponsiveSize(48),
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#800000',
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveMargin(8),
    minHeight: getResponsiveSize(48),
  },
  passwordFieldWithIcon: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: getResponsivePadding(16),
    fontSize: getResponsiveFontSize(18),
    color: '#1F2937',
    minHeight: getResponsiveSize(48),
  },
  eyeIconButton: {
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: getResponsivePadding(20),
    paddingTop: getResponsivePadding(20),
    marginTop: getResponsiveMargin(10),
  },
  buttonContainer: {
    width: '100%',
    marginBottom: getResponsiveMargin(16),
  },
  loginButton: {
    backgroundColor: '#800000',
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsivePadding(18),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(48),
  },
  loginButtonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveMargin(4),
    marginLeft: getResponsiveMargin(4),
    marginBottom: getResponsiveMargin(8),
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveMargin(20),
    paddingHorizontal: getResponsivePadding(20),
  },
  registerText: {
    fontSize: getResponsiveFontSize(14),
    color: '#6B7280',
    marginRight: getResponsiveMargin(8),
  },
  registerLink: {
    fontSize: getResponsiveFontSize(14),
    color: '#800000',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default loginStyles;
