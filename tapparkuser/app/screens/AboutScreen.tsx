import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { tapParkLogoSvg, darkTapParkLogoSvg } from '../assets/icons/index2';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, useThemeColors } from '../../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AboutScreen() {
  const { user, isAuthenticated } = useAuth();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const handleNext = () => {
    // Navigate to home screen after signup/about
    // User should already be authenticated from signup flow
    console.log('🎯 AboutScreen: Navigating to HomeScreen, user authenticated:', isAuthenticated);
    router.replace('/screens/HomeScreen');
  };

  return (
    <View style={styles.container}>
      {/* Background with subtle gradient effect */}
      <View style={styles.gradientBackground} />
      
      {/* Top Section - TapPark Logo */}
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoShadow}>
            <SvgXml 
              xml={isDarkMode ? darkTapParkLogoSvg : tapParkLogoSvg} 
              width={getResponsiveSize(100)} 
              height={getResponsiveSize(137)} 
            />
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>PARKING</Text>
          <Text style={styles.subTitle}>made easy!</Text>
          <View style={styles.titleUnderline} />
        </View>

        {/* About App Card */}
        <View style={styles.aboutCard}>
          <View style={styles.cardInnerContent}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="information-circle" size={getResponsiveSize(28)} color={colors.primary} />
              </View>
              <Text style={styles.aboutTitle}>About App</Text>
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.aboutText}>
                TapPark is an innovative parking reservation system designed specifically for Foundation University. 
                Our app revolutionizes the way students, faculty, and visitors find and reserve parking spaces on campus.
              </Text>
              <Text style={styles.aboutText}>
                With real-time QR code scanning and IoT sensors to show available parking spots instantly, 
                users can reserve parking in advance, reducing congestion and delays. This creates a more 
                organized and efficient parking experience for everyone on campus.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Arrow Button - Overlapping the card */}
      <View style={styles.arrowButtonContainer}>
        <TouchableOpacity 
          style={styles.arrowButton} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <View style={styles.arrowButtonInner}>
            <Ionicons name="chevron-forward" size={getResponsiveSize(28)} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.backgroundSecondary,
  },
  topSection: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveMargin(screenHeight * 0.03),
    paddingVertical: getResponsivePadding(20),
    paddingHorizontal: getResponsivePadding(20),
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoShadow: {
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: colors.header,
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
    color: colors.headerText,
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: isSmallScreen ? 28 : 32,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: getResponsivePadding(10),
  },
  titleSection: {
    marginBottom: getResponsiveMargin(30),
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(42),
    fontWeight: '900',
    color: colors.primary,
    lineHeight: getResponsiveFontSize(48),
    letterSpacing: 2,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subTitle: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: '700',
    color: colors.text,
    lineHeight: getResponsiveFontSize(34),
    marginTop: getResponsiveMargin(4),
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(4),
    backgroundColor: colors.primary,
    marginTop: getResponsiveMargin(12),
    borderRadius: getResponsiveSize(2),
  },
  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: getResponsiveSize(20),
    paddingBottom: getResponsivePadding(80),
    elevation: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    marginBottom: getResponsiveMargin(40),
    maxWidth: screenWidth - getResponsivePadding(40),
    minHeight: isSmallScreen ? 320 : 380,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible',
  },
  cardInnerContent: {
    padding: getResponsivePadding(18),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveMargin(24),
    paddingBottom: getResponsivePadding(16),
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  cardIconContainer: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveMargin(12),
  },
  aboutTitle: {
    fontSize: getResponsiveFontSize(26),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardContent: {
    width: '100%',
  },
  aboutText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '500',
    color: colors.text,
    lineHeight: getResponsiveFontSize(26),
    marginBottom: getResponsiveMargin(18),
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  arrowButtonContainer: {
    position: 'absolute',
    bottom: getResponsivePadding(60),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  arrowButton: {
    width: getResponsiveSize(64),
    height: getResponsiveSize(64),
    borderRadius: getResponsiveSize(32),
    overflow: 'hidden',
    elevation: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  arrowButtonInner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveSize(32),
  },
});
