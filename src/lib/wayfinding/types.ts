/**
 * Wayfinding Types
 *
 * Data structures for indoor navigation using Dijkstra's algorithm.
 * Supports multi-floor navigation via elevators/stairs (floor connectors).
 */

/**
 * A vertex represents a point on the map that can be navigated to/through.
 * Vertices can be:
 * - Corridor intersections (objectId = null)
 * - Shop entrances (objectId = shop's SVG ID, e.g., "V1B1F1S1")
 * - Building entrances (isEntrance = true)
 * - Floor connectors like elevators/stairs (floorConnector defined)
 */
export interface WayfindingVertex {
  /** Unique identifier for this vertex (e.g., "v1", "v2") */
  id: string;
  /** X coordinate in SVG units */
  cx: number;
  /** Y coordinate in SVG units */
  cy: number;
  /**
   * Optional reference to an object on the map (shop SVG ID).
   * If set, this vertex represents the entrance to that shop.
   */
  objectId?: string | null;
  /**
   * If true, this vertex is a mall/building entrance where navigation can start.
   */
  isEntrance?: boolean;
  /**
   * Human-readable name for entrances (e.g., "Main Entrance", "North Gate")
   */
  entranceName?: string;
  /**
   * Floor connector information for elevators, stairs, escalators.
   * Links this vertex to vertices on other floors.
   */
  floorConnector?: FloorConnector;
}

/**
 * Floor connector for multi-floor navigation.
 * Connects a vertex on one floor to vertices on other floors.
 */
export interface FloorConnector {
  /** Type of connector */
  type: "elevator" | "stairs" | "escalator";
  /** Human-readable name (e.g., "Main Elevator", "East Stairwell") */
  name: string;
  /**
   * Group ID to match connectors across floors.
   * All vertices with the same connectorGroupId are connected.
   * E.g., "elevator-main" on floor 1, 2, and 3 are all linked.
   */
  connectorGroupId: string;
}

/**
 * An edge represents a walkable path between two vertices.
 * Edges are bidirectional by default.
 */
export interface WayfindingEdge {
  /** Unique identifier for this edge */
  id: string;
  /** Source vertex ID */
  from: string;
  /** Target vertex ID */
  to: string;
  /**
   * Optional weight override. If not set, weight is calculated
   * as Euclidean distance between vertices.
   */
  weight?: number;
  /**
   * If true, this edge is one-way (from -> to only).
   * Useful for escalators that only go up or down.
   */
  oneWay?: boolean;
}

/**
 * An entrance is a named starting point for navigation.
 */
export interface WayfindingEntrance {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** The vertex ID where this entrance is located */
  vertexId: string;
  /** Optional description */
  description?: string;
}

/**
 * Wayfinding data for a single floor or venue.
 * This is stored as JSON in FloorMap.wayfindingData or Venue.wayfindingData
 */
export interface WayfindingData {
  /** All navigable points on this floor/venue */
  vertices: WayfindingVertex[];
  /** All walkable paths between vertices */
  edges: WayfindingEdge[];
  /** Named entrances (subset of vertices where isEntrance=true) */
  entrances: WayfindingEntrance[];
}

/**
 * A complete navigation graph that may span multiple floors.
 * Built at runtime by combining WayfindingData from multiple FloorMaps.
 */
export interface NavigationGraph {
  /** All vertices across all floors, keyed by a composite ID (floor:vertexId) */
  vertices: Map<string, NavigationVertex>;
  /** Adjacency list: vertexId -> list of connected vertices with weights */
  adjacencyList: Map<string, Array<{ id: string; weight: number }>>;
}

/**
 * Extended vertex with floor information for multi-floor navigation.
 */
export interface NavigationVertex extends WayfindingVertex {
  /** Floor number (or "venue" for outdoor areas) */
  floor: string;
  /** Building code (or null for venues) */
  building: string | null;
  /** Venue code */
  venue: string;
  /** Composite ID: "venue:building:floor:vertexId" */
  compositeId: string;
}

/**
 * A calculated route between two points.
 */
export interface CalculatedRoute {
  /** Ordered list of vertex composite IDs from start to end */
  path: string[];
  /** Total distance in SVG units */
  totalDistance: number;
  /** Estimated walking time in seconds (based on average walking speed) */
  estimatedTime: number;
  /** Route segments with coordinates for rendering */
  segments: RouteSegment[];
  /** Floor changes along the route */
  floorChanges: FloorChange[];
}

/**
 * A segment of the route on a single floor.
 * Used for rendering the path on each floor's SVG.
 */
export interface RouteSegment {
  /** Floor identifier */
  floor: string;
  /** Building code */
  building: string | null;
  /** Venue code */
  venue: string;
  /** SVG path data string (e.g., "M100 200 L150 200 L150 300") */
  pathData: string;
  /** Ordered vertices in this segment */
  vertices: Array<{ cx: number; cy: number }>;
}

/**
 * Information about a floor change in the route.
 */
export interface FloorChange {
  /** Type of connector used */
  type: "elevator" | "stairs" | "escalator";
  /** Name of the connector */
  name: string;
  /** Floor leaving from */
  fromFloor: string;
  /** Floor arriving at */
  toFloor: string;
  /** Position on the from-floor map */
  position: { cx: number; cy: number };
}

/**
 * Navigation state for the UI.
 */
export interface NavigationState {
  /** Currently selected entrance/starting point */
  startVertexId: string | null;
  /** Destination (shop objectId or vertex ID) */
  destinationId: string | null;
  /** Calculated route (null if not yet calculated) */
  route: CalculatedRoute | null;
  /** Whether navigation is active */
  isNavigating: boolean;
  /** Current floor being viewed */
  currentFloor: string;
}
