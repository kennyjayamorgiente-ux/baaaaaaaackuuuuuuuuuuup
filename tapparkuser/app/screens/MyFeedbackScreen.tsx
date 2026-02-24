import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import SharedHeader from '../../components/SharedHeader';
import { useThemeColors, useTheme } from '../../contexts/ThemeContext';
import {
  whiteStarIconSvg,
  maroonStarIconSvg,
  darkStarIconSvg,
} from '../assets/icons/index2';
import { ApiService } from '../../services/api';
import { 
  useScreenDimensions, 
  getAdaptiveSize, 
  getAdaptivePadding, 
} from '../../hooks/use-screen-dimensions';
import { createHistoryScreenStyles } from '../styles/historyScreenStyles';

interface Feedback {
  feedback_id: number;
  user_id: number;
  content: string;
  rating: number;
  status: string;
  created_at: string;
  subscription_id?: number;
}

interface FeedbackComment {
  feedback_comment_id: number;
  feedback_id: number;
  user_id: number;
  role: string;
  comment: string;
  created_at: string;
}

const MyFeedbackScreen: React.FC = () => {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const screenDimensions = useScreenDimensions();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [feedbackComments, setFeedbackComments] = useState<FeedbackComment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | 'month' | 'year' | 'lastyear' | 'custom'>('all');
  const [isFilterDropdownVisible, setIsFilterDropdownVisible] = useState(false);
  const [isCustomFilterModalVisible, setIsCustomFilterModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);

  const styles = createHistoryScreenStyles(screenDimensions, colors);

  useFocusEffect(
    React.useCallback(() => {
      loadFeedbackList();
    }, [])
  );

  const handleBackPress = () => {
    router.push('/ProfileScreen');
  };

  const loadFeedbackList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Starting feedback list load...');
      
      // Get user's feedback list
      const response = await ApiService.getUserFeedback();
      
      console.log('📥 API Response:', response);
      console.log('📥 Response success:', response.success);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response data.feedback:', response.data?.feedback);
      
      if (response.success && response.data && response.data.feedback) {
        // Ensure we have an array
        const feedback = Array.isArray(response.data.feedback) ? response.data.feedback : [];
        setFeedbackList(feedback);
        console.log('✅ Loaded feedback list:', feedback.length, 'items');
        console.log('✅ Feedback items:', feedback);
      } else {
        // Handle case where API returns success but no data
        setFeedbackList([]);
        console.warn('⚠️ No feedback data in response:', response);
        console.warn('⚠️ Response.success:', response.success);
        console.warn('⚠️ Response.data exists:', !!response.data);
        console.warn('⚠️ Response.data.feedback exists:', !!response.data?.feedback);
      }
    } catch (error) {
      console.error('❌ Error loading feedback list:', error);
      setError('Failed to load your feedback');
      setFeedbackList([]); // Set to empty array to prevent .map() errors
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedbackList();
    setRefreshing(false);
  };

  const navigateToFeedbackDetail = async (feedbackId: number) => {
    try {
      console.log('🔍 Tapping feedback item:', feedbackId);
      setLoadingDetails(true);
      setModalVisible(true);
      
      // Find the feedback from the list
      const feedback = feedbackList.find(f => f.feedback_id === feedbackId);
      console.log('🔍 Found feedback:', feedback);
      
      if (feedback) {
        setSelectedFeedback(feedback);
        console.log('✅ Set selected feedback:', feedback);
        
        // Load comments for this feedback
        console.log('🔍 Loading comments for feedbackId:', feedbackId);
        const response = await ApiService.getFeedbackDetails(feedbackId);
        console.log('📥 Feedback details response:', response);
        
        if (response.success) {
          // Ensure comments is always an array
          const commentsArray = Array.isArray(response.data.comments) 
            ? response.data.comments 
            : (response.data.comments ? [response.data.comments] : []);
          setFeedbackComments(commentsArray);
          console.log('✅ Set comments array:', commentsArray);
        } else {
          console.warn('⚠️ Failed to load feedback details:', response.message);
        }
      } else {
        console.error('❌ Feedback not found in list:', feedbackId);
      }
    } catch (error) {
      console.error('❌ Error loading feedback details:', error);
      Alert.alert('Error', 'Failed to load feedback details');
      setModalVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedFeedback(null);
    setFeedbackComments([]);
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <View key={i} style={{ marginRight: 2 }}>
          <SvgXml
            xml={i <= rating ? (isDarkMode ? darkStarIconSvg : maroonStarIconSvg) : whiteStarIconSvg}
            width={size}
            height={size}
          />
        </View>
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const parseInputDate = (value: string): Date | null => {
    if (!value?.trim()) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const filteredFeedbackList = useMemo(() => {
    const now = new Date();
    const lowerQuery = searchQuery.trim().toLowerCase();
    const customStart = parseInputDate(customStartDate);
    const customEnd = parseInputDate(customEndDate);
    const customEndInclusive = customEnd ? new Date(customEnd.getTime() + (24 * 60 * 60 * 1000) - 1) : null;

    return feedbackList.filter((feedback) => {
      const searchable = [
        `FB-${feedback.feedback_id}`,
        feedback.content || '',
        feedback.status || '',
        `${feedback.rating}/5`,
      ].join(' ').toLowerCase();

      const matchesSearch = !lowerQuery || searchable.includes(lowerQuery);
      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;

      const recordDate = new Date(feedback.created_at);
      if (Number.isNaN(recordDate.getTime())) return false;

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
  }, [feedbackList, searchQuery, dateFilter, customStartDate, customEndDate]);

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

  const handleDateFilterSelect = (filter: 'all' | '7days' | 'month' | 'year' | 'lastyear' | 'custom') => {
    if (filter === 'custom') {
      setIsFilterDropdownVisible(false);
      setIsCustomFilterModalVisible(true);
      return;
    }

    setDateFilter(filter);
    setIsFilterDropdownVisible(false);
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
      marked[key] = {
        startingDay: key === customStartDate,
        endingDay: key === customEndDate,
        color: colors.primary,
        textColor: '#FFFFFF',
      };
      cursor.setDate(cursor.getDate() + 1);
    }

    return marked;
  };

  const localStyles = StyleSheet.create({
    contentContainer: {
      flex: 1,
      paddingHorizontal: getAdaptivePadding(screenDimensions, 14),
      paddingTop: getAdaptivePadding(screenDimensions, 10),
      paddingBottom: getAdaptivePadding(screenDimensions, 10),
    },
    contentCard: {
      flex: 1,
      backgroundColor: colors.profileCard,
      borderRadius: getAdaptiveSize(screenDimensions, 14),
      paddingHorizontal: getAdaptivePadding(screenDimensions, 12),
      paddingTop: getAdaptivePadding(screenDimensions, 12),
    },
    scrollTopButton: {
      position: 'absolute',
      right: getAdaptivePadding(screenDimensions, 24),
      bottom: getAdaptivePadding(screenDimensions, 28),
      width: getAdaptiveSize(screenDimensions, 48),
      height: getAdaptiveSize(screenDimensions, 48),
      borderRadius: getAdaptiveSize(screenDimensions, 24),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      elevation: 8,
    },
  });

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="My Feedback" 
        showBackButton={true}
        onBackPress={handleBackPress}
      />
      
      <View style={localStyles.contentContainer}>
        <View style={localStyles.contentCard}>
          <ScrollView 
            ref={mainScrollRef}
            style={styles.profileCardScroll} 
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowScrollTopButton(offsetY > 200);
            }}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Feedback Items */}
            <View style={styles.spotsContainer}>
              <Text style={styles.spotsTitle}>Your Feedback</Text>
              <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={16} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search id, content, rating, status..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <View style={styles.viewToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleButton,
                      viewMode === 'list' && styles.viewToggleButtonActive
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons
                      name="list"
                      size={16}
                      color={viewMode === 'list' ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.viewToggleText,
                      viewMode === 'list' && styles.viewToggleTextActive
                    ]}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleButton,
                      viewMode === 'grid' && styles.viewToggleButtonActive
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons
                      name="grid"
                      size={16}
                      color={viewMode === 'grid' ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.viewToggleText,
                      viewMode === 'grid' && styles.viewToggleTextActive
                    ]}>Grid</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterRow}>
                <View style={styles.filterDropdownAnchor}>
                  <TouchableOpacity
                    style={styles.filterDropdownTrigger}
                    onPress={() => setIsFilterDropdownVisible((prev) => !prev)}
                  >
                    <Ionicons name="filter" size={14} color={colors.primary} />
                    <Text style={styles.filterDropdownTriggerText}>{getDateFilterLabel()}</Text>
                    <Ionicons
                      name={isFilterDropdownVisible ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {isFilterDropdownVisible && (
                    <View style={styles.filterDropdownMenuInline}>
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
                            styles.filterDropdownItem,
                            dateFilter === option.key && styles.filterDropdownItemActive
                          ]}
                          onPress={() => handleDateFilterSelect(option.key as 'all' | '7days' | 'month' | 'year' | 'lastyear' | 'custom')}
                        >
                          <Text
                            style={[
                              styles.filterDropdownItemText,
                              dateFilter === option.key && styles.filterDropdownItemTextActive
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
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading your feedback...</Text>
                </View>
              ) : error ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.bookNowButton}
                    onPress={loadFeedbackList}
                  >
                    <Text style={styles.bookNowButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredFeedbackList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No feedback yet</Text>
                  <Text style={styles.emptySubtext}>Try changing filters or search keywords</Text>
                  <TouchableOpacity
                    style={styles.bookNowButton}
                    onPress={() => router.push('/ProfileScreen')}
                  >
                    <Text style={styles.bookNowButtonText}>Go to Profile</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={viewMode === 'grid' ? styles.gridListContainer : undefined}>
                {filteredFeedbackList.map((feedback) => (
                  <TouchableOpacity 
                    key={feedback.feedback_id} 
                    style={[
                      styles.parkingCard,
                      viewMode === 'grid' && styles.parkingCardGrid
                    ]}
                    onPress={() => navigateToFeedbackDetail(feedback.feedback_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationHeader}>
                      <View style={styles.locationTextContainer}>
                        <Text style={styles.parkingSpotId}>FB-{feedback.feedback_id}</Text>
                        <Text style={styles.parkingLocation}>{formatDate(feedback.created_at)}</Text>
                      </View>
                      <View style={[
                        styles.statusPill,
                        { backgroundColor: feedback.status === 'resolved' ? '#34C759' : '#8E8E93' }
                      ]}>
                        <Text style={styles.statusPillText}>
                          {(feedback.status || 'pending').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.timeSlotContainer}>
                      {renderStars(feedback.rating)}
                    </View>

                    <Text style={styles.compactMetaText} numberOfLines={2}>
                      {feedback.content || 'No additional comments provided'}
                    </Text>

                    <Text style={styles.historyDate}>Tap to view details and admin replies</Text>
                  </TouchableOpacity>
                ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
      {showScrollTopButton && (
        <TouchableOpacity
          style={localStyles.scrollTopButton}
          onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
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
        <View style={styles.modalOverlay}>
          <View style={styles.customFilterModalContainer}>
            <View style={styles.vehicleModalHeader}>
              <Text style={styles.vehicleModalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setIsCustomFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.customFilterHint}>
              Tap a start date, then tap an end date.
            </Text>

            <View style={styles.customRangePreview}>
              <Text style={styles.customRangePreviewText}>
                Start: {customStartDate || 'Not selected'}
              </Text>
              <Text style={styles.customRangePreviewText}>
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
              style={styles.customCalendar}
            />

            <View style={styles.customFilterActions}>
              <TouchableOpacity
                style={styles.customFilterClearButton}
                onPress={clearCustomDateFilter}
              >
                <Text style={styles.customFilterClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customFilterApplyButton}
                onPress={applyCustomDateFilter}
              >
                <Text style={styles.customFilterApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Details Modal - Like Reservation Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reservationModalContainer}>
            <View style={styles.reservationModalHeader}>
              <Text style={styles.reservationModalTitle}>Feedback Details</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8A0000" />
              </TouchableOpacity>
            </View>
            
            {loadingDetails ? (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 40,
              }}>
                <ActivityIndicator size="large" color="#8A0000" />
                <Text style={{
                  fontSize: 16,
                  color: '#666',
                  marginTop: 8,
                }}>Loading feedback details...</Text>
              </View>
            ) : selectedFeedback ? (
              <ScrollView style={styles.reservationModalContent}>
                <View style={styles.reservationDetailCard}>
                  <View style={styles.reservationDetailHeader}>
                    <Text style={styles.reservationLocation}>Rating: {selectedFeedback.rating}/5</Text>
                    <Text style={styles.reservationId}>FB-{selectedFeedback.feedback_id}</Text>
                  </View>
                  
                  <View style={styles.reservationDetailSection}>
                    <Text style={styles.reservationDetailLabel}>Your Rating</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 16 }}>
                      {renderStars(selectedFeedback.rating, 20)}
                    </View>
                    
                    <Text style={styles.reservationDetailLabel}>Your Comment</Text>
                    <Text style={[styles.reservationDetailSubValue, { marginTop: 8, marginBottom: 16 }]}>
                      {selectedFeedback.content || 'No additional comments provided'}
                    </Text>
                    
                    <View style={styles.timestampDetailRow}>
                      <Text style={styles.timestampDetailLabel}>Submitted:</Text>
                      <Text style={styles.timestampDetailValue}>
                        {formatDate(selectedFeedback.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Comments Section */}
                <View style={styles.reservationDetailCard}>
                  <View style={styles.reservationDetailSection}>
                    <Text style={styles.reservationDetailLabel}>Admin Replies & Comments</Text>
                    
                    {feedbackComments.length === 0 ? (
                      <View style={{
                        backgroundColor: '#F8F9FA',
                        borderRadius: 8,
                        padding: 16,
                        alignItems: 'center',
                        marginTop: 8,
                      }}>
                        <Text style={{
                          fontSize: 14,
                          color: '#6B7280',
                        }}>No replies yet</Text>
                      </View>
                    ) : (
                      feedbackComments.map((comment) => (
                        <View key={comment.feedback_comment_id} style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                          marginTop: 8,
                          elevation: 1,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.22,
                          shadowRadius: 2.22,
                        }}>
                          <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 8,
                          }}>
                            <Text style={{
                              fontSize: 12,
                              color: '#6B7280',
                            }}>
                              {formatDate(comment.created_at)}
                            </Text>
                            <View style={{ width: 60 }} />
                          </View>
                          <Text style={{
                            fontSize: 14,
                            color: '#333',
                            lineHeight: 18,
                          }}>{comment.comment}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* User Cannot Reply Notice */}
                <View style={styles.reservationDetailCard}>
                  <View style={styles.reservationDetailSection}>
                    <Text style={styles.reservationDetailLabel}>About Replies</Text>
                    <View style={{
                      backgroundColor: '#FFF3CD',
                      borderRadius: 8,
                      padding: 16,
                      marginTop: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: '#FFC107',
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: '#856404',
                        lineHeight: 20,
                      }}>
                        Only administrators can reply to feedback. If you need to provide additional information or have follow-up questions, please submit a new feedback from your profile.
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyFeedbackScreen;
