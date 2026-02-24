/**
 * SVG Spot Positioning Utility
 * Provides flexible and scalable positioning for parking spot touchables
 * Works with any SVG layout regardless of dimensions
 */

export interface SpotCoordinates {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spotNumber?: string;
  spotId?: string;
}

export interface PositionedSpot {
  left: number;
  top: number;
  width: number;
  height: number;
  isValid: boolean;
}

export interface SVGDimensions {
  viewBoxX: number;
  viewBoxY: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
}

/**
 * Extract SVG dimensions from SVG content string
 * Handles viewBox, width, and height attributes
 */
export const extractSVGDimensions = (svgContent: string): SVGDimensions => {
  // Default values - will be overridden by actual SVG values
  let viewBoxX = 0;
  let viewBoxY = 0;
  let viewBoxWidth = 500;
  let viewBoxHeight = 500;
  let intrinsicWidth = 500;
  let intrinsicHeight = 500;

  // Extract viewBox - primary source for coordinate system
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).filter(p => p).map(Number);
    if (parts.length >= 4 && parts.every(p => !isNaN(p))) {
      viewBoxX = parts[0];
      viewBoxY = parts[1];
      viewBoxWidth = parts[2];
      viewBoxHeight = parts[3];
      // Use viewBox dimensions as intrinsic if not specified
      intrinsicWidth = viewBoxWidth;
      intrinsicHeight = viewBoxHeight;
    }
  }

  // Extract explicit width/height if specified (overrides viewBox for intrinsic size)
  const widthMatch = svgContent.match(/<svg[^>]*\swidth=["']([^"']+)["']/);
  const heightMatch = svgContent.match(/<svg[^>]*\sheight=["']([^"']+)["']/);
  
  if (widthMatch && heightMatch) {
    const w = parseFloat(widthMatch[1]);
    const h = parseFloat(heightMatch[1]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      intrinsicWidth = w;
      intrinsicHeight = h;
    }
  }

  return {
    viewBoxX,
    viewBoxY,
    viewBoxWidth,
    viewBoxHeight,
    intrinsicWidth,
    intrinsicHeight,
  };
};

/**
 * Calculate the rendered size and offsets when using preserveAspectRatio="xMidYMid meet"
 * This is the key function that handles proper centering
 */
export const calculateRenderedDimensions = (
  svgDimensions: SVGDimensions,
  containerWidth: number,
  containerHeight: number
): {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
} => {
  const { viewBoxWidth, viewBoxHeight } = svgDimensions;
  
  // Calculate aspect ratios
  const viewBoxAspectRatio = viewBoxWidth / viewBoxHeight;
  const containerAspectRatio = containerWidth / containerHeight;
  
  let renderedWidth: number;
  let renderedHeight: number;
  
  // With preserveAspectRatio="xMidYMid meet", the SVG fits inside the container
  // while maintaining aspect ratio
  if (viewBoxAspectRatio > containerAspectRatio) {
    // ViewBox is wider than container - fit to width
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / viewBoxAspectRatio;
  } else {
    // ViewBox is taller than container - fit to height
    renderedWidth = containerHeight * viewBoxAspectRatio;
    renderedHeight = containerHeight;
  }
  
  // Calculate centering offset (xMidYMid centers the content)
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;
  
  // Calculate scale factors (viewBox units to rendered pixels)
  const scaleX = renderedWidth / viewBoxWidth;
  const scaleY = renderedHeight / viewBoxHeight;
  
  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    scaleX,
    scaleY,
  };
};

/**
 * Calculate the screen position for a parking spot
 * Converts viewBox coordinates to screen pixel coordinates
 */
export const calculateSpotPosition = (
  spot: SpotCoordinates,
  svgDimensions: SVGDimensions,
  containerWidth: number,
  containerHeight: number
): PositionedSpot => {
  const { viewBoxX, viewBoxY } = svgDimensions;
  const { offsetX, offsetY, scaleX, scaleY } = calculateRenderedDimensions(
    svgDimensions,
    containerWidth,
    containerHeight
  );
  
  // Convert spot coordinates from viewBox space to rendered pixel space
  // Adjust for viewBox origin (some SVGs have non-zero origin)
  const spotXInViewBox = spot.x - viewBoxX;
  const spotYInViewBox = spot.y - viewBoxY;
  
  // Scale to rendered pixels
  const pixelX = spotXInViewBox * scaleX;
  const pixelY = spotYInViewBox * scaleY;
  
  // Add centering offset
  const left = offsetX + pixelX;
  const top = offsetY + pixelY;
  
  // Scale dimensions to rendered pixels
  const width = spot.width * scaleX;
  const height = spot.height * scaleY;
  
  // Validate dimensions
  const isValid = width > 0 && height > 0 && 
                  !isNaN(width) && !isNaN(height) && 
                  !isNaN(left) && !isNaN(top);
  
  return {
    left,
    top,
    width,
    height,
    isValid,
  };
};

/**
 * Calculate positions for all spots in a layout
 * Returns an array of positioned spots ready for rendering
 */
export const calculateAllSpotPositions = (
  spots: SpotCoordinates[],
  svgContent: string,
  containerWidth: number,
  containerHeight: number
): Array<SpotCoordinates & PositionedSpot> => {
  const svgDimensions = extractSVGDimensions(svgContent);
  
  return spots.map(spot => {
    const position = calculateSpotPosition(spot, svgDimensions, containerWidth, containerHeight);
    return {
      ...spot,
      ...position,
    };
  }).filter(spot => spot.isValid);
};

