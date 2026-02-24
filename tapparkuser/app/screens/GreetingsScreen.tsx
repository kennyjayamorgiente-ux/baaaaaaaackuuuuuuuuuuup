import React from 'react';
import {
  View,
  Animated,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { getGreetingsStyles } from '../styles/greetingsStyles';
import SharedHeader from '../../components/SharedHeader';
import { useThemeColors } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.75;
  if (isMediumScreen) return baseSize * 0.85;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.15;
  if (isLargeTablet) return baseSize * 1.3;
  return baseSize;
};

export default function GreetingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = getGreetingsStyles(colors);
  const pulseAnim = new Animated.Value(1);
  const circleGlowSvg = `<svg width="280" height="288" viewBox="0 0 280 288" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="139.916" cy="143.704" rx="141.161" ry="137.3" transform="rotate(88.9284 139.916 143.704)" fill="url(#paint0_radial_1317_2440)"/>
<ellipse cx="139.487" cy="143.712" rx="105.12" ry="102.546" transform="rotate(88.9284 139.487 143.712)" fill="url(#paint1_radial_1317_2440)"/>
<ellipse cx="139.916" cy="143.704" rx="70.7952" ry="68.6498" transform="rotate(88.9284 139.916 143.704)" fill="url(#paint2_radial_1317_2440)"/>
<defs>
<radialGradient id="paint0_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.916 143.704) rotate(90) scale(154.407 158.75)">
<stop offset="0.412604" stop-color="${colors.primary}"/>
<stop offset="1" stop-color="${colors.backgroundSecondary}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint1_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.487 143.712) rotate(90) scale(115.323 118.218)">
<stop stop-color="${colors.primary}"/>
<stop offset="1" stop-color="${colors.card}"/>
</radialGradient>
<radialGradient id="paint2_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.916 143.704) rotate(90) scale(77.2037 79.6163)">
<stop stop-color="${colors.primary}"/>
<stop offset="1" stop-color="${colors.card}"/>
</radialGradient>
</defs>
</svg>`;

  React.useEffect(() => {
    // Create pulsing animation for the circles
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const handleSignIn = () => {
    router.push('/screens/SignupScreen');
  };

  const handleLogin = () => {
    router.push('/screens/LoginScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.content}>
          {/* Top Section - Car with Glowing Circles */}
          <View style={styles.topSection}>
            {/* Glowing Circles behind the car */}
            <Animated.View 
              style={[
                styles.circleContainer,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <SvgXml 
                xml={circleGlowSvg} 
                width={getResponsiveSize(300)} 
                height={getResponsiveSize(300)} 
              />
            </Animated.View>
            
            {/* Car Image centered */}
            <View style={styles.carContainer}>
              <Image 
                source={require('../assets/img/car.png')} 
                style={styles.carImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Middle Section - Text */}
          <View style={styles.middleSection}>
            <ThemedText style={styles.welcomeText}>
              Experience a {'\n'}stress free parking {'\n'}with us! 🚗
            </ThemedText>
          </View>

          {/* Bottom Section - Buttons */}
          <View style={styles.bottomSection}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleSignIn}
                style={styles.signInButton}
              >
                <Text style={styles.signInButtonText}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

