// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';

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

const getResponsiveMargin = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.2;
  if (isLargeTablet) return baseSize * 1.4;
  return baseSize;
};

const getResponsivePadding = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.2;
  if (isLargeTablet) return baseSize * 1.4;
  return baseSize;
};

// TapPark Logo from LOGO.svg
const tapParkLogoSvg = `<svg width="113" height="155" viewBox="0 0 113 155" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="mask0_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="113" height="155">
<path d="M0 0H112.28V155H0V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_1173_1857)">
<path d="M47.1535 125.955C44.9581 119.548 40.9373 113.925 35.5895 109.772L22.4405 99.5627C8.93709 89.0817 0.738155 73.1839 0.0273438 56.1048C0.0273438 25.1205 25.1459 0.00195312 56.1302 0.00195312C87.1164 0.00195312 112.235 25.1205 112.235 56.1048C111.522 73.1839 103.323 89.0817 89.8218 99.5627L76.6728 109.772C71.323 113.925 67.3023 119.548 65.1069 125.955L63.5612 130.466C62.4723 133.64 59.4873 135.773 56.1302 135.773C52.775 135.773 49.79 133.64 48.6992 130.466L47.1535 125.955ZM56.1302 154.848C43.7353 154.848 33.6894 153.34 33.6894 151.481C33.6894 149.623 43.7353 148.114 56.1302 148.114C68.5251 148.114 78.5729 149.623 78.5729 151.481C78.5729 153.34 68.5251 154.848 56.1302 154.848ZM56.1302 99.8659C80.9199 99.8659 101.014 79.7702 101.014 54.9825C101.014 30.1947 80.9199 10.101 56.1302 10.101C31.3424 10.101 11.2467 30.1947 11.2467 54.9825C11.2467 79.7702 31.3424 99.8659 56.1302 99.8659ZM49.2426 30.297H71.3998C74.247 30.297 77.5018 32.8824 78.7934 36.1804L82.9697 46.8052C83.078 46.7914 83.1843 46.7678 83.3005 46.7678H86.506C88.3195 46.7638 89.7923 48.4316 89.7923 50.4951C89.7923 52.5547 88.3195 54.2244 86.506 54.2244H85.7027C85.7027 54.2303 85.7046 54.2323 85.7046 54.2382C86.1417 55.5259 86.3859 56.9318 86.3859 58.4066V62.7738C86.3859 67.0465 85.3423 70.7325 82.9835 72.5283V77.3267C82.9835 79.7368 81.2586 81.69 79.136 81.69H75.6095C73.487 81.69 71.7641 79.7348 71.7641 77.3267V73.688H40.5061V77.3267C40.5061 79.7368 38.7813 81.69 36.6587 81.69H33.1283C31.0057 81.69 29.2828 79.7348 29.2828 77.3267V72.5283C26.9259 70.7325 25.8823 67.0485 25.8823 62.7738V58.4066C25.8823 56.9337 26.1245 55.5279 26.5557 54.2441C26.5557 54.2382 26.5616 54.2323 26.5616 54.2244H25.7544C23.9389 54.2244 22.4681 52.5547 22.4681 50.4971C22.4681 48.4375 23.9389 46.7678 25.7544 46.7678H28.9579C29.0741 46.7678 29.1824 46.7934 29.2927 46.8052L33.4669 36.1824C34.7862 32.8272 37.9641 30.297 40.8625 30.297H49.2426ZM34.3156 49.3629C34.3156 52.726 78.565 52.722 78.565 49.3609C78.565 48.9278 78.4823 48.3883 78.4764 48.3508C77.6927 45.1985 74.6802 38.6811 74.6802 38.6811C73.9516 36.8263 72.1224 35.3869 71.0375 35.3869H41.8529C40.768 35.3869 38.9388 36.8263 38.2083 38.683C38.2083 38.683 35.56 44.7377 34.4081 48.3528C34.3983 48.3883 34.3156 48.9317 34.3156 49.3629ZM42.9063 63.8272C42.9063 61.1828 40.7523 59.0288 38.0961 59.0288C35.4419 59.0288 33.2878 61.1789 33.2878 63.8272C33.2878 66.4736 35.4419 68.6217 38.0961 68.6217C40.7523 68.6237 42.9063 66.4755 42.9063 63.8272ZM80.1757 63.8272C80.1757 61.1828 78.0235 59.0288 75.3674 59.0288C72.7131 59.0288 70.5571 61.1789 70.5571 63.8272C70.5571 66.4736 72.7092 68.6217 75.3674 68.6217C78.0255 68.6217 80.1757 66.4755 80.1757 63.8272ZM49.0004 62.6261C48.5751 62.6261 48.2305 62.9707 48.2305 63.396C48.2305 63.8213 48.5751 64.1679 49.0004 64.1679H63.9452C64.3724 64.1679 64.717 63.8213 64.717 63.396C64.717 62.9707 64.3724 62.6261 63.9452 62.6261H49.0004ZM49.0004 66.2235C48.5751 66.2235 48.2305 66.5681 48.2305 66.9934C48.2305 67.4187 48.5751 67.7652 49.0004 67.7652H63.9452C64.3724 67.7652 64.717 67.4187 64.717 66.9934C64.717 66.5681 64.3724 66.2235 63.9452 66.2235H49.0004Z" fill="#800000"/>
</g>
<mask id="mask1_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="16" y="14" width="81" height="81">
<path d="M16.2168 14.9111H96.0481V94.7424H16.2168V14.9111Z" fill="white"/>
</mask>
<g mask="url(#mask1_1173_1857)">
<mask id="mask2_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="16" y="14" width="81" height="81">
<path d="M56.1325 14.9111C34.0875 14.9111 16.2168 32.7818 16.2168 54.8268C16.2168 76.8718 34.0875 94.7424 56.1325 94.7424C78.1774 94.7424 96.0481 76.8718 96.0481 54.8268C96.0481 32.7818 78.1774 14.9111 56.1325 14.9111Z" fill="white"/>
</mask>
<g mask="url(#mask2_1173_1857)">
<path d="M16.2168 14.9111H96.0481V94.7424H16.2168V14.9111Z" fill="#800000"/>
</g>
</g>
<mask id="mask3_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="27" y="28" width="26" height="22">
<path d="M27.9043 28.0269H52.6035V49.7017H27.9043V28.0269Z" fill="white"/>
</mask>
<g mask="url(#mask3_1173_1857)">
<mask id="mask4_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="21" y="25" width="50" height="75">
<path d="M21.8242 29.7283L64.3705 25.8848L70.6654 95.5403L28.1191 99.3838L21.8242 29.7283Z" fill="white"/>
</mask>
<g mask="url(#mask4_1173_1857)">
<mask id="mask5_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="21" y="25" width="50" height="75">
<path d="M21.8242 29.7283L64.3705 25.8848L70.6654 95.5403L28.1191 99.3838L21.8242 29.7283Z" fill="white"/>
</mask>
<g mask="url(#mask5_1173_1857)">
<path d="M32.7664 49.5875C33.0814 49.558 33.3886 49.4221 33.6269 49.178C34.1605 48.6325 34.1506 47.7603 33.6052 47.2286C31.9847 45.6436 30.9786 43.5269 30.7738 41.2685C30.3012 36.0289 34.1782 31.3801 39.4177 30.9076C44.6592 30.433 49.306 34.31 49.7806 39.5495C49.9853 41.8099 49.375 44.0723 48.0636 45.9212C47.6225 46.5434 47.7702 47.4039 48.3905 47.843C49.0127 48.284 49.8731 48.1363 50.3122 47.5161C52.0016 45.1316 52.7892 42.2156 52.5254 39.3014C51.915 32.5497 45.9253 27.5504 39.1696 28.1608C32.4159 28.7712 27.4186 34.7629 28.029 41.5166C28.2928 44.4287 29.5884 47.1578 31.6795 49.1996C31.9788 49.493 32.3785 49.6229 32.7664 49.5875Z" fill="white"/>
</g>
</g>
</g>
<mask id="mask6_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="24" y="35" width="47" height="63">
<path d="M24.8799 35.0835H70.7498V97.5876H24.8799V35.0835Z" fill="white"/>
</mask>
<g mask="url(#mask6_1173_1857)">
<mask id="mask7_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="21" y="25" width="50" height="75">
<path d="M21.8242 29.7278L64.3705 25.8843L70.6654 95.5398L28.1191 99.3833L21.8242 29.7278Z" fill="white"/>
</mask>
<g mask="url(#mask7_1173_1857)">
<mask id="mask8_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="21" y="25" width="50" height="75">
<path d="M21.8242 29.7278L64.3705 25.8843L70.6654 95.5398L28.1191 99.3833L21.8242 29.7278Z" fill="white"/>
</mask>
<g mask="url(#mask8_1173_1857)">
<path d="M35.5562 39.9194L38.4132 71.5495C37.0723 69.671 35.1486 67.1724 33.2111 65.3195C31.4488 63.6321 29.2042 63.3328 26.8906 64.4729C25.9848 64.9198 25.3764 65.8177 25.3095 66.8613C25.2642 67.5543 25.4886 68.2356 25.8982 68.7948C26.9024 70.179 28.1626 72.4001 29.6196 74.9637C32.9925 80.9101 36.8163 87.65 40.455 89.5048C43.3298 90.9717 49.7921 96.8925 49.857 96.9516C50.0303 97.1111 50.2587 97.1879 50.4911 97.1662L69.7834 95.4236C70.1653 95.3882 70.4863 95.0928 70.5316 94.6853C70.5552 94.4765 70.4902 94.2698 70.3682 94.1005C68.4366 91.4029 66.5562 87.9001 66.8338 86.9746C66.8574 86.8978 69.108 78.9982 68.8638 76.1018L67.7947 64.2582C67.6214 62.3522 65.93 60.9405 64.026 61.1137H64.0142C63.4865 61.163 63.0947 61.6335 63.1419 62.1612L63.329 64.2346C63.3703 64.6855 63.0592 65.1108 62.6083 65.1659C62.1436 65.2211 61.7282 64.8824 61.6848 64.4177L61.3166 60.3281C61.1316 58.2922 59.4028 56.6992 57.3609 56.7839C57.2861 56.7878 57.2113 56.7937 57.1345 56.7996C57.1286 56.7996 57.1187 56.8016 57.1128 56.8016C55.9137 56.9158 55.0473 57.9988 55.1556 59.1979L55.3368 61.2102C55.3781 61.6611 55.067 62.0864 54.6161 62.1396C54.1514 62.1967 53.736 61.856 53.6927 61.3933L53.2398 56.3724C53.0567 54.3443 51.3299 52.7632 49.2959 52.8577C49.227 52.8616 49.158 52.8656 49.0891 52.8715C49.0812 52.8715 49.0734 52.8735 49.0655 52.8735C47.8782 52.9877 47.0177 54.0608 47.126 55.2481L47.5986 60.4856C47.6399 60.9365 47.3269 61.3599 46.8779 61.415C46.4132 61.4701 45.9958 61.1315 45.9545 60.6687L44.0111 39.1554C43.8004 36.8202 41.7369 35.0993 39.4016 35.3099C37.0664 35.5226 35.3455 37.5841 35.5562 39.9194Z" fill="white"/>
</g>
</g>
</g>
<mask id="mask9_1173_1857" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="53" y="28" width="35" height="28">
<path d="M53.6982 28.5801H87.3446V55.7996H53.6982V28.5801Z" fill="white"/>
</mask>
<g mask="url(#mask9_1173_1857)">
<path d="M66.1782 77.3918C65.0854 74.2059 63.0869 71.4099 60.4287 69.3444L53.8897 64.2683C47.1773 59.0584 43.0995 51.1528 42.7471 42.6625C42.7471 27.257 55.2345 14.7676 70.64 14.7676C86.0474 14.7676 98.5349 27.257 98.5349 42.6625C98.1824 51.1528 94.1046 59.0584 87.3923 64.2683L80.8532 69.3444C78.1951 71.4099 76.1965 74.2059 75.1037 77.3918L74.3358 79.6345C73.7943 81.2116 72.3097 82.2729 70.64 82.2729C68.9722 82.2729 67.4876 81.2116 66.9461 79.6345L66.1782 77.3918ZM70.64 91.7556C64.479 91.7556 59.4836 91.0074 59.4836 90.084C59.4836 89.1585 64.479 88.4083 70.64 88.4083C76.803 88.4083 81.7983 89.1585 81.7983 90.084C81.7983 91.0074 76.803 91.7556 70.64 91.7556ZM70.64 64.42C82.966 64.42 92.9567 54.4292 92.9567 42.1052C92.9567 29.7793 82.966 19.7885 70.64 19.7885C58.316 19.7885 48.3253 29.7793 48.3253 42.1052C48.3253 54.4292 58.316 64.42 70.64 64.42ZM67.2179 29.8305H78.2325C79.6482 29.8305 81.2667 31.1162 81.9086 32.7564L83.9859 38.0392C84.0391 38.0314 84.0922 38.0196 84.1493 38.0196H85.7442C86.6441 38.0176 87.3785 38.8465 87.3785 39.8744C87.3785 40.8963 86.6441 41.7272 85.7442 41.7272H85.3445C85.3445 41.7292 85.3445 41.7311 85.3445 41.7351C85.5631 42.375 85.6832 43.074 85.6832 43.8065V45.9783C85.6832 48.1028 85.1653 49.936 83.9918 50.8279V53.2144C83.9918 54.4115 83.1333 55.3822 82.0799 55.3822H80.3255C79.2701 55.3822 78.4136 54.4115 78.4136 53.2144V51.4048H62.8723V53.2144C62.8723 54.4115 62.0157 55.3822 60.9604 55.3822H59.204C58.1486 55.3822 57.2921 54.4115 57.2921 53.2144V50.8279C56.1205 49.936 55.6007 48.1028 55.6007 45.9783V43.8065C55.6007 43.074 55.7228 42.377 55.9374 41.737C55.9374 41.7351 55.9394 41.7311 55.9394 41.7272H55.5377C54.6359 41.7272 53.9034 40.8963 53.9034 39.8744C53.9034 38.8505 54.6359 38.0196 55.5377 38.0196H57.1306C57.1897 38.0196 57.2429 38.0333 57.298 38.0392L59.3733 32.7564C60.029 31.0887 61.6082 29.8305 63.0495 29.8305H67.2179ZM59.7947 39.3092C59.7947 40.9829 81.7944 40.9809 81.7944 39.3092C81.7944 39.0946 81.753 38.8249 81.7511 38.8072C81.3612 37.2398 79.8648 33.9988 79.8648 33.9988C79.5025 33.0773 78.5928 32.3626 78.0533 32.3626H63.5417C63.0022 32.3626 62.0925 33.0773 61.7302 34.0008C61.7302 34.0008 60.413 37.0114 59.842 38.8091C59.8361 38.8249 59.7947 39.0966 59.7947 39.3092ZM64.0655 46.502C64.0655 45.1867 62.9943 44.1156 61.6751 44.1156C60.3559 44.1156 59.2828 45.1848 59.2828 46.502C59.2828 47.8173 60.3539 48.8865 61.6751 48.8865C62.9943 48.8865 64.0655 47.8193 64.0655 46.502ZM82.5958 46.502C82.5958 45.1867 81.5266 44.1156 80.2054 44.1156C78.8862 44.1156 77.8131 45.1848 77.8131 46.502C77.8131 47.8173 78.8842 48.8865 80.2054 48.8865C81.5266 48.8865 82.5958 47.8193 82.5958 46.502ZM67.0958 45.9034C66.8851 45.9034 66.7138 46.0767 66.7138 46.2874C66.7138 46.5001 66.8851 46.6714 67.0958 46.6714H74.5268C74.7375 46.6714 74.9108 46.5001 74.9108 46.2874C74.9108 46.0767 74.7375 45.9034 74.5268 45.9034H67.0958ZM67.0958 47.6933C66.8851 47.6933 66.7138 47.8646 66.7138 48.0772C66.7138 48.2879 66.8851 48.4592 67.0958 48.4592H74.5268C74.7375 48.4592 74.9108 48.2879 74.9108 48.0772C74.9108 47.8646 74.7375 47.6933 74.5268 47.6933H67.0958Z" fill="white"/>
</g>
</svg>`;

