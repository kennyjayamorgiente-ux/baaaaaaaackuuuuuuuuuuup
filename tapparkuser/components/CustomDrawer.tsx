import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed gesture handler imports - drawer is no longer draggable
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useTheme, useThemeColors } from '../contexts/ThemeContext';
import {
  whiteHomeIconSvg,
  maroonProfileIconSvg,
  maroonFavIconSvg,
  maroonLocationIconSvg,
  maroonHomeIconSvg,
  darkProfileIconSvg,
  darkFavIconSvg,
  darkLocationIconSvg,
  darkHomeIconSvg,
  maroonArrowIconSvg,
  darkArrowIconSvg,
  profitIconSvg,
  darkProfitIconSvg,
  whiteFavIconSvg,
  whiteProfileIconSvg,
  whiteLocationIconSvg,
  whiteProfitIconSvg,
  whiteStarIconSvg,
  maroonStarIconSvg,
} from '../app/assets/icons/index2';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import SharedHeader from './SharedHeader';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(screenWidth * 0.75, 320);

// Responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;

const getResponsiveFontSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isMediumScreen) return baseSize * 0.95;
  return baseSize;
};

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  return baseSize;
};

const getResponsivePadding = (basePadding: number) => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number) => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  return baseMargin;
};

interface CustomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomDrawer: React.FC<CustomDrawerProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const pathname = usePathname();
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  const dynamicStyles = getStyles(colors);

  const menuItems = React.useMemo(() => [
    { 
      id: 'Home', 
      activeIcon: whiteHomeIconSvg, 
      inactiveIcon: isDarkMode ? darkHomeIconSvg : maroonHomeIconSvg, 
      text: 'Home', 
      route: '/screens/HomeScreen' 
    },
    { 
      id: 'Profile', 
      activeIcon: whiteProfileIconSvg, 
      inactiveIcon: isDarkMode ? darkProfileIconSvg : maroonProfileIconSvg, 
      text: 'Profile', 
      route: '/ProfileScreen' 
    },
    { 
      id: 'Favorites', 
      activeIcon: whiteFavIconSvg, 
      inactiveIcon: isDarkMode ? darkFavIconSvg : maroonFavIconSvg, 
      text: 'Favorites', 
      route: '/screens/FavoritesScreen' 
    },
    { 
      id: 'Active Parking', 
      activeIcon: whiteLocationIconSvg, 
      inactiveIcon: isDarkMode ? darkLocationIconSvg : maroonLocationIconSvg, 
      text: 'Active Parking', 
      route: '/screens/ActiveParkingScreen' 
    },
    { 
      id: 'History', 
      activeIcon: whiteProfitIconSvg, 
      inactiveIcon: isDarkMode ? darkProfitIconSvg : profitIconSvg, 
      text: 'History', 
      route: '/screens/HistoryScreen' 
    },
  ], [isDarkMode]);

  useEffect(() => {
    if (isOpen) {
      slideAnim.setValue(-DRAWER_WIDTH);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigation = React.useCallback((route: string) => {
    console.log('🚀 Navigating to:', route);
    onClose();
    showLoading('Loading...', route); // Pass target route
    // Use requestAnimationFrame to ensure navigation happens after drawer closes
    requestAnimationFrame(() => {
    setTimeout(() => {
        try {
          if (route === '/screens/HistoryScreen') {
            router.push('/screens/HistoryScreen');
          } else {
      router.push(route as any);
          }
          console.log('✅ Navigation called for:', route);
        } catch (error) {
          console.error('❌ Navigation error:', error);
          hideLoading();
        }
        // Hide loading after navigation completes (give it time to render)
        setTimeout(() => {
          hideLoading();
        }, 500);
      }, 150);
    });
  }, [router, onClose, showLoading, hideLoading]);

  const { logout } = useAuth();
  
  const handleSignOut = React.useCallback(async () => {
    onClose();
    showLoading('Signing out...');
    try {
      await logout();
      router.replace('/screens/LoginScreen');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if logout fails
      router.replace('/screens/LoginScreen');
    } finally {
      setTimeout(() => {
        hideLoading();
      }, 300);
    }
  }, [router, onClose, logout, showLoading, hideLoading]);

  // Gesture handling removed - drawer is now only controllable via buttons

  return (
    <View style={dynamicStyles.overlay}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Animated.View
        style={[
          dynamicStyles.backdrop,
          {
            opacity: overlayOpacity,
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={dynamicStyles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          dynamicStyles.drawer,
          {
            transform: [
              { translateX: slideAnim },
            ],
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
          {/* Header */}
          <SharedHeader 
            title="TapPark"
            showBackButton={true}
            onBackPress={onClose}
            leftIcon="close"
          />

              {/* Menu Items */}
              <View style={dynamicStyles.menuContainer}>
                {menuItems.map((item) => {
                  const isActive = pathname === item.route;
                  return (
                    <View key={item.id} style={dynamicStyles.menuItemWrapper}>
                      {isActive && <View style={dynamicStyles.activeIndicator} />}
                      <TouchableOpacity
                        style={[
                          dynamicStyles.menuItem,
                          isActive && dynamicStyles.activeMenuItem,
                        ]}
                        onPress={() => handleNavigation(item.route)}
                      >
                        {(item as any).useIonicon ? (
                          <Ionicons
                            name={(item as any).ioniconName}
                            size={getResponsiveSize(24)}
                            color={isActive ? (isDarkMode ? '#FFFFFF' : '#8B0000') : '#8B0000'}
                          />
                        ) : (
                          <SvgXml 
                            xml={isActive ? item.activeIcon : item.inactiveIcon}
                            width={getResponsiveSize(24)}
                            height={getResponsiveSize(24)}
                          />
                        )}
                        <Text
                          style={[
                            dynamicStyles.menuText,
                            isActive && dynamicStyles.activeMenuText,
                            isActive && isDarkMode && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Bottom Section */}
              <View style={dynamicStyles.bottomSection}>
                {/* Theme Toggle */}
                <View style={dynamicStyles.themeToggleContainer}>
                  <TouchableOpacity style={dynamicStyles.themeToggle} onPress={toggleTheme}>
                    <View style={[dynamicStyles.themeToggleTrack, isDarkMode && dynamicStyles.themeToggleTrackDark]}>
                      <View style={[dynamicStyles.themeToggleThumb, isDarkMode && dynamicStyles.themeToggleThumbDark]}>
                        {isDarkMode ? (
                          <Ionicons 
                            name="moon" 
                            size={getResponsiveSize(16)} 
                            color={colors.textInverse} 
                          />
                        ) : (
                          <Ionicons 
                            name="sunny" 
                            size={getResponsiveSize(16)} 
                            color={colors.primary}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity style={dynamicStyles.signOutButton} onPress={handleSignOut}>
                  <SvgXml 
                    xml={isDarkMode ? darkArrowIconSvg : maroonArrowIconSvg}
                    width={getResponsiveSize(24)}
                    height={getResponsiveSize(24)} 
                  />
                  <Text style={dynamicStyles.signOutText}>Log Out</Text>
                </TouchableOpacity>
              </View>
      </Animated.View>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    backgroundColor: colors.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: colors.drawer,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContainer: {
    paddingHorizontal: 0,
    marginTop: 20,
  },
  menuItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  activeIndicator: {
    width: 12,
    height: 48,
    backgroundColor: colors.drawerActive,
    marginRight: 8,
    marginLeft: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    paddingLeft: 20,
    borderRadius: 8,
    flex: 1,
  },
  activeMenuItem: {
    backgroundColor: colors.drawerActive,
  },
  menuText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.drawerText,
    marginLeft: 15,
  },
  activeMenuText: {
    color: colors.drawerActiveText,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  themeToggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  themeToggle: {
    alignItems: 'center',
  },
  themeToggleTrack: {
    width: 60,
    height: 30,
    backgroundColor: colors.primaryLight,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  themeToggleTrackDark: {
    backgroundColor: colors.gray500, // Gray for dark mode
  },
  themeToggleThumb: {
    width: 26,
    height: 26,
    backgroundColor: colors.card,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  themeToggleThumbDark: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignSelf: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 15,
  },
});

export default CustomDrawer;