/**
 * Parse SVG content to extract parking spot elements
 * Works with any SVG layout structure (FPA, Main Campus, etc.)
 * Identifies spots by their ID pattern: section-number format (e.g., A-1, VB-1, F1-A-1)
 */
export const parseSvgForParkingSpots = (svgString: string): SpotCoordinates[] => {
  const spots: SpotCoordinates[] = [];
  
  if (!svgString || svgString.length < 100) {
    console.log('⚠️ SVG content too short or empty');
    return spots;
  }
  
  // Log SVG info for debugging
  console.log('🔍 Parsing SVG, length:', svgString.length);
  console.log('🔍 SVG preview:', svgString.substring(0, 300));
  
  try {
    // Spot ID pattern: matches formats like "A-1", "VB-1", "F1-A-1", "F2-VB-10", "S-1", etc.
    // Pattern: optional floor prefix (F1-, F2-), section letters (A, VB, S, etc.), dash, number
    const spotIdPattern = /^(?:F\d+-)?([A-Z]+)-(\d+)$/i;
    
    // Find all group elements with IDs
    const groupRegex = /<g[^>]*\sid=["']([^"']+)["'][^>]*>/g;
    let match;
    
    while ((match = groupRegex.exec(svgString)) !== null) {
      const fullGroupTag = match[0];
      const groupId = match[1];
      const matchIndex = match.index;
      
      // Check if this ID matches the parking spot pattern
      const idMatch = spotIdPattern.exec(groupId);
      if (!idMatch) {
        continue; // Skip non-spot elements
      }
      
      const sectionName = idMatch[1]; // e.g., "A", "VB", "S"
      const slotNumber = idMatch[2];  // e.g., "1", "2", "10"
      
      // Extract transform from the group tag
      let tx = 0, ty = 0;
      const transformMatch = fullGroupTag.match(/transform=["']translate\(([^)]+)\)["']/);
      if (transformMatch) {
        const coords = transformMatch[1].split(/[,\s]+/).map(parseFloat);
        tx = coords[0] || 0;
        ty = coords[1] || 0;
      }
      
      // Find the closing </g> tag for this group
      let depth = 1;
      let pos = matchIndex + fullGroupTag.length;
      let groupEnd = -1;
      
      while (pos < svgString.length && depth > 0) {
        const nextOpen = svgString.indexOf('<g', pos);
        const nextClose = svgString.indexOf('</g>', pos);
        
        if (nextClose === -1) break;
        
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 2;
        } else {
          depth--;
          if (depth === 0) {
            groupEnd = nextClose + 4;
            break;
          }
          pos = nextClose + 4;
        }
      }
      
      if (groupEnd === -1) continue;
      
      const groupContent = svgString.substring(matchIndex, groupEnd);
      
      // Find the rect element inside this group (the parking spot background)
      const rectMatch = groupContent.match(/<rect[^>]*>/);
      if (rectMatch) {
        const rectElement = rectMatch[0];
        
        const xMatch = rectElement.match(/x=["']([^"']+)["']/);
        const yMatch = rectElement.match(/y=["']([^"']+)["']/);
        const widthMatch = rectElement.match(/width=["']([^"']+)["']/);
        const heightMatch = rectElement.match(/height=["']([^"']+)["']/);
        
        const rx = xMatch ? parseFloat(xMatch[1]) : 0;
        const ry = yMatch ? parseFloat(yMatch[1]) : 0;
        const rw = widthMatch ? parseFloat(widthMatch[1]) : 46; // Default tile size
        const rh = heightMatch ? parseFloat(heightMatch[1]) : 46;
        
        if (rw > 0 && rh > 0 && !isNaN(rw) && !isNaN(rh)) {
          spots.push({
            id: groupId,
            x: tx + rx,
            y: ty + ry,
            width: rw,
            height: rh,
            spotNumber: slotNumber,
            spotId: groupId,
          });
        }
      }
    }
    
    console.log(`✅ Parsed ${spots.length} parking spots from SVG`);
    
    // Debug: log first few spots
    if (spots.length > 0) {
      console.log('📍 Sample spots:', spots.slice(0, 3).map(s => ({
        id: s.id,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height
      })));
    }
    
  } catch (error) {
    console.error('❌ Error parsing SVG for parking spots:', error);
  }
  
  return spots;
};

/**
 * Debug helper to log spot positioning info
 */
export const debugSpotPosition = (
  spot: SpotCoordinates,
  svgContent: string,
  containerWidth: number,
  containerHeight: number
): void => {
  const svgDimensions = extractSVGDimensions(svgContent);
  const rendered = calculateRenderedDimensions(svgDimensions, containerWidth, containerHeight);
  const position = calculateSpotPosition(spot, svgDimensions, containerWidth, containerHeight);
  
  console.log('🎯 Spot Positioning Debug:', {
    spotId: spot.id,
    spotNumber: spot.spotNumber,
    viewBoxCoords: { x: spot.x, y: spot.y, width: spot.width, height: spot.height },
    svgDimensions,
    container: { width: containerWidth, height: containerHeight },
    rendered,
    finalPosition: position,
  });
};
