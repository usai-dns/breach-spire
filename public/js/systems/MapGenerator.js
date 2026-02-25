export class MapGenerator {
  constructor() {
    this.totalFloors = 15;
    this.nodesPerFloor = 4;
  }

  generate() {
    const map = {
      floors: [],
      currentFloor: 0,
      currentNode: null,
      visited: new Set()
    };

    for (let floor = 0; floor < this.totalFloors; floor++) {
      const floorNodes = this.generateFloor(floor);
      map.floors.push(floorNodes);
    }

    // Generate connections between floors
    this.generateConnections(map);

    // Mark starting nodes as accessible
    map.floors[0].forEach(node => { node.accessible = true; });

    return map;
  }

  generateFloor(floor) {
    // Boss floor
    if (floor === this.totalFloors - 1) {
      return [{
        id: `${floor}-0`,
        floor,
        index: 0,
        type: 'boss',
        accessible: false,
        visited: false,
        connections: [],
        x: 0.5,
        y: 0
      }];
    }

    // First floor - always combat
    if (floor === 0) {
      const count = 2 + Math.floor(Math.random() * 2); // 2-3 nodes
      return this.createFloorNodes(floor, count, ['combat']);
    }

    // Determine node types based on floor
    const nodeCount = 2 + Math.floor(Math.random() * 3); // 2-4 nodes
    const possibleTypes = this.getFloorNodeTypes(floor);

    return this.createFloorNodes(floor, nodeCount, possibleTypes);
  }

  createFloorNodes(floor, count, possibleTypes) {
    const nodes = [];
    const spacing = 1.0 / (count + 1);

    for (let i = 0; i < count; i++) {
      const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
      nodes.push({
        id: `${floor}-${i}`,
        floor,
        index: i,
        type,
        accessible: false,
        visited: false,
        connections: [],
        x: spacing * (i + 1),
        y: 0
      });
    }

    // Guarantee at least one combat node per floor (except rest floors)
    if (!nodes.some(n => n.type === 'combat' || n.type === 'elite') && floor < 13) {
      nodes[0].type = 'combat';
    }

    return nodes;
  }

  getFloorNodeTypes(floor) {
    if (floor <= 3) {
      return ['combat', 'combat', 'combat', 'event'];
    } else if (floor <= 6) {
      return ['combat', 'combat', 'event', 'rest'];
    } else if (floor <= 9) {
      return ['combat', 'combat', 'elite', 'rest', 'event'];
    } else if (floor <= 12) {
      return ['combat', 'elite', 'elite', 'rest', 'event'];
    } else {
      // Floor 13-14: pre-boss
      return ['rest', 'combat', 'elite', 'event'];
    }
  }

  generateConnections(map) {
    for (let floor = 0; floor < map.floors.length - 1; floor++) {
      const current = map.floors[floor];
      const next = map.floors[floor + 1];

      // Each node connects to 1-2 nodes on the next floor
      current.forEach(node => {
        const connections = [];

        // Find closest nodes on next floor
        const sorted = [...next].sort((a, b) =>
          Math.abs(a.x - node.x) - Math.abs(b.x - node.x)
        );

        // Always connect to closest
        connections.push(sorted[0].id);

        // 60% chance to connect to second closest
        if (sorted.length > 1 && Math.random() < 0.6) {
          connections.push(sorted[1].id);
        }

        node.connections = connections;
      });

      // Ensure every next-floor node has at least one incoming connection
      next.forEach(nextNode => {
        const hasIncoming = current.some(n => n.connections.includes(nextNode.id));
        if (!hasIncoming) {
          // Find closest current-floor node and add connection
          const closest = [...current].sort((a, b) =>
            Math.abs(a.x - nextNode.x) - Math.abs(b.x - nextNode.x)
          )[0];
          closest.connections.push(nextNode.id);
        }
      });
    }
  }

  // Get a node by its ID
  getNode(map, nodeId) {
    for (const floor of map.floors) {
      for (const node of floor) {
        if (node.id === nodeId) return node;
      }
    }
    return null;
  }

  // Mark a node as visited and unlock connected nodes
  visitNode(map, nodeId) {
    const node = this.getNode(map, nodeId);
    if (!node) return;

    node.visited = true;
    map.currentNode = nodeId;
    map.currentFloor = node.floor;

    // Make all connected nodes accessible
    for (const connId of node.connections) {
      const connNode = this.getNode(map, connId);
      if (connNode) {
        connNode.accessible = true;
      }
    }

    // Make other nodes on current floor inaccessible (can't go back)
    const currentFloorNodes = map.floors[node.floor];
    currentFloorNodes.forEach(n => {
      if (n.id !== nodeId) {
        n.accessible = false;
      }
    });
  }
}

// Node type display info
export const NODE_TYPES = {
  combat: { icon: '⚔', color: '#e74c3c', label: 'Combat' },
  elite: { icon: '💀', color: '#e67e22', label: 'Elite' },
  rest: { icon: '🔥', color: '#2ecc71', label: 'Rest' },
  event: { icon: '?', color: '#3498db', label: 'Event' },
  boss: { icon: '👑', color: '#9b59b6', label: 'Boss' },
  shop: { icon: '🛒', color: '#f1c40f', label: 'Shop' }
};
