// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import SharedHeader from '../../components/SharedHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { useLoading } from '../../contexts/LoadingContext';
import { SvgXml } from 'react-native-svg';
import { 
  tapParkLogoSvg,
  maroonLocationIconSvg,
  maroonTimeIconSvg,
  maroonDebitIconSvg,
  maroonArrowToTopRightIconSvg,
  maroonArrowToBottomLeftIconSvg,
  maroonProfitHandIconSvg,
  darkTapParkLogoSvg,
  darkTimeIconSvg,
  darkArrowToTopRightIconSvg,
  darkArrowToBottomLeftIconSvg,
  darkProfitHandIconSvg
} from '../assets/icons/index2';
import { ApiService } from '../../services/api';
import { useScreenDimensions } from '../../hooks/use-screen-dimensions';
import { getBalanceScreenStyles } from '../styles/balanceScreenStyles';
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


// Helper function to format decimal hours to HH.MM format (e.g., 83.5 -> "83.30")
const formatHoursToHHMM = (decimalHours: number): string => {
  if (!decimalHours || decimalHours === 0) return '0.00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}.${minutes.toString().padStart(2, '0')}`;
};

const BalanceScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const { showLoading, hideLoading } = useLoading();
  const screenDimensions = useScreenDimensions();
  const balanceScreenStyles = getBalanceScreenStyles(colors);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [subscriptionBalance, setSubscriptionBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | 'month' | 'year' | 'lastyear' | 'custom'>('all');
  const [isFilterDropdownVisible, setIsFilterDropdownVisible] = useState(false);
  const [isCustomFilterModalVisible, setIsCustomFilterModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const contentScrollRef = useRef<ScrollView>(null);

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
        <View style={[balanceScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
          <ExpoImage
            source={{ uri: profileImageUrl }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={({ error }) => {
              console.warn('⚠️ Failed to load profile image (BalanceScreen):', profileImageUrl, error);
            }}
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[balanceScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[balanceScreenStyles.profileInitials, { fontSize: size * 0.3 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  // Load user profile and transactions from API
  const loadBalanceData = React.useCallback(async (options: { showSpinner?: boolean } = {}) => {
    const { showSpinner = true } = options;
    try {
      if (showSpinner) {
        setIsLoading(true);
      }
      
      // Load user profile
      const profileResponse = await ApiService.getProfile();
      if (profileResponse.success) {
        setUserProfile(profileResponse.data.user);
      }

      // Load subscription balance
      const subscriptionResponse = await ApiService.getSubscriptionBalance();
      if (subscriptionResponse.success) {
        setSubscriptionBalance(subscriptionResponse.data);
      }

      // Load payment history (transactions) using AJAX
      console.log('🔄 Loading payment history...');
      const transactionsResponse = await ApiService.getPaymentHistory(1, 20);
      console.log('📊 Transactions response:', transactionsResponse);
      
      if (transactionsResponse.success) {
        console.log('✅ Transactions loaded successfully');
        console.log('📋 Number of transactions:', transactionsResponse.data.payments?.length || 0);
        console.log('📋 First transaction:', transactionsResponse.data.payments?.[0]);
        
        // Debug each transaction to check for number_of_hours
        if (transactionsResponse.data.payments?.length > 0) {
          transactionsResponse.data.payments.forEach((transaction, index) => {
            console.log(`🔍 Transaction ${index + 1}:`, {
              payment_id: transaction.payment_id,
              plan_name: transaction.location_name,
              number_of_hours: transaction.number_of_hours,
              cost: transaction.cost,
              amount: transaction.amount,
              payment_type: transaction.payment_type
            });
          });
        }
        
        setTransactions(transactionsResponse.data.payments || []);
      } else {
        console.error('❌ Failed to load transactions:', transactionsResponse.message);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading balance data:', error);
      Alert.alert('Error', 'Failed to load balance information');
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadBalanceData();
      const intervalId = setInterval(() => {
        loadBalanceData({ showSpinner: false });
      }, 60 * 1000);

      return () => {
        clearInterval(intervalId);
      };
    }, [loadBalanceData])
  );

  // Format transaction amount for display
  const formatTransactionAmount = (transaction: any) => {
    console.log('Transaction data:', { 
      payment_id: transaction.payment_id,
      payment_type: transaction.payment_type,
      subscription_id: transaction.subscription_id,
      plan_name: transaction.plan_name,
      number_of_hours: transaction.number_of_hours,
      amount: transaction.amount
    });
    
    if (transaction.type === 'parking') {
      // For parking sessions, show hours deducted
      const hoursDeducted = transaction.hours_deducted || 0;
      return `- ${formatHoursToHHMM(hoursDeducted)} Token`;
    } else if (transaction.payment_type === 'subscription') {
      // For subscription purchases - RELY ON number_of_hours from plans table
      const hours = transaction.number_of_hours;
      if (!hours) {
        console.warn('⚠️ number_of_hours is missing from transaction:', transaction.payment_id);
        return '+ 0 Tokens (data missing)';
      }
      return `+ ${hours} Tokens`;
    } else {
      // Other payment types
      return `- ${transaction.amount || 0}`;
    }
  };

  // Get subscription plan name
  const getSubscriptionPlanName = (transaction: any) => {
    return transaction.subscription_plan_name || transaction.plan_name || 'Subscription Plan';
  };

  // Get transaction icon based on type
  const getTransactionIcon = (transaction: any) => {
    const topRightIcon = isDarkMode ? darkArrowToTopRightIconSvg : maroonArrowToTopRightIconSvg;
    const bottomLeftIcon = isDarkMode ? darkArrowToBottomLeftIconSvg : maroonArrowToBottomLeftIconSvg;
    if (transaction.type === 'parking') {
      return topRightIcon; // Parking consumes hours
    } else {
      return transaction.payment_type === 'subscription' ? bottomLeftIcon : topRightIcon;
    }
  };

  // Handle transaction selection and open modal
  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsTransactionModalVisible(true);
  };

  // Close transaction modal
  const closeTransactionModal = () => {
    setIsTransactionModalVisible(false);
    setSelectedTransaction(null);
  };

  // Format transaction date
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction status color
  const getTransactionStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
      case 'cancelled':
        return '#F44336';
      default:
        return '#8A0000';
    }
  };

  const parseTransactionDate = (transaction: any): Date | null => {
    const sourceDate = transaction?.created_at || transaction?.updated_at || transaction?.date || transaction?.time_stamp;
    if (!sourceDate) return null;
    const parsed = new Date(sourceDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseInputDate = (value: string): Date | null => {
    if (!value?.trim()) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case '7days':
        return 'Last 7 Days';
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year';
      case 'lastyear':
        return 'Last Year';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} to ${customEndDate}`;
        }
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  const filteredTransactions = React.useMemo(() => {
    const now = new Date();
    const lowerQuery = searchQuery.trim().toLowerCase();
    const customStart = parseInputDate(customStartDate);
    const customEnd = parseInputDate(customEndDate);
    const customEndInclusive = customEnd ? new Date(customEnd.getTime() + (24 * 60 * 60 * 1000) - 1) : null;

    return transactions.filter((transaction) => {
      const searchable = [
        String(transaction.payment_id || ''),
        transaction.payment_type || '',
        transaction.type || '',
        transaction.location_name || '',
        transaction.spot_number || '',
        transaction.subscription_plan_name || transaction.plan_name || '',
        transaction.status || '',
        String(transaction.reference_number || ''),
      ].join(' ').toLowerCase();

      const matchesSearch = !lowerQuery || searchable.includes(lowerQuery);
      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;
      const recordDate = parseTransactionDate(transaction);
      if (!recordDate) return false;

      if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        return recordDate >= sevenDaysAgo && recordDate <= now;
      }

      if (dateFilter === 'month') {
        return (
          recordDate.getMonth() === now.getMonth() &&
          recordDate.getFullYear() === now.getFullYear()
        );
      }

      if (dateFilter === 'year') {
        return recordDate.getFullYear() === now.getFullYear();
      }

      if (dateFilter === 'lastyear') {
        return recordDate.getFullYear() === (now.getFullYear() - 1);
      }

      if (dateFilter === 'custom') {
        if (!customStart || !customEndInclusive) return true;
        return recordDate >= customStart && recordDate <= customEndInclusive;
      }

      return true;
    });
  }, [transactions, searchQuery, dateFilter, customStartDate, customEndDate]);

  const applyCustomDateFilter = () => {
    const start = parseInputDate(customStartDate);
    const end = parseInputDate(customEndDate);

    if (!start || !end) {
      Alert.alert('Invalid date', 'Please select both start and end dates.');
      return;
    }

    if (start > end) {
      Alert.alert('Invalid range', 'Start date must be before or equal to end date.');
      return;
    }

    setDateFilter('custom');
    setIsCustomFilterModalVisible(false);
  };

  const clearCustomDateFilter = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    setDateFilter('all');
    setIsCustomFilterModalVisible(false);
  };

  const handleCustomCalendarDayPress = (day: { dateString: string }) => {
    const selectedDate = day.dateString;

    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(selectedDate);
      setCustomEndDate('');
      return;
    }

    if (selectedDate < customStartDate) {
      setCustomStartDate(selectedDate);
      return;
    }

    setCustomEndDate(selectedDate);
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};

    if (!customStartDate) return marked;

    if (!customEndDate) {
      marked[customStartDate] = {
        startingDay: true,
        endingDay: true,
        color: colors.primary,
        textColor: '#FFFFFF',
      };
      return marked;
    }

    let cursor = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T00:00:00`);

    while (cursor <= end) {
      const key = cursor.toISOString().split('T')[0];
      const isStart = key === customStartDate;
      const isEnd = key === customEndDate;
      marked[key] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: colors.primary,
        textColor: '#FFFFFF',
      };
      cursor.setDate(cursor.getDate() + 1);
    }

    return marked;
  };

  return (
    <View style={balanceScreenStyles.container}>
      <SharedHeader 
        title="Balance" 
        showBackButton={true}
        onBackPress={() => {
          showLoading();
          router.back();
          setTimeout(() => hideLoading(), 500);
        }}
      />
      
      <ScrollView 
        style={balanceScreenStyles.scrollContainer}
        contentContainerStyle={balanceScreenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile Card */}
        <View style={balanceScreenStyles.profileCard}>
          {/* Profile Picture Section */}
          <View style={balanceScreenStyles.profilePictureSection}>
            <View style={balanceScreenStyles.profilePictureContainer}>
              <ProfilePicture size={screenDimensions.isTablet ? 170 : 150} />
            </View>
            <View style={balanceScreenStyles.userInfoContainer}>
              {isLoading ? (
                <View style={balanceScreenStyles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={balanceScreenStyles.loadingText}>Loading...</Text>
                </View>
              ) : userProfile ? (
                <>
                  <Text style={balanceScreenStyles.userName}>
                    {userProfile.first_name?.toUpperCase()} {userProfile.last_name?.toUpperCase()}
                  </Text>
                  <Text style={balanceScreenStyles.userEmail}>{userProfile.email}</Text>
                </>
              ) : (
                <>
                  <Text style={balanceScreenStyles.userName}>USER</Text>
                  <Text style={balanceScreenStyles.userEmail}>No profile data</Text>
                </>
              )}
            </View>
          </View>

          {/* Scrollable Content Area */}
          <ScrollView 
            ref={contentScrollRef}
            style={balanceScreenStyles.profileContentScroll}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowScrollTopButton(offsetY > 200);
            }}
            scrollEventThrottle={16}
          >
            {/* Debit Card Container */}
            <View style={balanceScreenStyles.debitCardContainer}>
            {/* TapPark Logo - Top Right */}
            <View style={balanceScreenStyles.topRightLogo}>
              <SvgXml 
                xml={isDarkMode ? darkTapParkLogoSvg : tapParkLogoSvg}
                width={getResponsiveSize(70)}
                height={getResponsiveSize(70)}
              />
            </View>

            {/* Owner Name */}
            <View style={balanceScreenStyles.ownerNameSection}>
              <Text style={balanceScreenStyles.ownerNameText}>
                {userProfile ? `${userProfile.first_name?.toUpperCase()} ${userProfile.last_name?.toUpperCase()}` : 'USER'}
              </Text>
            </View>

            {/* Student ID Section */}
            <View style={balanceScreenStyles.studentIdSection}>
              <View style={balanceScreenStyles.studentIdInfo}>
                <Text style={balanceScreenStyles.studentIdLabel}>STUDENT ID</Text>
                <Text style={balanceScreenStyles.studentIdText}>
                  {userProfile?.external_user_id || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Balance Section */}
            <View style={balanceScreenStyles.balanceSection}>
              <View style={balanceScreenStyles.balanceInfo}>
                <SvgXml 
                  xml={isDarkMode ? darkTimeIconSvg : maroonTimeIconSvg}
                  width={getResponsiveSize(32)}
                  height={getResponsiveSize(32)}
                />
                <Text
                  style={balanceScreenStyles.balanceText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {subscriptionBalance ? `${formatHoursToHHMM(subscriptionBalance.total_hours_remaining || 0)} Tokens` : '0.00 Tokens'}
                </Text>
              </View>
              <TouchableOpacity 
                style={balanceScreenStyles.topUpButton}
                onPress={() => router.push('/screens/TopUpScreen')}
              >
                <Text style={balanceScreenStyles.topUpText}>+ ADD TOKENS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transactions Section */}
          <View style={balanceScreenStyles.transactionsSection}>
            <View style={balanceScreenStyles.transactionsHeader}>
              <SvgXml 
                xml={isDarkMode ? darkProfitHandIconSvg : maroonProfitHandIconSvg}
                width={getResponsiveSize(20)}
                height={getResponsiveSize(20)}
              />
              <Text style={balanceScreenStyles.transactionsTitle}>Transactions:</Text>
            </View>

            <View style={balanceScreenStyles.controlsContainer}>
              <View style={balanceScreenStyles.searchContainer}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={balanceScreenStyles.searchInput}
                  placeholder="Search by ID, location, type..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={balanceScreenStyles.viewToggleContainer}>
                <TouchableOpacity
                  style={[
                    balanceScreenStyles.viewToggleButton,
                    viewMode === 'list' && balanceScreenStyles.viewToggleButtonActive,
                  ]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons name="list" size={16} color={viewMode === 'list' ? '#FFFFFF' : colors.primary} />
                  <Text
                    style={[
                      balanceScreenStyles.viewToggleText,
                      viewMode === 'list' && balanceScreenStyles.viewToggleTextActive,
                    ]}
                  >
                    List
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    balanceScreenStyles.viewToggleButton,
                    viewMode === 'grid' && balanceScreenStyles.viewToggleButtonActive,
                  ]}
                  onPress={() => setViewMode('grid')}
                >
                  <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#FFFFFF' : colors.primary} />
                  <Text
                    style={[
                      balanceScreenStyles.viewToggleText,
                      viewMode === 'grid' && balanceScreenStyles.viewToggleTextActive,
                    ]}
                  >
                    Grid
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={balanceScreenStyles.filterRow}>
              <View style={balanceScreenStyles.filterDropdownAnchor}>
                <TouchableOpacity
                  style={balanceScreenStyles.filterDropdownTrigger}
                  onPress={() => setIsFilterDropdownVisible((prev) => !prev)}
                >
                  <Ionicons name="filter" size={14} color={colors.primary} />
                  <Text style={balanceScreenStyles.filterDropdownTriggerText}>{getDateFilterLabel()}</Text>
                  <Ionicons
                    name={isFilterDropdownVisible ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                {isFilterDropdownVisible && (
                  <View style={balanceScreenStyles.filterDropdownMenuInline}>
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: '7days', label: 'Last 7 Days' },
                      { key: 'month', label: 'This Month' },
                      { key: 'year', label: 'This Year' },
                      { key: 'lastyear', label: 'Last Year' },
                      { key: 'custom', label: 'Custom Range' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          balanceScreenStyles.filterDropdownItem,
                          dateFilter === option.key && balanceScreenStyles.filterDropdownItemActive,
                        ]}
                        onPress={() => {
                          if (option.key === 'custom') {
                            setIsFilterDropdownVisible(false);
                            setIsCustomFilterModalVisible(true);
                            return;
                          }
                          setDateFilter(option.key as 'all' | '7days' | 'month' | 'year' | 'lastyear' | 'custom');
                          setIsFilterDropdownVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            balanceScreenStyles.filterDropdownItemText,
                            dateFilter === option.key && balanceScreenStyles.filterDropdownItemTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {dateFilter === option.key && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            
            {isLoading ? (
              <View style={balanceScreenStyles.transactionsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={balanceScreenStyles.transactionsLoadingText}>Loading transactions...</Text>
              </View>
            ) : filteredTransactions.length === 0 ? (
              <View style={balanceScreenStyles.emptyTransactionsContainer}>
                <Text style={balanceScreenStyles.emptyTransactionsText}>No transactions found</Text>
                <Text style={balanceScreenStyles.emptyTransactionsSubtext}>Try changing your search or date filter</Text>
              </View>
            ) : (
              <View style={viewMode === 'grid' ? balanceScreenStyles.gridListContainer : undefined}>
              {filteredTransactions.map((transaction, index) => (
                <TouchableOpacity 
                  key={transaction.payment_id || index} 
                  style={[
                    balanceScreenStyles.transactionItem,
                    viewMode === 'grid' && balanceScreenStyles.transactionItemGrid
                  ]}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={0.7}
                >
                  <View style={balanceScreenStyles.transactionIconContainer}>
                    <SvgXml 
                      xml={getTransactionIcon(transaction)}
                      width={getResponsiveSize(16)}
                      height={getResponsiveSize(16)}
                    />
                  </View>
                  <View
                    style={[
                      balanceScreenStyles.transactionInfo,
                      viewMode === 'grid' && balanceScreenStyles.transactionInfoGrid
                    ]}
                  >
                    <Text style={balanceScreenStyles.transactionAmount}>
                      {formatTransactionAmount(transaction)}
                    </Text>
                    {transaction.payment_type === 'subscription' && (
                      <Text style={balanceScreenStyles.transactionPlanName}>
                        {getSubscriptionPlanName(transaction)}
                      </Text>
                    )}
                    <Text style={balanceScreenStyles.transactionDateText}>
                      {formatTransactionDate(transaction.created_at || transaction.date)}
                    </Text>
                  </View>
                  {viewMode === 'list' && (
                    <SvgXml 
                      xml={isDarkMode ? darkTimeIconSvg : maroonTimeIconSvg}
                      width={getResponsiveSize(16)}
                      height={getResponsiveSize(16)}
                    />
                  )}
                </TouchableOpacity>
              ))}
              </View>
            )}
          </View>
          </ScrollView>
        </View>
      </ScrollView>
      {showScrollTopButton && (
        <TouchableOpacity
          style={balanceScreenStyles.scrollTopButton}
          onPress={() => contentScrollRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isCustomFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCustomFilterModalVisible(false)}
      >
        <View style={balanceScreenStyles.modalOverlay}>
          <View style={balanceScreenStyles.customFilterModalContainer}>
            <View style={balanceScreenStyles.customFilterModalHeader}>
              <Text style={balanceScreenStyles.customFilterModalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setIsCustomFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={balanceScreenStyles.customFilterHint}>
              Tap a start date, then tap an end date.
            </Text>

            <View style={balanceScreenStyles.customRangePreview}>
              <Text style={balanceScreenStyles.customRangePreviewText}>
                Start: {customStartDate || 'Not selected'}
              </Text>
              <Text style={balanceScreenStyles.customRangePreviewText}>
                End: {customEndDate || 'Not selected'}
              </Text>
            </View>

            <Calendar
              markingType="period"
              markedDates={getMarkedDates()}
              onDayPress={handleCustomCalendarDayPress}
              theme={{
                calendarBackground: colors.card,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                arrowColor: colors.primary,
                textDisabledColor: colors.textSecondary,
                todayTextColor: colors.primary,
              }}
              style={balanceScreenStyles.customCalendar}
            />

            <View style={balanceScreenStyles.customFilterActions}>
              <TouchableOpacity
                style={balanceScreenStyles.customFilterClearButton}
                onPress={clearCustomDateFilter}
              >
                <Text style={balanceScreenStyles.customFilterClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={balanceScreenStyles.customFilterApplyButton}
                onPress={applyCustomDateFilter}
              >
                <Text style={balanceScreenStyles.customFilterApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={isTransactionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeTransactionModal}
      >
        <View style={balanceScreenStyles.modalOverlay}>
          <View style={balanceScreenStyles.modalContainer}>
            {/* Modal Header */}
            <View style={balanceScreenStyles.modalHeader}>
              <Text style={balanceScreenStyles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity 
                onPress={closeTransactionModal}
                style={balanceScreenStyles.closeButton}
              >
                <Text style={balanceScreenStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {selectedTransaction && (
              <ScrollView style={balanceScreenStyles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Transaction Type */}
                <View style={balanceScreenStyles.detailRow}>
                  <Text style={balanceScreenStyles.detailLabel}>Type:</Text>
                  <View style={balanceScreenStyles.detailValueContainer}>
                    <SvgXml 
                      xml={getTransactionIcon(selectedTransaction)}
                      width={getResponsiveSize(20)}
                      height={getResponsiveSize(20)}
                    />
                    <Text style={balanceScreenStyles.detailValue}>
                      {selectedTransaction.type === 'parking' ? 'Parking Session' : 
                       selectedTransaction.payment_type === 'subscription' ? 'Add Tokens' : 'Payment'}
                    </Text>
                  </View>
                </View>

                {/* Subscription Plan Name */}
                {selectedTransaction.payment_type === 'subscription' && (
                  <View style={balanceScreenStyles.detailRow}>
                    <Text style={balanceScreenStyles.detailLabel}>Plan:</Text>
                    <Text style={balanceScreenStyles.detailValue}>
                      {getSubscriptionPlanName(selectedTransaction)}
                    </Text>
                  </View>
                )}

                {/* Amount */}
                <View style={balanceScreenStyles.detailRow}>
                  <Text style={balanceScreenStyles.detailLabel}>Amount:</Text>
                  <Text style={[balanceScreenStyles.detailValue, balanceScreenStyles.amountValue]}>
                    {formatTransactionAmount(selectedTransaction)}
                  </Text>
                </View>

                {/* Date */}
                <View style={balanceScreenStyles.detailRow}>
                  <Text style={balanceScreenStyles.detailLabel}>Date:</Text>
                  <Text style={balanceScreenStyles.detailValue}>
                    {formatTransactionDate(selectedTransaction.created_at || selectedTransaction.date)}
                  </Text>
                </View>

                {/* Status */}
                {selectedTransaction.status && (
                  <View style={balanceScreenStyles.detailRow}>
                    <Text style={balanceScreenStyles.detailLabel}>Status:</Text>
                    <Text style={[balanceScreenStyles.detailValue, { color: getTransactionStatusColor(selectedTransaction.status) }]}>
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </Text>
                  </View>
                )}

                {/* Transaction ID */}
                {selectedTransaction.payment_id && (
                  <View style={balanceScreenStyles.detailRow}>
                    <Text style={balanceScreenStyles.detailLabel}>Transaction ID:</Text>
                    <Text style={[balanceScreenStyles.detailValue, balanceScreenStyles.transactionId]}>
                      {selectedTransaction.payment_id}
                    </Text>
                  </View>
                )}

                {/* Parking Details */}
                {selectedTransaction.type === 'parking' && (
                  <>
                    {selectedTransaction.location_name && (
                      <View style={balanceScreenStyles.detailRow}>
                        <Text style={balanceScreenStyles.detailLabel}>Location:</Text>
                        <Text style={balanceScreenStyles.detailValue}>{selectedTransaction.location_name}</Text>
                      </View>
                    )}
                    {selectedTransaction.spot_number && (
                      <View style={balanceScreenStyles.detailRow}>
                        <Text style={balanceScreenStyles.detailLabel}>Spot:</Text>
                        <Text style={balanceScreenStyles.detailValue}>{selectedTransaction.spot_number}</Text>
                      </View>
                    )}
                    {selectedTransaction.hours_deducted && (
                      <View style={balanceScreenStyles.detailRow}>
                        <Text style={balanceScreenStyles.detailLabel}>Hours Used:</Text>
                        <Text style={balanceScreenStyles.detailValue}>{formatHoursToHHMM(selectedTransaction.hours_deducted)} Tokens</Text>
                      </View>
                    )}
                  </>
                )}

                {/* Payment Details */}
                {selectedTransaction.type !== 'parking' && (
                  <>
                    {selectedTransaction.payment_method && (
                      <View style={balanceScreenStyles.detailRow}>
                        <Text style={balanceScreenStyles.detailLabel}>Payment Method:</Text>
                        <Text style={balanceScreenStyles.detailValue}>{selectedTransaction.payment_method}</Text>
                      </View>
                    )}
                    {selectedTransaction.reference_number && (
                      <View style={balanceScreenStyles.detailRow}>
                        <Text style={balanceScreenStyles.detailLabel}>Reference:</Text>
                        <Text style={[balanceScreenStyles.detailValue, balanceScreenStyles.transactionId]}>
                          {selectedTransaction.reference_number}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Description */}
                {selectedTransaction.description && (
                  <View style={balanceScreenStyles.detailRow}>
                    <Text style={balanceScreenStyles.detailLabel}>Description:</Text>
                    <Text style={balanceScreenStyles.detailValue}>{selectedTransaction.description}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={balanceScreenStyles.modalFooter}>
              <TouchableOpacity 
                style={balanceScreenStyles.modalCloseButton}
                onPress={closeTransactionModal}
              >
                <Text style={balanceScreenStyles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles are now in balanceScreenStyles.ts

export default BalanceScreen;

