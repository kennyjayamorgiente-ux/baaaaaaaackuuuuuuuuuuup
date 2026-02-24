import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions,
  ScrollView,
  Animated,
  Modal,
  Alert,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../../components/SharedHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { SvgXml } from 'react-native-svg';
import ApiService from '../../services/api';
import RealtimeService from '../../services/realtime';
import { getFavoritesScreenStyles } from '../styles/favoritesScreenStyles';
import { 
  maroonTrashIconSvg,
  darkTrashIconSvg,
  whiteCarIconSvg,
  whiteMotorIconSvg,
  whiteEbikeIconSvg
} from '../assets/icons/index2';

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


const FavoritesScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const favoritesScreenStyles = getFavoritesScreenStyles(colors);
  const vehicleScrollProgress = useRef(new Animated.Value(0)).current;
  const [isVehicleSelectionModalVisible, setIsVehicleSelectionModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedSpotForBooking, setSelectedSpotForBooking] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showVehicleMismatchModal, setShowVehicleMismatchModal] = useState(false);
  const [mismatchData, setMismatchData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);


  // Fetch user vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsLoadingVehicles(true);
        const response = await ApiService.getVehicles();
        if (response.success) {
          setUserVehicles(response.data.vehicles);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setIsLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  // Refresh favorites when component mounts or when screen is focused
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setIsLoading(true);
        const response = await ApiService.getFavorites();
        if (response.success) {
          setFavorites(response.data.favorites);
        } else {
          setFavorites([]);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
        setFavorites([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFavorites();
  }, []);

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshFavorites = async () => {
        try {
          const response = await ApiService.getFavorites();
          if (response.success) {
            setFavorites(response.data.favorites);
          }
        } catch (error) {
          console.error('Error refreshing favorites:', error);
        }
      };
      
      refreshFavorites();
    }, [])
  );

  useEffect(() => {
    if (!user?.user_id) {
      return;
    }

    const userId = Number(user.user_id);
    let lastRefreshAt = 0;

    const refreshFavoritesRealtime = async () => {
      const now = Date.now();
      if (now - lastRefreshAt < 1500) return;
      lastRefreshAt = now;

      try {
        const response = await ApiService.getFavorites();
        if (response.success && response.data?.favorites) {
          setFavorites(response.data.favorites);
        }
      } catch (error) {
        console.error('Error refreshing favorites from realtime event:', error);
      }
    };

    const onReservationUpdated = () => refreshFavoritesRealtime();
    const onSpotsUpdated = () => refreshFavoritesRealtime();
    const onCapacityUpdated = () => refreshFavoritesRealtime();

    RealtimeService.connect();
    RealtimeService.subscribe({ userId });
    RealtimeService.on('reservation:updated', onReservationUpdated);
    RealtimeService.on('spots:updated', onSpotsUpdated);
    RealtimeService.on('capacity:updated', onCapacityUpdated);

    return () => {
      RealtimeService.off('reservation:updated', onReservationUpdated);
      RealtimeService.off('spots:updated', onSpotsUpdated);
      RealtimeService.off('capacity:updated', onCapacityUpdated);
      RealtimeService.unsubscribe({ userId });
    };
  }, [user?.user_id]);

  // Get vehicle icon based on type
  const getVehicleIcon = (vehicleType: string) => {
    const type = vehicleType.toLowerCase();
    if (type === 'car') {
        return whiteCarIconSvg;
    } else if (type === 'motorcycle') {
        return whiteMotorIconSvg;
    } else if (type === 'bicycle' || type === 'ebike') {
        return whiteEbikeIconSvg;
    }
    return whiteCarIconSvg; // default
  };

  // Filter vehicles by parking spot compatibility
  const getCompatibleVehicles = () => {
    if (!selectedSpotForBooking) {
      return userVehicles; // Show all vehicles if no specific spot selected
    }

    const spotType = selectedSpotForBooking.spot_type?.toLowerCase();
    if (!spotType) {
      return userVehicles; // Show all if spot type is unknown
    }

    return userVehicles.filter(vehicle => {
      const vehicleType = vehicle.vehicle_type.toLowerCase();
      
      // Map vehicle types to spot types for compatibility
      let expectedSpotType = vehicleType;
      if (vehicleType === 'bicycle' || vehicleType === 'ebike') {
        expectedSpotType = 'bike';
      }
      
      return expectedSpotType === spotType;
    });
  };


  const handleBookSpot = (favorite: any) => {
    console.log('🎯 handleBookSpot called with favorite:', favorite);
    const numericSpotId = Number(favorite.parking_spot_id);
    const isCapacitySection =
      !favorite.parking_spot_id || favorite.parking_spot_id === 0 || Number.isNaN(numericSpotId);
    setSelectedSpotForBooking({
      ...favorite,
      isCapacitySection,
      sectionId: favorite.parking_section_id,
      spot_number: favorite.spot_number || favorite.section_name,
      section_name: favorite.section_name
    });
    setIsVehicleSelectionModalVisible(true);
  };

  const handleCloseVehicleSelectionModal = () => {
    setIsVehicleSelectionModalVisible(false);
    setSelectedVehicle('');
    setSelectedSpotForBooking(null);
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  const handleVehicleBookNow = async () => {
    console.log('🎯 handleVehicleBookNow called');
    console.log('🎯 selectedVehicle:', selectedVehicle);
    console.log('🎯 selectedSpotForBooking:', selectedSpotForBooking);
    
    if (!selectedVehicle || !selectedSpotForBooking) {
      console.log('❌ Missing vehicle or spot selection');
      return;
    }

    try {
      setIsBooking(true);
      
      // Check spot availability first - don't attempt booking if spot is occupied/reserved
      const spotStatus = selectedSpotForBooking.spot_status || selectedSpotForBooking.status;
      const currentReservation = selectedSpotForBooking.current_reservation;
      
      // Check if spot is occupied by another user
      if (currentReservation && currentReservation.user_id !== user?.user_id) {
        setIsBooking(false);
        Alert.alert(
          'Spot Occupied',
          'This parking spot is currently occupied by another user. Please try a different spot.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Check if spot status is not available
      if (spotStatus && spotStatus !== 'available' && spotStatus !== 'AVAILABLE') {
        // If it's the user's own reservation, allow booking (might be re-booking)
        if (currentReservation && currentReservation.user_id === user?.user_id) {
          // Allow booking to proceed - user might be re-booking their own spot
        } else {
          setIsBooking(false);
          const statusMessage = spotStatus === 'occupied' || spotStatus === 'OCCUPIED' 
            ? 'This parking spot is currently occupied.' 
            : spotStatus === 'reserved' || spotStatus === 'RESERVED'
            ? 'This parking spot is currently reserved.'
            : 'This parking spot is not available for booking.';
          
          Alert.alert(
            'Spot Not Available',
            statusMessage + ' Please try a different spot.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
      }
      
      // Check for current booking first
      const currentBookingResponse = await ApiService.getMyBookings();
      console.log('🔍 My bookings response:', JSON.stringify(currentBookingResponse, null, 2));
      
      if (currentBookingResponse.success && currentBookingResponse.data.bookings.length > 0) {
        const activeBooking = currentBookingResponse.data.bookings.find(
          (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
        );
        if (activeBooking) {
          setIsBooking(false);
          const statusText = activeBooking.bookingStatus === 'reserved' ? 'reserved' : 'active';
          Alert.alert(
            'Current Booking',
            `You already have a ${statusText} booking at ${activeBooking.parkingArea?.name || 'Unknown Location'} (Spot ${activeBooking.parkingSlot?.spotNumber || 'Unknown'}).\n\nPlease complete or cancel your current booking before making a new one.`,
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
      }

      // Get the selected vehicle
      const vehicle = userVehicles.find(v => v.id.toString() === selectedVehicle);
      if (!vehicle) {
        setIsBooking(false);
        Alert.alert('Error', 'Selected vehicle not found');
        return;
      }

      const numericSpotId = Number(selectedSpotForBooking.parking_spot_id);
      const isCapacitySection =
        selectedSpotForBooking.isCapacitySection ||
        (!selectedSpotForBooking.parking_spot_id || selectedSpotForBooking.parking_spot_id === 0 || Number.isNaN(numericSpotId));
      let response;

      if (isCapacitySection) {
        const sectionId = selectedSpotForBooking.sectionId || selectedSpotForBooking.parking_section_id;
        if (!sectionId) {
          setIsBooking(false);
          Alert.alert('Error', 'Missing section information for this favorite.');
          return;
        }

        console.log('🏍️ Re-booking favorite capacity section:', selectedSpotForBooking);
        response = await ApiService.reserveCapacity(sectionId, {
          vehicleId: vehicle.id,
          spotNumber: selectedSpotForBooking.spot_number || selectedSpotForBooking.section_name,
          areaId: selectedSpotForBooking.parking_area_id,
        });
      } else {
        console.log('🚀 Calling ApiService.bookParkingSpot with:', {
          vehicleId: vehicle.id,
          spotId: selectedSpotForBooking.parking_spot_id,
          areaId: selectedSpotForBooking.parking_area_id
        });

        response = await ApiService.bookParkingSpot(
          vehicle.id,
          selectedSpotForBooking.parking_spot_id,
          selectedSpotForBooking.parking_area_id
        );
      }
      
      console.log('🎯 Booking response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        const bookingDetails = response.data?.bookingDetails;
        const isCapacitySection = selectedSpotForBooking.isCapacitySection || (!selectedSpotForBooking.parking_spot_id || selectedSpotForBooking.parking_spot_id === 0);
        Alert.alert(
          'Success',
          isCapacitySection
            ? `Section ${bookingDetails?.sectionName || selectedSpotForBooking.section_name || selectedSpotForBooking.spot_number} booked successfully!`
            : 'Parking spot booked successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Allow Alert to dismiss first, then navigate smoothly
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    showLoading('Loading parking session...', '/screens/ActiveParkingScreen');
                    router.push({
                      pathname: '/screens/ActiveParkingScreen',
                      params: {
                        sessionId: response.data.reservationId,
                        capacityReservationId: isCapacitySection ? response.data.reservationId : undefined,
                        isCapacitySection: isCapacitySection ? 'true' : undefined,
                        sectionId: isCapacitySection ? (selectedSpotForBooking.sectionId?.toString() ?? '') : undefined,
                        sectionName: bookingDetails?.sectionName || selectedSpotForBooking.section_name || '',
                        vehicleId: vehicle.id,
                        vehiclePlate: bookingDetails?.vehiclePlate || response.data.bookingDetails?.vehiclePlate,
                        vehicleType: bookingDetails?.vehicleType || response.data.bookingDetails?.vehicleType,
                        vehicleBrand: bookingDetails?.vehicleBrand || response.data.bookingDetails?.vehicleBrand,
                        areaName: bookingDetails?.areaName || response.data.bookingDetails?.areaName,
                        areaLocation: bookingDetails?.areaLocation || response.data.bookingDetails?.areaLocation,
                        spotNumber: bookingDetails?.spotNumber || response.data.bookingDetails?.spotNumber,
                        spotType: bookingDetails?.spotType || response.data.bookingDetails?.spotType,
                        startTime: bookingDetails?.startTime || response.data.bookingDetails?.startTime,
                        status: bookingDetails?.status || response.data.bookingDetails?.status
                      }
                    });
                    setTimeout(() => hideLoading(), 500);
                    // Reset states
                    setIsVehicleSelectionModalVisible(false);
                    setSelectedVehicle('');
                    setSelectedSpotForBooking(null);
                  }, 150);
                });
              }
            }
          ]
        );
      } else {
        setIsBooking(false);
        // Check if it's a vehicle type mismatch
        if ((response.data as any)?.errorCode === 'VEHICLE_TYPE_MISMATCH') {
          setMismatchData((response.data as any).data);
          setShowVehicleMismatchModal(true);
        } else if ((response.data as any)?.errorCode === 'SPOT_UNAVAILABLE' || 
                   (response.data as any)?.message?.includes('no longer available') ||
                   (response.data as any)?.message?.includes('not available')) {
          Alert.alert(
            'Spot Not Available',
            'This parking spot is no longer available. It may have been booked by another user. Please try a different spot.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Error', response.data?.message || 'Failed to book parking spot');
        }
      }
    } catch (error: any) {
      setIsBooking(false);
      
      // Check if error is about spot not being available
      if (error?.message?.includes('no longer available') || 
          error?.message?.includes('not available') ||
          error?.message?.includes('SPOT_UNAVAILABLE')) {
        Alert.alert(
          'Spot Not Available',
          'This parking spot is no longer available. It may have been booked by another user. Please try a different spot.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Error', 'Failed to book parking spot. Please try again.');
      }
    }
  };

  const handleVehicleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    const scrollPercentage = maxScrollX > 0 ? contentOffset.x / maxScrollX : 0;
    vehicleScrollProgress.setValue(Math.min(scrollPercentage, 1));
  };

  const handleRemoveFavorite = async (parkingSpotId: number) => {
    try {
      const response = await ApiService.removeFavorite(parkingSpotId);
      if (response.success) {
        // Refresh favorites list
        const updatedResponse = await ApiService.getFavorites();
        if (updatedResponse.success) {
          setFavorites(updatedResponse.data.favorites);
        }
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Fetch user vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsLoadingVehicles(true);
        const response = await ApiService.getVehicles();
        if (response.success) {
          setUserVehicles(response.data.vehicles);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, []);

  const localStyles = StyleSheet.create({
    contentContainer: {
      flex: 1,
      paddingHorizontal: getResponsivePadding(14),
      paddingTop: getResponsivePadding(10),
      paddingBottom: getResponsivePadding(10),
    },
    contentCard: {
      flex: 1,
      backgroundColor: colors.profileCard,
      borderRadius: getResponsiveSize(14),
      paddingHorizontal: getResponsivePadding(12),
      paddingTop: getResponsivePadding(12),
    },
    scrollTopButton: {
      position: 'absolute',
      right: getResponsivePadding(24),
      bottom: getResponsivePadding(28),
      width: getResponsiveSize(48),
      height: getResponsiveSize(48),
      borderRadius: getResponsiveSize(24),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      elevation: 8,
    },
  });

  return (
    <View style={favoritesScreenStyles.container}>
      <SharedHeader 
        title="Favorites" 
        showBackButton={false}
      />
      
      <View style={localStyles.contentContainer}>
        <View style={localStyles.contentCard}>
          <ScrollView 
            ref={mainScrollRef}
            style={favoritesScreenStyles.profileCardScroll} 
            contentContainerStyle={favoritesScreenStyles.profileCardScrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowScrollTopButton(offsetY > 200);
            }}
            scrollEventThrottle={16}
          >
            {/* Favorite Spots */}
            <View style={favoritesScreenStyles.spotsContainer}>
              <Text style={favoritesScreenStyles.spotsTitle}>Favorite Spots</Text>
              <View style={favoritesScreenStyles.controlsContainer}>
                <View style={favoritesScreenStyles.viewToggleContainer}>
                  <TouchableOpacity
                    style={[
                      favoritesScreenStyles.viewToggleButton,
                      viewMode === 'list' && favoritesScreenStyles.viewToggleButtonActive
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons
                      name="list"
                      size={16}
                      color={viewMode === 'list' ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      favoritesScreenStyles.viewToggleText,
                      viewMode === 'list' && favoritesScreenStyles.viewToggleTextActive
                    ]}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      favoritesScreenStyles.viewToggleButton,
                      viewMode === 'grid' && favoritesScreenStyles.viewToggleButtonActive
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons
                      name="grid"
                      size={16}
                      color={viewMode === 'grid' ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      favoritesScreenStyles.viewToggleText,
                      viewMode === 'grid' && favoritesScreenStyles.viewToggleTextActive
                    ]}>Grid</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {isLoading ? (
                <View style={favoritesScreenStyles.emptyFavoritesContainer}>
                  <Text style={favoritesScreenStyles.emptyFavoritesTitle}>Loading...</Text>
                </View>
              ) : favorites.length === 0 ? (
                <View style={favoritesScreenStyles.emptyFavoritesContainer}>
                  <Text style={favoritesScreenStyles.emptyFavoritesTitle}>No Favorite Spots</Text>
                  <Text style={favoritesScreenStyles.emptyFavoritesMessage}>
                    You have not added any parking spots to your favorites yet.
                  </Text>
                  <Text style={favoritesScreenStyles.emptyFavoritesSubMessage}>
                    Book a parking spot and add it to favorites to see it here.
                  </Text>
                </View>
              ) : (
                <View style={viewMode === 'grid' ? favoritesScreenStyles.gridListContainer : undefined}>
                {favorites.map((favorite, index) => (
                <View
                  key={favorite.favorites_id}
                  style={[
                    favoritesScreenStyles.parkingCard,
                    viewMode === 'grid' && favoritesScreenStyles.parkingCardGrid
                  ]}
                >
                  <View style={favoritesScreenStyles.locationHeader}>
                    <View style={favoritesScreenStyles.locationTextContainer}>
                      <Text style={favoritesScreenStyles.parkingLocation}>{favorite.parking_area_name}</Text>
                      <Text style={favoritesScreenStyles.parkingSpotId}>{favorite.spot_number} ({favorite.spot_type})</Text>
                    </View>
                    <Ionicons 
                      name="location" 
                      size={32} 
                      color={favorite.spot_status === 'free' || favorite.spot_status === 'available' || favorite.spot_status === 'AVAILABLE' ? '#4CAF50' : '#FF4444'} 
                    />
                  </View>
                  <Text style={favoritesScreenStyles.parkingLabel}>Location</Text>
                  <View style={favoritesScreenStyles.timeSlotContainer}>
                    <Text style={favoritesScreenStyles.parkingTime}>{favorite.location}</Text>
                  </View>
                  <View style={favoritesScreenStyles.parkingStatusContainer}>
                    <Text style={[
                      (favorite.spot_status === 'free' || favorite.spot_status === 'available' || favorite.spot_status === 'AVAILABLE') ? favoritesScreenStyles.availableStatus : favoritesScreenStyles.occupiedStatus
                    ]}>
                      {favorite.spot_status.toUpperCase()}
                    </Text>
                    <View style={favoritesScreenStyles.parkingActionsContainer}>
                      <TouchableOpacity 
                        style={favoritesScreenStyles.bookButton}
                        onPress={() => handleBookSpot(favorite)}
                      >
                        <Text style={favoritesScreenStyles.bookButtonText}>{viewMode === 'grid' ? 'BOOK' : 'BOOK NOW'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={favoritesScreenStyles.removeButton}
                        onPress={() => handleRemoveFavorite(favorite.parking_spot_id)}
                      >
                        <SvgXml 
                          xml={isDarkMode ? darkTrashIconSvg : maroonTrashIconSvg}
                          width={20}
                          height={20}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
      {showScrollTopButton && (
        <TouchableOpacity
          style={localStyles.scrollTopButton}
          onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Vehicle Selection Modal */}
      <Modal
        visible={isVehicleSelectionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVehicleSelectionModal}
      >
        <View style={favoritesScreenStyles.modalOverlay}>
          <View style={favoritesScreenStyles.vehicleSelectionModalContainer}>
            <View style={favoritesScreenStyles.vehicleModalHeader}>
              <Text style={favoritesScreenStyles.vehicleModalTitle}>Select Vehicle for Reservation</Text>
              <TouchableOpacity onPress={handleCloseVehicleSelectionModal}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={favoritesScreenStyles.vehicleTypeInfoContainer}>
              <Text style={favoritesScreenStyles.vehicleTypeInfoText}>
                {selectedSpotForBooking 
                  ? `💡 Only vehicles compatible with ${selectedSpotForBooking.spot_type} spots are shown`
                  : '💡 Select a vehicle to book a parking spot'
                }
              </Text>
            </View>
            
            {getCompatibleVehicles().length === 0 ? (
              <View style={favoritesScreenStyles.noCompatibleVehiclesContainer}>
                <Text style={favoritesScreenStyles.noCompatibleVehiclesText}>
                  No vehicles compatible with this parking spot type
                </Text>
                <Text style={favoritesScreenStyles.noCompatibleVehiclesSubtext}>
                  Add a {selectedSpotForBooking?.spot_type || 'compatible'} vehicle to your account
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={favoritesScreenStyles.vehicleSelectionScroll}
                contentContainerStyle={favoritesScreenStyles.vehicleSelectionScrollContent}
                onScroll={handleVehicleScroll}
                scrollEventThrottle={16}
              >
                {getCompatibleVehicles().map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      favoritesScreenStyles.vehicleSelectionCard,
                      selectedVehicle === vehicle.id.toString() && favoritesScreenStyles.vehicleSelectionCardSelected
                    ]}
                    onPress={() => handleSelectVehicle(vehicle.id.toString())}
                  >
                    <View style={favoritesScreenStyles.vehicleSelectionIconContainer}>
                      <SvgXml xml={getVehicleIcon(vehicle.vehicle_type)} width={getResponsiveSize(40)} height={getResponsiveSize(40)} />
                    </View>
                    <Text style={favoritesScreenStyles.vehicleSelectionLabel}>Brand and Model</Text>
                    <Text style={favoritesScreenStyles.vehicleSelectionValue}>{vehicle.brand || 'N/A'}</Text>
                    <Text style={favoritesScreenStyles.vehicleSelectionLabel}>Vehicle Type</Text>
                    <Text style={favoritesScreenStyles.vehicleSelectionValue}>{vehicle.vehicle_type}</Text>
                    {vehicle.plate_number && (
                      <>
                        <Text style={favoritesScreenStyles.vehicleSelectionLabel}>Plate Number</Text>
                        <Text style={favoritesScreenStyles.vehicleSelectionValue}>{vehicle.plate_number}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {/* Progress Indicator */}
            <View style={favoritesScreenStyles.vehicleSelectionProgressContainer}>
              <View style={favoritesScreenStyles.vehicleSelectionProgressTrack}>
                <Animated.View 
                  style={[
                    favoritesScreenStyles.vehicleSelectionProgressHandle,
                    {
                      left: vehicleScrollProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.max(0, (screenWidth * 0.9 - 48) - getResponsiveSize(20))],
                        extrapolate: 'clamp',
                      }),
                    }
                  ]}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[
                favoritesScreenStyles.vehicleSelectionBookNowButton,
                (!selectedVehicle || isBooking || getCompatibleVehicles().length === 0) && favoritesScreenStyles.vehicleSelectionBookNowButtonDisabled
              ]}
              onPress={handleVehicleBookNow}
              disabled={!selectedVehicle || isBooking || getCompatibleVehicles().length === 0}
            >
              <Text style={favoritesScreenStyles.vehicleSelectionBookNowButtonText}>
                {isBooking ? 'Booking...' : 
                 getCompatibleVehicles().length === 0 ? 'No Compatible Vehicles' : 'Book Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vehicle Type Mismatch Modal */}
      <Modal
        visible={showVehicleMismatchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVehicleMismatchModal(false)}
      >
        <View style={favoritesScreenStyles.modalOverlay}>
          <View style={favoritesScreenStyles.mismatchModalContainer}>
            <View style={favoritesScreenStyles.mismatchModalHeader}>
              <Text style={favoritesScreenStyles.mismatchModalTitle}>🚗 Vehicle Type Mismatch</Text>
              <TouchableOpacity onPress={() => setShowVehicleMismatchModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={favoritesScreenStyles.mismatchContent}>
              <Text style={favoritesScreenStyles.mismatchMessage}>
                Oops! There is a mismatch between your vehicle and this parking spot.
              </Text>
              
              <View style={favoritesScreenStyles.mismatchDetails}>
                <View style={favoritesScreenStyles.mismatchItem}>
                  <Text style={favoritesScreenStyles.mismatchLabel}>Your Vehicle:</Text>
                  <Text style={favoritesScreenStyles.mismatchValue}>{mismatchData?.vehicleType || 'Unknown'}</Text>
                </View>
                
                <View style={favoritesScreenStyles.mismatchItem}>
                  <Text style={favoritesScreenStyles.mismatchLabel}>Spot Type:</Text>
                  <Text style={favoritesScreenStyles.mismatchValue}>{mismatchData?.spotType || 'Unknown'}</Text>
                </View>
              </View>
              
              <Text style={favoritesScreenStyles.mismatchSuggestion}>
                💡 Try selecting a different vehicle or choose a different parking spot that matches your vehicle type.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={favoritesScreenStyles.mismatchCloseButton}
              onPress={() => setShowVehicleMismatchModal(false)}
            >
              <Text style={favoritesScreenStyles.mismatchCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles are now in favoritesScreenStyles.ts

export default FavoritesScreen;
