import { MapAnalyzer, MapAnalysisResult } from './mapAnalyzer';
import { ParkingMapConfig } from '../config/parkingMapConfigs';
import { writeFileSync } from 'fs';

export class AutoConfigGenerator {
  static async generateConfigForNewMap(svgString: string, areaName: string, areaId: number): Promise<ParkingMapConfig> {
    console.log(`🔍 Analyzing new map: ${areaName}`);
    
    // Analyze the SVG
    const analysis = MapAnalyzer.analyzeSvg(svgString);
    
    // Log analysis results
    console.log('📊 Map Analysis Results:');
    console.log(`- Coordinate Bounds: (${analysis.coordinateBounds.minX}, ${analysis.coordinateBounds.minY}) to (${analysis.coordinateBounds.maxX}, ${analysis.coordinateBounds.maxY})`);
    console.log(`- Detected Sections: ${analysis.detectedSections.join(', ')}`);
    console.log(`- Detected Spot Formats: ${analysis.detectedSpotFormats.join(', ')}`);
    console.log(`- Recommendations: ${analysis.recommendations.join(', ')}`);
    
    // Generate configuration
    const config = MapAnalyzer.generateConfigFromAnalysis(analysis, areaName);
    
    // Validate and refine configuration
    return this.validateAndRefineConfig(config, analysis);
  }

  private static validateAndRefineConfig(config: ParkingMapConfig, analysis: MapAnalysisResult): ParkingMapConfig {
    const refinedConfig = { ...config };

    // Add reasonable padding to bounds
    const padding = Math.max(20, (analysis.coordinateBounds.maxX - analysis.coordinateBounds.minX) * 0.1);
    refinedConfig.coordinateBounds = {
      minX: analysis.coordinateBounds.minX - padding,
      minY: analysis.coordinateBounds.minY - padding,
      maxX: analysis.coordinateBounds.maxX + padding,
      maxY: analysis.coordinateBounds.maxY + padding
    };

    // Ensure we have at least some default sections
    if (refinedConfig.sectionNames.length === 0) {
      refinedConfig.sectionNames = ['A', 'B', 'C'];
      console.log('⚠️ No sections detected, using defaults: A, B, C');
    }

    // Ensure we have spot formats
    if (refinedConfig.spotFormats.length === 0) {
      refinedConfig.spotFormats = ['SPOT-###'];
      console.log('⚠️ No spot formats detected, using default: SPOT-###');
    }

    return refinedConfig;
  }

  static saveConfigToDatabase(config: ParkingMapConfig): void {
    // This would save to a database or configuration file
    // For now, we'll just log it
    console.log('💾 Generated Configuration:');
    console.log(JSON.stringify(config, null, 2));
  }

  static createConfigUpdateScript(): string {
    return `
// Auto-generated configuration update
// Run this script to update parkingMapConfigs.ts

const newConfig = {
  id: 'NEW_AREA_NAME',
  name: 'New Parking Area',
  coordinateBounds: {
    minX: 0,
    minY: 0,
    maxX: 200,
    maxY: 450
  },
  sectionNames: ['A', 'B', 'C'],
  spotFormats: ['SPOT-###'],
  detectionPatterns: {
    parkingSlot: 'data-type="parking-slot"',
    capacitySection: 'section-',
    roadArea: 'road'
  }
};

// Add to parkingMapConfigs object
parkingMapConfigs['NEW_AREA_NAME'] = newConfig;
`;
  }
}

// Development tool for testing new maps
export const testNewMap = async (svgString: string, areaName: string) => {
  try {
    const config = await AutoConfigGenerator.generateConfigForNewMap(svgString, areaName, 999);
    console.log('✅ Configuration generated successfully!');
    return config;
  } catch (error) {
    console.error('❌ Error generating configuration:', error);
    throw error;
  }
};
