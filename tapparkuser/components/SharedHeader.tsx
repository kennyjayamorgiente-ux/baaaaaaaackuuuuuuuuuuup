import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../contexts/DrawerContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { useScreenDimensions, getAdaptiveFontSize, getAdaptiveSpacing, getAdaptivePadding, getAdaptiveSize } from '../hooks/use-screen-dimensions';

interface SharedHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  leftIcon?: string; // Custom left icon (e.g., "close" for drawer)
  rightIcon?: string;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
}

const SharedHeader: React.FC<SharedHeaderProps> = ({ 
  title = 'TapPark', 
  showBackButton = false, 
  onBackPress,
  leftIcon,
  rightIcon,
  onRightPress,
  rightComponent
}) => {
  const { toggleDrawer } = useDrawer();
  const colors = useThemeColors();
  const screenDimensions = useScreenDimensions();
  const lastPressTime = useRef(0);
  const dynamicStyles = getStyles(colors, screenDimensions);
  
  // Smooth title transition animation
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleTranslateY = useRef(new Animated.Value(0)).current;
  const prevTitleRef = useRef(title);

  useEffect(() => {
    // Only animate if title actually changed
    if (prevTitleRef.current !== title) {
      // Fade out and slide up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update title
        prevTitleRef.current = title;
        // Reset position
        titleTranslateY.setValue(10);
        // Fade in and slide in from bottom
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [title]);

  const handleLeftPress = () => {
    const now = Date.now();
    if (now - lastPressTime.current < 300) return; // Debounce rapid presses
    lastPressTime.current = now;
    
    if (showBackButton && onBackPress) {
      onBackPress();
    } else {
      toggleDrawer();
    }
  };

  // Calculate actual header height based on content
  // Button size: 40px (minHeight) + padding
  // Padding vertical: (16*2 + 3) = 35px (responsive)
  // Total height needs to accommodate: button + padding + some breathing room
  // We use max(buttonSize + paddingVertical, minimum comfortable height)
  const buttonSize = 40; // minHeight of buttons
  const paddingVertical = getAdaptivePadding(screenDimensions, 16) * 2 + 3;
  const minComfortableHeight = getAdaptiveSize(screenDimensions, 56); // Minimum comfortable header height
  const calculatedHeight = buttonSize + paddingVertical;
  const actualHeaderHeight = Math.max(calculatedHeight, minComfortableHeight); // Use the larger value

  return (
    <SafeAreaView style={dynamicStyles.safeArea} edges={['top']}>
      <View style={[dynamicStyles.header, { 
        paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
        paddingVertical: getAdaptivePadding(screenDimensions, 16) + 3,
        height: actualHeaderHeight, // Use actual calculated height instead of minHeight
      }]}>
        <TouchableOpacity 
          style={dynamicStyles.leftButton} 
          onPress={handleLeftPress}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={(leftIcon || (showBackButton ? "arrow-back" : "menu")) as any} 
            size={screenDimensions.isTablet ? 28 : 26} 
            color={colors.headerText || '#FFFFFF'} 
          />
        </TouchableOpacity>
        
        <Animated.Text 
          style={[
            dynamicStyles.headerTitle, 
            { 
              fontSize: getAdaptiveFontSize(screenDimensions, 20),
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }
          ]}
        >
          {title}
        </Animated.Text>
        
        {rightComponent ? (
          <View style={dynamicStyles.rightComponentContainer}>
            {rightComponent}
          </View>
        ) : rightIcon ? (
          <TouchableOpacity 
            style={dynamicStyles.rightButton} 
            onPress={onRightPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={rightIcon as any} 
              size={screenDimensions.isTablet ? 28 : 26} 
              color={colors.headerText || '#FFFFFF'} 
            />
          </TouchableOpacity>
        ) : (
          <View style={dynamicStyles.rightButton} />
        )}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>, screenDimensions: ReturnType<typeof useScreenDimensions>) => StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  header: {
    backgroundColor: colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    // Height is set dynamically based on actual content (icon + padding)
    // This ensures the header is exactly the right size
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  leftButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure icon is visible and properly centered
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  rightButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure icon is visible and properly centered
  },
  rightComponentContainer: {
    padding: 0,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SharedHeader;