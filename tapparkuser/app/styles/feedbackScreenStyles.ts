import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive calculations
const responsiveFontSize = (size: number) => {
  const baseWidth = 375;
  return Math.round((size * width) / baseWidth);
};

const responsivePadding = (size: number) => {
  const baseWidth = 375;
  return Math.round((size * width) / baseWidth);
};

const getFeedbackScreenStyles = () => {
  const colors = {
    primary: '#8A0000',
    secondary: '#FFFFFF',
    background: '#F8F9FA',
    text: '#202124',
    textSecondary: '#5F6368',
    textLight: '#9AA0A6',
    border: '#E0E0E0',
    cardBackground: '#FFFFFF',
    adminBackground: '#F1F3F4',
    success: '#34A853',
    warning: '#FBBC04',
    error: '#EA4335',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.primary,
      paddingHorizontal: responsivePadding(20),
      paddingVertical: responsivePadding(15),
      paddingTop: responsivePadding(50), // Account for status bar
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    backButton: {
      width: responsivePadding(40),
      height: responsivePadding(40),
      borderRadius: responsivePadding(20),
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: responsiveFontSize(18),
      fontWeight: '600',
      color: colors.secondary,
    },
    placeholder: {
      width: responsivePadding(40),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: responsivePadding(16),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: responsivePadding(10),
      fontSize: responsiveFontSize(16),
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: {
      fontSize: responsiveFontSize(16),
      color: colors.error,
      marginBottom: responsivePadding(20),
    },

    // Play Store Style Card
    playStoreCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: responsivePadding(12),
      padding: responsivePadding(16),
      marginBottom: responsivePadding(16),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },

    // User Feedback Section
    feedbackHeader: {
      marginBottom: responsivePadding(12),
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userAvatar: {
      width: responsivePadding(40),
      height: responsivePadding(40),
      borderRadius: responsivePadding(20),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: responsivePadding(12),
    },
    userAvatarText: {
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
      color: colors.secondary,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(4),
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    starsRow: {
      flexDirection: 'row',
      marginRight: responsivePadding(8),
    },
    starContainer: {
      marginRight: responsivePadding(1),
    },
    ratingDate: {
      fontSize: responsiveFontSize(12),
      color: colors.textSecondary,
    },
    feedbackContent: {
      marginBottom: responsivePadding(12),
    },
    feedbackText: {
      fontSize: responsiveFontSize(14),
      color: colors.text,
      lineHeight: responsiveFontSize(20),
    },
    statusContainer: {
      alignSelf: 'flex-start',
    },
    statusBadge: {
      paddingHorizontal: responsivePadding(8),
      paddingVertical: responsivePadding(4),
      borderRadius: responsivePadding(4),
    },
    activeStatus: {
      backgroundColor: colors.success,
    },
    inactiveStatus: {
      backgroundColor: colors.textLight,
    },
    statusText: {
      fontSize: responsiveFontSize(11),
      color: colors.secondary,
      fontWeight: '500',
    },

    // Admin Replies Section
    repliesSection: {
      marginTop: responsivePadding(8),
    },
    repliesTitle: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(12),
    },

    // Admin Reply Card
    adminReplyCard: {
      backgroundColor: colors.adminBackground,
      borderRadius: responsivePadding(12),
      padding: responsivePadding(16),
      marginBottom: responsivePadding(12),
      borderLeftWidth: responsivePadding(4),
      borderLeftColor: colors.primary,
    },
    adminReplyHeader: {
      marginBottom: responsivePadding(8),
    },
    adminInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    adminAvatar: {
      width: responsivePadding(32),
      height: responsivePadding(32),
      borderRadius: responsivePadding(16),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: responsivePadding(10),
    },
    adminAvatarText: {
      fontSize: responsiveFontSize(12),
      fontWeight: '600',
      color: colors.secondary,
    },
    adminDetails: {
      flex: 1,
    },
    adminName: {
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(2),
    },
    adminReplyDate: {
      fontSize: responsiveFontSize(11),
      color: colors.textSecondary,
    },
    adminReplyContent: {
      marginTop: responsivePadding(4),
    },
    adminReplyText: {
      fontSize: responsiveFontSize(14),
      color: colors.text,
      lineHeight: responsiveFontSize(20),
    },

    // No Replies Section
    noRepliesSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: responsivePadding(12),
      padding: responsivePadding(24),
      alignItems: 'center',
      marginTop: responsivePadding(8),
      borderWidth: 1,
      borderColor: colors.border,
    },
    noRepliesIcon: {
      marginBottom: responsivePadding(12),
    },
    noRepliesIconText: {
      fontSize: responsiveFontSize(32),
    },
    noRepliesTitle: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(8),
      textAlign: 'center',
    },
    noRepliesText: {
      fontSize: responsiveFontSize(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: responsiveFontSize(20),
    },

    // Add Comment Section
    addCommentSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: responsivePadding(12),
      padding: responsivePadding(16),
      marginTop: responsivePadding(16),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },
    addCommentTitle: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(12),
    },
    commentInputContainer: {
      position: 'relative',
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: responsivePadding(8),
      padding: responsivePadding(12),
      fontSize: responsiveFontSize(14),
      color: colors.text,
      minHeight: responsivePadding(80),
      textAlignVertical: 'top',
      backgroundColor: colors.background,
    },
    commentInputFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: responsivePadding(8),
    },
    charCount: {
      fontSize: responsiveFontSize(12),
      color: colors.textLight,
    },
    sendButton: {
      width: responsivePadding(36),
      height: responsivePadding(36),
      borderRadius: responsivePadding(18),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.textLight,
    },
  });
};

export default getFeedbackScreenStyles;
