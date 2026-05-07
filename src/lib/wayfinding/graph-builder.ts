/**
 * Graph Builder
 *
 * Builds a unified NavigationGraph from multiple floor/venue WayfindingData.
 * Handles multi-floor connections via elevators, stairs, and escalators.
 */

import type {
  WayfindingData,
  WayfindingVertex,
  WayfindingEdge,
  NavigationGraph,
  NavigationVertex,
} from "./types";
import { calculateDistance } from "./dijkstra";

/**
 * Input data for a single floor or venue.
 */
export interface FloorWayfindingInput {
  /** Venue code */
  venue: string;
  /** Building code (null for outdoor venues) */
  building: string | null;
  /** Floor identifier (e.g., "1", "2", "G" for ground, "B1" for basement) */
  floor: string;
  /** Wayfinding data for this floor */
  data: WayfindingData;
}

/**
 * Create a composite ID for a vertex that includes floor information.
 * Format: "venue:building:floor:vertexId"
 */
export function createCompositeId(
  venue: string,
  building: string | null,
  floor: string,
  vertexId: string
): string {
  return `${venue}:${building ?? ""}:${floor}:${vertexId}`;
}

/**
 * Parse a composite ID back into its components.
 */
export function parseCompositeId(compositeId: string): {
  venue: string;
  building: string | null;
  floor: string;
  vertexId: string;
} {
  const [venue, building, floor, vertexId] = compositeId.split(":");
  return {
    venue,
    building: building || null,
    floor,
    vertexId,
  };
}

/**
 * Build a unified navigation graph from multiple floors/venues.
 *
 * @param floors - Array of floor wayfinding data
 * @param floorConnectorCost - Additional cost for using elevators/stairs (default: 50)
 * @returns A unified NavigationGraph spanning all floors
 */
export function buildNavigationGraph(
  floors: FloorWayfindingInput[],
  floorConnectorCost: number = 50
): NavigationGraph {
  const vertices = new Map<string, NavigationVertex>();
  const adjacencyList = new Map<string, Array<{ id: string; weight: number }>>();

  // First pass: Add all vertices
  for (const floor of floors) {
    for (const vertex of floor.data.vertices) {
      const compositeId = createCompositeId(
        floor.venue,
        floor.building,
        floor.floor,
        vertex.id
      );

      const navVertex: NavigationVertex = {
        ...vertex,
        venue: floor.venue,
        building: floor.building,
        floor: floor.floor,
        compositeId,
      };

      vertices.set(compositeId, navVertex);
      adjacencyList.set(compositeId, []);
    }
  }

  // Second pass: Add edges within each floor
  for (const floor of floors) {
    for (const edge of floor.data.edges) {
      const fromCompositeId = createCompositeId(
        floor.venue,
        floor.building,
        floor.floor,
        edge.from
      );
      const toCompositeId = createCompositeId(
        floor.venue,
        floor.building,
        floor.floor,
        edge.to
      );

      const fromVertex = vertices.get(fromCompositeId);
      const toVertex = vertices.get(toCompositeId);

      if (!fromVertex || !toVertex) {
        console.warn(`Edge references non-existent vertex: ${edge.id}`);
        continue;
      }

      // Calculate weight (distance) if not explicitly set
      const weight = edge.weight ?? calculateDistance(fromVertex, toVertex);

      // Add edge to adjacency list
      const fromEdges = adjacencyList.get(fromCompositeId) ?? [];
      fromEdges.push({ id: toCompositeId, weight });
      adjacencyList.set(fromCompositeId, fromEdges);

      // Add reverse edge unless one-way
      if (!edge.oneWay) {
        const toEdges = adjacencyList.get(toCompositeId) ?? [];
        toEdges.push({ id: fromCompositeId, weight });
        adjacencyList.set(toCompositeId, toEdges);
      }
    }
  }

  // Third pass: Connect floor connectors across floors
  const connectorGroups = new Map<string, NavigationVertex[]>();

  for (const vertex of vertices.values()) {
    if (vertex.floorConnector) {
      const groupId = vertex.floorConnector.connectorGroupId;
      const group = connectorGroups.get(groupId) ?? [];
      group.push(vertex);
      connectorGroups.set(groupId, group);
    }
  }

  // Link all vertices in each connector group
  for (const [, group] of connectorGroups) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const v1 = group[i];
        const v2 = group[j];

        // Add bidirectional edge between floors
        const v1Edges = adjacencyList.get(v1.compositeId) ?? [];
        const v2Edges = adjacencyList.get(v2.compositeId) ?? [];

        // Check if escalator is one-way
        const isEscalator = v1.floorConnector?.type === "escalator";
        // For escalators, assume they go up (lower floor -> higher floor)
        // This is a simplification; in practice, you might want to specify direction

        v1Edges.push({ id: v2.compositeId, weight: floorConnectorCost });
        adjacencyList.set(v1.compositeId, v1Edges);

        if (!isEscalator) {
          v2Edges.push({ id: v1.compositeId, weight: floorConnectorCost });
          adjacencyList.set(v2.compositeId, v2Edges);
        }
      }
    }
  }

  return { vertices, adjacencyList };
}

/**
 * Get all vertices for a specific floor.
 */
export function getVerticesForFloor(
  graph: NavigationGraph,
  venue: string,
  building: string | null,
  floor: string
): NavigationVertex[] {
  const result: NavigationVertex[] = [];

  for (const vertex of graph.vertices.values()) {
    if (
      vertex.venue === venue &&
      vertex.building === building &&
      vertex.floor === floor
    ) {
      result.push(vertex);
    }
  }

  return result;
}

/**
 * Get all edges for a specific floor (for rendering paths on that floor's SVG).
 */
export function getEdgesForFloor(
  graph: NavigationGraph,
  venue: string,
  building: string | null,
  floor: string
): Array<{ from: NavigationVertex; to: NavigationVertex; weight: number }> {
  const result: Array<{ from: NavigationVertex; to: NavigationVertex; weight: number }> = [];
  const seenEdges = new Set<string>();

  for (const [fromId, neighbors] of graph.adjacencyList) {
    const fromVertex = graph.vertices.get(fromId);
    if (!fromVertex) continue;

    // Only include edges starting from this floor
    if (
      fromVertex.venue !== venue ||
      fromVertex.building !== building ||
      fromVertex.floor !== floor
    ) {
      continue;
    }

    for (const neighbor of neighbors) {
      const toVertex = graph.vertices.get(neighbor.id);
      if (!toVertex) continue;

      // Only include edges ending on this floor (no cross-floor edges in rendering)
      if (
        toVertex.venue !== venue ||
        toVertex.building !== building ||
        toVertex.floor !== floor
      ) {
        continue;
      }

      // Avoid duplicates (since edges are bidirectional)
      const edgeKey = [fromId, neighbor.id].sort().join("->");
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      result.push({
        from: fromVertex,
        to: toVertex,
        weight: neighbor.weight,
      });
    }
  }

  return result;
}
