// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMapConfig, ParkingMapConfig } from '../../config/parkingMapConfigs';
import {
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { LiquidGauge } from '../../components/LiquidGauge';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SharedHeader from '../../components/SharedHeader';
import InteractiveParkingLayout from '../../components/InteractiveParkingLayout';
import { getActiveParkingScreenStyles } from '../styles/activeParkingScreenStyles';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useExpirationModal } from '../../contexts/ExpirationModalContext';
import ApiService from '../../services/api';
import RealtimeService from '../../services/realtime';
import { useScreenDimensions, getAdaptiveSize, getAdaptiveFontSize, getAdaptivePadding, getAdaptiveSpacing } from '../../hooks/use-screen-dimensions';
import { calculateAllSpotPositions } from '../../utils/svgSpotPositioning';
import { PENDING_EXPIRATION_STORAGE_KEY } from '../constants/storageKeys';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RESERVATION_HOLD_MINUTES = 15;
const RESERVATION_HOLD_MS = RESERVATION_HOLD_MINUTES * 60 * 1000;

// Enhanced responsive calculations
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isLargeTablet = screenWidth >= 1024;

const getResponsiveFontSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isMediumScreen) return baseSize * 0.95;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.1;
  if (isLargeTablet) return baseSize * 1.2;
  return baseSize;
};

const getResponsiveSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.8;
  if (isMediumScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize;
  if (isTablet) return baseSize * 1.05;
  if (isLargeTablet) return baseSize * 1.1;
  return baseSize;
};

const getResponsivePadding = (basePadding: number): number => {
  if (isSmallScreen) return basePadding * 0.8;
  if (isMediumScreen) return basePadding * 0.9;
  if (isLargeScreen) return basePadding;
  if (isTablet) return basePadding * 1.1;
  if (isLargeTablet) return basePadding * 1.2;
  return basePadding;
};

const getResponsiveMargin = (baseMargin: number): number => {
  if (isSmallScreen) return baseMargin * 0.8;
  if (isMediumScreen) return baseMargin * 0.9;
  if (isLargeScreen) return baseMargin;
  if (isTablet) return baseMargin * 1.1;
  if (isLargeTablet) return baseMargin * 1.2;
  return baseMargin;
};

// Helper function to format decimal hours to HH.MM format (e.g., 83.5 -> "83.30")
const formatHoursToHHMM = (decimalHours: number): string => {
  if (!decimalHours || decimalHours === 0) return '0.00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}.${minutes.toString().padStart(2, '0')}`;
};

const isBookingNotOwnedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('Booking not found or does not belong to user') ||
    message.includes('Booking not found')
  );
};

 type BookingDetails = {
   reservationId: number;
   displayName: string;
   userEmail: string;
   vehicleDetails: {
     plateNumber: string;
     vehicleType: string;
     brand: string;
     color: string;
   };
   parkingArea: {
     id?: number;
     name: string;
     location: string;
   };
   parkingSlot: {
     spotId?: string;
     parkingSpotId?: number;
     spotNumber: string;
     spotType: string;
     sectionName?: string;
   };
   timestamps: {
     startTime?: string | null;
     endTime?: string | null;
   };
   bookingStatus: string;
   qrCode: string;
   qrKey?: string;
   penaltyInfo?: {
     hasPenalty?: boolean;
     penaltyHours?: number;
   } | null;
 };

const ActiveParkingScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { hideLoading } = useLoading(); // Add this to force hide loading
  const { checkPendingReservationExpiration } = useExpirationModal(); // Add expiration modal check
  const activeParkingScreenStyles = getActiveParkingScreenStyles(colors);
  const screenDimensions = useScreenDimensions();
  const [activeTab, setActiveTab] = useState('ticket'); // Default to Parking Ticket tab
  console.log('🎯 ActiveParkingScreen: activeTab state changed to:', activeTab);
  
  // Booking data state
  const [bookingData, setBookingData] = useState<any>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(true); // Add loading state for booking data
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  // SVG Layout state
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoadingSvg, setIsLoadingSvg] = useState(false);
  const [layoutId, setLayoutId] = useState<number | null>(null);
  // Responsive SVG dimensions calculation - memoized to prevent infinite re-renders
  const svgDimensions = useMemo(() => {
    let svgWidth: number;
    let svgHeight: number;
    
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    // Screen size breakpoints
    const isSmallScreen = screenWidth < 375;
    const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
    const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
    const isTablet = screenWidth >= 768 && screenWidth < 1024;
    const isLargeTablet = screenWidth >= 1024;
    
    // A LITTLE BIT MORE LARGER AGAIN - further increased dimensions
    if (isSmallScreen) {
      svgWidth = 900; // A bit more larger again for small phones
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isMediumScreen) {
      svgWidth = 1000; // A bit more larger again for medium phones
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isLargeScreen) {
      svgWidth = 1100; // A bit more larger again for large phones
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isTablet) {
      svgWidth = 1600; // A bit more larger again for tablets
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else if (isLargeTablet) {
      svgWidth = 1800; // A bit more larger again for large tablets
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    } else {
      svgWidth = 1100; // A bit more larger again default size
      svgHeight = svgWidth * (358 / 1294); // Maintain aspect ratio
    }
    
    console.log('🎯 A LITTLE BIT MORE LARGER AGAIN SVG dimensions:', { 
      svgWidth, 
      svgHeight, 
      screenWidth,
      screenHeight,
      deviceType: isLargeTablet ? 'Large Tablet' : isTablet ? 'Tablet' : isLargeScreen ? 'Large Phone' : isMediumScreen ? 'Medium Phone' : 'Small Phone',
      aspectRatio: 358 / 1294,
      isFixedDimensions: true,
      sizeCategory: isLargeTablet ? '1800px' : isTablet ? '1600px' : '900-1100px'
    });
    
    return { width: svgWidth, height: svgHeight };
  }, [screenDimensions.width, screenDimensions.height]); // Recalculate when screen dimensions change
  
  // Clickable spots from SVG
  const [clickableSpots, setClickableSpots] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    spotNumber?: string;
    spotId?: string;
  }>>([]);
  
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
    status?: string;
    isUserBooked?: boolean;
    activeReservations: number;
    utilizationRate: string;
  }>>([]);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [showSpotModal, setShowSpotModal] = useState(false);
  
  // Spot statuses from backend (matched by spot_number)
  const [spotStatuses, setSpotStatuses] = useState<Map<string, {
    id: number;
    spot_number: string;
    status: string;
    spot_type: string;
    section_name: string;
    is_user_booked?: boolean | number; // Indicates if current user has booked this spot
  }>>(new Map());
  const lastLoadedLayoutAreaIdRef = useRef<number | null>(null);
  const isLayoutLoadingRef = useRef(false);
  const previousUserIdRef = useRef<number | string | null>(null);
  const isTimerRunningRef = useRef(false);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (!bookingData?.reservationId) {
      setHasShownExpirationModal(false);
      setLastExpiredReservationId(null);
    }
  }, [bookingData?.reservationId]);

  // Set initial mount flag to false after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 100); // Small delay to ensure initial data is loaded
    return () => clearTimeout(timer);
  }, []);

  const enhancedClickableSpots = useMemo(() => 
    clickableSpots.map(spot => ({
      ...spot,
      originalWidth: spot.width,
      originalHeight: spot.height,
      originalX: spot.x,
      originalY: spot.y,
    })),
    [clickableSpots]
  );

  const positionedSpots = useMemo(() => {
    if (!svgContent || svgDimensions.width <= 0 || svgDimensions.height <= 0) {
      return [];
    }

    return calculateAllSpotPositions(
      enhancedClickableSpots,
      svgContent,
      svgDimensions.width,
      svgDimensions.height
    );
  }, [enhancedClickableSpots, svgContent, svgDimensions.width, svgDimensions.height]);
  
  // Zoom state for SVG - using regular state for simplicity
  const [scale, setScale] = React.useState(1.0); // No zoom - show whole map
  const savedScaleRef = React.useRef(1.0); // Refs for ScrollView and SVG
  const scrollViewRef = useRef<ScrollView>(null);
  const verticalScrollViewRef = useRef<ScrollView>(null); // Add ref for inner vertical ScrollView
  
  // Display state
  const [qrScanned, setQrScanned] = useState(false);
  const [parkingEndTime, setParkingEndTime] = useState<number | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showParkingEndModal, setShowParkingEndModal] = useState(false);
  const [parkingEndDetails, setParkingEndDetails] = useState<any>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0); // Default 5 hours as fallback
  
  // Update ref whenever isTimerRunning changes
  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning;
  }, [isTimerRunning]); // Start as false, will start when attendant scans
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in seconds
  const [remainingBalance, setRemainingBalance] = useState(0); // Track remaining balance in hours
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Grace period modals
  const [showGracePeriodWarning, setShowGracePeriodWarning] = useState(false);
  const [hasShownExpirationModal, setHasShownExpirationModal] = useState(false);
  const [lastExpiredReservationId, setLastExpiredReservationId] = useState<number | null>(null);
  const [gracePeriodDeadline, setGracePeriodDeadline] = useState<string>('');
  const [gracePeriodCreatedAt, setGracePeriodCreatedAt] = useState<string | null>(null);
  const [gracePeriodRemainingMs, setGracePeriodRemainingMs] = useState<number>(0);
  
  // Real parking start time from booking data
  const parkingStartTime = useRef<number | null>(null);
  const [totalParkingTime, setTotalParkingTime] = useState(60 * 60); // Total parking time in seconds (will be updated based on user balance)
  const liquidGaugeValue = useMemo(() => {
    if (!userBalance || userBalance <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (remainingBalance / userBalance) * 100));
  }, [remainingBalance, userBalance]);

  const resetBookingState = useCallback(() => {
    setBookingData(null);
    setBookingError(null);
    setElapsedTime(0);
    setParkingEndTime(null);
    setQrScanned(false);
    setIsTimerRunning(false);
    parkingStartTime.current = null;
  }, []);

  useEffect(() => {
    const currentUserId = user?.user_id ?? null;

    if (!isAuthenticated) {
      if (bookingData) {
        resetBookingState();
      }
      previousUserIdRef.current = null;
      return;
    }

    if (
      previousUserIdRef.current !== null &&
      currentUserId !== null &&
      previousUserIdRef.current !== currentUserId
    ) {
      console.log('🔐 ActiveParkingScreen: user changed, clearing booking state');
      resetBookingState();
    }

    previousUserIdRef.current = currentUserId;
  }, [bookingData, isAuthenticated, resetBookingState, user?.user_id]);

  // Helper function to format decimal hours to HH.MM format (e.g., 83.5 -> "83.30")
const formatHoursToHHMM = (decimalHours: number): string => {
  if (!decimalHours || decimalHours === 0) return '0.00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}.${minutes.toString().padStart(2, '0')}`;
};

