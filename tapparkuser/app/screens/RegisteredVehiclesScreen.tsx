// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import SharedHeader from '../../components/SharedHeader';
import { getRegisteredVehiclesScreenStyles } from '../styles/registeredVehiclesScreenStyles';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { useLoading } from '../../contexts/LoadingContext';
import { SvgXml } from 'react-native-svg';
import {
  maroonUsersEditIconSvg,
  maroonCarIconSvg,
  maroonMotorIconSvg,
  maroonEbikeIconSvg,
  maroonBinIconSvg,
  maroonNewCarIconSvg,
  darkCarIconSvg,
  darkMotorIconSvg,
  darkEbikeIconSvg,
  darkBinIconSvg,
  darkNewCarIconSvg
} from '../assets/icons/index2';
import { useAuth } from '../../contexts/AuthContext';
import ApiService from '../../services/api';
import { useScreenDimensions } from '../../hooks/use-screen-dimensions';
import { getNormalizedProfileImageFromUser } from '../../utils/profileImage';

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

const RegisteredVehiclesScreen: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const screenDimensions = useScreenDimensions();
  const registeredVehiclesScreenStyles = getRegisteredVehiclesScreenStyles(colors);

  // Scroll progress refs for each vehicle category
  const carScrollProgress = useRef(new Animated.Value(0)).current;
  const motorcycleScrollProgress = useRef(new Animated.Value(0)).current;
  const bikeScrollProgress = useRef(new Animated.Value(0)).current;

  // Scroll state tracking for each category
  const [canScrollCars, setCanScrollCars] = useState(false);
  const [canScrollMotorcycles, setCanScrollMotorcycles] = useState(false);
  const [canScrollBikes, setCanScrollBikes] = useState(false);
  const carScrollViewWidth = useRef(0);
  const carContentWidth = useRef(0);
  const motorcycleScrollViewWidth = useRef(0);
  const motorcycleContentWidth = useRef(0);
  const bikeScrollViewWidth = useRef(0);
  const bikeContentWidth = useRef(0);

  // Modal state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Vehicle data state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profile picture component
  const ProfilePicture = ({ size = 120 }: { size?: number }) => {
    const getInitials = () => {
      if (!user) return '?';
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const profileImageUrl = getNormalizedProfileImageFromUser(user as any);

    // If profile image URL is provided, show the image
    if (profileImageUrl) {
      return (
        <View style={[registeredVehiclesScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
          <ExpoImage
            source={{ uri: profileImageUrl }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={({ error }) => {
              console.warn('⚠️ Failed to load profile image:', profileImageUrl, error);
            }}
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[registeredVehiclesScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[registeredVehiclesScreenStyles.profileInitials, { fontSize: size * 0.3 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  // Fetch user's vehicles from API
  const fetchVehicles = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await ApiService.getVehicles();
      if (response.success) {
        setVehicles(response.data.vehicles);
      } else {
        Alert.alert('Error', 'Failed to load vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [isAuthenticated]);

  // Group vehicles by type
  const groupedVehicles = {
    car: vehicles.filter(v => v.vehicle_type.toLowerCase() === 'car'),
    motorcycle: vehicles.filter(v => v.vehicle_type.toLowerCase() === 'motorcycle'),
    bike: vehicles.filter(v => v.vehicle_type.toLowerCase() === 'bicycle' || v.vehicle_type.toLowerCase() === 'ebike')
  };

  // Reset scroll states when vehicles change
  useEffect(() => {
    setCanScrollCars(false);
    setCanScrollMotorcycles(false);
    setCanScrollBikes(false);
  }, [vehicles.length]);


  const handleDeleteVehicle = (vehicle: any, vehicleType: string) => {
    const vehicleWithType = { ...vehicle, type: vehicleType };
    setSelectedVehicle(vehicleWithType);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedVehicle) {
      return;
    }

    try {
      showLoading('Deleting vehicle...');
      const response = await ApiService.deleteVehicle(selectedVehicle.id);
      hideLoading();

      if (response.success) {
        // Remove vehicle from local state
        setVehicles(prevVehicles => prevVehicles.filter(v => v.id !== selectedVehicle.id));
        setIsDeleteModalVisible(false);
        setSelectedVehicle(null);
        Alert.alert('Success', 'Vehicle deleted successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      hideLoading();
      console.error('Error deleting vehicle:', error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes('active parking session')) {
          Alert.alert(
            'Cannot Delete',
            'This vehicle has an active parking session. Please end the session before deleting the vehicle.'
          );
        } else if (error.message.includes('not found')) {
          Alert.alert('Error', 'Vehicle not found');
        } else {
          Alert.alert('Error', error.message || 'Failed to delete vehicle. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to delete vehicle. Please try again.');
      }
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
    setSelectedVehicle(null);
  };

  const handleAddVehicle = () => {
    router.push('/screens/AddVehicleScreen');
  };

  const handleScroll = (event: any, scrollProgress: Animated.Value) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScroll = contentSize.width - layoutMeasurement.width;
    const scrollPercentage = maxScroll > 0 ? contentOffset.x / maxScroll : 0;
    scrollProgress.setValue(Math.min(Math.max(scrollPercentage, 0), 1));
  };


  return (
    <View style={registeredVehiclesScreenStyles.container}>
      <SharedHeader
        title="Vehicles"
        showBackButton={true}
        onBackPress={() => {
          showLoading();
          router.back();
          setTimeout(() => hideLoading(), 500);
        }}
      />

      <View style={registeredVehiclesScreenStyles.scrollContainer}>

        {/* Profile Content Card */}
        <View style={registeredVehiclesScreenStyles.profileCard}>
          {/* Profile Picture Section */}
          <View style={registeredVehiclesScreenStyles.fixedProfileSection}>
            <View style={registeredVehiclesScreenStyles.profilePictureContainer}>
              <ProfilePicture size={screenDimensions.isTablet ? 170 : 150} />
            </View>

            <View style={registeredVehiclesScreenStyles.userInfoContainer}>
              <Text style={registeredVehiclesScreenStyles.userName}>
                {user ? `${user.first_name} ${user.last_name}` : 'User'}
              </Text>
              <Text style={registeredVehiclesScreenStyles.userEmail}>
                {user ? user.email : 'user@example.com'}
              </Text>
            </View>
          </View>

          <ScrollView style={registeredVehiclesScreenStyles.profileCardScroll} showsVerticalScrollIndicator={false}>
            {/* Loading State */}
            {isLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading vehicles...</Text>
              </View>
            ) : vehicles.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 10 }}>
                  No vehicles registered yet
                </Text>
                <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
                  Add your first vehicle to get started
                </Text>
              </View>
            ) : (
            <View style={registeredVehiclesScreenStyles.vehiclesContainer}>
            {/* Registered Car - Only show if user has cars */}
            {groupedVehicles.car.length > 0 && (
              <View style={registeredVehiclesScreenStyles.vehicleCategory}>
                <Text style={registeredVehiclesScreenStyles.categoryTitle}>Registered Car</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={registeredVehiclesScreenStyles.horizontalScroll}
                  contentContainerStyle={registeredVehiclesScreenStyles.horizontalScrollContent}
                  onScroll={(event) => handleScroll(event, carScrollProgress)}
                  scrollEventThrottle={16}
                  onLayout={(event) => {
                    const layoutWidth = event.nativeEvent.layout.width;
                    carScrollViewWidth.current = layoutWidth;
                    // Re-check scrollability if we already have content width
                    if (layoutWidth > 0 && carContentWidth.current > 0) {
                      const canScroll = carContentWidth.current > layoutWidth + 20;
                      setCanScrollCars(canScroll);
                    }
                  }}
                  onContentSizeChange={(contentWidth) => {
                    carContentWidth.current = contentWidth;
                    const containerWidth = carScrollViewWidth.current || screenWidth;
                    const canScroll = contentWidth > containerWidth + 20;
                    setCanScrollCars(canScroll);
                  }}
                >
                  {groupedVehicles.car.map((vehicle) => (
                  <View key={vehicle.id} style={registeredVehiclesScreenStyles.vehicleCard}>
                    <View style={registeredVehiclesScreenStyles.vehicleInfo}>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Plate Number:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.plate_number}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Brand:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.brand || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Model:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.model || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Color:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.color || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={registeredVehiclesScreenStyles.vehicleRowRight}>
                      <SvgXml
                        xml={isDarkMode ? darkCarIconSvg : maroonCarIconSvg}
                        width={20}
                        height={20}
                      />
                    </View>
                    <TouchableOpacity
                      style={registeredVehiclesScreenStyles.deleteButton}
                      onPress={() => handleDeleteVehicle(vehicle, 'Car')}
                    >
                      <SvgXml
                        xml={isDarkMode ? darkBinIconSvg : maroonBinIconSvg}
                        width={20}
                        height={20}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Scroll Indicator - Only show when 3+ cars and content overflows */}
              {groupedVehicles.car.length >= 3 && canScrollCars && (
                <View style={registeredVehiclesScreenStyles.scrollIndicatorContainer}>
                  <View style={registeredVehiclesScreenStyles.scrollIndicatorTrack}>
                    <Animated.View
                      style={[
                        registeredVehiclesScreenStyles.scrollIndicatorHandle,
                        {
                          left: carScrollProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, (screenWidth - (getResponsivePadding(20) * 2)) - getResponsiveSize(20))],
                            extrapolate: 'clamp',
                          }),
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
            )}

            {/* Registered Motorcycle - Only show if user has motorcycles */}
            {groupedVehicles.motorcycle.length > 0 && (
              <View style={registeredVehiclesScreenStyles.vehicleCategory}>
                <Text style={registeredVehiclesScreenStyles.categoryTitle}>Registered Motorcycle</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={registeredVehiclesScreenStyles.horizontalScroll}
                  contentContainerStyle={registeredVehiclesScreenStyles.horizontalScrollContent}
                  onScroll={(event) => handleScroll(event, motorcycleScrollProgress)}
                  scrollEventThrottle={16}
                  onLayout={(event) => {
                    const layoutWidth = event.nativeEvent.layout.width;
                    motorcycleScrollViewWidth.current = layoutWidth;
                    // Re-check scrollability if we already have content width
                    if (layoutWidth > 0 && motorcycleContentWidth.current > 0) {
                      const canScroll = motorcycleContentWidth.current > layoutWidth + 20;
                      setCanScrollMotorcycles(canScroll);
                    }
                  }}
                  onContentSizeChange={(contentWidth) => {
                    motorcycleContentWidth.current = contentWidth;
                    const containerWidth = motorcycleScrollViewWidth.current || screenWidth;
                    const canScroll = contentWidth > containerWidth + 20;
                    setCanScrollMotorcycles(canScroll);
                  }}
                >
                  {groupedVehicles.motorcycle.map((vehicle) => (
                  <View key={vehicle.id} style={registeredVehiclesScreenStyles.vehicleCard}>
                    <View style={registeredVehiclesScreenStyles.vehicleInfo}>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Plate Number:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.plate_number}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Brand:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.brand || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Model:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.model || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Color:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.color || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={registeredVehiclesScreenStyles.vehicleRowRight}>
                      <SvgXml
                        xml={isDarkMode ? darkMotorIconSvg : maroonMotorIconSvg}
                        width={20}
                        height={20}
                      />
                    </View>
                    <TouchableOpacity
                      style={registeredVehiclesScreenStyles.deleteButton}
                      onPress={() => handleDeleteVehicle(vehicle, 'Motorcycle')}
                    >
                      <SvgXml
                        xml={isDarkMode ? darkBinIconSvg : maroonBinIconSvg}
                        width={20}
                        height={20}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Scroll Indicator - Only show when 3+ motorcycles and content overflows */}
              {groupedVehicles.motorcycle.length >= 3 && canScrollMotorcycles && (
                <View style={registeredVehiclesScreenStyles.scrollIndicatorContainer}>
                  <View style={registeredVehiclesScreenStyles.scrollIndicatorTrack}>
                    <Animated.View
                      style={[
                        registeredVehiclesScreenStyles.scrollIndicatorHandle,
                        {
                          left: motorcycleScrollProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, (screenWidth - (getResponsivePadding(20) * 2)) - getResponsiveSize(20))],
                            extrapolate: 'clamp',
                          }),
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
            )}

            {/* Registered Bike - Only show if user has bikes */}
            {groupedVehicles.bike.length > 0 && (
              <View style={registeredVehiclesScreenStyles.vehicleCategory}>
                <Text style={registeredVehiclesScreenStyles.categoryTitle}>Registered Bike</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={registeredVehiclesScreenStyles.horizontalScroll}
                  contentContainerStyle={registeredVehiclesScreenStyles.horizontalScrollContent}
                  onScroll={(event) => handleScroll(event, bikeScrollProgress)}
                  scrollEventThrottle={16}
                  onLayout={(event) => {
                    const layoutWidth = event.nativeEvent.layout.width;
                    bikeScrollViewWidth.current = layoutWidth;
                    // Re-check scrollability if we already have content width
                    if (layoutWidth > 0 && bikeContentWidth.current > 0) {
                      const canScroll = bikeContentWidth.current > layoutWidth + 20;
                      setCanScrollBikes(canScroll);
                    }
                  }}
                  onContentSizeChange={(contentWidth) => {
                    bikeContentWidth.current = contentWidth;
                    const containerWidth = bikeScrollViewWidth.current || screenWidth;
                    const canScroll = contentWidth > containerWidth + 20;
                    setCanScrollBikes(canScroll);
                  }}
                >
                  {groupedVehicles.bike.map((vehicle) => (
                  <View key={vehicle.id} style={registeredVehiclesScreenStyles.vehicleCard}>
                    <View style={registeredVehiclesScreenStyles.vehicleInfo}>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Plate Number:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.plate_number}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Brand:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.brand || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Model:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.model || 'N/A'}</Text>
                      </View>
                      <View style={registeredVehiclesScreenStyles.vehicleRow}>
                        <Text style={registeredVehiclesScreenStyles.vehicleLabel}>Color:</Text>
                        <Text style={registeredVehiclesScreenStyles.vehicleValue}>{vehicle.color || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={registeredVehiclesScreenStyles.vehicleRowRight}>
                      <SvgXml
                        xml={isDarkMode ? darkEbikeIconSvg : maroonEbikeIconSvg}
                        width={20}
                        height={20}
                      />
                    </View>
                    <TouchableOpacity
                      style={registeredVehiclesScreenStyles.deleteButton}
                      onPress={() => handleDeleteVehicle(vehicle, 'E-bike')}
                    >
                      <SvgXml
                        xml={isDarkMode ? darkBinIconSvg : maroonBinIconSvg}
                        width={20}
                        height={20}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Scroll Indicator - Only show when 3+ bikes and content overflows */}
              {groupedVehicles.bike.length >= 3 && canScrollBikes && (
                <View style={registeredVehiclesScreenStyles.scrollIndicatorContainer}>
                  <View style={registeredVehiclesScreenStyles.scrollIndicatorTrack}>
                    <Animated.View
                      style={[
                        registeredVehiclesScreenStyles.scrollIndicatorHandle,
                        {
                          left: bikeScrollProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, (screenWidth - (getResponsivePadding(20) * 2)) - getResponsiveSize(20))],
                            extrapolate: 'clamp',
                          }),
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
            )}

            {/* Add Vehicle Button */}
            <TouchableOpacity style={registeredVehiclesScreenStyles.addVehicleButton} onPress={handleAddVehicle}>
              <SvgXml
                xml={isDarkMode ? darkNewCarIconSvg : maroonNewCarIconSvg}
                width={20}
                height={20}
              />
              <Text style={registeredVehiclesScreenStyles.addVehicleText}>Add Vehicle</Text>
            </TouchableOpacity>
            </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={registeredVehiclesScreenStyles.modalOverlay}>
          <View style={registeredVehiclesScreenStyles.deleteModalContainer}>
            <Text style={registeredVehiclesScreenStyles.deleteModalTitle}>Confirm Deletion</Text>

            {selectedVehicle && (
              <>
                <Text style={registeredVehiclesScreenStyles.vehicleDetailText}>Type: {selectedVehicle.vehicle_type}</Text>
                <Text style={registeredVehiclesScreenStyles.vehicleDetailText}>Model: {selectedVehicle.model}</Text>
                <Text style={registeredVehiclesScreenStyles.vehicleDetailText}>Plate: {selectedVehicle.plate_number}</Text>
              </>
            )}

            <Text style={registeredVehiclesScreenStyles.confirmationText}>
              Are you sure you want to delete this vehicle from your account?
            </Text>

            <View style={registeredVehiclesScreenStyles.modalButtons}>
              <TouchableOpacity
                style={registeredVehiclesScreenStyles.cancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={registeredVehiclesScreenStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={registeredVehiclesScreenStyles.deleteConfirmButton}
                onPress={handleConfirmDelete}
              >
                <Text style={registeredVehiclesScreenStyles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles are now imported from registeredVehiclesScreenStyles.ts

export default RegisteredVehiclesScreen;



