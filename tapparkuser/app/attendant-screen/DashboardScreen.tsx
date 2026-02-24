// @ts-nocheck
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ApiService from '../../services/api';
import RealtimeService from '../../services/realtime';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { 
  carIconSvg, 
  bikeIconSvg, 
  motorcycleIconSvg,
  darkBikeIconSvg,
  arrowUpSvg,
  arrowDownSvg,
  darkGridIconSvg,
  tapParkWhiteLogoSvg
} from '../assets/icons/index';
import { dashboardScreenStyles } from './styles/dashboardStyles';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Colors } from '../../constants/theme';
import { useScreenDimensions, getAdaptiveColumns, getAdaptiveFontSize, getAdaptiveSpacing, getAdaptivePadding } from '../../hooks/use-screen-dimensions';
import { getNormalizedProfileImageFromUser } from '../../utils/profileImage';


interface VehicleType {
  id: string;
  name: string;
  icon: string;
  totalCapacity: number;
  occupied: number;
  available: number;
}

const normalizeVehicleType = (vehicleType?: string | null) => {
  if (!vehicleType) return 'unknown';
  const raw = vehicleType.toString().toLowerCase().trim();
  if (!raw) return 'unknown';
  if (raw === 'all') return 'all';
  if (['bike', 'bicycle', 'bicycles', 'bikes', 'ebike', 'ebikes', 'e-bike', 'e-bikes'].includes(raw)) {
    return 'bike';
  }
  if (['motorcycle', 'motorcycles', 'moto'].includes(raw)) {
    return 'motorcycle';
  }
  if (['car', 'cars'].includes(raw)) {
    return 'car';
  }
  return raw;
};

interface ParkingSlot {
  id: string | number;
  slotId: string;
  vehicleType: string;
  status: 'available' | 'occupied' | 'reserved';
  section: string;
  sectionId?: number | null;
  occupantName?: string;
  plateNumber?: string;
}