export default function Splash1Screen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const logoMoveAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Phase 1: Logo appears with rotation (0-1.5s)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Logo moves to left and text appears (1.5-2.5s)
    setTimeout(() => {
      Animated.parallel([
        // Logo moves to left and scales down
        Animated.timing(logoMoveAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: isTablet || isLargeTablet ? 0.7 : 0.6, // Slightly larger scale for tablets
          duration: 800,
          useNativeDriver: true,
        }),
        // Text appears
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    // Navigate to login screen after 3 seconds
    const timer = setTimeout(() => {
      console.log('Navigating to login screen...');
      router.replace('/screens/LoginScreen');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const logoMoveInterpolate = logoMoveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -getResponsiveSize(10)], // Move logo to the left (responsive)
  });
  const splashLogoXml = isDarkMode
    ? tapParkLogoSvg.replace(/#8A0000/gi, '#D80000').replace(/#800000/gi, '#D80000')
    : tapParkLogoSvg;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo and Text Container */}
          <View style={styles.logoTextContainer}>
            {/* Animated Map Pin Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: Animated.multiply(scaleAnim, logoScaleAnim) },
                    { rotate: rotateInterpolate },
                    { translateX: logoMoveInterpolate },
                  ],
                },
              ]}
            >
              <SvgXml 
                xml={splashLogoXml} 
                width={getResponsiveSize(140)} 
                height={getResponsiveSize(190)} 
              />
            </Animated.View>

            {/* Animated TapPark Text */}
            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: textFadeAnim,
                  transform: [{ translateY: textSlideAnim }],
                },
              ]}
            >
              <ThemedText type="display" color="primary" style={[styles.appName, { color: colors.primary }]}>
                TapPark
              </ThemedText>
            </Animated.View>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: isTablet || isLargeTablet ? getResponsiveSize(600) : '100%',
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveMargin(40),
    flexWrap: 'wrap',
    paddingHorizontal: getResponsivePadding(20),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getResponsiveMargin(16),
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: getResponsiveSize(150), // Ensure text has enough space
  },
  appName: {
    fontSize: getResponsiveFontSize(48),
    fontWeight: '700',
    color: '#800000',
    textAlign: 'center',
  },
});

