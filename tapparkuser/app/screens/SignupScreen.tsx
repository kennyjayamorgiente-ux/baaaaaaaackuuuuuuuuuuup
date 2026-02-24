import React, { useState, useEffect, useRef } from 'react';
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
import { carIconSvg } from '../assets/icons/index2';
import { signupStyles } from '../styles/signupStyles';
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


export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const colors = useThemeColors();
  const pulseAnim = new Animated.Value(1);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // 🔑 1. Create Refs for all Text Inputs
  const schoolIdRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  
  // State for form inputs
  const [schoolId, setSchoolId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for screen dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
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

  // Handle orientation changes
  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleSignup = async () => {
    // Validate inputs
    if (!schoolId.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await ApiService.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim()
        // Note: School ID is collected but not sent to backend (no phone field in database)
      });
      
      if (response.success) {
        // Authenticate user with AuthContext after successful registration
        await login(email.trim(), password);
        
        Alert.alert(
          'Success!', 
          `Welcome to Tapparkuser, ${response.data.user.firstName}!`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Check if user has any vehicles
                try {
                  const vehiclesResponse = await ApiService.getVehicles();
                  if (vehiclesResponse.success && vehiclesResponse.data.vehicles.length === 0) {
                    // No vehicles found, show AboutScreen to encourage adding a vehicle
                    router.push('/screens/AboutScreen');
                  } else {
                    // User has vehicles, go to HomeScreen
                    router.push('/screens/HomeScreen');
                  }
                } catch (error) {
                  console.error('Error checking vehicles:', error);
                  // If there's an error checking vehicles, default to AboutScreen for new users
                  router.push('/screens/AboutScreen');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Signup Failed', response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Signup Failed', 
        error instanceof Error ? error.message : 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'position' : undefined} // <-- Changed to 'position'
    style={{ flex: 1 }}
    enabled
    keyboardVerticalOffset={Platform.OS === 'ios' ? -80 : 0} // <-- Use a negative offset
>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
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
                  YOU ARE MAKING THE RIGHT CHOICE! 👍
                </Text>
              </View>

              {/* Input Fields - The changes are here! */}
              <View style={styles.inputSection}>
                <TextInput
                  ref={schoolIdRef} // <-- Assign Ref
                  style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="School ID:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={schoolId}
                  onChangeText={setSchoolId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next" // <-- Set Next
                  onSubmitEditing={() => firstNameRef.current.focus()} // <-- Focus next input
                />
                <TextInput
                  ref={firstNameRef}
                  style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="First Name:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current.focus()}
                />
                <TextInput
                  ref={lastNameRef}
                  style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Last Name:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current.focus()}
                />
                <TextInput
                  ref={emailRef}
                  style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Email:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current.focus()}
                />
                <TextInput
                  ref={passwordRef} // <-- Last Input
                  style={[styles.emailField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Password:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done" // <-- Set Done
                  onSubmitEditing={handleSignup} // <-- Call your signup function
                />
              </View>

              {/* Bottom Section - Buttons */}
              <View style={styles.bottomSection}>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleGoBack}
                    style={[styles.goBackButton, { backgroundColor: colors.gray200 }]}
                  >
                    <Text style={[styles.goBackButtonText, { color: colors.text }]}>Go Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSignup}
                    style={[styles.signupButton, { backgroundColor: colors.primary }, isLoading && { opacity: 0.7 }]}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.textInverse} size="small" />
                    ) : (
                      <Text style={styles.signupButtonText}>Sign Up</Text>
                    )}
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


const styles = signupStyles;
