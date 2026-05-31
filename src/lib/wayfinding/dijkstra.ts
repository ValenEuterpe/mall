/**
 * Dijkstra's Shortest Path Algorithm
 *
 * Calculates the shortest path between two vertices in a weighted graph.
 * Adapted for server-side use in Next.js (no global state).
 */

import type { NavigationGraph, NavigationVertex } from "./types";

type NodeId = string;

interface PriorityNode {
  id: NodeId;
  priority: number;
}

/**
 * Min-heap priority queue for efficient node selection.
 */
class PriorityQueue {
  private values: PriorityNode[] = [];

  enqueue(id: NodeId, priority: number): void {
    const newNode: PriorityNode = { id, priority };
    this.values.push(newNode);
    this.bubbleUp();
  }

  dequeue(): PriorityNode | undefined {
    if (this.values.length === 0) return undefined;

    const min = this.values[0];
    const end = this.values.pop();

    if (this.values.length > 0 && end) {
      this.values[0] = end;
      this.sinkDown();
    }

    return min;
  }

  isEmpty(): boolean {
    return this.values.length === 0;
  }

  private bubbleUp(): void {
    let idx = this.values.length - 1;
    const element = this.values[idx];

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.values[parentIdx];

      if (element.priority >= parent.priority) break;

      this.values[parentIdx] = element;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  private sinkDown(): void {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];

    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let leftChild: PriorityNode | undefined;
      let rightChild: PriorityNode | undefined;
      let swap: number | null = null;

      if (leftChildIdx < length) {
        leftChild = this.values[leftChildIdx];
        if (leftChild.priority < element.priority) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.values[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null &&
            leftChild &&
            rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;

      this.values[idx] = this.values[swap];
      this.values[swap] = element;
      idx = swap;
    }
  }
}

/**
 * Calculate Euclidean distance between two vertices.
 */
export function calculateDistance(
  v1: { cx: number; cy: number },
  v2: { cx: number; cy: number }
): number {
  const dx = v2.cx - v1.cx;
  const dy = v2.cy - v1.cy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Result of shortest path calculation.
 */
export interface ShortestPathResult {
  /** Ordered list of vertex IDs from start to finish */
  path: string[];
  /** Total distance of the path */
  totalDistance: number;
  /** Whether a valid path was found */
  found: boolean;
}

/**
 * Calculate the shortest path between two vertices using Dijkstra's algorithm.
 *
 * @param graph - The navigation graph containing vertices and adjacency list
 * @param startId - Composite ID of the starting vertex
 * @param finishId - Composite ID of the destination vertex
 * @returns The shortest path and its total distance
 */
export function calculateShortestPath(
  graph: NavigationGraph,
  startId: string,
  finishId: string
): ShortestPathResult {
  // Validate start and finish exist
  if (!graph.vertices.has(startId)) {
    return { path: [], totalDistance: 0, found: false };
  }
  if (!graph.vertices.has(finishId)) {
    return { path: [], totalDistance: 0, found: false };
  }

  const nodes = new PriorityQueue();
  const distances: Map<string, number> = new Map();
  const previous: Map<string, string | null> = new Map();

  // Initialize distances
  for (const vertexId of graph.vertices.keys()) {
    if (vertexId === startId) {
      distances.set(vertexId, 0);
      nodes.enqueue(vertexId, 0);
    } else {
      distances.set(vertexId, Infinity);
      nodes.enqueue(vertexId, Infinity);
    }
    previous.set(vertexId, null);
  }

  // Process nodes
  while (!nodes.isEmpty()) {
    const smallest = nodes.dequeue();
    if (!smallest) break;

    const currentId = smallest.id;

    // Found destination
    if (currentId === finishId) {
      const path: string[] = [];
      let current: string | null = finishId;

      while (current) {
        path.push(current);
        current = previous.get(current) ?? null;
      }

      return {
        path: path.reverse(),
        totalDistance: distances.get(finishId) ?? 0,
        found: true,
      };
    }

    const currentDistance = distances.get(currentId) ?? Infinity;
    if (currentDistance === Infinity) continue;

    // Check neighbors
    const neighbors = graph.adjacencyList.get(currentId) ?? [];
    for (const neighbor of neighbors) {
      const candidate = currentDistance + neighbor.weight;
      const neighborDistance = distances.get(neighbor.id) ?? Infinity;

      if (candidate < neighborDistance) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, currentId);
        nodes.enqueue(neighbor.id, candidate);
      }
    }
  }

  // No path found
  return { path: [], totalDistance: 0, found: false };
}

/**
 * Find a vertex by its objectId (shop SVG ID) in the graph.
 *
 * @param graph - The navigation graph
 * @param objectId - The object/shop SVG ID to find
 * @returns The composite vertex ID, or null if not found
 */
export function findVertexByObjectId(
  graph: NavigationGraph,
  objectId: string
): string | null {
  for (const [compositeId, vertex] of graph.vertices) {
    if (vertex.objectId === objectId) {
      return compositeId;
    }
  }
  return null;
}

/**
 * Find all entrance vertices in the graph.
 *
 * @param graph - The navigation graph
 * @returns Array of entrance vertices with their composite IDs
 */
export function findEntrances(
  graph: NavigationGraph
): Array<NavigationVertex & { compositeId: string }> {
  const entrances: Array<NavigationVertex & { compositeId: string }> = [];

  for (const [compositeId, vertex] of graph.vertices) {
    if (vertex.isEntrance) {
      entrances.push({ ...vertex, compositeId });
    }
  }

  return entrances;
}

/**
 * Find all floor connector vertices (elevators, stairs, escalators).
 *
 * @param graph - The navigation graph
 * @returns Array of connector vertices grouped by connectorGroupId
 */
export function findFloorConnectors(
  graph: NavigationGraph
): Map<string, Array<NavigationVertex & { compositeId: string }>> {
  const connectors = new Map<
    string,
    Array<NavigationVertex & { compositeId: string }>
  >();

  for (const [compositeId, vertex] of graph.vertices) {
    if (vertex.floorConnector) {
      const groupId = vertex.floorConnector.connectorGroupId;
      const group = connectors.get(groupId) ?? [];
      group.push({ ...vertex, compositeId });
      connectors.set(groupId, group);
    }
  }

  return connectors;
}
