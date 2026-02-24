import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Modal } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import ApiService from '../../services/api';
import { useTheme, useThemeColors } from '../../contexts/ThemeContext';
import { useScreenDimensions } from '../../hooks/use-screen-dimensions';
import SharedHeader from '../../components/SharedHeader';

interface Plan {
  plan_id: number;
  plan_name: string;
  cost: number;
  number_of_hours: number;
  description: string;
}

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const screenDimensions = useScreenDimensions();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // PayPal WebView state
  const [showPayPalWebView, setShowPayPalWebView] = useState(false);
  const [paypalUrl, setPaypalUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#000000');
    }
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getSubscriptionPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    Alert.alert(
      'Confirm Purchase',
      `Purchase ${plan.plan_name} for ₱${plan.cost}?\n\nYou will receive ${plan.number_of_hours} parking hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to Payment', onPress: () => handlePayPalCheckout(plan) }
      ]
    );
  };

  const handlePayPalCheckout = async (plan: Plan) => {
    try {
      setIsProcessing(true);
      
      const response = await ApiService.createPayPalOrder(plan.plan_id);
      
      if (response.success && response.data) {
        const { orderId, approvalUrl } = response.data;
        
        setCurrentOrderId(orderId);
        setPaypalUrl(approvalUrl);
        setShowPayPalWebView(true);
      } else {
        Alert.alert('Error', 'Failed to create PayPal order');
      }
    } catch (error) {
      console.error('PayPal checkout error:', error);
      Alert.alert('Error', 'Failed to initiate PayPal payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('WebView URL:', url);

    // Check if user completed payment
    if (url.includes('success') || url.includes('approved')) {
      setShowPayPalWebView(false);
      
      // Capture the payment
      try {
        setIsProcessing(true);
        const response = await ApiService.capturePayPalOrder(currentOrderId);
        
        if (response.success) {
          Alert.alert(
            'Success!',
            `${response.message}\n\n${response.data.hours_added} hours added to your account.`,
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Payment capture failed');
        }
      } catch (error) {
        console.error('Capture error:', error);
        Alert.alert('Error', 'Failed to complete payment');
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Check if user cancelled
    if (url.includes('cancel')) {
      setShowPayPalWebView(false);
      
      try {
        await ApiService.cancelPayPalOrder(currentOrderId);
        Alert.alert('Cancelled', 'Payment was cancelled');
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 30,
      textAlign: 'center',
    },
    planCard: {
      backgroundColor: colors.card,
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedPlanCard: {
      borderColor: colors.primary,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    planName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    planHours: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    planDescription: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 15,
    },
    selectButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
    },
    selectButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      color: colors.textSecondary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 5,
    },
    webView: {
      flex: 1,
    },
    processingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    processingText: {
      color: '#FFFFFF',
      marginTop: 10,
      fontSize: 16,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Subscription Plans" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader title="Subscription Plans" />
      
      <ScrollView style={styles.scrollContent}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Select a subscription plan to add parking hours</Text>

        {plans.map((plan) => (
          <View
            key={plan.plan_id}
            style={[
              styles.planCard,
              selectedPlan?.plan_id === plan.plan_id && styles.selectedPlanCard
            ]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.plan_name}</Text>
              <Text style={styles.planPrice}>₱{plan.cost}</Text>
            </View>
            
            <Text style={styles.planHours}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              {' '}{plan.number_of_hours} Parking Hours
            </Text>
            
            {plan.description && (
              <Text style={styles.planDescription}>{plan.description}</Text>
            )}
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handlePlanSelect(plan)}
              disabled={isProcessing}
            >
              <Text style={styles.selectButtonText}>
                {isProcessing && selectedPlan?.plan_id === plan.plan_id
                  ? 'Processing...'
                  : 'Purchase with PayPal'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* PayPal WebView Modal */}
      <Modal
        visible={showPayPalWebView}
        animationType="slide"
        onRequestClose={() => setShowPayPalWebView(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PayPal Payment</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowPayPalWebView(false);
                Alert.alert('Cancelled', 'Payment was cancelled');
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <WebView
            source={{ uri: paypalUrl }}
            style={styles.webView}
            originWhitelist={['*']}
            mixedContentMode="always"
            javaScriptEnabled
            domStorageEnabled
            javaScriptCanOpenWindowsAutomatically
            setSupportMultipleWindows={false}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            onError={(event) => {
              console.warn('PayPal WebView error:', event.nativeEvent);
              Alert.alert('Payment Error', 'Unable to load PayPal checkout. Please try again.');
              setShowPayPalWebView(false);
            }}
          />
        </View>
      </Modal>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.processingText}>Processing payment...</Text>
        </View>
      )}
    </View>
  );
}
