import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpirationModal } from '../contexts/ExpirationModalContext';
import { useThemeColors } from '../contexts/ThemeContext';

// Helper function to format charged hours in a more readable way
const formatChargedHours = (decimalHours: number): string => {
  if (!decimalHours || decimalHours === 0) return '0.00 hrs';
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  if (hours === 0 && minutes > 0) {
    // Only minutes, show as minutes
    return `${minutes} min`;
  } else if (hours > 0 && minutes === 0) {
    // Only hours, show as hours
    return `${hours} hr`;
  } else {
    // Both hours and minutes
    return `${hours} hr ${minutes} min`;
  }
};

interface ExpirationModalProps {
  styles?: any;
}

const ExpirationModal: React.FC<ExpirationModalProps> = ({ styles }) => {
  const { showExpirationModal, expirationDetails, handleExpirationModalClose } = useExpirationModal();
  const colors = useThemeColors();

  if (!showExpirationModal || !expirationDetails) {
    return null;
  }

  const defaultStyles = {
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      maxWidth: 320,
      width: '100%',
      alignItems: 'stretch',
      borderWidth: 1,
      borderColor: '#FF3B30',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FF3B30',
      marginLeft: 8,
    },
    content: {
      marginBottom: 20,
    },
    text: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },
    billingContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    billingTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    billingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    billingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    billingValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    billingTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 8,
    },
    formula: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 4,
    },
    button: {
      backgroundColor: '#FF3B30',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  };

  const modalStyles = styles || defaultStyles;

  return (
    <Modal
      visible={showExpirationModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleExpirationModalClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.header}>
            <Ionicons name="close-circle" size={32} color="#FF3B30" />
            <Text style={modalStyles.title}>Reservation Expired</Text>
          </View>

          <View style={modalStyles.content}>
            <Text style={modalStyles.text}>
              Your reservation for {expirationDetails?.spotNumber || 'your spot'} at {expirationDetails?.areaName || 'the selected area'} expired because check-in did not happen in time.
            </Text>
            <Text style={modalStyles.text}>
              The spot has been released for other users. You can book another spot if it is still available.
            </Text>

            {expirationDetails?.billingBreakdown && (
              <View style={modalStyles.billingContainer}>
                <Text style={modalStyles.billingTitle}>Billing Details</Text>
                <View style={modalStyles.billingRow}>
                  <Text style={modalStyles.billingLabel}>Wait Time</Text>
                  <Text style={modalStyles.billingValue}>
                    {expirationDetails.billingBreakdown.waitTimeMinutes} min
                  </Text>
                </View>
                <View style={modalStyles.billingRow}>
                  <Text style={modalStyles.billingLabel}>Parking Time</Text>
                  <Text style={modalStyles.billingValue}>
                    {expirationDetails.billingBreakdown.parkingTimeMinutes} min
                  </Text>
                </View>
                <View style={[modalStyles.billingRow, modalStyles.billingTotal]}>
                  <Text style={modalStyles.billingLabel}>Total Charged</Text>
                  <Text style={modalStyles.billingValue}>
                    {formatChargedHours(expirationDetails.billingBreakdown.totalChargedHours)}
                  </Text>
                </View>
                {expirationDetails.billingBreakdown.breakdown && (
                  <Text style={modalStyles.formula}>
                    {expirationDetails.billingBreakdown.breakdown}
                  </Text>
                )}
                <Text style={modalStyles.formula}>
                  Charged hours will be deducted from your balance.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={modalStyles.button}
            onPress={handleExpirationModalClose}
          >
            <Text style={modalStyles.buttonText}>OK, Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExpirationModal;
