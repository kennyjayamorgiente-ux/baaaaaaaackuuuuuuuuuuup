import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { tapParkLogoSvg, darkTapParkLogoSvg } from '../app/assets/icons/index2';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

interface TermsModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  isLoading?: boolean;
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onAccept, isLoading = false }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: getResponsiveSize(20),
      width: screenWidth * 0.9,
      maxWidth: 600,
      maxHeight: screenHeight * 0.85,
      padding: getResponsivePadding(20),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: getResponsiveMargin(20),
    },
    logoContainer: {
      marginBottom: getResponsiveMargin(15),
    },
    title: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: getResponsiveMargin(5),
    },
    subtitle: {
      fontSize: getResponsiveFontSize(14),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    scrollContainer: {
      maxHeight: screenHeight * 0.5,
      marginBottom: getResponsiveMargin(20),
    },
    dateInfo: {
      marginBottom: getResponsiveMargin(15),
      paddingBottom: getResponsivePadding(15),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dateText: {
      fontSize: getResponsiveFontSize(12),
      color: colors.textSecondary,
      marginBottom: getResponsiveMargin(4),
    },
    introText: {
      fontSize: getResponsiveFontSize(14),
      color: colors.text,
      lineHeight: getResponsiveFontSize(20),
      marginBottom: getResponsiveMargin(20),
    },
    section: {
      marginBottom: getResponsiveMargin(20),
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: getResponsiveMargin(8),
    },
    sectionText: {
      fontSize: getResponsiveFontSize(14),
      color: colors.text,
      lineHeight: getResponsiveFontSize(20),
      marginBottom: getResponsiveMargin(8),
    },
    bulletPoint: {
      fontSize: getResponsiveFontSize(14),
      color: colors.text,
      lineHeight: getResponsiveFontSize(20),
      marginBottom: getResponsiveMargin(6),
      paddingLeft: getResponsivePadding(10),
    },
    subBulletPoint: {
      fontSize: getResponsiveFontSize(13),
      color: colors.textSecondary,
      lineHeight: getResponsiveFontSize(18),
      marginBottom: getResponsiveMargin(4),
      paddingLeft: getResponsivePadding(20),
    },
    buttonContainer: {
      marginTop: getResponsiveMargin(10),
    },
    acceptButton: {
      backgroundColor: colors.button,
      borderRadius: getResponsiveSize(8),
      paddingVertical: getResponsivePadding(15),
      paddingHorizontal: getResponsivePadding(30),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: getResponsiveSize(50),
    },
    acceptButtonText: {
      color: colors.buttonText,
      fontSize: getResponsiveFontSize(16),
      fontWeight: 'bold',
    },
    acceptButtonDisabled: {
      opacity: 0.6,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <SvgXml
                xml={isDarkMode ? darkTapParkLogoSvg : tapParkLogoSvg}
                width={getResponsiveSize(100)}
                height={getResponsiveSize(100)}
              />
            </View>
            <Text style={styles.title}>TERMS & CONDITIONS</Text>
            <Text style={styles.subtitle}>Please read and accept to continue</Text>
          </View>

          {/* Terms Content */}
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: getResponsivePadding(10) }}
          >
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>Effective Date: September 20, 2025</Text>
              <Text style={styles.dateText}>Valid Until: September 20, 2026</Text>
              <Text style={styles.dateText}>Last Updated: September 20, 2025</Text>
            </View>

            <Text style={styles.introText}>
              Welcome to TapPark (we, our, or us). By using the TapPark mobile or web application (App), you (User) agree to the following Terms and Conditions. Please read them carefully.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.sectionText}>
                By creating an account, reserving a parking spot, scanning a QR code, or using any TapPark service, you agree to comply with these Terms and Conditions. If you do not agree, please discontinue use of the App.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Services Provided</Text>
              <Text style={styles.sectionText}>
                TapPark allows users to:
              </Text>
              <Text style={styles.bulletPoint}>• Reserve parking slots in designated areas (Foundation Main Campus, Foundation Preparatory Academy, etc.).</Text>
              <Text style={styles.bulletPoint}>• Use QR scanning for entry and exit.</Text>
              <Text style={styles.bulletPoint}>• Pay parking fees or use subscription hours.</Text>
              <Text style={styles.bulletPoint}>• View real-time parking availability.</Text>
              <Text style={styles.sectionText}>
                Services are subject to availability and may be updated, modified, or suspended without prior notice.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
              <Text style={styles.bulletPoint}>• Provide accurate information when registering.</Text>
              <Text style={styles.bulletPoint}>• Ensure safe use of QR codes and personal credentials.</Text>
              <Text style={styles.bulletPoint}>• Park only in assigned slots and follow campus traffic rules.</Text>
              <Text style={styles.bulletPoint}>• Respect attendants and comply with security checks, including PWD verification if applicable.</Text>
              <Text style={styles.bulletPoint}>• Maintain updated payment methods (GCash, card, or subscription wallet).</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Subscription & Payments</Text>
              <Text style={styles.bulletPoint}>• Users may load subscription hours (hour wallet), which are consumed per session.</Text>
              <Text style={styles.bulletPoint}>• Subscriptions remain valid until all hours are used (no expiry unless stated).</Text>
              <Text style={styles.bulletPoint}>• Refunds are not guaranteed unless required by law.</Text>
              <Text style={styles.bulletPoint}>• Parking fees and subscription rates may change with notice.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Cancellation & Refund Policy</Text>
              <Text style={styles.bulletPoint}>• Reservations may be canceled within the App before parking starts.</Text>
              <Text style={styles.bulletPoint}>• Once QR scan entry begins, hours/fees will be deducted.</Text>
              <Text style={styles.bulletPoint}>• TapPark is not liable for missed use due to user error, expired subscriptions, or system downtime.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
              <Text style={styles.bulletPoint}>• TapPark provides slot reservations but does not guarantee vehicle safety (loss, theft, or damage in parking premises).</Text>
              <Text style={styles.bulletPoint}>• We are not responsible for downtime, internet issues, or system errors beyond our control.</Text>
              <Text style={styles.bulletPoint}>• Attendants act as verifiers, not as insurance providers.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Privacy & Data Protection</Text>
              <Text style={styles.bulletPoint}>• We collect and store user data (e.g., name, contact, vehicle info, transaction history) to operate TapPark.</Text>
              <Text style={styles.bulletPoint}>• Personal data will not be sold or shared outside authorized use, except when required by law.</Text>
              <Text style={styles.bulletPoint}>• By using TapPark, you consent to our Privacy Policy.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Account Suspension & Termination</Text>
              <Text style={styles.bulletPoint}>• We may suspend or terminate accounts that:</Text>
              <Text style={styles.subBulletPoint}>  - Violate these Terms.</Text>
              <Text style={styles.subBulletPoint}>  - Abuse the system (e.g., fraudulent bookings, misuse of QR codes).</Text>
              <Text style={styles.subBulletPoint}>  - Pose risks to other users or the platform.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Amendments</Text>
              <Text style={styles.sectionText}>
                We reserve the right to modify these Terms at any time. Users will be notified of significant updates through the App or email.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Governing Law</Text>
              <Text style={styles.sectionText}>
                These Terms are governed by the laws of the Republic of the Philippines. Any disputes will be resolved under the jurisdiction of the courts in Dumaguete City.
              </Text>
            </View>
          </ScrollView>

          {/* Accept Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.acceptButton, isLoading && styles.acceptButtonDisabled]}
              onPress={onAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.buttonText} size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>ACCEPT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TermsModal;

