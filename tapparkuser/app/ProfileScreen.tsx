// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import SharedHeader from '../components/SharedHeader';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';
import { getProfileScreenStyles } from './styles/profileScreenStyles';
import { 
  maroonLockIconSvg,
  maroonNewCarIconSvg,
  maroonTestPaperIconSvg,
  maroonDebitIconSvg,
  maroonInfoIconSvg,
  darkLockIconSvg,
  darkNewCarIconSvg,
  darkTestPaperIconSvg,
  darkDebitIconSvg,
  darkInfoIconSvg,
  writeMaroonIconSvg,
  whiteCustomerServiceIconSvg,
  whiteStarIconSvg,
  maroonStarIconSvg,
  darkStarIconSvg
} from './assets/icons/index2';
import { ApiService } from '../services/api';
import { useScreenDimensions } from '../hooks/use-screen-dimensions';
import { normalizeProfileImageUrl, normalizeUserProfileImageFields, withCacheBust } from '../utils/profileImage';


const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, checkAuthStatus } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const profileScreenStyles = getProfileScreenStyles(colors);
  const refreshAuth = React.useMemo(() => (
    typeof checkAuthStatus === 'function'
      ? checkAuthStatus
      : async () => {
          console.warn('⚠️ checkAuthStatus is not available from AuthContext');
        }
  ), [checkAuthStatus]);
  const screenDimensions = useScreenDimensions();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const ratingStarColor = isDarkMode ? '#D80000' : '#8A0000';

  useEffect(() => {
    setProfileImageFailed(false);
  }, [userProfile?.profile_image, userProfile?.profile_image_url, user?.profile_image, (user as any)?.profile_image_url]);

  // Profile picture component
  const ProfilePicture = ({ size = 120 }: { size?: number }) => {
    const getInitials = () => {
      const profileData = userProfile || user;
      if (!profileData) return '?';
      const firstName = profileData.first_name || '';
      const lastName = profileData.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    // Check for profile image in userProfile first, then user
    const profileImageUrl = profileImageFailed ? null : (
      normalizeProfileImageUrl(userProfile?.profile_image) ||
      normalizeProfileImageUrl((userProfile as any)?.profile_image_url) ||
      normalizeProfileImageUrl(user?.profile_image) ||
      normalizeProfileImageUrl((user as any)?.profile_image_url)
    );

    // If profile image URL is provided, show the image
    if (profileImageUrl) {
      return (
        <View style={[profileScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
          <Image
            source={{ uri: profileImageUrl }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={({ error }) => {
              console.warn('⚠️ Failed to load profile image:', profileImageUrl, error);
              setProfileImageFailed(true);
            }}
          />
        </View>
      );
    }

    // Fallback to initials
    return (
      <View style={[profileScreenStyles.profilePicture, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[profileScreenStyles.profileInitials, { fontSize: size * 0.3 }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };
  
  // Load user profile from API
  const loadUserProfile = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated before making API call
      if (!user) {
        console.log('⚠️ No user found, skipping profile load');
        setIsLoading(false);
        return;
      }
      
      const response = await ApiService.getProfile();
      if (response.success) {
        const updatedUser = normalizeUserProfileImageFields(response.data.user) as any;
        if (updatedUser?.profile_image) {
          const cacheBustedUrl = withCacheBust(updatedUser.profile_image);
          if (cacheBustedUrl) {
            updatedUser.profile_image = cacheBustedUrl;
            updatedUser.profile_image_url = cacheBustedUrl;
            console.log('Profile image URL:', cacheBustedUrl);
          }
        }
        setUserProfile(updatedUser || response.data.user);
      } else {
        console.log('⚠️ Failed to load profile from API, using cached user data');
        setUserProfile(user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to cached user data instead of showing error
      console.log('⚠️ Using cached user data due to API error');
      setUserProfile(user);
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
      // Set Android navigation bar to black
      if (Platform.OS === 'android') {
        SystemUI.setBackgroundColorAsync('#000000');
      }
    }, [])
  );
  
  const handleRateUs = () => {
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      showLoading();
      
      // Prepare feedback data
      const feedbackData = {
        rating,
        content: feedback.trim() || '', // Send empty string if no content (table requires NOT NULL)
      };
      
      console.log('Submitting feedback:', feedbackData);
      
      // Submit feedback to backend
      const response = await ApiService.submitFeedback(feedbackData);
      
      if (response.success) {
        Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
        
        // Reset form and close modal
        setRating(0);
        setFeedback('');
        setShowRatingModal(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to submit feedback. Please try again.');
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
    } finally {
      hideLoading();
    }
  };

  const menuItems = [
    {
      id: 'changePassword',
      title: 'Change Password',
      icon: isDarkMode ? darkLockIconSvg : maroonLockIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/ChangePasswordScreen');
        setTimeout(() => hideLoading(), 500);
      }
    },
    {
      id: 'registeredVehicles',
      title: 'Registered Vehicles',
      icon: isDarkMode ? darkNewCarIconSvg : maroonNewCarIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/RegisteredVehiclesScreen');
        setTimeout(() => hideLoading(), 500);
      }
    },
    {
      id: 'termsConditions',
      title: 'Terms & Conditions',
      icon: isDarkMode ? darkTestPaperIconSvg : maroonTestPaperIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/TermsAndConditionsScreen');
        setTimeout(() => hideLoading(), 500);
      }
    },
    {
      id: 'balance',
      title: 'Balance',
      icon: isDarkMode ? darkDebitIconSvg : maroonDebitIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/BalanceScreen');
        setTimeout(() => hideLoading(), 500);
      }
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: isDarkMode ? darkInfoIconSvg : maroonInfoIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/FAQScreen');
        setTimeout(() => hideLoading(), 500);
      }
    },
    {
      id: 'myFeedback',
      title: 'My Feedback',
      icon: isDarkMode ? darkStarIconSvg : maroonStarIconSvg,
      onPress: () => {
        showLoading();
        router.push('/screens/MyFeedbackScreen');
        setTimeout(() => hideLoading(), 500);
      }
    }
  ];

  const handleEditProfile = () => {
    setShowProfileModal(true);
  };

  const handleTakePhoto = async () => {
    setShowProfileModal(false);
    try {
      // Request camera permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your camera to take a photo.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseFromLibrary = async () => {
    setShowProfileModal(false);
    try {
      // Request media library permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photo library to upload a profile picture.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error choosing from library:', error);
      Alert.alert('Error', 'Failed to choose image');
    }
  };

  const handleRemovePicture = () => {
    setShowProfileModal(false);
    deleteProfilePicture();
  };

  const uploadProfilePicture = async (imageUri: string) => {
    try {
      setUploading(true);
      const response = await ApiService.uploadProfilePicture(imageUri);

      if (response.success) {
        const latestImage = response.data?.profile_image;
        if (latestImage) {
          const cacheBustedUrl = withCacheBust(latestImage);
          if (cacheBustedUrl) {
            setUserProfile((prevProfile: typeof userProfile) => prevProfile ? { ...prevProfile, profile_image: cacheBustedUrl, profile_image_url: cacheBustedUrl } : prevProfile);
          }
        }
        // Reload profile to get updated image URL
        await loadUserProfile(true);
        // Also refresh auth context
        await refreshAuth();
        Alert.alert('Success', 'Profile picture uploaded successfully');
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload profile picture. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteProfilePicture = async () => {
    try {
      Alert.alert(
        'Remove Profile Picture',
        'Are you sure you want to remove your profile picture?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                setUploading(true);
                const response = await ApiService.deleteProfilePicture();

                if (response.success) {
                  // Reload profile
                  await loadUserProfile(true);
                  // Also refresh auth context
                  await refreshAuth();
                  Alert.alert('Success', 'Profile picture removed successfully');
                } else {
                  throw new Error(response.message || 'Delete failed');
                }
              } catch (error) {
                console.error('Delete error:', error);
                Alert.alert(
                  'Delete Failed',
                  error instanceof Error ? error.message : 'Failed to remove profile picture. Please try again.'
                );
              } finally {
                setUploading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete profile picture');
    }
  };

  return (
    <View style={profileScreenStyles.container}>
      <SharedHeader title="Profile" />
      
      <View style={profileScreenStyles.scrollContainer}>

        {/* Profile Content Card */}
        <View style={profileScreenStyles.profileCard}>
          {/* Profile Picture Section */}
          <View style={profileScreenStyles.profilePictureSection}>
            <View style={profileScreenStyles.profilePictureContainer}>
              {uploading ? (
                <View style={{ width: screenDimensions.isTablet ? 170 : 150, height: screenDimensions.isTablet ? 170 : 150, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <ProfilePicture size={screenDimensions.isTablet ? 170 : 150} />
              )}
              <TouchableOpacity 
                style={profileScreenStyles.editIconContainer} 
                onPress={handleEditProfile}
                disabled={uploading}
              >
                <SvgXml 
                  xml={writeMaroonIconSvg}
                  width={screenDimensions.isTablet ? 20 : 16}
                  height={screenDimensions.isTablet ? 20 : 16}
                />
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <View style={profileScreenStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={profileScreenStyles.loadingText}>Loading profile...</Text>
              </View>
            ) : userProfile ? (
              <>
                <Text style={profileScreenStyles.userName}>
                  {userProfile.first_name} {userProfile.last_name}
                </Text>
                <Text style={profileScreenStyles.userEmail}>{userProfile.email}</Text>
              </>
            ) : (
              <>
                <Text style={profileScreenStyles.userName}>User</Text>
                <Text style={profileScreenStyles.userEmail}>No profile data</Text>
              </>
            )}
          </View>

          {/* Menu Items */}
          <View style={profileScreenStyles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={profileScreenStyles.menuItem}
                onPress={item.onPress}
              >
                <SvgXml 
                  xml={item.icon}
                  width={screenDimensions.isTablet ? 28 : 24}
                  height={screenDimensions.isTablet ? 28 : 24}
                />
                <Text style={profileScreenStyles.menuItemText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rate Us Button */}
          <TouchableOpacity style={profileScreenStyles.helpButton} onPress={handleRateUs}>
            <SvgXml 
              xml={whiteStarIconSvg}
              width={screenDimensions.isTablet ? 24 : 20}
              height={screenDimensions.isTablet ? 24 : 20}
            />
            <Text style={[
              profileScreenStyles.helpButtonText,
              isDarkMode && { color: '#FFFFFF' }
            ]}>Rate us</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Picture Options Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={profileScreenStyles.modalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={profileScreenStyles.modalContainer}>
            <Text style={profileScreenStyles.modalTitle}>Profile Picture</Text>
            <Text style={profileScreenStyles.modalSubtitle}>Choose an option</Text>
            
            <TouchableOpacity 
              style={profileScreenStyles.modalButton}
              onPress={handleTakePhoto}
            >
              <Text style={profileScreenStyles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={profileScreenStyles.modalButton}
              onPress={handleChooseFromLibrary}
            >
              <Text style={profileScreenStyles.modalButtonText}>Choose from Library</Text>
            </TouchableOpacity>

            {(userProfile?.profile_image || user?.profile_image) && (
              <TouchableOpacity 
                style={profileScreenStyles.modalButtonRemove}
                onPress={handleRemovePicture}
              >
                <Text style={profileScreenStyles.modalButtonTextRemove}>Remove Picture</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={profileScreenStyles.modalCancelButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={profileScreenStyles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={profileScreenStyles.modalOverlay}
          onPress={() => setShowRatingModal(false)}
        >
          <View style={profileScreenStyles.ratingModalContainer}>
            <View style={profileScreenStyles.ratingModalHeader}>
              <Text style={profileScreenStyles.ratingModalTitle}>Rate Your Experience</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Text style={profileScreenStyles.ratingModalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={profileScreenStyles.ratingStarsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={profileScreenStyles.starButton}
                >
                  <SvgXml 
                    xml={
                      rating >= star 
                        ? `<svg width="${screenDimensions.isTablet ? 40 : 35}" height="${screenDimensions.isTablet ? 40 : 35}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="${ratingStarColor}" stroke="${ratingStarColor}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>
                         </svg>`
                        : `<svg width="${screenDimensions.isTablet ? 40 : 35}" height="${screenDimensions.isTablet ? 40 : 35}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="none" stroke="${ratingStarColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                         </svg>`
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={profileScreenStyles.ratingLabel}>
              {rating === 0 ? 'Tap to rate' : 
               rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Very Good' : 'Excellent'}
            </Text>

            <View style={profileScreenStyles.feedbackContainer}>
              <Text style={profileScreenStyles.feedbackLabel}>Tell us more (optional)</Text>
              <TextInput
                style={[
                  profileScreenStyles.feedbackInput,
                  { height: Math.max(80, feedback.split('\n').length * 20) }
                ]}
                multiline
                numberOfLines={4}
                placeholder="Share your experience..."
                placeholderTextColor={colors.textMuted}
                value={feedback}
                onChangeText={setFeedback}
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect={true}
              />
            </View>

            <View style={profileScreenStyles.ratingModalButtons}>
              <TouchableOpacity 
                style={profileScreenStyles.ratingModalCancelButton}
                onPress={() => {
                  setRating(0);
                  setFeedback('');
                  setShowRatingModal(false);
                }}
              >
                <Text style={profileScreenStyles.ratingModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  profileScreenStyles.ratingModalSubmitButton,
                  rating === 0 && profileScreenStyles.ratingModalSubmitButtonDisabled
                ]}
                onPress={handleSubmitRating}
                disabled={rating === 0}
              >
                <Text style={profileScreenStyles.ratingModalSubmitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Styles are now imported from profileScreenStyles.ts

export default ProfileScreen;

