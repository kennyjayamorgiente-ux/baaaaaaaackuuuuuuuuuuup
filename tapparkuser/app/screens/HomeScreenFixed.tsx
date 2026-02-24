// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import SharedHeader from '../../components/SharedHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useDrawer } from '../../contexts/DrawerContext';
import ApiService from '../../services/api';
import { 
  whiteCarIconSvg,
  whiteMotorIconSvg,
  whiteEbikeIconSvg
} from '../assets/icons/index2';
import { useScreenDimensions, getAdaptiveFontSize, getAdaptiveSpacing, getAdaptivePadding } from '../../hooks/use-screen-dimensions';
import { useThemeColors } from '../../contexts/ThemeContext';

export default function HomeScreenFixed() {
  const { user, isAuthenticated } = useAuth();
  const { toggleDrawer } = useDrawer();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const screenDimensions = useScreenDimensions();

  // State variables
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [parkingAreas, setParkingAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load vehicles
      const vehiclesResponse = await ApiService.getUserVehicles();
      if (vehiclesResponse.success) {
        setVehicles(vehiclesResponse.data || []);
      }

      // Load parking areas
      const areasResponse = await ApiService.getParkingAreas();
      if (areasResponse.success) {
        setParkingAreas(areasResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't show alert for network errors during development
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case 'car':
        return whiteCarIconSvg;
      case 'motorcycle':
        return whiteMotorIconSvg;
      case 'bike':
      case 'ebike':
        return whiteEbikeIconSvg;
      default:
        return whiteCarIconSvg;
    }
  };

  // Profile picture component
  const ProfilePicture = ({ size = 32 }: { size?: number }) => {
    const getInitials = () => {
      if (!user) return '?';
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
    };

    return (
      <View style={[
        styles.profilePicture, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}>
        <Text style={[
          styles.profileInitials, 
          { fontSize: getAdaptiveFontSize(screenDimensions, size * 0.4) }
        ]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaViewContext style={styles.container}>
        <SharedHeader 
          title="TapPark" 
          onMenuPress={toggleDrawer}
          rightComponent={<ProfilePicture size={screenDimensions.isTablet ? 36 : 32} />}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaViewContext>
    );
  }

  return (
    <SafeAreaViewContext style={styles.container}>
      <SharedHeader 
        title="TapPark" 
        onMenuPress={toggleDrawer}
        rightComponent={<ProfilePicture size={screenDimensions.isTablet ? 36 : 32} />}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.sloganSection, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <Text style={[styles.parkingText, { fontSize: getAdaptiveFontSize(screenDimensions, 36) }]}>Parking</Text>
          <View style={styles.madeEasyContainer}>
            <Text style={[styles.madeText, { fontSize: getAdaptiveFontSize(screenDimensions, 28) }]}>Made</Text>
            <Text style={[styles.easyText, { fontSize: getAdaptiveFontSize(screenDimensions, 28) }]}> Easy</Text>
          </View>
        </View>

        {/* Vehicles Section */}
        <View style={[styles.section, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <View style={styles.sectionHeader}>
            <SvgXml xml={whiteCarIconSvg} width={24} height={24} />
            <Text style={[styles.sectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>My Vehicles</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {vehicles.length > 0 ? vehicles.map((vehicle, index) => (
              <TouchableOpacity 
                key={vehicle.id || index} 
                style={[styles.vehicleCard, { 
                  width: screenDimensions.isTablet ? 200 : 180,
                  padding: getAdaptivePadding(screenDimensions, 16)
                }]} 
                onPress={() => {
                  Alert.alert('Vehicle Selected', `Selected: ${vehicle.brand || 'Unknown'}`);
                }}
              >
                <View style={[styles.vehicleIconContainer, {
                  width: screenDimensions.isTablet ? 100 : 90,
                  height: screenDimensions.isTablet ? 100 : 90,
                  padding: getAdaptivePadding(screenDimensions, 18)
                }]}>
                  <SvgXml 
                    xml={getVehicleIcon(vehicle.vehicle_type)} 
                    width={screenDimensions.isTablet ? 65 : 55} 
                    height={screenDimensions.isTablet ? 40 : 33} 
                  />
                </View>
                <Text style={[styles.vehicleLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Brand and Model</Text>
                <Text style={[styles.vehicleValue, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>{vehicle.brand || 'N/A'} - {vehicle.model || 'N/A'}</Text>
                <Text style={[styles.vehicleLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Display Name</Text>
                <Text style={[styles.vehicleValue, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>{vehicle.display_name || 'N/A'}</Text>
              </TouchableOpacity>
            )) : (
              <View style={[styles.emptyCard, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
                <Text style={[styles.emptyText, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>No vehicles found</Text>
                <TouchableOpacity 
                  style={[styles.addButton, { padding: getAdaptivePadding(screenDimensions, 12) }]}
                  onPress={() => router.push('/screens/AddVehicleScreen')}
                >
                  <Text style={[styles.addButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>Add Vehicle</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Parking Areas Section */}
        <View style={[styles.section, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>Available Parking</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {parkingAreas.length > 0 ? parkingAreas.map((area, index) => (
              <TouchableOpacity 
                key={area.id || index} 
                style={[styles.parkingAreaCard, { 
                  width: screenDimensions.isTablet ? 220 : 200,
                  padding: getAdaptivePadding(screenDimensions, 16)
                }]} 
                onPress={() => {
                  Alert.alert('Parking Area Selected', `Selected: ${area.name || 'Unknown Area'}`);
                }}
              >
                <Text style={[styles.parkingLocation, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>{area.name || 'Parking Area'}</Text>
                <Text style={[styles.parkingSpotId, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>Spot {area.spot_id || 'N/A'}</Text>
                <Text style={[styles.parkingLabel, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Available Time</Text>
                <Text style={[styles.parkingTime, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>2 hours</Text>
                <Text style={[styles.parkingPrice, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>₱{area.price || '50'}/hour</Text>
                <Text style={[styles.availableStatus, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Available</Text>
                <TouchableOpacity style={[styles.bookButton, { padding: getAdaptivePadding(screenDimensions, 8) }]}>
                  <Text style={[styles.bookButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 12) }]}>Book Now</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )) : (
              <View style={[styles.emptyCard, { padding: getAdaptivePadding(screenDimensions, 20) }]}>
                <Text style={[styles.emptyText, { fontSize: getAdaptiveFontSize(screenDimensions, 16) }]}>No parking areas found</Text>
                <Text style={[styles.emptySubtext, { fontSize: getAdaptiveFontSize(screenDimensions, 14) }]}>Check back later</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaViewContext>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  sloganSection: {
    alignItems: 'flex-start',
  },
  parkingText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  madeEasyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  madeText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  easyText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  horizontalScroll: {
    marginHorizontal: -20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 12,
    marginRight: 16,
    minHeight: 200,
  },
  vehicleIconContainer: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  vehicleLabel: {
    color: colors.primary,
    marginBottom: 4,
  },
  vehicleValue: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  parkingAreaCard: {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 12,
    marginRight: 12,
    minHeight: 180,
  },
  parkingLocation: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  parkingSpotId: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  parkingLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  parkingTime: {
    color: colors.text,
    flex: 1,
  },
  parkingPrice: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  availableStatus: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bookButton: {
    backgroundColor: colors.button,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  bookButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textMuted,
  },
  addButton: {
    backgroundColor: colors.button,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
  },
  profilePicture: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.textInverse,
    fontWeight: 'bold',
  },
});


