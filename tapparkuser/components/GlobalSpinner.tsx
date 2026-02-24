import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal, Dimensions, Animated, ScrollView, Easing } from 'react-native';
import { useLoading } from '../contexts/LoadingContext';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';
import { useScreenDimensions, getAdaptiveFontSize, getAdaptivePadding, getAdaptiveMargin, getAdaptiveSize } from '../hooks/use-screen-dimensions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// HomeScreen Skeleton
const renderHomeSkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {/* Main Slogan Section */}
    <View style={[styles.sloganSectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      paddingVertical: getAdaptivePadding(screenDimensions, 30),
    }]}>
      <Animated.View style={[styles.skeletonBox, { 
        width: '40%', 
        height: getAdaptiveFontSize(screenDimensions, 36), 
        marginBottom: getAdaptiveMargin(screenDimensions, 8), 
        opacity: shimmerOpacity 
      }]} />
      <View style={styles.madeEasyContainerSkeleton}>
        <Animated.View style={[styles.skeletonBox, { 
          width: getAdaptiveSize(screenDimensions, 60), 
          height: getAdaptiveFontSize(screenDimensions, 28), 
          marginRight: getAdaptiveMargin(screenDimensions, 4),
          opacity: shimmerOpacity 
        }]} />
        <Animated.View style={[styles.skeletonBox, { 
          width: getAdaptiveSize(screenDimensions, 50), 
          height: getAdaptiveFontSize(screenDimensions, 28), 
          opacity: shimmerOpacity 
        }]} />
      </View>
    </View>

    {/* Registered Vehicle Section */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      marginBottom: getAdaptiveMargin(screenDimensions, 30),
    }]}>
      <View style={[styles.sectionHeaderSkeleton, {
        marginBottom: getAdaptiveMargin(screenDimensions, 16),
      }]}>
        <Animated.View style={[styles.skeletonIcon, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonBox, { 
          width: getAdaptiveSize(screenDimensions, 150), 
          height: getAdaptiveFontSize(screenDimensions, 18), 
          marginLeft: getAdaptiveMargin(screenDimensions, 8), 
          opacity: shimmerOpacity 
        }]} />
      </View>
      <View style={[styles.horizontalCardsContainer, {
        marginHorizontal: -getAdaptivePadding(screenDimensions, 20),
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      }]}>
        {[1, 2].map((i) => (
          <Animated.View key={i} style={[styles.vehicleCardSkeleton, { 
            width: getAdaptiveSize(screenDimensions, 180), 
            minHeight: getAdaptiveSize(screenDimensions, 200), 
            marginRight: i === 1 ? getAdaptiveMargin(screenDimensions, 16) : 0,
            opacity: shimmerOpacity 
          }]}>
            <Animated.View style={[styles.vehicleIconSkeleton, {
              width: getAdaptiveSize(screenDimensions, 90),
              height: getAdaptiveSize(screenDimensions, 90),
              marginBottom: getAdaptiveMargin(screenDimensions, 16),
              opacity: shimmerOpacity,
            }]} />
            {[1, 2, 3].map((j) => (
              <React.Fragment key={j}>
                <Animated.View style={[styles.skeletonBox, { 
                  width: j === 1 ? '70%' : j === 2 ? '60%' : '55%', 
                  height: getAdaptiveFontSize(screenDimensions, 12), 
                  marginBottom: getAdaptiveMargin(screenDimensions, 4),
                  opacity: shimmerOpacity 
                }]} />
                <Animated.View style={[styles.skeletonBox, { 
                  width: j === 1 ? '85%' : j === 2 ? '75%' : '80%', 
                  height: getAdaptiveFontSize(screenDimensions, 14), 
                  marginBottom: getAdaptiveMargin(screenDimensions, 8),
                  opacity: shimmerOpacity 
                }]} />
              </React.Fragment>
            ))}
          </Animated.View>
        ))}
      </View>
    </View>

    {/* Frequently Used Parking Space Section */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      marginBottom: getAdaptiveMargin(screenDimensions, 30),
    }]}>
      <View style={[styles.sectionHeaderSkeleton, {
        marginBottom: getAdaptiveMargin(screenDimensions, 16),
      }]}>
        <Animated.View style={[styles.skeletonIcon, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonBox, { 
          width: getAdaptiveSize(screenDimensions, 200), 
          height: getAdaptiveFontSize(screenDimensions, 18), 
          marginLeft: getAdaptiveMargin(screenDimensions, 8), 
          opacity: shimmerOpacity 
        }]} />
      </View>
      <View style={[styles.horizontalCardsContainer, {
        marginHorizontal: -getAdaptivePadding(screenDimensions, 20),
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      }]}>
        {[1, 2].map((i) => (
          <Animated.View key={i} style={[styles.parkingCardSkeleton, { 
            width: getAdaptiveSize(screenDimensions, 200), 
            height: getAdaptiveSize(screenDimensions, 180), 
            marginRight: i === 1 ? getAdaptiveMargin(screenDimensions, 12) : 0,
            opacity: shimmerOpacity 
          }]} />
        ))}
      </View>
    </View>
  </>
);

