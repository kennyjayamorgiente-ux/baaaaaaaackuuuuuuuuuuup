// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from "expo-router";
import ApiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useScreenDimensions, getAdaptiveFontSize, getAdaptiveSpacing, getAdaptivePadding } from '../../hooks/use-screen-dimensions';

type ScanResult = {
  data: string;
  type: string;
};

export default function QRScannerScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const screenDimensions = useScreenDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  
  // QR Scanner state
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'start' | 'end' | null>(null); // Track what action we're scanning for
  const [showTestModal, setShowTestModal] = useState(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  useEffect(() => {
    console.log('🔐 QR Scanner - Component mounted');
    console.log('🔐 QR Scanner - Permission status:', permission);
    console.log('🔐 QR Scanner - Auth Status:', {
      isAuthenticated,
      userType: user?.account_type_name,
      userId: user?.user_id,
      email: user?.email
    });

    // Request permission if not granted
    if (permission && !permission.granted) {
      console.log('📷 Requesting camera permission...');
      requestPermission().then((result) => {
        console.log('📷 Permission result:', result);
      });
    }

    // Start the scanning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {};
  }, [permission]);

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || !scanMode) return;
    
    setScanned(true);
    setIsScanning(false);
    
    try {
      // Parse the QR code data
      const qrData = JSON.parse(data);
      console.log('📱 QR Code scanned:', qrData);
      
      if (scanMode === 'start') {
        // Start parking session
        console.log('🟢 Starting parking session');
        
        try {
          console.log('🚀 Calling startParkingSessionViaQR with data:', data);
          const response = await ApiService.startParkingSessionViaQR(data);
          console.log('📡 API Response:', response);
          if (response.success) {
            Alert.alert(
              'Parking Session Started!',
              `QR Code scanned successfully!\nParking session has started.\n\nVehicle: ${response.data.vehiclePlate}\nSpot: ${response.data.spotNumber}\nArea: ${response.data.areaName}`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Error', response.message || 'Failed to start parking session');
          }
        } catch (error) {
          Alert.alert('Start Parking Failed', getErrorMessage(error, 'Failed to start parking session'));
        }
        
      } else if (scanMode === 'end') {
        // End parking session
        console.log('🔴 Ending parking session');
        
        try {
          const response = await ApiService.endParkingSessionViaQR(data);
          if (response.success) {
            Alert.alert(
              'Parking Session Ended!',
              `QR Code scanned successfully!\nParking session has ended.\n\nDuration: ${response.data.durationMinutes} minutes`,
              [{ 
                text: 'OK',
                onPress: () => {}
              }]
            );
          } else {
            Alert.alert('Error', response.message || 'Failed to end parking session');
          }
        } catch (error) {
          Alert.alert('End Parking Failed', getErrorMessage(error, 'Failed to end parking session'));
        }
      }
      
    } catch (error) {
      Alert.alert('Invalid QR Code', getErrorMessage(error, 'Could not read the QR code data.'));
    }
    
    // Reset states after scan
    setScanMode(null);
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const startScanningForStart = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setScanMode('start');
    setScanned(false);
    setIsScanning(true);
    
    // Auto-stop scanning after 10 seconds
    setTimeout(() => {
      if (isScanning) {
        setIsScanning(false);
        setScanMode(null);
      }
    }, 10000);
  };

  const startScanningForEnd = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setScanMode('end');
    setScanned(false);
    setIsScanning(true);
    
    // Auto-stop scanning after 10 seconds
    setTimeout(() => {
      if (isScanning) {
        setIsScanning(false);
        setScanMode(null);
      }
    }, 10000);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanMode(null);
  };

  // Handle permission states
  if (!permission) {
    console.log('📷 Permission not loaded yet, showing loading...');
    return (
      <View style={[styles.container, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', textAlign: 'center', margin: 20, fontSize: 16 }}>
          Loading camera...
        </Text>
      </View>
    );
  }
  
  if (!permission.granted) {
    console.log('📷 Camera permission denied, showing permission request...');
    return (
      <View style={[styles.container, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="camera-alt" size={64} color="#fff" style={{ marginBottom: 20 }} />
        <Text style={{ color: '#fff', textAlign: 'center', margin: 20, fontSize: 18, fontWeight: 'bold' }}>
          Camera Permission Required
        </Text>
        <Text style={{ color: '#fff', textAlign: 'center', margin: 20, fontSize: 14, opacity: 0.8 }}>
          Please allow camera access to scan QR codes
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 25,
            marginTop: 20
          }}
          onPress={async () => {
            console.log('📷 Requesting permission...');
            const result = await requestPermission();
            console.log('📷 Permission result:', result);
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: 'transparent',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 25,
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#fff'
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('📷 Rendering camera view with permission:', permission?.granted);
  
  return (
    <View style={styles.container}>
      <CameraView
        style={[StyleSheet.absoluteFillObject, { height: Dimensions.get('window').height }]}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onCameraReady={() => {
          console.log('📷 Camera is ready!');
        }}
        onMountError={(error) => {
          Alert.alert('Camera Error', getErrorMessage(error, 'Failed to initialize camera.'));
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer}/>
        <View style={[styles.middleContainer, { height: getFrameSize(screenDimensions) }]}>
          <View style={styles.unfocusedContainer}/>
          <View style={[styles.focusedContainer, { width: getFrameSize(screenDimensions), height: getFrameSize(screenDimensions) }]}>
            <View style={[styles.scannerFrame, { width: getFrameSize(screenDimensions), height: getFrameSize(screenDimensions) }]}>
              <View style={[styles.cornerTL, { width: getCornerSize(screenDimensions), height: getCornerSize(screenDimensions) }]} />
              <View style={[styles.cornerTR, { width: getCornerSize(screenDimensions), height: getCornerSize(screenDimensions) }]} />
              <View style={[styles.cornerBL, { width: getCornerSize(screenDimensions), height: getCornerSize(screenDimensions) }]} />
              <View style={[styles.cornerBR, { width: getCornerSize(screenDimensions), height: getCornerSize(screenDimensions) }]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    width: getFrameSize(screenDimensions) - 2,
                    transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, getFrameSize(screenDimensions) - 2]
                      })
                    }]
                  }
                ]}
              />
            </View>
          </View>
          <View style={styles.unfocusedContainer}/>
        </View>
        <View style={styles.unfocusedContainer}/>
      </View>

      <View style={styles.headerOverlay}>
        <View style={styles.placeholder} />
        <View style={[styles.titleContainer, { paddingHorizontal: getAdaptivePadding(screenDimensions, 30), paddingVertical: getAdaptivePadding(screenDimensions, 15) }]}>
          <MaterialIcons name="qr-code-scanner" size={screenDimensions.isTablet ? 28 : 24} color="#fff" />
          <Text style={[styles.title, { fontSize: getAdaptiveFontSize(screenDimensions, 24) }]}>Scan QR Code</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={[styles.statusContainer, { padding: getAdaptivePadding(screenDimensions, 15) }]}>
        <View style={[styles.statusTextContainer, { 
          paddingHorizontal: getAdaptivePadding(screenDimensions, 30), 
          paddingVertical: getAdaptivePadding(screenDimensions, 15) 
        }]}>
          <Text style={[styles.statusText, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
            {isScanning ? 
              (scanMode === 'start' ? 'Scanning to START parking session' : 
               scanMode === 'end' ? 'Scanning to END parking session' : 
               'Scanning QR code...') : 
              'Press a button to start scanning'}
          </Text>
        </View>
        
        {/* Button Container */}
        <View style={[styles.buttonContainer, { 
          marginTop: getAdaptiveSpacing(screenDimensions, 15),
          gap: getAdaptiveSpacing(screenDimensions, 15)
        }]}>
          {/* Start Parking Button - Opens camera to scan for starting */}
          <TouchableOpacity 
            style={[styles.startButton, { 
              paddingHorizontal: getAdaptivePadding(screenDimensions, 30), 
              paddingVertical: getAdaptivePadding(screenDimensions, 15) 
            }]} 
            onPress={startScanningForStart}
            disabled={isScanning}
          >
            <MaterialIcons name="play-arrow" size={screenDimensions.isTablet ? 28 : 24} color="#fff" />
            <Text style={[styles.startButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
              {isScanning && scanMode === 'start' ? 'Scanning...' : 'Start Parking'}
            </Text>
          </TouchableOpacity>
          
          {/* End Parking Button - Opens camera to scan for ending */}
          <TouchableOpacity 
            style={[styles.endButton, { 
              paddingHorizontal: getAdaptivePadding(screenDimensions, 30), 
              paddingVertical: getAdaptivePadding(screenDimensions, 15) 
            }]} 
            onPress={startScanningForEnd}
            disabled={isScanning}
          >
            <MaterialIcons name="stop" size={screenDimensions.isTablet ? 28 : 24} color="#fff" />
            <Text style={[styles.endButtonText, { fontSize: getAdaptiveFontSize(screenDimensions, 18) }]}>
              {isScanning && scanMode === 'end' ? 'Scanning...' : 'End Parking'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getFrameSize = (screenDimensions: any) => {
  if (screenDimensions.isTablet) {
    return screenDimensions.isLandscape ? 600 : 500;
  }
  return screenDimensions.screenSize === 'small' ? 400 : 480;
};

const getCornerSize = (screenDimensions: any) => {
  return screenDimensions.isTablet ? 25 : 20;
};
const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60
  },
  titleContainer: {
    backgroundColor: '#800000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  title: { 
    fontSize: 24, 
    color: '#fff'
  },
  closeButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  placeholder: {
    width: 40,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: -60
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  middleContainer: {
    flexDirection: 'row'
  },
  focusedContainer: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    position: 'relative'
  },
  scannerFrame: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    position: 'relative'
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#FF0000'
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: '#FF0000'
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#FF0000'
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#FF0000'
  },
  scanLine: {
    height: 2,
    backgroundColor: '#FF0000',
    opacity: 0.7
  },
  statusContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 15
  },
  statusTextContainer: {
    backgroundColor: '#800000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    gap: 15,
  },
  scanButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  startButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  endButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  manualButtonContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  manualEndButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  resetButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

