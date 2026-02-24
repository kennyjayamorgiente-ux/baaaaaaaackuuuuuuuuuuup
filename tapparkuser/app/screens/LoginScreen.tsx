import React, { useState } from 'react';
import {
  View,
  Animated,
  Image,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { carIconSvg } from '../assets/icons/index2';
import { loginStyles } from '../styles/loginStyles';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '../../contexts/ThemeContext';
import ApiService from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.05;
  if (isLargeTablet) return baseSize * 1.1;
  return baseSize;
};

// Circle Glow SVG - Using the actual Circle Glow.svg file
const circleGlowSvg = `<svg width="280" height="288" viewBox="0 0 280 288" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="139.916" cy="143.704" rx="141.161" ry="137.3" transform="rotate(88.9284 139.916 143.704)" fill="url(#paint0_radial_1317_2440)"/>
<ellipse cx="139.487" cy="143.712" rx="105.12" ry="102.546" transform="rotate(88.9284 139.487 143.712)" fill="url(#paint1_radial_1317_2440)"/>
<ellipse cx="139.916" cy="143.704" rx="70.7952" ry="68.6498" transform="rotate(88.9284 139.916 143.704)" fill="url(#paint2_radial_1317_2440)"/>
<defs>
<radialGradient id="paint0_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.916 143.704) rotate(90) scale(154.407 158.75)">
<stop offset="0.412604" stop-color="#800000"/>
<stop offset="1" stop-color="#EFEEF6" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint1_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.487 143.712) rotate(90) scale(115.323 118.218)">
<stop stop-color="#800000"/>
<stop offset="1" stop-color="white"/>
</radialGradient>
<radialGradient id="paint2_radial_1317_2440" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(139.916 143.704) rotate(90) scale(77.2037 79.6163)">
<stop stop-color="#800000"/>
<stop offset="1" stop-color="white"/>
</radialGradient>
</defs>
</svg>`;


export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();
  const colors = useThemeColors();
  const pulseAnim = new Animated.Value(1);
  
  // Local loading state for login button
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Refs for scrolling
  const scrollViewRef = React.useRef<ScrollView>(null);
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State for validation errors
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
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


  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setGeneralError('');
    
    let hasErrors = false;

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Please enter a valid email address');
        hasErrors = true;
      }
    }

    // Validate password
    if (!password.trim()) {
      setGeneralError('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    try {
      setIsLoggingIn(true);
      const result = await login(email.trim(), password);
      
      if (result.success && result.user) {
        // Debug: Log the user data to see what we're getting
        console.log('Login result user:', result.user);
        console.log('Account type name:', result.user.account_type_name);
        console.log('Type ID:', result.user.type_id);
        
        // Navigate based on user type (terms will be checked on HomeScreen)
        Alert.alert(
          'Success!',
          `Welcome back! ${result.user.account_type_name}`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Navigate based on user type
                if (result.user?.account_type_name === 'Attendant') {
                  console.log('Routing to attendant dashboard');
                  router.replace('/attendant-screen/DashboardScreen' as any);
                } else if (result.user?.account_type_name === 'Subscriber') {
                    // For subscribers, always go to HomeScreen
                  // The HomeScreen will handle any necessary onboarding flows
                  console.log('Routing subscriber to HomeScreen');
                  router.replace('/screens/HomeScreen');
                } else if (result.user?.account_type_name === 'Admin') {
                  console.log('Routing to admin home');
                  router.replace('/screens/HomeScreen');
                } else {
                  console.log('Routing to default home');
                  router.replace('/screens/HomeScreen');
                }
              }
            }
          ]
        );
      } else {
        // Show general invalid credentials error
        setGeneralError('Invalid email or password');
        setIsLoggingIn(false);
      }
    } catch (error) {
      // Don't log login errors to console to avoid terminal spam
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please check your connection and try again.';
      
      // Check if it's a network error
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
        setGeneralError('Network error. Please check your connection and try again.');
      } else {
        setGeneralError('Invalid email or password');
      }
      setIsLoggingIn(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            enabled
          >
            <ScrollView 
              ref={scrollViewRef}
              contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
          {/* Top Section - Car with Glowing Circles */}
          <View style={styles.topSection}>
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
                  width={getResponsiveSize(270)} 
                  height={getResponsiveSize(270)} 
                />
            </Animated.View>
            
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
            <View style={styles.parkWithEaseContainer}>
              <SvgXml xml={carIconSvg} width={getResponsiveSize(16)} height={getResponsiveSize(16)} />
              <Text style={[styles.parkWithEaseText, { color: colors.textSecondary }]}>Park with ease!</Text>
            </View>
            
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              HEY THERE! WELCOME BACK! 😉
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputSection}>
            <TextInput
              ref={emailInputRef}
              style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text }]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(''); // Clear error when user starts typing
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                }, 100);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            
            <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <TextInput
                ref={passwordInputRef}
                style={[styles.passwordFieldWithIcon, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (generalError) setGeneralError(''); // Clear error when user starts typing
                }}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                  }, 100);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}
          </View>

          {/* Bottom Section - Buttons */}
          <View style={styles.bottomSection}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleLogin}
                style={[styles.loginButton, { backgroundColor: colors.primary }, isLoggingIn && { opacity: 0.7 }]}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>Do not have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/screens/SignupScreen')}>
                <Text style={[styles.registerLink, { color: colors.primary }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}


const styles = loginStyles;
