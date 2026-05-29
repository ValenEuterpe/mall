/**
 * Path Builder
 *
 * Utilities for building SVG path strings and route segments
 * from calculated shortest paths.
 */

import type {
  NavigationGraph,
  NavigationVertex,
  CalculatedRoute,
  RouteSegment,
  FloorChange,
} from "./types";

/** Average walking speed in SVG units per second (calibrated to map scale) */
const DEFAULT_WALKING_SPEED = 50;

/** Map ratio: SVG units to meters (approximate) */
const SVG_TO_METERS_RATIO = 0.05;

/**
 * Build SVG path data string from an array of coordinates.
 * Format: "M x1 y1 L x2 y2 L x3 y3 ..."
 */
export function buildPathData(
  coordinates: Array<{ cx: number; cy: number }>
): string {
  if (coordinates.length === 0) return "";
  if (coordinates.length === 1) {
    return `M${coordinates[0].cx} ${coordinates[0].cy}`;
  }

  const [start, ...rest] = coordinates;
  const pathParts = [`M${start.cx} ${start.cy}`];

  for (const coord of rest) {
    pathParts.push(`L${coord.cx} ${coord.cy}`);
  }

  return pathParts.join(" ");
}

/**
 * Build a complete calculated route from a path of vertex IDs.
 *
 * @param graph - The navigation graph
 * @param path - Array of composite vertex IDs representing the path
 * @param totalDistance - Total distance calculated by Dijkstra
 * @param walkingSpeed - Walking speed in SVG units per second
 * @returns A CalculatedRoute with segments grouped by floor
 */
export function buildCalculatedRoute(
  graph: NavigationGraph,
  path: string[],
  totalDistance: number,
  // Currently unused — body uses a hard-coded `walkingSpeedMps` constant.
  // Kept on the signature for source compatibility with callers.
  _walkingSpeed: number = DEFAULT_WALKING_SPEED
): CalculatedRoute {
  if (path.length === 0) {
    return {
      path: [],
      totalDistance: 0,
      estimatedTime: 0,
      segments: [],
      floorChanges: [],
    };
  }

  const segments: RouteSegment[] = [];
  const floorChanges: FloorChange[] = [];

  // Group vertices by floor
  let currentSegmentVertices: NavigationVertex[] = [];
  let currentFloor: string | null = null;
  let currentBuilding: string | null = null;
  let currentVenue: string | null = null;

  for (let i = 0; i < path.length; i++) {
    const vertexId = path[i];
    const vertex = graph.vertices.get(vertexId);

    if (!vertex) {
      console.warn(`Vertex not found in graph: ${vertexId}`);
      continue;
    }

    const floorKey = `${vertex.venue}:${vertex.building ?? ""}:${vertex.floor}`;
    const prevFloorKey =
      currentVenue !== null
        ? `${currentVenue}:${currentBuilding ?? ""}:${currentFloor}`
        : null;

    // Check for floor change
    if (prevFloorKey !== null && floorKey !== prevFloorKey) {
      // Save current segment
      if (currentSegmentVertices.length > 0) {
        segments.push({
          floor: currentFloor!,
          building: currentBuilding,
          venue: currentVenue!,
          pathData: buildPathData(currentSegmentVertices),
          vertices: currentSegmentVertices.map((v) => ({ cx: v.cx, cy: v.cy })),
        });
      }

      // Record floor change
      const prevVertex = currentSegmentVertices[currentSegmentVertices.length - 1];
      if (prevVertex?.floorConnector) {
        floorChanges.push({
          type: prevVertex.floorConnector.type,
          name: prevVertex.floorConnector.name,
          fromFloor: currentFloor!,
          toFloor: vertex.floor,
          position: { cx: prevVertex.cx, cy: prevVertex.cy },
        });
      }

      // Start new segment
      currentSegmentVertices = [vertex];
      currentFloor = vertex.floor;
      currentBuilding = vertex.building;
      currentVenue = vertex.venue;
    } else {
      // Same floor, add to current segment
      currentSegmentVertices.push(vertex);
      currentFloor = vertex.floor;
      currentBuilding = vertex.building;
      currentVenue = vertex.venue;
    }
  }

  // Don't forget the last segment
  if (currentSegmentVertices.length > 0 && currentFloor !== null && currentVenue !== null) {
    segments.push({
      floor: currentFloor,
      building: currentBuilding,
      venue: currentVenue,
      pathData: buildPathData(currentSegmentVertices),
      vertices: currentSegmentVertices.map((v) => ({ cx: v.cx, cy: v.cy })),
    });
  }

  // Calculate estimated walking time
  const distanceInMeters = totalDistance * SVG_TO_METERS_RATIO;
  const walkingSpeedMps = 1.4; // meters per second (average walking speed)
  const estimatedTime = Math.round(distanceInMeters / walkingSpeedMps);

  return {
    path,
    totalDistance,
    estimatedTime,
    segments,
    floorChanges,
  };
}

/**
 * Get the route segment for a specific floor.
 * Returns null if the route doesn't pass through that floor.
 */
export function getSegmentForFloor(
  route: CalculatedRoute,
  venue: string,
  building: string | null,
  floor: string
): RouteSegment | null {
  return (
    route.segments.find(
      (s) => s.venue === venue && s.building === building && s.floor === floor
    ) ?? null
  );
}

/**
 * Get all floors that the route passes through.
 */
export function getRouteFloors(
  route: CalculatedRoute
): Array<{ venue: string; building: string | null; floor: string }> {
  return route.segments.map((s) => ({
    venue: s.venue,
    building: s.building,
    floor: s.floor,
  }));
}

/**
 * Format estimated time as human-readable string.
 */
export function formatWalkingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

/**
 * Format distance as human-readable string.
 */
export function formatDistance(svgUnits: number): string {
  const meters = svgUnits * SVG_TO_METERS_RATIO;

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}
