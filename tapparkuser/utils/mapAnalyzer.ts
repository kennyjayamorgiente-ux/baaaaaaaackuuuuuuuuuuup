import { ParkingMapConfig } from '../config/parkingMapConfigs';

export interface MapAnalysisResult {
  coordinateBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  detectedSections: string[];
  detectedSpotFormats: string[];
  svgStructure: {
    viewBox?: { x: number; y: number; width: number; height: number };
    dimensions?: { width: number; height: number };
    coordinateSystem: 'unknown' | 'cartesian' | 'svg';
  };
  recommendations: string[];
}

export class MapAnalyzer {
  static analyzeSvg(svgString: string): MapAnalysisResult {
    const result: MapAnalysisResult = {
      coordinateBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      detectedSections: [],
      detectedSpotFormats: [],
      svgStructure: {
        coordinateSystem: 'unknown'
      },
      recommendations: []
    };

    // Extract viewBox and dimensions
    const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
    const widthMatch = svgString.match(/width=["']([^"']+)["']/);
    const heightMatch = svgString.match(/height=["']([^"']+)["']/);

    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/).filter(p => p).map(Number);
      if (parts.length >= 4) {
        result.svgStructure.viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        result.coordinateBounds = { minX: parts[0], minY: parts[1], maxX: parts[2], maxY: parts[3] };
      }
    }

    if (widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]);
      const h = parseFloat(heightMatch[1]);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        result.svgStructure.dimensions = { width: w, height: h };
      }
    }

    // Detect parking elements and their coordinates
    this.detectParkingElements(svgString, result);
    
    // Generate recommendations
    this.generateRecommendations(result);

    return result;
  }

  private static detectParkingElements(svgString: string, result: MapAnalysisResult) {
    // Find all transform coordinates
    const transformRegex = /transform=["']translate\(([^,]+),\s*([^)]+)\)["']/g;
    let match;
    const coordinates: { x: number; y: number }[] = [];

    while ((match = transformRegex.exec(svgString)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      if (!isNaN(x) && !isNaN(y)) {
        coordinates.push({ x, y });
      }
    }

    // Calculate bounds from actual parking elements
    if (coordinates.length > 0) {
      const xs = coordinates.map(c => c.x);
      const ys = coordinates.map(c => c.y);
      
      result.coordinateBounds = {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys)
      };
    }

    // Detect section names from text elements
    const textRegex = /<text[^>]*>([^<]+)<\/text>/g;
    const detectedTexts: string[] = [];
    
    while ((match = textRegex.exec(svgString)) !== null) {
      const text = match[1].trim();
      if (text && text.length <= 5 && /^[A-Z0-9]+$/.test(text)) {
        detectedTexts.push(text);
      }
    }

    result.detectedSections = [...new Set(detectedTexts)];

    // Detect spot formats from data attributes
    const spotIdRegex = /data-slot-id=["']([^"']+)["']/g;
    const spotFormats: string[] = [];
    
    while ((match = spotIdRegex.exec(svgString)) !== null) {
      const spotId = match[1];
      if (spotId.includes('-')) {
        const format = spotId.replace(/\d+/g, '#');
        spotFormats.push(format);
      }
    }

    result.detectedSpotFormats = [...new Set(spotFormats)];
  }

  private static generateRecommendations(result: MapAnalysisResult) {
    const recommendations: string[] = [];

    // Check if bounds seem reasonable
    const { minX, minY, maxX, maxY } = result.coordinateBounds;
    const width = maxX - minX;
    const height = maxY - minY;

    if (width === 0 || height === 0) {
      recommendations.push('⚠️ No parking elements detected - check SVG structure');
    } else if (width < 50 || height < 50) {
      recommendations.push('⚠️ Very small coordinate bounds - may need scaling');
    } else if (width > 2000 || height > 2000) {
      recommendations.push('⚠️ Very large coordinate bounds - may need scaling');
    }

    // Check section detection
    if (result.detectedSections.length === 0) {
      recommendations.push('⚠️ No sections detected - check text elements');
    }

    // Check spot format detection
    if (result.detectedSpotFormats.length === 0) {
      recommendations.push('⚠️ No spot formats detected - check data-slot-id attributes');
    }

    // Coordinate system recommendation
    if (result.svgStructure.viewBox && result.svgStructure.dimensions) {
      const scaleX = result.svgStructure.dimensions.width / result.svgStructure.viewBox.width;
      const scaleY = result.svgStructure.dimensions.height / result.svgStructure.viewBox.height;
      
      if (Math.abs(scaleX - scaleY) > 0.1) {
        recommendations.push('⚠️ Non-uniform scaling detected - may affect coordinate accuracy');
      }
    }

    result.recommendations = recommendations;
  }

  static generateConfigFromAnalysis(analysis: MapAnalysisResult, areaName: string): ParkingMapConfig {
    // Add padding to bounds
    const padding = 10;
    const bounds = {
      minX: analysis.coordinateBounds.minX - padding,
      minY: analysis.coordinateBounds.minY - padding,
      maxX: analysis.coordinateBounds.maxX + padding,
      maxY: analysis.coordinateBounds.maxY + padding
    };

    return {
      id: areaName.replace(/\s+/g, ''),
      name: areaName,
      coordinateBounds: bounds,
      sectionNames: analysis.detectedSections,
      spotFormats: analysis.detectedSpotFormats.length > 0 ? analysis.detectedSpotFormats : ['SPOT-###'],
      detectionPatterns: {
        parkingSlot: 'data-type="parking-slot"',
        capacitySection: 'section-',
        roadArea: 'road'
      }
    };
  }
}
