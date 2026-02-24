import { StyleSheet } from 'react-native';
import { 
  getAdaptiveFontSize, 
  getAdaptiveSize, 
  getAdaptivePadding, 
  getAdaptiveMargin 
} from '../../hooks/use-screen-dimensions';

// Type for theme colors
type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  profileCard: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  border: string;
  shadow: string;
  overlay: string;
  success: string;
  error: string;
  warning: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
};

export const createHistoryScreenStyles = (screenDimensions: any, colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  backgroundSection: {
    height: screenDimensions.height * 0.3,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.profileCard,
    borderTopLeftRadius: getAdaptiveSize(screenDimensions, 25),
    borderTopRightRadius: getAdaptiveSize(screenDimensions, 25),
    borderWidth: 0,
    borderColor: 'transparent',
    paddingTop: getAdaptivePadding(screenDimensions, 25),
    paddingBottom: 0,
    paddingHorizontal: getAdaptivePadding(screenDimensions, 20),
    height: screenDimensions.height * 0.80,
    zIndex: 2,
    shadowOpacity: 0,
    elevation: 0,
  },
  profileCardScroll: {
    flex: 1,
  },
  fixedProfileSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 30),
  },
  profilePictureContainer: {
    position: 'relative',
    marginTop: -getAdaptiveSize(screenDimensions, 70),
    backgroundColor: 'transparent',
    borderRadius: getAdaptiveSize(screenDimensions, 90),
    width: getAdaptiveSize(screenDimensions, 200),
    height: getAdaptiveSize(screenDimensions, 200),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginTop: getAdaptiveSize(screenDimensions, 15),
  },
  userName: {
    fontSize: getAdaptiveFontSize(screenDimensions, 24),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getAdaptiveMargin(screenDimensions, 5),
    letterSpacing: 1,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  spotsContainer: {
    flex: 1,
  },
  spotsTitle: {
    fontSize: getAdaptiveFontSize(screenDimensions, 20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getAdaptiveMargin(screenDimensions, 12),
    gap: getAdaptiveMargin(screenDimensions, 10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getAdaptiveSize(screenDimensions, 10),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 10),
    paddingVertical: getAdaptivePadding(screenDimensions, 6),
    gap: getAdaptiveMargin(screenDimensions, 6),
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: getAdaptiveFontSize(screenDimensions, 13),
    paddingVertical: 0,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 10),
    borderWidth: 1,
    borderColor: colors.border,
    padding: getAdaptivePadding(screenDimensions, 3),
    gap: getAdaptiveMargin(screenDimensions, 4),
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getAdaptiveMargin(screenDimensions, 4),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 8),
    paddingVertical: getAdaptivePadding(screenDimensions, 6),
    borderRadius: getAdaptiveSize(screenDimensions, 8),
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.primary,
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getAdaptiveMargin(screenDimensions, 8),
    marginBottom: getAdaptiveMargin(screenDimensions, 14),
  },
  filterDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getAdaptiveMargin(screenDimensions, 6),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 18),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 12),
    paddingVertical: getAdaptivePadding(screenDimensions, 7),
  },
  filterDropdownAnchor: {
    position: 'relative',
    alignSelf: 'flex-start',
    zIndex: 20,
  },
  filterDropdownTriggerText: {
    color: colors.text,
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: '600',
  },
  filterDropdownMenuInline: {
    position: 'absolute',
    top: getAdaptiveSize(screenDimensions, 42),
    left: 0,
    width: getAdaptiveSize(screenDimensions, 210),
    backgroundColor: colors.card,
    borderRadius: getAdaptiveSize(screenDimensions, 14),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: getAdaptivePadding(screenDimensions, 6),
    shadowOpacity: 0,
    elevation: 0,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getAdaptivePadding(screenDimensions, 14),
    paddingVertical: getAdaptivePadding(screenDimensions, 10),
  },
  filterDropdownItemActive: {
    backgroundColor: colors.backgroundSecondary,
  },
  filterDropdownItemText: {
    color: colors.text,
    fontSize: getAdaptiveFontSize(screenDimensions, 13),
    fontWeight: '500',
  },
  filterDropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 18),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 12),
    paddingVertical: getAdaptivePadding(screenDimensions, 6),
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  gridListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  parkingCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: '#8A0000',
    borderRadius: 12,
    padding: getAdaptivePadding(screenDimensions, 12),
    marginBottom: getAdaptiveMargin(screenDimensions, 10),
    position: 'relative',
    shadowOpacity: 0,
    elevation: 0,
  },
  parkingCardGrid: {
    width: '48%',
    minHeight: getAdaptiveSize(screenDimensions, 170),
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 6),
  },
  locationTextContainer: {
    flex: 1,
  },
  parkingLocation: {
    fontSize: getAdaptiveFontSize(screenDimensions, 11),
    color: colors.textSecondary,
    marginBottom: 0,
  },
  parkingSpotId: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getAdaptiveMargin(screenDimensions, 2),
  },
  statusPill: {
    paddingHorizontal: getAdaptivePadding(screenDimensions, 8),
    paddingVertical: getAdaptivePadding(screenDimensions, 4),
    borderRadius: getAdaptiveSize(screenDimensions, 10),
  },
  statusPillText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 10),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  compactMetaContainer: {
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
    gap: getAdaptiveMargin(screenDimensions, 2),
  },
  compactMetaText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.text,
    fontWeight: '500',
  },
  logoIcon: {
    width: getAdaptiveSize(screenDimensions, 60),
    height: getAdaptiveSize(screenDimensions, 60),
    resizeMode: 'contain',
  },
  parkingLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textSecondary,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  timeSlotContainer: {
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  parkingTime: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
    flex: 1,
  },
  hoursDeductedText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.primary,
    fontWeight: '600',
    marginTop: getAdaptiveMargin(screenDimensions, 4),
  },
  durationText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: getAdaptiveMargin(screenDimensions, 2),
  },
  parkingPrice: {
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  historyDate: {
    fontSize: getAdaptiveFontSize(screenDimensions, 11),
    color: colors.textSecondary,
    marginBottom: 0,
  },
  parkingStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  completedStatus: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: 'bold',
    color: colors.success,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getAdaptiveMargin(screenDimensions, 8),
  },
  buttonContainerGrid: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  trashButton: {
    backgroundColor: colors.backgroundSecondary,
    padding: getAdaptivePadding(screenDimensions, 6),
    borderRadius: getAdaptiveSize(screenDimensions, 6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    backgroundColor: colors.backgroundSecondary,
    padding: getAdaptivePadding(screenDimensions, 6),
    borderRadius: getAdaptiveSize(screenDimensions, 6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    backgroundColor: '#8A0000',
    paddingHorizontal: getAdaptivePadding(screenDimensions, 10),
    paddingVertical: getAdaptivePadding(screenDimensions, 6),
    borderRadius: 6,
  },
  bookButtonText: {
    color: 'white',
    fontSize: getAdaptiveFontSize(screenDimensions, 11),
    fontWeight: 'bold',
  },
  // Vehicle Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleSelectionModalContainer: {
    backgroundColor: 'white',
    borderRadius: getAdaptiveSize(screenDimensions, 16),
    padding: getAdaptivePadding(screenDimensions, 24),
    margin: getAdaptiveMargin(screenDimensions, 20),
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
  },
  customFilterModalContainer: {
    backgroundColor: colors.card,
    borderRadius: getAdaptiveSize(screenDimensions, 16),
    padding: getAdaptivePadding(screenDimensions, 20),
    margin: getAdaptiveMargin(screenDimensions, 20),
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  customFilterHint: {
    color: colors.textSecondary,
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    marginBottom: getAdaptiveMargin(screenDimensions, 10),
  },
  customRangePreview: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getAdaptiveSize(screenDimensions, 10),
    padding: getAdaptivePadding(screenDimensions, 10),
    marginBottom: getAdaptiveMargin(screenDimensions, 10),
    gap: getAdaptiveMargin(screenDimensions, 4),
  },
  customRangePreviewText: {
    color: colors.text,
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: '600',
  },
  customCalendar: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getAdaptiveSize(screenDimensions, 10),
    marginBottom: getAdaptiveMargin(screenDimensions, 12),
    overflow: 'hidden',
  },
  customFilterLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 13),
    color: colors.text,
    fontWeight: '600',
    marginBottom: getAdaptiveMargin(screenDimensions, 6),
    marginTop: getAdaptiveMargin(screenDimensions, 4),
  },
  customFilterInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: getAdaptiveSize(screenDimensions, 10),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 12),
    paddingVertical: getAdaptivePadding(screenDimensions, 10),
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: getAdaptiveMargin(screenDimensions, 10),
  },
  customFilterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: getAdaptiveMargin(screenDimensions, 10),
    marginTop: getAdaptiveMargin(screenDimensions, 8),
  },
  customFilterClearButton: {
    paddingHorizontal: getAdaptivePadding(screenDimensions, 14),
    paddingVertical: getAdaptivePadding(screenDimensions, 10),
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  customFilterClearText: {
    color: colors.text,
    fontSize: getAdaptiveFontSize(screenDimensions, 13),
    fontWeight: '600',
  },
  customFilterApplyButton: {
    paddingHorizontal: getAdaptivePadding(screenDimensions, 14),
    paddingVertical: getAdaptivePadding(screenDimensions, 10),
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    backgroundColor: colors.primary,
  },
  customFilterApplyText: {
    color: '#FFFFFF',
    fontSize: getAdaptiveFontSize(screenDimensions, 13),
    fontWeight: '700',
  },
  vehicleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
  },
  vehicleModalTitle: {
    fontSize: getAdaptiveFontSize(screenDimensions, 20),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  // Reservation Details Modal Styles
  reservationModalContainer: {
    backgroundColor: 'white',
    borderRadius: getAdaptiveSize(screenDimensions, 16),
    padding: getAdaptivePadding(screenDimensions, 24),
    margin: getAdaptiveMargin(screenDimensions, 20),
    maxHeight: '85%',
    minHeight: 400,
    width: '90%',
    alignSelf: 'center',
  },
  reservationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: getAdaptivePadding(screenDimensions, 16),
  },
  reservationModalTitle: {
    fontSize: getAdaptiveFontSize(screenDimensions, 20),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  reservationModalContent: {
    flex: 1,
    minHeight: 200,
  },
  reservationDetailCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 12),
    padding: getAdaptivePadding(screenDimensions, 20),
  },
  reservationDetailHeader: {
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: getAdaptivePadding(screenDimensions, 16),
  },
  reservationLocation: {
    fontSize: getAdaptiveFontSize(screenDimensions, 18),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  reservationId: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.primary,
    fontWeight: '600',
  },
  reservationDetailSection: {
    marginBottom: getAdaptiveMargin(screenDimensions, 16),
  },
  reservationDetailLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  reservationDetailValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 2),
  },
  reservationDetailSubValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    marginBottom: getAdaptiveMargin(screenDimensions, 2),
  },
  vehicleCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
  },
  vehicleCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 12),
    padding: getAdaptivePadding(screenDimensions, 16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: getAdaptiveMargin(screenDimensions, 4),
    minHeight: getAdaptiveSize(screenDimensions, 200),
  },
  selectedVehicleCard: {
    borderWidth: 3,
    borderColor: '#8A0000',
  },
  vehicleIconContainer: {
    backgroundColor: '#8A0000',
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    padding: getAdaptivePadding(screenDimensions, 12),
    marginBottom: getAdaptiveMargin(screenDimensions, 12),
    width: getAdaptiveSize(screenDimensions, 48),
    height: getAdaptiveSize(screenDimensions, 48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBrandLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textMuted,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  vehicleBrand: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
    textAlign: 'center',
  },
  vehicleDisplayLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textMuted,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  vehicleDisplayName: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  vehiclePlateLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textMuted,
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  vehiclePlateNumber: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
  },
  progressIndicatorContainer: {
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
  },
  progressBar: {
    height: getAdaptiveSize(screenDimensions, 4),
    backgroundColor: colors.gray300,
    borderRadius: getAdaptiveSize(screenDimensions, 2),
    overflow: 'hidden',
  },
  progressHandle: {
    position: 'absolute',
    width: getAdaptiveSize(screenDimensions, 20),
    height: getAdaptiveSize(screenDimensions, 8),
    backgroundColor: '#8A0000',
    borderRadius: getAdaptiveSize(screenDimensions, 4),
    top: getAdaptiveSize(screenDimensions, -2),
  },
  vehicleSelectionScroll: {
    marginHorizontal: -getAdaptivePadding(screenDimensions, 24),
  },
  vehicleSelectionScrollContent: {
    paddingHorizontal: getAdaptivePadding(screenDimensions, 24),
  },
  bookNowButton: {
    backgroundColor: '#8A0000',
    paddingVertical: getAdaptivePadding(screenDimensions, 16),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 24),
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 16),
    width: '100%',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookNowButtonText: {
    color: 'white',
    fontSize: getAdaptiveFontSize(screenDimensions, 18),
    fontWeight: 'bold',
  },
  bookNowButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getAdaptivePadding(screenDimensions, 40),
  },
  loadingText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    color: colors.primary,
    marginTop: getAdaptiveMargin(screenDimensions, 10),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getAdaptivePadding(screenDimensions, 40),
  },
  emptyText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 18),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  emptySubtext: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activeStatus: {
    color: colors.warning,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 4),
  },
  timestampLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.text,
    fontWeight: '600',
  },
  timestampDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  timestampDetailLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestampDetailValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  reservedStatus: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: 'bold',
    color: colors.warning,
  },
  vehicleTypeInfoContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    padding: getAdaptivePadding(screenDimensions, 12),
    marginBottom: getAdaptiveMargin(screenDimensions, 16),
    borderLeftWidth: 4,
    borderLeftColor: '#8A0000',
  },
  vehicleTypeInfoText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: '#4A5568',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  vehicleSelectionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: getAdaptiveSize(screenDimensions, 12),
    padding: getAdaptivePadding(screenDimensions, 16),
    marginRight: getAdaptiveMargin(screenDimensions, 12),
    width: getAdaptiveSize(screenDimensions, 160),
    minHeight: getAdaptiveSize(screenDimensions, 200),
  },
  vehicleSelectionCardSelected: {
    borderWidth: 3,
    borderColor: '#8A0000',
  },
  vehicleSelectionIconContainer: {
    backgroundColor: '#8A0000',
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    padding: getAdaptivePadding(screenDimensions, 12),
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 12),
    width: getAdaptiveSize(screenDimensions, 60),
    height: getAdaptiveSize(screenDimensions, 60),
    justifyContent: 'center',
    alignSelf: 'center',
  },
  vehicleSelectionLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 10),
    color: colors.primary,
    marginBottom: getAdaptiveMargin(screenDimensions, 2),
  },
  vehicleSelectionValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: getAdaptiveMargin(screenDimensions, 6),
  },
  vehicleSelectionProgressContainer: {
    marginVertical: getAdaptiveMargin(screenDimensions, 20),
    alignItems: 'center',
  },
  vehicleSelectionProgressTrack: {
    width: '100%',
    height: getAdaptiveSize(screenDimensions, 4),
    backgroundColor: colors.gray300,
    borderRadius: getAdaptiveSize(screenDimensions, 2),
    position: 'relative',
  },
  vehicleSelectionProgressHandle: {
    position: 'absolute',
    width: getAdaptiveSize(screenDimensions, 20),
    height: getAdaptiveSize(screenDimensions, 8),
    backgroundColor: '#8A0000',
    borderRadius: getAdaptiveSize(screenDimensions, 4),
    top: getAdaptiveSize(screenDimensions, -2),
  },
  vehicleSelectionBookNowButton: {
    backgroundColor: '#8A0000',
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    paddingVertical: getAdaptivePadding(screenDimensions, 16),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 32),
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  vehicleSelectionBookNowButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  vehicleSelectionBookNowButtonText: {
    color: 'white',
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    fontWeight: 'bold',
  },
  noCompatibleVehiclesContainer: {
    padding: getAdaptivePadding(screenDimensions, 40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCompatibleVehiclesText: {
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  noCompatibleVehiclesSubtext: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: getAdaptiveFontSize(screenDimensions, 20),
  },
  mismatchModalContainer: {
    backgroundColor: 'white',
    borderRadius: getAdaptiveSize(screenDimensions, 16),
    padding: getAdaptivePadding(screenDimensions, 24),
    margin: getAdaptiveMargin(screenDimensions, 20),
    maxWidth: '90%',
    alignSelf: 'center',
  },
  mismatchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
  },
  mismatchModalTitle: {
    fontSize: getAdaptiveFontSize(screenDimensions, 20),
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  mismatchContent: {
    marginBottom: getAdaptiveMargin(screenDimensions, 24),
  },
  mismatchMessage: {
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    color: '#333',
    textAlign: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 20),
    lineHeight: getAdaptiveFontSize(screenDimensions, 24),
  },
  mismatchDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    padding: getAdaptivePadding(screenDimensions, 16),
    marginBottom: getAdaptiveMargin(screenDimensions, 16),
  },
  mismatchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  mismatchLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  mismatchValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.primary,
    fontWeight: 'bold',
  },
  mismatchSuggestion: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: getAdaptiveFontSize(screenDimensions, 20),
  },
  mismatchCloseButton: {
    backgroundColor: '#8A0000',
    paddingVertical: getAdaptivePadding(screenDimensions, 12),
    paddingHorizontal: getAdaptivePadding(screenDimensions, 24),
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    alignItems: 'center',
  },
  mismatchCloseButtonText: {
    color: 'white',
    fontSize: getAdaptiveFontSize(screenDimensions, 16),
    fontWeight: 'bold',
  },
  // Billing Breakdown Styles
  billingBreakdownContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: getAdaptiveSize(screenDimensions, 8),
    padding: getAdaptivePadding(screenDimensions, 16),
    marginTop: getAdaptiveMargin(screenDimensions, 8),
  },
  billingBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getAdaptiveMargin(screenDimensions, 8),
  },
  billingBreakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: getAdaptivePadding(screenDimensions, 8),
    marginTop: getAdaptiveMargin(screenDimensions, 4),
  },
  billingBreakdownLabel: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  billingBreakdownValue: {
    fontSize: getAdaptiveFontSize(screenDimensions, 14),
    color: colors.text,
    fontWeight: '600',
  },
  billingBreakdownFormula: {
    fontSize: getAdaptiveFontSize(screenDimensions, 12),
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: getAdaptiveMargin(screenDimensions, 8),
    backgroundColor: '#E8F4FD',
    padding: getAdaptivePadding(screenDimensions, 8),
    borderRadius: getAdaptiveSize(screenDimensions, 4),
  },
});

