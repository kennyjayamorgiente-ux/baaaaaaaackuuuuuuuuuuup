import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  isPhone: boolean;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  orientation: 'portrait' | 'landscape';
}

export const useScreenDimensions = (): ScreenDimensions => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    return calculateDimensions(width, height);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setDimensions(calculateDimensions(window.width, window.height));
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

const calculateDimensions = (width: number, height: number): ScreenDimensions => {
  const isLandscape = width > height;
  
  // Use smallest dimension for consistent classification across orientations
  const smallestDimension = Math.min(width, height);
  
  // Enhanced responsive categories based on smallest dimension
  const isSmallScreen = smallestDimension < 375;
  const isMediumScreen = smallestDimension >= 375 && smallestDimension < 414;
  const isLargeScreen = smallestDimension >= 414 && smallestDimension < 768;
  const isTablet = smallestDimension >= 768 && smallestDimension < 1024;
  const isLargeTablet = smallestDimension >= 1024;
  
  const isPhone = smallestDimension < 768;
  
  // Map to screenSize for backward compatibility
  let screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  if (isSmallScreen) {
    screenSize = 'small';
  } else if (isMediumScreen) {
    screenSize = 'medium';
  } else if (isLargeScreen) {
    screenSize = 'large';
  } else {
    screenSize = 'xlarge';
  }

  return {
    width,
    height,
    isTablet: isTablet || isLargeTablet,
    isLandscape,
    isPhone,
    screenSize,
    orientation: isLandscape ? 'landscape' : 'portrait',
  };
};

// Helper functions for common adaptive patterns
export const getAdaptiveColumns = (screenDimensions: ScreenDimensions, baseColumns: number = 2): number => {
  if (screenDimensions.isTablet) {
    return screenDimensions.isLandscape ? baseColumns + 2 : baseColumns + 1;
  }
  return baseColumns;
};

// Enhanced responsive functions with consistent scaling factors
export const getAdaptiveFontSize = (screenDimensions: ScreenDimensions, baseSize: number): number => {
  const smallestDimension = Math.min(screenDimensions.width, screenDimensions.height);
  
  if (smallestDimension < 375) return baseSize * 0.85;
  if (smallestDimension >= 375 && smallestDimension < 414) return baseSize * 0.95;
  if (smallestDimension >= 414 && smallestDimension < 768) return baseSize;
  if (smallestDimension >= 768 && smallestDimension < 1024) return baseSize * 1.1;
  if (smallestDimension >= 1024) return baseSize * 1.2;
  return baseSize;
};

export const getAdaptiveSize = (screenDimensions: ScreenDimensions, baseSize: number): number => {
  const smallestDimension = Math.min(screenDimensions.width, screenDimensions.height);
  
  if (smallestDimension < 375) return baseSize * 0.8;
  if (smallestDimension >= 375 && smallestDimension < 414) return baseSize * 0.9;
  if (smallestDimension >= 414 && smallestDimension < 768) return baseSize;
  if (smallestDimension >= 768 && smallestDimension < 1024) return baseSize * 1.05;
  if (smallestDimension >= 1024) return baseSize * 1.1;
  return baseSize;
};

export const getAdaptiveSpacing = (screenDimensions: ScreenDimensions, baseSpacing: number): number => {
  return getAdaptiveSize(screenDimensions, baseSpacing);
};

export const getAdaptivePadding = (screenDimensions: ScreenDimensions, basePadding: number): number => {
  const smallestDimension = Math.min(screenDimensions.width, screenDimensions.height);
  
  if (smallestDimension < 375) return basePadding * 0.8;
  if (smallestDimension >= 375 && smallestDimension < 414) return basePadding * 0.9;
  if (smallestDimension >= 414 && smallestDimension < 768) return basePadding;
  if (smallestDimension >= 768 && smallestDimension < 1024) return basePadding * 1.1;
  if (smallestDimension >= 1024) return basePadding * 1.2;
  return basePadding;
};

export const getAdaptiveMargin = (screenDimensions: ScreenDimensions, baseMargin: number): number => {
  return getAdaptivePadding(screenDimensions, baseMargin);
};