interface ActivityRecord {
  id: string;
  reservationId: number;
  vehiclePlate: string;
  userName?: string;
  vehicleType: string;
  vehicleBrand: string;
  parkingArea: string;
  parkingSlot: string;
  scanType: 'start' | 'end';
  scanTime: string;
  attendantName: string;
  userType: string;
  status: string;
}

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const screenDimensions = useScreenDimensions();
  
  // State variables
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [slotDetails, setSlotDetails] = useState<any>(null);
  const [loadingSlotDetails, setLoadingSlotDetails] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationAlerts, setNotificationAlerts] = useState(true);
  
  // Guest booking modal state
  const [showGuestBookingModal, setShowGuestBookingModal] = useState(false);
  const [guestBookingData, setGuestBookingData] = useState({
    firstName: '',
    lastName: '',
    plateNumber: '',
    vehicleType: 'car',
    brand: '',
    model: '',
    color: ''
  });
  const [isCreatingGuestBooking, setIsCreatingGuestBooking] = useState(false);
  
  // Plate number validation state
  const [plateValidation, setPlateValidation] = useState({
    checking: false,
    exists: false,
    vehicle: null as any,
    error: null as string | null
  });
  
  // Attendant action modal state
  const [showAttendantActionModal, setShowAttendantActionModal] = useState(false);
  const [selectedSpotForAction, setSelectedSpotForAction] = useState<any>(null);
  
  // Unavailable confirmation modal state
  const [showUnavailableConfirmModal, setShowUnavailableConfirmModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [spotUnavailableReasons, setSpotUnavailableReasons] = useState<{[key: string]: string}>({});
  const [isConfirmingSection, setIsConfirmingSection] = useState(false); // Track if confirming section vs spot
  
  // Section settings modal state
  const [showSectionSettingsModal, setShowSectionSettingsModal] = useState(false);
  const [selectedSectionForSettings, setSelectedSectionForSettings] = useState<any>(null);
  const [sectionUnavailableReason, setSectionUnavailableReason] = useState('');
  const [sectionUnavailableReasons, setSectionUnavailableReasons] = useState<{[key: string]: string}>({});
  
  // Settings modal backend data state
  const [attendantProfile, setAttendantProfile] = useState<any>(null);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Backend data state
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [capacitySections, setCapacitySections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for parked users by section
  const [sectionParkedUsers, setSectionParkedUsers] = useState<{[key: number]: Array<{name: string, plateNumber: string}>}>({});
  const [loadingUsers, setLoadingUsers] = useState<{[key: number]: boolean}>({});
  
  // State for motorcycle spots by section
  const [sectionSpots, setSectionSpots] = useState<{[key: number]: any[]}>({});
  const [loadingSpots, setLoadingSpots] = useState<{[key: number]: boolean}>({});
  const [sectionUnavailableCounts, setSectionUnavailableCounts] = useState<{[key: number]: number}>({});

  // Keep latest sectionSpots for polling (avoid stale closure)
  const sectionSpotsRef = useRef<{[key: number]: any[]}>({});
  
  // Activity history state
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ActivityRecord[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Real-time polling state
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const assignedAreaIdRef = useRef<number | null>(null);
  const guestBookingScrollRef = useRef<ScrollView>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const scrollGuestBookingForm = (y?: number) => {
    setTimeout(() => {
      if (typeof y === 'number') {
        guestBookingScrollRef.current?.scrollTo({ y, animated: true });
      } else {
        guestBookingScrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  useEffect(() => {
    sectionSpotsRef.current = sectionSpots;
  }, [sectionSpots]);

  // Recompute Vehicle Types counts when capacitySections updates
  useEffect(() => {
    if (parkingSlots.length === 0 || vehicleTypes.length === 0) return;
    setVehicleTypes(currentTypes => updateVehicleTypesWithRealTimeCounts(parkingSlots, currentTypes));
  }, [capacitySections]);

  // Profile picture component
  const ProfilePicture = ({ size = 32, profileImageUrl }: { size?: number; profileImageUrl?: string }) => {
    const getInitials = () => {
      if (!user) return '?';
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    // If profile image URL is provided, show the image
    if (profileImageUrl) {
      return (
        <View style={[styles.profilePicture, { width: size, height: size }]}>
          <Image
            source={{ uri: profileImageUrl }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            resizeMode="cover"
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[styles.profilePicture, { width: size, height: size }]}>
        <Text style={[styles.profileInitials, { fontSize: size * 0.4 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  // Debug: Log user authentication status
  useEffect(() => {
    console.log('🔐 Dashboard - Auth Status:', {
      isAuthenticated,
      user: user ? {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        account_type_name: user.account_type_name
      } : null
    });
  }, [user, isAuthenticated]);

  const handleScanPress = () => {
    console.log('FAB pressed - attempting navigation to QR scanner');
    try {
      router.push('/attendant-screen/QRScannerScreen');
      console.log('Navigation command sent successfully');
    } catch (error) {
      Alert.alert('Navigation Error', getErrorMessage(error, 'Unable to open QR scanner. Please try again.'));
    
    }
  };

  const handleSettingsPress = async () => {
    console.log('Settings button pressed');
    setShowSettingsModal(true);
    setLoadingSettings(true);
    
    try {
      // Fetch attendant profile and notification settings
      const [profileResponse, settingsResponse] = await Promise.all([
        ApiService.getAttendantProfile(),
        ApiService.getNotificationSettings()
      ]);
      
      if (profileResponse.success) {
        setAttendantProfile(profileResponse.data.attendantProfile);
        console.log('✅ Attendant profile loaded:', profileResponse.data.attendantProfile);
      }
      
      if (settingsResponse.success) {
        setNotificationSettings(settingsResponse.data.notificationSettings);
        setNotificationAlerts(settingsResponse.data.notificationSettings.newReservationAlerts);
        console.log('✅ Notification settings loaded:', settingsResponse.data.notificationSettings);
      }
    } catch (error) {
      Alert.alert('Settings Load Error', getErrorMessage(error, 'Failed to load settings data.'));
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleMotorcycleSpotPress = async (
    spot: any,
    sectionId: number,
    sectionName: string,
    vehicleType: string = 'motorcycle'
  ) => {
    // Check if user is admin/attendant
    const isAdminOrAttendant = user?.account_type_name === 'Admin' || user?.account_type_name === 'Attendant' || user?.type_id === 3 || user?.type_id === 2;
    const normalizedVehicleType = normalizeVehicleType(vehicleType);
    const vehicleTypeLabel = normalizedVehicleType === 'bike' ? 'Bike' : 'Motorcycle';
    
    if (isAdminOrAttendant && (spot.status === 'available' || spot.status === 'unavailable')) {
      // Show attendant action modal for available/unavailable spots
      setSelectedSpotForAction({
        ...spot,
        sectionId,
        sectionName,
        vehicleType: normalizedVehicleType
      });
      setShowAttendantActionModal(true);
    } else if (spot.status === 'active' || spot.status === 'reserved') {
      // Show direct actions for occupied/reserved motorcycle spots
      const reservationDetails = spot.reservation ? 
        `\nBooked by: ${spot.reservation.userName}\nPlate: ${spot.reservation.plateNumber}\nVehicle: ${spot.reservation.brand || 'N/A'}\nStart: ${spot.reservation.startTime ? new Date(spot.reservation.startTime).toLocaleString() : 'N/A'}` : 
        '';
      
      const actions: any[] = [
        { text: 'OK', style: 'default' as const }
      ];
      
      // Add management options for admin/attendant
      if (isAdminOrAttendant) {
        actions.unshift(
          { 
            text: 'End Parking', 
            style: 'destructive' as const,
            onPress: () => endMotorcycleParking(sectionId, spot.spotNumber)
          }
        );
        
        if (spot.status === 'reserved') {
          actions.unshift(
            { 
              text: 'Cancel Booking', 
              style: 'destructive' as const,
              onPress: () => cancelMotorcycleBooking(sectionId, spot.spotNumber)
            }
          );
        }
      }
      
      Alert.alert(
        `${vehicleTypeLabel} Spot ${spot.spotNumber}`,
        `Status: ${spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}${reservationDetails}`,
        actions
      );
    } else {
      // Available spot for regular users
      Alert.alert(
        `${vehicleTypeLabel} Spot ${spot.spotNumber}`,
        `This spot is ${spot.status}.`,
        [{ text: 'OK', style: 'default' as const }]
      );
    }
  };
  const setSectionSpotStatusOptimistic = useCallback(
    (
      sectionId: number,
      spotNumber: string,
      nextStatus: string,
      extraUpdates: Record<string, any> = {}
    ) => {
      setSectionSpots(prev => {
        const currentSpots = prev[sectionId];
        if (!Array.isArray(currentSpots) || currentSpots.length === 0) return prev;

        let hasMatch = false;
        const updatedSpots = currentSpots.map(spot => {
          if (String(spot.spotNumber) !== String(spotNumber)) return spot;
          hasMatch = true;

          const updatedSpot: any = {
            ...spot,
            status: nextStatus,
            ...extraUpdates
          };

          if (nextStatus === 'available') {
            updatedSpot.reservation = null;
            updatedSpot.isUserBooked = false;
          }

          return updatedSpot;
        });

        if (!hasMatch) return prev;

        const unavailableCount = updatedSpots.filter(spot => spot.status === 'unavailable').length;
        setSectionUnavailableCounts(counts => ({
          ...counts,
          [sectionId]: unavailableCount
        }));

        return { ...prev, [sectionId]: updatedSpots };
      });
    },
    []
  );
  const endMotorcycleParking = async (sectionId: number, spotNumber: string) => {
    try {
      console.log(`🏍️ Ending parking for spot ${spotNumber} in section ${sectionId}`);
      
      const response = await ApiService.releaseMotorcycleSpot(sectionId, spotNumber);
      
      if (response.success) {
        setSectionSpotStatusOptimistic(sectionId, spotNumber, 'available');
        Alert.alert('Success', 'Parking ended successfully');
        await Promise.all([
          fetchMotorcycleSpots(sectionId),
          fetchCapacitySections()
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to end parking');
      }
    } catch (error) {
      Alert.alert('End Parking Failed', getErrorMessage(error, 'Failed to end parking'));
    }
  };

  // Handler for setting spot as unavailable
  const handleSetSpotUnavailable = () => {
    if (!selectedSpotForAction) return;
    
    // Close the action modal and show confirmation modal
    setShowAttendantActionModal(false);
    setUnavailableReason(''); // Reset reason
    setIsConfirmingSection(false); // This is for a spot
    setShowUnavailableConfirmModal(true);
  };

  // Handler for confirming spot as unavailable
  const handleConfirmSetUnavailable = async () => {
    console.log('🔍 Confirmation debug:', {
      isConfirmingSection,
      unavailableReason,
      unavailableReasonLength: unavailableReason?.length,
      unavailableReasonTrimmed: unavailableReason?.trim(),
      selectedSectionForSettings: selectedSectionForSettings?.sectionName,
      selectedSpotForAction: selectedSpotForAction?.slotId
    });
    
    if (!unavailableReason.trim()) {
      console.log('❌ Validation failed - reason is empty');
      Alert.alert('Error', 'Please provide a reason for making the spot unavailable');
      return;
    }
    
    // Route to the correct handler based on the flag
    if (isConfirmingSection) {
      console.log('🔄 Routing to section handler');
      await handleConfirmSetSectionUnavailable();
    } else {
      console.log('🔄 Routing to spot handler');
      await handleConfirmSetSpotUnavailable();
    }
  };

  // Separate handler for spot confirmation logic
  const handleConfirmSetSpotUnavailable = async () => {
    if (!selectedSpotForAction || !unavailableReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for making the spot unavailable');
      return;
    }
    
    try {
      console.log(`🚫 Setting spot ${selectedSpotForAction.spotNumber} as unavailable with reason: ${unavailableReason}`);
      
      let response;
      
      // Handle regular parking spots vs motorcycle sections
      if (selectedSpotForAction.sectionId) {
        // Motorcycle section - use section-based API
        console.log(`🏍️ Updating motorcycle section spot: section ${selectedSpotForAction.sectionId}, spot ${selectedSpotForAction.spotNumber}`);
        response = await ApiService.updateSpotStatus(selectedSpotForAction.sectionId, selectedSpotForAction.spotNumber, 'unavailable');
      } else {
        // Regular parking spot - use spot-based API
        console.log(`🚗 Updating regular parking spot: spot ${selectedSpotForAction.spotId}`);
        response = await ApiService.updateRegularSpotStatus(selectedSpotForAction.spotId, 'unavailable');
      }
      
      if (response.success) {
        if (selectedSpotForAction.sectionId) {
          setSectionSpotStatusOptimistic(
            selectedSpotForAction.sectionId,
            selectedSpotForAction.spotNumber,
            'unavailable'
          );
        }

        // Store the reason in state
        const spotKey = selectedSpotForAction.spotId || selectedSpotForAction.id;
        setSpotUnavailableReasons(prev => ({
          ...prev,
          [spotKey]: unavailableReason
        }));
        
        Alert.alert('Success', 'Spot marked as unavailable');
        setShowUnavailableConfirmModal(false);
        setSelectedSpotForAction(null);
        setUnavailableReason('');
        setIsConfirmingSection(false);
        console.log('✅ Spot status updated successfully, refreshing data...');
        // Refresh both regular parking spots and motorcycle sections
        await fetchParkingSlots();
        await fetchCapacitySections();
        console.log('✅ Data refresh completed');
      } else {
        console.log('❌ Spot status update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update spot status');
      }
    } catch (error) {
      Alert.alert('Spot Update Failed', getErrorMessage(error, 'Failed to update spot status'));
    }
  };

  // Handler for setting spot back to available
  const handleSetSpotAvailable = async () => {
    if (!selectedSpotForAction) return;
    
    try {
      console.log(`✅ Setting spot ${selectedSpotForAction.spotNumber} as available`);
      
      let response;
      
      // Handle regular parking spots vs motorcycle sections
      if (selectedSpotForAction.sectionId) {
        // Motorcycle section - use section-based API
        console.log(`🏍️ Updating motorcycle section spot: section ${selectedSpotForAction.sectionId}, spot ${selectedSpotForAction.spotNumber}`);
        response = await ApiService.updateSpotStatus(selectedSpotForAction.sectionId, selectedSpotForAction.spotNumber, 'available');
      } else {
        // Regular parking spot - use spot-based API
        console.log(`🚗 Updating regular parking spot: spot ${selectedSpotForAction.spotId}`);
        response = await ApiService.updateRegularSpotStatus(selectedSpotForAction.spotId, 'available');
      }
      
      if (response.success) {
        if (selectedSpotForAction.sectionId) {
          setSectionSpotStatusOptimistic(
            selectedSpotForAction.sectionId,
            selectedSpotForAction.spotNumber,
            'available'
          );
        }

        Alert.alert('Success', 'Spot marked as available');
        setShowAttendantActionModal(false);
        setSelectedSpotForAction(null);
        console.log('✅ Spot status updated successfully, refreshing data...');
        // Refresh both regular parking spots and motorcycle sections
        await fetchParkingSlots();
        await fetchCapacitySections();
        console.log('✅ Data refresh completed');
      } else {
        console.log('❌ Spot status update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update spot status');
      }
    } catch (error) {
      Alert.alert('Spot Update Failed', getErrorMessage(error, 'Failed to update spot status'));
    }
  };

  // Handler for setting section as unavailable
  const handleSetSectionUnavailable = () => {
    if (!selectedSectionForSettings) return;
    
    console.log('🔧 Setting section unavailable:', {
      sectionName: selectedSectionForSettings.sectionName,
      sectionId: selectedSectionForSettings.sectionId
    });
    
    // Show confirmation modal with section reason
    setUnavailableReason(''); // Use the main unavailable reason for the modal
    setShowSectionSettingsModal(false);
    setIsConfirmingSection(true); // This is for a section
    setShowUnavailableConfirmModal(true);
    
    console.log('🔍 Section setup debug:', {
      isConfirmingSection: true,
      unavailableReason: '',
      showUnavailableConfirmModal: true
    });
  };

  // Handler for confirming section as unavailable
  const handleConfirmSetSectionUnavailable = async () => {
    if (!selectedSectionForSettings || !unavailableReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for making the section unavailable');
      return;
    }
    
    try {
      console.log(`🚫 Setting section ${selectedSectionForSettings.sectionName} as unavailable with reason: ${unavailableReason}`);
      
      // For capacity sections, we'll update the section status
      const response = await ApiService.updateSectionStatus(selectedSectionForSettings.sectionId, 'unavailable');
      
      if (response.success) {
        // Store the reason in section state
        setSectionUnavailableReasons(prev => ({
          ...prev,
          [selectedSectionForSettings.sectionId]: unavailableReason
        }));
        
        Alert.alert('Success', 'Section marked as unavailable');
        setShowUnavailableConfirmModal(false);
        setSelectedSectionForSettings(null);
        setUnavailableReason('');
        setIsConfirmingSection(false);
        console.log('✅ Section status updated successfully, refreshing data...');
        // Refresh capacity sections
        await fetchCapacitySections();
        console.log('✅ Data refresh completed');
      } else {
        console.log('❌ Section status update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update section status');
      }
    } catch (error) {
      Alert.alert('Section Update Failed', getErrorMessage(error, 'Failed to update section status'));
    }
  };

  // Handler for setting section back to available
  const handleSetSectionAvailable = async () => {
    if (!selectedSectionForSettings) return;
    
    try {
      console.log(`✅ Setting section ${selectedSectionForSettings.sectionName} as available`);
      
      // For capacity sections, we'll update all spots in the section to available
      const response = await ApiService.updateSectionStatus(selectedSectionForSettings.sectionId, 'available');
      
      if (response.success) {
        // Remove the reason from state
        setSectionUnavailableReasons(prev => {
          const newReasons = { ...prev };
          delete newReasons[selectedSectionForSettings.sectionId];
          return newReasons;
        });
        
        Alert.alert('Success', 'Section marked as available');
        setShowSectionSettingsModal(false);
        setSelectedSectionForSettings(null);
        console.log('✅ Section status updated successfully, refreshing data...');
        // Refresh capacity sections
        await fetchCapacitySections();
        console.log('✅ Data refresh completed');
      } else {
        console.log('❌ Section status update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update section status');
      }
    } catch (error) {
      Alert.alert('Section Update Failed', getErrorMessage(error, 'Failed to update section status'));
    }
  };

  // Handler for booking guest parking
  const handleBookGuestParking = () => {
    if (!selectedSpotForAction) return;
    
    // Close the action modal and open the guest booking modal
    setShowAttendantActionModal(false);
    
    // Prepare the guest booking data
    const mockSlot: ParkingSlot = {
      id: selectedSpotForAction.spotId || selectedSpotForAction.id,
      slotId: selectedSpotForAction.spotNumber || selectedSpotForAction.slotId,
      vehicleType: selectedSpotForAction.vehicleType || 'car',
      status: 'available',
      section: selectedSpotForAction.sectionName,
      sectionId: selectedSpotForAction.sectionId ?? null,
      occupantName: '',
      plateNumber: ''
    };
    
    setSelectedSlot(mockSlot);
    setShowGuestBookingModal(true);
    
    // Reset form
    setGuestBookingData({
      firstName: '',
      lastName: '',
      plateNumber: '',
      vehicleType: selectedSpotForAction.vehicleType || 'car',
      brand: '',
      model: '',
      color: ''
    });
  };

  const cancelMotorcycleBooking = async (sectionId: number, spotNumber: string) => {
    try {
      console.log(`🏍️ Canceling booking for spot ${spotNumber} in section ${sectionId}`);
      
      const response = await ApiService.releaseMotorcycleSpot(sectionId, spotNumber);
      
      if (response.success) {
        setSectionSpotStatusOptimistic(sectionId, spotNumber, 'available');
        Alert.alert('Success', 'Booking cancelled successfully');
        await Promise.all([
          fetchMotorcycleSpots(sectionId),
          fetchCapacitySections()
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel booking');
      }
    } catch (error) {
      Alert.alert('Cancel Booking Failed', getErrorMessage(error, 'Failed to cancel booking'));
    }
  };

  const handleSlotPress = async (slot: ParkingSlot) => {
    // Check if user is admin/attendant
    const isAdminOrAttendant = user?.account_type_name === 'Admin' || user?.account_type_name === 'Attendant' || user?.type_id === 3 || user?.type_id === 2;
    
    if (isAdminOrAttendant && (slot.status === 'available' || slot.status === 'unavailable')) {
      // Show attendant action modal for available and unavailable spots
      setSelectedSpotForAction({
        ...slot,
        spotId: slot.id,
        spotNumber: slot.slotId,
        sectionId: null, // Regular spots don't have sectionId
        sectionName: slot.section || 'Unknown',
        vehicleType: slot.vehicleType || 'car'
      });
      setShowAttendantActionModal(true);
    } else {
      // Show regular slot details modal
      setSelectedSlot(slot);
      setModalVisible(true);
      setLoadingSlotDetails(true);
      
      try {
        console.log('🔄 Fetching slot details for:', slot.slotId);
        const response = await ApiService.getParkingSlotDetails(slot.id);
        console.log('📊 Slot details response:', response);
        
        if (response.success) {
          setSlotDetails(response.data.slotDetails);
          console.log('✅ Slot details loaded:', response.data.slotDetails);
        } else {
          console.log('❌ Failed to load slot details:', response);
          setSlotDetails(null);
        }
      } catch (error) {
        Alert.alert('Slot Details Error', getErrorMessage(error, 'Failed to load slot details.'));
        setSlotDetails(null);
      } finally {
        setLoadingSlotDetails(false);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedSlot(null);
    setSlotDetails(null);
    setLoadingSlotDetails(false);
  };

  const checkPlateNumber = async (plateNumber: string) => {
    if (!plateNumber || plateNumber.trim().length < 2) {
      setPlateValidation({
        checking: false,
        exists: false,
        vehicle: null,
        error: null
      });
      return;
    }

    setPlateValidation(prev => ({ ...prev, checking: true, error: null }));

    try {
      const response = await ApiService.checkPlateNumber(plateNumber.trim());
      
      if (response.success) {
        setPlateValidation({
          checking: false,
          exists: response.exists,
          vehicle: response.vehicle,
          error: null
        });
      } else {
        setPlateValidation({
          checking: false,
          exists: false,
          vehicle: null,
          error: 'Failed to check plate number'
        });
      }
    } catch (error) {
      Alert.alert('Plate Check Error', getErrorMessage(error, 'Failed to check plate number'));
      setPlateValidation({
        checking: false,
        exists: false,
        vehicle: null,
        error: 'Failed to check plate number'
      });
    }
  };

  const handlePlateNumberChange = (text: string) => {
    const upperText = text.toUpperCase();
    setGuestBookingData({ ...guestBookingData, plateNumber: upperText });
    
    // Debounce plate number check
    const timeoutId = setTimeout(() => {
      checkPlateNumber(upperText);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const closeGuestBookingModal = () => {
    setShowGuestBookingModal(false);
    setSelectedSlot(null);
    setGuestBookingData({
      firstName: '',
      lastName: '',
      plateNumber: '',
      vehicleType: 'car',
      brand: '',
      model: '',
      color: ''
    });
    // Reset plate validation
    setPlateValidation({
      checking: false,
      exists: false,
      vehicle: null,
      error: null
    });
  };

  const handleEndParkingSession = async (reservationId: number) => {
    Alert.alert(
      'End Parking Session',
      'Are you sure you want to end this parking session?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ApiService.endParkingSessionByAdmin(reservationId);
              if (response.success) {
                Alert.alert('Success', 'Parking session ended successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      closeModal();
                      fetchParkingSlots();
                    }
                  }
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to end parking session');
              }
            } catch (error: any) {
              Alert.alert('End Parking Failed', getErrorMessage(error, 'Failed to end parking session'));
            }
          }
        }
      ]
    );
  };

  const handleCancelBooking = async (reservationId: number) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ApiService.cancelBookingByAdmin(reservationId);
              if (response.success) {
                Alert.alert('Success', 'Booking cancelled successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      closeModal();
                      fetchParkingSlots();
                    }
                  }
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel booking');
              }
            } catch (error: any) {
              Alert.alert('Cancel Booking Failed', getErrorMessage(error, 'Failed to cancel booking'));
            }
          }
        }
      ]
    );
  };

  const handleCreateGuestBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'No parking spot selected');
      return;
    }

    console.log('🔍 Selected slot data:', selectedSlot);

    // Validate required fields
    if (!guestBookingData.firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter guest first name');
      return;
    }
    if (!guestBookingData.lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter guest last name');
      return;
    }
    if (!guestBookingData.plateNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter plate number');
      return;
    }

    // Validate spot ID
    if (!selectedSlot.id) {
      Alert.alert('Error', 'Invalid parking spot selected - missing spot ID');
      return;
    }

    console.log('🔍 About to create guest booking with spot ID:', selectedSlot.id);

    setIsCreatingGuestBooking(true);
    try {
      let response;
      let capacitySectionIdForUpdate: number | null = null;
      
      // Capacity-based sections (motorcycle/bike) use section-based guest assignment.
      const normalizedSlotType = normalizeVehicleType(selectedSlot.vehicleType);
      const isCapacityBasedSlot = normalizedSlotType === 'motorcycle' || normalizedSlotType === 'bike';

      if (isCapacityBasedSlot) {
        const sectionIdFromSlot = typeof selectedSlot.sectionId === 'number' ? selectedSlot.sectionId : null;
        const capacitySection =
          capacitySections.find(section => section.sectionId === sectionIdFromSlot) ||
          capacitySections.find(
            section =>
              section.sectionName === selectedSlot.section &&
              normalizeVehicleType(section.vehicleType) === normalizedSlotType
          );

        if (!capacitySection) {
          throw new Error(`Capacity section not found for ${normalizedSlotType} (${selectedSlot.section || 'unknown section'})`);
        }
        capacitySectionIdForUpdate = capacitySection.sectionId;

        response = await ApiService.assignMotorcycleSpotGuest(
          capacitySection.sectionId,
          selectedSlot.slotId,
          guestBookingData.firstName.trim(),
          guestBookingData.lastName.trim(),
          guestBookingData.plateNumber.trim(),
          guestBookingData.brand.trim() || undefined,
          guestBookingData.model.trim() || undefined,
          guestBookingData.color.trim() || undefined
        );

        console.log('🏍️ Capacity section guest booking request data:', {
          sectionId: capacitySection.sectionId,
          spotId: selectedSlot.slotId,
          firstName: guestBookingData.firstName.trim(),
          lastName: guestBookingData.lastName.trim(),
          plateNumber: guestBookingData.plateNumber.trim(),
          brand: guestBookingData.brand.trim() || undefined,
          model: guestBookingData.model.trim() || undefined,
          color: guestBookingData.color.trim() || undefined
        });
      } else {
        // Regular parking spot booking
        console.log('🚗 Creating guest booking for regular spot:', selectedSlot.slotId);
        const numericSpotId = Number(selectedSlot.id);
        if (!Number.isFinite(numericSpotId)) {
          throw new Error(`Invalid regular spot ID: ${selectedSlot.id}`);
        }
        
        response = await ApiService.createGuestBooking({
          spotId: numericSpotId,
          firstName: guestBookingData.firstName.trim(),
          lastName: guestBookingData.lastName.trim(),
          plateNumber: guestBookingData.plateNumber.trim(),
          vehicleType: guestBookingData.vehicleType,
          brand: guestBookingData.brand.trim() || undefined,
          model: guestBookingData.model.trim() || undefined,
          color: guestBookingData.color.trim() || undefined
        });

        console.log('🔍 Guest booking request data:', {
          spotId: numericSpotId,
          firstName: guestBookingData.firstName.trim(),
          lastName: guestBookingData.lastName.trim(),
          plateNumber: guestBookingData.plateNumber.trim(),
          vehicleType: guestBookingData.vehicleType,
          brand: guestBookingData.brand.trim() || undefined,
          model: guestBookingData.model.trim() || undefined,
          color: guestBookingData.color.trim() || undefined
        });
      }

      if (response.success) {
        if (capacitySectionIdForUpdate) {
          setSectionSpotStatusOptimistic(
            capacitySectionIdForUpdate,
            selectedSlot.slotId,
            'active'
          );
        }

        Alert.alert(
          'Success',
          `Guest booking created successfully for ${guestBookingData.firstName} ${guestBookingData.lastName} at spot ${selectedSlot.slotId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                closeGuestBookingModal();
                // Refresh data
                fetchParkingSlots();
                if (['motorcycle', 'bike'].includes(normalizeVehicleType(selectedSlot.vehicleType))) {
                  fetchCapacitySections();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Booking Failed', response.message || 'Failed to create guest booking');
      }
    } catch (error) {
      Alert.alert('Guest Booking Failed', getErrorMessage(error, 'Failed to create guest booking. Please try again.'));
    } finally {
      setIsCreatingGuestBooking(false);
    }
  };

  const handleNotificationToggle = async (newValue: boolean) => {
    setNotificationAlerts(newValue);
    
    try {
      const updatedSettings = {
        ...notificationSettings,
        newReservationAlerts: newValue
      };
      
      const response = await ApiService.updateNotificationSettings(updatedSettings);
      if (response.success) {
        setNotificationSettings(updatedSettings);
        console.log('✅ Notification settings updated successfully');
      }
    } catch (error) {
      Alert.alert('Notification Update Failed', getErrorMessage(error, 'Failed to update notification settings.'));
      // Revert the change if update failed
      setNotificationAlerts(!newValue);
    }
  };

  const { logout } = useAuth();

  // Data fetching functions
  const fetchVehicleTypes = async () => {
    try {
      console.log('🔄 Fetching vehicle types...');
      const response = await ApiService.getVehicleTypes();
      console.log('📊 Vehicle types response:', response);
      if (response.success) {
        const formattedTypes = response.data.vehicleTypes.map(type => ({
          id: type.id,
          name: type.name,
          icon: type.id, // Use id as icon key
          totalCapacity: type.totalCapacity,
          occupied: type.occupied,
          available: type.available,
        }));
        console.log('✅ Formatted vehicle types:', formattedTypes);
        setVehicleTypes(formattedTypes);
      } else {
        console.log('❌ Vehicle types response not successful:', response);
      }
    } catch (error) {
      Alert.alert('Vehicle Types Error', getErrorMessage(error, 'Failed to load vehicle types'));
    }
  };

  const fetchCapacitySections = async (areaIdOverride?: number) => {
    try {
      console.log('🔄 Fetching capacity sections...');
      console.log('👤 Attendant profile available:', !!attendantProfile);
      console.log('📍 Attendant profile data:', attendantProfile);
      
      // Get the attendant's assigned area ID
      const assignedAreaId = areaIdOverride ?? assignedAreaIdRef.current ?? attendantProfile?.assignedAreaId ?? 1;
      console.log(`📍 Fetching capacity sections for area: ${assignedAreaId}`);
      
      const response = await ApiService.getCapacityStatus(assignedAreaId);
      console.log('📊 Capacity sections response:', response);
      
      if (response.success) {
        // Normalize vehicle type for consistent comparisons
        const normalizedSections = response.data.map((section: any) => ({
          ...section,
          vehicleType: normalizeVehicleType(section.vehicleType),
          unavailableCount: Number(section.unavailableCount) || 0
        }));
        console.log('📊 Normalized capacity sections:', normalizedSections);
        setCapacitySections(normalizedSections);
        setSectionUnavailableCounts(prev => {
          const next = { ...prev };
          normalizedSections.forEach((section: any) => {
            next[section.sectionId] = Number(section.unavailableCount) || 0;
          });
          return next;
        });
      }
    } catch (error) {
      Alert.alert('Capacity Sections Error', getErrorMessage(error, 'Failed to load capacity sections'));
    }
  };

  const fetchParkedUsers = async (sectionId: number, occupied: number) => {
    if (occupied === 0) {
      setSectionParkedUsers(prev => ({...prev, [sectionId]: []}));
      return;
    }

    setLoadingUsers(prev => ({...prev, [sectionId]: true}));
    try {
      console.log(`👥 Fetching parked users for section ${sectionId}`);
      const response = await ApiService.getSectionParkedUsers(sectionId);
      
      if (response.success) {
        const users = response.data.parkedUsers.map(user => ({
          name: user.name,
          plateNumber: user.plateNumber
        }));
        setSectionParkedUsers(prev => ({...prev, [sectionId]: users}));
        console.log(`✅ Found ${users.length} parked users in section ${sectionId}`);
      }
    } catch (error) {
      Alert.alert('Parked Users Error', getErrorMessage(error, 'Failed to load parked users'));
      setSectionParkedUsers(prev => ({...prev, [sectionId]: []}));
    } finally {
      setLoadingUsers(prev => ({...prev, [sectionId]: false}));
    }
  };

  const fetchMotorcycleSpots = async (
    sectionId: number,
    vehicleType?: string,
    fromUserAction: boolean = false
  ) => {
    const sectionType =
      normalizeVehicleType(vehicleType) ||
      normalizeVehicleType(capacitySections.find(s => s.sectionId === sectionId)?.vehicleType);

    if (sectionType !== 'motorcycle' && sectionType !== 'bike') {
      setSectionSpots(prev => ({ ...prev, [sectionId]: [] }));
      if (fromUserAction) {
        Alert.alert(
          'Individual Spots Not Available',
          'Individual spot view is not supported for this section type.'
        );
      }
      return;
    }

    setLoadingSpots(prev => ({...prev, [sectionId]: true}));
    try {
      console.log(`🏍️ Fetching motorcycle spots for section ${sectionId}`);
      const response = await ApiService.getSectionMotorcycleSpots(sectionId);
      
      if (response.success) {
        const spots = response.data.spots || [];
        setSectionSpots(prev => ({...prev, [sectionId]: spots}));
        setSectionUnavailableCounts(prev => ({
          ...prev,
          [sectionId]: spots.filter((spot: any) => spot.status === 'unavailable').length
        }));
        console.log(`✅ Found ${response.data.spots.length} motorcycle spots in section ${sectionId}`);
      }
    } catch (error) {
      if (fromUserAction) {
        Alert.alert('Section Spots Error', getErrorMessage(error, 'Failed to load section spots'));
      }
      setSectionSpots(prev => ({...prev, [sectionId]: []}));
    } finally {
      setLoadingSpots(prev => ({...prev, [sectionId]: false}));
    }
  };

  const assignMotorcycleSpot = async (sectionId: number, spotNumber: string, sectionName: string) => {
    try {
      // Get user's vehicles
      const vehiclesResponse = await ApiService.getVehicles();
      if (!vehiclesResponse.success || vehiclesResponse.data.vehicles.length === 0) {
        Alert.alert('No Vehicles', 'You need to add a vehicle first.');
        return;
      }

      // Show vehicle selection
      const vehicles = vehiclesResponse.data.vehicles.filter((v: any) => v.vehicleType === 'motorcycle');
      if (vehicles.length === 0) {
        Alert.alert('No Motorcycle', 'You need to add a motorcycle vehicle first.');
        return;
      }

      // For now, use the first motorcycle (can be enhanced with selection modal)
      const selectedVehicle = vehicles[0];

      console.log(`🏍️ Assigning spot ${spotNumber} to user with vehicle ${selectedVehicle.id}`);
      
      const response = await ApiService.assignMotorcycleSpot(sectionId, spotNumber, selectedVehicle.id);
      
      if (response.success) {
        setSectionSpotStatusOptimistic(sectionId, spotNumber, 'reserved', {
          isUserBooked: true
        });

        Alert.alert(
          'Spot Assigned Successfully!',
          `You have been assigned to ${spotNumber} in ${sectionName}\n\nReservation ID: ${response.data.reservationId}`,
          [{ text: 'OK' }]
        );
        
        // Refresh the spots data to show updated status
        await fetchMotorcycleSpots(sectionId, 'motorcycle');
        await fetchCapacitySections();
      }
    } catch (error: any) {
      Alert.alert('Assignment Failed', getErrorMessage(error, 'Failed to assign parking spot'));
    }
  };

  const releaseMotorcycleSpot = async (sectionId: number, spotNumber: string) => {
    try {
      console.log(`🏍️ Releasing spot ${spotNumber}`);
      
      const response = await ApiService.releaseMotorcycleSpot(sectionId, spotNumber);
      
      if (response.success) {
        setSectionSpotStatusOptimistic(sectionId, spotNumber, 'available');
        Alert.alert(
          'Spot Released',
          `You have successfully released ${spotNumber}`,
          [{ text: 'OK' }]
        );
        
        // Refresh the spots data to show updated status
        await fetchMotorcycleSpots(sectionId, 'motorcycle');
        await fetchCapacitySections();
      }
    } catch (error: any) {
      Alert.alert('Release Failed', getErrorMessage(error, 'Failed to release parking spot'));
    }
  };

  const fetchParkingSlots = async () => {
    try {
      console.log('🔄 Fetching parking slots...');
      const response = await ApiService.getParkingSlots();
      console.log('📊 Parking slots response:', response);
      if (response.success) {
        console.log('✅ Parking slots data:', response.data.parkingSlots);
        console.log('📋 Total slots received:', response.data.parkingSlots.length);
        
        // Debug: Show unique sections
        const uniqueSections = [...new Set(response.data.parkingSlots.map(slot => slot.section))];
        console.log('🏢 Unique sections found:', uniqueSections);
        
        // Debug: Show slots by section
        uniqueSections.forEach(section => {
          const sectionSlots = response.data.parkingSlots.filter(slot => slot.section === section);
          console.log(`📍 Section ${section}: ${sectionSlots.length} slots`, sectionSlots);
        });
        
        setParkingSlots(response.data.parkingSlots);
        
        // Update vehicle types with real-time counts from the fetched parking slots
        setVehicleTypes(currentTypes => updateVehicleTypesWithRealTimeCounts(response.data.parkingSlots, currentTypes));
      } else {
        console.log('❌ Parking slots response not successful:', response);
      }
    } catch (error) {
      Alert.alert('Parking Slots Error', getErrorMessage(error, 'Failed to load parking slots'));
    }
  };

  // Calculate vehicle type counts from actual parking slots data and capacity sections
  const calculateVehicleTypeCounts = (slots: ParkingSlot[]) => {
    const counts: { [key: string]: { total: number; occupied: number; available: number; reserved: number } } = {};
    const capacityBasedTypes = new Set(['motorcycle', 'bike']);
    
    // Count from individual parking slots (exclude capacity-based types to avoid double counting)
    slots.forEach(slot => {
      const vehicleType = normalizeVehicleType(slot.vehicleType);

      if (capacityBasedTypes.has(vehicleType)) {
        return;
      }
      
      if (!counts[vehicleType]) {
        counts[vehicleType] = { total: 0, occupied: 0, available: 0, reserved: 0 };
      }
      
      counts[vehicleType].total++;
      
      switch (slot.status) {
        case 'occupied':
          counts[vehicleType].occupied++;
          break;
        case 'available':
          counts[vehicleType].available++;
          break;
        case 'reserved':
          counts[vehicleType].reserved++;
          break;
        default:
          counts[vehicleType].available++;
          break;
      }
    });
    
    // For capacity-based types, use section totals as source of truth.
    if (capacitySections.length > 0) {
      capacitySections.forEach(section => {
        const vehicleType = normalizeVehicleType(section.vehicleType);
        if (!capacityBasedTypes.has(vehicleType)) {
          return;
        }

        if (!counts[vehicleType]) {
          counts[vehicleType] = { total: 0, occupied: 0, available: 0, reserved: 0 };
        }

        const sectionTotal = Number(section.totalCapacity) || 0;
        const sectionOccupied = Number(section.parkedCount) || 0;
        const sectionReserved = Number(section.reservedCount) || 0;
        // Always derive available from total section capacity to keep dashboard summary consistent.
        const sectionAvailable = Math.max(sectionTotal - sectionOccupied - sectionReserved, 0);

        counts[vehicleType].total += sectionTotal;
        counts[vehicleType].occupied += sectionOccupied;
        counts[vehicleType].reserved += sectionReserved;
        counts[vehicleType].available += sectionAvailable;
      });
    }
    
    return counts;
  };

  // Update vehicle types with real-time counts (only if there are changes)
  const updateVehicleTypesWithRealTimeCounts = (slots: ParkingSlot[], currentTypes: VehicleType[]) => {
    const realTimeCounts = calculateVehicleTypeCounts(slots);
    
    // Check if there are any changes in the counts
    const hasChanges = currentTypes.some(type => {
      const vehicleTypeKey = type.name.toLowerCase().trim();
      const counts = realTimeCounts[vehicleTypeKey] || { total: 0, occupied: 0, available: 0, reserved: 0 };
      
      return type.totalCapacity !== counts.total ||
             type.occupied !== counts.occupied ||
             type.available !== counts.available;
    });
    
    if (hasChanges) {
      console.log('📊 Vehicle type counts have changes, updating smoothly...');
      return currentTypes.map(type => {
        const vehicleTypeKey = type.name.toLowerCase().trim();
        const counts = realTimeCounts[vehicleTypeKey] || { total: 0, occupied: 0, available: 0, reserved: 0 };
        
        return {
          ...type,
          totalCapacity: counts.total,
          occupied: counts.occupied,
          available: counts.available,
        };
      });
    } else {
      console.log('📊 No vehicle type count changes detected, skipping update');
      return currentTypes;
    }
  };

  // Smart update function that only updates changed slots
  const updateParkingSlotsSmoothly = async () => {
    try {
      console.log('🔄 Smoothly updating parking slots...');
      const response = await ApiService.getParkingSlots();
      
      if (response.success) {
        const newSlots = response.data.parkingSlots;
        
        // Compare with current slots and only update if there are changes
        setParkingSlots(currentSlots => {
          const hasChanges = newSlots.some((newSlot: ParkingSlot, index: number) => {
            const currentSlot = currentSlots[index];
            return !currentSlot || 
                   currentSlot.status !== newSlot.status ||
                   currentSlot.occupantName !== newSlot.occupantName ||
                   currentSlot.plateNumber !== newSlot.plateNumber;
          });
          
          if (hasChanges) {
            console.log('📊 Parking slots have changes, updating smoothly...');
            setLastUpdateTime(new Date());
            
            // Update vehicle type counts with new data (only if there are changes)
            setVehicleTypes(currentTypes => updateVehicleTypesWithRealTimeCounts(newSlots, currentTypes));
            
            return newSlots;
          } else {
            console.log('📊 No changes detected in parking slots, skipping update');
            return currentSlots;
          }
        });
      }
      
      // Also update motorcycle capacity sections and individual spots for real-time updates
      console.log('🏍️ Updating motorcycle sections for real-time...');
      await fetchCapacitySections();
      
      // Refresh individual motorcycle spots for each section that has spots loaded
      const sectionsWithSpots = Object.keys(sectionSpotsRef.current);
      for (const sectionIdStr of sectionsWithSpots) {
        const sectionId = parseInt(sectionIdStr);
        if (sectionId && !isNaN(sectionId)) {
          const sectionInfo = capacitySections.find(section => section.sectionId === sectionId);
          const sectionType = normalizeVehicleType(sectionInfo?.vehicleType);
          if (sectionType === 'motorcycle' || sectionType === 'bike') {
            console.log(`🔄 Refreshing capacity spots for section ${sectionId} (${sectionType})`);
            await fetchMotorcycleSpots(sectionId, sectionType);
          }
        }
      }
      
    } catch (error) {
      Alert.alert('Real-time Update Error', getErrorMessage(error, 'Failed to update parking data in real time'));
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // First fetch attendant profile to get assigned area
      console.log('👤 Loading attendant profile...');
      const profileResponse = await ApiService.getAttendantProfile();
      let resolvedAreaId = assignedAreaIdRef.current ?? attendantProfile?.assignedAreaId ?? 1;
      if (profileResponse.success) {
        setAttendantProfile(profileResponse.data.attendantProfile);
        resolvedAreaId = profileResponse.data.attendantProfile?.assignedAreaId ?? resolvedAreaId;
        assignedAreaIdRef.current = resolvedAreaId;
        console.log('✅ Attendant profile loaded:', profileResponse.data.attendantProfile);
      }
      
      // Then fetch vehicle types
      await fetchVehicleTypes();
      
      // Then fetch parking slots (this will also update vehicle type counts with real data)
      await fetchParkingSlots();
      
      // Then fetch capacity sections for assigned area
      await fetchCapacitySections(resolvedAreaId);
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      Alert.alert('Dashboard Load Error', getErrorMessage(error, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Realtime socket updates for parking slots/capacity
  useEffect(() => {
    const areaId = assignedAreaIdRef.current ?? attendantProfile?.assignedAreaId ?? null;
    const userId = user?.user_id ? Number(user.user_id) : undefined;
    let lastRefreshAt = 0;

    setIsPolling(true);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    const refreshFromRealtime = async () => {
      const now = Date.now();
      if (now - lastRefreshAt < 1200) return;
      lastRefreshAt = now;
      try {
        await updateParkingSlotsSmoothly();
      } catch (error) {
        Alert.alert('Realtime Error', getErrorMessage(error, 'Failed while syncing parking updates'));
      }
    };

    const onSpotsUpdated = (payload: any) => {
      if (areaId && payload?.areaId && Number(payload.areaId) !== Number(areaId)) return;
      refreshFromRealtime();
    };

    const onCapacityUpdated = onSpotsUpdated;
    const onReservationUpdated = onSpotsUpdated;

    RealtimeService.connect();
    RealtimeService.subscribe({
      userId,
      areaId: areaId ? Number(areaId) : undefined
    });
    RealtimeService.on('spots:updated', onSpotsUpdated);
    RealtimeService.on('capacity:updated', onCapacityUpdated);
    RealtimeService.on('reservation:updated', onReservationUpdated);

    // Cleanup function
    return () => {
      RealtimeService.off('spots:updated', onSpotsUpdated);
      RealtimeService.off('capacity:updated', onCapacityUpdated);
      RealtimeService.off('reservation:updated', onReservationUpdated);
      RealtimeService.unsubscribe({
        userId,
        areaId: areaId ? Number(areaId) : undefined
      });
      setIsPolling(false);
      pulseAnim.stopAnimation();
    };
  }, [attendantProfile?.assignedAreaId, user?.user_id]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setShowSettingsModal(false);
              router.push('/screens/LoginScreen');
            } catch (error) {
              Alert.alert('Logout Error', getErrorMessage(error, 'Failed to logout cleanly.'));
              setShowSettingsModal(false);
              router.push('/screens/LoginScreen');
            }
          },
        },
      ]
    );
  };

  const handleAdminButton = () => {
    Alert.alert(
      'Admin Access Required',
      'This feature requires administrator privileges. Please contact your system administrator.',
      [{ text: 'OK' }]
    );
  };



  // Filter activity records
  const filterRecords = useCallback(() => {
    let filtered = activityRecords;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => 
        record.scanType === selectedStatus
      );
    }

    // Filter by search query (search by user name, vehicle plate, or area)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(record => 
        (record.userName && record.userName.toLowerCase().includes(query)) ||
        (record.vehiclePlate && record.vehiclePlate.toLowerCase().includes(query)) ||
        (record.parkingArea && record.parkingArea.toLowerCase().includes(query)) ||
        (record.parkingSlot && record.parkingSlot.toLowerCase().includes(query))
      );
    }

    setFilteredRecords(filtered);
  }, [activityRecords, selectedStatus, searchQuery]);

  // Update filtered records when data or filters change
  useEffect(() => {
    filterRecords();
  }, [filterRecords]);

  // Load activity history
  const loadActivityHistory = async () => {
    try {
      setLoadingActivity(true);
      console.log('🔄 Loading activity history...');
      const response = await ApiService.getParkingScanHistory();
      if (response.success) {
        setActivityRecords(response.data.scans);
        console.log('✅ Activity history loaded:', response.data.scans.length, 'records');
      } else {
        Alert.alert('Activity History Error', 'Failed to load activity history');
      }
    } catch (error) {
      Alert.alert('Activity History Error', getErrorMessage(error, 'Failed to load activity history'));
    } finally {
      setLoadingActivity(false);
    }
  };

  const getStatusColor = (status: string) => {
    console.log('🎨 getStatusColor called with:', { 
      status, 
      type: typeof status, 
      length: status?.length,
      json: JSON.stringify(status),
      'status === "unavailable"': status === 'unavailable',
      'status === "UNAVAILABLE"': status === 'UNAVAILABLE'
    });
    switch (status) {
      case 'available':
      case 'active': // Database uses 'available' for vacant spots
        return '#60FF84'; // Green
      case 'occupied':
        return '#FF6C6C'; // Red
      case 'reserved':
        return '#FFF9A6'; // Yellow
      case 'unavailable':
        console.log('✅ Matched unavailable case, returning gray');
        return '#8E8E93'; // Gray for unavailable
      case 'UNAVAILABLE':
        console.log('✅ Matched UNAVAILABLE case, returning gray');
        return '#8E8E93'; // Gray for unavailable
      default:
        console.log('⚠️ Unknown status in getStatusColor, using default gray:', status);
        return '#8E8E93'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
      case 'active': // Database uses 'free' for vacant spots
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const getRegularSpotColor = (status: string) => {
    switch (status) {
      case 'occupied': return '#FF3B30';
      case 'reserved': return '#FF9500';
      case 'available': return '#34C759';
      case 'unavailable': return '#8E8E93'; // Gray for unavailable
      default: return '#34C759';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    const type = vehicleType.toLowerCase();
    if (type === 'car') {
      return carIconSvg;
    } else if (type === 'motorcycle') {
      return motorcycleIconSvg;
    } else if (type === 'bike') {
      return bikeIconSvg; // Now includes both regular bikes and ebikes
    }
    return carIconSvg; // Default fallback
  };

  const renderVehicleTypeCard = (vehicleType: VehicleType) => (
    <View key={vehicleType.id} style={[
      styles.vehicleTypeCard,
      {
        padding: getAdaptivePadding(screenDimensions, 20),
        marginHorizontal: screenDimensions.isLandscape ? getAdaptiveSpacing(screenDimensions, 4) : getAdaptiveSpacing(screenDimensions, 6),
        minWidth: screenDimensions.isTablet ? 180 : 140,
        flex: 1 // Always use flex: 1 to fill available space
      }
    ]}>
      <SvgXml 
        xml={
          vehicleType.id === 'car' ? carIconSvg :
          vehicleType.id === 'motorcycle' ? motorcycleIconSvg :
          bikeIconSvg
        }
        width={screenDimensions.isLandscape 
          ? (screenDimensions.isTablet ? 60 : 50)
          : (screenDimensions.isTablet ? 50 : 40)}
        height={screenDimensions.isLandscape 
          ? (screenDimensions.isTablet ? 60 : 50)
          : (screenDimensions.isTablet ? 50 : 40)}
      />
      <Text style={[styles.vehicleTypeName, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>{vehicleType.name}</Text>
      <View style={styles.capacityInfo}>
        <Text style={[styles.capacityText, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Total Capacity: {vehicleType.totalCapacity}</Text>
        <Text style={[styles.capacityText, { color: '#FF6C6C', fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
          Occupied: {vehicleType.occupied}
        </Text>
        <Text style={[styles.capacityText, { color: '#60FF84', fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
          Available: {vehicleType.available}
        </Text>
      </View>
    </View>
  );

  // Animated Parking Slot Component
  const AnimatedParkingSlot = ({ slot }: { slot: ParkingSlot }) => {
    const slotAnim = useRef(new Animated.Value(1)).current;
    
    // Add a subtle pulse animation when slot status changes
    useEffect(() => {
      const pulseAnimation = Animated.sequence([
        Animated.timing(slotAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slotAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]);
      pulseAnimation.start();
    }, [slot.status]); // Trigger animation when status changes
    
    return (
      <Animated.View
        style={{ transform: [{ scale: slotAnim }] }}
      >
        <TouchableOpacity
          style={[
            styles.parkingSlot,
            { 
              backgroundColor: getRegularSpotColor(slot.status),
              width: screenDimensions.isTablet ? 120 : 102,
              height: screenDimensions.isTablet ? 150 : 131,
              padding: getAdaptivePadding(screenDimensions, 6)
            }
          ]}
          onPress={() => handleSlotPress(slot)}
        >
          <Text style={[styles.slotId, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>{slot.slotId}</Text>
          <Text style={[styles.slotVehicleType, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>{slot.vehicleType}</Text>
          <SvgXml
            xml={getVehicleIcon(slot.vehicleType)}
            width={screenDimensions.isTablet ? 24 : 20}
            height={screenDimensions.isTablet ? 20 : 16}
            style={styles.slotIcon}
          />
          <Text style={[styles.slotStatus, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>{getStatusText(slot.status)}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderParkingSlot = (slot: ParkingSlot) => (
    <AnimatedParkingSlot key={slot.id} slot={slot} />
  );

  // List view rendering function
  const renderParkingSlotList = (slot: ParkingSlot) => (
    <TouchableOpacity
      key={slot.id}
      style={[
        styles.parkingSlotList,
        { 
          backgroundColor: getRegularSpotColor(slot.status),
          padding: getAdaptivePadding(screenDimensions, 10),
          minHeight: screenDimensions.isTablet ? 80 : 70
        }
      ]}
      onPress={() => handleSlotPress(slot)}
    >
      <View style={styles.slotMainInfoList}>
        <Text style={[styles.slotIdList, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>{slot.slotId}</Text>
        <Text style={[styles.slotVehicleTypeList, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>{slot.vehicleType}</Text>
        <SvgXml
          xml={getVehicleIcon(slot.vehicleType)}
          width={screenDimensions.isTablet ? 24 : 20}
          height={screenDimensions.isTablet ? 20 : 16}
        />
      </View>
      <View style={styles.slotDetailsList}>
        <Text style={[styles.slotStatusList, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>{getStatusText(slot.status)}</Text>
        <Text style={[styles.occupantInfoList, { fontSize: getAdaptiveFontSize(screenDimensions, 11) }]}>
          {slot.status === 'available' ? 'N/A' : slot.occupantName || 'N/A'}
        </Text>
        <Text style={[styles.plateInfoList, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
          {slot.status === 'available' ? 'N/A' : slot.plateNumber || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Helper function to create a complete grid with empty slots maintaining row layout
  const createGridWithEmptySlots = (slots: ParkingSlot[], maxSlotsPerRow: number = getAdaptiveColumns(screenDimensions, 5)) => {
    const grid: (ParkingSlot | null)[] = [];
    
    // Sort slots by their slotId to maintain consistent order
    const sortedSlots = [...slots].sort((a, b) => a.slotId.localeCompare(b.slotId));
    
    // Create complete rows
    const totalRows = Math.ceil(sortedSlots.length / maxSlotsPerRow);
    
    for (let row = 0; row < totalRows; row++) {
      const startIndex = row * maxSlotsPerRow;
      const endIndex = Math.min(startIndex + maxSlotsPerRow, sortedSlots.length);
      const rowSlots = sortedSlots.slice(startIndex, endIndex);
      
      // Add slots for this row
      for (let col = 0; col < maxSlotsPerRow; col++) {
        if (col < rowSlots.length) {
          grid.push(rowSlots[col]);
        } else {
          grid.push(null); // Empty slot to maintain row alignment
        }
      }
    }
    
    return grid;
  };

  // Render motorcycle capacity sections with individual spots
  const renderCapacitySections = () => {
    if (capacitySections.length === 0) {
      return (
        <View style={[styles.noCapacitySections, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <Text style={[styles.noCapacityText, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>
            No capacity sections available
          </Text>
        </View>
      );
    }

    const normalizedSelectedType = normalizeVehicleType(selectedVehicleType);
    const sectionsToShow = capacitySections.filter(section => {
      if (normalizedSelectedType === 'all') return true;
      return normalizeVehicleType(section.vehicleType) === normalizedSelectedType;
    });

    if (sectionsToShow.length === 0) {
      return (
        <View style={[styles.noCapacitySections, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <Text style={[styles.noCapacityText, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>
            No capacity sections available for this vehicle type
          </Text>
        </View>
      );
    }

    return (
      <View style={{
        flexDirection: screenDimensions.isLandscape ? 'row' : 'column',
        flexWrap: screenDimensions.isLandscape ? 'wrap' : 'nowrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        marginTop: getAdaptiveSpacing(screenDimensions, 10),
      }}>
        {sectionsToShow.map(section => {
          // Calculate capacity stats from capacity section data
          const totalCapacity = section.totalCapacity;
          const occupied = section.parkedCount || 0;
          const reserved = section.reservedCount || 0;
          const spots = sectionSpots[section.sectionId] || [];
          const unavailableFromState = sectionUnavailableCounts[section.sectionId];
          const unavailableFromBackend = Number(section.unavailableCount) || 0;
          const unavailableFromSpots = spots.filter((spot: any) => spot.status === 'unavailable').length;
          const unavailable = unavailableFromState ?? unavailableFromBackend ?? unavailableFromSpots;
          const available = Math.max(0, Number(section.availableCapacity ?? 0));
          
          // Get individual spots for this section
          const isLoadingSpots = loadingSpots[section.sectionId] || false;

          // Function to get spot color based on status
          const getSpotColor = (status: string, isUserBooked: boolean) => {
            console.log('🎨 getSpotColor called with:', { status, isUserBooked });
            if (isUserBooked) return '#8A0000'; // Maroon for user's booking (consistent with app theme)
            switch (status) {
              case 'available': return '#34C759'; // Green
              case 'occupied': return '#FF3B30'; // Red
              case 'active': return '#FF3B30'; // Red - active is same as occupied
              case 'reserved': return '#FF9500'; // Orange
              case 'unavailable': return '#8E8E93'; // Gray for unavailable
              case 'maintenance': return '#FF9500'; // Orange for maintenance
              default: return '#34C759'; // Default to green
            }
          };

          return (
            <View key={section.sectionId} style={[
              styles.capacitySectionCard,
              screenDimensions.isLandscape ? {
                width: '48%',
                marginBottom: getAdaptiveSpacing(screenDimensions, 10),
                marginRight: getAdaptiveSpacing(screenDimensions, 2) // Small margin between columns
              } : {
                width: '100%',
                marginBottom: getAdaptiveSpacing(screenDimensions, 15)
              }
            ]}>
              {/* Section Header */}
              <View style={styles.capacitySectionHeader}>
                <Text style={[styles.capacitySectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
                  {section.sectionName}
                </Text>
                <Text style={[styles.capacitySectionSubtitle, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                  {section.vehicleType === 'bike' ? 'Bicycle Section' : `${section.vehicleType?.charAt(0).toUpperCase() || 'M'}${section.vehicleType?.slice(1) || ''} Section`}
                </Text>
              </View>
              
              {/* Capacity Stats */}
              <View style={styles.capacityStats}>
                {section.status === 'unavailable' ? (
                  <View style={[styles.capacityStatItem, { flex: 1 }]}>
                    <Text style={[styles.capacityStatNumber, { color: '#8E8E93', fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                      UNAVAILABLE
                    </Text>
                    <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                      Section Closed
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.capacityStatItem}>
                      <Text style={[styles.capacityStatNumber, { fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                        {totalCapacity}
                      </Text>
                      <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                        Total
                      </Text>
                    </View>
                    
                    <View style={styles.capacityStatItem}>
                      <Text style={[styles.capacityStatNumber, { color: '#60FF84', fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                        {available}
                      </Text>
                      <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                        Available
                      </Text>
                    </View>
                    
                    <View style={styles.capacityStatItem}>
                      <Text style={[styles.capacityStatNumber, { color: '#FF6C6C', fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                        {occupied}
                      </Text>
                      <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                        Occupied
                      </Text>
                    </View>

                    <View style={styles.capacityStatItem}>
                      <Text style={[styles.capacityStatNumber, { color: '#FF9500', fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                        {reserved}
                      </Text>
                      <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                        Reserved
                      </Text>
                    </View>

                    <View style={styles.capacityStatItem}>
                      <Text style={[styles.capacityStatNumber, { color: '#8E8E93', fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>
                        {unavailable}
                      </Text>
                      <Text style={[styles.capacityStatLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 10) }]}>
                        Unavailable
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Utilization Bar */}
              <View style={styles.utilizationBar}>
                <View style={[
                  styles.utilizationFill,
                  { 
                    width: `${parseFloat(section.utilizationRate)}%`,
                    backgroundColor: parseFloat(section.utilizationRate) > 80 ? '#FF6C6C' : 
                                   parseFloat(section.utilizationRate) > 60 ? '#FFCC00' : '#60FF84'
                  }
                ]} />
              </View>

              {/* Individual Spots Grid */}
              <View style={styles.spotsGridContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TouchableOpacity 
                    style={styles.showSpotsButton}
                    onPress={() => {
                      if (spots.length === 0 && !isLoadingSpots) {
                        fetchMotorcycleSpots(section.sectionId, section.vehicleType, true);
                      } else if (spots.length > 0) {
                        // Toggle: close the spots by clearing them
                        setSectionSpots(prev => ({ ...prev, [section.sectionId]: [] }));
                      }
                    }}
                  >
                    <Text style={[styles.showSpotsButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                      {isLoadingSpots ? 'Loading spots...' : spots.length > 0 ? 'Hide Individual Spots' : 'Show Individual Spots'}
                    </Text>
                    {!isLoadingSpots && (
                      <Ionicons 
                        name={spots.length > 0 ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#007AFF" 
                      />
                    )}
                  </TouchableOpacity>

                  {/* Settings Icon */}
                  <TouchableOpacity
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: '#f8f9fa',
                      borderWidth: 1,
                      borderColor: '#e9ecef'
                    }}
                    onPress={() => {
                      setSelectedSectionForSettings(section);
                      setSectionUnavailableReason('');
                      setShowSectionSettingsModal(true);
                    }}
                  >
                    <MaterialIcons name="settings" size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Spots Grid */}
                {spots.length > 0 && (
                  <View style={[
                    styles.spotsGrid,
                    {
                      flexDirection: viewMode === 'list' ? 'column' : 'row',
                      flexWrap: viewMode === 'list' ? 'nowrap' : 'wrap',
                      justifyContent: 'flex-start',
                      marginTop: 8,
                      gap: screenDimensions.isTablet ? 6 : 4,
                    }
                  ]}>
                    {spots.map((spot) => (
                      <TouchableOpacity
                        key={spot.spotId}
                        style={[
                          styles.parkingSlot,
                          { 
                            backgroundColor: getSpotColor(spot.status, spot.isUserBooked),
                            width: viewMode === 'list' ? '100%' : (screenDimensions.isTablet ? 120 : 102),
                            height: viewMode === 'list' ? 'auto' : (screenDimensions.isTablet ? 150 : 131),
                            padding: viewMode === 'list' ? getAdaptivePadding(screenDimensions, 12) : getAdaptivePadding(screenDimensions, 6),
                            marginBottom: viewMode === 'list' ? getAdaptiveSpacing(screenDimensions, 8) : 0,
                            flexDirection: viewMode === 'list' ? 'row' : 'column',
                            alignItems: viewMode === 'list' ? 'center' : 'center',
                            justifyContent: viewMode === 'list' ? 'space-between' : 'center',
                          }
                        ]}
                        onPress={() => handleMotorcycleSpotPress(spot, section.sectionId, section.sectionName, section.vehicleType)}
                      >
                        {/* Spot Number and Status for List View */}
                        {viewMode === 'list' && (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                              width: screenDimensions.isTablet ? 50 : 40,
                              height: screenDimensions.isTablet ? 50 : 40,
                              borderRadius: 8,
                              backgroundColor: getSpotColor(spot.status, spot.isUserBooked),
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 12
                            }}>
                              <Text style={[styles.slotId, { 
                                fontSize: getAdaptiveFontSize(screenDimensions, 12),
                                color: '#FFFFFF',
                                fontWeight: 'bold'
                              }]}>{spot.spotNumber}</Text>
                            </View>
                            
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.slotId, { 
                                fontSize: getAdaptiveFontSize(screenDimensions, 14),
                                fontWeight: 'bold',
                                marginBottom: 2
                              }]}>
                                Spot {spot.spotNumber}
                              </Text>
                              <Text style={[styles.slotVehicleType, { 
                                fontSize: getAdaptiveFontSize(screenDimensions, 12),
                                color: '#666'
                              }]}>
                                {section.vehicleType} • {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                              </Text>
                              {spot.reservation && (
                                <Text style={[styles.slotStatus, { 
                                  fontSize: getAdaptiveFontSize(screenDimensions, 11),
                                  color: '#666',
                                  marginTop: 2
                                }]}>
                                  {spot.reservation.userName} • {spot.reservation.plateNumber}
                                </Text>
                              )}
                            </View>
                            
                            <View style={{ alignItems: 'flex-end' }}>
                              <SvgXml
                                xml={getVehicleIcon(section.vehicleType)}
                                width={screenDimensions.isTablet ? 28 : 24}
                                height={screenDimensions.isTablet ? 24 : 20}
                                style={{ marginBottom: 4 }}
                              />
                              {spot.isUserBooked && (
                                <View style={[styles.userBookedIndicator, { 
                                  backgroundColor: '#8A0000',
                                  paddingHorizontal: 4,
                                  paddingVertical: 2
                                }]}>
                                  <Ionicons name="person" size={10} color="#FFFFFF" />
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {/* Grid View Content */}
                        {viewMode === 'grid' && (
                          <>
                            <Text style={[styles.slotId, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 12),
                              color: '#FFFFFF'
                            }]}>{spot.spotNumber}</Text>
                            <Text style={[styles.slotVehicleType, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 10),
                              color: 'rgba(255, 255, 255, 0.8)'
                            }]}>{section.vehicleType}</Text>
                            <SvgXml
                              xml={getVehicleIcon(section.vehicleType)}
                              width={screenDimensions.isTablet ? 24 : 20}
                              height={screenDimensions.isTablet ? 20 : 16}
                              style={styles.slotIcon}
                            />
                            <Text style={[styles.slotStatus, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 10),
                              color: 'rgba(255, 255, 255, 0.9)'
                            }]}>
                              {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSection = (section: string, filteredSlots: ParkingSlot[] = parkingSlots) => {
    // Check if this is a motorcycle capacity section
    const matchedCapacitySection = capacitySections.find(cap => cap.sectionName === section);
    
    const normalizedSelectedType = normalizeVehicleType(selectedVehicleType);
    if (matchedCapacitySection && (normalizedSelectedType === 'all' || normalizeVehicleType(matchedCapacitySection.vehicleType) === normalizedSelectedType)) {
      // Render motorcycle capacity section with original card design
      const spots = sectionSpots[matchedCapacitySection.sectionId] || [];
      const isLoadingSpots = loadingSpots[matchedCapacitySection.sectionId] || false;
      const unavailableFromState = sectionUnavailableCounts[matchedCapacitySection.sectionId];
      const unavailableFromBackend = Number(matchedCapacitySection.unavailableCount) || 0;
      const unavailableFromSpots = spots.filter((spot: any) => spot.status === 'unavailable').length;
      const unavailable = unavailableFromState ?? unavailableFromBackend ?? unavailableFromSpots;
      const available = Math.max(0, Number(matchedCapacitySection.availableCapacity ?? 0));

      const getSpotColor = (status: string, isUserBooked: boolean) => {
        if (isUserBooked) return '#8A0000'; // Maroon for user's booking (consistent with app theme)
        switch (status) {
          case 'available': return '#34C759'; // Green
          case 'occupied': return '#FF3B30'; // Red
          case 'active': return '#FF3B30'; // Red - active is same as occupied
          case 'reserved': return '#FF9500'; // Orange
          case 'unavailable': return '#8E8E93'; // Gray for unavailable
          case 'maintenance': return '#FF9500'; // Orange for maintenance
          default: return '#34C759'; // Default to green
        }
      };

      return (
        <View key={section} style={[
          styles.capacitySectionCard,
          screenDimensions.isLandscape ? {
            width: '48%',
            marginBottom: getAdaptiveSpacing(screenDimensions, 10)
          } : {
            width: '100%',
            marginBottom: getAdaptiveSpacing(screenDimensions, 15)
          }
        ]}>
          {/* Section Header */}
          <View style={styles.capacitySectionHeader}>
            <Text style={[styles.capacitySectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
              {section}
            </Text>
            <Text style={[styles.capacitySectionSubtitle, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
              {matchedCapacitySection.vehicleType === 'bike' ? 'Bicycle Section' : `${matchedCapacitySection.vehicleType?.charAt(0).toUpperCase() || 'M'}${matchedCapacitySection.vehicleType?.slice(1) || ''} Section`}
            </Text>
          </View>
          
          {/* Capacity Stats */}
          <View style={styles.capacityStats}>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.totalCapacity}</Text>
              <Text style={styles.capacityStatLabel}>Total</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.parkedCount || 0}</Text>
              <Text style={styles.capacityStatLabel}>Occupied</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.reservedCount || 0}</Text>
              <Text style={styles.capacityStatLabel}>Reserved</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{unavailable}</Text>
              <Text style={styles.capacityStatLabel}>Unavailable</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{available}</Text>
              <Text style={styles.capacityStatLabel}>Available</Text>
            </View>
          </View>

          {/* Utilization Bar */}
          <View style={styles.utilizationBar}>
            <View style={[
              styles.utilizationFill,
              {
                width: `${parseFloat(matchedCapacitySection.utilizationRate)}%`,
                backgroundColor: parseFloat(matchedCapacitySection.utilizationRate) > 80 ? '#FF6C6C' : 
                               parseFloat(matchedCapacitySection.utilizationRate) > 60 ? '#FFCC00' : '#60FF84'
              }
            ]} />
          </View>

          {/* Individual Spots Grid */}
          <View style={styles.spotsGridContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={styles.showSpotsButton}
                onPress={() => {
                  if (spots.length === 0 && !isLoadingSpots) {
                    fetchMotorcycleSpots(matchedCapacitySection.sectionId, matchedCapacitySection.vehicleType, true);
                  } else if (spots.length > 0) {
                    setSectionSpots(prev => ({ ...prev, [matchedCapacitySection.sectionId]: [] }));
                  }
                }}
              >
                <Text style={[styles.showSpotsButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                  {isLoadingSpots ? 'Loading spots...' : spots.length > 0 ? 'Hide Individual Spots' : 'Show Individual Spots'}
                </Text>
                {!isLoadingSpots && (
                  <Ionicons 
                    name={spots.length > 0 ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#007AFF" 
                  />
                )}
              </TouchableOpacity>

              {/* Settings Icon */}
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#f8f9fa',
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}
                onPress={() => {
                  setSelectedSectionForSettings(matchedCapacitySection);
                  setSectionUnavailableReason('');
                  setShowSectionSettingsModal(true);
                }}
              >
                <MaterialIcons name="settings" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {spots.length > 0 && (
              <View style={[
                styles.spotsGrid,
                {
                  flexDirection: viewMode === 'list' ? 'column' : 'row',
                  flexWrap: viewMode === 'list' ? 'nowrap' : 'wrap',
                  justifyContent: 'flex-start',
                  marginTop: 8,
                  gap: screenDimensions.isTablet ? 6 : 4,
                }
              ]}>
                {spots.map((spot) => {
                  // Create a mock ParkingSlot object for the motorcycle spot
                  const mockSlot: ParkingSlot = {
                    id: spot.spotId,
                    slotId: spot.spotNumber,
                    vehicleType: matchedCapacitySection.vehicleType,
                    status: spot.status === 'active' ? 'occupied' : spot.status,
                    section: section,
                    occupantName: spot.reservation ? spot.reservation.userName : '',
                    plateNumber: spot.reservation ? spot.reservation.plateNumber : ''
                  };

                  return (
                    <TouchableOpacity
                      key={spot.spotId}
                      style={[
                        styles.parkingSlot,
                        { 
                          backgroundColor: getSpotColor(spot.status, spot.isUserBooked),
                          width: viewMode === 'list' ? '100%' : (screenDimensions.isTablet ? 120 : 102),
                          height: viewMode === 'list' ? 'auto' : (screenDimensions.isTablet ? 150 : 131),
                          padding: viewMode === 'list' ? getAdaptivePadding(screenDimensions, 12) : getAdaptivePadding(screenDimensions, 6),
                          marginBottom: viewMode === 'list' ? getAdaptiveSpacing(screenDimensions, 8) : 0,
                          flexDirection: viewMode === 'list' ? 'row' : 'column',
                          alignItems: viewMode === 'list' ? 'center' : 'center',
                          justifyContent: viewMode === 'list' ? 'space-between' : 'center',
                        }
                      ]}
                      onPress={() => handleMotorcycleSpotPress(spot, matchedCapacitySection.sectionId, matchedCapacitySection.sectionName, matchedCapacitySection.vehicleType)}
                    >
                      {/* Spot Number and Status for List View */}
                      {viewMode === 'list' && (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: screenDimensions.isTablet ? 50 : 40,
                            height: screenDimensions.isTablet ? 50 : 40,
                            borderRadius: 8,
                            backgroundColor: getSpotColor(spot.status, spot.isUserBooked),
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12
                          }}>
                            <Text style={[styles.slotId, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 12),
                              color: '#FFFFFF',
                              fontWeight: 'bold'
                            }]}>{spot.spotNumber}</Text>
                          </View>
                          
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.slotId, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 14),
                              fontWeight: 'bold',
                              marginBottom: 2
                            }]}>
                              Spot {spot.spotNumber}
                            </Text>
                            <Text style={[styles.slotVehicleType, { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 12),
                              color: '#666'
                            }]}>
                              {matchedCapacitySection.vehicleType} • {spot.status === 'active' ? 'Occupied' : spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                            </Text>
                            {spot.reservation && (
                              <Text style={[styles.slotStatus, { 
                                fontSize: getAdaptiveFontSize(screenDimensions, 11),
                                color: '#666',
                                marginTop: 2
                              }]}>
                                {spot.reservation.userName} • {spot.reservation.plateNumber}
                              </Text>
                            )}
                          </View>
                          
                          <View style={{ alignItems: 'flex-end' }}>
                            <SvgXml
                              xml={getVehicleIcon(matchedCapacitySection.vehicleType)}
                              width={screenDimensions.isTablet ? 28 : 24}
                              height={screenDimensions.isTablet ? 24 : 20}
                              style={{ marginBottom: 4 }}
                            />
                            {spot.isUserBooked && (
                              <View style={[styles.userBookedIndicator, { 
                                backgroundColor: '#8A0000',
                                paddingHorizontal: 4,
                                paddingVertical: 2
                              }]}>
                                <Ionicons name="person" size={10} color="#FFFFFF" />
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                      
                      {/* Grid View Content */}
                      {viewMode === 'grid' && (
                        <>
                          <Text style={[styles.slotId, { 
                            fontSize: getAdaptiveFontSize(screenDimensions, 12),
                            color: '#FFFFFF'
                          }]}>{spot.spotNumber}</Text>
                          <Text style={[styles.slotVehicleType, { 
                            fontSize: getAdaptiveFontSize(screenDimensions, 10),
                            color: 'rgba(255, 255, 255, 0.8)'
                          }]}>{matchedCapacitySection.vehicleType}</Text>
                          <SvgXml
                            xml={getVehicleIcon(matchedCapacitySection.vehicleType)}
                            width={screenDimensions.isTablet ? 24 : 20}
                            height={screenDimensions.isTablet ? 20 : 16}
                            style={styles.slotIcon}
                          />
                          <Text style={[styles.slotStatus, { 
                            fontSize: getAdaptiveFontSize(screenDimensions, 10),
                            color: 'rgba(255, 255, 255, 0.9)'
                          }]}>
                            {spot.status === 'active' ? 'Occupied' : spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // Regular parking section logic - Apply motorcycle card design to all vehicle types
    let sectionSlots = filteredSlots.filter(slot => slot.section === section);
    
    // Apply vehicle type filtering
    if (selectedVehicleType !== 'all') {
      sectionSlots = sectionSlots.filter(slot => {
        const slotVehicleType = slot.vehicleType.toLowerCase().trim();
        if (selectedVehicleType === 'ebike') {
          return slotVehicleType === 'bike';
        }
        return slotVehicleType.includes(selectedVehicleType);
      });
    } else {
      sectionSlots = sectionSlots.slice(0, 10);
    }
    
    if (sectionSlots.length === 0) {
      return null;
    }

    return (
      <View key={section} style={[
        styles.capacitySectionCard,
        screenDimensions.isLandscape ? {
          width: '48%',
          marginBottom: getAdaptiveSpacing(screenDimensions, 10)
        } : {
          width: '100%',
          marginBottom: getAdaptiveSpacing(screenDimensions, 15)
        }
      ]}>
        {/* Section Header */}
        <View style={styles.capacitySectionHeader}>
          <Text style={[styles.capacitySectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
            {section}
          </Text>
          <Text style={[styles.capacitySectionSubtitle, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
            {selectedVehicleType === 'all' ? 'Parking Section' : `${selectedVehicleType.charAt(0).toUpperCase() + selectedVehicleType.slice(1)} Section`}
          </Text>
        </View>
        
        {/* Individual Spots Grid */}
        <View style={styles.spotsGridContainer}>
          {/* Spots Grid */}
          <View style={[
            styles.spotsGrid,
            {
              flexDirection: viewMode === 'list' ? 'column' : 'row',
              flexWrap: viewMode === 'list' ? 'nowrap' : 'wrap',
              justifyContent: 'flex-start',
              marginTop: 8,
              gap: screenDimensions.isTablet ? 6 : 4,
            }
          ]}>
            {sectionSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.parkingSlot,
                  { 
                    backgroundColor: getRegularSpotColor(slot.status),
                    width: viewMode === 'list' ? '100%' : (screenDimensions.isTablet ? 120 : 102),
                    height: viewMode === 'list' ? 'auto' : (screenDimensions.isTablet ? 150 : 131),
                    padding: viewMode === 'list' ? getAdaptivePadding(screenDimensions, 12) : getAdaptivePadding(screenDimensions, 6),
                    marginBottom: viewMode === 'list' ? getAdaptiveSpacing(screenDimensions, 8) : 0,
                    flexDirection: viewMode === 'list' ? 'row' : 'column',
                    alignItems: viewMode === 'list' ? 'center' : 'center',
                    justifyContent: viewMode === 'list' ? 'space-between' : 'center',
                  }
                ]}
                onPress={() => handleSlotPress(slot)}
              >
                {/* Spot Number and Status for List View */}
                {viewMode === 'list' && (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: screenDimensions.isTablet ? 50 : 40,
                      height: screenDimensions.isTablet ? 50 : 40,
                      borderRadius: 8,
                      backgroundColor: getRegularSpotColor(slot.status),
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12
                    }}>
                      <Text style={[styles.slotId, { 
                        fontSize: getAdaptiveFontSize(screenDimensions, 12),
                        color: '#FFFFFF',
                        fontWeight: 'bold'
                      }]}>{slot.slotId}</Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotId, { 
                        fontSize: getAdaptiveFontSize(screenDimensions, 14),
                        fontWeight: 'bold',
                        marginBottom: 2
                      }]}>
                        Spot {slot.slotId}
                      </Text>
                      <Text style={[styles.slotVehicleType, { 
                        fontSize: getAdaptiveFontSize(screenDimensions, 12),
                        color: '#666'
                      }]}>
                        {slot.vehicleType} • {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </Text>
                      {slot.occupantName && (
                        <Text style={[styles.slotStatus, { 
                          fontSize: getAdaptiveFontSize(screenDimensions, 11),
                          color: '#666',
                          marginTop: 2
                        }]}>
                          {slot.occupantName} • {slot.plateNumber}
                        </Text>
                      )}
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <SvgXml
                        xml={getVehicleIcon(slot.vehicleType)}
                        width={screenDimensions.isTablet ? 28 : 24}
                        height={screenDimensions.isTablet ? 24 : 20}
                        style={{ marginBottom: 4 }}
                      />
                    </View>
                  </View>
                )}
                
                {/* Grid View Content */}
                {viewMode === 'grid' && (
                  <>
                    <Text style={[styles.slotId, { 
                      fontSize: getAdaptiveFontSize(screenDimensions, 12),
                      color: '#FFFFFF'
                    }]}>{slot.slotId}</Text>
                    <Text style={[styles.slotVehicleType, { 
                      fontSize: getAdaptiveFontSize(screenDimensions, 10),
                      color: 'rgba(255, 255, 255, 0.8)'
                    }]}>{slot.vehicleType}</Text>
                    <SvgXml
                      xml={getVehicleIcon(slot.vehicleType)}
                      width={screenDimensions.isTablet ? 24 : 20}
                      height={screenDimensions.isTablet ? 20 : 16}
                      style={styles.slotIcon}
                    />
                    <Text style={[styles.slotStatus, { 
                      fontSize: getAdaptiveFontSize(screenDimensions, 10),
                      color: 'rgba(255, 255, 255, 0.9)'
                    }]}>
                      {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // List view section rendering function
  const renderSectionList = (section: string, filteredSlots: ParkingSlot[] = parkingSlots) => {
    // Check if this is a motorcycle capacity section
    const matchedCapacitySection = capacitySections.find(cap => cap.sectionName === section);
    
    if (matchedCapacitySection && (selectedVehicleType === 'all' || matchedCapacitySection.vehicleType === (selectedVehicleType === 'ebike' ? 'bike' : selectedVehicleType))) {
      // Render motorcycle capacity section in list view
      const spots = sectionSpots[matchedCapacitySection.sectionId] || [];
      const isLoadingSpots = loadingSpots[matchedCapacitySection.sectionId] || false;
      const unavailableFromState = sectionUnavailableCounts[matchedCapacitySection.sectionId];
      const unavailableFromBackend = Number(matchedCapacitySection.unavailableCount) || 0;
      const unavailableFromSpots = spots.filter((spot: any) => spot.status === 'unavailable').length;
      const unavailable = unavailableFromState ?? unavailableFromBackend ?? unavailableFromSpots;
      const available = Math.max(0, Number(matchedCapacitySection.availableCapacity ?? 0));

      const getSpotColor = (status: string, isUserBooked: boolean) => {
        if (isUserBooked) return '#8A0000'; // Maroon for user's booking (consistent with app theme)
        switch (status) {
          case 'available': return '#34C759'; // Green
          case 'occupied': return '#FF3B30'; // Red
          case 'active': return '#FF3B30'; // Red - active is same as occupied
          case 'reserved': return '#FF9500'; // Orange
          case 'unavailable': return '#8E8E93'; // Gray for unavailable
          case 'maintenance': return '#FF9500'; // Orange for maintenance
          default: return '#34C759'; // Default to green
        }
      };

      return (
        <View key={section} style={[
          styles.capacitySectionCard,
          { width: '100%', marginBottom: getAdaptiveSpacing(screenDimensions, 15) }
        ]}>
          {/* Section Header */}
          <View style={styles.capacitySectionHeader}>
            <Text style={[styles.capacitySectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
              {section}
            </Text>
            <Text style={[styles.capacitySectionSubtitle, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
              {matchedCapacitySection.vehicleType === 'bike' ? 'Bicycle Section' : `${matchedCapacitySection.vehicleType?.charAt(0).toUpperCase() || 'M'}${matchedCapacitySection.vehicleType?.slice(1) || ''} Section`}
            </Text>
          </View>
          
          {/* Capacity Stats */}
          <View style={styles.capacityStats}>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.totalCapacity}</Text>
              <Text style={styles.capacityStatLabel}>Total</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.parkedCount || 0}</Text>
              <Text style={styles.capacityStatLabel}>Occupied</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{matchedCapacitySection.reservedCount || 0}</Text>
              <Text style={styles.capacityStatLabel}>Reserved</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{unavailable}</Text>
              <Text style={styles.capacityStatLabel}>Unavailable</Text>
            </View>
            <View style={styles.capacityStatItem}>
              <Text style={styles.capacityStatNumber}>{available}</Text>
              <Text style={styles.capacityStatLabel}>Available</Text>
            </View>
          </View>

          {/* Utilization Bar */}
          <View style={styles.utilizationBar}>
            <View style={[
              styles.utilizationFill,
              {
                width: `${parseFloat(matchedCapacitySection.utilizationRate)}%`,
                backgroundColor: parseFloat(matchedCapacitySection.utilizationRate) > 80 ? '#FF6C6C' : 
                               parseFloat(matchedCapacitySection.utilizationRate) > 60 ? '#FFCC00' : '#60FF84'
              }
            ]} />
          </View>

          {/* Individual Spots List */}
          <View style={styles.spotsGridContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={styles.showSpotsButton}
                onPress={() => {
                  if (spots.length === 0 && !isLoadingSpots) {
                    fetchMotorcycleSpots(matchedCapacitySection.sectionId, matchedCapacitySection.vehicleType, true);
                  } else if (spots.length > 0) {
                    setSectionSpots(prev => ({ ...prev, [matchedCapacitySection.sectionId]: [] }));
                  }
                }}
              >
                <Text style={[styles.showSpotsButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                  {isLoadingSpots ? 'Loading spots...' : spots.length > 0 ? 'Hide Individual Spots' : 'Show Individual Spots'}
                </Text>
                {!isLoadingSpots && (
                  <Ionicons 
                    name={spots.length > 0 ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#007AFF" 
                  />
                )}
              </TouchableOpacity>

              {/* Settings Icon */}
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#f8f9fa',
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}
                onPress={() => {
                  setSelectedSectionForSettings(matchedCapacitySection);
                  setSectionUnavailableReason('');
                  setShowSectionSettingsModal(true);
                }}
              >
                <MaterialIcons name="settings" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {spots.length > 0 && (
              <View style={styles.slotsList}>
                {spots.map((spot) => (
                  <TouchableOpacity
                    key={spot.spotId}
                    style={[
                      styles.parkingSpotList,
                      { 
                        backgroundColor: getSpotColor(spot.status, spot.isUserBooked),
                        padding: getAdaptivePadding(screenDimensions, 10),
                        minHeight: screenDimensions.isTablet ? 80 : 70
                      }
                    ]}
                    onPress={() => handleMotorcycleSpotPress(spot, matchedCapacitySection.sectionId, matchedCapacitySection.sectionName, matchedCapacitySection.vehicleType)}
                  >
                    <View style={styles.slotMainInfoList}>
                      <Text style={[styles.slotIdList, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>{spot.spotNumber}</Text>
                      <Text style={[styles.slotVehicleTypeList, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                        {matchedCapacitySection.vehicleType === 'bike' ? 'Bike' : 'Motorcycle'}
                      </Text>
                      <SvgXml
                        xml={getVehicleIcon(matchedCapacitySection.vehicleType)}
                        width={screenDimensions.isTablet ? 24 : 20}
                        height={screenDimensions.isTablet ? 20 : 16}
                        fill="white"
                      />
                    </View>
                    {spot.reservation && (
                      <View style={styles.slotDetailsList}>
                        <Text style={[styles.slotOccupantList, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>
                          {spot.reservation.userName}
                        </Text>
                        <Text style={[styles.slotPlateList, { fontSize: getAdaptiveFontSize(screenDimensions, 11) }]}>
                          {spot.reservation.plateNumber}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // Regular parking section logic
    let sectionSlots = filteredSlots.filter(slot => slot.section === section);
    
    // Apply vehicle type filtering
    if (selectedVehicleType !== 'all') {
      sectionSlots = sectionSlots.filter(slot => {
        const slotVehicleType = slot.vehicleType.toLowerCase().trim();
        if (selectedVehicleType === 'ebike') {
          return slotVehicleType === 'bike';
        }
        return slotVehicleType.includes(selectedVehicleType);
      });
    } else {
      sectionSlots = sectionSlots.slice(0, 10);
    }
    
    if (sectionSlots.length === 0) {
      return null;
    }
    
    return (
      <View key={section} style={[
        styles.capacitySectionCard,
        { width: '100%', marginBottom: getAdaptiveSpacing(screenDimensions, 15) }
      ]}>
        <Text style={[styles.sectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>{section}</Text>
        <View style={styles.slotsList}>
          {sectionSlots.map(renderParkingSlotList)}
        </View>
      </View>
    );
  };


  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={dashboardScreenStyles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[dashboardScreenStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={dashboardScreenStyles.loadingText}>Loading dashboard data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <SvgXml 
            xml={tapParkWhiteLogoSvg} 
            width={32} 
            height={32} 
          />
          <Text style={styles.logoText}>TapPark</Text>
        </View>
        <View style={styles.profileContainer}>
          <TouchableOpacity
            style={styles.profileGroup}
            onPress={async () => {
              console.log('Profile/Attendant tapped');
              await handleSettingsPress();
            }}
          >
            <ProfilePicture 
              size={28} 
              profileImageUrl={getNormalizedProfileImageFromUser(user as any) || undefined}
            />
            <Text style={styles.attendantText}>
              Attendant: {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => {
            console.log('📊 Opening activity history modal');
            setShowActivityModal(true);
            loadActivityHistory(); // Load data when modal opens
          }}>
            <SvgXml 
              xml={`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 23.25C9.375 23.25 7.05208 22.4533 5.03125 20.86C3.01042 19.2667 1.69792 17.23 1.09375 14.75C1.01042 14.4375 1.07292 14.1512 1.28125 13.8912C1.48958 13.6312 1.77083 13.48 2.125 13.4375C2.45833 13.3958 2.76042 13.4583 3.03125 13.625C3.30208 13.7917 3.48958 14.0417 3.59375 14.375C4.09375 16.25 5.125 17.7813 6.6875 18.9688C8.25 20.1562 10.0208 20.75 12 20.75C14.4375 20.75 16.5054 19.9012 18.2037 18.2037C19.9021 16.5062 20.7508 14.4383 20.75 12C20.7492 9.56167 19.9004 7.49417 18.2037 5.7975C16.5071 4.10083 14.4392 3.25167 12 3.25C10.5625 3.25 9.21875 3.58333 7.96875 4.25C6.71875 4.91667 5.66667 5.83333 4.8125 7H7C7.35417 7 7.65125 7.12 7.89125 7.36C8.13125 7.6 8.25083 7.89667 8.25 8.25C8.24917 8.60333 8.12917 8.90042 7.89 9.14125C7.65083 9.38208 7.35417 9.50167 7 9.5H2C1.64583 9.5 1.34917 9.38 1.11 9.14C0.870833 8.9 0.750833 8.60333 0.75 8.25V3.25C0.75 2.89583 0.87 2.59917 1.11 2.36C1.35 2.12083 1.64667 2.00083 2 2C2.35333 1.99917 2.65042 2.11917 2.89125 2.36C3.13208 2.60083 3.25167 2.8975 3.25 3.25V4.9375C4.3125 3.60417 5.60958 2.57292 7.14125 1.84375C8.67292 1.11458 10.2925 0.75 12 0.75C13.5625 0.75 15.0262 1.04708 16.3912 1.64125C17.7562 2.23542 18.9438 3.03708 19.9538 4.04625C20.9638 5.05542 21.7658 6.24292 22.36 7.60875C22.9542 8.97458 23.2508 10.4383 23.25 12C23.2492 13.5617 22.9525 15.0254 22.36 16.3912C21.7675 17.7571 20.9654 18.9446 19.9538 19.9538C18.9421 20.9629 17.7546 21.765 16.3912 22.36C15.0279 22.955 13.5642 23.2517 12 23.25ZM13.25 11.5L16.375 14.625C16.6042 14.8542 16.7188 15.1458 16.7188 15.5C16.7188 15.8542 16.6042 16.1458 16.375 16.375C16.1458 16.6042 15.8542 16.7188 15.5 16.7188C15.1458 16.7188 14.8542 16.6042 14.625 16.375L11.125 12.875C11 12.75 10.9062 12.6096 10.8438 12.4537C10.7812 12.2979 10.75 12.1363 10.75 11.9688V7C10.75 6.64583 10.87 6.34917 11.11 6.11C11.35 5.87083 11.6467 5.75083 12 5.75C12.3533 5.74917 12.6504 5.86917 12.8913 6.11C13.1321 6.35083 13.2517 6.6475 13.25 7V11.5Z" fill="white"/>
</svg>`}
              width={20}
              height={20}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Vehicle Types Section */}
        <View style={[styles.sectionContainer, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <Text style={[styles.campusTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
            {attendantProfile?.assignedAreaName || 'Foundation University Main Campus'}
          </Text>
          <Text style={[styles.sectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>Vehicle Types</Text>
          <View style={[
            styles.vehicleTypesContainer,
            screenDimensions.isLandscape ? { 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              gap: getAdaptiveSpacing(screenDimensions, 8),
              width: '100%'
            } : {}
          ]}>
            {vehicleTypes.map(renderVehicleTypeCard)}
          </View>
        </View>

        
        {/* Parking Slots Section */}
        <View style={[styles.sectionContainer, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <View style={styles.parkingSlotsHeader}>
            <View>
              <Text style={[styles.campusTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
            {attendantProfile?.assignedAreaName || 'Foundation University Main Campus'}
          </Text>
              <Text style={[styles.sectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>Parking Slots</Text>
              <Text style={[styles.floorText, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>Floor 1 - Parking</Text>
            </View>
            <View style={styles.controlsContainer}>
              <View style={styles.viewModeControls}>
                <TouchableOpacity
                  style={[styles.controlButton, viewMode === 'list' && styles.activeControl]}
                  onPress={() => setViewMode('list')}
                >
                  <SvgXml 
                    xml={viewMode === 'list' ? 
                      `<svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.3357 0H0.813429C0.597694 0 0.390795 0.0857005 0.238248 0.238248C0.0857003 0.390796 0 0.597694 0 0.813429V14.6417C0 15.0732 0.171401 15.487 0.476496 15.7921C0.781591 16.0972 1.19539 16.2686 1.62686 16.2686H19.5223C19.9538 16.2686 20.3676 16.0972 20.6727 15.7921C20.9778 15.487 21.1492 15.0732 21.1492 14.6417V0.813429C21.1492 0.597694 21.0635 0.390796 20.9109 0.238248C20.7584 0.0857005 20.5515 0 20.3357 0ZM1.62686 6.50743H5.694V9.76115H1.62686V6.50743ZM7.32086 6.50743H19.5223V9.76115H7.32086V6.50743ZM19.5223 1.62686V4.88057H1.62686V1.62686H19.5223ZM1.62686 11.388H5.694V14.6417H1.62686V11.388ZM19.5223 14.6417H7.32086V11.388H19.5223V14.6417Z" fill="white"/>
</svg>` : 
                      `<svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.7364 0.423828H1.21406C0.998329 0.423828 0.79143 0.509529 0.638883 0.662076C0.486335 0.814624 0.400635 1.02152 0.400635 1.23726V15.0655C0.400635 15.497 0.572035 15.9108 0.87713 16.2159C1.18223 16.521 1.59602 16.6924 2.02749 16.6924H19.9229C20.3544 16.6924 20.7682 16.521 21.0733 16.2159C21.3784 15.9108 21.5498 15.497 21.5498 15.0655V1.23726C21.5498 1.02152 21.4641 0.814624 21.3115 0.662076C21.159 0.509529 20.9521 0.423828 20.7364 0.423828ZM2.02749 6.93126H6.09464V10.185H2.02749V6.93126ZM7.7215 6.93126H19.9229V10.185H7.7215V6.93126ZM19.9229 2.05069V5.3044H2.02749V2.05069H19.9229ZM2.02749 11.8118H6.09464V15.0655H2.02749V11.8118ZM19.9229 15.0655H7.7215V11.8118H19.9229V15.0655Z" fill="#383838"/>
</svg>`}
                    width={24}
                    height={24}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, viewMode === 'grid' && styles.activeControl]}
                  onPress={() => setViewMode('grid')}
                >
                  <SvgXml 
                    xml={viewMode === 'grid' ? 
                      `<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.10033 11.6426C7.67562 11.6426 8.22735 11.8711 8.63414 12.2779C9.04094 12.6847 9.26947 13.2364 9.26947 13.8117V18.15C9.26947 18.7253 9.04094 19.2771 8.63414 19.6838C8.22735 20.0906 7.67562 20.3192 7.10033 20.3192H2.76204C2.18675 20.3192 1.63502 20.0906 1.22822 19.6838C0.82143 19.2771 0.592896 18.7253 0.592896 18.15V13.8117C0.592896 13.2364 0.82143 12.6847 1.22822 12.2779C1.63502 11.8711 2.18675 11.6426 2.76204 11.6426H7.10033ZM17.946 11.6426C18.4933 11.6424 19.0204 11.8491 19.4217 12.2212C19.8229 12.5933 20.0687 13.1033 20.1098 13.6491L20.1152 13.8117V18.15C20.1154 18.6973 19.9087 19.2244 19.5366 19.6256C19.1645 20.0269 18.6544 20.2727 18.1087 20.3138L17.946 20.3192H13.6078C13.0605 20.3193 12.5334 20.1127 12.1321 19.7406C11.7309 19.3685 11.4851 18.8584 11.444 18.3127L11.4386 18.15V13.8117C11.4384 13.2645 11.6451 12.7374 12.0172 12.3361C12.3893 11.9349 12.8994 11.6891 13.4451 11.648L13.6078 11.6426H17.946ZM7.10033 13.8117H2.76204V18.15H7.10033V13.8117ZM17.946 13.8117H13.6078V18.15H17.946V13.8117ZM17.946 0.796875C18.4933 0.796702 19.0204 1.00338 19.4217 1.37549C19.8229 1.7476 20.0687 2.25763 20.1098 2.80333L20.1152 2.96602V7.30431C20.1154 7.85156 19.9087 8.37865 19.5366 8.77992C19.1645 9.18119 18.6544 9.42698 18.1087 9.46803L17.946 9.47345H13.6078C13.0605 9.47363 12.5334 9.26694 12.1321 8.89484C11.7309 8.52273 11.4851 8.0127 11.444 7.46699L11.4386 7.30431V2.96602C11.4384 2.41877 11.6451 1.89168 12.0172 1.49041C12.3893 1.08914 12.8994 0.843342 13.4451 0.802298L13.6078 0.796875H17.946ZM7.10033 0.796875C7.64758 0.796702 8.17467 1.00338 8.57594 1.37549C8.97721 1.7476 9.22301 2.25763 9.26405 2.80333L9.26947 2.96602V7.30431C9.26965 7.85156 9.06296 8.37865 8.69086 8.77992C8.31875 9.18119 7.80872 9.42698 7.26301 9.46803L7.10033 9.47345H2.76204C2.21479 9.47363 1.6877 9.26694 1.28643 8.89484C0.885156 8.52273 0.639362 8.0127 0.598319 7.46699L0.592896 7.30431V2.96602C0.592722 2.41877 0.799405 1.89168 1.17151 1.49041C1.54362 1.08914 2.05365 0.843342 2.59935 0.802298L2.76204 0.796875H7.10033ZM17.946 2.96602H13.6078V7.30431H17.946V2.96602ZM7.10033 2.96602H2.76204V7.30431H7.10033V2.96602Z" fill="white"/>
</svg>` : 
                      darkGridIconSvg}
                    width={24}
                    height={24}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.vehicleTypeFilters}>
                {vehicleTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.filterButton,
                      selectedVehicleType === type.id && styles.activeFilter
                    ]}
                    onPress={() => setSelectedVehicleType(type.id)}
                  >
                    <SvgXml 
                      xml={
                        type.id === 'all' ? (selectedVehicleType === 'all' ? 
                          `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M6.76116 11.0994C7.33645 11.0994 7.88818 11.3279 8.29497 11.7347C8.70177 12.1415 8.9303 12.6932 8.9303 13.2685V17.6068C8.9303 18.1821 8.70177 18.7338 8.29497 19.1406C7.88818 19.5474 7.33645 19.776 6.76116 19.776H2.42287C1.84757 19.776 1.29584 19.5474 0.889051 19.1406C0.482257 18.7338 0.253723 18.1821 0.253723 17.6068V13.2685C0.253723 12.6932 0.482257 12.1415 0.889051 11.7347C1.29584 11.3279 1.84757 11.0994 2.42287 11.0994H6.76116ZM17.6069 11.0994C18.1541 11.0992 18.6812 11.3059 19.0825 11.678C19.4838 12.0501 19.7296 12.5601 19.7706 13.1058L19.776 13.2685V17.6068C19.7762 18.1541 19.5695 18.6812 19.1974 19.0824C18.8253 19.4837 18.3153 19.7295 17.7696 19.7705L17.6069 19.776H13.2686C12.7213 19.7761 12.1942 19.5695 11.793 19.1973C11.3917 18.8252 11.1459 18.3152 11.1049 17.7695L11.0994 17.6068V13.2685C11.0993 12.7213 11.306 12.1942 11.6781 11.7929C12.0502 11.3916 12.5602 11.1458 13.1059 11.1048L13.2686 11.0994H17.6069ZM6.76116 13.2685H2.42287V17.6068H6.76116V13.2685ZM17.6069 13.2685H13.2686V17.6068H17.6069V13.2685ZM17.6069 0.253662C18.1541 0.253489 18.6812 0.460172 19.0825 0.832278C19.4838 1.20438 19.7296 1.71441 19.7706 2.26012L19.776 2.42281V6.76109C19.7762 7.30834 19.5695 7.83544 19.1974 8.23671C18.8253 8.63798 18.3153 8.88377 17.7696 8.92482L17.6069 8.93024H13.2686C12.7213 8.93041 12.1942 8.72373 11.793 8.35162C11.3917 7.97952 11.1459 7.46949 11.1049 6.92378L11.0994 6.76109V2.42281C11.0993 1.87556 11.306 1.34847 11.6781 0.947194C12.0502 0.545923 12.5602 0.300129 13.1059 0.259085L13.2686 0.253662H17.6069ZM6.76116 0.253662C7.3084 0.253489 7.8355 0.460172 8.23677 0.832278C8.63804 1.20438 8.88383 1.71441 8.92488 2.26012L8.9303 2.42281V6.76109C8.93047 7.30834 8.72379 7.83544 8.35168 8.23671C7.97958 8.63798 7.46955 8.88377 6.92384 8.92482L6.76116 8.93024H2.42287C1.87562 8.93041 1.34853 8.72373 0.947255 8.35162C0.545984 7.97952 0.30019 7.46949 0.259146 6.92378L0.253723 6.76109V2.42281C0.25355 1.87556 0.460233 1.34847 0.832339 0.947194C1.20445 0.545923 1.71447 0.300129 2.26018 0.259085L2.42287 0.253662H6.76116ZM17.6069 2.42281H13.2686V6.76109H17.6069V2.42281ZM6.76116 2.42281H2.42287V6.76109H6.76116V2.42281Z" fill="white"/>
</svg>` : darkGridIconSvg) :
                        type.id === 'car' ? (selectedVehicleType === 'car' ? 
                          `<svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M18.9377 0.984619C19.6776 0.984644 20.4028 1.19067 21.0322 1.57961C21.6616 1.96855 22.1703 2.52504 22.5012 3.18676L24.3421 6.86718C24.6662 6.73436 24.985 6.59091 25.2984 6.43684C25.6137 6.27938 25.9786 6.25361 26.3129 6.3652C26.6471 6.47679 26.9234 6.7166 27.0808 7.03187C27.2383 7.34714 27.2641 7.71205 27.1525 8.04632C27.0409 8.38059 26.8011 8.65685 26.4858 8.8143C26.1666 8.95639 25.8456 9.09453 25.5229 9.2287L26.7993 11.7828C27.0763 12.3366 27.2205 12.9473 27.2203 13.5666V16.9229C27.2203 17.4835 27.102 18.0378 26.8731 18.5496C26.6442 19.0613 26.31 19.519 25.8921 19.8927V21.5716C25.8921 22.1 25.6822 22.6067 25.3086 22.9803C24.935 23.354 24.4282 23.5639 23.8998 23.5639C23.3714 23.5639 22.8647 23.354 22.4911 22.9803C22.1174 22.6067 21.9075 22.1 21.9075 21.5716V20.9075H5.96926V21.5716C5.96926 22.1 5.75936 22.6067 5.38573 22.9803C5.0121 23.354 4.50536 23.5639 3.97697 23.5639C3.44858 23.5639 2.94184 23.354 2.56821 22.9803C2.19459 22.6067 1.98468 22.1 1.98468 21.5716V19.8927C1.16918 19.1622 0.656494 18.1023 0.656494 16.9229V13.5652C0.656742 12.9469 0.80089 12.3371 1.07753 11.7841L2.3433 9.24995C2.02276 9.11536 1.70621 8.97059 1.39364 8.81563C1.07996 8.65613 0.841524 8.37975 0.729721 8.04608C0.617918 7.71241 0.641705 7.34817 0.795954 7.03187C0.873864 6.87572 0.981784 6.73644 1.11355 6.62201C1.24531 6.50759 1.39833 6.42025 1.56386 6.36499C1.7294 6.30973 1.9042 6.28763 2.07827 6.29996C2.25235 6.31229 2.42229 6.3588 2.57839 6.43684C2.89272 6.5918 3.21149 6.73524 3.53468 6.86718L5.37556 3.18809C5.70634 2.52612 6.21493 1.96936 6.84433 1.58017C7.47374 1.19099 8.19908 0.984768 8.93909 0.984619H18.9377ZM7.96154 12.9383C7.43316 12.9383 6.92641 13.1482 6.55278 13.5219C6.17916 13.8955 5.96926 14.4022 5.96926 14.9306C5.96926 15.459 6.17916 15.9658 6.55278 16.3394C6.92641 16.713 7.43316 16.9229 7.96154 16.9229C8.48993 16.9229 8.99668 16.713 9.3703 16.3394C9.74393 15.9658 9.95383 15.459 9.95383 14.9306C9.95383 14.4022 9.74393 13.8955 9.3703 13.5219C8.99668 13.1482 8.48993 12.9383 7.96154 12.9383ZM19.9153 12.9383C19.3869 12.9383 18.8801 13.1482 18.5065 13.5219C18.1329 13.8955 17.923 14.4022 17.923 14.9306C17.923 15.459 18.1329 15.9658 18.5065 16.3394C18.8801 16.713 19.3869 16.9229 19.9153 16.9229C20.4436 16.9229 20.9504 16.713 21.324 16.3394C21.6976 15.9658 21.9075 15.459 21.9075 14.9306C21.9075 14.4022 21.6976 13.8955 21.324 13.5219C20.9504 13.1482 20.4436 12.9383 19.9153 12.9383ZM18.9377 3.641H8.93909C8.72048 3.64097 8.50524 3.6949 8.31247 3.798C8.1197 3.9011 7.95536 4.0502 7.83404 4.23205L7.75169 4.37549L6.06489 7.74644C8.12093 8.36272 10.8915 8.95376 13.9384 8.95376C16.7834 8.95376 19.3853 8.43843 21.3896 7.86863L21.8106 7.74644L20.1251 4.37549C20.0274 4.18 19.8829 4.01165 19.7045 3.88538C19.5261 3.75911 19.3193 3.67882 19.1024 3.65163L18.939 3.641H18.9377Z" fill="white"/>
</svg>` : carIconSvg) :
                        type.id === 'motorcycle' ? (selectedVehicleType === 'motorcycle' ? 
                          `<svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.8999 9.60238H25.6895L25.2537 8.13306C25.4666 8.11439 25.682 8.10318 25.8999 8.10318C26.2962 8.10318 26.6763 7.94575 26.9565 7.66553C27.2367 7.38531 27.3941 7.00525 27.3941 6.60896C27.3941 6.21267 27.2367 5.83261 26.9565 5.55239C26.6763 5.27218 26.2962 5.11475 25.8999 5.11475H24.3596L23.3486 1.70171C23.2561 1.39364 23.0667 1.12362 22.8084 0.931814C22.5502 0.740005 22.237 0.636641 21.9154 0.637086H17.9308C17.5345 0.637086 17.1544 0.794512 16.8742 1.07473C16.594 1.35495 16.4366 1.73501 16.4366 2.1313C16.4366 2.52759 16.594 2.90765 16.8742 3.18787C17.1544 3.46809 17.5345 3.62552 17.9308 3.62552H20.7947L21.238 5.11973H18.9269C16.5063 5.11973 14.529 5.695 13.2091 6.78454C12.9919 6.95862 12.7304 7.06858 12.4541 7.10202C12.1777 7.13546 11.8976 7.09105 11.6451 6.9738C10.0102 6.22669 4.52394 3.86085 3.96859 3.62552L3.31239 3.3466C3.31239 3.3466 2.78941 3.12744 2.49057 3.12744C2.14503 3.12739 1.81016 3.24708 1.54295 3.46616C1.27575 3.68523 1.09273 3.99015 1.02505 4.32899C0.957366 4.66783 1.00921 5.01965 1.17176 5.32456C1.3343 5.62948 1.5975 5.86863 1.91654 6.00132C2.13071 6.09222 7.35424 8.3049 10.4087 9.69452C10.9954 9.96032 11.6323 10.0975 12.2764 10.0967C13.3102 10.1002 14.3129 9.74405 15.1129 9.08936C15.8277 8.50039 17.0529 8.15797 18.5857 8.11314C16.9446 9.71806 15.877 11.8183 15.5475 14.09H11.7647C11.401 12.6815 10.5361 11.4539 9.33207 10.6375C8.12806 9.82101 6.66761 9.47169 5.22448 9.65499C3.78135 9.8383 2.45461 10.5416 1.49295 11.6332C0.531287 12.7247 0.000732422 14.1295 0.000732422 15.5842C0.000732422 17.0389 0.531287 18.4437 1.49295 19.5353C2.45461 20.6268 3.78135 21.3301 5.22448 21.5134C6.66761 21.6967 8.12806 21.3474 9.33207 20.531C10.5361 19.7145 11.401 18.487 11.7647 17.0784H16.9346C17.3309 17.0784 17.711 16.921 17.9912 16.6408C18.2714 16.3606 18.4289 15.9805 18.4289 15.5842C18.4293 14.2297 18.798 12.9008 19.4955 11.7397C20.1929 10.5785 21.1929 9.62886 22.3885 8.99224L22.8243 10.4615C21.5866 11.2083 20.6613 12.3783 20.2201 13.755C19.7789 15.1316 19.8515 16.6215 20.4246 17.9486C20.9977 19.2758 22.0323 20.3502 23.3369 20.973C24.6415 21.5958 26.1276 21.7246 27.5199 21.3357C28.9121 20.9468 30.1163 20.0664 30.9092 18.8577C31.7022 17.649 32.0302 16.1938 31.8325 14.7618C31.6348 13.3298 30.9248 12.018 29.834 11.0693C28.7432 10.1207 27.3455 9.59951 25.8999 9.60238ZM5.97707 17.0734H8.5633C8.23438 17.6432 7.72665 18.0884 7.11887 18.3402C6.51109 18.5919 5.83723 18.6361 5.20179 18.4658C4.56635 18.2956 4.00485 17.9204 3.60437 17.3985C3.20389 16.8766 2.98682 16.2371 2.98682 15.5792C2.98682 14.9214 3.20389 14.2819 3.60437 13.76C4.00485 13.2381 4.56635 12.8629 5.20179 12.6926C5.83723 12.5224 6.51109 12.5665 7.11887 12.8183C7.72665 13.07 8.23438 13.5153 8.5633 14.085H5.97707C5.58078 14.085 5.20072 14.2424 4.9205 14.5227C4.64028 14.8029 4.48285 15.1829 4.48285 15.5792C4.48285 15.9755 4.64028 16.3556 4.9205 16.6358C5.20072 16.916 5.58078 17.0734 5.97707 17.0734ZM25.8999 18.5677C25.3161 18.567 24.7453 18.3953 24.258 18.0739C23.7707 17.7524 23.3882 17.2953 23.1577 16.7589C22.9273 16.2225 22.859 15.6304 22.9613 15.0556C23.0636 14.4808 23.332 13.9486 23.7333 13.5247L24.4667 16.0038C24.5583 16.3128 24.7474 16.584 25.0056 16.7767C25.2639 16.9695 25.5776 17.0736 25.8999 17.0734C26.0436 17.0731 26.1866 17.0526 26.3245 17.0124C26.5128 16.9567 26.6882 16.8645 26.8408 16.741C26.9934 16.6174 27.1201 16.4651 27.2138 16.2925C27.3075 16.12 27.3662 15.9307 27.3867 15.7355C27.4072 15.5402 27.389 15.3428 27.3331 15.1546L26.5972 12.6742C27.3079 12.8458 27.9311 13.2719 28.3488 13.8719C28.7665 14.472 28.9497 15.2043 28.8638 15.9304C28.7779 16.6564 28.4288 17.3258 27.8826 17.8118C27.3364 18.2978 26.631 18.5667 25.8999 18.5677Z" fill="white"/>
</svg>` : `<svg width="33" height="22" viewBox="0 0 33 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M26.3601 9.5212H26.1496L25.7138 8.05189C25.9268 8.03321 26.1422 8.022 26.3601 8.022C26.7564 8.022 27.1364 7.86458 27.4166 7.58436C27.6969 7.30414 27.8543 6.92408 27.8543 6.52779C27.8543 6.1315 27.6969 5.75144 27.4166 5.47122C27.1364 5.191 26.7564 5.03357 26.3601 5.03357H24.8198L23.8087 1.62054C23.7162 1.31246 23.5268 1.04245 23.2686 0.850637C23.0104 0.658828 22.6972 0.555464 22.3755 0.55591H18.3909C17.9946 0.55591 17.6146 0.713335 17.3344 0.993555C17.0541 1.27377 16.8967 1.65383 16.8967 2.05012C16.8967 2.44641 17.0541 2.82647 17.3344 3.10669C17.6146 3.38691 17.9946 3.54434 18.3909 3.54434H21.2548L21.6981 5.03855H19.3871C16.9664 5.03855 14.9891 5.61383 13.6692 6.70336C13.452 6.87744 13.1905 6.9874 12.9142 7.02084C12.6379 7.05428 12.3577 7.00987 12.1053 6.89263C10.4703 6.14552 4.98409 3.77968 4.42874 3.54434L3.77253 3.26542C3.77253 3.26542 3.24955 3.04627 2.95071 3.04627C2.60518 3.04621 2.2703 3.16591 2.0031 3.38498C1.73589 3.60406 1.55287 3.90897 1.48519 4.24781C1.41751 4.58665 1.46936 4.93847 1.6319 5.24339C1.79445 5.5483 2.05764 5.78746 2.37668 5.92014C2.59085 6.01104 7.81438 8.22372 10.8688 9.61334C11.4556 9.87914 12.0924 10.0163 12.7366 10.0155C13.7703 10.019 14.7731 9.66288 15.5731 9.00818C16.2878 8.41921 17.5131 8.07679 19.0459 8.03196C17.4047 9.63689 16.3371 11.7371 16.0077 14.0088H12.2248C11.8611 12.6003 10.9962 11.3727 9.79221 10.5563C8.58821 9.73983 7.12776 9.39052 5.68463 9.57382C4.24149 9.75712 2.91475 10.4605 1.95309 11.552C0.991431 12.6435 0.460876 14.0483 0.460876 15.503C0.460876 16.9578 0.991431 18.3626 1.95309 19.4541C2.91475 20.5456 4.24149 21.249 5.68463 21.4323C7.12776 21.6156 8.58821 21.2662 9.79221 20.4498C10.9962 19.6333 11.8611 18.4058 12.2248 16.9973H17.3948C17.7911 16.9973 18.1711 16.8398 18.4514 16.5596C18.7316 16.2794 18.889 15.8993 18.889 15.503C18.8895 14.1485 19.2581 12.8196 19.9556 11.6585C20.6531 10.4974 21.6531 9.54768 22.8487 8.91106L23.2845 10.3804C22.0467 11.1271 21.1215 12.2972 20.6803 13.6738C20.239 15.0504 20.3117 16.5403 20.8848 17.8674C21.4578 19.1946 22.4925 20.2691 23.7971 20.8918C25.1016 21.5146 26.5877 21.6435 27.98 21.2545C29.3723 20.8656 30.5764 19.9852 31.3694 18.7765C32.1623 17.5678 32.4903 16.1126 32.2926 14.6806C32.0949 13.2486 31.3849 11.9368 30.2941 10.9881C29.2033 10.0395 27.8057 9.51833 26.3601 9.5212ZM6.43721 16.9923H9.02345C8.69452 17.562 8.18679 18.0073 7.57902 18.259C6.97124 18.5108 6.29737 18.5549 5.66193 18.3847C5.02649 18.2144 4.46499 17.8392 4.06451 17.3173C3.66404 16.7954 3.44696 16.1559 3.44696 15.4981C3.44696 14.8402 3.66404 14.2007 4.06451 13.6788C4.46499 13.1569 5.02649 12.7817 5.66193 12.6115C6.29737 12.4412 6.97124 12.4854 7.57902 12.7371C8.18679 12.9889 8.69452 13.4341 9.02345 14.0038H6.43721C6.04092 14.0038 5.66086 14.1613 5.38064 14.4415C5.10042 14.7217 4.943 15.1018 4.943 15.4981C4.943 15.8943 5.10042 16.2744 5.38064 16.5546C5.66086 16.8348 6.04092 16.9923 6.43721 16.9923ZM26.3601 18.4865C25.7763 18.4858 25.2055 18.3141 24.7181 17.9927C24.2308 17.6712 23.8483 17.2141 23.6179 16.6777C23.3874 16.1413 23.3191 15.5492 23.4214 14.9744C23.5237 14.3997 23.7921 13.8675 24.1935 13.4435L24.9269 15.9227C25.0185 16.2317 25.2075 16.5028 25.4658 16.6955C25.7241 16.8883 26.0378 16.9924 26.3601 16.9923C26.5038 16.992 26.6467 16.9714 26.7847 16.9313C26.9729 16.8756 27.1484 16.7833 27.3009 16.6598C27.4535 16.5363 27.5803 16.3839 27.6739 16.2114C27.7676 16.0388 27.8264 15.8495 27.8468 15.6543C27.8673 15.459 27.8491 15.2617 27.7933 15.0735L27.0574 12.5931C27.7681 12.7646 28.3912 13.1907 28.8089 13.7908C29.2266 14.3908 29.4098 15.1232 29.3239 15.8492C29.238 16.5752 28.8889 17.2446 28.3428 17.7306C27.7966 18.2166 27.0912 18.4855 26.3601 18.4865Z" fill="#383838"/>
</svg>`) :
                        (selectedVehicleType === 'ebike' ? 
                          `<svg width="30" height="27" viewBox="0 0 30 27" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.64089 15.5947C6.69165 15.5947 7.71882 15.9063 8.5925 16.4901C9.46618 17.0739 10.1471 17.9036 10.5492 18.8744C10.9514 19.8452 11.0566 20.9134 10.8516 21.944C10.6466 22.9745 10.1406 23.9212 9.39758 24.6642C8.65458 25.4072 7.70793 25.9132 6.67736 26.1182C5.64678 26.3232 4.57856 26.218 3.60778 25.8158C2.637 25.4137 1.80726 24.7328 1.22349 23.8591C0.639713 22.9854 0.328125 21.9583 0.328125 20.9075L0.334766 20.6419C0.402918 19.2805 0.991695 17.9974 1.97932 17.058C2.96694 16.1186 4.27784 15.5947 5.64089 15.5947ZM24.2356 15.5947C25.2863 15.5947 26.3135 15.9063 27.1872 16.4901C28.0609 17.0739 28.7418 17.9036 29.1439 18.8744C29.546 19.8452 29.6512 20.9134 29.4462 21.944C29.2412 22.9745 28.7353 23.9212 27.9922 24.6642C27.2492 25.4072 26.3026 25.9132 25.272 26.1182C24.2415 26.3232 23.1732 26.218 22.2025 25.8158C21.2317 25.4137 20.4019 24.7328 19.8182 23.8591C19.2344 22.9854 18.9228 21.9583 18.9228 20.9075L18.9294 20.6419C18.9976 19.2805 19.5864 17.9974 20.574 17.058C21.5616 16.1186 22.8725 15.5947 24.2356 15.5947Z" fill="white"/>
<path d="M18.6996 6.88843L20.9615 10.282H24.2355C24.5608 10.282 24.8748 10.4014 25.1179 10.6176C25.361 10.8338 25.5163 11.1317 25.5544 11.4547L25.5637 11.6101C25.5637 11.9624 25.4237 12.3002 25.1747 12.5493C24.9256 12.7984 24.5877 12.9383 24.2355 12.9383H20.2509C20.0323 12.9384 19.8171 12.8844 19.6243 12.7813C19.4315 12.6782 19.2672 12.5291 19.1459 12.3473L17.2917 9.56739L12.9419 13.0472L15.8772 15.9825C16.0839 16.1895 16.2165 16.4589 16.2544 16.7489L16.2663 16.9229V22.2357C16.2663 22.5879 16.1264 22.9258 15.8773 23.1748C15.6282 23.4239 15.2904 23.5639 14.9381 23.5639C14.5859 23.5639 14.2481 23.4239 13.999 23.1748C13.7499 22.9258 13.61 22.5879 13.61 22.2357V17.4741L10.0145 13.8774C9.7682 13.6307 9.62874 13.297 9.62625 12.9484C9.62377 12.5997 9.75846 12.2641 10.0013 12.0139L10.1235 11.901L16.7644 6.58826C16.9082 6.47317 17.0743 6.38924 17.2522 6.34179C17.4302 6.29435 17.616 6.28442 17.798 6.31265C17.98 6.34088 18.1541 6.40664 18.3093 6.50576C18.4645 6.60488 18.5974 6.7352 18.6996 6.88843ZM21.5791 0.984619C22.1045 0.984619 22.6181 1.14041 23.0549 1.4323C23.4917 1.72419 23.8322 2.13906 24.0333 2.62445C24.2343 3.10984 24.2869 3.64395 24.1844 4.15924C24.0819 4.67452 23.8289 5.14784 23.4574 5.51935C23.0859 5.89085 22.6126 6.14384 22.0973 6.24634C21.582 6.34884 21.0479 6.29623 20.5625 6.09518C20.0772 5.89412 19.6623 5.55365 19.3704 5.11681C19.0785 4.67997 18.9227 4.16638 18.9227 3.641L18.9294 3.44177C18.9796 2.77349 19.2806 2.14889 19.772 1.6932C20.2634 1.23752 20.9089 0.984407 21.5791 0.984619Z" fill="white"/>
</svg>` : darkBikeIconSvg)
                      }
                      width={24}
                      height={24}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Parking Slots Grid/List */}
          <View style={styles.parkingSlotsContainer}>
            {(() => {
                          const capacityVehicleTypes = ['motorcycle', 'bike'];
              const normalizedSelectedType = normalizeVehicleType(selectedVehicleType);
              const shouldShowCapacitySections = selectedVehicleType === 'all' || capacityVehicleTypes.includes(normalizedSelectedType);

              const capacityContent = shouldShowCapacitySections ? renderCapacitySections() : null;

              // When specifically filtering to capacity-based vehicle types, only show those sections
              if (capacityVehicleTypes.includes(normalizedSelectedType) && selectedVehicleType !== 'all') {
                return capacityContent;
              }

              // For "all" or non-capacity filters, render capacity sections (if any) followed by regular slots
              // Filter out capacity vehicle types from the regular parking slots list to avoid duplicates
              const filteredParkingSlots = parkingSlots.filter(slot => 
                !capacityVehicleTypes.includes(normalizeVehicleType(slot.vehicleType))
              );

              const sectionsWithSlots = [...new Set(filteredParkingSlots.map(slot => slot.section))];
              console.log('🎯 Rendering sections with slots (capacity types removed):', sectionsWithSlots);

              const regularContent = viewMode === 'list'
                ? sectionsWithSlots.map(section => renderSectionList(section, filteredParkingSlots))
                : sectionsWithSlots.map(section => renderSection(section, filteredParkingSlots));

              return (
                <>
                  {capacityContent}
                  {regularContent}
                </>
              );
            })()}
          </View>

          {/* Status Legend */}
          <View style={styles.statusLegend}>
            <View style={styles.legendRow}>
            <Text style={styles.legendTitle}>Status Legend:</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#60FF84' }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF6C6C' }]} />
                <Text style={styles.legendText}>Occupied</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FFF9A6' }]} />
                <Text style={styles.legendText}>Reserved</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleScanPress}
        activeOpacity={0.8}
      >
        <SvgXml 
          xml={`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.333313 10.3333H10.3333V0.333252H0.333313V10.3333ZM3.66665 3.66659H6.99998V6.99992H3.66665V3.66659ZM0.333313 23.6666H10.3333V13.6666H0.333313V23.6666ZM3.66665 16.9999H6.99998V20.3333H3.66665V16.9999ZM23.6666 0.333252H13.6666V10.3333H23.6666V0.333252ZM20.3333 6.99992H17V3.66659H20.3333V6.99992ZM13.6833 13.6666H17.0166V16.9999H13.6833V13.6666ZM17.0166 16.9999H20.35V20.3333H17.0166V16.9999ZM20.35 20.3333H23.6833V23.6666H20.35V20.3333ZM20.35 13.6666H23.6833V16.9999H20.35V13.6666Z" fill="white"/>
</svg>`}
          width={40}
          height={40}
        />
      </TouchableOpacity>

      {/* Activity History Modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Activity History</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowActivityModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <View style={styles.dropdownContainer}>
                <Text style={styles.filterLabel}>Filter By Status</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedStatus === 'all' ? 'All' : selectedStatus === 'start' ? 'Start' : 'End'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {showStatusDropdown && (
                  <View style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#dee2e6',
                    borderRadius: 6,
                    marginTop: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    zIndex: 1000
                  }}>
                    <TouchableOpacity 
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f3f4'
                      }}
                      onPress={() => {
                        setSelectedStatus('all');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#495057' }}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f3f4'
                      }}
                      onPress={() => {
                        setSelectedStatus('start');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#495057' }}>Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                      onPress={() => {
                        setSelectedStatus('end');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#495057' }}>End</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, plate, area..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => {
                    // Search is already happening in real-time, but this ensures Enter key works
                    console.log('🔍 Search submitted:', searchQuery);
                  }}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
            </View>
          </View>

            {/* Enhanced Activity Table */}
          <View style={styles.tableContainer}>
            {/* Table Summary */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#dee2e6' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#495057' }}>
                {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'} Found
              </Text>
            </View>

            {/* Fixed Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { flex: 2 }]}>
                <Text style={styles.tableHeaderText}>Date & Time</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                <Text style={styles.tableHeaderText}>Action</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                <Text style={styles.tableHeaderText}>User Name</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                <Text style={styles.tableHeaderText}>Area</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <Text style={styles.tableHeaderText}>Spot</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.tableContent} showsVerticalScrollIndicator={true}>
              {loadingActivity ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B0000" />
                  <Text style={styles.loadingText}>Loading scan history...</Text>
                </View>
              ) : filteredRecords.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 48, marginBottom: 8 }}>📋</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery || selectedStatus !== 'all' ? 'No matching records found' : 'No scan history found'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery || selectedStatus !== 'all' ? 'Try adjusting your search or filters' : 'QR scans will appear here'}
                  </Text>
                </View>
              ) : (
                filteredRecords.map((record, index) => (
                  <View key={record.id} style={[
                    styles.tableRow,
                    { backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff' }
                  ]}>
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      <Text style={{ fontSize: 12, color: '#495057', fontWeight: '500' }}>
                        {new Date(record.scanTime).toLocaleDateString()}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                        {new Date(record.scanTime).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <View style={{
                        backgroundColor: record.scanType === 'start' ? '#28a745' : '#dc3545',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        alignSelf: 'flex-start'
                      }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                          {record.scanType === 'start' ? 'START' : 'END'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <Text style={{ fontSize: 12, color: '#495057' }}>
                        {record.userName || 'Guest User'}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <Text style={{ fontSize: 12, color: '#495057' }}>
                        {record.parkingArea || 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={{ fontSize: 12, color: '#495057' }}>
                        {record.parkingSlot || 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                      <View style={{
                        backgroundColor: record.status === 'completed' ? '#28a745' : '#ffc107',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        alignSelf: 'flex-start'
                      }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                          {record.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>


      {/* Attendant Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendant Settings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={true}>
              {loadingSettings ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading settings...</Text>
                </View>
              ) : (
                <>
                  {/* Account Information Section */}
                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Account Information</Text>
                    <View style={styles.accountInfoGrid}>
                      <View style={styles.accountInfoItem}>
                        <Text style={styles.accountLabel}>Attendant ID:</Text>
                        <Text style={styles.accountValue}>
                          {attendantProfile?.attendantId || user?.user_id || 'Loading...'}
                        </Text>
                      </View>
                      <View style={styles.accountInfoItem}>
                        <Text style={styles.accountLabel}>Attendant Name:</Text>
                        <Text style={styles.accountValue}>
                          {attendantProfile?.attendantName || (user ? `${user.first_name} ${user.last_name}` : 'Loading...')}
                        </Text>
                      </View>
                      <View style={styles.accountInfoItem}>
                        <Text style={styles.accountLabel}>Email:</Text>
                        <Text style={styles.accountValue}>
                          {attendantProfile?.email || user?.email || 'Loading...'}
                        </Text>
                      </View>
                      <View style={styles.accountInfoItem}>
                        <Text style={styles.accountLabel}>Assigned Area:</Text>
                        <Text style={styles.accountValue}>
                          {attendantProfile?.assignedAreas || 'Loading...'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.adminNote}>
                      * For changes to your Attendant ID or Assigned Zones, please contact your administrator:
                    </Text>
                    <Text style={styles.adminContact}>Email: admin@tappark.com</Text>
                    <Text style={styles.adminContact}>Phone: +63 917 123 4567</Text>
                  </View>
                </>
              )}

               
              {/* Log Out Button */}
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Slot Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotDetailsModal}>
            <Text style={styles.slotDetailsTitle}>
              Slot Details: {selectedSlot?.slotId}
            </Text>
            
            {loadingSlotDetails ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading slot details...</Text>
              </View>
            ) : (
              <View style={styles.slotDetailsContent}>
                {/* Show reserved/occupied user information FIRST */}
                {(slotDetails?.status === 'reserved' || slotDetails?.status === 'occupied' || selectedSlot?.status === 'reserved' || selectedSlot?.status === 'occupied') && (
                  <View style={[styles.slotDetailsColumn, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }]}>
                    <Text style={[styles.slotDetailLabel, { marginBottom: 12, fontWeight: 'bold', fontSize: 16 }]}>
                      {(slotDetails?.status || selectedSlot?.status) === 'reserved' ? 'Reserved By:' : 'Occupied By:'}
                    </Text>
                    {slotDetails?.reservedBy && (
                      <View style={styles.slotDetailRow}>
                        <Text style={styles.slotDetailLabel}>Name:</Text>
                        <Text style={styles.slotDetailValue}>
                          {slotDetails.reservedBy}
                        </Text>
                      </View>
                    )}
                    {slotDetails?.reservedPlateNumber && (
                      <View style={styles.slotDetailRow}>
                        <Text style={styles.slotDetailLabel}>Plate Number:</Text>
                        <Text style={styles.slotDetailValue}>
                          {slotDetails.reservedPlateNumber}
                        </Text>
                      </View>
                    )}
                    {slotDetails?.reservedByEmail && (
                      <View style={styles.slotDetailRow}>
                        <Text style={styles.slotDetailLabel}>Email:</Text>
                        <Text style={[styles.slotDetailValue, { fontSize: 12 }]}>
                          {slotDetails.reservedByEmail}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.slotDetailsColumn}>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Slot ID:</Text>
                    <Text style={styles.slotDetailValue}>
                      {slotDetails?.slotId || selectedSlot?.slotId || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Section:</Text>
                    <Text style={styles.slotDetailValue}>
                      {slotDetails?.section || selectedSlot?.section || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Vehicle Type:</Text>
                    <Text style={styles.slotDetailValue}>
                      {slotDetails?.vehicleType || selectedSlot?.vehicleType || 'N/A'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.slotDetailsColumn}>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Status:</Text>
                    <Text style={[styles.slotDetailValue, { color: getStatusColor(slotDetails?.status || selectedSlot?.status || '') }]}>
                      {getStatusText(slotDetails?.status || selectedSlot?.status || '')}
                    </Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Parking Area:</Text>
                    <Text style={styles.slotDetailValue}>
                      {slotDetails?.areaName || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Text style={styles.slotDetailLabel}>Address:</Text>
                    <Text style={styles.slotDetailValue}>
                      {slotDetails?.location || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Show admin action buttons for reserved/occupied spots */}
            {(() => {
              const isAdminOrAttendant = user?.account_type_name === 'Admin' || user?.account_type_name === 'Attendant' || user?.type_id === 3 || user?.type_id === 2;
              const currentStatus = (slotDetails?.status || selectedSlot?.status || '').toLowerCase();
              const isReserved = currentStatus === 'reserved';
              const isOccupied = currentStatus === 'occupied';
              const reservationId = slotDetails?.reservationId;
              // Check if there's reservation data (user info or reservationId)
              const hasReservationData = slotDetails?.reservedBy || slotDetails?.reservedPlateNumber || reservationId;
              
              // Debug logging
              if (!loadingSlotDetails && (isReserved || isOccupied)) {
                console.log('🔍 Admin action button check:', {
                  isAdminOrAttendant,
                  currentStatus,
                  isReserved,
                  isOccupied,
                  reservationId,
                  hasReservationData,
                  reservedBy: slotDetails?.reservedBy,
                  reservedPlateNumber: slotDetails?.reservedPlateNumber,
                  slotDetailsStatus: slotDetails?.status,
                  selectedSlotStatus: selectedSlot?.status
                });
              }
              
              // Show button only if there's reservation data (meaning there's an actual reservation to cancel/end)
              if (isAdminOrAttendant && !loadingSlotDetails && (isReserved || isOccupied) && hasReservationData && reservationId) {
                return (
                  <TouchableOpacity 
                    style={[styles.goBackButton, { 
                      backgroundColor: isOccupied ? '#FF6B6B' : '#FF9800', 
                      marginBottom: 12 
                    }]} 
                    onPress={() => {
                      if (isOccupied) {
                        handleEndParkingSession(reservationId);
                      } else if (isReserved) {
                        handleCancelBooking(reservationId);
                      }
                    }}
                  >
                    <Text style={[styles.goBackButtonText, { color: '#fff' }]}>
                      {isOccupied ? 'End Parking' : 'Cancel Booking'}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
            
            {/* Show Book button for admin/attendant on available spots - Show even when loading */}
            {(() => {
              // Allow both Admin and Attendant to book for guests
              const isAdminOrAttendant = user?.account_type_name === 'Admin' || user?.account_type_name === 'Attendant' || user?.type_id === 3 || user?.type_id === 2;
              // Check status from both slotDetails and selectedSlot, handle case-insensitive
              const statusFromDetails = slotDetails?.status?.toLowerCase() || '';
              const statusFromSlot = selectedSlot?.status?.toLowerCase() || '';
              const currentStatus = statusFromDetails || statusFromSlot;
              const isAvailable = currentStatus === 'available';
              
              // Debug logging
              if (!loadingSlotDetails) {
                console.log('🔍 Book button check:', {
                  isAdminOrAttendant,
                  currentStatus,
                  isAvailable,
                  slotDetailsStatus: slotDetails?.status,
                  selectedSlotStatus: selectedSlot?.status,
                  userAccountType: user?.account_type_name,
                  userTypeId: user?.type_id,
                  user: user
                });
              }
              
              if (isAdminOrAttendant && isAvailable && !loadingSlotDetails) {
                return (
                  <TouchableOpacity 
                    style={[styles.goBackButton, { backgroundColor: '#8B0000', marginBottom: 12 }]} 
                    onPress={() => {
                      closeModal();
                      setShowGuestBookingModal(true);
                      // Reset form with slot's vehicle type
                      setGuestBookingData({
                        guestName: '',
                        plateNumber: '',
                        vehicleType: slotDetails?.vehicleType || selectedSlot?.vehicleType || 'car',
                        brand: '',
                        model: '',
                        color: ''
                      });
                    }}
                  >
                    <Text style={[styles.goBackButtonText, { color: '#fff' }]}>Book for Guest</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
            
            <TouchableOpacity style={styles.goBackButton} onPress={closeModal}>
              <Text style={styles.goBackButtonText}>Go-back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guest Booking Modal */}
      <Modal
        visible={showGuestBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeGuestBookingModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
              enabled
            >
              <View style={[styles.slotDetailsModal, { maxHeight: '80%', flex: 0 }]}>
                <Text style={styles.slotDetailsTitle}>
                  Create Guest Booking - {selectedSlot?.slotId}
                </Text>
                
                <ScrollView 
                  ref={guestBookingScrollRef}
                  style={{ maxHeight: 400 }} 
                  contentContainerStyle={{ paddingBottom: 10 }}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={{ marginBottom: 20 }}>
                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>First Name *</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter guest first name"
                  placeholderTextColor="#999"
                  value={guestBookingData.firstName}
                  onChangeText={(text) => setGuestBookingData({ ...guestBookingData, firstName: text })}
                  onFocus={() => scrollGuestBookingForm(70)}
                />

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Last Name *</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter guest last name"
                  placeholderTextColor="#999"
                  value={guestBookingData.lastName}
                  onChangeText={(text) => setGuestBookingData({ ...guestBookingData, lastName: text })}
                  onFocus={() => scrollGuestBookingForm(130)}
                />

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Plate Number *</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Enter plate number"
                  placeholderTextColor="#999"
                  value={guestBookingData.plateNumber}
                  onChangeText={handlePlateNumberChange}
                  autoCapitalize="characters"
                  onFocus={() => scrollGuestBookingForm(200)}
                />
                
                {/* Plate number validation warning */}
                {plateValidation.checking && (
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                    Checking plate number...
                  </Text>
                )}
                
                {plateValidation.exists && plateValidation.vehicle && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: '#FF3B30', marginBottom: 4 }}>
                      ⚠️ Plate number already exists
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>
                      Existing vehicle: {plateValidation.vehicle.vehicleType} 
                      {plateValidation.vehicle.brand && ` - ${plateValidation.vehicle.brand}`}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                      This booking will use the existing vehicle record
                    </Text>
                  </View>
                )}
                
                {plateValidation.error && (
                  <Text style={{ fontSize: 12, color: '#FF3B30', marginBottom: 16 }}>
                    Error: {plateValidation.error}
                  </Text>
                )}

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Vehicle Type</Text>
                <View style={[styles.input, { marginBottom: 16, backgroundColor: '#f5f5f5', paddingVertical: 12 }]}>
                  <Text style={{ color: '#333', fontWeight: '500' }}>
                    {selectedSlot?.vehicleType ? selectedSlot.vehicleType.charAt(0).toUpperCase() + selectedSlot.vehicleType.slice(1) : 'Car'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    (Automatically detected from parking spot)
                  </Text>
                </View>

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Brand (Optional)</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter vehicle brand"
                  placeholderTextColor="#999"
                  value={guestBookingData.brand}
                  onChangeText={(text) => setGuestBookingData({ ...guestBookingData, brand: text })}
                  onFocus={() => scrollGuestBookingForm(360)}
                />

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Model (Optional)</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter vehicle model"
                  placeholderTextColor="#999"
                  value={guestBookingData.model}
                  onChangeText={(text) => setGuestBookingData({ ...guestBookingData, model: text })}
                  onFocus={() => scrollGuestBookingForm(430)}
                />

                <Text style={[styles.slotDetailLabel, { marginBottom: 8 }]}>Color (Optional)</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter vehicle color"
                  placeholderTextColor="#999"
                  value={guestBookingData.color}
                  onChangeText={(text) => setGuestBookingData({ ...guestBookingData, color: text })}
                  onFocus={() => scrollGuestBookingForm()}
                />
              </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <TouchableOpacity 
                    style={[styles.goBackButton, { flex: 0.48, backgroundColor: '#ccc' }]} 
                    onPress={closeGuestBookingModal}
                    disabled={isCreatingGuestBooking}
                  >
                    <Text style={styles.goBackButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.goBackButton, { flex: 0.48, backgroundColor: '#8B0000' }]} 
                    onPress={handleCreateGuestBooking}
                    disabled={isCreatingGuestBooking}
                  >
                    <Text style={[styles.goBackButtonText, { color: '#fff' }]}>
                      {isCreatingGuestBooking ? 'Creating...' : 'Create Booking'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attendant Action Modal */}
      <Modal
        visible={showAttendantActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttendantActionModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            minHeight: 300,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333'
              }}>
                Choose Action
              </Text>
              <TouchableOpacity onPress={() => setShowAttendantActionModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 16,
                color: '#666',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 22
              }}>
                What would you like to do with this spot?
              </Text>
              
              {selectedSpotForAction && (
                <View style={{
                  backgroundColor: '#f8f9fa',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 8
                  }}>
                    {selectedSpotForAction.sectionName} - {selectedSpotForAction.spotNumber}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#666',
                    marginBottom: 4
                  }}>
                    Type: {selectedSpotForAction.vehicleType?.charAt(0).toUpperCase() + selectedSpotForAction.vehicleType?.slice(1)}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#666'
                  }}>
                    Status: {selectedSpotForAction.status?.charAt(0).toUpperCase() + selectedSpotForAction.status?.slice(1)}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'column', gap: 12 }}>
                {selectedSpotForAction?.status === 'available' ? (
                  <>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#dc3545',
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        minHeight: 56
                      }}
                      onPress={handleSetSpotUnavailable}
                    >
                      <MaterialIcons name="block" size={24} color="#fff" style={{ marginRight: 12 }} />
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '600'
                      }}>
                        Set as Unavailable
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        backgroundColor: '#007bff',
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        minHeight: 56
                      }}
                      onPress={handleBookGuestParking}
                    >
                      <MaterialIcons name="person-add" size={24} color="#fff" style={{ marginRight: 12 }} />
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '600'
                      }}>
                        Book Guest Parking
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#28a745',
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        minHeight: 56
                      }}
                      onPress={handleSetSpotAvailable}
                    >
                      <MaterialIcons name="check-circle" size={24} color="#fff" style={{ marginRight: 12 }} />
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '600'
                      }}>
                        Set as Available
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Show unavailable reason if it exists */}
                    {(() => {
                      const spotKey = selectedSpotForAction?.spotId || selectedSpotForAction?.id;
                      const reason = spotUnavailableReasons[spotKey];
                      return reason && (
                        <View style={{
                          backgroundColor: '#fff3cd',
                          borderWidth: 1,
                          borderColor: '#ffeaa7',
                          borderRadius: 8,
                          padding: 12,
                          marginTop: 8
                        }}>
                          <Text style={{
                            fontSize: 14,
                            color: '#856404',
                            fontWeight: '600',
                            marginBottom: 4
                          }}>
                            Reason for unavailability:
                          </Text>
                          <Text style={{
                            fontSize: 14,
                            color: '#856404',
                            lineHeight: 20
                          }}>
                            {reason}
                          </Text>
                        </View>
                      );
                    })()}
                  </>
                )}
              </View>

              <TouchableOpacity
                style={{
                  marginTop: 16,
                  paddingVertical: 12,
                  alignItems: 'center'
                }}
                onPress={() => setShowAttendantActionModal(false)}
              >
                <Text style={{
                  color: '#666',
                  fontSize: 16,
                  fontWeight: '500'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Settings Modal */}
      <Modal
        visible={showSectionSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSectionSettingsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333'
              }}>
                Section Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSectionSettingsModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
              {selectedSectionForSettings && (
                <View style={{
                  backgroundColor: '#f8f9fa',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 8
                  }}>
                    {selectedSectionForSettings.sectionName}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#666',
                    marginBottom: 4
                  }}>
                    Type: {selectedSectionForSettings.vehicleType?.charAt(0).toUpperCase() + selectedSectionForSettings.vehicleType?.slice(1)}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#666'
                  }}>
                    Capacity: {selectedSectionForSettings.capacity} spots
                  </Text>
                </View>
              )}

              {/* Show unavailable reason if it exists */}
              {(() => {
                const reason = sectionUnavailableReasons[selectedSectionForSettings?.sectionId];
                return reason && (
                  <View style={{
                    backgroundColor: '#fff3cd',
                    borderWidth: 1,
                    borderColor: '#ffeaa7',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: '#856404',
                      fontWeight: '600',
                      marginBottom: 4
                    }}>
                      Reason for unavailability:
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#856404',
                      lineHeight: 20
                    }}>
                      {reason}
                    </Text>
                  </View>
                );
              })()}

              <View style={{ flexDirection: 'column', gap: 12 }}>
                {selectedSectionForSettings?.status !== 'unavailable' ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#dc3545',
                      paddingVertical: 16,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      minHeight: 56
                    }}
                    onPress={handleSetSectionUnavailable}
                  >
                    <MaterialIcons name="block" size={24} color="#fff" style={{ marginRight: 12 }} />
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600'
                    }}>
                      Set as Unavailable
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#28a745',
                      paddingVertical: 16,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      minHeight: 56
                    }}
                    onPress={handleSetSectionAvailable}
                  >
                    <MaterialIcons name="check-circle" size={24} color="#fff" style={{ marginRight: 12 }} />
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600'
                    }}>
                      Set as Available
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowSectionSettingsModal(false)}
                >
                  <Text style={{
                    color: '#666',
                    fontSize: 16,
                    fontWeight: '500'
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unavailable Confirmation Modal */}
      <Modal
        visible={showUnavailableConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnavailableConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333'
              }}>
                Confirm Unavailable
              </Text>
              <TouchableOpacity onPress={() => setShowUnavailableConfirmModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 16,
                color: '#666',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 22
              }}>
                Why are you making this spot unavailable?
              </Text>
              
              {selectedSpotForAction && (
                <View style={{
                  backgroundColor: '#f8f9fa',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 8
                  }}>
                    {selectedSpotForAction.sectionName} - {selectedSpotForAction.spotNumber}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#666'
                  }}>
                    Type: {selectedSpotForAction.vehicleType?.charAt(0).toUpperCase() + selectedSpotForAction.vehicleType?.slice(1)}
                  </Text>
                </View>
              )}

              <View style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                marginBottom: 20
              }}>
                <TextInput
                  style={{
                    padding: 12,
                    fontSize: 16,
                    color: '#333',
                    minHeight: 80,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Enter reason (e.g., Maintenance, Reserved for event, etc.)"
                  placeholderTextColor="#999"
                  value={unavailableReason}
                  onChangeText={(text) => {
                    console.log('📝 TextInput changed:', { text, length: text.length, isConfirmingSection });
                    setUnavailableReason(text);
                  }}
                  multiline
                  maxLength={200}
                />
              </View>

              <View style={{ flexDirection: 'column', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#dc3545',
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    minHeight: 56
                  }}
                  onPress={handleConfirmSetUnavailable}
                >
                  <MaterialIcons name="block" size={24} color="#fff" style={{ marginRight: 12 }} />
                  <Text style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: '600'
                  }}>
                    Confirm Unavailable
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowUnavailableConfirmModal(false)}
                >
                  <Text style={{
                    color: '#666',
                    fontSize: 16,
                    fontWeight: '500'
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = dashboardScreenStyles;

export default DashboardScreen;




