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

const getMyFeedbackScreenStyles = (colors: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      color: '#FFFFFF',
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
    errorText: {
      fontSize: responsiveFontSize(16),
      color: colors.error || '#EA4335',
      marginBottom: responsivePadding(16),
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.primary || '#8A0000',
      paddingHorizontal: responsivePadding(24),
      paddingVertical: responsivePadding(12),
      borderRadius: responsivePadding(8),
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
    },

    // Feedback List
    feedbackList: {
      flex: 1,
    },
    listTitle: {
      fontSize: responsiveFontSize(18),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(16),
    },

    // Feedback Card
    feedbackCard: {
      backgroundColor: colors.cardBackground || '#FFFFFF',
      borderRadius: responsivePadding(12),
      padding: responsivePadding(16),
      marginBottom: responsivePadding(12),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },
    feedbackHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: responsivePadding(12),
    },
    ratingSection: {
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
    statusBadge: {
      paddingHorizontal: responsivePadding(8),
      paddingVertical: responsivePadding(4),
      borderRadius: responsivePadding(4),
    },
    activeStatus: {
      backgroundColor: '#34A853',
    },
    inactiveStatus: {
      backgroundColor: colors.textLight || '#9AA0A6',
    },
    statusText: {
      fontSize: responsiveFontSize(11),
      color: '#FFFFFF',
      fontWeight: '500',
    },
    feedbackContent: {
      marginBottom: responsivePadding(12),
    },
    feedbackText: {
      fontSize: responsiveFontSize(14),
      color: colors.text,
      lineHeight: responsiveFontSize(20),
    },
    feedbackFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    viewDetailsText: {
      fontSize: responsiveFontSize(14),
      color: colors.primary || '#8A0000',
      fontWeight: '500',
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: responsivePadding(60),
    },
    emptyIcon: {
      marginBottom: responsivePadding(20),
    },
    emptyIconText: {
      fontSize: responsiveFontSize(48),
    },
    emptyTitle: {
      fontSize: responsiveFontSize(20),
      fontWeight: '600',
      color: colors.text,
      marginBottom: responsivePadding(8),
      textAlign: 'center',
    },
    emptyText: {
      fontSize: responsiveFontSize(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: responsiveFontSize(20),
      marginBottom: responsivePadding(24),
      paddingHorizontal: responsivePadding(32),
    },
    goToProfileButton: {
      backgroundColor: colors.primary || '#8A0000',
      paddingHorizontal: responsivePadding(24),
      paddingVertical: responsivePadding(12),
      borderRadius: responsivePadding(8),
    },
    goToProfileButtonText: {
      color: '#FFFFFF',
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
    },
  });
};

export default getMyFeedbackScreenStyles;
