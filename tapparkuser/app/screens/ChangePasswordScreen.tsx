// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import SharedHeader from '../../components/SharedHeader';
import {
  maroonUsersEditIconSvg,
  maroonLockIconSvg,
  darkLockIconSvg
} from '../assets/icons/index2';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import { useLoading } from '../../contexts/LoadingContext';
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

const ChangePasswordScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { showLoading, hideLoading } = useLoading();
  const { isDarkMode } = useTheme();
  const screenDimensions = useScreenDimensions();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const styles = getStyles(colors);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [user?.profile_image, (user as any)?.profile_image_url]);

  // Profile picture component
  const ProfilePicture = ({ size = 120 }: { size?: number }) => {
    const getInitials = () => {
      if (!user) return '?';
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const profileImageUrl = profileImageFailed ? null : getNormalizedProfileImageFromUser(user as any);

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
              console.warn('⚠️ Failed to load profile image (ChangePasswordScreen):', profileImageUrl, error);
              setProfileImageFailed(true);
            }}
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[styles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.profileInitials, { fontSize: size * 0.3 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  const validateInputs = () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await ApiService.changePassword(currentPassword, newPassword);

      if (response.success) {
        Alert.alert(
          'Success',
          'Password changed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Navigate back
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Change Password" 
        showBackButton 
        onBackPress={() => {
          showLoading();
          router.back();
          setTimeout(() => hideLoading(), 500);
        }} 
      />

      <View style={styles.scrollContainer}>

        {/* Profile Content Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <View style={styles.profilePictureContainer}>
              <ProfilePicture size={screenDimensions.isTablet ? 140 : 120} />
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>
                {user ? `${user.first_name} ${user.last_name}` : 'User'}
              </Text>
              <Text style={styles.userEmail}>
                {user ? user.email : 'user@example.com'}
              </Text>
            </View>
          </View>

          {/* Password Input Fields */}
          <View style={styles.inputContainer}>
            {/* Current Password */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            {/* New Password */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.changePasswordButton, isLoading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <SvgXml
                xml={isDarkMode ? darkLockIconSvg : maroonLockIconSvg}
                width={getResponsiveSize(20)}
                height={getResponsiveSize(20)}
              />
            )}
            <Text style={styles.changePasswordText}>
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  backgroundSection: {
    height: screenHeight * 0.3,
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.profileCard,
    borderTopLeftRadius: getResponsiveSize(20),
    borderTopRightRadius: getResponsiveSize(20),
    paddingTop: getResponsivePadding(25),
    paddingBottom: getResponsivePadding(35),
    paddingHorizontal: getResponsivePadding(20),
    minHeight: screenHeight * 0.7,
    zIndex: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(8),
    elevation: 8,
  },
  profilePictureSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getResponsivePadding(25),
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getResponsiveSize(70),
    backgroundColor: 'transparent',
    borderRadius: getResponsiveSize(90),
    width: getResponsiveSize(180),
    height: getResponsiveSize(180),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
    backgroundColor: colors.primary,
    borderWidth: getResponsiveSize(3),
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: getResponsiveSize(3),
    borderColor: 'white',
  },
  userName: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getResponsivePadding(8),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(18),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveSize(15),
  },
  inputContainer: {
    marginTop: getResponsivePadding(15),
    marginBottom: getResponsivePadding(25),
  },
  inputField: {
    marginBottom: getResponsivePadding(20),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(18),
    color: colors.primary,
    marginBottom: getResponsivePadding(10),
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: getResponsiveSize(10),
    paddingHorizontal: getResponsivePadding(18),
    paddingVertical: getResponsivePadding(18),
    fontSize: getResponsiveFontSize(18),
    backgroundColor: colors.card,
    color: colors.text,
  },
  changePasswordButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsivePadding(20),
    paddingHorizontal: getResponsivePadding(35),
    borderRadius: getResponsiveSize(25),
    marginTop: getResponsivePadding(25),
    shadowColor: '#8A0000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(4),
    elevation: 5,
  },
  changePasswordText: {
    color: colors.textInverse,
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    marginLeft: getResponsivePadding(10),
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ChangePasswordScreen;

