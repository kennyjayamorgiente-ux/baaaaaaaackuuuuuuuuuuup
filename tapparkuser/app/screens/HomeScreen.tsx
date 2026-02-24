// @ts-nocheck
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  Image, 
  Animated, 
  PanResponder, 
  Modal, 
  ActivityIndicator, 
  Alert, 
  StatusBar,
  Pressable,
  Platform,
} from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import SharedHeader from '../../components/SharedHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useDrawer } from '../../contexts/DrawerContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useExpirationModal } from '../../contexts/ExpirationModalContext';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import ApiService from '../../services/api';
import RealtimeService from '../../services/realtime';
import TermsModal from '../../components/TermsModal';
import StepFlowIndicator from '../components/StepFlowIndicator';
import { 
  lineGraphIconSvg, 
  profitIconSvg, 
  checkboxIconSvg,
  doubleUpIconSvg,
  darkLineGraphIconSvg,
  darkProfitIconSvg,
  darkCheckboxIconSvg,
  darkDoubleUpIconSvg,
  whiteCarIconSvg,
  whiteMotorIconSvg,
  whiteEbikeIconSvg
} from '../assets/icons/index2';
import { getHomeScreenStyles } from '../styles/homeScreenStyles';
import { getNormalizedProfileImageFromUser } from '../../utils/profileImage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

