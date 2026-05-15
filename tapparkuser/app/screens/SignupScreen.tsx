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

type ExternalIdentity = {
  externalId: string;
  externalSource: string;
  externalType: 'student' | 'employee';
};

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

const normalizeEmailPart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');

const buildFoundationEmail = (firstName: string, lastName: string) => {
  const first = normalizeEmailPart(firstName);
  const last = normalizeEmailPart(lastName);

  if (!first || !last) {
    return '';
  }

  return `${first}.${last}@foundationu.com`;
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
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLookupIdRef = useRef('');
  
  // State for form inputs
  const [schoolId, setSchoolId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpId, setIsLookingUpId] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('');
  const [externalIdentity, setExternalIdentity] = useState<ExternalIdentity | null>(null);
  
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

  useEffect(() => {
    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleLookupSchoolId = async (inputId?: string) => {
    const normalizedSchoolId = (inputId ?? schoolId).trim();

    if (!normalizedSchoolId) {
      return;
    }

    try {
      latestLookupIdRef.current = normalizedSchoolId;
      setIsLookingUpId(true);
      setLookupStatus('Looking up record...');

      const response = await ApiService.lookupTapparkId(normalizedSchoolId);
      console.log('🎓 Tappark lookup response:', response);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'ID lookup failed');
      }

      if (latestLookupIdRef.current !== normalizedSchoolId) {
        return;
      }

      const profile = response.data;
      console.log('🎓 Tappark normalized profile:', profile);
      const resolvedFirstName = profile.first_name || '';
      const resolvedLastName = profile.last_name || '';
      const generatedEmail = buildFoundationEmail(
        resolvedFirstName,
        resolvedLastName
      );

      setFirstName(resolvedFirstName);
      setLastName(resolvedLastName);
      setEmail(generatedEmail);
      setExternalIdentity({
        externalId: profile.external_id,
        externalSource: profile.external_source,
        externalType: profile.external_type,
      });
      setLookupStatus(
        `${profile.external_type === 'employee' ? 'Employee' : 'Student'} record found`
      );
    } catch (error) {
      if (latestLookupIdRef.current !== normalizedSchoolId) {
        return;
      }
      setExternalIdentity(null);
      setLookupStatus(
        error instanceof Error ? error.message : 'Unable to find that ID right now.'
      );
    } finally {
      if (latestLookupIdRef.current === normalizedSchoolId) {
        setIsLookingUpId(false);
      }
    }
  };

  useEffect(() => {
    const normalizedSchoolId = schoolId.trim();

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }

    if (!normalizedSchoolId) {
      latestLookupIdRef.current = '';
      setLookupStatus('');
      setExternalIdentity(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      return;
    }

    if (externalIdentity?.externalId === normalizedSchoolId) {
      return;
    }

    if (normalizedSchoolId.length < 4) {
      setLookupStatus('');
      setExternalIdentity(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      return;
    }

    lookupTimeoutRef.current = setTimeout(() => {
      handleLookupSchoolId(normalizedSchoolId);
    }, 700);

    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
    };
  }, [schoolId]);

  const handleSignup = async () => {
    // Validate inputs
    if (!schoolId.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!externalIdentity || externalIdentity.externalId !== schoolId.trim()) {
      Alert.alert('Lookup Required', 'Please look up your school or employee ID before signing up.');
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
        lastName: lastName.trim(),
        externalId: externalIdentity.externalId,
        externalSource: externalIdentity.externalSource,
        externalType: externalIdentity.externalType,
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
                router.push('/screens/AboutScreen');
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
                  placeholder="School or Employee ID:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={schoolId}
                  onChangeText={(value) => {
                    setSchoolId(value);
                    setLookupStatus('');
                    setExternalIdentity((current) => {
                      if (!current) return null;
                      return current.externalId === value.trim() ? current : null;
                    });
                    if (externalIdentity?.externalId !== value.trim()) {
                      setFirstName('');
                      setLastName('');
                      setEmail('');
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => firstNameRef.current.focus()}
                />
                {lookupStatus ? (
                  <Text
                    style={[
                      styles.parkWithEaseText,
                      {
                        marginBottom: 12,
                        color: lookupStatus.toLowerCase().includes('found')
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {lookupStatus}
                  </Text>
                ) : null}
                <TextInput
                  ref={firstNameRef}
                  style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="First Name:"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={firstName}
                  editable={!externalIdentity}
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
                  editable={!externalIdentity}
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
                  editable={!externalIdentity}
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
