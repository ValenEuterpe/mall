/**
 * Wayfinding Module
 *
 * Indoor navigation system using Dijkstra's shortest path algorithm.
 * Supports multi-floor navigation via elevators, stairs, and escalators.
 */

// Types
export type {
  WayfindingVertex,
  WayfindingEdge,
  WayfindingEntrance,
  WayfindingData,
  NavigationGraph,
  NavigationVertex,
  CalculatedRoute,
  RouteSegment,
  FloorChange,
  NavigationState,
  FloorConnector,
} from "./types";

// Dijkstra algorithm
export {
  calculateShortestPath,
  calculateDistance,
  findVertexByObjectId,
  findEntrances,
  findFloorConnectors,
} from "./dijkstra";
export type { ShortestPathResult } from "./dijkstra";

// Graph builder
export {
  buildNavigationGraph,
  createCompositeId,
  parseCompositeId,
  getVerticesForFloor,
  getEdgesForFloor,
} from "./graph-builder";
export type { FloorWayfindingInput } from "./graph-builder";

// Path builder
export {
  buildPathData,
  buildCalculatedRoute,
  getSegmentForFloor,
  getRouteFloors,
  formatWalkingTime,
  formatDistance,
} from "./path-builder";
