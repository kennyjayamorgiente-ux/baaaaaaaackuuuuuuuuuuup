import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { activeParkingScreenStyles } from '../app/styles/activeParkingScreenStyles';
import { useThemeColors } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ParkingSpot {
  id: string;
  number: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'available' | 'occupied' | 'reserved' | 'current';
  type: 'regular' | 'handicap' | 'electric';
  price?: number;
}

interface InteractiveParkingLayoutProps {
  bookingData: any;
  onSpotPress?: (spot: ParkingSpot) => void;
}

const InteractiveParkingLayout: React.FC<InteractiveParkingLayoutProps> = ({
  bookingData,
  onSpotPress,
}) => {
  const colors = useThemeColors();
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);

  // Generate parking spots data
  useEffect(() => {
    const generateParkingSpots = () => {
      const spots: ParkingSpot[] = [];
      const spotWidth = 40;
      const spotHeight = 20;
      const spacing = 5;
      const rows = 8;
      const spotsPerRow = 6;

      // Generate spots for each row
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < spotsPerRow; col++) {
          const spotNumber = row * spotsPerRow + col + 1;
          const x = 50 + col * (spotWidth + spacing);
          const y = 50 + row * (spotHeight + spacing * 2);

          // Determine spot status based on realistic patterns
          let status: ParkingSpot['status'] = 'available';
          const currentSpotNumber = bookingData?.parkingSlot?.spotNumber;
          
          if (currentSpotNumber && currentSpotNumber === spotNumber.toString()) {
            status = 'current';
          } else {
            // Create realistic parking patterns
            const random = Math.random();
            if (random > 0.75) {
              status = 'occupied';
            } else if (random > 0.95) {
              status = 'reserved';
            } else {
              status = 'available';
            }
          }

          // Determine spot type with special positioning
          let type: ParkingSpot['type'] = 'regular';
          if (spotNumber % 10 === 0) {
            type = 'handicap';
          } else if (spotNumber % 15 === 0) {
            type = 'electric';
          }

          // Special spots near entrance (first row)
          if (row === 0 && (col === 0 || col === spotsPerRow - 1)) {
            type = 'handicap';
          }

          // Electric charging stations in specific locations
          if (row === 1 && (col === 1 || col === spotsPerRow - 2)) {
            type = 'electric';
          }

          spots.push({
            id: `spot-${spotNumber}`,
            number: spotNumber.toString(),
            x,
            y,
            width: spotWidth,
            height: spotHeight,
            status,
            type,
            price: type === 'handicap' ? 0 : type === 'electric' ? 2.5 : 2.0,
          });
        }
      }

      setParkingSpots(spots);
    };

    generateParkingSpots();
  }, [bookingData]);

  const handleSpotPress = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setShowSpotModal(true);
    if (onSpotPress) {
      onSpotPress(spot);
    }
  };

  const getSpotColor = (spot: ParkingSpot) => {
    switch (spot.status) {
      case 'current':
        return colors.primary;
      case 'occupied':
        return '#FF3B30'; // Red for occupied
      case 'reserved':
        return '#FF9500'; // Orange for reserved
      case 'available':
        return '#34C759'; // Green for available
      default:
        return colors.gray500;
    }
  };

  const getSpotStrokeColor = (spot: ParkingSpot) => {
    switch (spot.type) {
      case 'handicap':
        return colors.info;
      case 'electric':
        return '#32D74B'; // Green for electric
      default:
        return colors.text;
    }
  };

  const getSpotStrokeWidth = (spot: ParkingSpot) => {
    return spot.type !== 'regular' ? 2 : 1;
  };

  const getStatusText = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'current':
        return 'Your Spot';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      case 'available':
        return 'Available';
      default:
        return 'Unknown';
    }
  };

  const getTypeText = (type: ParkingSpot['type']) => {
    switch (type) {
      case 'handicap':
        return 'Handicap Accessible';
      case 'electric':
        return 'Electric Vehicle';
      default:
        return 'Regular';
    }
  };

  const getTypeIcon = (type: ParkingSpot['type']) => {
    switch (type) {
      case 'handicap':
        return '♿';
      case 'electric':
        return '⚡';
      default:
        return '🚗';
    }
  };

  // Create SVG content for the parking layout
  const createParkingLayoutSVG = () => {
    const svgWidth = 350;
    const svgHeight = 400;

    // Create parking spots
    const spotElements = parkingSpots.map((spot) => {
      const fillColor = getSpotColor(spot);
      const strokeColor = getSpotStrokeColor(spot);
      const strokeWidth = getSpotStrokeWidth(spot);

      return `
        <rect
          x="${spot.x}"
          y="${spot.y}"
          width="${spot.width}"
          height="${spot.height}"
          fill="${fillColor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          rx="3"
          ry="3"
        />
        <text
          x="${spot.x + spot.width / 2}"
          y="${spot.y + spot.height / 2 + 3}"
          text-anchor="middle"
          font-size="10"
          font-weight="bold"
          fill="white"
        >
          ${spot.number}
        </text>
      `;
    }).join('');

    // Create legend
    const legendY = 350;
    const legendItems = [
      { color: colors.primary, label: 'Your Spot', x: 20 },
      { color: '#34C759', label: 'Available', x: 100 },
      { color: '#FF3B30', label: 'Occupied', x: 180 },
      { color: '#FF9500', label: 'Reserved', x: 260 },
    ];

    const legendElements = legendItems.map((item) => `
      <rect
        x="${item.x}"
        y="${legendY}"
        width="12"
        height="12"
        fill="${item.color}"
        rx="2"
        ry="2"
      />
      <text
        x="${item.x + 16}"
        y="${legendY + 9}"
        font-size="10"
        fill="${colors.text}"
      >
        ${item.label}
      </text>
    `).join('');

    return `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <!-- Parking lot background -->
        <rect
          x="30"
          y="30"
          width="290"
          height="300"
          fill="${colors.backgroundSecondary}"
          stroke="${colors.border}"
          stroke-width="2"
          rx="8"
          ry="8"
        />
        
        <!-- Parking spots -->
        ${spotElements}
        
        <!-- Legend -->
        <rect
          x="10"
          y="${legendY - 10}"
          width="330"
          height="40"
          fill="${colors.card}"
          stroke="${colors.border}"
          stroke-width="1"
          rx="4"
          ry="4"
        />
        ${legendElements}
        
        <!-- Title -->
        <text
          x="${svgWidth / 2}"
          y="20"
          text-anchor="middle"
          font-size="16"
          font-weight="bold"
          fill="${colors.primary}"
        >
          ${bookingData?.parkingArea?.name || 'Parking Area'}
        </text>
      </svg>
    `;
  };

  return (
    <View style={activeParkingScreenStyles.layoutContainer}>
      <ScrollView
        contentContainerStyle={activeParkingScreenStyles.layoutScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive SVG Parking Layout */}
        <View style={activeParkingScreenStyles.svgContainer}>
          <View style={activeParkingScreenStyles.svgWrapper}>
            <SvgXml
              xml={createParkingLayoutSVG()}
              width={screenWidth - 40}
              height={400}
            />
            
            {/* Touch Overlay for Interactive Spots */}
            {parkingSpots.map((spot) => (
              <TouchableOpacity
                key={spot.id}
                style={[
                  activeParkingScreenStyles.spotTouchArea,
                  {
                    left: spot.x,
                    top: spot.y,
                    width: spot.width,
                    height: spot.height,
                  }
                ]}
                onPress={() => handleSpotPress(spot)}
                activeOpacity={0.7}
              >
                <View style={[
                  activeParkingScreenStyles.spotOverlay,
                  {
                    backgroundColor: getSpotColor(spot) + '20', // Add transparency
                    borderColor: getSpotColor(spot),
                    borderWidth: spot.status === 'current' ? 2 : 1,
                  }
                ]}>
                  <Text style={[
                    activeParkingScreenStyles.spotOverlayText,
                    { color: getSpotColor(spot) }
                  ]}>
                    {spot.number}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Parking Information */}
        <View style={activeParkingScreenStyles.parkingInfoContainer}>
          <Text style={activeParkingScreenStyles.parkingInfoTitle}>
            Parking Information
          </Text>
          
          {bookingData && (
            <View style={activeParkingScreenStyles.currentSpotInfo}>
              <View style={activeParkingScreenStyles.currentSpotHeader}>
                <Text style={activeParkingScreenStyles.currentSpotTitle}>
                  Your Current Spot
                </Text>
                <View style={[
                  activeParkingScreenStyles.statusIndicator,
                  { backgroundColor: colors.primary }
                ]} />
              </View>
              
              <View style={activeParkingScreenStyles.spotDetails}>
                <Text style={activeParkingScreenStyles.spotDetailText}>
                  <Text style={activeParkingScreenStyles.spotDetailLabel}>Spot Number: </Text>
                  {bookingData.parkingSlot?.spotNumber}
                </Text>
                <Text style={activeParkingScreenStyles.spotDetailText}>
                  <Text style={activeParkingScreenStyles.spotDetailLabel}>Type: </Text>
                  {bookingData.parkingSlot?.spotType}
                </Text>
                <Text style={activeParkingScreenStyles.spotDetailText}>
                  <Text style={activeParkingScreenStyles.spotDetailLabel}>Area: </Text>
                  {bookingData.parkingArea?.name}
                </Text>
              </View>
            </View>
          )}

          {/* Legend */}
          <View style={activeParkingScreenStyles.legendContainer}>
            <Text style={activeParkingScreenStyles.legendTitle}>Legend</Text>
            <View style={activeParkingScreenStyles.legendItems}>
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={[activeParkingScreenStyles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={activeParkingScreenStyles.legendText}>Your Spot</Text>
              </View>
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={[activeParkingScreenStyles.legendColor, { backgroundColor: '#34C759' }]} />
                <Text style={activeParkingScreenStyles.legendText}>Available</Text>
              </View>
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={[activeParkingScreenStyles.legendColor, { backgroundColor: '#FF3B30' }]} />
                <Text style={activeParkingScreenStyles.legendText}>Occupied</Text>
              </View>
              <View style={activeParkingScreenStyles.legendItem}>
                <View style={[activeParkingScreenStyles.legendColor, { backgroundColor: '#FF9500' }]} />
                <Text style={activeParkingScreenStyles.legendText}>Reserved</Text>
              </View>
            </View>
          </View>

          {/* Spot Types */}
          <View style={activeParkingScreenStyles.spotTypesContainer}>
            <Text style={activeParkingScreenStyles.spotTypesTitle}>Spot Types</Text>
            <View style={activeParkingScreenStyles.spotTypesItems}>
              <View style={activeParkingScreenStyles.spotTypeItem}>
                <Text style={activeParkingScreenStyles.spotTypeIcon}>🚗</Text>
                <Text style={activeParkingScreenStyles.spotTypeText}>Regular</Text>
              </View>
              <View style={activeParkingScreenStyles.spotTypeItem}>
                <Text style={activeParkingScreenStyles.spotTypeIcon}>♿</Text>
                <Text style={activeParkingScreenStyles.spotTypeText}>Handicap</Text>
              </View>
              <View style={activeParkingScreenStyles.spotTypeItem}>
                <Text style={activeParkingScreenStyles.spotTypeIcon}>⚡</Text>
                <Text style={activeParkingScreenStyles.spotTypeText}>Electric</Text>
              </View>
            </View>
          </View>

          {/* Parking Statistics */}
          <View style={activeParkingScreenStyles.statisticsContainer}>
            <Text style={activeParkingScreenStyles.statisticsTitle}>Parking Statistics</Text>
            <View style={activeParkingScreenStyles.statisticsGrid}>
              <View style={activeParkingScreenStyles.statisticItem}>
                <Text style={activeParkingScreenStyles.statisticNumber}>
                  {parkingSpots.filter(spot => spot.status === 'available').length}
                </Text>
                <Text style={activeParkingScreenStyles.statisticLabel}>Available</Text>
              </View>
              <View style={activeParkingScreenStyles.statisticItem}>
                <Text style={activeParkingScreenStyles.statisticNumber}>
                  {parkingSpots.filter(spot => spot.status === 'occupied').length}
                </Text>
                <Text style={activeParkingScreenStyles.statisticLabel}>Occupied</Text>
              </View>
              <View style={activeParkingScreenStyles.statisticItem}>
                <Text style={activeParkingScreenStyles.statisticNumber}>
                  {parkingSpots.filter(spot => spot.status === 'reserved').length}
                </Text>
                <Text style={activeParkingScreenStyles.statisticLabel}>Reserved</Text>
              </View>
              <View style={activeParkingScreenStyles.statisticItem}>
                <Text style={activeParkingScreenStyles.statisticNumber}>
                  {parkingSpots.length}
                </Text>
                <Text style={activeParkingScreenStyles.statisticLabel}>Total Spots</Text>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={activeParkingScreenStyles.instructionsContainer}>
            <Text style={activeParkingScreenStyles.instructionsTitle}>How to Use</Text>
            <Text style={activeParkingScreenStyles.instructionsText}>
              • Tap any parking spot to view details{'\n'}
              • Your current spot is highlighted in red{'\n'}
              • Green spots are available for parking{'\n'}
              • Orange spots are reserved for other users{'\n'}
              • Blue borders indicate handicap accessible spots{'\n'}
              • Green borders indicate electric vehicle charging stations
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Spot Details Modal */}
      <Modal
        visible={showSpotModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpotModal(false)}
      >
        <View style={activeParkingScreenStyles.modalOverlay}>
          <View style={activeParkingScreenStyles.spotModalContent}>
            {selectedSpot && (
              <>
                <Text style={activeParkingScreenStyles.spotModalTitle}>
                  Spot {selectedSpot.number}
                </Text>
                
                <View style={activeParkingScreenStyles.spotModalInfo}>
                  <View style={activeParkingScreenStyles.spotModalRow}>
                    <Text style={activeParkingScreenStyles.spotModalLabel}>Status:</Text>
                    <View style={activeParkingScreenStyles.spotModalStatusContainer}>
                      <View style={[
                        activeParkingScreenStyles.spotModalStatusIndicator,
                        { backgroundColor: getSpotColor(selectedSpot) }
                      ]} />
                      <Text style={activeParkingScreenStyles.spotModalStatusText}>
                        {getStatusText(selectedSpot.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={activeParkingScreenStyles.spotModalRow}>
                    <Text style={activeParkingScreenStyles.spotModalLabel}>Type:</Text>
                    <Text style={activeParkingScreenStyles.spotModalValue}>
                      {getTypeIcon(selectedSpot.type)} {getTypeText(selectedSpot.type)}
                    </Text>
                  </View>
                  
                  <View style={activeParkingScreenStyles.spotModalRow}>
                    <Text style={activeParkingScreenStyles.spotModalLabel}>Price:</Text>
                    <Text style={activeParkingScreenStyles.spotModalValue}>
                      ${selectedSpot.price}/hour
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={activeParkingScreenStyles.spotModalCloseButton}
                  onPress={() => setShowSpotModal(false)}
                >
                  <Text style={activeParkingScreenStyles.spotModalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InteractiveParkingLayout;
