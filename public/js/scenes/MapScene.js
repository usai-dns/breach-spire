import { RunManager } from '../systems/RunManager.js';
import { NODE_TYPES } from '../systems/MapGenerator.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  init(data) {
    if (data.newRun || !data.runManager) {
      this.runManager = new RunManager();
      this.runManager.newRun();
    } else {
      this.runManager = data.runManager;
    }
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = this.runManager.getState();
    const map = state.map;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x151528, 0x151528, 1);
    bg.fillRect(0, 0, w, h);

    // Title bar
    this.add.text(w / 2, 18, 'THE BREACH', {
      fontSize: '18px',
      fill: '#8899bb',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Player stats
    this.add.text(15, 12, `♥ ${state.hp}/${state.maxHp}`, {
      fontSize: '13px',
      fill: '#2ecc71',
      fontFamily: 'monospace'
    });

    this.add.text(15, 28, `Deck: ${state.deck.length} cards`, {
      fontSize: '11px',
      fill: '#8899bb',
      fontFamily: 'monospace'
    });

    this.add.text(w - 15, 12, `Floor ${map.currentFloor + 1}/${map.floors.length}`, {
      fontSize: '13px',
      fill: '#8899bb',
      fontFamily: 'monospace'
    }).setOrigin(1, 0);

    // Map area
    const mapTop = 50;
    const mapBottom = h - 20;
    const mapHeight = mapBottom - mapTop;
    const totalFloors = map.floors.length;
    const floorSpacing = mapHeight / (totalFloors + 1);

    // Store node positions for drawing connections
    const nodePositions = {};

    // Draw connections first (behind nodes)
    const connGraphics = this.add.graphics();
    connGraphics.lineStyle(2, 0x333355, 0.4);

    // Calculate positions
    map.floors.forEach((floor, fi) => {
      const y = mapBottom - (fi + 1) * floorSpacing;
      const nodeCount = floor.length;
      const nodeSpacing = (w - 100) / (nodeCount + 1);

      floor.forEach((node, ni) => {
        const x = 50 + nodeSpacing * (ni + 1);
        nodePositions[node.id] = { x, y };
      });
    });

    // Draw connections
    map.floors.forEach((floor) => {
      floor.forEach((node) => {
        const from = nodePositions[node.id];
        if (!from) return;

        node.connections.forEach(connId => {
          const to = nodePositions[connId];
          if (!to) return;

          // Determine line color
          if (node.visited) {
            connGraphics.lineStyle(2, 0x3498db, 0.6);
          } else {
            connGraphics.lineStyle(1, 0x333355, 0.3);
          }

          // Draw curved line
          const midY = (from.y + to.y) / 2;
          connGraphics.beginPath();
          connGraphics.moveTo(from.x, from.y);
          connGraphics.lineTo(to.x, to.y);
          connGraphics.strokePath();
        });
      });
    });

    // Draw nodes
    map.floors.forEach((floor, fi) => {
      floor.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;

        this.createMapNode(pos.x, pos.y, node);
      });
    });

    // Floor labels (every 3 floors)
    for (let fi = 0; fi < totalFloors; fi += 3) {
      const y = mapBottom - (fi + 1) * floorSpacing;
      this.add.text(8, y, `${fi + 1}`, {
        fontSize: '10px',
        fill: '#445566',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
    }
  }

  createMapNode(x, y, node) {
    const nodeInfo = NODE_TYPES[node.type] || NODE_TYPES.combat;
    const radius = node.type === 'boss' ? 22 : 16;

    const container = this.add.container(x, y);

    // Node background
    const nodeBg = this.add.graphics();
    const color = Phaser.Display.Color.HexStringToColor(nodeInfo.color).color;

    if (node.visited) {
      // Visited - dimmed
      nodeBg.fillStyle(color, 0.2);
      nodeBg.fillCircle(0, 0, radius);
      nodeBg.lineStyle(2, color, 0.3);
      nodeBg.strokeCircle(0, 0, radius);
    } else if (node.accessible) {
      // Accessible - bright, pulsing
      nodeBg.fillStyle(color, 0.6);
      nodeBg.fillCircle(0, 0, radius);
      nodeBg.lineStyle(2, color, 1);
      nodeBg.strokeCircle(0, 0, radius);

      // Glow effect
      const glow = this.add.circle(0, 0, radius + 4, color, 0.15);
      container.add(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.1, to: 0.25 },
        scaleX: { from: 1, to: 1.15 },
        scaleY: { from: 1, to: 1.15 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    } else {
      // Locked - dark
      nodeBg.fillStyle(0x222233, 0.5);
      nodeBg.fillCircle(0, 0, radius);
      nodeBg.lineStyle(1, 0x444455, 0.3);
      nodeBg.strokeCircle(0, 0, radius);
    }

    container.add(nodeBg);

    // Node icon
    const iconText = this.add.text(0, 0, nodeInfo.icon, {
      fontSize: node.type === 'boss' ? '18px' : '14px',
      fill: node.visited ? '#666677' : (node.accessible ? '#ffffff' : '#555566'),
      fontFamily: 'monospace'
    }).setOrigin(0.5);
    container.add(iconText);

    // Label (show on hover)
    const label = this.add.text(0, radius + 10, nodeInfo.label, {
      fontSize: '10px',
      fill: nodeInfo.color,
      fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);
    container.add(label);

    // Interactive
    if (node.accessible && !node.visited) {
      const hitArea = this.add.zone(0, 0, radius * 2 + 10, radius * 2 + 10);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerover', () => {
        label.setVisible(true);
        container.setScale(1.15);
      });

      hitArea.on('pointerout', () => {
        label.setVisible(false);
        container.setScale(1);
      });

      hitArea.on('pointerdown', () => {
        this.selectNode(node);
      });

      container.add(hitArea);
    }
  }

  selectNode(node) {
    const state = this.runManager.getState();

    switch (node.type) {
      case 'combat':
      case 'elite': {
        const enemyIds = this.runManager.getEncounter(node.id);
        if (!enemyIds) return;
        this.runManager.visitNode(node.id);
        this.scene.start('CombatScene', {
          playerState: {
            hp: state.hp,
            maxHp: state.maxHp,
            deck: [...state.deck]
          },
          enemyIds,
          runManager: this.runManager,
          nodeType: node.type
        });
        break;
      }
      case 'rest':
        this.runManager.visitNode(node.id);
        this.scene.start('RestScene', { runManager: this.runManager });
        break;
      case 'event':
        this.runManager.visitNode(node.id);
        this.scene.start('EventScene', { runManager: this.runManager });
        break;
      case 'boss': {
        const bossEnemies = this.runManager.getEncounter(node.id);
        if (!bossEnemies) return;
        this.runManager.visitNode(node.id);
        this.scene.start('CombatScene', {
          playerState: {
            hp: state.hp,
            maxHp: state.maxHp,
            deck: [...state.deck]
          },
          enemyIds: bossEnemies,
          runManager: this.runManager,
          nodeType: 'boss'
        });
        break;
      }
      default:
        this.runManager.visitNode(node.id);
        this.scene.start('MapScene', { runManager: this.runManager });
    }
  }
}