// HistoryScreen Skeleton
const renderHistorySkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {/* History cards list */}
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.sectionSkeleton, {
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
        marginBottom: getAdaptiveMargin(screenDimensions, 16),
      }]}>
        <Animated.View style={[styles.historyCardSkeleton, {
          height: getAdaptiveSize(screenDimensions, 150),
          opacity: shimmerOpacity,
        }]} />
      </View>
    ))}
  </>
);

// FavoritesScreen Skeleton
const renderFavoritesSkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {/* Favorites cards grid */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      marginBottom: getAdaptiveMargin(screenDimensions, 30),
    }]}>
      <View style={styles.favoritesGridSkeleton}>
        {[1, 2, 3, 4].map((i) => (
          <Animated.View key={i} style={[styles.favoriteCardSkeleton, {
            width: (screenWidth - getAdaptivePadding(screenDimensions, 60)) / 2,
            height: getAdaptiveSize(screenDimensions, 200),
            marginBottom: getAdaptiveMargin(screenDimensions, 16),
            opacity: shimmerOpacity,
          }]} />
        ))}
      </View>
    </View>
  </>
);

// ProfileScreen Skeleton
const renderProfileSkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {/* Profile picture and info */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      paddingVertical: getAdaptivePadding(screenDimensions, 30),
      alignItems: 'center',
    }]}>
      <Animated.View style={[styles.profilePictureSkeleton, {
        width: getAdaptiveSize(screenDimensions, 120),
        height: getAdaptiveSize(screenDimensions, 120),
        borderRadius: getAdaptiveSize(screenDimensions, 60),
        marginBottom: getAdaptiveMargin(screenDimensions, 16),
        opacity: shimmerOpacity,
      }]} />
      <Animated.View style={[styles.skeletonBox, {
        width: '60%',
        height: getAdaptiveFontSize(screenDimensions, 24),
        marginBottom: getAdaptiveMargin(screenDimensions, 8),
        opacity: shimmerOpacity,
      }]} />
      <Animated.View style={[styles.skeletonBox, {
        width: '40%',
        height: getAdaptiveFontSize(screenDimensions, 16),
        opacity: shimmerOpacity,
      }]} />
    </View>

    {/* Menu items */}
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={[styles.sectionSkeleton, {
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
        marginBottom: getAdaptiveMargin(screenDimensions, 12),
      }]}>
        <Animated.View style={[styles.profileMenuItemSkeleton, {
          height: getAdaptiveSize(screenDimensions, 60),
          opacity: shimmerOpacity,
        }]} />
      </View>
    ))}
  </>
);

// ActiveParkingScreen Skeleton
const renderActiveParkingSkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {/* Parking ticket card */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
      paddingVertical: getAdaptivePadding(screenDimensions, 30),
      marginBottom: getAdaptiveMargin(screenDimensions, 20),
    }]}>
      <Animated.View style={[styles.parkingTicketSkeleton, {
        height: getAdaptiveSize(screenDimensions, 300),
        opacity: shimmerOpacity,
      }]} />
    </View>

    {/* Parking layout */}
    <View style={[styles.sectionSkeleton, {
      paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
    }]}>
      <Animated.View style={[styles.parkingLayoutSkeleton, {
        height: getAdaptiveSize(screenDimensions, 400),
        opacity: shimmerOpacity,
      }]} />
    </View>
  </>
);

// Default Skeleton
const renderDefaultSkeleton = (shimmerOpacity: Animated.AnimatedInterpolation<number>, screenDimensions: any) => (
  <>
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.sectionSkeleton, {
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
        marginBottom: getAdaptiveMargin(screenDimensions, 20),
      }]}>
        <Animated.View style={[styles.skeletonBox, {
          width: '100%',
          height: getAdaptiveSize(screenDimensions, 100),
          opacity: shimmerOpacity,
        }]} />
      </View>
    ))}
  </>
);

// Custom Loading Spinner Component with Maroon and Gray - Facebook style smooth animation
interface CustomLoadingSpinnerProps {
  colors?: {
    primary?: string;
    gray300?: string;
  };
}