// Format duration helper
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format elapsed time to display format
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Fetch user balance (cached)
  const balanceFetchedRef = useRef(false);
  const fetchUserBalance = async () => {
    // Only fetch once per session to avoid continuous API calls
    if (balanceFetchedRef.current) {
      console.log('🎯 ActiveParkingScreen: Balance already cached, skipping fetch');
      return;
    }
    
    try {
      const balanceResponse = await ApiService.getSubscriptionBalance();
      if (balanceResponse.success) {
        const balance = parseFloat(balanceResponse.data.total_hours_remaining) || 5.0; // Convert to number and default to 5 hours
        setUserBalance(balance);
        
        // Set total parking time based on balance (convert hours to seconds)
        const totalSeconds = balance * 60 * 60;
        setTotalParkingTime(totalSeconds);
        
        balanceFetchedRef.current = true; // Mark as cached
        
        console.log('🎯 ActiveParkingScreen: Balance fetched and cached:', balance, 'hours (type:', typeof balance, ')');
        console.log('🎯 ActiveParkingScreen: Total parking time set to:', totalSeconds, 'seconds');
      }
    } catch (error) {
      console.error('🎯 ActiveParkingScreen: Error fetching user balance:', error);
      // Set default values on error to prevent timer from breaking
      setUserBalance(5.0);
      setTotalParkingTime(5.0 * 60 * 60);
      balanceFetchedRef.current = true;
    }
  };

  // Grace period helper functions
  const calculateGracePeriodDeadline = (createdAt: string) => {
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + RESERVATION_HOLD_MS);
    return deadline.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const deadline = created.getTime() + RESERVATION_HOLD_MS;
    const now = Date.now();
    return Math.max(0, deadline - now);
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showGracePeriodWarningModal = (createdAt: string) => {
    const deadline = calculateGracePeriodDeadline(createdAt);
    setGracePeriodDeadline(deadline);
    setGracePeriodCreatedAt(createdAt);
    setGracePeriodRemainingMs(calculateTimeRemaining(createdAt));
    setShowGracePeriodWarning(true);
  };

  useEffect(() => {
    if (!showGracePeriodWarning || !gracePeriodCreatedAt) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateCountdown = () => {
      const remaining = calculateTimeRemaining(gracePeriodCreatedAt);
      setGracePeriodRemainingMs(remaining);

      if (remaining <= 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    updateCountdown();
    intervalId = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showGracePeriodWarning, gracePeriodCreatedAt]);

  const getReservationCreatedAt = (booking: any): string | null => {
    return (
      booking?.timestamps?.bookingTime ||
      booking?.bookingTime ||
      booking?.time_stamp ||
      booking?.timestamps?.time_stamp ||
      booking?.timestamps?.createdAt ||
      booking?.createdAt ||
      booking?.created_at ||
      null
    );
  };

  const maybeShowGracePeriodWarning = (booking: any) => {
    if (booking?.bookingStatus !== 'reserved') {
      setShowGracePeriodWarning(false);
      return;
    }

    const createdAt = getReservationCreatedAt(booking);
    if (!createdAt) {
      return;
    }

    const remainingMs = calculateTimeRemaining(createdAt);
    if (remainingMs > 0) {
      // Always show on every Active Parking open while reservation is still in grace period.
      showGracePeriodWarningModal(createdAt);
    } else {
      setShowGracePeriodWarning(false);
    }
  };

  const handoffExpirationDetailsToHome = async (details: any) => {
    try {
      await AsyncStorage.setItem(
        PENDING_EXPIRATION_STORAGE_KEY,
        JSON.stringify({
          ...details,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('❌ Failed to persist expiration details:', error);
    }
  };

  const handleGracePeriodWarningClose = () => {
    setShowGracePeriodWarning(false);
    setGracePeriodDeadline('');
    setGracePeriodCreatedAt(null);
    setGracePeriodRemainingMs(0);
  };

  const handleParkingEndModalClose = () => {
    console.log('🎯 Parking End Modal: OK button pressed, closing modal and navigating to home');
    
    // Force close all modals immediately
    setShowParkingEndModal(false);
    setShowSpotModal(false);
    setShowTestModal(false);
    setShowGracePeriodWarning(false);
    setParkingEndDetails(null);
    
    // Clear all parking data
    setBookingData(null);
    setElapsedTime(0);
    setParkingEndTime(null);
    setQrScanned(false);
    parkingStartTime.current = null;
    setIsTimerRunning(false);
    
    console.log('🎯 Parking End Modal: Navigating to HomeScreen...');
    
    // Navigate immediately
    try {
      router.replace('/screens/HomeScreen');
    } catch (error) {
      console.error('🎯 Parking End Modal: Navigation error:', error);
      // Fallback navigation
      router.push('/screens/HomeScreen');
    }
    
    // Force navigation after a short delay as fallback
    setTimeout(() => {
      console.log('🎯 Parking End Modal: Fallback navigation triggered');
      router.replace('/screens/HomeScreen');
    }, 100);
  };


  // Parse SVG to extract clickable elements (updated to match HomeScreen logic)
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
        
        // DEBUG: Log every element found with ID
        console.log(`🔍 DEBUG: Found element with ID: ${id} (type: ${elementType})`);
        console.log(`🔍 DEBUG: Full element snippet: ${fullElement.substring(0, 200)}...`);
        
        // SPECIAL DEBUG: Pay extra attention to anything with "4" in the ID
        if (id.toLowerCase().includes('4') || id.toLowerCase().includes('spot') || id.toLowerCase().includes('parking')) {
          console.log(`🚨 SPOT 4 DEBUG: Found potential spot 4 element: ${id}`);
          console.log(`🚨 SPOT 4 DEBUG: Element type: ${elementType}`);
          console.log(`🚨 SPOT 4 DEBUG: Full element: ${fullElement}`);
          console.log(`🚨 SPOT 4 DEBUG: Match index: ${matchIndex}`);
        }
        
        // Skip elements with "element" in their ID - these are not parking spots
        const idLower = id.toLowerCase();
        if (idLower.includes('element') || idLower.includes('road') || idLower.includes('path') || idLower.includes('line') || idLower.includes('arrow')) {
          console.log(`🚫 Skipping non-parking element: ${id}`);
          continue;
        }
        
        // Only process elements that are likely parking spots
        // Check if the element has parking-related attributes or is within a parking context
        const hasParkingAttributes = fullElement.includes('data-slot') || 
                                     fullElement.includes('data-section') ||
                                     fullElement.includes('data-parking') ||
                                     idLower.includes('spot') ||
                                     idLower.includes('parking') ||
                                     idLower.includes('slot');
        
        if (!hasParkingAttributes) {
          console.log(`🚫 Skipping element without parking attributes: ${id} (type: ${elementType})`);
          continue;
        }
        
        // Additional check: skip if element type suggests it's not a parking spot
        if (elementType === 'polygon' || elementType === 'line' || elementType === 'path') {
          console.log(`🚫 Skipping ${elementType} element (not a parking spot): ${id}`);
          continue;
        }
        
        // CRITICAL: Only process if this is a legitimate parking spot
        // This prevents creating touchables for non-existent spots
        const isLegitimateParkingSpot = 
          id.includes('FPA-') || // FU Main format
          id.includes('S-') ||   // Spot format
          id.includes('spot') || // Spot keyword
          id.includes('parking') || // Parking keyword
          id.includes('section-') || // Capacity sections (V, X, VB)
          (id.match(/\d+/) && parseInt(id.match(/\d+/)![1]) > 0 && parseInt(id.match(/\d+/)![1]) <= 50); // Valid numbers
        
        if (!isLegitimateParkingSpot) {
          console.log(`🚫 Skipping non-legitimate parking spot: ${id}`);
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
          while ((pathMatch = pathRegex.exec(innerGroupContent)) !== null) {
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
        // Formats: "F1-A-1", "A-1", "spot-1", "parking-1", "section-a-spot-1", etc.
        let spotNumber = id;
        
        // Try different patterns
        // Pattern 1: F{floor}-{section}-{number} or {section}-{number}
        const sectionSpotMatch = id.match(/(?:F\d+-)?([A-Z]+)-(\d+)/i);
        if (sectionSpotMatch) {
          spotNumber = sectionSpotMatch[2]; // Use just the number part
        } else {
          // Pattern 2: spot-{number} or parking-{number}
          const spotMatch = id.match(/(?:spot|parking)[-_]?(\d+)/i);
          if (spotMatch) {
            spotNumber = spotMatch[1];
          } else {
            // Pattern 3: Any number in the ID
            const numMatch = id.match(/(\d+)/);
            if (numMatch) {
              spotNumber = numMatch[1];
            }
          }
        }
        
        // Only add if we have valid coordinates and reasonable size for parking spots
        if (width > 0 && height > 0 && !isNaN(width) && !isNaN(height) && 
            width >= 20 && height >= 20) { // Minimum size for parking spots
          
          // FINAL VALIDATION: Ensure this looks like a real parking spot
          const aspectRatio = width / height;
          const isReasonableShape = 
            (width >= 40 && width <= 80 && height >= 40 && height <= 80) || // Standard parking spot
            (width >= 20 && width <= 100 && height >= 20 && height <= 100); // Flexible range
          
          if (!isReasonableShape) {
            console.log(`🚫 Skipping element with unreasonable parking spot dimensions: ${id} (${width}x${height})`);
            continue;
          }
          
          // SPOT 4 DEBUG: Log when any spot is being added
          console.log(`✅ DEBUG: Adding parking spot: ${id} at (${x}, ${y}) size ${width}x${height} type: ${elementType}`);
          console.log(`✅ DEBUG: Spot details:`, {
            id,
            spotNumber,
            x,
            y,
            width,
            height,
            elementType,
            aspectRatio,
            isReasonableShape
          });
          
          // SPECIAL DEBUG: Extra logging for spot 4
          if (id.toLowerCase().includes('4') || spotNumber === '4') {
            console.log(`🚨 SPOT 4 DEBUG: ABOUT TO ADD SPOT 4!`);
            console.log(`🚨 SPOT 4 DEBUG: Final spot 4 details:`, {
              id,
              spotNumber,
              x,
              y,
              width,
              height,
              elementType,
              fullElement: fullElement.substring(0, 300)
            });
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
          
          if (id.toLowerCase().includes('4') || spotNumber === '4') {
            console.log(`🚨 SPOT 4 DEBUG: SPOT 4 HAS BEEN ADDED TO ARRAY!`);
          }
        } else {
          console.log(`🚫 Skipping element too small for parking spot: ${id} (${width}x${height}) type: ${elementType}`);
        }
      }
      
      // Process FU Main parking slots with data attributes
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
          
          // Apply the same filtering as regular ID processing
          const idLower = slotId.toLowerCase();
          if (idLower.includes('element') || idLower.includes('road') || idLower.includes('path') || idLower.includes('line') || idLower.includes('arrow')) {
            console.log(`🚫 Skipping FU Main element with non-parking ID: ${slotId}`);
            continue;
          }
          
          // Additional check: skip if element type suggests it's not a parking spot
          if (elementType === 'polygon' || elementType === 'line' || elementType === 'path') {
            console.log(`🚫 Skipping FU Main ${elementType} element (not a parking spot): ${slotId}`);
            continue;
          }
          
          // CRITICAL: Only process if this is a legitimate parking spot with proper attributes
          // This prevents creating touchables for non-existent spots
          const isLegitimateParkingSpot = 
            slotId.includes('FPA-') || // FU Main format
            slotId.includes('S-') ||   // Spot format
            slotId.includes('section-') || // Capacity sections
            section.includes('S') ||   // Section S
            (localSlot && parseInt(localSlot) > 0 && parseInt(localSlot) <= 50); // Valid slot numbers
          
          if (!isLegitimateParkingSpot) {
            console.log(`🚫 Skipping non-legitimate parking spot: ${slotId} (section: ${section}, local: ${localSlot})`);
            continue;
          }
          
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
          
          // Add the FU Main parking spot with all attributes
          // FINAL VALIDATION: Ensure this looks like a real parking spot
          const isReasonableShape = 
            (width >= 40 && width <= 80 && height >= 40 && height <= 80) || // Standard parking spot
            (width >= 20 && width <= 100 && height >= 20 && height <= 100); // Flexible range
          
          if (!isReasonableShape) {
            console.log(`🚫 Skipping FU Main element with unreasonable dimensions: ${slotId} (${width}x${height})`);
            continue;
          }
          
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
      
      // Process FPA parking slots (same as HomeScreen logic)
      console.log('🔍 Processing FPA parking slots...');
      const fpaSlotRegex = /<g[^>]*\sdata-type=["']parking-slot["'][^>]*data-slot-id=["']([^"']+)["'][^>]*data-slot=["']([^"']+)["'][^>]*data-section=["']([^"']+)["'][^>]*data-local-slot=["']([^"']+)["'][^>]*>/g;
      let fpaMatch;
      
      while ((fpaMatch = fpaSlotRegex.exec(svgString)) !== null) {
        const fullElement = fpaMatch[0];
        const slotId = fpaMatch[1]; // FPA-S-001, FPA-S-002, etc.
        const slotNumber = fpaMatch[2]; // 001, 002, etc.
        const section = fpaMatch[3]; // S
        const localSlot = fpaMatch[4]; // 1, 2, 3, 4
        
        // Apply spot ID mapping if available
        const parkingAreaName = bookingData?.parkingArea?.name || 'FPA';
        const parkingAreaId = bookingData?.parkingArea?.id || 2;
        const mapConfig = getMapConfig(parkingAreaId, parkingAreaName);
        const mappedSlotId = mapConfig.spotIdMapping?.[slotId] || slotId;
        
        console.log(`🎯 Found parking slot: ${slotId} -> mapped to ${mappedSlotId} (${section}-${slotNumber}) local: ${localSlot}`);
        console.log(`🔍 Slot Debug: slotId=${slotId}, mappedSlotId=${mappedSlotId}, slotNumber=${slotNumber}, section=${section}, localSlot=${localSlot}`);
        
        // Extract transform for positioning
        const transformMatch = fullElement.match(/transform=["']translate\(([^)]+)\)["']/);
        let x = 0, y = 0;
        
        if (transformMatch) {
          const coords = transformMatch[1].split(/[,\s]+/).map(parseFloat);
          x = coords[0] || 0;
          y = coords[1] || 0;
          console.log(`🔍 FPA Slot Transform: x=${x}, y=${y}`);
        }
        
        // Look for rect element for dimensions
        const rectRegex = /<rect[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["'][^>]*>/;
        const rectMatch = rectRegex.exec(fullElement);
        
        let width = 46; // Default FPA spot size
        let height = 46;
        
        if (rectMatch) {
          const rectX = parseFloat(rectMatch[1]);
          const rectY = parseFloat(rectMatch[2]);
          const rectWidth = parseFloat(rectMatch[3]);
          const rectHeight = parseFloat(rectMatch[4]);
          
          if (!isNaN(rectWidth) && !isNaN(rectHeight) && rectWidth > 0 && rectHeight > 0) {
            width = rectWidth;
            height = rectHeight;
            console.log(`🔍 FPA Slot Rect: ${rectWidth}x${rectHeight} at (${rectX}, ${rectY})`);
          }
        }
        
        // Add the FPA parking spot
        const fpaSpot = {
          id: mappedSlotId, // Use the mapped spot ID
          x: x,
          y: y,
          width: width,
          height: height,
          spotNumber: slotNumber,
          spotId: mappedSlotId, // Use the mapped spot ID
          localSlot: localSlot,
          section: section,
        };
        
        spots.push(fpaSpot);
        
        console.log(`✅ Added spot: ${mappedSlotId} (original: ${slotId}) at (${x}, ${y}) size ${width}x${height} local: ${localSlot}`);
        console.log(`🔍 FPA Spot Object:`, fpaSpot);
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
              
              // Parse coordinates
              const coords = transform.match(/translate\(([^)]+)\)/);
              let x = 0, y = 0;
              if (coords) {
                const xy = coords[1].split(/[,\s]+/).map(parseFloat);
                x = xy[0] || 0;
                y = xy[1] || 0;
              }
              
              // Look for rect in this group for dimensions
              const rectMatch = groupContent.match(/<rect[^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["']/);
              let width = 100, height = 50;
              
              if (rectMatch) {
                width = parseFloat(rectMatch[1]) || 100;
                height = parseFloat(rectMatch[2]) || 50;
              }
              
              // Check if this section already exists
              const existingSection = spots.find(s => s.id === `section-${letter}`);
              if (!existingSection) {
                spots.push({
                  id: `section-${letter}`,
                  x: x,
                  y: y,
                  width: width,
                  height: height,
                  spotNumber: letter,
                  spotId: `section-${letter}`,
                });
                
                console.log(`✅ Added ${letter} section via text detection: at (${x}, ${y}) size ${width}x${height}`);
              } else {
                console.log(`ℹ️ Section ${letter} already exists, skipping duplicate`);
              }
            }
          }
        } else {
          console.log(`⚠️ No text element found for section ${letter}`);
        }
      }
      
      console.log(`✅ Parsed ${spots.length} clickable spots from SVG`);
    } catch (error) {
      console.error('❌ Error parsing SVG:', error);
    }
    
    console.log(`🎯 Total parking spots found: ${spots.length}`);
    console.log('📍 Final spot list:', spots.map(s => ({ 
      id: s.id, 
      spotNumber: s.spotNumber, 
      x: s.x, 
      y: s.y, 
      width: s.width, 
      height: s.height,
      section: (s as any).section,
      localSlot: (s as any).localSlot
    })));
    
    // Log any suspicious spots that might be in roads
    const suspiciousSpots = spots.filter(s => 
      s.id.includes('4') && 
      (s.x < 50 || s.y < 50 || s.x > 1200 || s.y > 300) // Check if in road-like areas
    );
    if (suspiciousSpots.length > 0) {
      console.log('⚠️ Suspicious spots (possible road elements):', suspiciousSpots);
    }
    
    return spots;
  };

  // Function to load spot statuses from backend (with smooth update like attendant dashboard)
  const loadSpotStatuses = async (areaId: number, skipChangeCheck = false) => {
    if (!isAuthenticated) {
      console.log('🔐 Skipping loadSpotStatuses - user not authenticated');
      return;
    }
    try {
      console.log('📊 Loading spot statuses for area:', areaId);
      const response = await ApiService.getParkingSpotsStatus(areaId);
      
      if (response.success && response.data.spots) {
        // Create a Map for quick lookup by spot_number and ID
        const newStatusMap = new Map();
        response.data.spots.forEach((spot: any) => {
          // Store by spot_number (primary key)
          newStatusMap.set(spot.spot_number, spot);
          // Also store by ID for fallback matching (matches HomeScreen approach)
          newStatusMap.set(spot.id.toString(), spot);
        });
        
        // Only update if there are changes (to avoid unnecessary re-renders)
        if (!skipChangeCheck) {
          setSpotStatuses(currentStatuses => {
            // Check if there are any changes
            let hasChanges = false;
            
            // Check if any spot status changed
            for (const [spotNumber, newSpot] of newStatusMap.entries()) {
              const currentSpot = currentStatuses.get(spotNumber);
              if (!currentSpot || currentSpot.status !== newSpot.status) {
                hasChanges = true;
                break;
              }
            }
            
            // Also check if any spots were added or removed
            if (!hasChanges && currentStatuses.size !== newStatusMap.size) {
              hasChanges = true;
            }
            
            if (hasChanges) {
              console.log('📊 Spot statuses have changes, updating...');
              return newStatusMap;
            } else {
              console.log('📊 No changes detected in spot statuses, skipping update');
              return currentStatuses;
            }
          });
        } else {
          // Initial load - always update
          setSpotStatuses(newStatusMap);
          console.log(`✅ Loaded ${newStatusMap.size} spot statuses`);
        }
      } else {
        console.log('⚠️ No spot statuses found');
        if (skipChangeCheck) {
          setSpotStatuses(new Map());
        }
      }
    } catch (error) {
      console.error('❌ Error loading spot statuses:', error);
      if (skipChangeCheck) {
        setSpotStatuses(new Map());
      }
    }
  };

  // Function to load SVG content using AJAX
  const loadSvgContent = async (forceRefresh = false) => {
    if (!isAuthenticated) {
      console.log('🔐 Skipping loadSvgContent - user not authenticated');
      return;
    }
    if (!bookingData?.parkingArea?.id) return;
    
    // Clear existing content if forcing refresh
    if (forceRefresh) {
      setSvgContent('');
      setClickableSpots([]);
    }
    
    setIsLoadingSvg(true);
    try {
      console.log('🖼️ Loading parking layout for area:', bookingData.parkingArea.id, forceRefresh ? '(FORCE REFRESH)' : '');
      
      // Get layout info
      const layoutInfo = await ApiService.getParkingAreaLayout(bookingData.parkingArea.id);
      console.log('📊 Layout response:', layoutInfo);
      
      if (layoutInfo.success && layoutInfo.data.hasLayout && layoutInfo.data.layoutSvg) {
        const svg = layoutInfo.data.layoutSvg;
        setSvgContent(svg);
        setLayoutId(layoutInfo.data.layoutId);
        
        // Parse SVG for clickable elements
        const layoutSections = (layoutInfo.data as any)?.sections || [];
        const spots = parseSvgForClickableElements(layoutInfo.data.layoutSvg, layoutSections);
        setClickableSpots(spots);
        
        // Load spot statuses in parallel with SVG
        loadSpotStatuses(bookingData.parkingArea.id, true);
        
        // Load capacity sections from database
        await fetchCapacitySections(bookingData.parkingArea.id);
      } else {
        console.log('❌ No layout available for this area');
        setSvgContent('');
        setClickableSpots([]);
        setLayoutId(null);
      }
    } catch (error) {
      console.error('❌ Error loading SVG content:', error);
      setSvgContent('');
      setClickableSpots([]);
      setLayoutId(null);
    } finally {
      setIsLoadingSvg(false);
    }
  };

  // Fetch capacity sections from database (same as attendant)
  const fetchCapacitySections = async (areaId: number) => {
    if (!isAuthenticated) {
      console.log('🔐 Skipping fetchCapacitySections - user not authenticated');
      return;
    }
    try {
      console.log('🔄 Fetching capacity sections from database...');
      const response = await ApiService.getCapacityStatus(areaId);
      console.log('📊 Full capacity sections response:', response);
      
      if (response.success) {
        console.log('📊 All capacity sections received:', response.data);
        
        // Store every capacity section regardless of vehicle type so car sections show utilization
        setCapacitySections(response.data);
        console.log('📊 Setting capacitySections state with:', response.data.length, 'sections');
      } else {
        console.log('❌ Failed to fetch capacity sections:', (response as any).message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error fetching capacity sections:', error);
    }
  };

  // Get detailed section data for modal display
  const getDetailedSectionData = (sectionName: string) => {
    const sectionData = capacitySections.find(section => 
      section.sectionName.toLowerCase() === sectionName.toLowerCase()
    );
    
    if (!sectionData) return null;
    
    // Calculate detailed counts using the same formula as attendant dashboard
    const totalCapacity = sectionData.totalCapacity;
    const occupied = sectionData.parkedCount || 0;
    const available = sectionData.availableCapacity;
    const reserved = sectionData.reservedCount || 0;
    
    console.log('📊 Capacity Calculation (Attendant Formula):', {
      sectionName,
      totalCapacity,
      databaseOccupied: occupied,
      databaseAvailable: available,
      databaseReserved: reserved,
      formula: 'Using database values directly from getCapacityStatus API',
      apiResponse: sectionData
    });
    
    return {
      ...sectionData,
      reservedCount: reserved,
      occupiedCount: occupied,
      availableCount: available,
      totalSpots: totalCapacity,
      utilizationRate: ((totalCapacity - available) / totalCapacity) * 100
    };
  };

  // Load SVG when layout tab is activated - only fetch when area changes or content missing
  useEffect(() => {
    const currentAreaId = bookingData?.parkingArea?.id;

    if (activeTab !== 'layout' || !currentAreaId) {
      return;
    }

    const alreadyLoadedSameArea = lastLoadedLayoutAreaIdRef.current === currentAreaId;

    if (alreadyLoadedSameArea && svgContent) {
      console.log('🛑 Skipping layout reload - already loaded for area', currentAreaId);
      return;
    }

    if (isLayoutLoadingRef.current) {
      console.log('⏳ Layout load already in progress - skipping duplicate request');
      return;
    }

    isLayoutLoadingRef.current = true;

    (async () => {
      try {
        const shouldForceRefresh = !alreadyLoadedSameArea;
        await loadSvgContent(shouldForceRefresh);
        lastLoadedLayoutAreaIdRef.current = currentAreaId;
      } finally {
        isLayoutLoadingRef.current = false;
      }
    })();
  }, [activeTab, bookingData?.parkingArea?.id, isAuthenticated]);

  // Auto-center SVG when layout tab is activated and content is loaded
  useEffect(() => {
    console.log('🎯 Auto-center useEffect triggered:', {
      activeTab,
      hasSvgContent: !!svgContent,
      hasScrollViewRef: !!scrollViewRef.current,
      hasVerticalScrollViewRef: !!verticalScrollViewRef.current,
      svgDimensions: { width: svgDimensions.width, height: svgDimensions.height },
      clickableSpotsLength: clickableSpots.length,
      parkingAreaName: bookingData?.parkingArea?.name
    });
    
    if (
      activeTab === 'layout' &&
      svgContent &&
      scrollViewRef.current &&
      verticalScrollViewRef.current &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0 &&
      clickableSpots.length > 0
    ) {
      console.log('🎯 All conditions met - starting auto-centering');
      
      // Small delay to ensure content is fully rendered
      setTimeout(() => {
        console.log('🎯 Auto-center timeout triggered');
        
        const horizontalScrollView = scrollViewRef.current;
        const verticalScrollView = verticalScrollViewRef.current;
        
        if (horizontalScrollView && verticalScrollView) {
          console.log('🎯 Scroll views confirmed, using screen dimensions for viewport');
          
          // Use screen dimensions as viewport since ScrollView doesn't have measure method
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
          const horizontalViewport = screenWidth * 0.9; // Approximate viewport width
          const verticalViewport = screenHeight * 0.6; // Approximate viewport height
          
          console.log('🎯 Using screen dimensions as viewport:', { 
            horizontalViewport, 
            verticalViewport,
            screenWidth,
            screenHeight
          });
          
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
          
          console.log('🎯 SVG viewBox extracted:', { viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight });
          
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
          
          console.log('🎯 Rendering calculations:', {
            viewBoxAspectRatio,
            containerAspectRatio,
            renderedWidth,
            renderedHeight,
            scaleX,
            scaleY
          });
          
          // Find the bounds of all parking spots
          let minSpotX = Infinity, maxSpotX = -Infinity;
          let minSpotY = Infinity, maxSpotY = -Infinity;
          
          clickableSpots.forEach((spot, index) => {
            const spotXInViewBox = spot.x - viewBoxX;
            const spotYInViewBox = spot.y - viewBoxY;
            const renderedSpotX = spotXInViewBox * scaleX + offsetX;
            const renderedSpotY = spotYInViewBox * scaleY + offsetY;
            
            minSpotX = Math.min(minSpotX, renderedSpotX);
            maxSpotX = Math.max(maxSpotX, renderedSpotX);
            minSpotY = Math.min(minSpotY, renderedSpotY);
            maxSpotY = Math.max(maxSpotY, renderedSpotY);
            
            if (index < 3) { // Log first 3 spots for debugging
              console.log(`🎯 Spot ${index}:`, {
                original: { x: spot.x, y: spot.y },
                inViewBox: { x: spotXInViewBox, y: spotYInViewBox },
                rendered: { x: renderedSpotX, y: renderedSpotY }
              });
            }
          });
          
          // Calculate the center of the parking spots content
          const contentCenterX = (minSpotX + maxSpotX) / 2;
          const contentCenterY = (minSpotY + maxSpotY) / 2;
          
          // Calculate scroll positions to center the content
          const horizontalScrollTo = Math.max(0, contentCenterX - horizontalViewport / 2);
          const verticalScrollTo = Math.max(0, contentCenterY - verticalViewport / 2);
          
          console.log('🎯 ActiveParkingScreen - Final calculations:', {
            parkingArea: bookingData?.parkingArea?.name,
            spotBounds: { minX: minSpotX, maxX: maxSpotX, minY: minSpotY, maxY: maxSpotY },
            contentCenter: { x: contentCenterX, y: contentCenterY },
            viewport: { width: horizontalViewport, height: verticalViewport },
            scrollTo: { x: horizontalScrollTo, y: verticalScrollTo }
          });
          
          // Force scroll with multiple attempts to ensure it works
          try {
            console.log('🎯 Starting scroll attempts');
            
            // First attempt - immediate scroll
            horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
            verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
            console.log('🎯 First scroll attempt completed');
            
            // Second attempt - animated scroll after a short delay
            setTimeout(() => {
              console.log('🎯 Second scroll attempt');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 100);
            
            // Third attempt - ensure scroll position is set
            setTimeout(() => {
              console.log('🎯 Third scroll attempt');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 300);
          } catch (error) {
            console.error('❌ Error during ActiveParkingScreen auto-centering:', error);
          }
        } else {
          console.log('🎯 Scroll views not available');
        }
      }, 2000); // Increased delay to ensure everything is loaded
    } else {
      console.log('🎯 Conditions not met for auto-centering');
    }
  }, [
    activeTab,
    svgContent,
    svgDimensions,
    clickableSpots,
    bookingData?.parkingArea?.name
  ]);

  // Additional auto-centering trigger when SVG content finishes loading AND user is on layout tab
  useEffect(() => {
    console.log('🎯 SVG content load useEffect triggered:', {
      activeTab,
      hasSvgContent: !!svgContent,
      hasScrollViewRef: !!scrollViewRef.current,
      hasVerticalScrollViewRef: !!verticalScrollViewRef.current,
      svgDimensions: { width: svgDimensions.width, height: svgDimensions.height },
      clickableSpotsLength: clickableSpots.length,
      parkingAreaName: bookingData?.parkingArea?.name
    });
    
    if (
      activeTab === 'layout' &&
      svgContent &&
      scrollViewRef.current &&
      verticalScrollViewRef.current &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0 &&
      clickableSpots.length > 0
    ) {
      console.log('🎯 SVG content loaded AND user on layout tab - triggering auto-centering');
      
      // Small delay to ensure content is fully rendered
      setTimeout(() => {
        console.log('🎯 SVG content load timeout triggered');
        
        const horizontalScrollView = scrollViewRef.current;
        const verticalScrollView = verticalScrollViewRef.current;
        
        if (horizontalScrollView && verticalScrollView) {
          console.log('🎯 Scroll views confirmed (from SVG load), using screen dimensions for viewport');
          
          // Use screen dimensions as viewport since ScrollView doesn't have measure method
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
          const horizontalViewport = screenWidth * 0.9; // Approximate viewport width
          const verticalViewport = screenHeight * 0.6; // Approximate viewport height
          
          console.log('🎯 Using screen dimensions as viewport (from SVG load):', { 
            horizontalViewport, 
            verticalViewport,
            screenWidth,
            screenHeight
          });
          
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
          
          console.log('🎯 SVG viewBox extracted (from SVG load):', { viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight });
          
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
          
          console.log('🎯 Rendering calculations (from SVG load):', {
            viewBoxAspectRatio,
            containerAspectRatio,
            renderedWidth,
            renderedHeight,
            scaleX,
            scaleY
          });
          
          // Find the bounds of all parking spots
          let minSpotX = Infinity, maxSpotX = -Infinity;
          let minSpotY = Infinity, maxSpotY = -Infinity;
          
          clickableSpots.forEach((spot, index) => {
            const spotXInViewBox = spot.x - viewBoxX;
            const spotYInViewBox = spot.y - viewBoxY;
            const renderedSpotX = spotXInViewBox * scaleX + offsetX;
            const renderedSpotY = spotYInViewBox * scaleY + offsetY;
            
            minSpotX = Math.min(minSpotX, renderedSpotX);
            maxSpotX = Math.max(maxSpotX, renderedSpotX);
            minSpotY = Math.min(minSpotY, renderedSpotY);
            maxSpotY = Math.max(maxSpotY, renderedSpotY);
            
            if (index < 3) { // Log first 3 spots for debugging
              console.log(`🎯 Spot ${index} (from SVG load):`, {
                original: { x: spot.x, y: spot.y },
                inViewBox: { x: spotXInViewBox, y: spotYInViewBox },
                rendered: { x: renderedSpotX, y: renderedSpotY }
              });
            }
          });
          
          // Calculate the center of the parking spots content
          const contentCenterX = (minSpotX + maxSpotX) / 2;
          const contentCenterY = (minSpotY + maxSpotY) / 2;
          
          // Calculate scroll positions to center the content
          const horizontalScrollTo = Math.max(0, contentCenterX - horizontalViewport / 2);
          const verticalScrollTo = Math.max(0, contentCenterY - verticalViewport / 2);
          
          console.log('🎯 ActiveParkingScreen - Final calculations (from SVG load):', {
            parkingArea: bookingData?.parkingArea?.name,
            spotBounds: { minX: minSpotX, maxX: maxSpotX, minY: minSpotY, maxY: maxSpotY },
            contentCenter: { x: contentCenterX, y: contentCenterY },
            viewport: { width: horizontalViewport, height: verticalViewport },
            scrollTo: { x: horizontalScrollTo, y: verticalScrollTo }
          });
          
          // Force scroll with multiple attempts to ensure it works
          try {
            console.log('🎯 Starting scroll attempts (from SVG load)');
            
            // First attempt - immediate scroll
            horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
            verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
            console.log('🎯 First scroll attempt completed (from SVG load)');
            
            // Second attempt - animated scroll after a short delay
            setTimeout(() => {
              console.log('🎯 Second scroll attempt (from SVG load)');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 100);
            
            // Third attempt - ensure scroll position is set
            setTimeout(() => {
              console.log('🎯 Third scroll attempt (from SVG load)');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 300);
          } catch (error) {
            console.error('❌ Error during ActiveParkingScreen auto-centering (from SVG load):', error);
          }
        } else {
          console.log('🎯 Scroll views not available (from SVG load)');
        }
      }, 800); // Increased delay to ensure tab switch and content loading are complete
    } else {
      console.log('🎯 SVG content loaded but conditions not met for auto-centering:', {
        activeTab,
        hasSvgContent: !!svgContent,
        hasScrollViewRef: !!scrollViewRef.current,
        hasVerticalScrollViewRef: !!verticalScrollViewRef.current,
        svgDimensionsValid: svgDimensions.width > 0 && svgDimensions.height > 0,
        hasClickableSpots: clickableSpots.length > 0
      });
    }
  }, [
    svgContent,
    clickableSpots,
    activeTab, // This ensures it triggers when activeTab changes to 'layout' after content is loaded
    svgDimensions,
    bookingData?.parkingArea?.name
  ]);

  // Additional auto-centering trigger when ScrollView refs become available
  useEffect(() => {
    console.log('🎯 ScrollView refs useEffect triggered:', {
      activeTab,
      hasSvgContent: !!svgContent,
      hasScrollViewRef: !!scrollViewRef.current,
      hasVerticalScrollViewRef: !!verticalScrollViewRef.current,
      svgDimensions: { width: svgDimensions.width, height: svgDimensions.height },
      clickableSpotsLength: clickableSpots.length,
      parkingAreaName: bookingData?.parkingArea?.name
    });
    
    if (
      activeTab === 'layout' &&
      svgContent &&
      scrollViewRef.current &&
      verticalScrollViewRef.current &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0 &&
      clickableSpots.length > 0
    ) {
      console.log('🎯 ScrollView refs available AND all conditions met - triggering auto-centering');
      
      // Small delay to ensure everything is fully rendered
      setTimeout(() => {
        console.log('🎯 ScrollView refs timeout triggered');
        
        const horizontalScrollView = scrollViewRef.current;
        const verticalScrollView = verticalScrollViewRef.current;
        
        if (horizontalScrollView && verticalScrollView) {
          console.log('🎯 Scroll views confirmed (from refs), using screen dimensions for viewport');
          
          // Use screen dimensions as viewport since ScrollView doesn't have measure method
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
          const horizontalViewport = screenWidth * 0.9; // Approximate viewport width
          const verticalViewport = screenHeight * 0.6; // Approximate viewport height
          
          console.log('🎯 Using screen dimensions as viewport (from refs):', { 
            horizontalViewport, 
            verticalViewport,
            screenWidth,
            screenHeight
          });
          
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
          
          console.log('🎯 SVG viewBox extracted (from refs):', { viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight });
          
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
          
          console.log('🎯 Rendering calculations (from refs):', {
            viewBoxAspectRatio,
            containerAspectRatio,
            renderedWidth,
            renderedHeight,
            scaleX,
            scaleY
          });
          
          // Find the bounds of all parking spots
          let minSpotX = Infinity, maxSpotX = -Infinity;
          let minSpotY = Infinity, maxSpotY = -Infinity;
          
          clickableSpots.forEach((spot, index) => {
            const spotXInViewBox = spot.x - viewBoxX;
            const spotYInViewBox = spot.y - viewBoxY;
            const renderedSpotX = spotXInViewBox * scaleX + offsetX;
            const renderedSpotY = spotYInViewBox * scaleY + offsetY;
            
            minSpotX = Math.min(minSpotX, renderedSpotX);
            maxSpotX = Math.max(maxSpotX, renderedSpotX);
            minSpotY = Math.min(minSpotY, renderedSpotY);
            maxSpotY = Math.max(maxSpotY, renderedSpotY);
            
            if (index < 3) { // Log first 3 spots for debugging
              console.log(`🎯 Spot ${index} (from refs):`, {
                original: { x: spot.x, y: spot.y },
                inViewBox: { x: spotXInViewBox, y: spotYInViewBox },
                rendered: { x: renderedSpotX, y: renderedSpotY }
              });
            }
          });
          
          // Calculate the center of the parking spots content
          const contentCenterX = (minSpotX + maxSpotX) / 2;
          const contentCenterY = (minSpotY + maxSpotY) / 2;
          
          // Calculate scroll positions to center the content
          const horizontalScrollTo = Math.max(0, contentCenterX - horizontalViewport / 2);
          const verticalScrollTo = Math.max(0, contentCenterY - verticalViewport / 2);
          
          console.log('🎯 ActiveParkingScreen - Final calculations (from refs):', {
            parkingArea: bookingData?.parkingArea?.name,
            spotBounds: { minX: minSpotX, maxX: maxSpotX, minY: minSpotY, maxY: maxSpotY },
            contentCenter: { x: contentCenterX, y: contentCenterY },
            viewport: { width: horizontalViewport, height: verticalViewport },
            scrollTo: { x: horizontalScrollTo, y: verticalScrollTo }
          });
          
          // Force scroll with multiple attempts to ensure it works
          try {
            console.log('🎯 Starting scroll attempts (from refs)');
            
            // First attempt - immediate scroll
            horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
            verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
            console.log('🎯 First scroll attempt completed (from refs)');
            
            // Second attempt - animated scroll after a short delay
            setTimeout(() => {
              console.log('🎯 Second scroll attempt (from refs)');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 100);
            
            // Third attempt - ensure scroll position is set
            setTimeout(() => {
              console.log('🎯 Third scroll attempt (from refs)');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 300);
          } catch (error) {
            console.error('❌ Error during ActiveParkingScreen auto-centering (from refs):', error);
          }
        } else {
          console.log('🎯 Scroll views not available (from refs)');
        }
      }, 300); // Shorter delay since refs are available
    } else {
      console.log('🎯 ScrollView refs available but conditions not met for auto-centering:', {
        activeTab,
        hasSvgContent: !!svgContent,
        hasScrollViewRef: !!scrollViewRef.current,
        hasVerticalScrollViewRef: !!verticalScrollViewRef.current,
        svgDimensionsValid: svgDimensions.width > 0 && svgDimensions.height > 0,
        hasClickableSpots: clickableSpots.length > 0
      });
    }
  }, [
    // Watch for changes in refs by using a trick - we watch the length of clickableSpots
    // and activeTab to trigger this effect when refs become available
    clickableSpots.length,
    activeTab,
    svgContent,
    svgDimensions,
    bookingData?.parkingArea?.name
  ]);

  // Final fallback useEffect - continuously check for refs availability
  useEffect(() => {
    if (
      activeTab === 'layout' &&
      svgContent &&
      clickableSpots.length > 0 &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0
    ) {
      // Set up an interval to check for refs availability
      let intervalId: ReturnType<typeof setInterval> | null = null;
      
      const checkRefs = () => {
        if (scrollViewRef.current && verticalScrollViewRef.current) {
          console.log('🎯 Final fallback - refs are now available, triggering auto-centering');
          
          const horizontalScrollView = scrollViewRef.current;
          const verticalScrollView = verticalScrollViewRef.current;
          
          // Use screen dimensions as viewport since ScrollView doesn't have measure method
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
          const horizontalViewport = screenWidth * 0.9; // Approximate viewport width
          const verticalViewport = screenHeight * 0.6; // Approximate viewport height
          
          console.log('🎯 Final fallback - using screen dimensions as viewport:', { 
            horizontalViewport, 
            verticalViewport,
            screenWidth,
            screenHeight
          });
          
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
          
          console.log('🎯 Final fallback - SVG viewBox extracted:', { viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight });
          
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
          
          console.log('🎯 Final fallback - Rendering calculations:', {
            viewBoxAspectRatio,
            containerAspectRatio,
            renderedWidth,
            renderedHeight,
            scaleX,
            scaleY
          });
          
          // Find the bounds of all parking spots
          let minSpotX = Infinity, maxSpotX = -Infinity;
          let minSpotY = Infinity, maxSpotY = -Infinity;
          
          clickableSpots.forEach((spot, index) => {
            const spotXInViewBox = spot.x - viewBoxX;
            const spotYInViewBox = spot.y - viewBoxY;
            const renderedSpotX = spotXInViewBox * scaleX + offsetX;
            const renderedSpotY = spotYInViewBox * scaleY + offsetY;
            
            minSpotX = Math.min(minSpotX, renderedSpotX);
            maxSpotX = Math.max(maxSpotX, renderedSpotX);
            minSpotY = Math.min(minSpotY, renderedSpotY);
            maxSpotY = Math.max(maxSpotY, renderedSpotY);
            
            if (index < 3) { // Log first 3 spots for debugging
              console.log(`🎯 Final fallback - Spot ${index}:`, {
                original: { x: spot.x, y: spot.y },
                inViewBox: { x: spotXInViewBox, y: spotYInViewBox },
                rendered: { x: renderedSpotX, y: renderedSpotY }
              });
            }
          });
          
          // Calculate the center of the parking spots content
          const contentCenterX = (minSpotX + maxSpotX) / 2;
          const contentCenterY = (minSpotY + maxSpotY) / 2;
          
          // Calculate scroll positions to center the content
          const horizontalScrollTo = Math.max(0, contentCenterX - horizontalViewport / 2);
          const verticalScrollTo = Math.max(0, contentCenterY - verticalViewport / 2);
          
          console.log('🎯 Final fallback - Final calculations:', {
            parkingArea: bookingData?.parkingArea?.name,
            spotBounds: { minX: minSpotX, maxX: maxSpotX, minY: minSpotY, maxY: maxSpotY },
            contentCenter: { x: contentCenterX, y: contentCenterY },
            viewport: { width: horizontalViewport, height: verticalViewport },
            scrollTo: { x: horizontalScrollTo, y: verticalScrollTo }
          });
          
          // Force scroll with multiple attempts to ensure it works
          try {
            console.log('🎯 Final fallback - Starting scroll attempts');
            
            // First attempt - immediate scroll
            horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
            verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
            console.log('🎯 Final fallback - First scroll attempt completed');
            
            // Second attempt - animated scroll after a short delay
            setTimeout(() => {
              console.log('🎯 Final fallback - Second scroll attempt');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 100);
            
            // Third attempt - ensure scroll position is set
            setTimeout(() => {
              console.log('🎯 Final fallback - Third scroll attempt');
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
            }, 300);
          } catch (error) {
            console.error('❌ Error during final fallback auto-centering:', error);
          }
          
          // Clear the interval once we've successfully centered
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };
      
      // Start checking immediately and then every 100ms
      checkRefs();
      intervalId = setInterval(checkRefs, 100);
      
      // Clean up interval after 5 seconds max
      const timeoutId = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 5000);
      
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [
    activeTab,
    svgContent,
    clickableSpots.length,
    svgDimensions,
    bookingData?.parkingArea?.name
  ]);

  // Realtime socket is the primary update channel for spot/capacity data.
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔐 User not authenticated - skipping realtime spot sync');
      return;
    }

    if (activeTab !== 'layout' || !bookingData?.parkingArea?.id) {
      return;
    }

    const runInitialRealtimeSync = async () => {
      try {
        await loadSpotStatuses(bookingData.parkingArea.id);
        await fetchCapacitySections(bookingData.parkingArea.id);
      } catch (error) {
        console.error('❌ Initial realtime sync failed:', error);
      }
    };

    runInitialRealtimeSync();

    return undefined;
  }, [activeTab, bookingData?.parkingArea?.id]);

  // Debug capacity sections state changes
  useEffect(() => {
    console.log('🔄 capacitySections state updated:', capacitySections);
    console.log('🔄 capacitySections length:', capacitySections.length);
    capacitySections.forEach((section, index) => {
      console.log(`🔄 Section ${index + 1}:`, {
        sectionName: section.sectionName,
        vehicleType: section.vehicleType,
        totalCapacity: section.totalCapacity,
        availableCapacity: section.availableCapacity,
        parkedCount: section.parkedCount,
        reservedCount: section.reservedCount
      });
    });
  }, [capacitySections]);

  // Force hide loading overlay when screen mounts to prevent touch blocking
  useEffect(() => {
    console.log('🎯 ActiveParkingScreen: Mounting, force hiding loading overlay...');
    hideLoading();
    
    // Force hide all modals to prevent covering the layout
    setShowSpotModal(false);
    setShowTestModal(false);
    setShowParkingEndModal(false);
    
    // Also hide loading after a short delay in case of race conditions
    const timer = setTimeout(() => {
      hideLoading();
      setShowSpotModal(false);
      setShowTestModal(false);
      setShowParkingEndModal(false);
      console.log('🎯 ActiveParkingScreen: Force hide loading and modals after delay');
    }, 500);
    
    return () => clearTimeout(timer);
  }, [hideLoading]);

  // Center the parking layout content when it loads - DIFFERENT CENTERING FOR EACH AREA - NESTED SCROLLVIEWS
  useEffect(() => {
    if (scrollViewRef.current && verticalScrollViewRef.current && svgDimensions.width > 0 && svgDimensions.height > 0) {
      const horizontalScrollView = scrollViewRef.current;
      const verticalScrollView = verticalScrollViewRef.current;
      
      // Get actual ScrollView dimensions
      const scrollViewLayout = {
        width: screenWidth - 20, // Minimize padding to fill maroon border
        height: Math.max(500, Dimensions.get('window').height * 0.5) // Use 50% of screen height
      };
      
      // Calculate content dimensions with scale
      const contentWidth = svgDimensions.width * scale + 10; // No zoom needed
      const contentHeight = svgDimensions.height * scale + 10; // No zoom needed
      
      // DETECT PARKING AREA TYPE for different centering
      const parkingAreaName = bookingData?.parkingArea?.name || '';
      const isFPAArea = parkingAreaName.toLowerCase().includes('fpa');
      const isFUArea = parkingAreaName.toLowerCase().includes('fu');
      
      let offsetX, offsetY;
      
      if (isFPAArea) {
        // FPA: Center the layout (smaller, needs centering)
        offsetX = Math.max(0, (contentWidth - scrollViewLayout.width) / 2);
        offsetY = Math.max(0, (contentHeight - scrollViewLayout.height) / 2);
        console.log('🎯 FPA AREA - Centered positioning');
      } else {
        // FU Main or others: Start from top-left (larger, needs to show parking area)
        offsetX = 0; // Start from left to show parking area
        offsetY = 0; // Start from top to show parking area
        console.log('🎯 FU MAIN AREA - Top-left positioning');
      }
      
      // Scroll both nested ScrollViews to appropriate position
      setTimeout(() => {
        horizontalScrollView.scrollTo({ x: offsetX, y: 0, animated: false });
        verticalScrollView.scrollTo({ x: 0, y: offsetY, animated: false });
        console.log('🎯 PARKING AREA POSITIONING - NESTED SCROLLVIEWS:', { 
          offsetX, 
          offsetY, 
          contentWidth, 
          contentHeight,
          scrollViewWidth: scrollViewLayout.width,
          scrollViewHeight: scrollViewLayout.height,
          screenWidth,
          screenHeight: Dimensions.get('window').height,
          scale,
          parkingAreaName,
          areaType: isFPAArea ? 'FPA' : isFUArea ? 'FU Main' : 'Other'
        });
      }, 100); // Faster positioning
    }
  }, [svgDimensions, scale, screenWidth, bookingData?.parkingArea?.name]);

  // Handle layout tap - smart centering on parking spot content
  const handleLayoutTap = () => {
    console.log('🎯 Layout tapped - checking conditions');
    console.log('🎯 Debug refs:', {
      scrollViewRef: !!scrollViewRef.current,
      verticalScrollViewRef: !!verticalScrollViewRef.current,
      svgContent: !!svgContent,
      svgDimensions: { width: svgDimensions.width, height: svgDimensions.height },
      clickableSpotsLength: clickableSpots.length
    });
    
    if (
      svgContent &&
      scrollViewRef.current &&
      verticalScrollViewRef.current &&
      svgDimensions.width > 0 &&
      svgDimensions.height > 0 &&
      clickableSpots.length > 0
    ) {
      console.log('🎯 Layout tapped - centering on parking spot content');
      
      const horizontalScrollView = scrollViewRef.current;
      const verticalScrollView = verticalScrollViewRef.current;
      
      console.log('🎯 Scroll views found:', {
        horizontal: !!horizontalScrollView,
        vertical: !!verticalScrollView
      });
      
      if (horizontalScrollView && verticalScrollView) {
        // Get the actual scroll view dimensions
        horizontalScrollView.measure((fx: any, fy: any, hWidth: any, hHeight: any, hPx: any, hPy: any) => {
          console.log('🎯 Horizontal scroll view measured:', { hWidth, hHeight });
          
          verticalScrollView.measure((vfx: any, vfy: any, vWidth: any, vHeight: any, vPx: any, vPy: any) => {
            console.log('🎯 Vertical scroll view measured:', { vWidth, vHeight });
            
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
            
            console.log('🎯 ActiveParkingScreen - Smart centering on parking spots:', {
              parkingArea: bookingData?.parkingArea?.name,
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
              console.log('🎯 Attempting to scroll to:', { horizontalScrollTo, verticalScrollTo });
              
              // First attempt - immediate scroll
              horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: false });
              verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: false });
              
              // Second attempt - animated scroll after a short delay
              setTimeout(() => {
                console.log('🎯 Second scroll attempt');
                horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
                verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
              }, 100);
              
              // Third attempt - ensure scroll position is set
              setTimeout(() => {
                console.log('🎯 Third scroll attempt');
                horizontalScrollView.scrollTo({ x: horizontalScrollTo, y: 0, animated: true });
                verticalScrollView.scrollTo({ x: 0, y: verticalScrollTo, animated: true });
              }, 300);
            } catch (error) {
              console.error('❌ Error during ActiveParkingScreen smart centering:', error);
            }
          });
        });
      }
    } else {
      console.log('🎯 Layout tap - conditions not met');
    }
  };

  // Fetch booking data when component mounts
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        console.log('🎯 ActiveParkingScreen: Starting fetchBookingData...');
        setIsBookingLoading(true);
        setBookingError(null);
        
        // Get reservation ID from params (passed from HomeScreen/Favorites/History)
        const reservationId =
          params.capacityReservationId ||
          params.reservationId ||
          params.sessionId;
        console.log('🎯 ActiveParkingScreen: Reservation ID from params (any source):', reservationId);
        
        let targetReservationId: number | null = null;
        
        if (reservationId) {
          // Use reservation ID from params
          targetReservationId = Number(reservationId);
          console.log('🎯 ActiveParkingScreen: Using reservation ID from params:', targetReservationId);
        } else {
          // No params, try to find active booking
          console.log('🎯 ActiveParkingScreen: No params, checking for active bookings...');
          const bookingsResponse = await ApiService.getMyBookings();
          if (bookingsResponse.success && bookingsResponse.data.bookings.length > 0) {
            const activeReservation = bookingsResponse.data.bookings.find(
              (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
            );
            
            if (activeReservation) {
              targetReservationId = activeReservation.reservationId;
              console.log('🎯 ActiveParkingScreen: Found active reservation:', targetReservationId);
            }
          }
        }
        
        // If we have a reservation ID, fetch full booking details (includes qrKey)
        if (targetReservationId) {
          console.log('🎯 ActiveParkingScreen: Fetching booking details for:', targetReservationId);
          const response = await ApiService.getBookingDetails(targetReservationId);
          if (response.success && response.data) {
            console.log('🎯 ActiveParkingScreen: Successfully fetched booking details');
            console.log('🎯 ActiveParkingScreen: Raw bookingStatus:', response.data.bookingStatus);
            console.log('🎯 ActiveParkingScreen: Full response data:', JSON.stringify(response.data, null, 2));
            
            // Update booking data with fresh data (includes qrKey)
            setBookingData(response.data);
            
            // Grace warning should show on every Active Parking open while still reserved.
            maybeShowGracePeriodWarning(response.data);
            
            // Update timer state if booking is active
            if (response.data.bookingStatus === 'active' && response.data.timestamps?.startTime) {
              const startTime = new Date(response.data.timestamps.startTime).getTime();
              parkingStartTime.current = startTime;
              
              // Check if timer was already running before updating state
              const wasTimerRunning = isTimerRunningRef.current;
              
              setIsTimerRunning(true);
              const calculatedElapsed = Math.floor((Date.now() - startTime) / 1000);
              setElapsedTime(calculatedElapsed);
              setQrScanned(true);
              
              // Fetch balance when active session is detected
              fetchUserBalance();
              
              // Only switch to time tab if timer wasn't running before (first time starting) AND this is not initial mount
              if (!wasTimerRunning && !isInitialMountRef.current) {
                console.log('🎯 ActiveParkingScreen: fetchBookingData - Switching to TIME tab (timer was not running)');
                setActiveTab('time'); // Go to Parking Time when attendant starts session
              } else if (wasTimerRunning && !isInitialMountRef.current) {
                console.log('🎯 ActiveParkingScreen: fetchBookingData - User returned to active session, staying on TICKET tab');
                setActiveTab('ticket'); // Stay on Parking Ticket when user returns to active session
              } else {
                console.log('🎯 ActiveParkingScreen: fetchBookingData - NOT switching to time tab (timer already running or initial mount)');
              }
              console.log('🎯 ActiveParkingScreen: Booking is active, timer started');
            } else if (response.data.bookingStatus === 'reserved') {
              // Booking is reserved but not active yet
              setIsTimerRunning(false);
              setElapsedTime(0);
              setQrScanned(false);
              console.log('🎯 ActiveParkingScreen: Booking is reserved, waiting for attendant');
            } else {
              // Booking is completed or cancelled
              console.log('🎯 ActiveParkingScreen: Booking is completed/cancelled:', response.data.bookingStatus);
              console.log('🎯 ActiveParkingScreen: Clearing booking data and setting error');
              setBookingData(null);
              setBookingError('This booking has been completed or cancelled.');
            }
          } else {
            console.log('🎯 ActiveParkingScreen: No booking details found');
            setBookingData(null);
            setBookingError('Booking details not found. The booking may have expired.');
          }
        } else {
          console.log('🎯 ActiveParkingScreen: No reservation ID found');
          setBookingData(null);
          setBookingError(null); // Don't show error for no active booking - this is normal state
        }
      } catch (error) {
        if (isBookingNotOwnedError(error)) {
          // Stale reservation ID from previous account/session. Treat as no active booking.
          resetBookingState();
          setBookingError(null);
        } else {
          console.error('🎯 ActiveParkingScreen: Error fetching booking data:', error);
          setBookingData(null);
          setBookingError('Failed to load booking data. Please try again.');
        }
      } finally {
        setIsBookingLoading(false);
      }
    };

    fetchBookingData();
  }, [params.capacityReservationId, params.reservationId, params.sessionId]); // Removed router dependency

  // Balance-based timer animation - updates every second for smooth animation
  useEffect(() => {
    console.log('🎯 Timer useEffect - userBalance:', userBalance, 'type:', typeof userBalance);
    
    if (isTimerRunning && parkingStartTime.current !== null && totalParkingTime > 0) {
      // Additional safety check for userBalance
      if (!userBalance || typeof userBalance !== 'number' || userBalance <= 0) {
        console.log('🎯 Timer stopped - userBalance is invalid:', userBalance);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }
      
      // Initialize progress based on elapsed time
      const currentElapsed = Math.floor((Date.now() - parkingStartTime.current!) / 1000);
      setElapsedTime(currentElapsed);
      
      // Calculate remaining time (in seconds) and balance (in hours)
      const remainingTime = Math.max(0, totalParkingTime - currentElapsed);
      const remainingHours = remainingTime / 3600; // Convert seconds to hours
      setRemainingBalance(remainingHours);
      
      // Update animation every second for smooth visual feedback
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - parkingStartTime.current!) / 1000);
        setElapsedTime(elapsed);
        
        // Calculate remaining time and balance
        const remaining = Math.max(0, totalParkingTime - elapsed);
        const remainingHrs = remaining / 3600; // Convert to hours
        setRemainingBalance(remainingHrs);
        
        // Log every 30 seconds to avoid spam - show real balance values
        if (elapsed % 30 === 0) {
          const remainingBalanceStr = remainingHrs.toFixed ? remainingHrs.toFixed(2) : '0.00';
          const userBalanceStr = userBalance && userBalance.toFixed ? userBalance.toFixed(2) : '0.00';
          console.log('🎯 Timer update - Duration:', formatTime(elapsed), 'Remaining Balance:', remainingBalanceStr, 'hours (from', userBalanceStr, 'hours)');
        }
      }, 1000); // Update every second for visible animation
      
      intervalRef.current = interval;
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isTimerRunning, parkingStartTime.current, totalParkingTime, userBalance]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check for pending reservation expiration modal
      checkPendingReservationExpiration();
      
      const refreshBookingData = async () => {
        try {
          // Get reservation ID from params (passed from any booking surface)
          const reservationId =
            params.capacityReservationId ||
            params.reservationId ||
            params.sessionId;
          
          let targetReservationId: number | null = null;
          
          if (reservationId) {
            // Use reservation ID from params
            targetReservationId = Number(reservationId);
          } else {
            // No params, try to find active booking
            const bookingsResponse = await ApiService.getMyBookings();
            if (bookingsResponse.success && bookingsResponse.data.bookings.length > 0) {
              const activeReservation = bookingsResponse.data.bookings.find(
                (booking: any) => booking.bookingStatus === 'active' || booking.bookingStatus === 'reserved'
              );
              
              if (activeReservation) {
                targetReservationId = activeReservation.reservationId;
              }
            }
          }
          
          // If we have a reservation ID, fetch full booking details (includes qrKey)
          if (targetReservationId) {
            const response = await ApiService.getBookingDetails(targetReservationId);
            if (response.success && response.data) {
              // Update booking data with fresh data (includes qrKey)
              setBookingData(response.data);
              
              // Update timer state if booking is active
              if (response.data.bookingStatus === 'active' && response.data.timestamps?.startTime) {
                const startTime = new Date(response.data.timestamps.startTime).getTime();
                parkingStartTime.current = startTime;
                
                // Check if timer was already running before updating state
                const wasTimerRunning = isTimerRunningRef.current;
                
                setIsTimerRunning(true);
                const calculatedElapsed = Math.floor((Date.now() - startTime) / 1000);
                setElapsedTime(calculatedElapsed);
                setQrScanned(true);
                
                // Fetch balance when active session is detected
                fetchUserBalance();
                
                // Only switch to time tab if timer wasn't running before (first time starting) AND this is not initial mount
                if (!wasTimerRunning && !isInitialMountRef.current) {
                  console.log('🎯 ActiveParkingScreen: useFocusEffect - Switching to TIME tab (timer was not running)');
                  setActiveTab('time'); // Go to Parking Time when attendant starts session
                } else if (wasTimerRunning && !isInitialMountRef.current) {
                  console.log('🎯 ActiveParkingScreen: useFocusEffect - User returned to active session, staying on TICKET tab');
                  setActiveTab('ticket'); // Stay on Parking Ticket when user returns to active session
                } else {
                  console.log('🎯 ActiveParkingScreen: useFocusEffect - NOT switching to time tab (timer already running or initial mount)');
                }
              } else if (response.data.bookingStatus === 'reserved') {
                // Booking is reserved but not active yet
                setIsTimerRunning(false);
                setElapsedTime(0);
                setQrScanned(false);
                maybeShowGracePeriodWarning(response.data);
              } else {
                // Booking is completed or cancelled
                setBookingData(null);
                setIsTimerRunning(false);
                setElapsedTime(0);
                setParkingEndTime(null);
                setQrScanned(false);
                parkingStartTime.current = null;
              }
            }
          } else if (bookingData?.reservationId) {
            // Fallback: if we have booking data but couldn't find it, try to refresh it
            const response = await ApiService.getBookingDetails(bookingData.reservationId);
            if (response.success && response.data) {
              setBookingData(response.data);
            }
          }
        } catch (error) {
          if (isBookingNotOwnedError(error)) {
            resetBookingState();
            setBookingError(null);
          } else {
            console.error('Error refreshing booking data:', error);
          }
        }
      };
      
      refreshBookingData();
    }, [params.capacityReservationId, params.reservationId, params.sessionId])
  );

  // Real-time polling to sync with attendant actions
  useEffect(() => {
    // Don't poll if user is not authenticated
    if (!isAuthenticated) {
      console.log('🔐 User not authenticated - skipping reservation polling');
      return;
    }

    if (!bookingData?.reservationId) return;

    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const pollReservationStatus = async () => {
      // Double-check authentication before each poll
      if (!isAuthenticated) {
        console.log('🔐 User logged out during polling - stopping');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        return;
      }

      try {
        console.log('🔄 Polling reservation status for real-time sync...');
        const response = await ApiService.getBookingDetails(bookingData.reservationId);
        if (!response.success || !response.data) {
          console.log('⚠️ Polling response failed or empty');
          return;
        }

        const latestBookingData = response.data as unknown as BookingDetails;
        console.log('📊 Current booking status from poll:', latestBookingData.bookingStatus);

        // Check if reservation has expired (booking_status = 'invalid')
        if (latestBookingData.bookingStatus === 'invalid') {
          console.log('❌ Reservation has expired - getting billing details and showing expiration modal');

          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }

          if (hasShownExpirationModal && lastExpiredReservationId === latestBookingData.reservationId) {
            console.log('⚠️ Expiration modal already shown for this reservation - skipping duplicate request');
            return;
          }

          setHasShownExpirationModal(true);
          setLastExpiredReservationId(latestBookingData.reservationId || null);
          setIsTimerRunning(false);
          setElapsedTime(0);
          setQrScanned(false);
          parkingStartTime.current = null;

          const baseDetails = {
            reservationId: latestBookingData.reservationId,
            spotNumber: latestBookingData.parkingSlot?.spotNumber || 'Unknown Spot',
            areaName: latestBookingData.parkingArea?.name || 'Unknown Area',
            userName: latestBookingData.user?.name || 'User'
          };

          try {
            console.log('🔍 Frontend: Calling billing API with includeBilling=true');
            const billingResponse = await ApiService.getBookingDetails(latestBookingData.reservationId, true);
            console.log('🔍 Frontend: Billing API response:', billingResponse.success ? 'success' : 'failed');

            if (billingResponse.success && billingResponse.data?.billingBreakdown) {
              console.log('💰 Got billing breakdown for expired reservation');
              await handoffExpirationDetailsToHome({
                ...baseDetails,
                billingBreakdown: billingResponse.data.billingBreakdown
              });
            } else {
              console.log('⚠️ No billing breakdown available, handing off without billing');
              await handoffExpirationDetailsToHome(baseDetails);
            }
          } catch (error) {
            console.error('❌ Error getting billing details:', error);
            await handoffExpirationDetailsToHome(baseDetails);
          }

          setBookingData(null);
          router.replace('/screens/HomeScreen');
          return;
        }

        // Keep local state in sync for non-expired records
        setBookingData(latestBookingData as any);

        // If attendant started session and our timer isn't running
        if (latestBookingData.bookingStatus === 'active' && !isTimerRunningRef.current && latestBookingData.timestamps?.startTime) {
          console.log('🟢 Attendant started session - syncing timer');
          const currentTime = Date.now();
          parkingStartTime.current = currentTime;
          setIsTimerRunning(true);
          setElapsedTime(0);
          setQrScanned(true);
          setActiveTab('time'); // Go to Parking Time when attendant starts session
          // Fetch user balance when session starts
          fetchUserBalance();
          console.log(`⏱️ Timer started from 0 at ${new Date(currentTime).toISOString()}, switched to time tab`);
        } else {
          console.log('🔍 Polling debug - bookingStatus:', latestBookingData.bookingStatus, 'isTimerRunningRef.current:', isTimerRunningRef.current, 'hasStartTime:', !!latestBookingData.timestamps?.startTime);
        }
        // If session is already active and timer is running, don't switch tabs - let user stay on their preferred tab
        // If session is already active and timer is running, don't switch tabs - let user stay on their preferred tab
        // This allows user to navigate away and come back to their last selected tab

        // If attendant ended the session and our timer is still running
        if (latestBookingData.bookingStatus === 'completed' && isTimerRunning) {
          console.log('🔴 Attendant ended session - stopping timer and polling');
          setIsTimerRunning(false);
          setParkingEndTime(Date.now());
          
          // Stop polling to prevent multiple modal triggers
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          
          try {
            const endDetailsResponse = await ApiService.getBookingDetails(latestBookingData.reservationId);
            if (endDetailsResponse.success) {
              const details = endDetailsResponse.data as unknown as BookingDetails;

              const startTime = details.timestamps?.startTime ? new Date(details.timestamps.startTime) : new Date();
              const endTime = details.timestamps?.endTime ? new Date(details.timestamps.endTime) : new Date();
              const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
              const durationHours = durationMinutes / 60;

              const balanceResponse = await ApiService.getUserHourBalance();
              const balanceHours = balanceResponse.success ? balanceResponse.data.total_hours_remaining : 0;

              const penaltyInfo = details.penaltyInfo || null;
              const hasPenalty = penaltyInfo?.hasPenalty || false;
              const penaltyHours = penaltyInfo?.penaltyHours || 0;

              setParkingEndDetails({
                durationMinutes,
                durationHours,
                chargeHours: durationHours,
                balanceHours,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                areaName: details.parkingArea?.name || 'Unknown',
                spotNumber: details.parkingSlot?.spotNumber || 'Unknown',
                hasPenalty,
                penaltyHours
              });
              setShowParkingEndModal(true);

              if (hasPenalty && penaltyHours > 0) {
                const penaltyHoursFormatted = Math.floor(penaltyHours);
                const penaltyMinutesFormatted = Math.round((penaltyHours - penaltyHoursFormatted) * 60);
                Alert.alert(
                  'Penalty Notice',
                  `You exceeded your remaining balance by ${penaltyHoursFormatted} hour${penaltyHoursFormatted !== 1 ? 's' : ''} ${penaltyMinutesFormatted} minute${penaltyMinutesFormatted !== 1 ? 's' : ''}. This penalty will be deducted from your next subscription plan.`,
                  [{ text: 'OK', style: 'default' }]
                );
              }
            }
          } catch (error) {
            console.error('Error fetching parking end details:', error);

            const startTime = bookingData.timestamps?.startTime ? new Date(bookingData.timestamps.startTime) : new Date();
            const endTime = new Date();
            const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            const durationHours = durationMinutes / 60;

            setParkingEndDetails({
              durationMinutes,
              durationHours,
              chargeHours: durationHours,
              balanceHours: 0,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              areaName: bookingData.parkingArea?.name || 'Unknown',
              spotNumber: bookingData.parkingSlot?.spotNumber || 'Unknown',
              hasPenalty: false,
              penaltyHours: 0
            });
            setShowParkingEndModal(true);
          }
        }
      } catch (error) {
        // Handle authentication errors gracefully - user logged out
        if (error instanceof Error && (
          error.message.includes('Authentication error') ||
          error.message.includes('Please login again') ||
          error.message.includes('Access token required') ||
          error.message.includes('401')
        )) {
          console.log('🔐 User logged out - stopping reservation polling');
          // Clear booking data and stop polling when user is logged out
          setBookingData(null);
          setElapsedTime(0);
          setParkingEndTime(null);
          setQrScanned(false);
          parkingStartTime.current = null;
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          // Navigate back to home/login screen
          router.replace('/screens/HomeScreen');
        } else if (isBookingNotOwnedError(error)) {
          resetBookingState();
          setBookingError(null);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          router.replace('/screens/HomeScreen');
        } else {
          console.error('❌ Error polling reservation status:', error);
        }
      }
    };

    // Grace period expiration must be fail-safe: keep polling regardless of realtime events.
    pollReservationStatus();
    pollingInterval = setInterval(pollReservationStatus, 5000);

    // Cleanup
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [bookingData?.reservationId, isTimerRunning, isAuthenticated, checkPendingReservationExpiration]);

  // Primary realtime channel for reservation + area updates
  useEffect(() => {
    if (!isAuthenticated || !bookingData?.reservationId) {
      return;
    }

    const areaId = bookingData?.parkingArea?.id ? Number(bookingData.parkingArea.id) : undefined;
    const reservationId = Number(bookingData.reservationId);
        let lastRefreshAt = 0;

    const refreshFromRealtime = async () => {
      const now = Date.now();
      if (now - lastRefreshAt < 1500) return;
      lastRefreshAt = now;

      try {
        if (areaId) {
          await loadSpotStatuses(areaId, true);
          await fetchCapacitySections(areaId);
        }

        const response = await ApiService.getBookingDetails(reservationId);
        if (response?.success && response?.data) {
          const latestBookingData = response.data as unknown as BookingDetails;

          if (latestBookingData.bookingStatus === 'invalid') {
            if (hasShownExpirationModal && lastExpiredReservationId === latestBookingData.reservationId) {
              return;
            }

            setHasShownExpirationModal(true);
            setLastExpiredReservationId(latestBookingData.reservationId || null);
            setIsTimerRunning(false);
            setElapsedTime(0);
            setQrScanned(false);
            parkingStartTime.current = null;

            const baseDetails = {
              reservationId: latestBookingData.reservationId,
              spotNumber: latestBookingData.parkingSlot?.spotNumber || 'Unknown Spot',
              areaName: latestBookingData.parkingArea?.name || 'Unknown Area',
              userName: latestBookingData.user?.name || 'User'
            };

            try {
              const billingResponse = await ApiService.getBookingDetails(latestBookingData.reservationId, true);
              if (billingResponse.success && billingResponse.data?.billingBreakdown) {
                await handoffExpirationDetailsToHome({
                  ...baseDetails,
                  billingBreakdown: billingResponse.data.billingBreakdown
                });
              } else {
                await handoffExpirationDetailsToHome(baseDetails);
              }
            } catch (error) {
              console.error('Realtime expiration billing fetch failed:', error);
              await handoffExpirationDetailsToHome(baseDetails);
            }

            setBookingData(null);
            router.replace('/screens/HomeScreen');
            return;
          }

          setBookingData(latestBookingData as any);
        }
      } catch (error) {
        if (isBookingNotOwnedError(error)) {
          resetBookingState();
          setBookingError(null);
        } else {
          console.error('Realtime sync refresh failed:', error);
        }
      }
    };

    const onReservationUpdated = (payload: any) => {
      if (payload?.reservationId && Number(payload.reservationId) !== reservationId) {
        return;
      }
      refreshFromRealtime();
    };

    const onSpotsUpdated = (payload: any) => {
      if (areaId && payload?.areaId && Number(payload.areaId) !== areaId) {
        return;
      }
      refreshFromRealtime();
    };

    const onCapacityUpdated = onSpotsUpdated;

    RealtimeService.connect();
    RealtimeService.subscribe({ reservationId, areaId });
    RealtimeService.on('reservation:updated', onReservationUpdated);
    RealtimeService.on('spots:updated', onSpotsUpdated);
    RealtimeService.on('capacity:updated', onCapacityUpdated);

    return () => {
      RealtimeService.off('reservation:updated', onReservationUpdated);
      RealtimeService.off('spots:updated', onSpotsUpdated);
      RealtimeService.off('capacity:updated', onCapacityUpdated);
      RealtimeService.unsubscribe({ reservationId, areaId });
    };
  }, [
    bookingData?.reservationId,
    bookingData?.parkingArea?.id,
    isAuthenticated,
    user?.user_id,
    hasShownExpirationModal,
    lastExpiredReservationId,
    handoffExpirationDetailsToHome
  ]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };




  const handleAddToFavorites = async () => {
    if (bookingData) {
      try {
        console.log('Booking data:', JSON.stringify(bookingData, null, 2));
        console.log('Parking slot data:', bookingData.parkingSlot);
        
        let favoriteIdentifier: string;
        
        // Check if this is a capacity section
        if (bookingData.parkingSlot?.sectionName && bookingData.parkingSlot?.spotType === 'motorcycle') {
          // For capacity sections, use the section name as the identifier
          favoriteIdentifier = bookingData.parkingSlot.sectionName;
          console.log('🎯 Capacity section detected, using section name:', favoriteIdentifier);
        } else {
          // For regular spots, get the parking spot ID
          let parkingSpotId = bookingData.parkingSlot?.parkingSpotId;
          
          // Fallback: If parkingSpotId is not available, get it from reservation
          if (!parkingSpotId) {
            console.log('Parking spot ID not found in booking data, getting from reservation...');
            const spotIdResponse = await ApiService.getParkingSpotIdFromReservation(bookingData.reservationId);
            if (spotIdResponse.success) {
              parkingSpotId = spotIdResponse.data.parkingSpotId;
              console.log('Got parking spot ID from reservation:', parkingSpotId);
            } else {
              throw new Error('Failed to get parking spot ID from reservation');
            }
          }
          
          favoriteIdentifier = parkingSpotId.toString();
          console.log('🎯 Regular spot detected, using parking spot ID:', favoriteIdentifier);
        }
        
        console.log('🎯 Adding to favorites with identifier:', favoriteIdentifier);
        
        const response = await ApiService.addFavorite(favoriteIdentifier);
        
        if (response.success) {
          // Check if it's already in favorites
          if (response.message && response.message.includes('already in favorites')) {
            Alert.alert(
              'Already in Favorites!',
              `${bookingData.parkingSlot?.spotType === 'motorcycle' ? 'Section' : 'Parking spot'} ${bookingData.parkingSlot?.spotNumber ?? 'Unknown'} at ${bookingData.parkingArea?.name ?? 'this area'} is already in your favorites.`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Added to Favorites!',
              `${bookingData.parkingSlot?.spotType === 'motorcycle' ? 'Section' : 'Parking spot'} ${bookingData.parkingSlot?.spotNumber ?? 'Unknown'} at ${bookingData.parkingArea?.name ?? 'this area'} has been added to your favorites.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Error',
            response.message || 'Failed to add to favorites',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error adding to favorites:', error);
        
        // Check if the error message indicates it's already in favorites
        if (error instanceof Error && error.message && error.message.includes('already in favorites')) {
          Alert.alert(
            'Already in Favorites!',
            `${bookingData.parkingSlot.spotType === 'motorcycle' ? 'Section' : 'Parking spot'} ${bookingData.parkingSlot.spotNumber} at ${bookingData.parkingArea.name} is already in your favorites.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            'Failed to add to favorites. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };


  const deductParkingTimeFromPlan = async (parkingDurationSeconds: number) => {
    try {
      // Calculate hours, minutes, seconds
      const hours = Math.floor(parkingDurationSeconds / 3600);
      const minutes = Math.floor((parkingDurationSeconds % 3600) / 60);
      const seconds = parkingDurationSeconds % 60;
      
      // Here you would typically call an API to deduct time from user's plan
      // For now, we'll just show the calculation
      console.log(`Deducting ${hours}h ${minutes}m ${seconds}s from user's plan`);
      
      // TODO: Implement API call to deduct time from user's subscribed plan
      // await ApiService.deductParkingTime({
      //   userId: bookingData.userId,
      //   duration: parkingDurationSeconds,
      //   reservationId: bookingData.reservationId
      // });
      
    } catch (error) {
      console.error('Error deducting parking time from plan:', error);
    }
  };

  const endParkingSession = async (reservationId: number) => {
    try {
      const response = await ApiService.endParkingSession(reservationId);
      
      if (response.success) {
        console.log('✅ Parking session ended successfully');
        console.log('✅ Booking status set to completed');
        console.log('✅ Parking spot freed');
      } else {
        console.error('❌ Failed to end parking session:', response.message);
      }
    } catch (error) {
      console.error('❌ Error ending parking session:', error);
    }
  };

  // Show loading state while fetching booking data
  if (isBookingLoading) {
    return (
      <View style={activeParkingScreenStyles.container}>
        <SharedHeader 
          title="Active Parking"
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, fontSize: 16, color: colors.textSecondary }}>
            Loading booking details...
          </Text>
        </View>
      </View>
    );
  }

  // Show error state if booking failed to load
  if (bookingError) {
    return (
      <View style={activeParkingScreenStyles.container}>
        <SharedHeader 
          title="Active Parking"
        />
        <View style={activeParkingScreenStyles.emptyStateContainer}>
          <Text style={activeParkingScreenStyles.emptyStateTitle}>Booking Error</Text>
          <Text style={activeParkingScreenStyles.emptyStateMessage}>
            {bookingError}
          </Text>
          <TouchableOpacity
            style={activeParkingScreenStyles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={activeParkingScreenStyles.goBackButtonText}>Go Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[activeParkingScreenStyles.goBackButton, { marginTop: 10, backgroundColor: colors.primary }]}
            onPress={() => {
              setBookingError(null);
              // Trigger the useEffect again by updating a dummy state
              const dummy = Math.random();
              console.log('🎯 ActiveParkingScreen: Retrying booking fetch...');
            }}
          >
            <Text style={[activeParkingScreenStyles.goBackButtonText, { color: colors.textInverse }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show error state if no booking data
  if (!bookingData) {
    return (
      <View style={activeParkingScreenStyles.container}>
        <SharedHeader 
          title="Active Parking"
        />
        <View style={activeParkingScreenStyles.emptyStateContainer}>
          <Text style={activeParkingScreenStyles.emptyStateTitle}>No Active Parking Session</Text>
          <Text style={activeParkingScreenStyles.emptyStateMessage}>
            You do not have any active parking reservations at the moment.
          </Text>
          <Text style={activeParkingScreenStyles.emptyStateSubMessage}>
            Please log in and book a parking spot from the Home screen to start a new session.
          </Text>
          <TouchableOpacity
            style={activeParkingScreenStyles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={activeParkingScreenStyles.goBackButtonText}>Go Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={activeParkingScreenStyles.container}>
      <SharedHeader 
        title="Active Parking"
        rightComponent={
          isTimerRunning && bookingData?.bookingStatus === 'active' ? (
            <View style={{
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.2)',
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
                {formatHoursToHHMM(userBalance)} hrs
              </Text>
            </View>
          ) : null
        }
      />

      <View style={activeParkingScreenStyles.content}>
        {/* Section Title */}
        <View style={activeParkingScreenStyles.sectionTitleContainer}>
          <Text style={activeParkingScreenStyles.sectionTitle}>
            {activeTab === 'ticket' ? 'Parking Ticket' : 
             activeTab === 'layout' ? 'Parking Layout' : 
             'Parking Time'}
          </Text>
          {activeTab === 'ticket' && isTimerRunning && bookingData?.bookingStatus === 'active' && (
            <Text style={[activeParkingScreenStyles.durationText, { color: isDarkMode ? colors.text : '#000000' }]}>
              {formatElapsedTime(elapsedTime)}
            </Text>
          )}
        </View>

        {/* Navigation Tabs */}
        <View style={activeParkingScreenStyles.tabsContainer}>
          <TouchableOpacity
            style={[
              activeParkingScreenStyles.tab,
              activeTab === 'ticket' && activeParkingScreenStyles.activeTab
            ]}
            onPress={() => setActiveTab('ticket')}
          >
            <Text 
              style={[
                activeParkingScreenStyles.tabText,
                activeTab === 'ticket' && activeParkingScreenStyles.activeTabText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Parking Ticket
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              activeParkingScreenStyles.tab,
              activeTab === 'layout' && activeParkingScreenStyles.activeTab
            ]}
            onPress={() => setActiveTab('layout')}
          >
            <Text 
              style={[
                activeParkingScreenStyles.tabText,
                activeTab === 'layout' && activeParkingScreenStyles.activeTabText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Parking Layout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              activeParkingScreenStyles.tab,
              activeTab === 'time' && activeParkingScreenStyles.activeTab
            ]}
            onPress={() => setActiveTab('time')}
          >
            <Text 
              style={[
                activeParkingScreenStyles.tabText,
                activeTab === 'time' && activeParkingScreenStyles.activeTabText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Parking Time
            </Text>
          </TouchableOpacity>
        </View>


        {/* Tab Content */}
        {activeTab === 'ticket' && (
          <ScrollView 
            style={activeParkingScreenStyles.ticketContainer}
            contentContainerStyle={activeParkingScreenStyles.ticketContentContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* QR Code Section - Real QR Code Display */}
            <View style={activeParkingScreenStyles.qrSection}>
              <View style={activeParkingScreenStyles.qrContainer}>
                {(() => {
                  // Validate and clean qrKey - ensure it's a string, not JSON
                  let qrKey: string | null = null;
                  
                  // Debug logging
                  console.log('🔍 QR Code Debug - bookingData:', bookingData ? 'exists' : 'null');
                  console.log('🔍 QR Code Debug - bookingData.qrKey:', bookingData?.qrKey);
                  
                  if (bookingData?.qrKey !== null && bookingData?.qrKey !== undefined && bookingData?.qrKey !== '') {
                    const rawKey = String(bookingData.qrKey).trim();
                    console.log('🔍 QR Code Debug - rawKey:', rawKey);
                    
                    // Check if it's JSON (starts with { or [)
                    if (rawKey.startsWith('{') || rawKey.startsWith('[')) {
                      try {
                        const parsed = JSON.parse(rawKey);
                        // If it parsed to an object, it's not a valid UUID - skip it
                        console.log('⚠️ QR Code Debug - qrKey appears to be JSON, rejecting');
                        qrKey = null;
                      } catch (e) {
                        // Parse failed but starts with {, still not valid
                        console.log('⚠️ QR Code Debug - qrKey parse failed, rejecting');
                        qrKey = null;
                      }
                    } else {
                      // Not JSON - use it as is (should be UUID string)
                      qrKey = rawKey;
                      console.log('✅ QR Code Debug - Valid qrKey found:', qrKey);
                    }
                  } else {
                    console.log('❌ QR Code Debug - No qrKey found in bookingData');
                  }
                  
                  // Only render QRCode if we have a valid qrKey
                  if (qrKey) {
                    // Generate QR code data with only qr_key (matches backend implementation)
                    // IMPORTANT: Only qr_key is included in the QR code for validation
                    const qrData = {
                      qr_key: qrKey
                    };
                    const qrString = JSON.stringify(qrData);
                    
                    return (
                      <QRCode
                        value={qrString}
                        size={(() => {
                          const smallestDim = Math.min(screenDimensions.width, screenDimensions.height);
                          // Responsive QR code size based on smallest dimension - Enlarged for better visibility
                          if (smallestDim < 375) return smallestDim * 0.75;
                          if (smallestDim < 414) return smallestDim * 0.8;
                          if (smallestDim < 768) return Math.min(300, smallestDim * 0.75);
                          if (smallestDim < 1024) return Math.min(350, smallestDim * 0.5);
                          return Math.min(400, smallestDim * 0.45);
                        })()}
                        color="black"
                        backgroundColor="white"
                        logoSize={(() => {
                          const smallestDim = Math.min(screenDimensions.width, screenDimensions.height);
                          if (smallestDim < 375) return 30;
                          if (smallestDim < 414) return 35;
                          if (smallestDim < 768) return 40;
                          if (smallestDim < 1024) return 50;
                          return 60;
                        })()}
                        logoMargin={2}
                        logoBorderRadius={15}
                        quietZone={10}
                      />
                    );
                  } else {
                    // Show placeholder when qrKey is missing
                    return (
                      <View style={activeParkingScreenStyles.qrPlaceholder}>
                        <Text style={activeParkingScreenStyles.qrPlaceholderEmoji}>📱</Text>
                        <Text style={activeParkingScreenStyles.qrPlaceholderText}>QR Code</Text>
                        <Text style={activeParkingScreenStyles.qrPlaceholderSubtext}>
                          {bookingData ? 'QR key not available. This reservation may not have a qr_key in the database.' : 'Loading...'}
                        </Text>
                      </View>
                    );
                  }
                })()}
              </View>
              <Text style={activeParkingScreenStyles.qrInstruction}>
                {!isTimerRunning ? 'Waiting for attendant to start parking session...' : 
                 'Parking session is active. Attendant will end the session.'}
              </Text>
            </View>

            {/* Dashed Separator */}
            <View style={activeParkingScreenStyles.separator} />

            {/* Parking Details */}
            <View style={activeParkingScreenStyles.detailsContainer}>
              <View style={activeParkingScreenStyles.detailsColumn}>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Display Name</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>{bookingData?.displayName || 'N/A'}</Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Parking Area</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>{bookingData?.parkingArea?.name || 'N/A'}</Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Date</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {bookingData?.timestamps?.bookingTime ? new Date(bookingData.timestamps.bookingTime).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: '2-digit'
                    }) : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={activeParkingScreenStyles.detailsColumn}>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Vehicle Detail</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {(bookingData?.vehicleDetails?.brand && bookingData?.vehicleDetails?.vehicleType)
                      ? `${String(bookingData.vehicleDetails.brand)} - ${String(bookingData.vehicleDetails.vehicleType)}`
                      : 'N/A'}
                  </Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Parking Slot</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {(bookingData?.parkingSlot?.spotNumber && bookingData?.parkingSlot?.spotType)
                      ? `${String(bookingData.parkingSlot.spotNumber)} (${String(bookingData.parkingSlot.spotType)})`
                      : 'N/A'}
                  </Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Plate Number</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>{bookingData?.vehicleDetails?.plateNumber || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === 'layout' && (
          <View style={activeParkingScreenStyles.layoutContainer}>
            {isLoadingSvg ? (
              <View style={activeParkingScreenStyles.emptyStateContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={activeParkingScreenStyles.emptyStateMessage}>
                  Loading parking layout...
                </Text>
              </View>
            ) : svgContent ? (
              <View style={activeParkingScreenStyles.svgContainer}>
                <View style={activeParkingScreenStyles.layoutHeader}>
                  <Text style={activeParkingScreenStyles.layoutTitle}>
                    {bookingData?.parkingArea?.name || 'Parking Area'} Layout
                  </Text>
                  <TouchableOpacity
                    style={activeParkingScreenStyles.refreshButton}
                    onPress={() => {
                      loadSvgContent(true);
                      if (bookingData?.parkingArea?.id) {
                        loadSpotStatuses(bookingData.parkingArea.id, true); // Force refresh on manual refresh
                      }
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={colors.textInverse} />
                    <Text style={activeParkingScreenStyles.refreshButtonText}> Refresh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[activeParkingScreenStyles.refreshButton, { backgroundColor: colors.warning }]}
                    onPress={() => {
                      setScale(1.0); // Reset to show whole map
                      savedScaleRef.current = 1.0;
                      // Reset ScrollView zoom with area detection - Handle both nested ScrollViews
                      if (scrollViewRef.current && verticalScrollViewRef.current) {
                        const horizontalScrollView = scrollViewRef.current;
                        const verticalScrollView = verticalScrollViewRef.current;
                        
                        // Calculate content dimensions with reset scale
                        const contentWidth = svgDimensions.width * 1.0 + 10; // No zoom
                        const contentHeight = svgDimensions.height * 1.0 + 10; // No zoom
                        
                        // DETECT PARKING AREA TYPE for different positioning
                        const parkingAreaName = bookingData?.parkingArea?.name || '';
                        const isFPAArea = parkingAreaName.toLowerCase().includes('fpa');
                        const isFUArea = parkingAreaName.toLowerCase().includes('fu');
                        
                        let offsetX, offsetY;
                        
                        if (isFPAArea) {
                          // FPA: Center the layout (smaller, needs centering)
                          const scrollViewLayout = {
                            width: screenWidth - 20,
                            height: Math.max(500, Dimensions.get('window').height * 0.5)
                          };
                          offsetX = Math.max(0, (contentWidth - scrollViewLayout.width) / 2);
                          offsetY = Math.max(0, (contentHeight - scrollViewLayout.height) / 2);
                          console.log('🎯 FPA AREA - Centered positioning on reset');
                        } else {
                          // FU Main or others: Start from top-left (larger, needs to show parking area)
                          offsetX = 0; // Start from left to show parking area
                          offsetY = 0; // Start from top to show parking area
                          console.log('🎯 FU MAIN AREA - Top-left positioning on reset');
                        }
                        
                        // Scroll both nested ScrollViews to appropriate position
                        horizontalScrollView.scrollTo({ x: offsetX, y: 0, animated: true });
                        verticalScrollView.scrollTo({ x: 0, y: offsetY, animated: true });
                        console.log('🎯 RESET with NESTED SCROLLVIEWS:', { 
                          offsetX, 
                          offsetY, 
                          contentWidth, 
                          contentHeight,
                          screenWidth,
                          screenHeight: Dimensions.get('window').height,
                          parkingAreaName,
                          areaType: isFPAArea ? 'FPA' : isFUArea ? 'FU Main' : 'Other'
                        });
                      }
                    }}
                  >
                    <Ionicons name="expand" size={16} color={colors.textInverse} />
                    <Text style={activeParkingScreenStyles.refreshButtonText}> Reset</Text>
                  </TouchableOpacity>
                </View>
                <View style={activeParkingScreenStyles.mapContainer}>
                  <ScrollView 
                    ref={scrollViewRef}
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
                      ref={verticalScrollViewRef}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      style={{
                        width: Math.max(svgDimensions.width * scale + 40, svgDimensions.width + 40),
                      }}
                      contentContainerStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        minHeight: Math.max(400, svgDimensions.height + 80),
                        maxHeight: Math.max(1500, svgDimensions.height + 200),
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
                          width: svgDimensions.width,
                          height: svgDimensions.height,
                          position: 'relative',
                        }}
                        pointerEvents="box-none"
                        >
                          <TouchableOpacity
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'transparent',
                            }}
                            onPress={handleLayoutTap}
                            activeOpacity={1}
                            pointerEvents="auto"
                          >
                            <SvgXml
                              xml={svgContent}
                              width={svgDimensions.width}
                              height={svgDimensions.height}
                              preserveAspectRatio="xMidYMid meet" // Proper scaling without distortion
                              style={{ 
                                width: svgDimensions.width,
                                height: svgDimensions.height,
                                backgroundColor: 'transparent',
                              }}
                            />
                          </TouchableOpacity>
                          {/* Clickable overlay container for spots */}
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
                            {positionedSpots.map((spot, index) => {
                            const left = (spot.left ?? 0) - 2;
                            const top = (spot.top ?? 0) - 2;
                            const width = (spot.width ?? 50) + 4;
                            const height = (spot.height ?? 50) + 4;

                            if (!spot.id || width <= 0 || height <= 0 || isNaN(left) || isNaN(top)) {
                              if (__DEV__) {
                                console.warn('⚠️ Invalid positioned spot:', { spotId: spot.id, left, top, width, height });
                              }
                              return null;
                            }

                            if (__DEV__ && (index < 3 || spot.spotNumber === bookingData?.parkingSlot?.spotNumber)) {
                              console.log('🎯 Positioned spot ready for render:', {
                                spotId: spot.id,
                                spotNumber: spot.spotNumber,
                                originalCoords: { x: spot.x, y: spot.y, width: (spot as any).originalWidth, height: (spot as any).originalHeight },
                                finalCoords: { left, top, width, height },
                                container: { width: svgDimensions.width, height: svgDimensions.height },
                              });
                            }

                            // Get spot status from backend (match by spot ID first, then spot_number)
                            // Try multiple matching strategies for flexibility like FPA
                            let spotStatus = spotStatuses.get(spot.id || '') || spotStatuses.get(spot.spotNumber || '');
                            
                            // Debug logging for status matching
                            if (__DEV__ && (index < 3 || spot.spotNumber === bookingData?.parkingSlot?.spotNumber)) {
                              console.log('🔍 FU Main Status matching:', {
                                spotId: spot.id,
                                spotNumber: spot.spotNumber,
                                directMatch: !!spotStatuses.get(spot.id || ''),
                                numberMatch: !!spotStatuses.get(spot.spotNumber || ''),
                                availableKeys: Array.from(spotStatuses.keys()).slice(0, 10),
                                foundStatus: spotStatus
                              });
                            }
                            
                            // If still not found, try matching without floor prefix
                            if (!spotStatus && spot.id) {
                              const idWithoutFloor = spot.id.replace(/^F\d+-/i, ''); // Remove "F2-" prefix
                              spotStatus = spotStatuses.get(idWithoutFloor);
                              
                              if (__DEV__ && index < 3) {
                                console.log('🔍 Trying without floor prefix:', {
                                  originalId: spot.id,
                                  idWithoutFloor: idWithoutFloor,
                                  found: !!spotStatus
                                });
                              }
                            }
                            
                            // Also try matching by local slot number for FU Main
                            if (!spotStatus && (spot as any).localSlot) {
                              const localSlot = (spot as any).localSlot;
                              spotStatus = spotStatuses.get(localSlot.toString());
                              
                              if (__DEV__ && (index < 3)) {
                                console.log(' Trying local slot:', {
                                  localSlot: localSlot,
                                  found: !!spotStatus
                                });
                              }
                            }
                            
                            // Get spot status for regular spots, but capacity sections should always be available
                            let spotStatusValue = spotStatus?.status || 'unknown';
                            let isUserBooked = spotStatus?.is_user_booked === true || (typeof spotStatus?.is_user_booked === 'number' && spotStatus.is_user_booked === 1);
                            
                            // Check if this is a capacity section
                            const isCapacitySection = spot.id && spot.id.startsWith('section-');
                            
                            // For capacity sections, check if section is unavailable or has reservations
                            if (isCapacitySection) {
                              const sectionName = spot.spotNumber || '';
                              const sectionData = capacitySections.find(section => 
                                section.sectionName.toLowerCase() === sectionName.toLowerCase()
                              );
                              
                              if (sectionData) {
                                // Check if section has reservations - if so, mark as unavailable
                                if (sectionData.activeReservations > 0) {
                                  spotStatusValue = 'unavailable';
                                  console.log('🎯 Capacity section has reservations, marking as unavailable:', spot.id, `reservations: ${sectionData.activeReservations}`);
                                } else {
                                  spotStatusValue = 'available';
                                  console.log('🎯 Capacity section has no reservations, marking as available:', spot.id);
                                }
                              } else {
                                spotStatusValue = 'available'; // Default to available if no data
                                console.log('🎯 No capacity data for section, defaulting to available:', spot.id);
                              }
                            }
                            
                            // Additional check: If this is a capacity section, check if user's current booking is in this section
                            let isUserBookedInSection = false;
                            if (isCapacitySection && bookingData?.parkingSlot) {
                              const userSectionName = bookingData.parkingSlot.sectionName || '';
                              const currentSectionName = spot.spotNumber || '';
                              isUserBookedInSection = userSectionName.toLowerCase() === currentSectionName.toLowerCase();
                              
                              if (isUserBookedInSection) {
                                console.log('🔵 User booked in capacity section:', {
                                  userSection: userSectionName,
                                  currentSection: currentSectionName,
                                  userSpotId: bookingData.parkingSlot.spotId,
                                  bookingStatus: bookingData.bookingStatus
                                });
                              }
                            }
                            
                            // Final user booking check (combines regular spot and capacity section logic)
                            const finalIsUserBooked = isUserBooked || isUserBookedInSection;
                            
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
                            
                            // Determine color based on status and spot type
                            // Blue = Current user's booked spot (highest priority - overrides everything)
                            // Dynamic colors for capacity sections based on utilization (only if not user's spot)
                            // Otherwise, use status-based colors (yellow for reserved, red for occupied, green for available)
                            let backgroundColor = 'rgba(200, 200, 200, 0.05)'; // Very light gray for unknown
                            let borderColor = 'rgba(200, 200, 200, 0.3)';
                            
                            // HIGHEST PRIORITY: If current user has booked this spot, show it in blue (regardless of status or capacity)
                            if (finalIsUserBooked) {
                              backgroundColor = 'rgba(0, 122, 255, 0.15)'; // Light blue with transparency
                              borderColor = 'rgba(0, 122, 255, 0.6)'; // Blue border
                              console.log('🔵 User spot detected:', spot.id, 'showing blue regardless of capacity');
                            } else if (isCapacitySection) {
                              // Dynamic color coding based on capacity utilization (only if not user's spot)
                              // But show gray if section has reservations (unavailable)
                              if (spotStatusValue === 'unavailable') {
                                // Section has reservations - show gray like attendant screen
                                backgroundColor = 'rgba(142, 142, 147, 0.1)'; // Light gray
                                borderColor = 'rgba(142, 142, 147, 0.5)'; // Gray border
                                console.log('🔴 Capacity section unavailable due to reservations:', spot.id);
                              } else if (capacityUtilization >= 95) {
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
                              // Otherwise, use status-based colors for spots booked by others or available spots
                              switch (spotStatusValue) {
                                case 'available':
                                  backgroundColor = 'rgba(52, 199, 89, 0.1)'; // Light green
                                  borderColor = 'rgba(52, 199, 89, 0.5)';
                                  break;
                                case 'occupied':
                                  backgroundColor = 'rgba(255, 59, 48, 0.1)'; // Light red
                                  borderColor = 'rgba(255, 59, 48, 0.5)';
                                  break;
                                case 'reserved':
                                  backgroundColor = 'rgba(255, 204, 0, 0.1)'; // Light yellow
                                  borderColor = 'rgba(255, 204, 0, 0.5)';
                                  break;
                                case 'unavailable':
                                  backgroundColor = 'rgba(142, 142, 147, 0.1)'; // Light gray
                                  borderColor = 'rgba(142, 142, 147, 0.5)';
                                  break;
                                default:
                                  backgroundColor = 'rgba(200, 200, 200, 0.05)'; // Very light gray
                                  borderColor = 'rgba(200, 200, 200, 0.3)';
                              }
                            }
                            
                            // Minimal validation to avoid NaNs while matching HomeScreen behavior
                            const originalWidth = (spot as any).originalWidth ?? spot.width;
                            const originalHeight = (spot as any).originalHeight ?? spot.height;
                            const originalX = (spot as any).originalX ?? spot.x;
                            const originalY = (spot as any).originalY ?? spot.y;

                            if (
                              !spot.id ||
                              isNaN(left) ||
                              isNaN(top) ||
                              isNaN(width) ||
                              isNaN(height) ||
                              originalWidth <= 0 ||
                              originalHeight <= 0
                            ) {
                              console.log('🚫 Skipping spot due to invalid geometry:', {
                                id: spot.id,
                                left,
                                top,
                                width,
                                height,
                                originalWidth,
                                originalHeight,
                              });
                              return null;
                            }

                            // Debug logging for sections
                            if (spot.id.includes('section-')) {
                              console.log('🔍 Processing section in final check:', {
                                id: spot.id,
                                spotNumber: spot.spotNumber,
                                x: originalX,
                                y: originalY,
                                width: originalWidth,
                                height: originalHeight,
                                isUserBooked: isUserBooked,
                                isUserBookedInSection: isUserBookedInSection,
                                finalIsUserBooked: finalIsUserBooked,
                                capacityUtilization: `${capacityUtilization.toFixed(1)}%`,
                                finalColor: finalIsUserBooked ? 'BLUE (User Spot)' : 
                                          capacityUtilization >= 95 ? 'RED (95%+ Full)' :
                                          capacityUtilization >= 50 ? 'ORANGE (50%+ Full)' :
                                          capacityUtilization <= 5 ? 'GREEN (5% or less Full)' : 'YELLOW (Moderate)',
                                sectionData: capacitySections.find(section => 
                                  section.sectionName.toLowerCase() === (spot.spotNumber || '').toLowerCase()
                                )
                              });
                            }
                            
                            return (
                              <TouchableOpacity
                                key={`spot-${spot.id}-${spot.spotNumber || 'no-number'}`}
                                style={{
                                  position: 'absolute',
                                  left: left || 0,
                                  top: top || 0,
                                  width: width || 50,
                                  height: height || 50,
                                  backgroundColor: backgroundColor || 'rgba(52, 199, 89, 0.2)',
                                  borderWidth: finalIsUserBooked ? 2 : (isCapacitySection ? 2 : 1),
                                  borderColor: borderColor || '#34C759',
                                  borderRadius: isCapacitySection ? 4 : 3,
                                  zIndex: 10,
                                }}
                                onPress={() => {
                                  console.log('📍 FU Main Spot tapped:', spot.spotNumber || spot.id, 'Status:', spotStatusValue);
                                  
                                  // Apply spot ID mapping for modal display
                                  const parkingAreaName = bookingData?.parkingArea?.name || 'FPA';
                                  const parkingAreaId = bookingData?.parkingArea?.id || 2;
                                  const mapConfig = getMapConfig(parkingAreaId, parkingAreaName);
                                  const mappedSpotId = mapConfig.spotIdMapping?.[spot.id] || spot.id;
                                  
                                  setSelectedSpot({
                                    ...spot,
                                    id: mappedSpotId, // Use mapped ID for modal
                                    spotId: mappedSpotId, // Use mapped ID for modal
                                    isCurrentSpot: finalIsUserBooked,
                                    status: spotStatusValue,
                                    spotData: spotStatus
                                  });
                                  setShowSpotModal(true);
                                }}
                                activeOpacity={0.7}
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
                                      fontSize: Math.max(8, Math.min((width || 50), (height || 50)) * 0.25), // Responsive font size with minimum
                                      fontWeight: 'bold',
                                      color: '#FFFFFF',
                                      textAlign: 'center',
                                      textShadowColor: 'rgba(0, 0, 0, 0.7)',
                                      textShadowOffset: { width: 1, height: 1 },
                                      textShadowRadius: 2,
                                    }}>
                                      {(() => {
                                        const sectionName = spot.spotNumber || '';
                                        const sectionData = capacitySections.find(section => 
                                          section.sectionName.toLowerCase() === sectionName.toLowerCase()
                                        );
                                        
                                        if (sectionData) {
                                          return `${String(sectionData.availableCapacity)}/${String(sectionData.totalCapacity)}`;
                                        } else {
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
              <View style={activeParkingScreenStyles.emptyStateContainer}>
                <Text style={activeParkingScreenStyles.emptyStateTitle}>🚧 No Layout Available</Text>
                <Text style={activeParkingScreenStyles.emptyStateMessage}>
                  No parking layout is available for this area yet.
                </Text>
                <Text style={activeParkingScreenStyles.emptyStateSubMessage}>
                  The layout will be displayed here once it is configured for this parking area.
                </Text>
                <TouchableOpacity
                  style={activeParkingScreenStyles.refreshButton}
                  onPress={() => loadSvgContent(true)}
                >
                  <Ionicons name="refresh" size={16} color={colors.textInverse} />
                  <Text style={activeParkingScreenStyles.refreshButtonText}> Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Legend - Inside the svgContainer */}
        {activeTab === 'layout' && svgContent && (
          <View style={activeParkingScreenStyles.legendContainer}>
            <Text style={activeParkingScreenStyles.legendTitle}>Legend</Text>
            <View style={activeParkingScreenStyles.legendItems}>
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={[activeParkingScreenStyles.legendColor, { backgroundColor: 'rgba(52, 199, 89, 0.3)', borderColor: '#34C759' }]} />
                <Text style={activeParkingScreenStyles.legendText}>Available Spot</Text>
              </View>
              
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: 'rgba(0, 122, 255, 0.1)',
                  borderWidth: 2,
                  borderColor: 'rgba(0, 122, 255, 0.8)',
                  borderRadius: getResponsiveSize(3),
                }} />
                <Text style={{
                  fontSize: getResponsiveFontSize(11),
                  color: colors.textSecondary,
                  marginLeft: getResponsiveMargin(6),
                }}>Your Spot</Text>
              </View>

              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: isDarkMode ? colors.card : 'rgba(255, 255, 255, 0.8)',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: getResponsiveSize(3),
                }} />
                <Text style={{
                  fontSize: getResponsiveFontSize(11),
                  color: colors.textSecondary,
                  marginLeft: getResponsiveMargin(6),
                }}>Capacity Section</Text>
              </View>

              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: 'rgba(255, 149, 0, 0.2)',
                  borderWidth: 2,
                  borderColor: 'rgba(255, 149, 0, 0.8)',
                  borderRadius: getResponsiveSize(3),
                }} />
                <Text style={{
                  fontSize: getResponsiveFontSize(11),
                  color: colors.textSecondary,
                  marginLeft: getResponsiveMargin(6),
                }}>50%+ Full</Text>
              </View>

              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: 'rgba(255, 59, 48, 0.2)',
                  borderWidth: 2,
                  borderColor: 'rgba(255, 59, 48, 0.8)',
                  borderRadius: getResponsiveSize(3),
                }} />
                <Text style={{
                  fontSize: getResponsiveFontSize(11),
                  color: colors.textSecondary,
                  marginLeft: getResponsiveMargin(6),
                }}>95%+ Full</Text>
              </View>

              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: 'rgba(52, 199, 89, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(52, 199, 89, 0.6)',
                  borderRadius: getResponsiveSize(3),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: getResponsiveFontSize(10),
                    color: '#34C759',
                    fontWeight: 'bold',
                  }}>↓</Text>
                </View>
                <Text style={{
                  fontSize: getResponsiveFontSize(11),
                  color: colors.textSecondary,
                  marginLeft: getResponsiveMargin(6),
                }}>Entry</Text>
              </View>

              <View style={activeParkingScreenStyles.legendItem}>
                <View style={{
                  width: getResponsiveSize(16),
                  height: getResponsiveSize(16),
                  backgroundColor: 'rgba(255, 59, 48, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 59, 48, 0.6)',
                  borderRadius: getResponsiveSize(3),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: getResponsiveFontSize(10),
                    color: '#FF3B30',
                    fontWeight: 'bold',
                  }}>↑</Text>
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

        {activeTab === 'time' && (
              <View style={activeParkingScreenStyles.timeContainer}>
                {/* ... (rest of the code remains the same) */}
            {/* Timer Display with Circular Progress */}
            <View style={activeParkingScreenStyles.timerSection}>
              <View style={activeParkingScreenStyles.timerContainer}>
                <View style={activeParkingScreenStyles.timerCircle}>
                  <LiquidGauge
                    value={liquidGaugeValue}
                    width={isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220)}
                    height={isSmallScreen ? getResponsiveSize(180) : getResponsiveSize(220)}
                    config={{
                      minValue: 0,
                      maxValue: 100,
                      waveColor: colors.primary,
                      circleColor: colors.border,
                      textColor: 'transparent',
                      waveTextColor: 'transparent',
                      textSuffix: '',
                      waveAnimate: true,
                      waveAnimateTime: 1500,
                      waveRiseTime: 900,
                      valueCountUp: false,
                      circleThickness: 0.09,
                      circleFillGap: 0.04,
                    }}
                  />
                  
                  {/* Timer Content */}
                  <View style={activeParkingScreenStyles.timerContent}>
                    <Text style={[activeParkingScreenStyles.timerText, { color: isDarkMode ? colors.text : '#000000' }]}>
                      {parkingEndTime ? 
                        formatTime(Math.floor((parkingEndTime - (parkingStartTime.current || 0)) / 1000)) : 
                        formatTime(elapsedTime)
                      }
                    </Text>
                    <View style={activeParkingScreenStyles.timerLabels}>
                      <Text style={[activeParkingScreenStyles.timerLabel, { color: isDarkMode ? colors.text : '#000000' }]}>hour</Text>
                      <Text style={[activeParkingScreenStyles.timerLabel, { color: isDarkMode ? colors.text : '#000000' }]}>min</Text>
                      <Text style={[activeParkingScreenStyles.timerLabel, { color: isDarkMode ? colors.text : '#000000' }]}>sec</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Parking Details Card */}
            <View style={activeParkingScreenStyles.parkingDetailsCard}>
              <View style={activeParkingScreenStyles.detailsColumn}>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Vehicle</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {bookingData.vehicleDetails.brand} - {bookingData.vehicleDetails.vehicleType}
                  </Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Parking Area</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>{bookingData.parkingArea.name}</Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Date</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {new Date(bookingData.timestamps.bookingTime).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
              
              <View style={activeParkingScreenStyles.detailsColumn}>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Plate Number</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>{bookingData.vehicleDetails.plateNumber}</Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Parking Spot</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>
                    {bookingData.parkingSlot.spotNumber} ({bookingData.parkingSlot.spotType})
                  </Text>
                </View>
                <View style={activeParkingScreenStyles.detailRow}>
                  <Text style={activeParkingScreenStyles.detailLabel}>Partial Amount</Text>
                  <Text style={activeParkingScreenStyles.detailValue}>--</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Add to Favorites Button */}
        {activeTab === 'ticket' && (
          <TouchableOpacity style={activeParkingScreenStyles.favoritesButton} onPress={handleAddToFavorites}>
            <SvgXml 
              xml={`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 18.35L8.55 17.03C3.4 12.36 0 9.28 0 5.5C0 2.42 2.42 0 5.5 0C7.24 0 8.91 0.81 10 2.09C11.09 0.81 12.76 0 14.5 0C17.58 0 20 2.42 20 5.5C20 9.28 16.6 12.36 11.45 17.04L10 18.35Z" fill="white"/>
<path d="M6 8L8 10L14 4" stroke="#8A0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`}
              width={20}
              height={20}
            />
            <Text style={activeParkingScreenStyles.favoritesText}>Add to Favorites</Text>
          </TouchableOpacity>
        )}



        {/* Test Modal */}
        <Modal
          visible={showTestModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTestModal(false)}
        >
          <View style={activeParkingScreenStyles.spotOverlay}>
            <View style={activeParkingScreenStyles.spotModalContent}>
              <Text style={activeParkingScreenStyles.spotModalTitle}>🧪 Test Options</Text>
              <Text style={activeParkingScreenStyles.spotModalTitle}>
                This screen displays parking session status. The attendant will scan your QR code to start and end the session.
              </Text>
              
              <TouchableOpacity 
                style={activeParkingScreenStyles.spotModalCloseButton}
                onPress={() => setShowTestModal(false)}
              >
                <Text style={activeParkingScreenStyles.spotModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Spot Details Modal */}
        <Modal
          visible={showSpotModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSpotModal(false)}
        >
          <View style={activeParkingScreenStyles.modalOverlay}>
            <View style={activeParkingScreenStyles.spotModalContent}>
              {selectedSpot && (
                <>
                  <Text style={activeParkingScreenStyles.spotModalTitle}>
                    {selectedSpot.spotNumber ? `Spot ${selectedSpot.spotNumber}` : 'Parking Spot'}
                    {selectedSpot.isCurrentSpot && <Text> (Your Spot)</Text>}
                  </Text>
                  
                  {/* Enhanced Content for Capacity Sections */}
                  {selectedSpot.id && selectedSpot.id.startsWith('section-') ? (
                    <View style={activeParkingScreenStyles.spotModalInfo}>
                      {/* Section Header */}
                      <View style={activeParkingScreenStyles.spotModalRow}>
                        <Text style={activeParkingScreenStyles.spotModalLabel}>Section:</Text>
                        <Text style={activeParkingScreenStyles.spotModalValue}>
                          {selectedSpot.spotNumber || 'Unknown'}
                        </Text>
                      </View>
                      
                      <View style={activeParkingScreenStyles.spotModalRow}>
                        <Text style={activeParkingScreenStyles.spotModalLabel}>Vehicle Type:</Text>
                        <Text style={activeParkingScreenStyles.spotModalValue}>
                          Motorcycle
                        </Text>
                      </View>
                      
                      {/* Progress Bar Section */}
                      {(() => {
                        const detailedData = getDetailedSectionData(selectedSpot.spotNumber || '');
                        if (!detailedData) return null;
                        
                        const { reservedCount, occupiedCount, availableCount, totalSpots, utilizationRate } = detailedData;
                        
                        return (
                          <View style={{ marginTop: 16 }}>
                            <Text style={activeParkingScreenStyles.spotModalLabel}>Capacity Overview:</Text>
                            
                            {/* Progress Bar */}
                            <View style={{
                              height: 24,
                              backgroundColor: colors.border,
                              borderRadius: 12,
                              overflow: 'hidden',
                              marginTop: 8,
                              flexDirection: 'row',
                            }}>
                              {/* Reserved (Yellow) */}
                              <View style={{
                                width: `${(reservedCount / totalSpots) * 100}%`,
                                backgroundColor: '#FFCC00',
                                height: '100%',
                              }} />
                              {/* Occupied (Red) */}
                              <View style={{
                                width: `${(occupiedCount / totalSpots) * 100}%`,
                                backgroundColor: '#FF3B30',
                                height: '100%',
                              }} />
                              {/* Available (Green) */}
                              <View style={{
                                width: `${(availableCount / totalSpots) * 100}%`,
                                backgroundColor: '#34C759',
                                height: '100%',
                              }} />
                            </View>
                            
                            {/* Legend */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 12, height: 12, backgroundColor: '#34C759', borderRadius: 2, marginRight: 4 }} />
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Available: {availableCount}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 12, height: 12, backgroundColor: '#FFCC00', borderRadius: 2, marginRight: 4 }} />
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Reserved: {reservedCount}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 12, height: 12, backgroundColor: '#FF3B30', borderRadius: 2, marginRight: 4 }} />
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Occupied: {occupiedCount}</Text>
                              </View>
                            </View>
                            
                            {/* Statistics */}
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                              <View style={activeParkingScreenStyles.spotModalRow}>
                                <Text style={activeParkingScreenStyles.spotModalLabel}>Total Capacity:</Text>
                                <Text style={activeParkingScreenStyles.spotModalValue}>
                                  {totalSpots} spots
                                </Text>
                              </View>
                              
                              <View style={activeParkingScreenStyles.spotModalRow}>
                                <Text style={activeParkingScreenStyles.spotModalLabel}>Available:</Text>
                                <Text style={[activeParkingScreenStyles.spotModalValue, { color: '#34C759' }]}>
                                  {availableCount} ({Math.round((availableCount / totalSpots) * 100)}%)
                                </Text>
                              </View>
                              
                              <View style={activeParkingScreenStyles.spotModalRow}>
                                <Text style={activeParkingScreenStyles.spotModalLabel}>Utilization:</Text>
                                <Text style={[
                                  activeParkingScreenStyles.spotModalValue,
                                  {
                                    color: utilizationRate >= 95 ? '#FF3B30' :
                                           utilizationRate >= 50 ? '#FF9500' :
                                           utilizationRate <= 5 ? '#34C759' : '#FFCC00'
                                  }
                                ]}>
                                  {Math.round(utilizationRate)}% {utilizationRate >= 95 ? '(Nearly Full)' : utilizationRate >= 50 ? '(Moderate)' : utilizationRate <= 5 ? '(Available)' : '(Normal)'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })()}
                      
                      {selectedSpot.isCurrentSpot && (
                        <View style={[activeParkingScreenStyles.spotModalRow, { marginTop: 12 }]}>
                          <Text style={[activeParkingScreenStyles.spotModalValue, { color: colors.info, fontWeight: 'bold' }]}>
                            ✓ You have a booking in this section
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* Regular Spot Content */
                    <View style={activeParkingScreenStyles.spotModalInfo}>
                      {selectedSpot.spotNumber && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={activeParkingScreenStyles.spotModalLabel}>Spot Number:</Text>
                          <Text style={activeParkingScreenStyles.spotModalValue}>
                            {selectedSpot.spotNumber}
                          </Text>
                        </View>
                      )}
                      
                      {selectedSpot.spotId && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={activeParkingScreenStyles.spotModalLabel}>Spot ID:</Text>
                          <Text style={activeParkingScreenStyles.spotModalValue}>
                            {selectedSpot.spotId}
                          </Text>
                        </View>
                      )}
                      
                      {bookingData?.parkingArea?.name && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={activeParkingScreenStyles.spotModalLabel}>Parking Area:</Text>
                          <Text style={activeParkingScreenStyles.spotModalValue}>
                            {bookingData.parkingArea.name}
                          </Text>
                        </View>
                      )}
                      
                      {layoutId && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={activeParkingScreenStyles.spotModalLabel}>Layout ID:</Text>
                          <Text style={activeParkingScreenStyles.spotModalValue}>
                            {layoutId}
                          </Text>
                        </View>
                      )}
                      
                      {selectedSpot.status && selectedSpot.status.trim() && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={activeParkingScreenStyles.spotModalLabel}>Status:</Text>
                          <Text style={[
                            activeParkingScreenStyles.spotModalValue,
                            {
                              color: selectedSpot.status === 'available' ? '#34C759' :
                                     selectedSpot.status === 'occupied' ? '#FF3B30' :
                                     selectedSpot.status === 'reserved' ? '#FFCC00' : colors.textSecondary
                            }
                          ]}>
                            {selectedSpot.status.charAt(0).toUpperCase() + selectedSpot.status.slice(1)}
                          </Text>
                        </View>
                      )}
                      
                      {selectedSpot.isCurrentSpot && (
                        <View style={activeParkingScreenStyles.spotModalRow}>
                          <Text style={[activeParkingScreenStyles.spotModalValue, { color: colors.primary, fontWeight: 'bold' }]}>
                            ✓ This is your reserved parking spot
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={activeParkingScreenStyles.spotModalCloseButton}
                    onPress={() => setShowSpotModal(false)}
                  >
                    <Text style={activeParkingScreenStyles.spotModalCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Parking End Details Modal */}
        <Modal
          visible={showParkingEndModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleParkingEndModalClose}
        >
          <View style={activeParkingScreenStyles.modalOverlay}>
            <View style={activeParkingScreenStyles.parkingEndModalContainer}>
              <Text style={activeParkingScreenStyles.parkingEndModalTitle}>Parking Session Ended</Text>
              
              {parkingEndDetails && (
                <View style={activeParkingScreenStyles.parkingEndDetailsContainer}>
                  <View style={activeParkingScreenStyles.parkingEndDetailRow}>
                    <Text style={activeParkingScreenStyles.parkingEndDetailLabel}>Duration:</Text>
                    <Text style={activeParkingScreenStyles.parkingEndDetailValue}>
                      {formatDuration(parkingEndDetails.durationMinutes)}
                    </Text>
                  </View>
                  
                  <View style={activeParkingScreenStyles.parkingEndDetailRow}>
                    <Text style={activeParkingScreenStyles.parkingEndDetailLabel}>Hours Deducted:</Text>
                    <Text style={activeParkingScreenStyles.parkingEndDetailValue}>
                      {(() => {
                        const hours = Math.floor(parkingEndDetails.chargeHours);
                        const minutes = Math.round((parkingEndDetails.chargeHours - hours) * 60);
                        
                        if (hours === 0 && minutes > 0) {
                          return `${minutes} min`;
                        } else if (hours > 0 && minutes === 0) {
                          return `${hours} hr${hours >= 1 ? 's' : ''}`;
                        } else {
                          return `${hours} hr${hours >= 1 ? 's' : ''} ${minutes} min`;
                        }
                      })()}
                    </Text>
                  </View>
                  
                  {/* Billing Breakdown - only show if available */}
                  {parkingEndDetails.billingBreakdown && (
                    <View style={activeParkingScreenStyles.billingBreakdownContainer}>
                      <Text style={activeParkingScreenStyles.billingBreakdownTitle}>Billing Breakdown</Text>
                      <View style={activeParkingScreenStyles.billingBreakdownRow}>
                        <Text style={activeParkingScreenStyles.billingBreakdownLabel}>Wait Time:</Text>
                        <Text style={activeParkingScreenStyles.billingBreakdownValue}>
                          {parkingEndDetails.billingBreakdown.waitTimeMinutes} min
                        </Text>
                      </View>
                      <View style={activeParkingScreenStyles.billingBreakdownRow}>
                        <Text style={activeParkingScreenStyles.billingBreakdownLabel}>Parking Time:</Text>
                        <Text style={activeParkingScreenStyles.billingBreakdownValue}>
                          {parkingEndDetails.billingBreakdown.parkingTimeMinutes} min
                        </Text>
                      </View>
                      <View style={[activeParkingScreenStyles.billingBreakdownRow, activeParkingScreenStyles.billingBreakdownTotal]}>
                        <Text style={activeParkingScreenStyles.billingBreakdownLabel}>Total Charged:</Text>
                        <Text style={activeParkingScreenStyles.billingBreakdownValue}>
                          {parkingEndDetails.billingBreakdown.totalChargedHours.toFixed(2)} hrs
                        </Text>
                      </View>
                      <Text style={activeParkingScreenStyles.billingBreakdownFormula}>
                        {parkingEndDetails.billingBreakdown.breakdown}
                      </Text>
                    </View>
                  )}
                  
                  <View style={activeParkingScreenStyles.parkingEndDetailRow}>
                    <Text style={activeParkingScreenStyles.parkingEndDetailLabel}>Remaining Balance:</Text>
                    <Text style={activeParkingScreenStyles.parkingEndDetailValue}>
                      {formatHoursToHHMM(parkingEndDetails.balanceHours)} hr{parkingEndDetails.balanceHours >= 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {parkingEndDetails.hasPenalty && parkingEndDetails.penaltyHours > 0 && (
                    <View style={[activeParkingScreenStyles.parkingEndDetailRow, { 
                      backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                      padding: 12, 
                      borderRadius: 8, 
                      marginTop: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: colors.warning
                    }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[activeParkingScreenStyles.parkingEndDetailLabel, { 
                          color: colors.warning, 
                          fontWeight: 'bold',
                          marginBottom: 4 
                        }]}>
                          ⚠️ Penalty Notice
                        </Text>
                        <Text style={[activeParkingScreenStyles.parkingEndDetailValue, { 
                          color: colors.warning,
                          fontSize: getResponsiveFontSize(12)
                        }]}>
                          You exceeded your balance by {formatHoursToHHMM(parkingEndDetails.penaltyHours)} hr. This penalty will be deducted from your next subscription plan.
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={activeParkingScreenStyles.parkingEndDetailRow}>
                    <Text style={activeParkingScreenStyles.parkingEndDetailLabel}>Parking Area:</Text>
                    <Text style={activeParkingScreenStyles.parkingEndDetailValue}>
                      {parkingEndDetails.areaName}
                    </Text>
                  </View>
                  
                  <View style={activeParkingScreenStyles.parkingEndDetailRow}>
                    <Text style={activeParkingScreenStyles.parkingEndDetailLabel}>Spot Number:</Text>
                    <Text style={activeParkingScreenStyles.parkingEndDetailValue}>
                      {parkingEndDetails.spotNumber}
                    </Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={activeParkingScreenStyles.parkingEndModalButton} 
                onPress={handleParkingEndModalClose}
              >
                <Text style={activeParkingScreenStyles.parkingEndModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Grace Period Warning Modal */}
        <Modal
          visible={showGracePeriodWarning}
          transparent={true}
          animationType="fade"
          onRequestClose={handleGracePeriodWarningClose}
        >
          <View style={activeParkingScreenStyles.modalOverlay}>
            <View style={activeParkingScreenStyles.gracePeriodModalContainer}>
              <View style={activeParkingScreenStyles.gracePeriodModalHeader}>
                <Ionicons name="warning" size={32} color={colors.warning} />
                <Text style={activeParkingScreenStyles.gracePeriodModalTitle}>
                  ⚠️ Reservation Created!
                </Text>
              </View>
              
              <View style={activeParkingScreenStyles.gracePeriodModalContent}>
                <Text style={activeParkingScreenStyles.gracePeriodModalText}>
                  You have {RESERVATION_HOLD_MINUTES} minutes to check in at the parking area.
                </Text>
                
                <Text style={activeParkingScreenStyles.gracePeriodModalText}>
                  Please arrive and scan your QR code before:
                </Text>
                
                <View style={activeParkingScreenStyles.gracePeriodDeadlineContainer}>
                  <Text style={activeParkingScreenStyles.gracePeriodDeadlineText}>
                    {gracePeriodDeadline}
                  </Text>
                </View>

                <Text style={activeParkingScreenStyles.gracePeriodModalText}>
                  Time remaining:
                </Text>

                <View style={activeParkingScreenStyles.gracePeriodDeadlineContainer}>
                  <Text style={activeParkingScreenStyles.gracePeriodDeadlineText}>
                    {formatTimeRemaining(gracePeriodRemainingMs)}
                  </Text>
                </View>
                
                <Text style={activeParkingScreenStyles.gracePeriodModalText}>
                  If you do not check in by this time, your reservation will be 
                  automatically cancelled and the spot will be released.
                </Text>
              </View>
              
              <TouchableOpacity 
                style={activeParkingScreenStyles.gracePeriodModalButton}
                onPress={handleGracePeriodWarningClose}
              >
                <Text style={activeParkingScreenStyles.gracePeriodModalButtonText}>
                  OK, I Understand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        </View>
    </View>
  );
};

export default ActiveParkingScreen;



