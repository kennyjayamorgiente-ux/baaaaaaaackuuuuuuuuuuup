import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as SystemUI from 'expo-system-ui';
import SharedHeader from '../../components/SharedHeader';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '../../contexts/ThemeContext';
import { 
  maroonUsersEditIconSvg,
  maroonTimeIconSvg,
  maroonProfitHandIconSvg
} from '../assets/icons/index2';
import { ApiService } from '../../services/api';
import { 
  useScreenDimensions, 
  getAdaptiveFontSize, 
  getAdaptiveSize, 
  getAdaptivePadding, 
  getAdaptiveMargin 
} from '../../hooks/use-screen-dimensions';
import { createHistoryScreenStyles } from '../styles/historyScreenStyles';
import { getNormalizedProfileImageFromUser } from '../../utils/profileImage';

interface Plan {
  plan_id: number;
  plan_name: string;
  cost: number;
  number_of_hours: number;
  description: string;
}

const TopUpScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const screenDimensions = useScreenDimensions();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const styles = createHistoryScreenStyles(screenDimensions, colors);
  
  // PayPal state
  const [showPayPalWebView, setShowPayPalWebView] = useState(false);
  const [paypalUrl, setPaypalUrl] = useState('');
  const [paypalOrderId, setPaypalOrderId] = useState('');
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);
  const [paymentCaptured, setPaymentCaptured] = useState(false);
  const [paypalProcessingStarted, setPaypalProcessingStarted] = useState(false);

  // Profile picture component
  const ProfilePicture = ({ size = 100 }: { size?: number }) => {
    const getInitials = () => {
      if (!userProfile) return '?';
      const firstName = userProfile.first_name || '';
      const lastName = userProfile.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const profileImageUrl =
      getNormalizedProfileImageFromUser(userProfile as any) ||
      getNormalizedProfileImageFromUser(user as any);

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
              console.warn('⚠️ Failed to load profile image:', profileImageUrl, error);
            }}
          />
        </View>
      );
    }

    return (
      <View style={[styles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: 'white', fontSize: size / 3, fontWeight: 'bold' }}>{getInitials()}</Text>
      </View>
    );
  };

  const loadUserProfile = async () => {
    try {
      const profileResponse = await ApiService.getProfile();
      if (profileResponse.success) {
        setUserProfile(profileResponse.data.user);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
      fetchPlans();
    }, [])
  );

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getSubscriptionPlans();
      if (response.success) {
        setPlans(response.data);
      } else {
        Alert.alert('Error', 'Failed to load subscription plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsConfirmationModalVisible(true);
  };

  const handleCloseConfirmationModal = () => {
    setIsConfirmationModalVisible(false);
    setSelectedPlan(null);
  };

  const handleConfirmPurchase = async () => {
    if (selectedPlan) {
      try {
        setPurchasing(true);
        
        // Create PayPal order
        const response = await ApiService.createPayPalOrder(selectedPlan.plan_id);
        
        if (response.success && response.data.approvalUrl) {
          setPaypalUrl(response.data.approvalUrl);
          setPaypalOrderId(response.data.orderId);
          setShowPayPalWebView(true);
          setIsConfirmationModalVisible(false);
        } else {
          Alert.alert('Payment Failed', 'Failed to create PayPal order. Please try again.');
        }
      } catch (error) {
        console.error('PayPal order creation error:', error);
        Alert.alert('Payment Failed', 'An error occurred while creating PayPal order. Please try again.');
      } finally {
        setPurchasing(false);
      }
    }
  };

  const handlePayPalNavigation = (navState: any) => {
    const { url } = navState;
    
    // Check if payment was successful or cancelled
    if (url.includes('/success') || url.includes('/return')) {
      handlePayPalSuccess();
    } else if (url.includes('/cancel')) {
      handlePayPalCancel();
    }
  };

  const handlePayPalSuccess = async () => {
    // Prevent any duplicate processing
    if (paypalProcessingStarted || paymentCaptured) {
      console.log('PayPal processing already started, skipping duplicate');
      return;
    }

    // Set flags immediately to prevent duplicates
    setPaypalProcessingStarted(true);
    setPaymentCaptured(true);

    try {
      setIsProcessingPayPal(true);
      
      // Use the stored order ID
      if (paypalOrderId) {
        const response = await ApiService.capturePayPalOrder(paypalOrderId);
        
        if (response.success) {
          Alert.alert(
            'Payment Successful!',
            `You have successfully purchased ${selectedPlan?.plan_name}!\n\nTokens added: ${selectedPlan?.number_of_hours}\nTotal tokens remaining: ${response.data.total_hours_remaining || 'Updated'}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowPayPalWebView(false);
                  setSelectedPlan(null);
                  setPaypalOrderId('');
                  setPaymentCaptured(false);
                  setPaypalProcessingStarted(false);
                  // Navigate back to balance screen which will refresh automatically
                  router.back();
                }
              }
            ]
          );
        } else {
          Alert.alert('Payment Failed', 'Payment was successful but failed to update your account. Please contact support.');
        }
      } else {
        Alert.alert('Payment Failed', 'Order ID not found. Please try again.');
      }
    } catch (error) {
      console.error('PayPal capture error:', error);
      // Payment was successful in PayPal, so show success message anyway
      Alert.alert(
        'Payment Successful!',
        `You have successfully purchased ${selectedPlan?.plan_name}!\n\nTokens added: ${selectedPlan?.number_of_hours}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPayPalWebView(false);
              setSelectedPlan(null);
              setPaypalOrderId('');
              setPaymentCaptured(false);
              setPaypalProcessingStarted(false);
              router.back();
            }
          }
        ]
      );
    } finally {
      setIsProcessingPayPal(false);
      setShowPayPalWebView(false);
      setPaypalOrderId('');
      setPaymentCaptured(false);
      setPaypalProcessingStarted(false);
    }
  };

  const handlePayPalCancel = () => {
    Alert.alert('Payment Cancelled', 'Your payment was cancelled. No charges were made.');
    setShowPayPalWebView(false);
    setSelectedPlan(null);
    setPaypalOrderId('');
    setPaymentCaptured(false);
    setPaypalProcessingStarted(false);
  };

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Plans" 
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <View style={styles.scrollContainer}>
        {/* Profile Content Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture Section */}
          <View style={styles.fixedProfileSection}>
            <View style={styles.profilePictureContainer}>
              <ProfilePicture size={screenDimensions.isTablet ? 170 : 150} />
            </View>
            
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>PLANS</Text>
              <Text style={styles.userEmail}>CHOOSE YOUR PARKING PLAN</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.profileCardScroll} 
            showsVerticalScrollIndicator={false}
          >
            {/* Plans Section */}
            <View style={styles.spotsContainer}>
              <Text style={styles.spotsTitle}>Available Plans</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading plans...</Text>
                </View>
              ) : plans && plans.length > 0 ? (
                plans.map((plan) => (
                  <TouchableOpacity 
                    key={plan.plan_id}
                    style={styles.parkingCard}
                    onPress={() => handleSelectPlan(plan)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationHeader}>
                      <View style={styles.locationTextContainer}>
                        <Text style={styles.parkingLocation}>{plan.plan_name}</Text>
                        <Text style={styles.parkingSpotId}>PLAN-{plan.plan_id}</Text>
                      </View>
                      <Ionicons 
                        name="wallet" 
                        size={32} 
                        color={colors.primary} 
                      />
                    </View>
                    
                    <Text style={styles.parkingLabel}>Price</Text>
                    <View style={styles.timeSlotContainer}>
                      <Text style={styles.timestampDetailValue}>
                        ₱{plan.cost} pesos
                      </Text>
                    </View>
                    
                    <Text style={styles.parkingLabel}>Tokens Included</Text>
                    <View style={styles.timeSlotContainer}>
                      <Text style={styles.timestampDetailValue}>
                        {plan.number_of_hours} Tokens
                      </Text>
                    </View>
                    
                    <Text style={styles.parkingLabel}>Description</Text>
                    <Text style={styles.timestampDetailValue}>
                      {plan.description}
                    </Text>
                    
                    <View style={styles.timestampDetailRow}>
                      <Text style={styles.timestampDetailLabel}>Tap to purchase this plan</Text>
                      <Ionicons name="chevron-forward" size={16} color="#8A0000" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No plans available</Text>
                  <Text style={styles.emptySubtext}>Please check back later for available plans</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Plan Confirmation Modal */}
      <Modal
        visible={isConfirmationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseConfirmationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reservationModalContainer}>
            <View style={styles.reservationModalHeader}>
              <Text style={styles.reservationModalTitle}>Confirm Plan Selection</Text>
              <TouchableOpacity onPress={handleCloseConfirmationModal}>
                <Ionicons name="close" size={24} color="#8A0000" />
              </TouchableOpacity>
            </View>
            
            {selectedPlan && (
              <ScrollView style={styles.reservationModalContent}>
                <View style={styles.reservationDetailCard}>
                  <View style={styles.reservationDetailHeader}>
                    <Text style={styles.reservationLocation}>{selectedPlan.plan_name}</Text>
                    <Text style={styles.reservationId}>PLAN-{selectedPlan.plan_id}</Text>
                  </View>
                  
                  <View style={styles.reservationDetailSection}>
                    <Text style={styles.reservationDetailLabel}>Price</Text>
                    <Text style={[styles.reservationDetailSubValue, { marginTop: 8, marginBottom: 16 }]}>
                      ₱{selectedPlan.cost} pesos
                    </Text>
                    
                    <Text style={styles.reservationDetailLabel}>Tokens Included</Text>
                    <Text style={[styles.reservationDetailSubValue, { marginTop: 8, marginBottom: 16 }]}>
                      {selectedPlan.number_of_hours} Tokens
                    </Text>
                    
                    <Text style={styles.reservationDetailLabel}>Description</Text>
                    <Text style={[styles.reservationDetailSubValue, { marginTop: 8, marginBottom: 16 }]}>
                      {selectedPlan.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.reservationDetailCard}>
                  <View style={styles.reservationDetailSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                      <TouchableOpacity 
                        style={[styles.bookNowButton, { 
                          backgroundColor: '#6B7280',
                          flex: 1,
                          marginRight: 8,
                          paddingHorizontal: 8
                        }]}
                        onPress={handleCloseConfirmationModal}
                      >
                        <Text style={[
                          styles.bookNowButtonText, 
                          { 
                            fontSize: getAdaptiveFontSize(screenDimensions, 14),
                            textAlign: 'center'
                          }
                        ]}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.bookNowButton, { 
                          flex: 1,
                          opacity: purchasing ? 0.6 : 1,
                          paddingHorizontal: 8
                        }]}
                        onPress={handleConfirmPurchase}
                        disabled={purchasing}
                      >
                        {purchasing ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={[
                            styles.bookNowButtonText, 
                            { 
                              fontSize: getAdaptiveFontSize(screenDimensions, 14),
                              textAlign: 'center'
                            }
                          ]}>Confirm</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* PayPal WebView Modal */}
      <Modal
        visible={showPayPalWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPayPalWebView(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff', position: 'relative' }}>
          {/* WebView */}
          {isProcessingPayPal ? (
            <>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                backgroundColor: '#f8f8f8',
                borderBottomWidth: 1,
                borderBottomColor: '#ddd',
                paddingTop: Platform.OS === 'ios' ? 50 : 20,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1
              }}>
                <TouchableOpacity 
                  onPress={() => setShowPayPalWebView(false)}
                  style={{ marginRight: 15 }}
                >
                  <Text style={{ color: '#333', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
                <Text style={{ color: '#333', fontSize: 18, fontWeight: 'bold' }}>
                  PayPal Payment
                </Text>
              </View>
              
              {/* Centered Spinner */}
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: '#fff'
              }}>
                <ActivityIndicator size="large" color="#8A0000" />
                <Text style={{ 
                  marginTop: 20, 
                  fontSize: getAdaptiveFontSize(screenDimensions, 16), 
                  color: '#666',
                  textAlign: 'center'
                }}>
                  Processing payment...
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                backgroundColor: '#f8f8f8',
                borderBottomWidth: 1,
                borderBottomColor: '#ddd',
                paddingTop: Platform.OS === 'ios' ? 50 : 20
              }}>
                <TouchableOpacity 
                  onPress={() => setShowPayPalWebView(false)}
                  style={{ marginRight: 15 }}
                >
                  <Text style={{ color: '#333', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
                <Text style={{ color: '#333', fontSize: 18, fontWeight: 'bold' }}>
                  PayPal Payment
                </Text>
              </View>

              {/* WebView */}
              <WebView
                source={{ uri: paypalUrl }}
                style={{ flex: 1 }}
                originWhitelist={['*']}
                mixedContentMode="always"
                javaScriptEnabled
                domStorageEnabled
                javaScriptCanOpenWindowsAutomatically
                setSupportMultipleWindows={false}
                onNavigationStateChange={handlePayPalNavigation}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center', 
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}>
                    <ActivityIndicator size="large" color="#8A0000" />
                    <Text style={{ 
                      marginTop: 20, 
                      fontSize: getAdaptiveFontSize(screenDimensions, 16), 
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      Loading PayPal...
                    </Text>
                  </View>
                )}
                onError={(event) => {
                  console.warn('PayPal WebView error:', event.nativeEvent);
                  Alert.alert('Payment Error', 'Unable to load PayPal checkout. Please try again.');
                  setShowPayPalWebView(false);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  if (request.url.startsWith('about:')) {
                    return false;
                  }
                  return true;
                }}
              />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default TopUpScreen;
