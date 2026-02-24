import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ApiService } from '../services/api';
import { useThemeColors } from '../contexts/ThemeContext';

interface ParkingLayoutViewerProps {
  areaId: number;
  onLayoutLoaded?: (layoutName: string) => void;
  onError?: (error: string) => void;
}

const ParkingLayoutViewer: React.FC<ParkingLayoutViewerProps> = ({
  areaId,
  onLayoutLoaded,
  onError
}) => {
  const colors = useThemeColors();
  const [layoutSvg, setLayoutSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [areaName, setAreaName] = useState<string>('');

  useEffect(() => {
    loadParkingLayout();
  }, [areaId]);

  const loadParkingLayout = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get all parking layouts from merge database
      const layoutsResponse = await ApiService.getParkingLayouts();
      
      if (!layoutsResponse.success) {
        throw new Error('Failed to fetch parking layouts');
      }

      // Find layout for the specific area
      const areaLayout = layoutsResponse.data.layouts.find(layout => layout.areaId === areaId);
      
      if (!areaLayout || !areaLayout.hasLayoutData) {
        throw new Error('No layout data available for this parking area');
      }

      setAreaName(areaLayout.areaName);

      // For now, we'll display a placeholder since the layout_data is stored as LONGTEXT
      // In a real implementation, you would parse the layout_data and convert it to SVG
      const placeholderSvg = `
        <svg width="100%" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${colors.backgroundSecondary}" stroke="${colors.border}" stroke-width="2"/>
          <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="24" fill="${colors.text}">
            ${areaLayout.areaName} - Floor ${areaLayout.floor}
          </text>
          <text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="16" fill="${colors.textSecondary}">
            Layout Data Available (${areaLayout.layoutDataLength} characters)
          </text>
          <text x="50%" y="70%" text-anchor="middle" font-family="Arial" font-size="14" fill="${colors.textMuted}">
            Created: ${new Date(areaLayout.createdAt).toLocaleDateString()}
          </text>
        </svg>
      `;
      
      setLayoutSvg(placeholderSvg);
      onLayoutLoaded?.(`${areaLayout.areaName}-floor-${areaLayout.floor}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load parking layout';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Error loading parking layout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    loadParkingLayout();
  };

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ 
          marginTop: 10, 
          color: colors.textSecondary,
          fontSize: 16 
        }}>
          Loading parking layout...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
      }}>
        <Text style={{ 
          color: colors.error,
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 10
        }}>
          {error}
        </Text>
        <Text 
          style={{ 
            color: colors.primary,
            fontSize: 14,
            textDecorationLine: 'underline'
          }}
          onPress={handleRetry}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  if (!layoutSvg) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
      }}>
        <Text style={{ 
          color: colors.textSecondary,
          fontSize: 16,
          textAlign: 'center'
        }}>
          No layout available for {areaName}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ 
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 20
      }}>
        {areaName} Layout
      </Text>
      
      <View style={{ 
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 10,
        margin: 10,
        overflow: 'hidden'
      }}>
        <SvgXml 
          xml={layoutSvg}
          width="100%"
          height="100%"
          style={{ 
            flex: 1 
          }}
        />
      </View>
    </View>
  );
};

export default ParkingLayoutViewer;














