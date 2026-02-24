// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SharedHeader from '../../components/SharedHeader';
import ApiService from '../../services/api';
import { useThemeColors } from '../../contexts/ThemeContext';
import { addVehicleScreenStyles } from '../styles/addVehicleScreenStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive calculations
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

// Circle Glow SVG - Using the same as SignupScreen
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

// Vehicle types based on backend validation
const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bicycle', label: 'Bike' },
  { value: 'ebike', label: 'E-bike' },
];

export default function AddVehicleScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pulseAnim = new Animated.Value(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Form validation errors
  const [errors, setErrors] = useState({
    vehicleType: '',
    plateNumber: '',
    vehicleColor: '',
    vehicleBrand: '',
    vehicleModel: '',
  });

  // Refs for focusing inputs
  const plateNumberRef = useRef<TextInput>(null);
  const vehicleColorRef = useRef<TextInput>(null);
  const vehicleBrandRef = useRef<TextInput>(null);
  const vehicleModelRef = useRef<TextInput>(null);

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

  const handleGoBack = () => {
    router.back();
  };

  const validateForm = () => {
    const newErrors = {
      vehicleType: '',
      plateNumber: '',
      vehicleColor: '',
      vehicleBrand: '',
      vehicleModel: '',
    };
    let hasError = false;
    let firstErrorField: string | null = null;

    if (!vehicleType) {
      newErrors.vehicleType = 'Vehicle type is required';
      hasError = true;
      firstErrorField = 'vehicleType';
    }

    if (!plateNumber.trim()) {
      newErrors.plateNumber = 'Plate number is required';
      hasError = true;
      firstErrorField = firstErrorField || 'plateNumber';
    }

    if (!vehicleColor.trim()) {
      newErrors.vehicleColor = 'Vehicle color is required';
      hasError = true;
      firstErrorField = firstErrorField || 'vehicleColor';
    }

    if (!vehicleBrand.trim()) {
      newErrors.vehicleBrand = 'Vehicle brand is required';
      hasError = true;
      firstErrorField = firstErrorField || 'vehicleBrand';
    }

    if (!vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle model is required';
      hasError = true;
      firstErrorField = firstErrorField || 'vehicleModel';
    }

    setErrors(newErrors);

    if (hasError && firstErrorField) {
      // Focus the first field with error
      switch (firstErrorField) {
        case 'plateNumber':
          plateNumberRef.current?.focus();
          break;
        case 'vehicleColor':
          vehicleColorRef.current?.focus();
          break;
        case 'vehicleBrand':
          vehicleBrandRef.current?.focus();
          break;
        case 'vehicleModel':
          vehicleModelRef.current?.focus();
          break;
        case 'vehicleType':
          // For dropdown, we'll open it
          setIsDropdownVisible(true);
          break;
      }
    }

    return !hasError;
  };

  const handleAddVehicle = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const vehicleData = {
        plateNumber: plateNumber.trim(),
        vehicleType: vehicleType,
        brand: vehicleBrand.trim() || undefined,
        model: vehicleModel.trim() || undefined,
        color: vehicleColor.trim() || undefined,
      };

      const response = await ApiService.addVehicle(vehicleData);
      
      if (response.success) {
        Alert.alert(
          'Success', 
          'Vehicle added successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.push('/screens/HomeScreen')
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Add vehicle error:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVehicleTypeSelect = (type: string) => {
    setVehicleType(type);
    setIsDropdownVisible(false);
    // Clear error when user selects a type
    if (errors.vehicleType) {
      setErrors(prev => ({ ...prev, vehicleType: '' }));
    }
  };

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible);
    // Clear error when user opens dropdown
    if (errors.vehicleType) {
      setErrors(prev => ({ ...prev, vehicleType: '' }));
    }
  };


  return (
    <View style={[addVehicleScreenStyles.container, { backgroundColor: colors.background }]}>
      <SharedHeader title="Add Vehicle" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          enabled
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[addVehicleScreenStyles.scrollContent, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={addVehicleScreenStyles.content}>
          {/* Top Section - Car with Glowing Circles */}
          <View style={addVehicleScreenStyles.topSection}>
            <Animated.View 
              style={[
                addVehicleScreenStyles.circleContainer,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <SvgXml xml={circleGlowSvg} width={180} height={180} />
            </Animated.View>
            
            <View style={addVehicleScreenStyles.carContainer}>
              <Image 
                source={require('../assets/img/car.png')} 
                style={addVehicleScreenStyles.carImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Middle Section - Text */}
          <View style={addVehicleScreenStyles.middleSection}>
            <Text style={[addVehicleScreenStyles.welcomeText, { color: colors.text }]}>
              ADD YOUR VEHICLE
            </Text>
          </View>

          {/* Input Fields */}
          <View style={addVehicleScreenStyles.inputSection}>
            {/* Vehicle Type Dropdown - FAQ Style */}
            <TouchableOpacity 
              style={[
                addVehicleScreenStyles.dropdownContainer,
                { backgroundColor: colors.card },
                errors.vehicleType && addVehicleScreenStyles.errorInput
              ]}
              onPress={() => {
                toggleDropdown();
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 280, animated: true });
                }, 100);
              }}
              activeOpacity={0.7}
            >
              <View style={[addVehicleScreenStyles.dropdownHeader, { backgroundColor: colors.card }]}>
                <Text style={[
                  addVehicleScreenStyles.dropdownText,
                  { color: colors.text },
                  !vehicleType && addVehicleScreenStyles.placeholderText,
                  errors.vehicleType && addVehicleScreenStyles.errorText
                ]}>
                  {vehicleType ? VEHICLE_TYPES.find(type => type.value === vehicleType)?.label : "Vehicle Type"}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={20} 
                  color={errors.vehicleType ? "#FF3B30" : colors.primary}
                  style={[
                    addVehicleScreenStyles.chevronIcon,
                    { transform: [{ rotate: isDropdownVisible ? '180deg' : '0deg' }] }
                  ]}
                />
              </View>
              
              {errors.vehicleType && (
                <Text style={addVehicleScreenStyles.errorHelperText}>
                  {errors.vehicleType}
                </Text>
              )}
              
              {isDropdownVisible && (
                <View style={[addVehicleScreenStyles.dropdownContent, { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }]}>
                  {VEHICLE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        addVehicleScreenStyles.dropdownItem,
                        { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border },
                        vehicleType === type.value && addVehicleScreenStyles.selectedDropdownItem
                      ]}
                      onPress={() => handleVehicleTypeSelect(type.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        addVehicleScreenStyles.dropdownItemText,
                        { color: colors.text },
                        vehicleType === type.value && addVehicleScreenStyles.selectedDropdownItemText
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[
                addVehicleScreenStyles.inputField,
                { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text },
                errors.vehicleColor && addVehicleScreenStyles.errorInput
              ]}
              placeholder="Vehicle Color:"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              value={vehicleColor}
              onChangeText={(text) => {
                setVehicleColor(text);
                // Clear error when user starts typing
                if (errors.vehicleColor) {
                  setErrors(prev => ({ ...prev, vehicleColor: '' }));
                }
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 330, animated: true });
                }, 100);
              }}
              ref={vehicleColorRef}
            />

            {errors.vehicleColor && (
              <Text style={addVehicleScreenStyles.errorHelperText}>
                {errors.vehicleColor}
              </Text>
            )}

            <TextInput
              style={[
                addVehicleScreenStyles.inputField,
                { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text },
                errors.plateNumber && addVehicleScreenStyles.errorInput
              ]}
              placeholder="Plate Number:"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              value={plateNumber}
              onChangeText={(text) => {
                setPlateNumber(text);
                // Clear error when user starts typing
                if (errors.plateNumber) {
                  setErrors(prev => ({ ...prev, plateNumber: '' }));
                }
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 390, animated: true });
                }, 100);
              }}
              ref={plateNumberRef}
            />

            {errors.plateNumber && (
              <Text style={addVehicleScreenStyles.errorHelperText}>
                {errors.plateNumber}
              </Text>
            )}

            <TextInput
              style={[
                addVehicleScreenStyles.inputField,
                { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text },
                errors.vehicleBrand && addVehicleScreenStyles.errorInput
              ]}
              placeholder="Vehicle Brand:"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              value={vehicleBrand}
              onChangeText={(text) => {
                setVehicleBrand(text);
                // Clear error when user starts typing
                if (errors.vehicleBrand) {
                  setErrors(prev => ({ ...prev, vehicleBrand: '' }));
                }
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 450, animated: true });
                }, 100);
              }}
              ref={vehicleBrandRef}
            />

            {errors.vehicleBrand && (
              <Text style={addVehicleScreenStyles.errorHelperText}>
                {errors.vehicleBrand}
              </Text>
            )}

            <TextInput
              style={[
                addVehicleScreenStyles.inputField,
                { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text },
                errors.vehicleModel && addVehicleScreenStyles.errorInput
              ]}
              placeholder="Vehicle Model:"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              value={vehicleModel}
              onChangeText={(text) => {
                setVehicleModel(text);
                // Clear error when user starts typing
                if (errors.vehicleModel) {
                  setErrors(prev => ({ ...prev, vehicleModel: '' }));
                }
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              ref={vehicleModelRef}
            />

            {errors.vehicleModel && (
              <Text style={addVehicleScreenStyles.errorHelperText}>
                {errors.vehicleModel}
              </Text>
            )}
          </View>

          {/* Bottom Section - Buttons */}
          <View style={[addVehicleScreenStyles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
            <View style={addVehicleScreenStyles.buttonContainer}>
              <TouchableOpacity
                onPress={handleGoBack}
                style={[addVehicleScreenStyles.goBackButton, { backgroundColor: colors.gray200 }]}
              >
                <Text style={[addVehicleScreenStyles.goBackButtonText, { color: colors.text }]}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddVehicle}
                style={[addVehicleScreenStyles.addButton, { backgroundColor: colors.primary }, isLoading && addVehicleScreenStyles.disabledButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={addVehicleScreenStyles.addButtonText}>+ Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

// Styles are now in addVehicleScreenStyles.ts

