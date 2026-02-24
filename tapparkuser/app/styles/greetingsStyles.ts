import { StyleSheet, Dimensions } from 'react-native';
import { AppTheme } from '../../constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.2;
  if (isLargeTablet) return baseSize * 1.4;
  return baseSize;
};

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.75;
  if (isMediumScreen) return baseSize * 0.85;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.15;
  if (isLargeTablet) return baseSize * 1.3;
  return baseSize;
};

const getResponsivePadding = (basePadding: number) => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  if (isLargeScreen) return basePadding;
  if (isTablet) return basePadding * 1.2;
  if (isLargeTablet) return basePadding * 1.4;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number) => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  if (isLargeScreen) return baseMargin;
  if (isTablet) return baseMargin * 1.2;
  if (isLargeTablet) return baseMargin * 1.4;
  return baseMargin;
};

export const getGreetingsStyles = (colors: typeof AppTheme.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1.5,
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(24),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(600) : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: getResponsiveMargin(screenHeight * 0.05),
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
    width: getResponsiveSize(290),
    height: getResponsiveSize(178),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(400) : getResponsiveSize(280),
    maxHeight: isTablet || isLargeTablet ? getResponsiveSize(240) : getResponsiveSize(168),
  },
  middleSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: isTablet || isLargeTablet ? 'center' : 'flex-start',
    //paddingTop: getResponsivePadding(10),
    paddingLeft: getResponsivePadding(10),
    paddingRight: getResponsivePadding(10),
  },
  welcomeText: {
    fontSize: getResponsiveFontSize(40),
    fontWeight: '700',
    color: colors.text,
    textAlign: isTablet || isLargeTablet ? 'center' : 'left',
    lineHeight: getResponsiveFontSize(48),
    //paddingLeft: getResponsivePadding(5),
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  bottomSection: {
    flex: 0.25,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: getResponsivePadding(40),
    marginBottom: getResponsivePadding(20),
    paddingLeft: getResponsivePadding(10),
    paddingRight: getResponsivePadding(10),


  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: getResponsiveSize(16),
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(500) : '100%',
  },
  signInButton: {
    flex: 1,
    backgroundColor: colors.buttonSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsivePadding(18),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(52),
  },
  signInButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.buttonSecondaryText,
  },
  loginButton: {
    flex: 1,
    backgroundColor: colors.button,
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsivePadding(18),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getResponsiveSize(52),
  },
  loginButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.buttonText,
  },
});

export default getGreetingsStyles;
