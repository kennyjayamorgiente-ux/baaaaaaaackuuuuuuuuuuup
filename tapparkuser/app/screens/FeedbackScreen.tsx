// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import {
  whiteStarIconSvg,
  maroonStarIconSvg,
  darkStarIconSvg,
} from '../assets/icons/index2';
import { useTheme } from '../../contexts/ThemeContext';
import { ApiService } from '../../services/api';
import getFeedbackScreenStyles from '../styles/feedbackScreenStyles';

// Simple SVG icons
const whiteBackIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const whiteSendIconSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.5 8L0.5 1L7.5 8L0.5 15L15.5 8Z" fill="white"/>
</svg>`;

const { width, height } = Dimensions.get('window');

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

const FeedbackScreen: React.FC = () => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const styles = getFeedbackScreenStyles();

  // Get feedback_id from params
  const params = useLocalSearchParams();
  const feedbackId = params.feedbackId ? parseInt(params.feedbackId as string) : null;

  useEffect(() => {
    if (feedbackId) {
      loadFeedbackData();
    } else {
      Alert.alert('Error', 'No feedback ID provided');
      router.back();
    }
  }, [feedbackId]);

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      
      // Load feedback details
      const feedbackResponse = await ApiService.getFeedbackDetails(feedbackId!);
      console.log('📥 Feedback details response:', feedbackResponse);
      console.log('📥 Response data:', feedbackResponse.data);
      console.log('📥 Response data.feedback:', feedbackResponse.data?.feedback);
      console.log('📥 Response data.comments:', feedbackResponse.data?.comments);
      
      if (feedbackResponse.success) {
        setFeedback(feedbackResponse.data.feedback);
        // Ensure comments is always an array
        const commentsArray = Array.isArray(feedbackResponse.data.comments) 
          ? feedbackResponse.data.comments 
          : (feedbackResponse.data.comments ? [feedbackResponse.data.comments] : []);
        setComments(commentsArray);
        console.log('✅ Set comments array:', commentsArray);
      } else {
        throw new Error(feedbackResponse.message || 'Failed to load feedback');
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedbackData();
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setSubmittingComment(true);
      
      const response = await ApiService.addFeedbackComment(feedbackId!, {
        comment: newComment.trim()
      });

      if (response.success) {
        setNewComment('');
        // Reload comments to show the new one
        await loadComments();
        Alert.alert('Success', 'Comment added successfully');
      } else {
        throw new Error(response.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await ApiService.getFeedbackComments(feedbackId!);
      if (response.success) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <View key={i} style={styles.starContainer}>
          <SvgXml
            xml={i <= rating ? (isDarkMode ? darkStarIconSvg : maroonStarIconSvg) : whiteStarIconSvg}
            width={size}
            height={size}
          />
        </View>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
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

  const renderUserFeedback = () => {
    if (!feedback) return null;

    return (
      <View style={styles.playStoreCard}>
        {/* User Feedback Header */}
        <View style={styles.feedbackHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>You</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Your Review</Text>
              <View style={styles.ratingRow}>
                {renderStars(feedback.rating)}
                <Text style={styles.ratingDate}>{formatDate(feedback.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Feedback Content */}
        <View style={styles.feedbackContent}>
          <Text style={styles.feedbackText}>
            {feedback.content || 'No additional comments provided'}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            feedback.status === 'active' ? styles.activeStatus : styles.inactiveStatus
          ]}>
            <Text style={styles.statusText}>
              {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAdminReply = (comment: FeedbackComment) => {
    if (comment.role === 'user') return null; // Skip user comments in admin replies section

    return (
      <View style={styles.adminReplyCard}>
        {/* Admin Reply Header */}
        <View style={styles.adminReplyHeader}>
          <View style={styles.adminInfo}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>Dev</Text>
            </View>
            <View style={styles.adminDetails}>
              <Text style={styles.adminName}>Developer Reply</Text>
              <Text style={styles.adminReplyDate}>{formatDate(comment.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Admin Reply Content */}
        <View style={styles.adminReplyContent}>
          <Text style={styles.adminReplyText}>{comment.comment}</Text>
        </View>
      </View>
    );
  };

  const renderAddCommentSection = () => {
    return (
      <View style={styles.addCommentSection}>
        <Text style={styles.addCommentTitle}>Add a Comment</Text>
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your thoughts..."
            multiline
            value={newComment}
            onChangeText={setNewComment}
            textAlignVertical="top"
            maxLength={500}
          />
          <View style={styles.commentInputFooter}>
            <Text style={styles.charCount}>{newComment.length}/500</Text>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submittingComment) && styles.sendButtonDisabled
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SvgXml xml={whiteSendIconSvg} width={16} height={16} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A0000" />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  if (!feedback) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Feedback not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <SvgXml xml={whiteBackIconSvg} width={24} height={24} />
        </TouchableOpacity>
      </View>
    );
  }

  const adminReplies = comments.filter(comment => comment.role !== 'user');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <SvgXml xml={whiteBackIconSvg} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Review</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Feedback (Play Store Style) */}
        {renderUserFeedback()}

        {/* Admin Replies Section */}
        {adminReplies.length > 0 && (
          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Developer Replies</Text>
            {adminReplies.map((comment) => (
              <View key={comment.feedback_comment_id}>
                {renderAdminReply(comment)}
              </View>
            ))}
          </View>
        )}

        {/* No Admin Replies */}
        {adminReplies.length === 0 && (
          <View style={styles.noRepliesSection}>
            <View style={styles.noRepliesIcon}>
              <Text style={styles.noRepliesIconText}>💬</Text>
            </View>
            <Text style={styles.noRepliesTitle}>No developer replies yet</Text>
            <Text style={styles.noRepliesText}>
              The developer has not responded to your review yet. Check back later!
            </Text>
          </View>
        )}

        {/* Add Comment Section */}
        {renderAddCommentSection()}
      </ScrollView>
    </View>
  );
};

export default FeedbackScreen;