export default function HomeScreen() {
  const { user, isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const { toggleDrawer } = useDrawer();
  const { showLoading, hideLoading } = useLoading();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const homeScreenStyles = getHomeScreenStyles(colors);

  // State for terms modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const [hasCheckedTerms, setHasCheckedTerms] = useState(false);
  
  // State for user balance
  const [userBalance, setUserBalance] = useState<number>(0);

  // Set Android navigation bar to black
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#000000');
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/screens/LoginScreen');
    }
  }, [isAuthenticated, isLoading]);

  // Check if user has accepted terms when component loads
  useEffect(() => {
    if (isAuthenticated && user && !hasCheckedTerms) {
      // Check if user has accepted terms
      if (user.terms_accepted === false || user.terms_accepted === undefined) {
        setShowTermsModal(true);
      }
      setHasCheckedTerms(true);
    }
  }, [isAuthenticated, user, hasCheckedTerms]);

  const handleAcceptTerms = async () => {
    try {
      setIsAcceptingTerms(true);
      const response = await ApiService.acceptTerms();
      
      if (response.success) {
        // Update user in context
        await checkAuthStatus();
        
        // Close modal
        setShowTermsModal(false);
        setIsAcceptingTerms(false);
      } else {
        Alert.alert('Error', 'Failed to accept terms. Please try again.');
        setIsAcceptingTerms(false);
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to accept terms. Please try again.');
      setIsAcceptingTerms(false);
    }
  };

  // Helper function to format decimal hours to HH.MM format (e.g., 83.5 -> "83.30")
  const formatHoursToHHMM = (decimalHours: number): string => {
    if (!decimalHours || decimalHours === 0) return '0.00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    try {
      const balanceResponse = await ApiService.getSubscriptionBalance();
      if (balanceResponse.success) {
        const balance = balanceResponse.data.total_hours_remaining || 0;
        setUserBalance(balance);
        console.log('🎯 HomeScreen: Balance fetched:', balance, 'hours');
      }
    } catch (error) {
      console.error('🎯 HomeScreen: Error fetching user balance:', error);
    }
  };

  // Fetch balance when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserBalance();
    }
  }, [isAuthenticated, user]);

  // Profile picture component
  const ProfilePicture = ({ size = 32 }: { size?: number }) => {
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
        <View style={[styles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
          <ExpoImage
            source={{ uri: profileImageUrl }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={({ error }) => {
              console.warn('⚠️ Failed to load profile image (HomeScreen):', profileImageUrl, error);
            }}
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[styles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.profileInitials, { fontSize: size * 0.4 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const vehicleScrollProgress = useRef(new Animated.Value(0)).current;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isVehicleSelectionModalVisible, setIsVehicleSelectionModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [assignedSlot, setAssignedSlot] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [parkingAreas, setParkingAreas] = useState<any[]>([]);
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);
  const [isLoadingParkingAreas, setIsLoadingParkingAreas] = useState(false);
  const [isLoadingParkingSpots, setIsLoadingParkingSpots] = useState(false);
  const [selectedVehicleForParking, setSelectedVehicleForParking] = useState<any>(null);
  const [selectedParkingArea, setSelectedParkingArea] = useState<any>(null);
  const [assignedSpotDetails, setAssignedSpotDetails] = useState<any>(null);
  const [frequentSpots, setFrequentSpots] = useState<any[]>([]);
  const [isLoadingFrequentSpots, setIsLoadingFrequentSpots] = useState(false);
  const [selectedSpotForBooking, setSelectedSpotForBooking] = useState<any>(null);
  const [showVehicleMismatchModal, setShowVehicleMismatchModal] = useState(false);
  const [mismatchData, setMismatchData] = useState<any>(null);

  // State for insufficient balance modal
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [insufficientBalanceMessage, setInsufficientBalanceMessage] = useState<string>('');

  const [canScrollVehicles, setCanScrollVehicles] = useState(false);
  const vehicleScrollViewWidth = useRef(0);
  const vehicleContentWidth = useRef(0);
  const [canScrollFrequentSpots, setCanScrollFrequentSpots] = useState(false);
  const frequentSpotsScrollViewWidth = useRef(0);
  const frequentSpotsContentWidth = useRef(0);
  const [isParkingSpotsModalVisible, setIsParkingSpotsModalVisible] = useState(false);
  const [selectedAreaForSpots, setSelectedAreaForSpots] = useState<any>(null);
  const [isFrequentSpotsModalVisible, setIsFrequentSpotsModalVisible] = useState(false);
  const [frequentSpotsForModal, setFrequentSpotsForModal] = useState<any[]>([]);
  const [isLoadingFrequentSpotsModal, setIsLoadingFrequentSpotsModal] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoadingSvg, setIsLoadingSvg] = useState(false);
  const [svgAspectRatio, setSvgAspectRatio] = useState<number>(3.5); // Fixed standard aspect ratio for all layouts (wide landscape)
  
  // Use global expiration modal context
  const { checkPendingReservationExpiration } = useExpirationModal();
  
  // Booking flow step tracking
  const [currentBookingStep, setCurrentBookingStep] = useState(0);
  const bookingSteps = ['Select Vehicle', 'Choose Area', 'Book Slot'];

  // Group parking areas by location
  const groupParkingAreasByLocation = (areas: any[]) => {
    const grouped: { [key: string]: any[] } = {
      'FPA': [],
      'Main Campus': []
    };
    
    areas.forEach(area => {
      // Check if area name contains FPA or Main Campus indicators
      const areaName = (area.name || '').toLowerCase();
      const areaLocation = (area.location || area.address || area.location_name || '').toLowerCase();
      
      if (areaName.includes('fpa') || areaLocation.includes('fpa')) {
        grouped['FPA'].push(area);
      } else {
        // Default to Main Campus for all other areas
        grouped['Main Campus'].push(area);
      }
    });
    
    // Remove empty sections
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });
    
    return grouped;
  };
  const svgDimensions = useMemo(() => {
    let svgWidth: number;
    let svgHeight: number;

    // Large sizing for HomeScreen - bigger than ActiveParkingScreen
    if (isSmallScreen) {
      svgWidth = 1200; // Larger than ActiveParkingScreen (900)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isMediumScreen) {
      svgWidth = 1400; // Larger than ActiveParkingScreen (1000)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isLargeScreen) {
      svgWidth = 1600; // Larger than ActiveParkingScreen (1100)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isTablet) {
      svgWidth = 2000; // Larger than ActiveParkingScreen (1600)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isLargeTablet) {
      svgWidth = 2200; // Larger than ActiveParkingScreen (1800)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else {
      svgWidth = 1600; // Larger than ActiveParkingScreen (1100)
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    }

    console.log(`📐 HomeScreen SVG Dimensions: ${svgWidth}x${svgHeight} (large size)`);

    return { width: svgWidth, height: svgHeight };
  }, []); // No dependencies needed

  const layoutScale = 1.0;
  const layoutScrollViewRef = useRef<ScrollView>(null);
  const layoutVerticalScrollViewRef = useRef<ScrollView>(null);
  const [clickableSpots, setClickableSpots] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    spotNumber?: string;
    spotId?: string;
  }>>([]);
  const [spotStatuses, setSpotStatuses] = useState<Map<string, {
    id: number;
    spot_number: string;
    status: string;
    spot_type: string;
    section_name?: string;
    is_user_booked: number | boolean;
    totalCapacity?: number;
    availableCapacity?: number;
    utilizationRate?: number;
  }>>(new Map());
  
  // Capacity sections data from database
  const [capacitySections, setCapacitySections] = useState<Array<{
    sectionId: number;
    sectionName: string;
    vehicleType: string;
    totalCapacity: number;
    availableCapacity: number;
    parkedCount?: number;
    reservedCount?: number;
    totalUsed?: number;
    utilizationRate?: string;
  }>>([]);

  useFocusEffect(
    React.useCallback(() => {
      checkPendingReservationExpiration();
    }, [checkPendingReservationExpiration])
  );

  const handleAddVehicle = () => {
    router.push('/screens/AddVehicleScreen');
  };

  // Fetch user vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!isAuthenticated) {
        setIsLoadingVehicles(false);
        return;
      }
      try {
        setIsLoadingVehicles(true);
        const response = await ApiService.getVehicles();
        console.log('🚗 Vehicles API response:', response);
        if (response.success && response.data?.vehicles) {
          console.log('🚗 Vehicles data:', response.data.vehicles);
          setVehicles(response.data.vehicles);
          setUserVehicles(response.data.vehicles);
        } else {
          console.log('❌ Failed to load vehicles');
          Alert.alert('Error', 'Failed to load vehicles');
          setVehicles([]);
          setUserVehicles([]);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        Alert.alert('Error', 'Failed to load vehicles');
        setVehicles([]);
        setUserVehicles([]);
      } finally {
        setIsLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, [isAuthenticated]);

  // Fetch parking areas on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchParkingAreas();
    }
  }, [isAuthenticated]);

  // Fetch frequently used parking spots
  useEffect(() => {
    const fetchFrequentSpots = async () => {
      if (!isAuthenticated) {
        setIsLoadingFrequentSpots(false);
        return;
      }
      
      try {
        setIsLoadingFrequentSpots(true);
        const response = await ApiService.getFrequentSpots(5);
        if (response.success && response.data?.frequent_spots) {
          setFrequentSpots(response.data.frequent_spots);
        } else {
          console.log('❌ Failed to load frequent spots');
          Alert.alert('Error', 'Failed to load frequent spots');
          setFrequentSpots([]);
        }
    } catch (error) {
        console.error('Error fetching frequent spots:', error);
        Alert.alert('Error', 'Failed to load frequent spots');
        setFrequentSpots([]);
    } finally {
        setIsLoadingFrequentSpots(false);
    }
  };

    fetchFrequentSpots();
  }, [isAuthenticated]);


  // Reset scroll state when vehicles change
  useEffect(() => {
    setCanScrollVehicles(false);
  }, [vehicles.length]);

  // Reset scroll state when frequent spots change
  useEffect(() => {
    setCanScrollFrequentSpots(false);
  }, [frequentSpots.length]);

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
      return userVehicles || []; // Show all vehicles if no specific spot selected
    }

    const spotType = selectedSpotForBooking.spot_type?.toLowerCase();
    if (!spotType) {
      return userVehicles || []; // Show all if spot type is unknown
    }

    return (userVehicles || []).filter(vehicle => {
      const vehicleType = vehicle.vehicle_type.toLowerCase();
      
      // Map vehicle types to spot types for compatibility
      let expectedSpotType = vehicleType;
      if (vehicleType === 'bicycle' || vehicleType === 'ebike') {
        expectedSpotType = 'bike';
      }
      
      return expectedSpotType === spotType;
    });
  };

  // Get landmark icon color based on availability status
  const getLandmarkIconColor = (availableSpots?: number, totalSpots?: number, status?: string) => {
    // If status is provided (for individual spots)
    if (status) {
      if (status.toLowerCase() === 'available') return '#4CAF50'; // Green
      if (status.toLowerCase() === 'occupied') return '#FF4444'; // Red
      if (status.toLowerCase() === 'reserved') return '#FFA500'; // Orange
      return '#9CA3AF'; // Gray default
    }
    
    // If availableSpots is provided (for parking areas)
    if (availableSpots !== undefined && totalSpots !== undefined) {
      const availabilityRatio = availableSpots / totalSpots;
      if (availabilityRatio > 0.5) return '#4CAF50'; // Green - more than 50% available
      if (availabilityRatio > 0.2) return '#FFA500'; // Orange - 20-50% available
      if (availabilityRatio > 0) return '#FF9800'; // Dark Orange - less than 20% available
      return '#FF4444'; // Red - no spots available
    }
    
    return '#9CA3AF'; // Gray default
  };

  const getAreaSpotsText = (area: any) => {
    const available = Number.isFinite(Number(area?.available_spots)) ? Number(area.available_spots) : 0;
    const total = Number.isFinite(Number(area?.total_spots)) ? Number(area.total_spots) : 0;
    return `${available} / ${total} spots available`;
  };

  const getAreaCapacityText = (area: any) => {
    const availableCapacity = Number.isFinite(Number(area?.capacity_available_spots))
      ? Number(area.capacity_available_spots)
      : 0;
    const totalCapacity = Number.isFinite(Number(area?.capacity_total_spots))
      ? Number(area.capacity_total_spots)
      : 0;

    if (totalCapacity <= 0) return null;
    return `Motorcycle/Bike: ${availableCapacity} / ${totalCapacity} spots available`;
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Generate spot ID from location and spot number
  const generateSpotId = (locationName: string, spotNumber: string) => {
    const prefix = locationName.toLowerCase().includes('fpa') ? 'FPL' : 'FMC';
    const safeSpotNumber = spotNumber || '000'; // Default to '000' if spotNumber is null/undefined
    return `${prefix}-${safeSpotNumber.padStart(3, '0')}`;
  };

  // Fetch parking areas
  const fetchParkingAreas = async () => {
    try {
      setIsLoadingParkingAreas(true);
        const response = await ApiService.getParkingAreas();
      if (response.success && response.data?.locations) {
        setParkingAreas(response.data.locations);
      } else {
        console.log('❌ Failed to load parking areas');
        Alert.alert('Error', 'Failed to load parking areas');
        setParkingAreas([]);
      }
    } catch (error) {
      console.error('Error fetching parking areas:', error);
      Alert.alert('Error', 'Failed to load parking areas');
      setParkingAreas([]);
    } finally {
      setIsLoadingParkingAreas(false);
    }
  };

  // Fetch parking spots for selected area
  const fetchParkingSpots = async (areaId: number, vehicleType?: string) => {
    try {
      setIsLoadingParkingSpots(true);
      const response = await ApiService.getParkingSpots(areaId, vehicleType);
      if (response.success) {
        setParkingSpots(response.data.spots);
      } else {
        console.log('❌ Failed to load parking spots');
        Alert.alert('Error', 'Failed to load parking spots');
        setParkingSpots([]);
      }
    } catch (error) {
      console.error('Error fetching parking spots:', error);
      Alert.alert('Error', 'Failed to load parking spots');
      setParkingSpots([]);
    } finally {
      setIsLoadingParkingSpots(false);
    }
  };

  // Handle vehicle card press - show parking areas
  const handleVehicleCardPress = (vehicle: any) => {
    setSelectedVehicleForParking(vehicle);
    setCurrentBookingStep(1); // Set to step 1 (Choose Area)
    fetchParkingAreas();
    setIsModalVisible(true);
  };

  // Handle parking area selection - just select the area
  const handleParkingAreaSelect = async (area: any) => {
    setSelectedParkingArea(area);
    setIsModalVisible(false);
    
    // Check if a vehicle is already selected
    if (!selectedVehicleForParking) {
      Alert.alert('No Vehicle Selected', 'Please select a vehicle from your registered vehicles first.');
      return;
    }
    
    try {
      setIsLoadingParkingSpots(true);
      
      // Skip booking check for attendants - they don't make bookings
      if (user?.account_type_name !== 'Attendant') {
        // Check for current booking (reserved or active) first
        const currentBookingResponse = await ApiService.getMyBookings();
        if (currentBookingResponse.success && currentBookingResponse.data.bookings.length > 0) {
          const activeBooking = currentBookingResponse.data.bookings.find(
            (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
          );
          if (activeBooking) {
            const currentBooking = activeBooking;
            const statusText = currentBooking.bookingStatus === 'reserved' ? 'reserved' : 'active';
            Alert.alert(
              'Current Booking',
              `You already have a ${statusText} booking at ${currentBooking.parkingArea?.name || 'Unknown Location'} (Spot ${currentBooking.parkingSlot?.spotNumber || 'Unknown'}).\n\nPlease complete or cancel your current booking before making a new one.`,
              [
                { text: 'OK', style: 'default' }
              ]
            );
            setIsLoadingParkingSpots(false);
            return;
          }
        }
      }
      
      // Get all spots in the area, then filter by vehicle type
      const vehicleType = selectedVehicleForParking.vehicle_type;
      console.log('🚗 Using selected vehicle type:', vehicleType);
      
      const response = await ApiService.getParkingSpots(area.id, vehicleType);
      if (response.success && response.data.spots.length > 0) {
        // Automatically select the first available spot
        const assignedSpot = response.data.spots[0];
        setAssignedSlot(assignedSpot.spot_number);
        setAssignedSpotDetails(assignedSpot);
        setCurrentBookingStep(2); // Set to step 2 (Book Slot)
        setIsBookingModalVisible(true);
      } else {
        const vehicleTypeName = vehicleType ? `${vehicleType} ` : '';
        Alert.alert(
          'No Spots Available', 
          `No ${vehicleTypeName}parking spots are currently available in this area. Please try another area.`
        );
      }
    } catch (error) {
      console.error('Error fetching parking spots:', error);
      Alert.alert('Error', 'Failed to load parking spots');
    } finally {
      setIsLoadingParkingSpots(false);
    }
  };

  // Handle parking spot booking
  const handleBookParkingSpot = async (spot: any) => {
    try {
      // Skip booking check for attendants
      if (user?.account_type_name !== 'Attendant') {
        // Double-check for current booking before booking
        const currentBookingResponse = await ApiService.getMyBookings();
        if (currentBookingResponse.success && currentBookingResponse.data.bookings.length > 0) {
          const activeBooking = currentBookingResponse.data.bookings.find(
            (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
          );
          if (activeBooking) {
            const currentBooking = activeBooking;
            const statusText = currentBooking.bookingStatus === 'reserved' ? 'reserved' : 'active';
            Alert.alert(
              'Current Booking',
              `You already have a ${statusText} booking at ${currentBooking.parkingArea?.name || 'Unknown Location'} (Spot ${currentBooking.parkingSlot?.spotNumber || 'Unknown'}).\n\nPlease complete or cancel your current booking before making a new one.`,
              [
                { text: 'OK', style: 'default' }
              ]
            );
            setIsBookingModalVisible(false);
            return;
          }
        }
      }
      
      const response = await ApiService.bookParkingSpot(
        selectedVehicleForParking.id,
        spot.id,
        selectedParkingArea.id
      );
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Parking spot booked successfully!',
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
                        reservationId: response.data.reservationId,
                        sessionId: response.data.reservationId
                      }
                    });
                    setTimeout(() => hideLoading(), 500);
                    setIsBookingModalVisible(false);
                    setSelectedVehicleForParking(null);
                    setSelectedParkingArea(null);
                    setParkingSpots([]);
                  }, 150);
                });
              }
            }
          ]
        );
        setIsBookingModalVisible(false);
        setSelectedVehicleForParking(null);
        setSelectedParkingArea(null);
        setParkingSpots([]);
      } else {
        // Check if it's a vehicle type mismatch
        if ((response.data as any)?.errorCode === 'VEHICLE_TYPE_MISMATCH') {
          setMismatchData((response.data as any).data);
          setShowVehicleMismatchModal(true);
        } else if ((response.data as any)?.errorCode === 'INSUFFICIENT_BALANCE') {
          setInsufficientBalanceMessage((response.data as any)?.message || 'You have no remaining subscription hours. Please purchase a plan before reserving a spot.');
          setShowInsufficientBalanceModal(true);
        } else {
          Alert.alert('Booking Failed', response.data?.message || 'Failed to book parking spot');
        }
      }
    } catch (error: any) {
      // Check if it's an insufficient balance error
      if (error.message && (
        error.message.includes('You have no remaining subscription hours') ||
        error.message.includes('Please purchase a plan') ||
        error.message.includes('insufficient balance')
      )) {
        setIsBookingModalVisible(false);
        setIsModalVisible(false);
        setIsVehicleSelectionModalVisible(false);
        setInsufficientBalanceMessage(error.message);
        setShowInsufficientBalanceModal(true);
      } else {
        Alert.alert('Booking Failed', 'Failed to book parking spot');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setCurrentBookingStep(0); // Reset to step 0
  };

  const handleSelectParkingArea = (area: string) => {
    setIsModalVisible(false);
    setSelectedArea(area);
    
    // Generate a random parking slot ID based on the area
    if (area === 'fpa') {
      setAssignedSlot('FPA-A-042');
    } else if (area === 'maincampus') {
      setAssignedSlot('MC-B-100');
    }
    
    // Show the booking modal after a short delay
    setTimeout(() => {
      setIsBookingModalVisible(true);
    }, 300);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalVisible(false);
    setSelectedArea('');
    setAssignedSlot('');
    setSelectedVehicleForParking(null);
    setSelectedParkingArea(null);
    setAssignedSpotDetails(null);
    setCurrentBookingStep(0); // Reset to step 0
  };

  const handleBookNow = async () => {
    console.log('🎯 handleBookNow called');
    console.log('🎯 assignedSpotDetails:', assignedSpotDetails);
    console.log('🎯 selectedVehicleForParking:', selectedVehicleForParking);
    console.log('🎯 selectedParkingArea:', selectedParkingArea);
    
    if (!assignedSpotDetails || !selectedVehicleForParking || !selectedParkingArea) {
      console.log('❌ Missing booking information');
      Alert.alert('Error', 'Missing booking information');
      return;
    }

    try {
      console.log('🚀 Calling ApiService.bookParkingSpot with:', {
        vehicleId: selectedVehicleForParking.id,
        spotId: assignedSpotDetails.id,
        areaId: selectedParkingArea.id
      });
      
      const response = await ApiService.bookParkingSpot(
        selectedVehicleForParking.id,
        assignedSpotDetails.id,
        selectedParkingArea.id
      );
      
      console.log('🎯 Booking response:', response);
      
      if (response.success) {
        const bookingDetails = response.data.bookingDetails;
        Alert.alert(
          'Success',
          'Parking spot booked successfully!',
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
                        sessionId: bookingDetails.reservationId,
                        vehicleId: selectedVehicleForParking.id,
                        vehiclePlate: bookingDetails.vehiclePlate,
                        vehicleType: bookingDetails.vehicleType,
                        vehicleBrand: bookingDetails.vehicleBrand,
                        areaName: bookingDetails.areaName,
                        areaLocation: bookingDetails.areaLocation,
                        spotNumber: bookingDetails.spotNumber,
                        spotType: bookingDetails.spotType,
                        startTime: bookingDetails.startTime,
                        status: bookingDetails.status
                      }
                    });
                    setTimeout(() => hideLoading(), 500);
                    setIsBookingModalVisible(false);
                    setSelectedVehicleForParking(null);
                    setSelectedParkingArea(null);
                    setAssignedSpotDetails(null);
                    setAssignedSlot('');
                  }, 150);
                });
              }
            }
          ]
        );
      } else {
        // Check if it's a vehicle type mismatch
        if ((response.data as any)?.errorCode === 'VEHICLE_TYPE_MISMATCH') {
          setMismatchData((response.data as any).data);
          setShowVehicleMismatchModal(true);
        } else if ((response.data as any)?.errorCode === 'INSUFFICIENT_BALANCE') {
          setIsBookingModalVisible(false);
          setIsModalVisible(false);
          setIsVehicleSelectionModalVisible(false);
          setInsufficientBalanceMessage((response.data as any)?.message || 'You have no remaining subscription hours. Please purchase a plan before reserving a spot.');
          setShowInsufficientBalanceModal(true);
        } else {
          Alert.alert('Booking Failed', response.data?.message || 'Failed to book parking spot');
        }
      }
    } catch (error: any) {
      // Check if it's an insufficient balance error
      if (error.message && (
        error.message.includes('You have no remaining subscription hours') ||
        error.message.includes('Please purchase a plan') ||
        error.message.includes('insufficient balance')
      )) {
        setIsBookingModalVisible(false);
        setIsModalVisible(false);
        setIsVehicleSelectionModalVisible(false);
        setInsufficientBalanceMessage(error.message);
        setShowInsufficientBalanceModal(true);
      } else if (error?.message?.includes('no longer available') || 
                 error?.message?.includes('not available') ||
                 error?.message?.includes('SPOT_UNAVAILABLE')) {
        // Automatically fetch a new available spot without asking user
        if (selectedParkingArea) {
          try {
            setIsLoadingParkingSpots(true);
            const response = await ApiService.getParkingSpots(selectedParkingArea.id, selectedVehicleForParking?.vehicle_type);
            if (response.success && response.data.spots.length > 0) {
              setParkingSpots(response.data.spots);
              // Auto-select the first available spot and show booking modal
              const newSpot = response.data.spots[0];
              setAssignedSlot(newSpot.spot_number);
              setAssignedSpotDetails(newSpot);
              setIsBookingModalVisible(true);
              
              // Show a brief notification that a new spot was found
              Alert.alert(
                'New Spot Assigned',
                `Previous spot was already reserved. Spot ${newSpot.spot_number} is now available for booking.`,
                [{ text: 'OK', style: 'default' }]
              );
            } else {
              Alert.alert(
                'No Spots Available',
                'No parking spots are currently available in this area. Please try another area.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          } catch (refetchError) {
            Alert.alert(
              'Failed to Update',
              'Could not fetch updated parking spots. Please try again.',
              [{ text: 'OK', style: 'default' }]
            );
          } finally {
            setIsLoadingParkingSpots(false);
          }
        }
      } else {
        Alert.alert('Booking Failed', 'Failed to book parking spot');
      }
    }
  };

  const handleBookParking = (area: any) => {
    setSelectedParkingArea(area);
    setIsVehicleSelectionModalVisible(true);
  };

  const handleBookFrequentSpot = async (spot: any) => {
    console.log('🎯 handleBookFrequentSpot called with spot:', spot);
    
    // Check if this is a capacity section
    // Capacity sections have parking_spot_id = 0 or null
    const isCapacitySection = !spot.parking_spot_id || spot.parking_spot_id === 0;
    
    if (isCapacitySection) {
      console.log('🏍️ Capacity section detected, implementing capacity booking flow:', spot);
      
      // For capacity sections, we need to get the section_id first
      try {
        showLoading('Loading section details...');
        
        // Get capacity sections for this area
        const capacityResponse = await ApiService.getCapacityStatus(spot.parking_area_id);
        hideLoading();
        
        if (!capacityResponse.success) {
          Alert.alert('Error', 'Failed to load section details');
          return;
        }
        
        // Find the matching section by section_name
        const matchingSection = capacityResponse.data.find(
          (section: any) => section.sectionName === spot.section_name
        );
        
        if (!matchingSection) {
          Alert.alert('Error', `Could not find section ${spot.section_name}`);
          return;
        }
        
        // Check if section has available capacity
        if (matchingSection.availableCapacity <= 0) {
          Alert.alert(
            'Section Full',
            `Section ${spot.section_name} is currently at full capacity. Please try another section.`,
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
        
        // Store section info for booking
        setSelectedSpotForBooking({
          ...spot,
          sectionId: matchingSection.sectionId,
          isCapacitySection: true
        });
        
        // Show vehicle selection modal for capacity booking
        setIsVehicleSelectionModalVisible(true);
        return;
      } catch (error) {
        hideLoading();
        console.error('Error loading capacity section:', error);
        Alert.alert('Error', 'Failed to load section details');
        return;
      }
    }
    
    // Store the selected spot for booking
    setSelectedSpotForBooking(spot);
    console.log('✅ selectedSpotForBooking set to:', spot);
    
    try {
      let areasToSearch = parkingAreas;
      
      // Load parking areas if not already loaded
      if (!parkingAreas || parkingAreas.length === 0) {
        console.log('🔄 Loading parking areas for frequent spot booking');
        const response = await ApiService.getParkingAreas();
        if (response.success && response.data?.locations) {
          areasToSearch = response.data.locations;
          setParkingAreas(response.data.locations);
        } else {
          Alert.alert('Error', 'Failed to load parking areas');
          return;
        }
      }
      
      // Find the parking area by location name
      const area = (areasToSearch || []).find(area => 
        area.name.toLowerCase().includes(spot.location_name.toLowerCase()) ||
        spot.location_name.toLowerCase().includes(area.name.toLowerCase())
      );
      
      console.log('🔍 Found parking area:', area);
      console.log('🔍 Available parking areas:', areasToSearch);
      console.log('🔍 Spot location_name:', spot.location_name);
      
      if (area) {
        setSelectedParkingArea(area);
        console.log('✅ selectedParkingArea set to:', area);
      } else {
        console.warn('⚠️ Could not find parking area, but proceeding with spot data');
        // Try to use spot data directly if area not found
        if (spot.parking_area_id) {
          console.log('📌 Using parking_area_id from spot:', spot.parking_area_id);
          // Create a minimal area object from spot data
          setSelectedParkingArea({
            id: spot.parking_area_id,
            name: spot.location_name || 'Unknown Area',
            location: spot.location_name || ''
          });
        }
      }
      
      // Show vehicle selection modal directly (even if area not found, we can still show vehicles)
      console.log('🚀 Setting isVehicleSelectionModalVisible to true');
      setIsVehicleSelectionModalVisible(true);
      console.log('✅ Modal should now be visible');
    } catch (error) {
      console.error('Error in handleBookFrequentSpot:', error);
      Alert.alert('Error', 'Failed to load parking areas');
    }
  };

  const handleCloseVehicleSelectionModal = () => {
    setIsVehicleSelectionModalVisible(false);
    setSelectedVehicle('');
    setCurrentBookingStep(0); // Reset to step 0
    // Don't clear selectedSpotForBooking here - it might be needed for retry
    // Only clear it after successful booking or when explicitly needed
  };

  // Handlers for direct booking flow

  const handleVehicleSelectedForSpot = async (vehicleId: string) => {
    const selectedVehicle = userVehicles.find(v => v.id.toString() === vehicleId);
    if (!selectedVehicle || !selectedSpotForBooking) return;

    setSelectedVehicleForParking(selectedVehicle);
    setIsVehicleSelectionModalVisible(false);
    
    // Directly book the specific favorite spot
    await handleDirectSpotBooking(selectedVehicle, selectedSpotForBooking);
  };

  const handleDirectSpotBooking = async (vehicle: any, spot: any) => {
    console.log('🎯 handleDirectSpotBooking called with:', { vehicle, spot });
    try {
      // Check spot availability first - don't attempt booking if spot is occupied/reserved
      const spotStatus = spot.spot_status || spot.status;
      
      // Check if spot status is not available
      if (spotStatus && spotStatus !== 'available' && spotStatus !== 'AVAILABLE') {
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
      
      // Check for current booking first
      const currentBookingResponse = await ApiService.getMyBookings();
      console.log('🔍 My bookings response:', JSON.stringify(currentBookingResponse, null, 2));
      console.log('🔍 Found bookings:', currentBookingResponse.data?.bookings?.length || 0);
      
      if (currentBookingResponse.success && currentBookingResponse.data.bookings.length > 0) {
        const activeBooking = currentBookingResponse.data.bookings.find(
          (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
        );
        console.log('🔍 Active booking found:', activeBooking);
        if (activeBooking) {
          const statusText = activeBooking.bookingStatus === 'reserved' ? 'reserved' : 'active';
          Alert.alert(
            'Current Booking',
            `You already have a ${statusText} booking at ${activeBooking.parkingArea?.name || 'Unknown Location'} (Spot ${activeBooking.parkingSlot?.spotNumber || 'Unknown'}).\n\nPlease complete or cancel your current booking before making a new one.`,
            [
              { text: 'OK', style: 'default' }
            ]
          );
          return;
        }
      }

      // Get areaId from spot data or selectedParkingArea
      // For frequent spots, the areaId should be in spot.parking_area_id
      // For regular booking, it's in selectedParkingArea.id
      const areaId = spot.parking_area_id || selectedParkingArea?.id;
      
      if (!areaId) {
        console.error('❌ Missing areaId for booking:', { spot, selectedParkingArea });
        Alert.alert('Error', 'Parking area information is missing. Please try again.');
        return;
      }
      
      // Check if this is a capacity section (motorcycle/bicycle section)
      const isCapacitySection = spot.isCapacitySection || (!spot.parking_spot_id || spot.parking_spot_id === 0);
      
      if (isCapacitySection) {
        console.log('🏍️ Booking capacity section:', spot);
        
        // Verify we have sectionId
        if (!spot.sectionId) {
          console.error('❌ Missing sectionId for capacity booking:', spot);
          Alert.alert('Error', 'Section information is missing. Please try again.');
          return;
        }
        
        console.log('🚀 Calling ApiService.reserveCapacity with sectionId:', spot.sectionId);
        
        const response = await ApiService.reserveCapacity(spot.sectionId, {
          vehicleId: vehicle.id,
          spotNumber: spot.spot_number || spot.spotNumber || spot.section_name,
          areaId,
        });
        
        console.log('🎯 Capacity booking response:', JSON.stringify(response, null, 2));
        
        if (response.success) {
          const bookingDetails = response.data?.bookingDetails;
          Alert.alert(
            'Success',
            `Section ${bookingDetails?.sectionName || spot.section_name || spot.spot_number} booked successfully!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      router.push({
                        pathname: '/screens/ActiveParkingScreen',
                        params: {
                          capacityReservationId: response.data?.reservationId?.toString() ?? '',
                          isCapacitySection: 'true',
                          sectionId: spot.sectionId?.toString() ?? '',
                          sectionName: bookingDetails?.sectionName || spot.section_name || spot.spot_number,
                          vehiclePlate: bookingDetails?.vehiclePlate || vehicle?.plate_number || '',
                          vehicleType: bookingDetails?.vehicleType || vehicle?.vehicle_type || '',
                          vehicleBrand: bookingDetails?.vehicleBrand || vehicle?.brand || '',
                          vehicleColor: vehicle?.color ?? '',
                          areaName: bookingDetails?.areaName || selectedParkingArea?.name || spot.location_name || '',
                          areaLocation: bookingDetails?.areaLocation || selectedParkingArea?.location || spot.location_address || ''
                        }
                      });
                      setSelectedSpotForBooking(null);
                      setSelectedVehicleForParking(null);
                      setSelectedParkingArea(null);
                    }, 200);
                  });
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', response.message || 'Failed to book section');
        }
        return;
      }
      
      console.log('🚀 Calling ApiService.bookParkingSpot with:', {
        vehicleId: vehicle.id,
        spotId: spot.parking_spot_id,
        areaId: areaId
      });
      
      const response = await ApiService.bookParkingSpot(
        vehicle.id,
        spot.parking_spot_id,
        areaId
      );
      
      console.log('🎯 Booking response:', JSON.stringify(response, null, 2));
      console.log('🎯 Booking status:', response.data?.bookingDetails?.status);
      console.log('🎯 Reservation ID:', response.data?.reservationId);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Parking spot booked successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to ActiveParkingScreen with complete booking details
                console.log('🚀 Navigating to ActiveParkingScreen with params:', {
                  sessionId: response.data.reservationId,
                  vehicleId: vehicle.id,
                  vehiclePlate: response.data.bookingDetails.vehiclePlate,
                  vehicleType: response.data.bookingDetails.vehicleType,
                  vehicleBrand: response.data.bookingDetails.vehicleBrand,
                  areaName: response.data.bookingDetails.areaName,
                  areaLocation: response.data.bookingDetails.areaLocation,
                  spotNumber: response.data.bookingDetails.spotNumber,
                  spotType: response.data.bookingDetails.spotType,
                  startTime: response.data.bookingDetails.startTime,
                  status: response.data.bookingDetails.status
                });
                
                // Allow Alert to dismiss first, then navigate smoothly
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    // Simple navigation without loading overlay to avoid conflicts
                    router.push({
                      pathname: '/screens/ActiveParkingScreen',
                      params: {
                        sessionId: response.data.reservationId,
                        vehicleId: vehicle.id,
                        vehiclePlate: response.data.bookingDetails.vehiclePlate,
                        vehicleType: response.data.bookingDetails.vehicleType,
                        vehicleBrand: response.data.bookingDetails.vehicleBrand,
                        areaName: response.data.bookingDetails.areaName,
                        areaLocation: response.data.bookingDetails.areaLocation,
                        spotNumber: response.data.bookingDetails.spotNumber,
                        spotType: response.data.bookingDetails.spotType,
                        startTime: response.data.bookingDetails.startTime,
                        status: response.data.bookingDetails.status
                      }
                    });
                    // Reset all states
                    setSelectedSpotForBooking(null);
                    setSelectedVehicleForParking(null);
                    setSelectedParkingArea(null);
                  }, 200); // Short delay for alert dismissal
                });
              }
            }
          ]
        );
      } else {
        // Check if it's a vehicle type mismatch
        if ((response.data as any)?.errorCode === 'VEHICLE_TYPE_MISMATCH') {
          setMismatchData((response.data as any).data);
          setShowVehicleMismatchModal(true);
        } else if ((response.data as any)?.errorCode === 'INSUFFICIENT_BALANCE') {
          setInsufficientBalanceMessage((response.data as any)?.message || 'You have no remaining subscription hours. Please purchase a plan before reserving a spot.');
          setShowInsufficientBalanceModal(true);
        } else if ((response.data as any)?.errorCode === 'SPOT_UNAVAILABLE' || 
                   (response.data as any)?.message?.includes('no longer available') ||
                   (response.data as any)?.message?.includes('not available')) {
          Alert.alert(
            'Spot Not Available',
            'This parking spot is no longer available. It may have been booked by another user. Please try a different spot.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Booking Failed', response.data?.message || 'Failed to book parking spot');
        }
      }
    } catch (error: any) {
      // Check if error is about spot not being available
      if (error?.message?.includes('no longer available') || 
          error?.message?.includes('not available') ||
          error?.message?.includes('SPOT_UNAVAILABLE')) {
        // Automatically fetch a new available spot without asking user
        if (selectedParkingArea) {
          try {
            setIsLoadingParkingSpots(true);
            const response = await ApiService.getParkingSpots(selectedParkingArea.id, selectedVehicleForParking?.vehicle_type);
            if (response.success && response.data.spots.length > 0) {
              setParkingSpots(response.data.spots);
              // Auto-select the first available spot and show booking modal
              const newSpot = response.data.spots[0];
              setAssignedSlot(newSpot.spot_number);
              setAssignedSpotDetails(newSpot);
              setIsBookingModalVisible(true);
              
              // Show a brief notification that a new spot was found
              Alert.alert(
                'New Spot Assigned',
                `Previous spot was already reserved. Spot ${newSpot.spot_number} is now available for booking.`,
                [{ text: 'OK', style: 'default' }]
              );
            } else {
              Alert.alert(
                'No Spots Available',
                'No parking spots are currently available in this area. Please try another area.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          } catch (refetchError) {
            Alert.alert(
              'Failed to Update',
              'Could not fetch updated parking spots. Please try again.',
              [{ text: 'OK', style: 'default' }]
            );
          } finally {
            setIsLoadingParkingSpots(false);
          }
        }
      } else if (error.message && (
        error.message.includes('You have no remaining subscription hours') ||
        error.message.includes('Please purchase a plan') ||
        error.message.includes('insufficient balance')
      )) {
        setIsBookingModalVisible(false);
        setIsModalVisible(false);
        setIsVehicleSelectionModalVisible(false);
        setInsufficientBalanceMessage(error.message);
        setShowInsufficientBalanceModal(true);
      } else {
        Alert.alert('Booking Failed', 'Failed to book parking spot. Please try again.');
      }
    }
  };


  const handleSelectVehicle = (vehicleId: string) => {
    console.log('🎯 Selecting vehicle ID:', vehicleId, 'Type:', typeof vehicleId);
    setSelectedVehicle(vehicleId);
    const vehicle = userVehicles.find(v => v.id.toString() === vehicleId);
    console.log('🎯 Found vehicle:', vehicle);
    if (vehicle) {
      setSelectedVehicleForParking(vehicle);
    }
  };

  const handleVehicleBookNow = async () => {
    console.log('🎯 handleVehicleBookNow called');
    console.log('🎯 selectedVehicle:', selectedVehicle);
    console.log('🎯 selectedParkingArea:', selectedParkingArea);
    console.log('🎯 selectedSpotForBooking:', selectedSpotForBooking);
    
    // Check if this is called from frequent spots booking flow (including capacity sections)
    if (selectedVehicle && selectedSpotForBooking) {
      console.log('🎯 Using frequent spots booking flow');
      // Use the new handler for frequent spots
      await handleVehicleSelectedForSpot(selectedVehicle);
      return;
    }
    
    if (selectedVehicle && selectedParkingArea) {
      
      console.log('🎯 Using regular parking area booking flow');
      // Original flow for regular parking area booking
      try {
        setIsLoadingParkingSpots(true);
        
        // Get the selected vehicle's type to filter compatible spots
        const vehicle = userVehicles.find(v => v.id.toString() === selectedVehicle);
        const vehicleType = vehicle?.vehicle_type;
        
        console.log('🚗 Selected vehicle ID:', selectedVehicle, 'Type:', typeof selectedVehicle);
        console.log('🚗 All user vehicles:', userVehicles);
        console.log('🚗 Vehicle IDs in array:', userVehicles.map(v => ({id: v.id, type: typeof v.id})));
        console.log('🚗 Selected vehicle object:', vehicle);
        console.log('🚗 Vehicle type:', vehicleType);
        console.log('🚗 Vehicle type from object:', vehicle?.vehicle_type);
        console.log('🚗 Parking area ID:', selectedParkingArea.id);
        
        const response = await ApiService.getParkingSpots(selectedParkingArea.id, vehicleType);
        console.log('📋 API Response:', response);
        
        if (response.success && response.data.spots.length > 0) {
          // Automatically select the first available spot
          const assignedSpot = response.data.spots[0];
          console.log('🎯 Assigned spot:', assignedSpot);
          setAssignedSlot(assignedSpot.spot_number);
          setAssignedSpotDetails(assignedSpot);
          setIsVehicleSelectionModalVisible(false);
          setIsBookingModalVisible(true);
        } else {
          const vehicleTypeName = vehicleType ? `${vehicleType} ` : '';
          Alert.alert(
            'No Spots Available', 
            `No ${vehicleTypeName}parking spots are currently available in this area. Please try another area or select a different vehicle.`
          );
        }
      } catch (error) {
        console.error('Error fetching parking spots:', error);
        Alert.alert('Error', 'Failed to fetch parking spots');
    } finally {
        setIsLoadingParkingSpots(false);
      }
    }
  };

  const handleSelectArea = (areaId: string) => {
    // Handle area selection logic
    console.log('Selecting parking area:', areaId);
  };

  // Parse SVG to extract clickable elements
  const parseSvgForClickableElements = (svgString: string, layoutSections?: any[]) => {
    const spots: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      spotNumber?: string;
      spotId?: string;
      localSlot?: string;
      section?: string;
    }> = [];
    
    try {
      // Extract viewBox to calculate relative positions
      const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
      let viewBox = { x: 0, y: 0, width: 276, height: 322 }; // Default
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/).filter(p => p).map(Number);
        if (parts.length >= 4) {
          viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        }
      }
      
      // Also try to get width/height attributes
      const widthMatch = svgString.match(/width=["']([^"']+)["']/);
      const heightMatch = svgString.match(/height=["']([^"']+)["']/);
      if (widthMatch && heightMatch) {
        const w = parseFloat(widthMatch[1]);
        const h = parseFloat(heightMatch[1]);
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
          viewBox.width = w;
          viewBox.height = h;
        }
      }
      
      // Find all elements with IDs OR data attributes (for FU Main layout)
      const idRegex = /<(\w+)[^>]*\sid=["']([^"']+)["'][^>]*>/g;
      const dataRegex = /<(\w+)[^>]*\sdata-type=["']parking-slot["'][^>]*>/g;
      
      // Process elements with ID attributes
      let match;
      while ((match = idRegex.exec(svgString)) !== null) {
        const elementType = match[1];
        const id = match[2];
        const fullElement = match[0];
        const matchIndex = match.index;
        
        // DEBUG: Log every element found with ID (DISABLED - ISSUE FIXED)
        // console.log(`🔍 DEBUG: Found element with ID: ${id} (type: ${elementType})`);
        // console.log(`🔍 DEBUG: Full element snippet: ${fullElement.substring(0, 200)}...`);
        
        // TEMPORARILY DISABLE FILTERING TO SEE ALL ELEMENTS
        // Skip elements with "element" in their ID - these are not parking spots
        const idLower = id.toLowerCase();
        if (idLower.includes('element')) {
          console.log(`🚫 Skipping non-parking element: ${id}`);
          continue;
        }
        
        // DEBUG: Log all FPA-S elements to see what's happening
        if (idLower.includes('fpa-s-')) {
          console.log(`🔍 DEBUG: Found FPA-S element: ${id} (type: ${elementType})`);
          console.log(`🔍 DEBUG: Full element: ${fullElement.substring(0, 300)}...`);
        }
        
        // RE-ENABLE REGULAR ID PROCESSING
        // Only process elements that are likely parking spots
        // Check if the element has parking-related attributes or is within a parking context
        const hasParkingAttributes = fullElement.includes('data-slot') || 
                                     fullElement.includes('data-section') ||
                                     fullElement.includes('data-parking') ||
                                     idLower.includes('spot') ||
                                     idLower.includes('parking') ||
                                     idLower.includes('slot') ||
                                     idLower.match(/\d+/); // Any ID with numbers
        
        if (!hasParkingAttributes) {
          console.log(`🚫 Skipping element without parking attributes: ${id} (type: ${elementType})`);
          continue;
        }
        
        // Additional check: skip if element type suggests it's not a parking spot
        if (elementType === 'polygon' || elementType === 'line' || elementType === 'path') {
          console.log(`🚫 Skipping ${elementType} element (not a parking spot): ${id}`);
          continue;
        }
        
        // RE-ENABLE LEGITIMATE SPOT CHECK
        // CRITICAL: Only process if this is a legitimate parking spot
        // This prevents creating touchables for non-existent spots
        const isLegitimateParkingSpot = 
          id.includes('FPA-') || // FU Main format
          id.includes('S-') ||   // Spot format
          id.includes('spot') || // Spot keyword
          id.includes('parking') || // Parking keyword
          id.includes('section-') || // Capacity sections (V, X, VB)
          (id.match(/^[A-Z]+\d+$/) && parseInt(id.match(/\d+/)![1]) > 0 && parseInt(id.match(/\d+/)![1]) <= 50); // Format like "V4", "X12"
        
        if (!isLegitimateParkingSpot) {
          console.log(`🚫 Skipping non-legitimate parking spot: ${id}`);
          continue;
        }
        
        // DEBUG: Log if FPA-S-004 passes all checks
        if (id === 'FPA-S-004') {
          console.log(`🎯 DEBUG: FPA-S-004 passed all checks! Processing...`);
        }
        
        // ADDITIONAL FILTERING: Skip common non-parking elements
        const isNonParkingElement = 
          idLower.includes('arrow') ||
          idLower.includes('line') ||
          idLower.includes('path') ||
          idLower.includes('border') ||
          idLower.includes('background') ||
          idLower.includes('bg') ||
          idLower.includes('marker') ||
          idLower.includes('symbol') ||
          idLower.includes('icon') ||
          idLower.includes('text') ||
          idLower.includes('label') ||
          idLower.includes('road') ||
          idLower.includes('street') ||
          idLower.includes('lane') ||
          idLower.includes('marking') ||
          idLower.includes('strip') ||
          idLower.includes('gradient') ||
          idLower.includes('pattern') ||
          (elementType === 'polygon' && !idLower.includes('section-')) ||
          (elementType === 'path' && !idLower.includes('section-')) ||
          (elementType === 'line') ||
          (elementType === 'polyline') ||
          (elementType === 'text') ||
          (elementType === 'linearGradient') ||
          (elementType === 'pattern');
        
        if (isNonParkingElement) {
          console.log(`🚫 Skipping non-parking element type: ${id} (type: ${elementType})`);
          continue;
        }
        
        // Check if this element is inside a road group (handle nested groups)
        const beforeMatch = svgString.substring(0, matchIndex);
        let isInRoadGroup = false;
        let accumulatedTransform: { x: number; y: number } = { x: 0, y: 0 };
        
        // Find all parent groups and check for road groups, also accumulate transforms
        let searchPos = matchIndex;
        const parentGroups: Array<{ tag: string; index: number }> = [];
        
        while (searchPos >= 0) {
          const lastGroupOpen = beforeMatch.lastIndexOf('<g', searchPos);
          const lastGroupClose = beforeMatch.lastIndexOf('</g>', searchPos);
          
          if (lastGroupOpen > lastGroupClose && lastGroupOpen >= 0) {
            const groupTagStart = lastGroupOpen;
            const groupTagEnd = beforeMatch.indexOf('>', groupTagStart) + 1;
            if (groupTagEnd > groupTagStart) {
              const groupTag = beforeMatch.substring(groupTagStart, groupTagEnd);
              parentGroups.push({ tag: groupTag, index: groupTagStart });
              
              // Check if this group is a road group
              const groupIdMatch = groupTag.match(/id=["']([^"']+)["']/i);
              const groupClassMatch = groupTag.match(/class=["']([^"']+)["']/i);
              
              if (groupIdMatch && groupIdMatch[1].toLowerCase().includes('road')) {
                isInRoadGroup = true;
                break;
              }
              if (groupClassMatch && groupClassMatch[1].toLowerCase().includes('road')) {
                isInRoadGroup = true;
                break;
              }
              
              // Accumulate transform from parent groups (for nested floors/sections)
              const transformMatch = groupTag.match(/transform=["']translate\(([^)]+)\)["']/);
              if (transformMatch) {
                const coords = transformMatch[1].split(/[,\s]+/).map(parseFloat);
                accumulatedTransform.x += coords[0] || 0;
                accumulatedTransform.y += coords[1] || 0;
              }
              
              searchPos = lastGroupOpen - 1;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        
        // Skip road elements - check if ID or class contains "road" (case-insensitive)
        const classMatch = fullElement.match(/class=["']([^"']+)["']/i);
        const classLower = classMatch ? classMatch[1].toLowerCase() : '';
        
        if (idLower.includes('road') || classLower.includes('road') || isInRoadGroup) {
          console.log(`🚫 Skipping road element: ${id}${isInRoadGroup ? ' (in road group)' : ''}`);
          continue;
        }
        
        // Extract coordinates based on element type
        let x = 0, y = 0, width = 0, height = 0;
        
        if (elementType === 'rect') {
          const xMatch = fullElement.match(/x=["']([^"']+)["']/);
          const yMatch = fullElement.match(/y=["']([^"']+)["']/);
          const widthMatch = fullElement.match(/width=["']([^"']+)["']/);
          const heightMatch = fullElement.match(/height=["']([^"']+)["']/);
          
          x = xMatch ? parseFloat(xMatch[1]) : 0;
          y = yMatch ? parseFloat(yMatch[1]) : 0;
          width = widthMatch ? parseFloat(widthMatch[1]) : 40;
          height = heightMatch ? parseFloat(heightMatch[1]) : 20;
        } else if (elementType === 'circle') {
          const cxMatch = fullElement.match(/cx=["']([^"']+)["']/);
          const cyMatch = fullElement.match(/cy=["']([^"']+)["']/);
          const rMatch = fullElement.match(/r=["']([^"']+)["']/);
          
          const cx = cxMatch ? parseFloat(cxMatch[1]) : 0;
          const cy = cyMatch ? parseFloat(cyMatch[1]) : 0;
          const r = rMatch ? parseFloat(rMatch[1]) : 10;
          
          x = cx - r;
          y = cy - r;
          width = r * 2;
          height = r * 2;
        } else if (elementType === 'g') {
          // For groups, find the complete group element and its children
          // Find the matching closing </g> tag
          let depth = 1;
          let pos = matchIndex + fullElement.length;
          let groupEnd = -1;
          
          while (pos < svgString.length && depth > 0) {
            const nextOpen = svgString.indexOf('<g', pos);
            const nextClose = svgString.indexOf('</g>', pos);
            
            if (nextClose === -1) break;
            
            if (nextOpen !== -1 && nextOpen < nextClose) {
              depth++;
              pos = nextOpen + 2;
            } else {
              depth--;
              if (depth === 0) {
                groupEnd = nextClose + 4;
                break;
              }
              pos = nextClose + 4;
            }
          }
          
          if (groupEnd === -1) {
            // Couldn't find closing tag, skip
            continue;
          }
          
          const groupContent = svgString.substring(matchIndex, groupEnd);
          
          // Check for transform on the group and combine with accumulated parent transforms
          const transformMatch = fullElement.match(/transform=["']translate\(([^)]+)\)["']/);
          let tx = accumulatedTransform.x;
          let ty = accumulatedTransform.y;
          if (transformMatch) {
            const coords = transformMatch[1].split(/[,\s]+/).map(parseFloat);
            tx += coords[0] || 0;
            ty += coords[1] || 0;
          }
          
          // Look for rect elements inside the group - find the largest one (likely the main parking spot)
          // Also handle nested groups within this group (for sections/floors)
          type RectInfo = { x: number; y: number; width: number; height: number; area: number };
          let largestRect: RectInfo | null = null;
          
          // Extract inner content of the group (without the opening/closing tags) for processing
          const groupTagEndPos = matchIndex + fullElement.length;
          const innerGroupContent = svgString.substring(groupTagEndPos, groupEnd - 4);
          
          // Function to recursively find rects in nested groups
          // Add depth limit to prevent infinite recursion
          const findRectsInContent = (content: string, parentTx: number, parentTy: number, depth: number = 0): void => {
            // Safety: prevent infinite recursion (max depth of 10 levels)
            if (depth > 10) {
              console.warn('⚠️ Maximum recursion depth reached in findRectsInContent');
              return;
            }
            
            // Safety: prevent processing empty or too large content
            if (!content || content.length > 100000) {
              return;
            }
            
            // Find all rects in content (including nested ones - we'll filter by group depth later if needed)
            const rectRegex = /<rect[^>]*>/g;
            const rectMatches: RegExpExecArray[] = [];
            let rectMatch;
            
            // Collect all rect matches first
            rectRegex.lastIndex = 0; // Reset regex
            while ((rectMatch = rectRegex.exec(content)) !== null) {
              rectMatches.push(rectMatch);
            }
            
            // Process found rects
            for (const match of rectMatches) {
              const rectElement = match[0];
              const rxMatch = rectElement.match(/x=["']([^"']+)["']/);
              const ryMatch = rectElement.match(/y=["']([^"']+)["']/);
              const rWidthMatch = rectElement.match(/width=["']([^"']+)["']/);
              const rHeightMatch = rectElement.match(/height=["']([^"']+)["']/);
              
              if (rxMatch && ryMatch && rWidthMatch && rHeightMatch) {
                const rx = parseFloat(rxMatch[1]);
                const ry = parseFloat(ryMatch[1]);
                const rw = parseFloat(rWidthMatch[1]);
                const rh = parseFloat(rHeightMatch[1]);
                
                if (!isNaN(rx) && !isNaN(ry) && !isNaN(rw) && !isNaN(rh) && rw > 0 && rh > 0) {
                  const area = rw * rh;
                  // Keep the largest rect (this represents the main parking spot area)
                  if (!largestRect || area > largestRect.area) {
                    largestRect = {
                      x: rx + parentTx,
                      y: ry + parentTy,
                      width: rw,
                      height: rh,
                      area: area
                    };
                  }
                }
              }
            }
            
            // Also check nested groups (for floors/sections) - but limit recursion
            // Use indexOf instead of regex to avoid regex state issues
            const processedGroups = new Set<number>(); // Track processed group start positions
            let groupCount = 0;
            const maxGroups = 50; // Limit number of groups to process
            let searchStart = 0;
            
            while (groupCount < maxGroups && searchStart < content.length) {
              const groupOpenPos = content.indexOf('<g', searchStart);
              if (groupOpenPos === -1) break;
              
              // Skip if we've already processed this group
              if (processedGroups.has(groupOpenPos)) {
                searchStart = groupOpenPos + 2;
                continue;
              }
              processedGroups.add(groupOpenPos);
              
              const groupTagEnd = content.indexOf('>', groupOpenPos);
              if (groupTagEnd === -1) {
                searchStart = groupOpenPos + 2;
                continue;
              }
              
              const nestedGroupTag = content.substring(groupOpenPos, groupTagEnd + 1);
              
              // Find matching closing tag
              let nestedDepth = 1;
              let nestedPos = groupTagEnd;
              let nestedGroupEnd = -1;
              
              while (nestedPos < content.length && nestedDepth > 0) {
                const nextOpen = content.indexOf('<g', nestedPos);
                const nextClose = content.indexOf('</g>', nestedPos);
                
                if (nextClose === -1) break;
                
                if (nextOpen !== -1 && nextOpen < nextClose) {
                  nestedDepth++;
                  nestedPos = nextOpen + 2;
                } else {
                  nestedDepth--;
                  if (nestedDepth === 0) {
                    nestedGroupEnd = nextClose + 4;
                    break;
                  }
                  nestedPos = nextClose + 4;
                }
              }
              
              if (nestedGroupEnd > groupOpenPos && nestedGroupEnd <= content.length) {
                // Extract inner content (without the group tags) to prevent re-processing
                const innerContent = content.substring(groupTagEnd + 1, nestedGroupEnd - 4);
                
                // Only process if inner content is not empty
                // Remove the length check that was too restrictive - just check it's not the same
                if (innerContent && innerContent.trim().length > 0) {
                  const nestedTransformMatch = nestedGroupTag.match(/transform=["']translate\(([^)]+)\)["']/);
                  let nestedTx = parentTx;
                  let nestedTy = parentTy;
                  
                  if (nestedTransformMatch) {
                    const nestedCoords = nestedTransformMatch[1].split(/[,\s]+/).map(parseFloat);
                    nestedTx += nestedCoords[0] || 0;
                    nestedTy += nestedCoords[1] || 0;
                  }
                  
                  // Recursively search nested groups with increased depth
                  findRectsInContent(innerContent, nestedTx, nestedTy, depth + 1);
                  groupCount++;
                }
                
                // Move search position past this group to avoid re-processing
                searchStart = nestedGroupEnd;
              } else {
                // If we couldn't find the closing tag, skip this group
                searchStart = groupTagEnd + 1;
              }
            }
          };
          
          // Process the inner content of the group (without the group tags themselves)
          findRectsInContent(innerGroupContent, tx, ty, 0);
          
          // Also look for path elements in the group and calculate bounding box (including nested)
          const pathRegex = /<path[^>]*d=["']([^"']+)["'][^>]*>/g;
          let pathMatch;
          let pathMinX = Infinity, pathMinY = Infinity, pathMaxX = -Infinity, pathMaxY = -Infinity;
          let foundPath = false;
          
          // Reset regex lastIndex
          pathRegex.lastIndex = 0;
          while ((pathMatch = pathRegex.exec(groupContent)) !== null) {
            const pathData = pathMatch[1];
            // Parse path data to get bounding box (simplified - handles M, L, H, V commands)
            const coords: number[] = [];
            const numbers = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (numbers) {
              numbers.forEach(num => {
                const val = parseFloat(num);
                if (!isNaN(val)) coords.push(val);
              });
              
              // Get min/max from coordinates
              if (coords.length >= 2) {
                for (let i = 0; i < coords.length; i += 2) {
                  if (i + 1 < coords.length) {
                    const px = coords[i] + tx;
                    const py = coords[i + 1] + ty;
                    pathMinX = Math.min(pathMinX, px);
                    pathMinY = Math.min(pathMinY, py);
                    pathMaxX = Math.max(pathMaxX, px);
                    pathMaxY = Math.max(pathMaxY, py);
                    foundPath = true;
                  }
                }
              }
            }
          }
          
          // Use the largest rect if found, otherwise use path bounds, otherwise fallback
          if (largestRect) {
            x = (largestRect as RectInfo).x;
            y = (largestRect as RectInfo).y;
            width = (largestRect as RectInfo).width;
            height = (largestRect as RectInfo).height;
          } else if (foundPath) {
            x = pathMinX;
            y = pathMinY;
            width = pathMaxX - pathMinX;
            height = pathMaxY - pathMinY;
          } else {
            // Fallback: try transform only with estimated size based on viewBox
            if (transformMatch) {
              x = tx;
              y = ty;
              // Use reasonable default size - adjust based on typical parking spot sizes
              width = viewBox.width / 5; // About 1/5 of viewBox width
              height = viewBox.height / 10; // About 1/10 of viewBox height
            } else {
              continue; // Skip if no transform and no rects/paths found
            }
          }
        }
        
        // Extract spot number from ID (handle various formats)
        // Formats: "FPA-S-001", "F1-A-1", "A-1", "spot-1", "parking-1", "section-a-spot-1", etc.
        let spotNumber = id;
        
        // Check if this is a capacity section (V, VB, SD, X, etc.)
        const isCapacitySection = /^[A-Z]{1,3}$/.test(id) && !id.includes('FPA') && !id.includes('-');
        
        // Special handling for FPA capacity sections based on layout data
        const isFPACapacitySection = (id === 'E' || id === 'I' || id === 'SD') && 
          selectedAreaForSpots?.name?.toLowerCase().includes('fpa');
        
        // DEBUG: Log capacity section detection during SVG parsing
        if (isCapacitySection || isFPACapacitySection) {
          console.log('🔍 DEBUG: Found capacity section in SVG:', {
            id,
            elementType,
            isCapacitySection,
            isFPACapacitySection,
            areaName: selectedAreaForSpots?.name,
            fullElement: fullElement.substring(0, 200) + '...'
          });
          
          // Check if the element contains section_data or section_mode information
          if (fullElement.includes('section_data') || fullElement.includes('section_mode')) {
            console.log('🎯 FOUND SECTION_DATA IN SVG:', id);
            console.log('🎯 Element containing section_data:', fullElement);
            
            // Try to extract section_mode if present
            const sectionModeMatch = fullElement.match(/section_mode["\s]*[:=]["\s]*([^"'\s>]+)/);
            if (sectionModeMatch) {
              console.log('🎯 SECTION_MODE FOUND:', sectionModeMatch[1], 'for section:', id);
            }
          }
        }
        
        if (isCapacitySection || isFPACapacitySection) {
          // For capacity sections, use the ID as the spot number directly
          spotNumber = id; // "V", "VB", "SD", "E", "I", etc.
        } else {
          // Try different patterns for regular parking spots
          // Pattern 1: FPA-{section}-{number} (FPA specific format)
          const fpaSpotMatch = id.match(/FPA-([A-Z]+)-(\d+)/i);
          if (fpaSpotMatch) {
            spotNumber = fpaSpotMatch[2]; // Use just the number part (e.g., "001" from "FPA-S-001")
          } else {
            // Pattern 2: F{floor}-{section}-{number} or {section}-{number}
            const sectionSpotMatch = id.match(/(?:F\d+-)?([A-Z]+)-(\d+)/i);
            if (sectionSpotMatch) {
              spotNumber = sectionSpotMatch[2]; // Use just the number part
            } else {
              // Pattern 3: spot-{number} or parking-{number}
              const spotMatch = id.match(/(?:spot|parking)[-_]?(\d+)/i);
              if (spotMatch) {
                spotNumber = spotMatch[1];
              } else {
                // Pattern 4: Any number in the ID
                const numMatch = id.match(/(\d+)/);
                if (numMatch) {
                  spotNumber = numMatch[1];
                }
              }
            }
          }
        }
        
        // RE-ENABLE SIZE VALIDATION (more lenient)
        // Only add if we have valid coordinates and reasonable size for parking spots
        if (width > 0 && height > 0 && !isNaN(width) && !isNaN(height) && 
            width >= 10 && height >= 10) { // Reduced minimum size
          
          // MORE LENIENT VALIDATION
          // FINAL VALIDATION: Ensure this looks like a real parking spot
          const aspectRatio = width / height;
          const isReasonableShape = 
            (width >= 20 && width <= 150 && height >= 20 && height <= 150); // More flexible range
          
          if (!isReasonableShape) {
            console.log(`🚫 Skipping element with unreasonable parking spot dimensions: ${id} (${width}x${height})`);
            continue;
          }
          
          console.log(`📍 Found spot: ${id} (${spotNumber}) - x:${x}, y:${y}, w:${width}, h:${height}`);
          
          // Check for duplicates - skip if this spot ID already exists
          const existingSpot = spots.find(spot => spot.id === id);
          if (existingSpot) {
            console.log(`🚫 Skipping duplicate spot: ${id} (already exists at x:${existingSpot.x}, y:${existingSpot.y})`);
            continue;
          }
          
          // Also check for duplicate spot numbers (different IDs but same spot number)
          const existingSpotNumber = spots.find(spot => spot.spotNumber === spotNumber);
          if (existingSpotNumber && spotNumber) {
            console.log(`🚫 Skipping duplicate spot number: ${spotNumber} (ID: ${id} already exists as ID: ${existingSpotNumber.id})`);
            continue;
          }
          
          // console.log(`✅ Adding spot: ${id} (${spotNumber}) at (${x}, ${y})`); // DISABLED - LESS NOISE
          
          // Skip elements that are too large (likely infrastructure)
          if (width > 200 || height > 200) {
            console.log(`🚫 Skipping oversized element: ${id} (${width}x${height}) - likely infrastructure`);
            continue;
          }
          
          // Skip elements with unusual aspect ratios (likely roads/paths)
          if (width > 0 && height > 0) {
            const aspectRatio = width / height;
            if (aspectRatio > 5 || aspectRatio < 0.2) {
              console.log(`🚫 Skipping element with unusual aspect ratio: ${id} (${aspectRatio.toFixed(2)}) - likely road/path`);
              continue;
            }
          }
          
          // Additional position-based filtering - skip elements that are likely in road areas
          // Roads are typically in the middle of the layout with specific Y coordinates
          const isInRoadArea = (y > 80 && y < 120) && (x > 100 && x < 200);
          if (isInRoadArea && !idLower.includes('section-')) {
            console.log(`🚫 Skipping element in road area: ${id} at (${x}, ${y})`);
            continue;
          }
          
          spots.push({
            id,
            x,
            y,
            width,
            height,
            spotNumber,
            spotId: id,
          });
        } else {
          console.log(`⚠️ Skipping spot ${id} - invalid dimensions: x:${x}, y:${y}, w:${width}, h:${height}`);
        }
      }
      
      // DISABLED: Text element processing was creating duplicate spots from labels
      // This was causing "text-spot-4" to appear on roads from text labels
      // const textRegex = /<text[^>]*>([^<]+)<\/text>/g;
      // while ((match = textRegex.exec(svgString)) !== null) {
      //   const textContent = match[1].trim();
      //   const textElement = match[0];
        
      //   // Only process text that looks like a spot number (1-2 digits)
      //   if (/^\d{1,2}$/.test(textContent)) {
      //     const xMatch = textElement.match(/x=["']([^"']+)["']/);
      //     const yMatch = textElement.match(/y=["']([^"']+)["']/);
        
      //     if (xMatch && yMatch) {
      //       const x = parseFloat(xMatch[1]);
      //       const y = parseFloat(yMatch[1]);
        
      //       const existingSpot = spots.find(s => 
      //         Math.abs(s.x - x) < 20 && Math.abs(s.y - y) < 20
      //       );
        
      //       if (!existingSpot) {
      //         spots.push({
      //           id: `text-spot-${textContent}`,
      //           x: x - 15,
      //           y: y - 10,
      //           width: 30,
      //           height: 20,
      //           spotNumber: textContent,
      //           spotId: `spot-${textContent}`,
      //         });
      //       } else {
      //         existingSpot.spotNumber = textContent;
      //       }
      //     }
      //   }
      // }
      
      // Process FU Main layout elements with data-type="parking-slot"
      console.log('🔍 Processing FU Main parking slots with data attributes...');
      let dataMatch;
      while ((dataMatch = dataRegex.exec(svgString)) !== null) {
        const elementType = dataMatch[1];
        const fullElement = dataMatch[0];
        const matchIndex = dataMatch.index;
        
        // Extract data attributes from the element
        const dataSlotMatch = fullElement.match(/data-slot=["']([^"']+)["']/);
        const dataSlotIdMatch = fullElement.match(/data-slot-id=["']([^"']+)["']/);
        const dataSectionMatch = fullElement.match(/data-section=["']([^"']+)["']/);
        const dataLocalSlotMatch = fullElement.match(/data-local-slot=["']([^"']+)["']/);
        
        if (dataSlotMatch && dataSlotIdMatch) {
          const slotNumber = dataSlotMatch[1];
          const slotId = dataSlotIdMatch[1];
          const section = dataSectionMatch ? dataSectionMatch[1] : 'Unknown';
          const localSlot = dataLocalSlotMatch ? dataLocalSlotMatch[1] : null;
          
          // TEMPORARILY DISABLE FU MAIN FILTERING
          // Apply the same filtering as regular ID processing
          // const idLower = slotId.toLowerCase();
          // if (idLower.includes('element') || idLower.includes('road') || idLower.includes('path') || idLower.includes('line') || idLower.includes('arrow')) {
          //   console.log(`🚫 Skipping FU Main element with non-parking ID: ${slotId}`);
          //   continue;
          // }
          
          // Additional check: skip if element type suggests it's not a parking spot
          // if (elementType === 'polygon' || elementType === 'line' || elementType === 'path') {
          //   console.log(`🚫 Skipping FU Main ${elementType} element (not a parking spot): ${slotId}`);
          //   continue;
          // }
          
          // CRITICAL: Only process if this is a legitimate parking spot with proper attributes
          // This prevents creating touchables for non-existent spots
          const isLegitimateParkingSpot = true; // Temporarily allow all
          
          // if (!isLegitimateParkingSpot) {
          //   console.log(`🚫 Skipping non-legitimate parking spot: ${slotId} (section: ${section}, local: ${localSlot})`);
          //   continue;
          // }
          
          console.log(`🎯 Found FU Main parking slot: ${slotId} (${section}-${slotNumber}) local: ${localSlot}`);
          
          // Extract transform attribute for positioning
          const transformMatch = fullElement.match(/transform=["']translate\(([^)]+)\)["']/);
          let x = 0, y = 0;
          
          if (transformMatch) {
            const coords = transformMatch[1].split(/[,\s]+/).map(parseFloat);
            x = coords[0] || 0;
            y = coords[1] || 0;
          }
          
          // Look for rect elements within this group for dimensions
          const rectRegex = /<rect[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["'][^>]*>/g;
          let rectMatch;
          let width = 50; // Default size for FU Main spots
          let height = 50;
          
          // Find the next closing tag to limit search scope
          const searchEnd = svgString.indexOf('</g>', matchIndex);
          const searchScope = searchEnd > -1 ? svgString.substring(matchIndex, searchEnd) : svgString.substring(matchIndex);
          
          while ((rectMatch = rectRegex.exec(searchScope)) !== null) {
            const rectWidth = parseFloat(rectMatch[3]);
            const rectHeight = parseFloat(rectMatch[4]);
            
            if (!isNaN(rectWidth) && !isNaN(rectHeight) && rectWidth > 0 && rectHeight > 0) {
              width = rectWidth;
              height = rectHeight;
              break; // Use the first valid rect found
            }
          }
          
          // TEMPORARILY DISABLE FU MAIN SIZE VALIDATION
          // Add the FU Main parking spot with all attributes
          // Additional coordinate validation to ensure it's not in a road area
          // const isInRoadArea = (x < 50 || y < 50 || x > 1200 || y > 300); // Road-like boundaries
          
          // if (isInRoadArea) {
          //   console.log(`🚫 Skipping FU Main spot in road area: ${slotId} at (${x}, ${y})`);
          //   continue;
          // }
          
          // FINAL VALIDATION: Ensure this looks like a real parking spot
          // const isReasonableShape = 
          //   (width >= 40 && width <= 80 && height >= 40 && height <= 80) || // Standard parking spot
          //   (width >= 20 && width <= 100 && height >= 20 && height <= 100); // Flexible range
          
          // if (!isReasonableShape) {
          //   console.log(`🚫 Skipping FU Main element with unreasonable dimensions: ${slotId} (${width}x${height})`);
          //   continue;
          // }
          
          spots.push({
            id: slotId,
            x: x,
            y: y,
            width: width,
            height: height,
            spotNumber: slotNumber,
            spotId: slotId,
            localSlot: localSlot || undefined, // Handle null value
            section: section || undefined, // Handle null value
          });
          
          console.log(`✅ Added FU Main spot: ${slotId} at (${x}, ${y}) size ${width}x${height} local: ${localSlot}`);
        }
      }
      
      // Process capacity sections from layout data instead of hardcoded ones
      console.log('🔍 Processing capacity sections from layout data...');
      
      // Check if we have sections data from layout
      const sectionsFromLayout = layoutSections || [];
      console.log('🔍 Layout sections found:', sectionsFromLayout.length);
      
      if (sectionsFromLayout.length > 0) {
        // Process sections from layout data - ONLY capacity_only sections
        const capacityOnlySections = sectionsFromLayout.filter(section => 
          section.section_data && section.section_data.section_mode === 'capacity_only'
        );
        
        console.log(`🔍 Found ${capacityOnlySections.length} capacity-only sections out of ${sectionsFromLayout.length} total sections`);
        
        for (const layoutSection of capacityOnlySections) {
          const sectionName = layoutSection.section_data.section_name; // E, I, SD
          const position = layoutSection.position; // "1,0", "0,2", "4,0"
          
          console.log(`🎯 Processing capacity section from layout: ${sectionName} at position ${position}`);
          
          // Parse position to get coordinates
          const [row, col] = position.split(',').map(Number);
          
          // Convert grid position to SVG coordinates (this may need adjustment based on your grid system)
          const x = col * 52; // Approximate based on 52px width from SVG
          const y = row * 52; // Approximate based on 52px height from SVG
          
          // Look for the actual section in the SVG to get precise coordinates
          const sectionSelector = `<g transform="translate(${x}, ${y})">`;
          const startIndex = svgString.indexOf(sectionSelector);
          
          if (startIndex !== -1) {
            console.log(`✅ Found layout section ${sectionName} in SVG at position ${position}`);
            
            // Extract the section group for dimensions
            const sectionStart = startIndex + sectionSelector.length;
            const sectionEnd = svgString.indexOf('</g>', sectionStart);
            const sectionContent = svgString.substring(sectionStart, sectionEnd);
            
            // Look for the capacity background rect
            const rectRegex = /<rect[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["'][^>]*>/;
            const rectMatch = rectRegex.exec(sectionContent);
            
            if (rectMatch) {
              const rectX = parseFloat(rectMatch[1]);
              const rectY = parseFloat(rectMatch[2]);
              const rectWidth = parseFloat(rectMatch[3]);
              const rectHeight = parseFloat(rectMatch[4]);
              
              console.log(`📐 Layout section ${sectionName} dimensions: ${rectWidth}x${rectHeight} at (${rectX}, ${rectY})`);
              
              // Add the layout section as a clickable spot - ONLY for capacity_only sections
              const sectionId = `section-${sectionName}`;
              const existingSection = spots.find(spot => spot.id === sectionId);
              if (!existingSection) {
                spots.push({
                  id: sectionId,
                  x: rectX,
                  y: rectY,
                  width: rectWidth,
                  height: rectHeight,
                  spotNumber: sectionName,
                  spotId: sectionId,
                  section: sectionName,
                });
                
                console.log(`✅ Added CAPACITY-ONLY layout section: ${sectionName} at (${rectX}, ${rectY}) size ${rectWidth}x${rectHeight}`);
              } else {
                console.log(`🚫 Skipping duplicate layout section: ${sectionId}`);
              }
            } else {
              console.log(`⚠️ Could not find rect for layout section ${sectionName}, using fallback coordinates`);
              
              // Fallback: add with estimated coordinates
              const sectionId = `section-${sectionName}`;
              const existingSection = spots.find(spot => spot.id === sectionId);
              if (!existingSection) {
                spots.push({
                  id: sectionId,
                  x: x,
                  y: y,
                  width: 52,
                  height: 156, // Default height
                  spotNumber: sectionName,
                  spotId: sectionId,
                  section: sectionName,
                });
                
                console.log(`✅ Added CAPACITY-ONLY layout section (fallback): ${sectionName} at (${x}, ${y})`);
              }
            }
          } else {
            console.log(`⚠️ Could not find layout section ${sectionName} in SVG at expected position ${position}`);
          }
        }
        
        // Log slot-based sections that are being ignored
        const slotBasedSections = sectionsFromLayout.filter(section => 
          section.section_data && section.section_data.section_mode === 'slot_based'
        );
        if (slotBasedSections.length > 0) {
          console.log(`🚫 Ignoring ${slotBasedSections.length} slot-based sections:`, slotBasedSections.map(s => s.section_data.section_name));
        }
      } else {
        // Fallback to hardcoded sections if no layout data
        console.log('⚠️ No layout sections found, using fallback hardcoded sections');
        
        // Process FU Main capacity sections (V, X, VB) - look for the actual section groups in the SVG
        console.log('🔍 Processing FU Main capacity sections (V, X, VB) as fallback...');
        
        // Look for the specific section groups in the SVG
        const sectionGroups = [
          {
            name: 'V',
            transform: 'translate(-3, 49)',
            selector: '<g transform="translate(-3, 49)">',
            endIndex: svgString.indexOf('</g>', svgString.indexOf('<g transform="translate(-3, 49)">'))
          },
          {
            name: 'VB', 
            transform: 'translate(101, -3)',
            selector: '<g transform="translate(101, -3)">',
            endIndex: svgString.indexOf('</g>', svgString.indexOf('<g transform="translate(101, -3)">'))
          },
          {
            name: 'X',
            transform: 'translate(101, 101)', 
            selector: '<g transform="translate(101, 101)">',
            endIndex: svgString.indexOf('</g>', svgString.indexOf('<g transform="translate(101, 101)">'))
          }
        ];
        
        for (const section of sectionGroups) {
          const startIndex = svgString.indexOf(section.selector);
          
          if (startIndex === -1) {
            console.log(`⚠️ Section ${section.name} not found in SVG`);
            continue;
          }
          
          console.log(`🎯 Found FU Main capacity section: ${section.name}`);
          
          // Extract coordinates from transform
          const coords = section.transform.match(/translate\(([^)]+)\)/);
          let x = 0, y = 0;
          if (coords) {
            const xy = coords[1].split(/[,\s]+/).map(parseFloat);
            x = xy[0] || 0;
            y = xy[1] || 0;
          }
          
          // Find the section background rect for dimensions
          const sectionStart = startIndex + section.selector.length;
          const sectionEnd = section.endIndex > -1 ? section.endIndex : svgString.indexOf('</g>', startIndex);
          const sectionContent = svgString.substring(sectionStart, sectionEnd);
          
          // Look for the capacity background rect
          const rectRegex = /<rect[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["'][^>]*>/;
          const rectMatch = rectRegex.exec(sectionContent);
          
          if (rectMatch) {
            const rectX = parseFloat(rectMatch[1]);
            const rectY = parseFloat(rectMatch[2]);
            const rectWidth = parseFloat(rectMatch[3]);
            const rectHeight = parseFloat(rectMatch[4]);
            
            console.log(`📐 Section ${section.name} rect found: ${rectWidth}x${rectHeight} at (${rectX}, ${rectY})`);
            
            // Add the capacity section as a clickable spot
            const sectionId = `section-${section.name}`;
            const existingSection = spots.find(spot => spot.id === sectionId);
            if (!existingSection) {
              spots.push({
                id: sectionId,
                x: rectX,
                y: rectY,
                width: rectWidth,
                height: rectHeight,
                spotNumber: section.name,
                spotId: sectionId,
                section: section.name,
              });
              
              console.log(`✅ Added FU Main section: ${section.name} at (${rectX}, ${rectY}) size ${rectWidth}x${rectHeight} ID: ${sectionId}`);
            } else {
              console.log(`🚫 Skipping duplicate capacity section: ${sectionId} (already exists)`);
              continue;
            }
          }
        }
      }
      
      // Alternative approach: Look for sections by finding text elements with section letters from layout data
      console.log('🔍 Trying alternative section detection by text content...');
      const sectionLetters = sectionsFromLayout && sectionsFromLayout.length > 0 
        ? sectionsFromLayout.map((s: any) => s.section_data?.section_name).filter(Boolean)
        : ['V', 'X', 'VB']; // Fallback
      
      for (const letter of sectionLetters) {
        // Look for text elements containing the section letter
        const textRegex = new RegExp(`<text[^>]*>${letter}<\\/text>`, 'i');
        const textMatch = textRegex.exec(svgString);
        
        if (textMatch) {
          console.log(`🎯 Found text element for section ${letter}:`, textMatch[0]);
          
          // Check if this section is capacity_only before processing
          const sectionData = sectionsFromLayout.find(s => s.section_data?.section_name === letter);
          if (sectionData && sectionData.section_data.section_mode === 'slot_based') {
            console.log(`🚫 Skipping slot-based section: ${letter}`);
            continue;
          }
          
          console.log(`✅ Processing capacity-only section: ${letter}`);
          
          // Find the parent group of this text element
          const textIndex = textMatch.index;
          const beforeText = svgString.substring(0, textIndex);
          
          // Look for the parent group
          let searchPos = textIndex;
          let parentGroupStart = -1;
          
          while (searchPos >= 0) {
            const lastGroupOpen = beforeText.lastIndexOf('<g', searchPos);
            const lastGroupClose = beforeText.lastIndexOf('</g>', searchPos);
            
            if (lastGroupOpen > lastGroupClose && lastGroupOpen >= 0) {
              parentGroupStart = lastGroupOpen;
              break;
            }
            searchPos = lastGroupOpen - 1;
          }
          
          if (parentGroupStart >= 0) {
            const groupEnd = svgString.indexOf('</g>', parentGroupStart);
            const groupContent = svgString.substring(parentGroupStart, groupEnd);
            
            console.log(`🔍 Found parent group for section ${letter}:`, groupContent.substring(0, 100) + '...');
            
            // Extract transform from this group
            const transformMatch = groupContent.match(/transform=["']([^"']+)["']/);
            if (transformMatch) {
              const transform = transformMatch[1];
              console.log(`🎯 Extracted transform for section ${letter}: ${transform}`);
              
              // Parse transform coordinates
              const transformCoords = transform.match(/translate\(([^)]+)\)/);
              if (transformCoords) {
                const xy = transformCoords[1].split(/[,\s]+/).map(parseFloat);
                const tx = xy[0] || 0;
                const ty = xy[1] || 0;
                
                // Look for rect in this group for dimensions
                const groupRectRegex = /<rect[^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["'][^>]*>/;
                const groupRectMatch = groupRectRegex.exec(groupContent);
                
                let secWidth = 80; // Default section size
                let secHeight = 40;
                
                if (groupRectMatch) {
                  const rWidth = parseFloat(groupRectMatch[1]);
                  const rHeight = parseFloat(groupRectMatch[2]);
                  
                  if (!isNaN(rWidth) && !isNaN(rHeight) && rWidth > 0 && rHeight > 0) {
                    secWidth = rWidth;
                    secHeight = rHeight;
                  }
                }
                
                // Add the section as a clickable spot if not already added
                const sectionId = `section-${letter}`;
                const existingSection = spots.find(s => s.id === sectionId);
                if (!existingSection) {
                  spots.push({
                    id: `section-${letter}`,
                    x: tx,
                    y: ty,
                    width: secWidth,
                    height: secHeight,
                    spotNumber: letter,
                    spotId: `section-${letter}`,
                  });
                  
                  console.log(`✅ Added FU Main section (alternative): ${letter} at (${tx}, ${ty}) size ${secWidth}x${secHeight}`);
                }
              }
            }
          }
        }
      }
      
      console.log(`✅ Parsed ${spots.length} clickable spots from SVG`);
    } catch (error) {
      console.error('❌ Error parsing SVG:', error);
    }
    
    console.log(`✅ SVG parsing complete. Found ${spots.length} clickable spots:`, 
      spots.map(spot => ({ id: spot.id, spotNumber: spot.spotNumber, x: spot.x, y: spot.y })));
    
    return spots;
  };

  // Load spot statuses from backend
  const loadSpotStatuses = async (areaId: number) => {
    try {
      console.log('📊 Loading spot statuses for area:', areaId, 'Area name:', selectedAreaForSpots?.name);
      console.log('📊 Area details:', selectedAreaForSpots);
      const response = await ApiService.getParkingSpotsStatus(areaId);
      
      if (response.success && response.data.spots) {
        console.log('📊 Backend returned spots:', response.data.spots.length, 'spots');
        console.log('📊 First 5 spot IDs:', response.data.spots.slice(0, 5).map(s => s.spot_number || s.id));
        
        // Create a Map for quick lookup by spot_number and ID
        const newStatusMap = new Map();
        response.data.spots.forEach((spot: any) => {
          // Store by spot_number (primary key)
          newStatusMap.set(spot.spot_number, spot);
          // Also store by ID for fallback matching (matches ActiveParkingScreen approach)
          newStatusMap.set(spot.id.toString(), spot);
        });
        
        // Debug logging to see what we loaded
        console.log('🔍 HomeScreen Loaded spot statuses:', {
          totalSpots: response.data.spots.length,
          sampleSpots: response.data.spots.slice(0, 3).map(spot => ({
            spot_number: spot.spot_number,
            id: spot.id,
            status: spot.status,
            spot_type: spot.spot_type,
            section_name: spot.section_name
          })),
          mapKeys: Array.from(newStatusMap.keys()).slice(0, 10)
        });
        
        setSpotStatuses(newStatusMap);
        console.log(`✅ Loaded ${newStatusMap.size} spot statuses`);
      } else {
        console.log('⚠️ No spot statuses found');
        setSpotStatuses(new Map());
      }
    } catch (error) {
      console.error('❌ Error loading spot statuses:', error);
      setSpotStatuses(new Map());
    }
  };

  // Handle spot press
  const handleSpotPress = (spot: any) => {
    console.log('🎯 handleSpotPress CALLED with:', {
      spotId: spot.id,
      spotNumber: spot.spotNumber,
      spotType: spot.spot_type,
      fullSpot: spot
    });
    
    // Check if this is a capacity section - completely dynamic
    const isCapacitySection = (/^[A-Z]{1,3}$/.test(spot.id) && !spot.id.includes('FPA') && !spot.id.includes('-')) ||
                                (/^section-[A-Z]{1,3}$/i.test(spot.id));
    
    // Check if this section exists in our capacity sections data - dynamic detection
    let sectionName = spot.spotNumber || '';
    if (spot.id.startsWith('section-')) {
      sectionName = spot.id.replace('section-', '').toUpperCase();
    }
    
    const hasCapacityData = capacitySections.some(section => 
      section.sectionName.toLowerCase() === sectionName.toLowerCase()
    );
    
    const isFPACapacitySection = isCapacitySection && hasCapacityData && 
      selectedAreaForSpots?.name?.toLowerCase().includes('fpa');
    
    console.log('🔍 Capacity section check:', {
      isCapacitySection,
      isFPACapacitySection,
      hasCapacityData,
      spotId: spot.id,
      sectionName,
      areaName: selectedAreaForSpots?.name,
      availableSections: capacitySections.map(s => s.sectionName),
      capacitySectionsCount: capacitySections.length
    });
    
    // Use the EXACT same matching logic as the map function
    let spotStatus = spotStatuses.get(spot.id || '') || spotStatuses.get(spot.spotNumber || '');
    
    // If still not found, try matching without floor prefix
    if (!spotStatus && spot.id) {
      const idWithoutFloor = spot.id.replace(/^F\d+-/i, ''); // Remove "F2-" prefix
      spotStatus = spotStatuses.get(idWithoutFloor);
    }
    
    // Also try matching by local slot number for FU Main
    if (!spotStatus && (spot as any).localSlot) {
      spotStatus = spotStatuses.get((spot as any).localSlot);
    }
    
    // Fallback for FPA spots if backend returns wrong data
    if (!spotStatus && spot.id && spot.id.startsWith('FPA-S-') && 
        selectedAreaForSpots?.name?.toLowerCase().includes('fpa')) {
      console.log(`🔧 Using fallback status for FPA spot: ${spot.id}`);
      // Create default available status for FPA spots
      spotStatus = {
        id: parseInt(spot.id.split('-')[2]), // Extract number from FPA-S-001
        spot_number: spot.id,
        status: 'available',
        spot_type: 'motorcycle', // FPA is motorcycle area
        section_name: 'Section S',
        is_user_booked: 0,
        // Add missing properties to match interface
        totalCapacity: 1,
        availableCapacity: 1,
        utilizationRate: 0
      };
      console.log(`🔧 Created fallback spot status for ${spot.id}:`, spotStatus);
    } else {
      // DEBUG: Log why fallback is not triggering
      if (spot.id && spot.id.startsWith('FPA-S-') && !spotStatus) {
        console.log(`🔧 DEBUG: Fallback not triggered for ${spot.id}:`, {
          hasSpotStatus: !!spotStatus,
          spotId: spot.id,
          areaName: selectedAreaForSpots?.name,
          isFPA: selectedAreaForSpots?.name?.toLowerCase().includes('fpa')
        });
      }
    }
    
    // For capacity sections, get capacity data
    // isCapacitySection and isFPACapacitySection are already declared above
    
    // DEBUG: Log capacity section detection
    if (isCapacitySection || isFPACapacitySection) {
      console.log('🔍 DEBUG: Processing capacity section:', {
        spotId: spot.id,
        spotNumber: spot.spotNumber,
        isCapacitySection,
        isFPACapacitySection,
        areaName: selectedAreaForSpots?.name
      });
    }
    
    if (isCapacitySection || isFPACapacitySection) {
      // Section name is already extracted above
      
      let sectionData = capacitySections.find(section => 
        section.sectionName.toLowerCase() === sectionName.toLowerCase()
      );
      
      // DEBUG: Log section data lookup with more details
      console.log('🔍 DEBUG: Looking for section data:', {
        sectionName,
        foundSectionData: !!sectionData,
        availableSections: capacitySections.map(s => s.sectionName),
        // Try different matching strategies
        exactMatch: capacitySections.find(s => s.sectionName === sectionName),
        caseInsensitiveMatch: capacitySections.find(s => s.sectionName.toLowerCase() === sectionName.toLowerCase()),
        // Check if sectionName contains the backend name or vice versa
        containsMatch: capacitySections.find(s => 
          s.sectionName.toLowerCase().includes(sectionName.toLowerCase()) ||
          sectionName.toLowerCase().includes(s.sectionName.toLowerCase())
        )
      });
      
      // DEBUG: Check if this section has capacity_only mode in the original data
      if (sectionData) {
        console.log('🔍 DEBUG: Section data found:', {
          sectionName: sectionData.sectionName,
          vehicleType: sectionData.vehicleType,
          totalCapacity: sectionData.totalCapacity,
          availableCapacity: sectionData.availableCapacity,
          // Check for section_mode in the section data
          section_mode: (sectionData as any).section_mode,
          mode: (sectionData as any).mode,
          type: (sectionData as any).type,
          allProperties: Object.keys(sectionData)
        });
        
        // Specifically check if this is a capacity_only section
        if ((sectionData as any).section_mode === 'capacity_only') {
          console.log('🎯 CAPACITY-ONLY SECTION BEING PROCESSED:', sectionName);
          console.log('🎯 Full capacity-only section data:', sectionData);
        }
      } else {
        // DEBUG: Try to find what section might match
        console.log('🔧 DEBUG: No section data found for:', sectionName, 'Available sections:', capacitySections.map(s => ({
          name: s.sectionName,
          vehicleType: s.vehicleType,
          section_mode: (s as any).section_mode
        })));
      }
      
      // Fallback for FPA sections if backend returns wrong data
      if (!sectionData && isFPACapacitySection && selectedAreaForSpots?.name?.toLowerCase().includes('fpa')) {
        console.log(`🔧 Using fallback data for FPA section: ${sectionName}`);
        // Use the layout data capacities
        const fallbackCapacities: { [key: string]: { total: number, available: number } } = {
          'E': { total: 15, available: 15 },
          'I': { total: 10, available: 10 },
          'SD': { total: 25, available: 25 }
        };
        
        const fallback = fallbackCapacities[sectionName];
        if (fallback) {
          sectionData = {
            sectionId: -1,
            sectionName: sectionName,
            vehicleType: 'motorcycle',
            totalCapacity: fallback.total,
            availableCapacity: fallback.available,
            totalUsed: 0,
            utilizationRate: '0.0',
            status: 'active',
            isUserBooked: false,
            parkedCount: 0,
            reservedCount: 0
          };
          console.log(`🔧 Created fallback section data for ${sectionName}:`, sectionData);
        }
      }
      
      if (sectionData) {
        // Create a mock spotStatus for capacity sections
        spotStatus = {
          id: -1,
          spot_number: sectionName,
          status: 'available',
          spot_type: 'capacity_section',
          section_name: sectionName,
          is_user_booked: 0,
          totalCapacity: sectionData.totalCapacity,
          availableCapacity: sectionData.availableCapacity,
          utilizationRate: ((sectionData.totalCapacity - sectionData.availableCapacity) / sectionData.totalCapacity) * 100
        };
      }
    }
    
    const status = spotStatus?.status || 'unknown';
    const isUserBooked = spotStatus?.is_user_booked === true || (typeof spotStatus?.is_user_booked === 'number' && spotStatus.is_user_booked === 1);
    
    console.log('📍 Spot pressed:', spot.spotNumber || spot.id, 'Status:', status, 'Found spotStatus:', !!spotStatus);
    console.log('🔍 DEBUG: spotStatus details:', spotStatus);
    console.log('🔍 DEBUG: spot_type check:', spotStatus?.spot_type, '=== capacity_section?', spotStatus?.spot_type === 'capacity_section');
    
    // Build detailed message for Alert
    let message = `Section: ${spot.spotNumber || spot.id}\n`;
    
    // For capacity sections, show utilization instead of status
    if (spotStatus?.spot_type === 'capacity_section') {
      console.log('🎯 ENTERING CAPACITY SECTION LOGIC for:', spot.spotNumber || spot.id);
      const utilizationRate = spotStatus.utilizationRate || 0;
      message += `Utilization: ${utilizationRate.toFixed(1)}%\n`;
      
      if (spotStatus.totalCapacity) {
        const usedCapacity = spotStatus.totalCapacity - spotStatus.availableCapacity;
        message += `Used: ${usedCapacity}/${spotStatus.totalCapacity} spots\n`;
        message += `Available: ${spotStatus.availableCapacity} spots\n`;
      }
      
      if (spotStatus?.section_name) {
        message += `Section Name: ${spotStatus.section_name}\n`;
      }
    } else {
      console.log('❌ NOT ENTERING CAPACITY SECTION LOGIC - using regular spot logic');
      // For regular parking spots, show status
      const status = spotStatus?.status || 'unknown';
      message += `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}\n`;
      
      if (spotStatus?.spot_type) {
        message += `Vehicle Type: ${spotStatus.spot_type}\n`;
      }
      
      if (spotStatus?.section_name) {
        message += `Section: ${spotStatus.section_name}\n`;
      }
    }
    
    if (selectedAreaForSpots?.name) {
      message += `Parking Area: ${selectedAreaForSpots.name}\n`;
    }
    
    if (isUserBooked) {
      message += `\n✓ This is your reserved parking spot`;
    }
    
    // Show spot details with Alert (simple and effective)
    const alertTitle = spotStatus?.spot_type === 'capacity_section' ? 'Capacity Section Details' : 'Parking Spot Details';
    Alert.alert(
      alertTitle,
      message,
      [{ text: 'OK' }]
    );
  };

  // Fetch capacity sections from database (same as attendant)
  const fetchCapacitySections = async (areaId: number) => {
    try {
      console.log('🔄 Fetching capacity sections from database for area:', areaId, 'Area name:', selectedAreaForSpots?.name);
      const response = await ApiService.getCapacityStatus(areaId);
      
      // DEBUG: Log the raw API response
      console.log('🔍 RAW API RESPONSE:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('🔄 Backend returned capacity sections:', response.data.length, 'sections');
        console.log('🔄 Capacity section names:', response.data.map((s: any) => s.sectionName));
        
        // DEBUG: Log all section data to identify capacity-based sections
        console.log('🔍 DEBUG: All sections data received:');
        response.data.forEach((section: any, index: number) => {
          console.log(`🔍 Section ${index + 1}:`, {
            sectionId: section.sectionId,
            sectionName: section.sectionName,
            vehicleType: section.vehicleType,
            totalCapacity: section.totalCapacity,
            availableCapacity: section.availableCapacity,
            activeReservations: section.activeReservations,
            utilizationRate: section.utilizationRate,
            // Check for section_mode or similar properties
            section_mode: (section as any).section_mode,
            mode: (section as any).mode,
            type: (section as any).type,
            category: (section as any).category,
            // Log all properties to see what's actually available
            allProperties: Object.keys(section)
          });
          
          // DEBUG: Specifically check if this is a capacity_only section
          if ((section as any).section_mode === 'capacity_only') {
            console.log('🎯 CAPACITY-ONLY SECTION FOUND:', section.sectionName);
            console.log('🎯 Full capacity-only section data:', section);
          }
        });
        
        // DEBUG: Check what sections we expect from SVG vs what we got from backend
        console.log('🔍 EXPECTED SECTIONS FROM SVG: V, VB, X (for Main Campus) or E, I, SD (for FPA)');
        console.log('🔍 ACTUAL SECTIONS FROM BACKEND:', response.data.map((s: any) => s.sectionName));
        
        // Store all sections so both car and motorcycle layouts have data
        console.log('🚗 All capacity sections returned:', response.data.length);
        console.log('🚗 Setting capacitySections state with:', response.data.length, 'sections');
        
        // DEBUG: Check if any capacity-only sections exist regardless of vehicle type
        const capacityOnlySections = response.data.filter(section => 
          (section as any).section_mode === 'capacity_only'
        );
        if (capacityOnlySections.length > 0) {
          console.log('🎯 FOUND CAPACITY-ONLY SECTIONS:', capacityOnlySections.length);
          capacityOnlySections.forEach(section => {
            console.log('🎯 Capacity-only section:', section.sectionName, {
              vehicleType: section.vehicleType,
              totalCapacity: section.totalCapacity,
              availableCapacity: section.availableCapacity
            });
          });
        } else {
          console.log('ℹ️ No capacity-only sections found in response');
        }
        
        setCapacitySections(response.data);
      } else {
        console.log('❌ Failed to fetch capacity sections:', (response as any).message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error fetching capacity sections:', error);
    }
  };

  // Handle parking area card press - show parking layout
  const handleAreaCardPress = async (area: any) => {
    setSelectedAreaForSpots(area);
    setIsParkingSpotsModalVisible(true);
    setIsLoadingSvg(true);
    setSvgContent('');
    
    try {
      // Load spot statuses in parallel with SVG
      loadSpotStatuses(area.id);
      
      // Load capacity sections from database
      await fetchCapacitySections(area.id);
      
      // Load parking layout SVG
      const layoutResponse = await ApiService.getParkingAreaLayout(area.id);
      
      // DEBUG: Log the raw layout response to see if it contains sections
      console.log('🔍 RAW LAYOUT RESPONSE:', JSON.stringify(layoutResponse, null, 2));
      
      if (layoutResponse.success && layoutResponse.data.hasLayout && layoutResponse.data.layoutSvg) {
        const svg = layoutResponse.data.layoutSvg;
        setSvgContent(svg);
        
        // DEBUG: Check if layout response contains sections data
        if ((layoutResponse.data as any).sections) {
          console.log('🎯 FOUND SECTIONS IN LAYOUT DATA:', (layoutResponse.data as any).sections);
          
          // Extract capacity-only sections from layout data
          const layoutSections = (layoutResponse.data as any).sections;
          const capacityOnlySections = layoutSections.filter((section: any) => 
            section.section_data && section.section_data.section_mode === 'capacity_only'
          );
          
          console.log('🎯 CAPACITY-ONLY SECTIONS FROM LAYOUT:', capacityOnlySections);
          capacityOnlySections.forEach((section: any) => {
            console.log('🎯 Capacity-only section details:', {
              section_name: section.section_data.section_name,
              type: section.section_data.type,
              section_mode: section.section_data.section_mode,
              capacity: section.section_data.capacity,
              position: section.position
            });
          });

          // Build fallback capacity data from layout when backend doesn't provide it
          if (capacityOnlySections.length > 0) {
            const layoutCapacityData = capacityOnlySections.map((section: any, index: number) => {
              const sectionData = section.section_data || {};
              const sectionName = sectionData.section_name || `SECTION_${index}`;
              const totalCapacity = sectionData.capacity?.total ?? sectionData.capacity ?? sectionData.total_capacity ?? sectionData.totalCapacity ?? 0;
              const availableCapacity = sectionData.capacity?.available ?? sectionData.available_capacity ?? sectionData.availableCapacity ?? totalCapacity;
              const resolvedAvailable = typeof availableCapacity === 'number' ? availableCapacity : totalCapacity;
              const resolvedTotal = typeof totalCapacity === 'number' && totalCapacity > 0 ? totalCapacity : resolvedAvailable;
              return {
                sectionId: sectionData.section_id ?? section.section_id ?? section.sectionId ?? -(index + 1),
                sectionName,
                vehicleType: sectionData.vehicle_type || sectionData.type || 'car',
                totalCapacity: resolvedTotal,
                availableCapacity: resolvedAvailable,
                activeReservations: sectionData.active_reservations ?? 0,
                utilizationRate: resolvedTotal > 0 ? (((resolvedTotal - resolvedAvailable) / resolvedTotal) * 100).toFixed(1) : '0.0',
                __fallback: true,
              };
            });

            setCapacitySections((prev) => {
              if (!prev || prev.length === 0) {
                console.log('⬅️ Using layout capacity data because backend returned none.');
                return layoutCapacityData;
              }

              const existingNames = new Set(prev.map(section => section.sectionName.toLowerCase()));
              const merged = [...prev];
              let addedCount = 0;
              layoutCapacityData.forEach(section => {
                if (!existingNames.has(section.sectionName.toLowerCase())) {
                  merged.push(section);
                  existingNames.add(section.sectionName.toLowerCase());
                  addedCount += 1;
                }
              });
              if (addedCount > 0) {
                console.log(`➕ Added ${addedCount} fallback capacity sections from layout data.`);
              }
              return merged;
            });
          }
        } else {
          console.log('ℹ️ No sections data found in layout response');
          console.log('🔍 Available layout data properties:', Object.keys(layoutResponse.data));
          
          // DEBUG: Try to extract capacity sections from SVG directly
          console.log('🔍 Attempting to extract capacity sections from SVG...');
          const svg = layoutResponse.data.layoutSvg;
          
          // Look for capacity section groups in the SVG
          const capacitySectionRegex = /<g[^>]*transform="translate\([^)]+\)"[^>]*>[\s\S]*?<\/g>/g;
          const sectionGroups = svg.match(capacitySectionRegex);
          
          if (sectionGroups) {
            console.log('🔍 Found section groups in SVG:', sectionGroups.length);
            
            sectionGroups.forEach((group, index) => {
              // Look for section labels (text elements with single letters)
              const textMatch = group.match(/<text[^>]*>([A-Z]+)<\/text>/);
              if (textMatch) {
                const sectionName = textMatch[1];
                console.log(`🎯 Found capacity section ${index + 1}:`, {
                  sectionName,
                  group: group.substring(0, 200) + '...',
                  // Check if it has capacity gradient (indicating capacity-only)
                  hasCapacityGradient: group.includes('capacityGradient'),
                  // Look for section data attributes
                  hasSectionData: group.includes('section_data'),
                  hasSectionMode: group.includes('section_mode')
                });
                
                // Check if this looks like a capacity-only section
                if (group.includes('capacityGradient')) {
                  console.log(`🎯 ${sectionName} appears to be a capacity-only section (has capacityGradient)`);
                }
              }
            });
          } else {
            console.log('🔍 No section groups found in SVG');
          }
        }
        
        // Parse SVG for clickable elements
        const layoutSections = (layoutResponse.data as any)?.sections || [];
        const spots = parseSvgForClickableElements(svg, layoutSections);
        setClickableSpots(spots);
        
        // Calculate aspect ratio from SVG (but use fixed standard size)
        const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
        const widthMatch = svg.match(/<svg[^>]*width=["']([^"']+)["']/);
        const heightMatch = svg.match(/<svg[^>]*height=["']([^"']+)["']/);
        
        // Use fixed aspect ratio for consistent sizing across all layouts
        const fixedAspectRatio = 3.5;
        setSvgAspectRatio(fixedAspectRatio);
        console.log(`🎯 Using fixed aspect ratio: ${fixedAspectRatio.toFixed(3)} for consistent layout sizing`);
      } else {
        console.log('No layout available for this area');
        setSvgContent('');
        setClickableSpots([]);
      }
    } catch (error) {
      console.error('Error fetching parking layout:', error);
      setSvgContent('');
    } finally {
      setIsLoadingSvg(false);
    }
  };

  const handleCloseParkingSpotsModal = () => {
    setIsParkingSpotsModalVisible(false);
    setSelectedAreaForSpots(null);
    setSvgContent('');
    setClickableSpots([]);
    setSpotStatuses(new Map());
    setCapacitySections([]);
  };

  useEffect(() => {
    if (
      !isParkingSpotsModalVisible ||
      !svgContent ||
      !layoutScrollViewRef.current ||
      !layoutVerticalScrollViewRef.current ||
      svgDimensions.width <= 0 ||
      svgDimensions.height <= 0
    ) {
      return;
    }

    return undefined;
  }, [
    isParkingSpotsModalVisible,
    svgContent,
    svgDimensions,
    layoutScrollViewRef,
    layoutVerticalScrollViewRef,
    selectedAreaForSpots
  ]);

  // Primary realtime updates for parking layout modal
  useEffect(() => {
    if (!isAuthenticated || !isParkingSpotsModalVisible || !selectedAreaForSpots?.id) {
      return;
    }

    const areaId = Number(selectedAreaForSpots.id);
    const userId = user?.user_id ? Number(user.user_id) : undefined;
    let lastRefreshAt = 0;

    const refreshAreaRealtime = async () => {
      const now = Date.now();
      if (now - lastRefreshAt < 1500) return;
      lastRefreshAt = now;

      try {
        await Promise.all([
          loadSpotStatuses(areaId),
          fetchCapacitySections(areaId)
        ]);
      } catch (error) {
        console.error('❌ Home realtime refresh failed:', error);
      }
    };

    const onSpotsUpdated = (payload: any) => {
      if (payload?.areaId && Number(payload.areaId) !== areaId) return;
      refreshAreaRealtime();
    };

    const onCapacityUpdated = onSpotsUpdated;

    RealtimeService.connect();
    RealtimeService.subscribe({ areaId, userId });
    RealtimeService.on('spots:updated', onSpotsUpdated);
    RealtimeService.on('capacity:updated', onCapacityUpdated);

    return () => {
      RealtimeService.off('spots:updated', onSpotsUpdated);
      RealtimeService.off('capacity:updated', onCapacityUpdated);
      RealtimeService.unsubscribe({ areaId, userId });
    };
  }, [isAuthenticated, isParkingSpotsModalVisible, selectedAreaForSpots?.id, user?.user_id]);

  // Auto-center SVG when modal opens
  useEffect(() => {
    if (
      isParkingSpotsModalVisible &&
      svgContent &&
      layoutScrollViewRef.current &&
      layoutVerticalScrollViewRef.current &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0 &&
      clickableSpots.length > 0
    ) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        const horizontalScrollView = layoutScrollViewRef.current;
        const verticalScrollView = layoutVerticalScrollViewRef.current;
        
        if (horizontalScrollView && verticalScrollView) {
          // Get the actual scroll view dimensions
          horizontalScrollView.measure((fx: any, fy: any, hWidth: any, hHeight: any, hPx: any, hPy: any) => {
            verticalScrollView.measure((vfx: any, vfy: any, vWidth: any, vHeight: any, vPx: any, vPy: any) => {
              const horizontalViewport = hWidth || 800; // Fallback width
              const verticalViewport = vHeight || 600; // Fallback height
              
              // Extract viewBox from SVG
              const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
              let viewBoxX = 0;
              let viewBoxY = 0;
              let viewBoxWidth = 276;
              let viewBoxHeight = 322;
              if (viewBoxMatch) {
                const parts = viewBoxMatch[1].trim().split(/[\s,]+/).filter(p => p).map(Number);
                if (parts.length >= 4) {
                  viewBoxX = parts[0];
                  viewBoxY = parts[1];
                  viewBoxWidth = parts[2];
                  viewBoxHeight = parts[3];
                }
              }
              
              // Calculate aspect ratios
              const viewBoxAspectRatio = viewBoxWidth / viewBoxHeight;
              const containerAspectRatio = svgDimensions.width / svgDimensions.height;
              
              // With preserveAspectRatio="xMidYMid meet", calculate actual rendered size
              let renderedWidth = svgDimensions.width;
              let renderedHeight = svgDimensions.height;
              let offsetX = 0;
              let offsetY = 0;
              
              if (viewBoxAspectRatio > containerAspectRatio) {
                // ViewBox is wider - fit to width
                renderedWidth = svgDimensions.width;
                renderedHeight = svgDimensions.width / viewBoxAspectRatio;
                offsetY = (svgDimensions.height - renderedHeight) / 2; // Center vertically
              } else {
                // ViewBox is taller - fit to height
                renderedWidth = svgDimensions.height * viewBoxAspectRatio;
                renderedHeight = svgDimensions.height;
                offsetX = (svgDimensions.width - renderedWidth) / 2; // Center horizontally
              }
              
              // Calculate scale factors (viewBox units to rendered pixels)
              const scaleX = renderedWidth / viewBoxWidth;
              const scaleY = renderedHeight / viewBoxHeight;
              
              // Find the bounds of all parking spots
              let minSpotX = Infinity, maxSpotX = -Infinity;
              let minSpotY = Infinity, maxSpotY = -Infinity;
              
              clickableSpots.forEach(spot => {
                const spotXInViewBox = spot.x - viewBoxX;
                const spotYInViewBox = spot.y - viewBoxY;
                const renderedSpotX = spotXInViewBox * scaleX + offsetX;
                const renderedSpotY = spotYInViewBox * scaleY + offsetY;
                
                minSpotX = Math.min(minSpotX, renderedSpotX);
                maxSpotX = Math.max(maxSpotX, renderedSpotX);
                minSpotY = Math.min(minSpotY, renderedSpotY);
                maxSpotY = Math.max(maxSpotY, renderedSpotY);
              });
              
              // Calculate the center of the parking spots content
              const contentCenterX = (minSpotX + maxSpotX) / 2;
              const contentCenterY = (minSpotY + maxSpotY) / 2;
              
              // Calculate scroll positions to center the content
              const horizontalScrollTo = Math.max(0, contentCenterX - horizontalViewport / 2);
              const verticalScrollTo = Math.max(0, contentCenterY - verticalViewport / 2);
              
              console.log('🎯 Auto-centering SVG based on parking spots:', {
                parkingArea: selectedAreaForSpots?.name,
                contentCenterX,
                contentCenterY,
                horizontalScrollTo,
                verticalScrollTo,
                spotBounds: { minX: minSpotX, maxX: maxSpotX, minY: minSpotY, maxY: maxSpotY },
                viewport: { width: horizontalViewport, height: verticalViewport },
                viewBox: { x: viewBoxX, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight }
              });
              
              // Force scroll with multiple attempts to ensure it works
              try {
                // First attempt - immediate scroll
                horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
                verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
                
                // Second attempt - animated scroll after a short delay
                setTimeout(() => {
                  horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
                  verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
                }, 100);
                
                // Third attempt - ensure scroll position is set
                setTimeout(() => {
                  horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
                  verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
                }, 300);
              } catch (error) {
                console.error('❌ Error during auto-centering:', error);
              }
            });
          });
        }
      }, 1200); // Increased delay to ensure modal is fully rendered and spots are loaded
    }
  }, [
    isParkingSpotsModalVisible,
    svgContent,
    svgDimensions,
    clickableSpots, // Add dependency to trigger when spots are loaded
    selectedAreaForSpots?.name // Trigger when area name changes
  ]);

  const handleOpenFrequentSpotsModal = async () => {
    try {
      setIsLoadingFrequentSpotsModal(true);
      setIsFrequentSpotsModalVisible(true);

      const response = await ApiService.getFrequentSpots(100);
      if (response.success && response.data?.frequent_spots) {
        setFrequentSpotsForModal(response.data.frequent_spots);
      } else {
        console.log('❌ Failed to load frequent spots for modal');
        Alert.alert('Error', 'Failed to load frequent spots');
        setFrequentSpotsForModal([]);
      }
    } catch (error) {
      console.error('Error fetching frequent spots:', error);
      Alert.alert('Error', 'Failed to load frequent spots');
      setFrequentSpotsForModal([]);
    } finally {
      setIsLoadingFrequentSpotsModal(false);
    }
  };

  const handleCloseFrequentSpotsModal = () => {
    setIsFrequentSpotsModalVisible(false);
    setFrequentSpotsForModal([]);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    const scrollPercentage = maxScrollX > 0 ? contentOffset.x / maxScrollX : 0;
    scrollProgress.setValue(scrollPercentage);
  };

  const handleVehicleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    const scrollPercentage = maxScrollX > 0 ? contentOffset.x / maxScrollX : 0;
    vehicleScrollProgress.setValue(Math.min(scrollPercentage, 1));
  };



  // Header Balance component
  const HeaderBalance = () => (
    <View style={{
      alignItems: 'flex-end',
      padding: 4,
    }}>
      <View style={{
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }}>
        <Text style={{
          fontSize: 10,
          fontWeight: 'bold',
          color: colors.textInverse,
        }}>
          {formatHoursToHHMM(userBalance)} Tokens
        </Text>
      </View>
    </View>
  );

  return (
    <View style={homeScreenStyles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={true} />
      <SharedHeader 
        title="TapPark" 
        rightComponent={<HeaderBalance />}
      />

      {/* ScrollView Container - targeted for loading overlay */}
      <View style={homeScreenStyles.scrollViewContainer}>
        <ScrollView style={homeScreenStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Slogan */}
        <View style={homeScreenStyles.sloganSection}>
          <Text style={homeScreenStyles.parkingText}>PARKING</Text>
          <View style={homeScreenStyles.madeEasyContainer}>
            <Text style={homeScreenStyles.madeText}>made </Text>
            <Text style={homeScreenStyles.easyText}>easy!</Text>
          </View>
        </View>

        {/* Registered Vehicle Section */}
        <View style={homeScreenStyles.section}>
          <View style={homeScreenStyles.sectionHeader}>
            <SvgXml xml={isDarkMode ? darkLineGraphIconSvg : lineGraphIconSvg} width={16} height={16} />
            <Text style={homeScreenStyles.sectionTitle}>Registered Vehicle</Text>
          </View>
          
          {isLoadingVehicles ? (
            <View style={homeScreenStyles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={homeScreenStyles.loadingText}>Loading vehicles...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View style={homeScreenStyles.emptyStateContainer}>
              <Text style={homeScreenStyles.emptyStateText}>No vehicles registered yet</Text>
              <Text style={homeScreenStyles.emptyStateSubtext}>Add your first vehicle to get started</Text>
              <TouchableOpacity style={homeScreenStyles.addVehicleButton} onPress={handleAddVehicle}>
                <Text style={homeScreenStyles.addVehicleButtonText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={homeScreenStyles.horizontalScroll}
              contentContainerStyle={homeScreenStyles.horizontalScrollContent}
              onScroll={handleVehicleScroll}
              scrollEventThrottle={16}
              onLayout={(event) => {
                // Store the container width when layout is measured
                const layoutWidth = event.nativeEvent.layout.width;
                vehicleScrollViewWidth.current = layoutWidth;
                console.log('🚗 Vehicle ScrollView layout width:', layoutWidth);
                // Re-check scrollability if we already have content width
                if (layoutWidth > 0 && vehicleContentWidth.current > 0) {
                  const canScroll = vehicleContentWidth.current > layoutWidth + 20;
                  console.log('🚗 Vehicle re-check after layout:', { 
                    contentWidth: vehicleContentWidth.current, 
                    containerWidth: layoutWidth, 
                    canScroll 
                  });
                  setCanScrollVehicles(canScroll);
                }
              }}
              onContentSizeChange={(contentWidth) => {
                // Store content width
                vehicleContentWidth.current = contentWidth;
                // Check if content width exceeds container width
                const containerWidth = vehicleScrollViewWidth.current || screenWidth;
                // Add small threshold (20px) to account for padding/margins and ensure we detect overflow
                const canScroll = contentWidth > containerWidth + 20;
                console.log('🚗 Vehicle content check:', { 
                  contentWidth, 
                  containerWidth, 
                  canScroll, 
                  vehicleCount: vehicles.length,
                  threshold: containerWidth + 20,
                  screenWidth
                });
                setCanScrollVehicles(canScroll);
              }}
            >
              {(vehicles || []).map((vehicle, index) => (
                <TouchableOpacity key={vehicle.id || index} style={homeScreenStyles.vehicleCard} onPress={() => handleVehicleCardPress(vehicle)}>
                  <View style={homeScreenStyles.vehicleIconContainer}>
                    <SvgXml 
                      xml={getVehicleIcon(vehicle.vehicle_type)} 
                      width={getResponsiveSize(55)} 
                      height={getResponsiveSize(vehicle.vehicle_type.toLowerCase() === 'car' ? 33 : 40)} 
                    />
                  </View>
                  <View style={homeScreenStyles.vehicleInfoContainer}>
                    <View>
                      <Text style={homeScreenStyles.vehicleLabel}>Brand and Model</Text>
                      <Text style={homeScreenStyles.vehicleValue}>{vehicle.brand || 'N/A'} - {vehicle.model || 'N/A'}</Text>
                    </View>
                    <View>
                      <Text style={homeScreenStyles.vehicleLabel}>Display Name</Text>
                      <Text style={homeScreenStyles.vehicleValue}>{vehicle.vehicle_type}</Text>
                    </View>
                    <View>
                      <Text style={homeScreenStyles.vehicleLabel}>Plate Number</Text>
                      <Text style={homeScreenStyles.vehicleValue}>{vehicle.plate_number}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  homeScreenStyles.vehicleCard,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={handleAddVehicle}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
                <Text style={[homeScreenStyles.vehicleLabel, { marginTop: 8, textAlign: 'center' }]}>Add Vehicle</Text>
                <Text style={[homeScreenStyles.vehicleValue, { textAlign: 'center' }]}>Create new vehicle</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Scroll Indicator for Registered Vehicles - Only show when 3+ vehicles and content overflows */}
        {!isLoadingVehicles && (vehicles.length + 1) >= 3 && canScrollVehicles && (
          <View style={homeScreenStyles.progressSection}>
            <View style={homeScreenStyles.progressContainer}>
              <View style={homeScreenStyles.progressTrack}>
                <Animated.View 
                  style={[
                    homeScreenStyles.scrollHandle,
                    {
                      left: vehicleScrollProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.max(0, screenWidth - 40 - getResponsiveSize(20))],
                        extrapolate: 'clamp',
                      }),
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Frequently Used Parking Space Section */}
        <View style={homeScreenStyles.section}>
          <View style={homeScreenStyles.sectionHeader}>
            <SvgXml xml={isDarkMode ? darkProfitIconSvg : profitIconSvg} width={16} height={16} />
            <Text style={homeScreenStyles.sectionTitle}>Frequently used parking space</Text>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={homeScreenStyles.horizontalScroll}
            contentContainerStyle={homeScreenStyles.horizontalScrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onLayout={(event) => {
              // Store the container width when layout is measured
              const layoutWidth = event.nativeEvent.layout.width;
              frequentSpotsScrollViewWidth.current = layoutWidth;
              console.log('📍 Frequent Spots ScrollView layout width:', layoutWidth);
              // Re-check scrollability if we already have content width
              if (layoutWidth > 0 && frequentSpotsContentWidth.current > 0) {
                const canScroll = frequentSpotsContentWidth.current > layoutWidth + 20;
                console.log('📍 Frequent spots re-check after layout:', { 
                  contentWidth: frequentSpotsContentWidth.current, 
                  containerWidth: layoutWidth, 
                  canScroll 
                });
                setCanScrollFrequentSpots(canScroll);
              }
            }}
            onContentSizeChange={(contentWidth) => {
              // Store content width
              frequentSpotsContentWidth.current = contentWidth;
              // Check if content width exceeds container width
              const containerWidth = frequentSpotsScrollViewWidth.current || screenWidth;
              // Add small threshold (20px) to account for padding/margins and ensure we detect overflow
              const canScroll = contentWidth > containerWidth + 20;
              console.log('📍 Frequent spots content check:', { 
                contentWidth, 
                containerWidth, 
                canScroll, 
                spotsCount: frequentSpots.length,
                threshold: containerWidth + 20,
                screenWidth
              });
              setCanScrollFrequentSpots(canScroll);
            }}
          >
            {isLoadingFrequentSpots ? (
              <View style={homeScreenStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={homeScreenStyles.loadingText}>Loading frequent spots...</Text>
              </View>
            ) : frequentSpots.length === 0 ? (
              <View style={homeScreenStyles.emptyContainer}>
                <Text style={homeScreenStyles.emptyText}>No frequent parking spots found</Text>
                <Text style={homeScreenStyles.emptySubtext}>Your frequently used spots will appear here</Text>
              </View>
            ) : (
              (frequentSpots || []).map((spot, index) => (
                <View key={`${spot.parking_spot_id}-${index}`} style={homeScreenStyles.parkingCard}>
                  <View style={homeScreenStyles.locationHeader}>
                    <View style={homeScreenStyles.locationTextContainer}>
                      <Text style={homeScreenStyles.parkingLocation}>{spot.location_name.toUpperCase()}</Text>
                      <Text style={homeScreenStyles.parkingSpotId}>{generateSpotId(spot.location_name, spot.spot_number)}</Text>
                    </View>
                    <Ionicons 
                      name="location" 
                      size={32} 
                      color={getLandmarkIconColor(undefined, undefined, spot.status)} 
                    />
                  </View>
                  <Text style={homeScreenStyles.parkingLabel}>Time Slot</Text>
                  <View style={homeScreenStyles.timeSlotContainer}>
                    <Text style={homeScreenStyles.parkingTime}>
                      {spot.current_reservation 
                        ? `${formatTime(spot.current_reservation.start_time)} - ${formatTime(spot.current_reservation.end_time || new Date(Date.now() + 2*60*60*1000).toISOString())}`
                        : 'Available Now'
                      }
                    </Text>
                  </View>
                  <Text style={homeScreenStyles.parkingPrice}>Used {spot.usage_count} times</Text>
                  <View style={homeScreenStyles.parkingStatusContainer}>
                    <Text style={spot.status === 'AVAILABLE' ? homeScreenStyles.availableStatus : homeScreenStyles.occupiedStatus}>
                      {spot.status}
                    </Text>
                    <TouchableOpacity 
                      style={homeScreenStyles.bookButton}
                      onPress={() => handleBookFrequentSpot(spot)}
                    >
                      <Text style={homeScreenStyles.bookButtonText}>BOOK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

          </ScrollView>

          {/* See All Spots Button */}
          <TouchableOpacity style={homeScreenStyles.seeAllButton} onPress={handleOpenFrequentSpotsModal}>
            <SvgXml xml={isDarkMode ? darkDoubleUpIconSvg : doubleUpIconSvg} width={16} height={16} />
            <Text style={homeScreenStyles.seeAllText}>Frequent spots</Text>
          </TouchableOpacity>
        </View>

        {/* Scroll Indicator Section - Only show when 2+ frequent spots and content overflows */}
        {!isLoadingFrequentSpots && frequentSpots.length >= 2 && canScrollFrequentSpots && (
          <View style={homeScreenStyles.progressSection}>
            <View style={homeScreenStyles.progressContainer}>
              <View style={homeScreenStyles.progressTrack}>
              <Animated.View 
                style={[
                    homeScreenStyles.scrollHandle,
                  {
                    left: scrollProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.max(0, screenWidth - 40 - getResponsiveSize(20))], // Account for padding (20px each side) and handle width
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              />
            </View>
          </View>
        </View>
        )}

        {/* Select Parking Area Section */}
        <View style={homeScreenStyles.section}>
          <View style={homeScreenStyles.sectionHeader}>
            <SvgXml xml={isDarkMode ? darkCheckboxIconSvg : checkboxIconSvg} width={16} height={16} />
            <Text style={homeScreenStyles.sectionTitle}>Select Parking Area</Text>
          </View>
          
          {isLoadingParkingAreas ? (
            <View style={homeScreenStyles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={homeScreenStyles.loadingText}>Loading parking areas...</Text>
            </View>
          ) : parkingAreas.length === 0 ? (
            <View style={homeScreenStyles.emptyStateContainer}>
              <Text style={homeScreenStyles.emptyStateText}>No parking areas available</Text>
            </View>
          ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={homeScreenStyles.horizontalScroll}
            contentContainerStyle={homeScreenStyles.horizontalScrollContent}
          >
              {parkingAreas.map((area) => (
                <TouchableOpacity 
                  key={area.id}
                  style={homeScreenStyles.areaCard}
                  onPress={() => handleAreaCardPress(area)}
                >
                  <View style={homeScreenStyles.areaHeaderRow}>
                    <View style={homeScreenStyles.areaTextContainer}>
                      <Text
                        style={homeScreenStyles.areaName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {area.name?.toUpperCase() || 'PARKING AREA'}
                      </Text>
                      <Text
                        style={[homeScreenStyles.areaSpotsText, { color: colors.textSecondary }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {getAreaSpotsText(area)}
                      </Text>
                      {getAreaCapacityText(area) && (
                        <Text
                          style={[homeScreenStyles.areaCapacityText, { color: colors.textSecondary }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {getAreaCapacityText(area)}
                        </Text>
                      )}
                    </View>
                    <View style={homeScreenStyles.areaMarkerSlot}>
                      <Ionicons
                        name="location"
                        size={36}
                        color={getLandmarkIconColor(area.available_spots, area.total_spots)}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
          )}
        </View>

      </ScrollView>
      </View>

      {/* Parking Booking Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={homeScreenStyles.modalOverlay}>
          <View style={homeScreenStyles.modalContainer}>
            <Text style={homeScreenStyles.modalTitle}>Book a Parking Slot</Text>
            
            {/* Step Flow Indicator */}
            <StepFlowIndicator 
              currentStep={currentBookingStep}
              totalSteps={3}
              stepLabels={bookingSteps}
            />
            
            <Text style={homeScreenStyles.modalSubtitle}>Choose a parking area:</Text>
            
            {isLoadingParkingAreas ? (
              <View style={homeScreenStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={homeScreenStyles.loadingText}>Loading parking areas...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {Object.entries(groupParkingAreasByLocation(parkingAreas || [])).map(([locationPrefix, areas]) => (
                  <View key={locationPrefix} style={homeScreenStyles.parkingAreaSection}>
                    <Text style={homeScreenStyles.parkingAreaSectionTitle}>
                      {locationPrefix.toUpperCase()}
                    </Text>
                    <View style={homeScreenStyles.parkingAreaButtons}>
                      {areas.map((area) => (
                        <TouchableOpacity 
                          key={area.id}
                          style={homeScreenStyles.parkingAreaButton}
                          onPress={() => handleParkingAreaSelect(area)}
                        >
                          <Text style={homeScreenStyles.parkingAreaButtonText}>{area.name}</Text>
                          <Text style={homeScreenStyles.parkingAreaLocation}>
                            {area.location || area.address || area.location_name || 'Location not available'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {Object.keys(groupParkingAreasByLocation(parkingAreas || [])).indexOf(locationPrefix) < 
                     Object.keys(groupParkingAreasByLocation(parkingAreas || [])).length - 1 && (
                      <View style={homeScreenStyles.parkingAreaSectionDivider} />
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity style={homeScreenStyles.closeButton} onPress={handleCloseModal}>
              <Text style={homeScreenStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={isBookingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseBookingModal}
      >
        <View style={homeScreenStyles.modalOverlay}>
          <View style={homeScreenStyles.bookingModalContainer}>
            <Text style={homeScreenStyles.bookingModalTitle}>Book a Parking Slot</Text>
            
            {/* Step Flow Indicator */}
            <StepFlowIndicator 
              currentStep={2}
              totalSteps={3}
              stepLabels={bookingSteps}
            />
            
            <Text style={homeScreenStyles.bookingModalText}>
              An available slot has been automatically assigned for you at {selectedParkingArea?.name}:
            </Text>
            <Text style={homeScreenStyles.assignedSlotId}>{assignedSlot}</Text>
            {assignedSpotDetails && (
              <Text style={homeScreenStyles.spotTypeText}>
                Spot Type: {assignedSpotDetails.spot_type?.charAt(0).toUpperCase() + assignedSpotDetails.spot_type?.slice(1)}
              </Text>
            )}
            
            {isLoadingParkingSpots ? (
              <View style={homeScreenStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={homeScreenStyles.loadingText}>Assigning parking spot...</Text>
              </View>
            ) : (
              <TouchableOpacity style={homeScreenStyles.bookNowButton} onPress={handleBookNow}>
                <Text style={homeScreenStyles.bookNowButtonText}>Book Now</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={homeScreenStyles.closeButton} onPress={handleCloseBookingModal}>
              <Text style={homeScreenStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal
        visible={isVehicleSelectionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVehicleSelectionModal}
      >
        <View style={homeScreenStyles.modalOverlay}>
          <View style={homeScreenStyles.vehicleSelectionModalContainer}>
            <View style={homeScreenStyles.vehicleModalHeader}>
              <Text style={homeScreenStyles.vehicleModalTitle}>Select Vehicle for Reservation</Text>
              <TouchableOpacity onPress={handleCloseVehicleSelectionModal}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Step Flow Indicator */}
            <StepFlowIndicator 
              currentStep={0}
              totalSteps={3}
              stepLabels={bookingSteps}
            />
            
            <View style={homeScreenStyles.vehicleTypeInfoContainer}>
              <Text style={homeScreenStyles.vehicleTypeInfoText}>
                {selectedSpotForBooking 
                  ? `💡 Only vehicles compatible with ${selectedSpotForBooking.spot_type} spots are shown`
                  : '💡 Select a vehicle to book a parking spot'
                }
              </Text>
            </View>
            
            {getCompatibleVehicles().length === 0 ? (
              <View style={homeScreenStyles.noCompatibleVehiclesContainer}>
                <Text style={homeScreenStyles.noCompatibleVehiclesText}>
                  No vehicles compatible with this parking spot type
                </Text>
                <Text style={homeScreenStyles.noCompatibleVehiclesSubtext}>
                  Add a {selectedSpotForBooking?.spot_type || 'compatible'} vehicle to your account
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={homeScreenStyles.vehicleSelectionScroll}
                contentContainerStyle={homeScreenStyles.vehicleSelectionScrollContent}
                onScroll={handleVehicleScroll}
                scrollEventThrottle={16}
              >
                {(getCompatibleVehicles() || []).map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      homeScreenStyles.vehicleSelectionCard,
                      selectedVehicle === vehicle.id.toString() && homeScreenStyles.vehicleSelectionCardSelected
                    ]}
                    onPress={() => handleSelectVehicle(vehicle.id.toString())}
                  >
                    <View style={homeScreenStyles.vehicleSelectionIconContainer}>
                      <SvgXml xml={getVehicleIcon(vehicle.vehicle_type)} width={getResponsiveSize(40)} height={getResponsiveSize(40)} />
                    </View>
                    <Text style={homeScreenStyles.vehicleSelectionLabel}>Brand and Model</Text>
                    <Text style={homeScreenStyles.vehicleSelectionValue}>{vehicle.brand || 'N/A'}</Text>
                    <Text style={homeScreenStyles.vehicleSelectionLabel}>Vehicle Type</Text>
                    <Text style={homeScreenStyles.vehicleSelectionValue}>{vehicle.vehicle_type}</Text>
                    {vehicle.plate_number && (
                      <>
                        <Text style={homeScreenStyles.vehicleSelectionLabel}>Plate Number</Text>
                        <Text style={homeScreenStyles.vehicleSelectionValue}>{vehicle.plate_number}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Progress Indicator */}
            <View style={homeScreenStyles.vehicleSelectionProgressContainer}>
              <View style={homeScreenStyles.vehicleSelectionProgressTrack}>
                <Animated.View 
                  style={[
                    homeScreenStyles.vehicleSelectionProgressHandle,
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
                homeScreenStyles.vehicleSelectionBookNowButton,
                (!selectedVehicle || getCompatibleVehicles().length === 0) && homeScreenStyles.vehicleSelectionBookNowButtonDisabled
              ]}
              onPress={handleVehicleBookNow}
              disabled={!selectedVehicle || getCompatibleVehicles().length === 0}
            >
              <Text style={homeScreenStyles.vehicleSelectionBookNowButtonText}>
                {getCompatibleVehicles().length === 0 ? 'No Compatible Vehicles' : 'Book Now'}
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
        <View style={homeScreenStyles.modalOverlay}>
          <View style={homeScreenStyles.mismatchModalContainer}>
            <View style={homeScreenStyles.mismatchModalHeader}>
              <Text style={homeScreenStyles.mismatchModalTitle}>🚗 Vehicle Type Mismatch</Text>
              <TouchableOpacity onPress={() => setShowVehicleMismatchModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={homeScreenStyles.mismatchContent}>
              <Text style={homeScreenStyles.mismatchMessage}>
                Oops! There is a mismatch between your vehicle and this parking spot.
              </Text>
              
              <View style={homeScreenStyles.mismatchDetails}>
                <View style={homeScreenStyles.mismatchItem}>
                  <Text style={homeScreenStyles.mismatchLabel}>Your Vehicle:</Text>
                  <Text style={homeScreenStyles.mismatchValue}>{mismatchData?.vehicleType || 'Unknown'}</Text>
                </View>
                
                <View style={homeScreenStyles.mismatchItem}>
                  <Text style={homeScreenStyles.mismatchLabel}>Spot Type:</Text>
                  <Text style={homeScreenStyles.mismatchValue}>{mismatchData?.spotType || 'Unknown'}</Text>
                </View>
              </View>
              
              <Text style={homeScreenStyles.mismatchSuggestion}>
                💡 Try selecting a different vehicle or choose a different parking spot that matches your vehicle type.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={homeScreenStyles.mismatchCloseButton}
              onPress={() => setShowVehicleMismatchModal(false)}
            >
              <Text style={homeScreenStyles.mismatchCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Parking Spots Modal - Shows Parking Layout */}
      <Modal
        visible={isParkingSpotsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseParkingSpotsModal}
      >
        <View style={homeScreenStyles.modalOverlay}>
          <View style={[homeScreenStyles.modalContainer, { 
            maxHeight: screenHeight * 0.84,
            height: screenHeight * 0.84,
            width: Math.min(screenWidth * 0.92, 1000),
            maxWidth: screenWidth * 0.92,
            padding: getResponsivePadding(16),
          }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: getResponsiveMargin(16) }}>
              <View style={{ flex: 1, marginRight: getResponsiveMargin(10) }}>
                <Text style={[homeScreenStyles.modalTitle, { fontSize: getResponsiveFontSize(22) }]}>
                  {selectedAreaForSpots?.name || 'Parking Area'} Layout
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseParkingSpotsModal} style={{ marginLeft: getResponsiveMargin(10) }}>
                <Ionicons name="close" size={getResponsiveSize(28)} color={colors.primary} />
              </TouchableOpacity>
    </View>
            
            {isLoadingSvg ? (
              <View style={[homeScreenStyles.loadingContainer, { minHeight: getResponsiveSize(300) }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={homeScreenStyles.loadingText}>Loading parking layout...</Text>
              </View>
            ) : svgContent ? (
              <View style={{
                width: '100%',
                flex: 1,
                backgroundColor: colors.backgroundSecondary,
                borderRadius: getResponsiveSize(12),
                padding: getResponsivePadding(12),
                overflow: 'hidden',
                minHeight: getResponsiveSize(400),
              }}>
                <View style={{
                  width: '100%',
                  flex: 1,
                }}>
                  <ScrollView 
                    ref={layoutScrollViewRef}
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    style={{ 
                      width: '100%',
                      height: '100%',
                    }}
                    contentContainerStyle={{ 
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '100%',
                    }}
                    scrollEnabled={true}
                    bounces={true}
                    alwaysBounceHorizontal={true}
                    directionalLockEnabled={false}
                    automaticallyAdjustContentInsets={false}
                    removeClippedSubviews={false}
                    contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    overScrollMode="always"
                  >
                    <ScrollView
                      ref={layoutVerticalScrollViewRef}
                      showsVerticalScrollIndicator={true}
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      horizontal={false} // Disable horizontal scrolling - SVG fits container
                      style={{
                        width: Math.max(svgDimensions.width + 40, 300), // Use SVG dimensions + padding
                      }}
                      contentContainerStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        minHeight: Math.max(svgDimensions.height + 40, 200), // Use SVG dimensions + padding
                        maxHeight: Math.max(svgDimensions.height + 80, 300), // Use SVG dimensions + padding
                      }}
                      scrollEnabled={true}
                      bounces={true}
                      alwaysBounceVertical={true}
                      directionalLockEnabled={false}
                      automaticallyAdjustContentInsets={false}
                      removeClippedSubviews={false}
                      contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                      scrollEventThrottle={16}
                      keyboardShouldPersistTaps="handled"
                      overScrollMode="always"
                    >
                      <View style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100%',
                      }}>
                        <View style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: svgDimensions.width, // Use minimized SVG dimensions
                          height: svgDimensions.height, // Use minimized SVG dimensions
                          position: 'relative',
                        }}
                        pointerEvents="box-none"
                        >
                          <SvgXml
                            xml={svgContent}
                            width={svgDimensions.width} // Use minimized SVG dimensions
                            height={svgDimensions.height} // Use minimized SVG dimensions
                            preserveAspectRatio="xMidYMid meet" // Scale to fit container
                            style={{ 
                              width: svgDimensions.width, // Use minimized SVG dimensions
                              height: svgDimensions.height, // Use minimized SVG dimensions
                              backgroundColor: 'transparent',
                            }}
                          />
                          <View 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              pointerEvents: 'box-none',
                            }}
                          >
                        {clickableSpots.map((spot) => {
                          // DEBUG: Log all spots being processed
                          if (spot.id === 'FPA-S-004') {
                            console.log('🎯 DEBUG: Processing FPA-S-004 in render loop!');
                          }
                          
                          // Scaled coordinate mapping - SVG scales to fit container with preserveAspectRatio
                          const containerWidth = svgDimensions.width; // Use minimized SVG dimensions
                          const containerHeight = svgDimensions.height; // Use minimized SVG dimensions
                          
                          // Extract viewBox from SVG - this is the coordinate system
                          const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
                          let viewBoxX = 0;
                          let viewBoxY = 0;
                          let viewBoxWidth = 276;
                          let viewBoxHeight = 322;
                          if (viewBoxMatch) {
                            const parts = viewBoxMatch[1].trim().split(/[\s,]+/).filter(p => p).map(Number);
                            if (parts.length >= 4) {
                              viewBoxX = parts[0];
                              viewBoxY = parts[1];
                              viewBoxWidth = parts[2];
                              viewBoxHeight = parts[3];
                            }
                          }
                          
                          // Calculate aspect ratios
                          const viewBoxAspectRatio = viewBoxWidth / viewBoxHeight;
                          const containerAspectRatio = containerWidth / containerHeight;
                          
                          // With preserveAspectRatio="xMidYMid meet", calculate actual rendered size
                          let renderedWidth = containerWidth;
                          let renderedHeight = containerHeight;
                          let offsetX = 0;
                          let offsetY = 0;
                          
                          if (viewBoxAspectRatio > containerAspectRatio) {
                            // ViewBox is wider - fit to width
                            renderedWidth = containerWidth;
                            renderedHeight = containerWidth / viewBoxAspectRatio;
                            offsetY = (containerHeight - renderedHeight) / 2; // Center vertically
                          } else {
                            // ViewBox is taller - fit to height
                            renderedWidth = containerHeight * viewBoxAspectRatio;
                            renderedHeight = containerHeight;
                            offsetX = (containerWidth - renderedWidth) / 2; // Center horizontally
                          }
                          
                          // Calculate scale factors (viewBox units to rendered pixels)
                          const scaleX = renderedWidth / viewBoxWidth;
                          const scaleY = renderedHeight / viewBoxHeight;
                          
                          // Convert spot coordinates from viewBox space to rendered pixel space
                          // Adjust for viewBox origin
                          const spotXInViewBox = spot.x - viewBoxX;
                          const spotYInViewBox = spot.y - viewBoxY;
                          
                          // Scale to rendered pixels
                          const pixelX = spotXInViewBox * scaleX;
                          const pixelY = spotYInViewBox * scaleY;
                          
                          // Add centering offset
                          const finalX = offsetX + pixelX;
                          const finalY = offsetY + pixelY;
                          
                          // Scale dimensions to rendered pixels
                          const pixelWidth = spot.width * scaleX;
                          const pixelHeight = spot.height * scaleY;
                          
                          // Final coordinates - exact match to spot size
                          const left = finalX;
                          const top = finalY;
                          const width = pixelWidth;
                          const height = pixelHeight;
                          
                          // Verify dimensions are valid
                          if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height) || isNaN(left) || isNaN(top)) {
                            console.log(`⚠️ Invalid spot dimensions for ${spot.id}: left=${left}, top=${top}, width=${width}, height=${height}`);
                            return null;
                          }
                          
                          // Debug log for first few spots AND FPA-S-004
                          if (clickableSpots.indexOf(spot) < 3 || spot.id === 'FPA-S-004') {
                            console.log(`🎯 Spot ${spot.id} (${spot.spotNumber}):`, {
                              viewBoxCoords: { x: spot.x, y: spot.y, width: spot.width, height: spot.height },
                              renderedCoords: { left, top, width, height },
                              scale: { x: scaleX, y: scaleY },
                              containerSize: { width: containerWidth, height: containerHeight },
                              renderedSize: { width: renderedWidth, height: renderedHeight },
                              offset: { x: offsetX, y: offsetY }
                            });
                          }
                          
                          // Get spot status from backend (match by spot ID first, then spot_number)
                          // Try multiple matching strategies for flexibility like FPA
                          let spotStatus = spotStatuses.get(spot.id || '') || spotStatuses.get(spot.spotNumber || '');
                          
                          // Debug logging for status matching
                          if (clickableSpots.indexOf(spot) < 3 || spot.id === 'FPA-S-004') {
                            console.log('🔍 HomeScreen Status matching:', {
                              spotId: spot.id,
                              spotNumber: spot.spotNumber,
                              directMatch: !!spotStatuses.get(spot.id || ''),
                              numberMatch: !!spotStatuses.get(spot.spotNumber || ''),
                              availableKeys: Array.from(spotStatuses.keys()).slice(0, 10),
                              totalKeys: spotStatuses.size,
                              foundStatus: spotStatus,
                              spotStatusData: spotStatus ? {
                                section_name: spotStatus.section_name,
                                spot_type: spotStatus.spot_type,
                                status: spotStatus.status
                              } : null
                            });
                          }
                          
                          // Fallback for FPA spots if backend returns wrong data
                          if (!spotStatus && spot.id && spot.id.startsWith('FPA-S-') && 
                              selectedAreaForSpots?.name?.toLowerCase().includes('fpa')) {
                            console.log(`🔧 Using fallback status for FPA spot: ${spot.id}`);
                            // Create default available status for FPA spots
                            spotStatus = {
                              id: parseInt(spot.id.split('-')[2]), // Extract number from FPA-S-001
                              spot_number: spot.id,
                              status: 'available',
                              spot_type: 'motorcycle', // FPA is motorcycle area
                              section_name: 'Section S',
                              is_user_booked: 0
                            };
                            console.log(`🔧 Created fallback spot status for ${spot.id}:`, spotStatus);
                          }
                          
                          // If still not found, try matching without floor prefix
                          if (!spotStatus && spot.id) {
                            const idWithoutFloor = spot.id.replace(/^F\d+-/i, ''); // Remove "F2-" prefix
                            spotStatus = spotStatuses.get(idWithoutFloor);
                            
                            if (clickableSpots.indexOf(spot) < 3) {
                              console.log('🔍 Trying without floor prefix:', {
                                originalId: spot.id,
                                withoutFloor: idWithoutFloor,
                                found: !!spotStatus
                              });
                            }
                          }
                          
                          // Also try matching by local slot number for FU Main
                          if (!spotStatus && (spot as any).localSlot) {
                            const localSlot = (spot as any).localSlot;
                            spotStatus = spotStatuses.get(localSlot.toString());
                            
                            if (clickableSpots.indexOf(spot) < 3) {
                              console.log('🔍 Trying local slot:', {
                                spotId: spot.id,
                                localSlot: localSlot,
                                found: !!spotStatus
                              });
                            }
                          }
                          
                          const spotType = spotStatus?.spot_type || 'unknown';
                          const section = spotStatus?.section_name || '';
                          
                          // Check if this is a capacity section
                          const isCapacitySection = spot.id && spot.id.startsWith('section-');
                          
                          // Get spot status for regular spots, but capacity sections should always be available
                          let spotStatusValue = spotStatus?.status || 'unknown';
                          const isUserBooked = spotStatus?.is_user_booked === true || (typeof spotStatus?.is_user_booked === 'number' && spotStatus.is_user_booked === 1);
                          
                          // For capacity sections, override status to show as available (they're clickable areas, not individual spots)
                          if (isCapacitySection) {
                            spotStatusValue = 'available';
                          }
                          
                          // Get capacity data from database for color coding
                          let capacityUtilization = 0;
                          if (isCapacitySection) {
                            const sectionName = spot.spotNumber || '';
                            console.log(`🔍 Looking for capacity section: "${sectionName}" in capacitySections:`, capacitySections);
                            const sectionData = capacitySections.find(section => 
                              section.sectionName.toLowerCase() === sectionName.toLowerCase()
                            );
                            console.log(`🔍 Found section data for "${sectionName}":`, sectionData);
                            if (sectionData) {
                              // Calculate utilization percentage
                              capacityUtilization = ((sectionData.totalCapacity - sectionData.availableCapacity) / sectionData.totalCapacity) * 100;
                              console.log(`🎯 Capacity utilization for "${sectionName}": ${capacityUtilization.toFixed(1)}%`);
                            } else {
                              console.log(`⚠️ No capacity data found for section "${sectionName}"`);
                            }
                          }
                          
                          // Determine color based on status
                          let backgroundColor = 'rgba(200, 200, 200, 0.1)'; // Gray for unknown
                          let borderColor = 'rgba(200, 200, 200, 0.4)';
                          
                          // If current user has booked this spot, show it in blue (regardless of status)
                          if (isUserBooked) {
                            backgroundColor = 'rgba(0, 122, 255, 0.3)'; // Blue with transparency
                            borderColor = 'rgba(0, 122, 255, 0.8)'; // Blue border
                          } else {
                            // For capacity sections, use dynamic color coding based on utilization
                            if (isCapacitySection) {
                              if (capacityUtilization >= 95) {
                                // 95%+ full - RED
                                backgroundColor = 'rgba(255, 59, 48, 0.2)'; // Light red
                                borderColor = 'rgba(255, 59, 48, 0.8)'; // Red border
                              } else if (capacityUtilization >= 50) {
                                // 50%+ full - ORANGE  
                                backgroundColor = 'rgba(255, 149, 0, 0.2)'; // Light orange
                                borderColor = 'rgba(255, 149, 0, 0.8)'; // Orange border
                              } else if (capacityUtilization <= 5) {
                                // 5% or less full - GREEN (mostly available)
                                backgroundColor = 'rgba(52, 199, 89, 0.2)'; // Light green
                                borderColor = 'rgba(52, 199, 89, 0.8)'; // Green border
                              } else {
                                // 6%-49% full - LIGHT ORANGE (moderate utilization)
                                backgroundColor = 'rgba(255, 204, 0, 0.15)'; // Light yellow
                                borderColor = 'rgba(255, 204, 0, 0.6)'; // Yellow border
                              }
                              console.log('🎯 Capacity section color based on utilization:', spot.id, `${capacityUtilization.toFixed(1)}%`);
                            } else {
                              // Otherwise, use status-based colors for regular spots
                              switch (spotStatusValue) {
                              case 'available':
                                backgroundColor = 'rgba(52, 199, 89, 0.2)'; // Green
                                borderColor = 'rgba(52, 199, 89, 0.6)';
                                break;
                              case 'occupied':
                                backgroundColor = 'rgba(255, 59, 48, 0.2)'; // Red
                                borderColor = 'rgba(255, 59, 48, 0.6)';
                                break;
                              case 'reserved':
                                backgroundColor = 'rgba(255, 204, 0, 0.3)'; // Yellow/Orange for reserved by others
                                borderColor = 'rgba(255, 204, 0, 0.8)';
                                break;
                              default:
                                backgroundColor = 'rgba(200, 200, 200, 0.1)'; // Gray
                                borderColor = 'rgba(200, 200, 200, 0.4)';
                            }
                            }
                          }
                          
                          return (
                            <TouchableOpacity
                              key={spot.id}
                              style={{
                                position: 'absolute',
                                left,
                                top,
                                width,
                                height,
                                backgroundColor,
                                borderWidth: 1,
                                borderColor,
                                borderRadius: isCapacitySection ? 4 : 2,
                                zIndex: 10,
                              }}
                              onPress={() => {
                                console.log('📍 FU Main Spot tapped:', spot.spotNumber || spot.id, 'Status:', spotStatusValue, 
                                  isCapacitySection ? `Utilization: ${capacityUtilization.toFixed(1)}%` : '');
                                handleSpotPress(spot);
                              }}
                              activeOpacity={0.6}
                              // No hitSlop to ensure exact fit
                              delayPressIn={0}
                              delayPressOut={0}
                            >
                              {/* Show capacity text for capacity sections */}
                              {isCapacitySection && (
                                <View style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <Text style={{
                                    fontSize: Math.max(8, Math.min(width || 50, height || 50) * 0.25), // Responsive font size with minimum
                                    fontWeight: 'bold',
                                    color: colors.textInverse,
                                    textAlign: 'center',
                                    textShadowColor: 'rgba(0, 0, 0, 0.7)',
                                    textShadowOffset: { width: 1, height: 1 },
                                    textShadowRadius: 2,
                                  }}>
                                    {(() => {
                                      const sectionName = spot.spotNumber || '';
                                      console.log('🔍 DEBUG: Capacity section display logic:', {
                                        spotId: spot.id,
                                        spotNumber: spot.spotNumber,
                                        sectionName,
                                        capacitySectionsAvailable: capacitySections.length,
                                        capacitySectionsList: capacitySections.map(s => s.sectionName)
                                      });
                                      
                                      const sectionData = capacitySections.find(section => 
                                        section.sectionName.toLowerCase() === sectionName.toLowerCase()
                                      );
                                      
                                      console.log('🔍 DEBUG: Section data lookup result:', {
                                        sectionName,
                                        foundSectionData: !!sectionData,
                                        sectionData: sectionData ? {
                                          sectionName: sectionData.sectionName,
                                          totalCapacity: sectionData.totalCapacity,
                                          availableCapacity: sectionData.availableCapacity
                                        } : null
                                      });
                                      
                                      if (sectionData) {
                                        const displayText = `${String(sectionData.availableCapacity)}/${String(sectionData.totalCapacity)}`;
                                        console.log('✅ Displaying capacity text:', displayText);
                                        return displayText;
                                      } else {
                                        console.log('❌ No section data found, falling back to section name:', sectionName);
                                        return String(sectionName || 'N/A');
                                      }
                                    })()}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        </View>
                        </View>
                      </View>
                    </ScrollView>
                  </ScrollView>
                </View>
              </View>
            ) : (
              <View style={[homeScreenStyles.emptyStateContainer, { minHeight: 200 }]}>
                <Text style={homeScreenStyles.emptyStateText}>🚧 No Layout Available</Text>
                <Text style={homeScreenStyles.emptyStateSubtext}>
                  No parking layout is available for this area yet.
                </Text>
                <Text style={[homeScreenStyles.emptyStateSubtext, { marginTop: 8 }]}>
                  The layout will be displayed here once it is configured for this parking area.
                </Text>
              </View>
            )}

            {/* Legend */}
            {svgContent && (
              <View style={{
                marginTop: getResponsiveMargin(16),
                marginBottom: getResponsiveMargin(8),
                padding: getResponsivePadding(12),
                backgroundColor: colors.card,
                borderRadius: getResponsiveSize(8),
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{
                  fontSize: getResponsiveFontSize(14),
                  fontWeight: 'bold',
                  color: colors.text,
                  marginBottom: getResponsiveMargin(8),
                  textAlign: 'center',
                }}>
                  Legend
                </Text>
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: getResponsiveSize(12),
                }}>
                  {/* Road */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(24),
                      height: getResponsiveSize(12),
                      backgroundColor: '#808080',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Road</Text>
                  </View>

                  {/* Parking Spot */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(24),
                      height: getResponsiveSize(16),
                      borderWidth: 1.5,
                      borderColor: '#333333',
                      borderRadius: 2,
                      backgroundColor: 'transparent',
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Parking Spot</Text>
                  </View>

                  {/* Capacity Section */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(24),
                      height: getResponsiveSize(16),
                      borderWidth: 1,
                      borderColor: '#dee2e6',
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Capacity Section</Text>
                  </View>

                  {/* Available (Green) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(52, 199, 89, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(52, 199, 89, 0.6)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Available</Text>
                  </View>

                  {/* Occupied (Red) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(255, 59, 48, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 59, 48, 0.6)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Occupied</Text>
                  </View>

                  {/* Reserved (Yellow) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(255, 204, 0, 0.3)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 204, 0, 0.8)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Reserved</Text>
                  </View>

                  {/* Your Booked Spot (Blue) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(0, 122, 255, 0.3)',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 122, 255, 0.8)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Your Spot</Text>
                  </View>

                  {/* 50%+ Full (Orange) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(255, 149, 0, 0.2)',
                      borderWidth: 2,
                      borderColor: 'rgba(255, 149, 0, 0.8)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>50%+ Full</Text>
                  </View>

                  {/* 95%+ Full (Dark Red) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      width: getResponsiveSize(20),
                      height: getResponsiveSize(20),
                      backgroundColor: 'rgba(255, 59, 48, 0.2)',
                      borderWidth: 2,
                      borderColor: 'rgba(255, 59, 48, 0.8)',
                      borderRadius: 2,
                    }} />
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>95%+ Full</Text>
                  </View>

                  {/* Entry Road (Green Arrow) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: getResponsiveSize(24),
                        height: getResponsiveSize(12),
                        backgroundColor: '#808080',
                        borderRadius: 2,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="arrow-forward" size={getResponsiveSize(10)} color="#34C759" />
                      </View>
                    </View>
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Entry</Text>
                  </View>

                  {/* Exit Road (Red Arrow) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: getResponsiveMargin(8),
                    marginBottom: getResponsiveMargin(4),
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: getResponsiveSize(24),
                        height: getResponsiveSize(12),
                        backgroundColor: '#808080',
                        borderRadius: 2,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="arrow-forward" size={getResponsiveSize(10)} color="#FF3B30" />
                      </View>
                    </View>
                    <Text style={{
                      fontSize: getResponsiveFontSize(11),
                      color: colors.textSecondary,
                      marginLeft: getResponsiveMargin(6),
                    }}>Exit</Text>
                  </View>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={[homeScreenStyles.closeButton, { marginTop: 12 }]} 
              onPress={handleCloseParkingSpotsModal}
            >
              <Text style={homeScreenStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Frequent Spots Modal */}
      <Modal
        visible={isFrequentSpotsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseFrequentSpotsModal}
      >
        <View 
          style={homeScreenStyles.modalOverlay}
          pointerEvents="box-none"
        >
          <View 
            pointerEvents="box-none"
            onStartShouldSetResponder={() => false}
            onMoveShouldSetResponder={() => false}
          >
            <View style={[homeScreenStyles.modalContainer, { 
              maxHeight: isTablet ? screenHeight * 0.9 : screenHeight * 0.85,
              height: isTablet ? screenHeight * 0.9 : screenHeight * 0.85,
              width: isTablet ? screenWidth * 0.9 : screenWidth * 0.95,
              maxWidth: isTablet ? 600 : screenWidth * 0.95,
              flexDirection: 'column',
            }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 16, flexShrink: 0 }}>
              <View style={{ flex: 1, marginRight: 8, zIndex: 1000 }}>
                <Text style={[homeScreenStyles.modalTitle, { marginBottom: 8 }]}>Frequent Spots</Text>
              </View>
              <TouchableOpacity onPress={handleCloseFrequentSpotsModal} style={{ marginLeft: 8, flexShrink: 0 }}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, width: '100%' }}>
              {isLoadingFrequentSpotsModal ? (
                <View style={homeScreenStyles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={homeScreenStyles.loadingText}>Loading frequent spots...</Text>
                </View>
              ) : frequentSpotsForModal.length === 0 ? (
                <View style={homeScreenStyles.emptyContainer}>
                  <Text style={homeScreenStyles.emptyText}>No frequent parking spots found</Text>
                  <Text style={homeScreenStyles.emptySubtext}>Your frequently used spots will appear here</Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={{ paddingBottom: getResponsivePadding(10) }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  bounces={true}
                  scrollEventThrottle={16}
                  removeClippedSubviews={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {frequentSpotsForModal.map((spot, index) => (
                    <View
                      key={`${spot.parking_spot_id}-${index}`}
                      style={[homeScreenStyles.parkingCard, { width: '100%', marginRight: 0, marginBottom: getResponsiveMargin(12) }]}
                    >
                      <View style={homeScreenStyles.locationHeader}>
                        <View style={homeScreenStyles.locationTextContainer}>
                          <Text style={homeScreenStyles.parkingLocation}>{spot.location_name.toUpperCase()}</Text>
                          <Text style={homeScreenStyles.parkingSpotId}>{generateSpotId(spot.location_name, spot.spot_number)}</Text>
                        </View>
                        <Ionicons
                          name="location"
                          size={32}
                          color={getLandmarkIconColor(undefined, undefined, spot.status)}
                        />
                      </View>
                      <Text style={homeScreenStyles.parkingLabel}>Time Slot</Text>
                      <View style={homeScreenStyles.timeSlotContainer}>
                        <Text style={homeScreenStyles.parkingTime}>
                          {spot.current_reservation 
                            ? `${formatTime(spot.current_reservation.start_time)} - ${formatTime(spot.current_reservation.end_time || new Date(Date.now() + 2*60*60*1000).toISOString())}`
                            : 'Available Now'
                          }
                        </Text>
                      </View>
                      <Text style={homeScreenStyles.parkingPrice}>Used {spot.usage_count} times</Text>
                      <View style={homeScreenStyles.parkingStatusContainer}>
                        <Text style={spot.status === 'AVAILABLE' ? homeScreenStyles.availableStatus : homeScreenStyles.occupiedStatus}>
                          {spot.status}
                        </Text>
                        <TouchableOpacity
                          style={homeScreenStyles.bookButton}
                          onPress={() => handleBookFrequentSpot(spot)}
                        >
                          <Text style={homeScreenStyles.bookButtonText}>BOOK</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
            
            <TouchableOpacity 
              style={[homeScreenStyles.closeButton, { marginTop: 16, flexShrink: 0 }]} 
              onPress={handleCloseFrequentSpotsModal}
            >
              <Text style={homeScreenStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Terms and Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onAccept={handleAcceptTerms}
        isLoading={isAcceptingTerms}
      />

      {/* Insufficient Balance Modal */}
      <Modal
        visible={showInsufficientBalanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInsufficientBalanceModal(false)}
      >
        <View style={homeScreenStyles.modalOverlay}>
          <View style={homeScreenStyles.insufficientBalanceModalContainer}>
            <View style={homeScreenStyles.insufficientBalanceModalHeader}>
              <View style={homeScreenStyles.insufficientBalanceModalIconContainer}>
                <Ionicons name="wallet-outline" size={40} color="#FF3B30" />
              </View>
              <Text style={homeScreenStyles.insufficientBalanceModalTitle}>Insufficient Balance</Text>
              <Text style={homeScreenStyles.insufficientBalanceModalSubtitle}>You need to purchase a plan to continue</Text>
            </View>
            
            <View style={homeScreenStyles.insufficientBalanceModalContent}>
              <View style={homeScreenStyles.insufficientBalanceMessageContainer}>
                <Ionicons name="information-circle-outline" size={24} color="#FF9500" />
                <Text style={homeScreenStyles.insufficientBalanceMessageText}>
                  {insufficientBalanceMessage}
                </Text>
              </View>
              
              <View style={homeScreenStyles.insufficientBalanceSuggestionContainer}>
                <Ionicons name="card-outline" size={20} color="#007AFF" />
                <Text style={homeScreenStyles.insufficientBalanceSuggestionText}>
                  Choose from our flexible parking plans
                </Text>
              </View>
            </View>

            <View style={homeScreenStyles.insufficientBalanceModalActions}>
              <TouchableOpacity 
                style={homeScreenStyles.insufficientBalanceModalCancelButton}
                onPress={() => setShowInsufficientBalanceModal(false)}
              >
                <Text style={homeScreenStyles.insufficientBalanceModalCancelText}>Maybe Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={homeScreenStyles.insufficientBalanceModalPrimaryButton}
                onPress={() => {
                  setShowInsufficientBalanceModal(false);
                  router.push('/screens/TopUpScreen');
                }}
              >
                <Ionicons name="cart-outline" size={18} color="white" />
                <Text style={homeScreenStyles.insufficientBalanceModalPrimaryText}>View Plans</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// Only keep unique styles that aren't in homeScreenStyles.ts
const styles = StyleSheet.create({
  profilePicture: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