const CustomLoadingSpinner: React.FC<CustomLoadingSpinnerProps> = ({ colors }) => {
  const themeColors = colors || { primary: '#800000', gray300: '#D0D0D0' };
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth rotation with easing
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Smooth scale and fade in
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    rotation.start();
    return () => {
      rotation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const size = 50;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Animated.View 
      style={[
        styles.spinnerContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={size} height={size}>
          {/* Gray background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={themeColors.gray300 || '#D0D0D0'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Maroon arc (animated) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={themeColors.primary || '#800000'}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={[circumference * 0.7, circumference]}
            strokeDashoffset={circumference * 0.15}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const GlobalSpinner: React.FC = () => {
  const { isLoading, loadingMessage, targetRoute } = useLoading();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const screenDimensions = useScreenDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  // Use targetRoute if available (during navigation), otherwise use current pathname
  const currentRoute = targetRoute || pathname;

  // Smooth fade animation for the overlay
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      // Smooth fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
      ]).start();
    } else {
      // Reset when not loading
      fadeAnim.setValue(0);
      messageOpacity.setValue(0);
    }
  }, [isLoading]);

  if (!isLoading) return null;

  // Calculate exact header height to match SharedHeader structure:
  // SharedHeader calculates height based on actual content:
  //   - Button size: 40px (minHeight)
  //   - Padding vertical: (16*2 + 3) = 35px (responsive)
  //   - Uses max(buttonSize + paddingVertical, minComfortableHeight)
  //   - minComfortableHeight = getAdaptiveSize(screenDimensions, 56)
  // 
  // This matches exactly how SharedHeader calculates its height
  const buttonSize = 40; // minHeight of buttons
  const paddingVertical = getAdaptivePadding(screenDimensions, 16) * 2 + 3;
  const minComfortableHeight = getAdaptiveSize(screenDimensions, 56);
  const calculatedHeight = buttonSize + paddingVertical;
  const headerViewHeight = Math.max(calculatedHeight, minComfortableHeight); // Matches SharedHeader calculation
  
  // Total header height = SafeArea top + Header View height
  const headerHeight = insets.top + headerViewHeight;

  // Solid background like Facebook - clean and solid, no transparency
  const backgroundColor = colors.background;

  // This overlay only covers the ScrollView area, not the entire screen
  return (
    <Modal
      visible={isLoading}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'transparent' }]} pointerEvents="box-none">
        {/* Header area - completely transparent, not covered - allows touches to pass through */}
        <View 
          style={[styles.headerArea, { 
            height: headerHeight,
            backgroundColor: 'transparent',
            zIndex: 10,
          }]} 
          pointerEvents="none"
        />
        
        {/* ScrollView area only - loading indicator centered with solid background and smooth fade */}
        {/* This only covers the ScrollView content area, starting exactly below header */}
        <Animated.View 
          style={[
            styles.scrollViewArea, 
            { 
              top: headerHeight,
              backgroundColor: backgroundColor,
              opacity: fadeAnim,
              zIndex: 5,
            }
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.loadingIndicator}>
            <CustomLoadingSpinner colors={colors} />
            {loadingMessage && (
              <Animated.Text 
                style={[
                  styles.message, 
                  { 
                    fontSize: getAdaptiveFontSize(screenDimensions, 14),
                    color: colors.textSecondary,
                    opacity: messageOpacity,
                  }
                ]}
              >
                {loadingMessage}
              </Animated.Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  headerSkeleton: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  headerContentSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 19,
    minHeight: 56,
  },
  headerButtonSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1D5DB',
  },
  headerTitleSkeleton: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 16,
  },
  contentArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // top is set dynamically to start exactly at header bottom
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // top is set dynamically to start exactly at header bottom
    // This only covers the ScrollView area, matching the screen's ScrollView
    justifyContent: 'center',
    alignItems: 'center',
    // Ensure it doesn't extend above the header
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sloganSectionSkeleton: {
    alignItems: 'flex-start',
  },
  madeEasyContainerSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionSkeleton: {
    // paddingHorizontal handled by parent View
  },
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  horizontalCardsContainer: {
    flexDirection: 'row',
  },
  vehicleCardSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  vehicleIconSkeleton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parkingCardSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  skeletonBox: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  historyCardSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  favoritesGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  favoriteCardSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  profilePictureSkeleton: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },
  profileMenuItemSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  parkingTicketSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
  },
  parkingLayoutSkeleton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default GlobalSpinner;
