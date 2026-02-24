export interface ParkingMapConfig {
  id: string;
  name: string;
  coordinateBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  sectionNames: string[];
  spotFormats: string[];
  detectionPatterns: {
    parkingSlot: string;
    capacitySection: string;
    roadArea: string;
  };
  spotIdMapping?: {
    [svgId: string]: string; // Map SVG spot ID to actual spot ID
  };
}

export const parkingMapConfigs: Record<string, ParkingMapConfig> = {
  'FPA': {
    id: 'FPA',
    name: 'FPA Parking',
    coordinateBounds: {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 450
    },
    sectionNames: ['E', 'I', 'SD'],
    spotFormats: ['FPA-S-###'],
    detectionPatterns: {
      parkingSlot: 'data-type="parking-slot"',
      capacitySection: 'section-',
      roadArea: 'road'
    }
  },
  'MainCampus': {
    id: 'MainCampus',
    name: 'Main Campus Parking',
    coordinateBounds: {
      minX: 0,
      minY: 0,
      maxX: 1200,
      maxY: 300
    },
    sectionNames: ['V', 'X', 'VB'],
    spotFormats: ['F1-A-##'],
    detectionPatterns: {
      parkingSlot: 'data-type="parking-slot"',
      capacitySection: 'section-',
      roadArea: 'road'
    },
    spotIdMapping: {
      'FPA-S-001': 'M1-S-001',
      'FPA-S-002': 'M1-S-002',
      'FPA-S-003': 'M1-S-003',
      'FPA-S-004': 'M1-S-004'
    }
  }
};

export function getMapConfig(areaId: number, areaName: string): ParkingMapConfig {
  // Try to find by area name first
  const configKey = Object.keys(parkingMapConfigs).find(key => 
    parkingMapConfigs[key].name.toLowerCase().includes(areaName.toLowerCase())
  );
  
  if (configKey) {
    return parkingMapConfigs[configKey];
  }
  
  // Fallback to FPA for area 2, MainCampus for area 1
  if (areaId === 2) return parkingMapConfigs['FPA'];
  if (areaId === 1) return parkingMapConfigs['MainCampus'];
  
  // Default fallback
  return parkingMapConfigs['FPA'];
}
