import { CombatManager, CombatState } from '../systems/CombatManager.js';
import { CARD_COLORS, DAMAGE_TYPE_COLORS } from '../data/cards.js';
import { STARTER_DECK } from '../data/cards.js';

export class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.combatData = data;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.W = w;
    this.H = h;

    // Determine player state and enemies
    let playerState, enemyIds;

    if (this.combatData.quickCombat) {
      playerState = { hp: 80, maxHp: 80, deck: [...STARTER_DECK] };
      enemyIds = ['goblin', 'fire_imp'];
    } else {
      playerState = this.combatData.playerState;
      enemyIds = this.combatData.enemyIds;
    }

    // Create combat manager
    this.combat = new CombatManager(playerState, enemyIds);
    this.animating = false;
    this.selectedCardIndex = -1;
    this.needsTarget = false;

    // UI containers
    this.cardSprites = [];
    this.enemySprites = [];

    // Draw background
    this.createBackground();

    // Click on background to cancel card selection
    this.input.on('pointerdown', (pointer) => {
      // Only cancel if we're in targeting mode and clicked empty space
      if (this.needsTarget && this.selectedCardIndex >= 0) {
        // Small delay to let card/enemy clicks fire first
        this.time.delayedCall(10, () => {
          if (this.needsTarget) {
            this.cancelSelection();
          }
        });
      }
    });

    // Create UI elements
    this.createPlayerUI();
    this.createEnemyDisplay();
    this.createEndTurnButton();
    this.createDeckCounters();
    this.createTurnIndicator();
    this.createTargetingPrompt();

    // Start first turn
    this.time.delayedCall(300, () => {
      this.startPlayerTurn();
    });

    // Expose for debugging
    if (typeof window !== 'undefined') {
      window.combat = this.combat;
      window.combatScene = this;
    }
  }

  // ===============================
  // BACKGROUND & LAYOUT
  // ===============================

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, this.W, this.H);

    // Floor line
    bg.lineStyle(1, 0x333355, 0.5);
    bg.lineBetween(0, this.H * 0.52, this.W, this.H * 0.52);

    // Atmospheric details
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.W;
      const y = Math.random() * this.H * 0.5;
      this.add.circle(x, y, 1 + Math.random(), 0x4444aa, 0.15 + Math.random() * 0.2);
    }
  }

  // ===============================
  // PLAYER UI
  // ===============================

  createPlayerUI() {
    const state = this.combat.getState();
    const y = this.H * 0.57;

    // Player area background
    this.playerAreaBg = this.add.graphics();
    this.playerAreaBg.fillStyle(0x111122, 0.8);
    this.playerAreaBg.fillRoundedRect(10, y - 10, this.W - 20, 32, 6);

    // HP Bar
    this.hpBarBg = this.add.graphics();
    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(20, y, '', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Energy display
    this.energyText = this.add.text(this.W / 2, y, '', {
      fontSize: '16px',
      fill: '#f39c12',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Block display
    this.blockText = this.add.text(this.W - 20, y, '', {
      fontSize: '14px',
      fill: '#3498db',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    // Player status effects
    this.playerStatusText = this.add.text(this.W / 2, y + 20, '', {
      fontSize: '11px',
      fill: '#aaaacc',
      fontFamily: 'monospace'
    }).setOrigin(0.5, 0);

    this.updatePlayerUI();
  }

  updatePlayerUI() {
    const state = this.combat.getState();
    const p = state.player;
    const y = this.H * 0.57;

    // HP bar
    const hpBarW = 180;
    const hpPercent = p.hp / p.maxHp;
    const hpColor = hpPercent > 0.5 ? 0x2ecc71 : (hpPercent > 0.25 ? 0xf39c12 : 0xe74c3c);

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x333344, 1);
    this.hpBarBg.fillRoundedRect(18, y - 8, hpBarW, 16, 4);

    this.hpBar.clear();
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRoundedRect(18, y - 8, hpBarW * hpPercent, 16, 4);

    this.hpText.setText(`♥ ${p.hp}/${p.maxHp}`);
    this.hpText.setX(20 + hpBarW + 8);

    // Energy
    this.energyText.setText(`⚡ ${p.energy}/${p.maxEnergy}`);

    // Block
    if (p.block > 0) {
      this.blockText.setText(`🛡 ${p.block}`);
      this.blockText.setVisible(true);
    } else {
      this.blockText.setVisible(false);
    }

    // Status effects
    const statuses = this.formatStatuses(p.statuses);
    this.playerStatusText.setText(statuses);
  }

  // ===============================
  // ENEMY DISPLAY
  // ===============================

  createEnemyDisplay() {
    const state = this.combat.getState();
    const enemies = state.enemies;
    this.enemySprites = [];

    const spacing = this.W / (enemies.length + 1);

    enemies.forEach((enemy, i) => {
      const x = spacing * (i + 1);
      const y = this.H * 0.3;

      const container = this.add.container(x, y);

      // Enemy body
      const body = this.add.graphics();
      this.drawEnemyShape(body, enemy, 0, 0);
      container.add(body);

      // Enemy name
      const name = this.add.text(0, -enemy.size.h - 15, enemy.name, {
        fontSize: '13px',
        fill: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(name);

      // HP bar background
      const hpBarW = 80;
      const hpBg = this.add.graphics();
      hpBg.fillStyle(0x333344, 1);
      hpBg.fillRoundedRect(-hpBarW / 2, enemy.size.h / 2 + 8, hpBarW, 10, 3);
      container.add(hpBg);

      // HP bar fill
      const hpFill = this.add.graphics();
      container.add(hpFill);

      // HP text
      const hpText = this.add.text(0, enemy.size.h / 2 + 22, '', {
        fontSize: '11px',
        fill: '#cccccc',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
      container.add(hpText);

      // Block display
      const blockText = this.add.text(enemy.size.w / 2 + 15, -5, '', {
        fontSize: '13px',
        fill: '#3498db',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      container.add(blockText);

      // Intent display
      const intentContainer = this.add.container(0, -enemy.size.h - 35);
      const intentBg = this.add.graphics();
      const intentText = this.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      intentContainer.add([intentBg, intentText]);
      container.add(intentContainer);

      // Status effects text
      const statusText = this.add.text(0, enemy.size.h / 2 + 36, '', {
        fontSize: '10px',
        fill: '#aaaacc',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
      container.add(statusText);

      // Make enemy clickable for targeting
      const hitArea = this.add.zone(0, 0, enemy.size.w + 30, enemy.size.h + 30);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => this.onEnemyClick(i));
      hitArea.on('pointerover', () => {
        if (this.needsTarget) {
          body.setAlpha(0.8);
          container.setScale(1.05);
        }
      });
      hitArea.on('pointerout', () => {
        body.setAlpha(1);
        container.setScale(1);
      });
      container.add(hitArea);

      this.enemySprites.push({
        container,
        body,
        name,
        hpBg,
        hpFill,
        hpText,
        blockText,
        intentContainer,
        intentBg,
        intentText,
        statusText,
        x, y,
        enemy
      });
    });

    this.updateEnemyDisplay();
  }

  drawEnemyShape(graphics, enemy, x, y) {
    const color = Phaser.Display.Color.HexStringToColor(enemy.color).color;
    const w = enemy.size.w;
    const h = enemy.size.h;

    graphics.clear();

    switch (enemy.shape) {
      case 'triangle':
        graphics.fillStyle(color, 1);
        graphics.fillTriangle(x, y - h / 2, x + w / 2, y + h / 2, x - w / 2, y + h / 2);
        graphics.lineStyle(2, 0xffffff, 0.3);
        graphics.strokeTriangle(x, y - h / 2, x + w / 2, y + h / 2, x - w / 2, y + h / 2);
        // Eyes
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(x - 8, y - 5, 3);
        graphics.fillCircle(x + 8, y - 5, 3);
        break;

      case 'blob':
        graphics.fillStyle(color, 1);
        graphics.fillEllipse(x, y, w, h);
        graphics.lineStyle(2, 0xffffff, 0.2);
        graphics.strokeEllipse(x, y, w, h);
        // Eyes
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(x - 10, y - 5, 4);
        graphics.fillCircle(x + 10, y - 5, 4);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(x - 9, y - 6, 2);
        graphics.fillCircle(x + 11, y - 6, 2);
        break;

      case 'diamond':
        graphics.fillStyle(color, 1);
        graphics.fillTriangle(x, y - h / 2, x + w / 2, y, x, y + h / 2);
        graphics.fillTriangle(x, y - h / 2, x - w / 2, y, x, y + h / 2);
        graphics.lineStyle(2, 0xffffff, 0.3);
        graphics.strokeTriangle(x, y - h / 2, x + w / 2, y, x, y + h / 2);
        // Inner glow
        graphics.fillStyle(0xffaa00, 0.5);
        graphics.fillCircle(x, y - 5, 6);
        break;

      case 'rectangle':
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
        graphics.lineStyle(2, 0xffffff, 0.3);
        graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
        // Face
        graphics.fillStyle(0x0044aa, 1);
        graphics.fillRect(x - 15, y - 12, 10, 6);
        graphics.fillRect(x + 5, y - 12, 10, 6);
        graphics.lineStyle(2, 0x0044aa);
        graphics.lineBetween(x - 10, y + 8, x + 10, y + 8);
        break;

      case 'wisp':
        // Ghostly shape
        graphics.fillStyle(color, 0.7);
        graphics.fillCircle(x, y - h / 4, w / 2);
        graphics.fillTriangle(
          x - w / 2, y - h / 4,
          x + w / 2, y - h / 4,
          x, y + h / 2
        );
        // Wispy trails
        graphics.fillStyle(color, 0.4);
        graphics.fillCircle(x - 10, y + h / 4, 6);
        graphics.fillCircle(x + 12, y + h / 4 + 3, 5);
        // Eyes
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillCircle(x - 8, y - h / 4 - 3, 4);
        graphics.fillCircle(x + 8, y - h / 4 - 3, 4);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(x - 7, y - h / 4 - 3, 2);
        graphics.fillCircle(x + 9, y - h / 4 - 3, 2);
        break;

      case 'boss':
        // Large menacing shape
        graphics.fillStyle(color, 1);
        // Body
        graphics.fillRoundedRect(x - w / 2, y - h / 3, w, h * 0.7, 8);
        // Crown/head
        graphics.fillTriangle(x, y - h / 2 - 10, x + w / 3, y - h / 3, x - w / 3, y - h / 3);
        // Horns
        graphics.fillTriangle(x - w / 2, y - h / 3, x - w / 2 - 15, y - h / 2 - 5, x - w / 3, y - h / 3);
        graphics.fillTriangle(x + w / 2, y - h / 3, x + w / 2 + 15, y - h / 2 - 5, x + w / 3, y - h / 3);
        graphics.lineStyle(2, 0xffffff, 0.3);
        graphics.strokeRoundedRect(x - w / 2, y - h / 3, w, h * 0.7, 8);
        // Glowing eyes
        graphics.fillStyle(0xff3300, 1);
        graphics.fillCircle(x - 15, y - h / 6, 6);
        graphics.fillCircle(x + 15, y - h / 6, 6);
        graphics.fillStyle(0xffcc00, 1);
        graphics.fillCircle(x - 15, y - h / 6, 3);
        graphics.fillCircle(x + 15, y - h / 6, 3);
        break;

      default:
        graphics.fillStyle(color, 1);
        graphics.fillRect(x - w / 2, y - h / 2, w, h);
    }
  }

  updateEnemyDisplay() {
    const state = this.combat.getState();

    this.enemySprites.forEach((sprite, i) => {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0) {
        sprite.container.setVisible(false);
        return;
      }

      // HP bar
      const hpBarW = 80;
      const hpPercent = enemy.hp / enemy.maxHp;
      const hpColor = hpPercent > 0.5 ? 0x2ecc71 : (hpPercent > 0.25 ? 0xf39c12 : 0xe74c3c);

      sprite.hpFill.clear();
      sprite.hpFill.fillStyle(hpColor, 1);
      sprite.hpFill.fillRoundedRect(-hpBarW / 2, enemy.size.h / 2 + 8, hpBarW * hpPercent, 10, 3);

      sprite.hpText.setText(`${enemy.hp}/${enemy.maxHp}`);

      // Block
      if (enemy.block > 0) {
        sprite.blockText.setText(`🛡${enemy.block}`);
        sprite.blockText.setVisible(true);
      } else {
        sprite.blockText.setVisible(false);
      }

      // Intent
      if (enemy.currentIntent) {
        this.updateIntentDisplay(sprite, enemy);
      }

      // Statuses
      const statuses = this.formatStatuses(enemy.statuses);
      sprite.statusText.setText(statuses);
    });
  }

  updateIntentDisplay(sprite, enemy) {
    const intent = enemy.currentIntent;
    sprite.intentBg.clear();

    let text = '';
    let color = 0xaaaaaa;

    if (intent.type === 'attack') {
      const dmg = intent.displayDamage || intent.damage;
      text = `⚔ ${dmg}`;
      color = 0xe74c3c;
    } else if (intent.type === 'defend') {
      text = `🛡 ${intent.block}`;
      color = 0x3498db;
    } else if (intent.type === 'buff') {
      text = `↑ ${intent.status}`;
      color = 0xf39c12;
    } else if (intent.type === 'debuff') {
      text = `↓ ${intent.status}`;
      color = 0x9b59b6;
    } else if (intent.type === 'multi') {
      text = `⚔⚔`;
      color = 0xe67e22;
    }

    // Draw intent background
    const padW = 8;
    sprite.intentText.setText(text);
    const tw = sprite.intentText.width;

    sprite.intentBg.fillStyle(color, 0.3);
    sprite.intentBg.fillRoundedRect(-tw / 2 - padW, -10, tw + padW * 2, 20, 6);
    sprite.intentBg.lineStyle(1, color, 0.6);
    sprite.intentBg.strokeRoundedRect(-tw / 2 - padW, -10, tw + padW * 2, 20, 6);
  }

  // ===============================
  // CARD HAND DISPLAY
  // ===============================

  renderHand() {
    // Clear existing cards
    this.cardSprites.forEach(cs => cs.container.destroy());
    this.cardSprites = [];

    const state = this.combat.getState();
    const hand = state.hand;
    if (hand.length === 0) return;

    const cardW = 110;
    const cardH = 150;
    const totalW = Math.min(hand.length * (cardW + 8), this.W - 40);
    const spacing = totalW / hand.length;
    const startX = (this.W - totalW) / 2 + spacing / 2;
    const baseY = this.H - cardH / 2 - 10;

    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const y = baseY;
      const canPlay = this.combat.canPlayCard(i);

      const container = this.add.container(x, y);

      // Card background
      const colors = CARD_COLORS[card.type] || CARD_COLORS.attack;
      const bgColor = Phaser.Display.Color.HexStringToColor(colors.bg).color;
      const borderColor = Phaser.Display.Color.HexStringToColor(colors.border).color;

      const bg = this.add.graphics();
      bg.fillStyle(canPlay ? bgColor : 0x222222, 1);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      bg.lineStyle(2, canPlay ? borderColor : 0x444444, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);

      // Cost circle
      const costBg = this.add.graphics();
      costBg.fillStyle(canPlay ? 0xf39c12 : 0x555555, 1);
      costBg.fillCircle(-cardW / 2 + 16, -cardH / 2 + 16, 14);
      costBg.lineStyle(2, 0xffffff, 0.5);
      costBg.strokeCircle(-cardW / 2 + 16, -cardH / 2 + 16, 14);

      const costText = this.add.text(-cardW / 2 + 16, -cardH / 2 + 16, `${card.cost}`, {
        fontSize: '14px',
        fill: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Card name
      const nameText = this.add.text(0, -20, card.name, {
        fontSize: '12px',
        fill: canPlay ? '#ffffff' : '#666666',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: cardW - 16 }
      }).setOrigin(0.5);

      // Type indicator
      const typeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
      const typeText = this.add.text(0, 2, typeLabel, {
        fontSize: '9px',
        fill: canPlay ? colors.text : '#555555',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      // Divider line
      bg.lineStyle(1, borderColor, 0.3);
      bg.lineBetween(-cardW / 2 + 8, 14, cardW / 2 - 8, 14);

      // Description
      const descText = this.add.text(0, 38, card.description, {
        fontSize: '10px',
        fill: canPlay ? '#ccccdd' : '#555555',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: cardW - 16 },
        lineSpacing: 2
      }).setOrigin(0.5);

      container.add([bg, costBg, costText, nameText, typeText, descText]);
      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: canPlay });

      if (canPlay) {
        container.on('pointerover', () => {
          container.setScale(1.15);
          container.setY(y - 20);
          container.setDepth(100);
        });

        container.on('pointerout', () => {
          if (this.selectedCardIndex !== i) {
            container.setScale(1);
            container.setY(y);
            container.setDepth(i);
          }
        });

        container.on('pointerdown', () => this.onCardClick(i));
      }

      container.setDepth(i);

      this.cardSprites.push({
        container,
        card,
        index: i,
        baseX: x,
        baseY: y
      });
    });
  }

  // ===============================
  // END TURN BUTTON
  // ===============================

  createEndTurnButton() {
    const x = this.W - 80;
    const y = this.H * 0.52 + 18;

    this.endTurnContainer = this.add.container(x, y);

    this.endTurnBg = this.add.graphics();
    this.endTurnBg.fillStyle(0x1a3a1a, 1);
    this.endTurnBg.fillRoundedRect(-55, -18, 110, 36, 8);
    this.endTurnBg.lineStyle(2, 0x2ecc71, 1);
    this.endTurnBg.strokeRoundedRect(-55, -18, 110, 36, 8);

    this.endTurnLabel = this.add.text(0, 0, 'END TURN', {
      fontSize: '14px',
      fill: '#2ecc71',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.endTurnContainer.add([this.endTurnBg, this.endTurnLabel]);
    this.endTurnContainer.setSize(110, 36);
    this.endTurnContainer.setInteractive({ useHandCursor: true });
    this.endTurnContainer.setDepth(200);

    this.endTurnContainer.on('pointerover', () => {
      this.endTurnBg.clear();
      this.endTurnBg.fillStyle(0x2a4a2a, 1);
      this.endTurnBg.fillRoundedRect(-55, -18, 110, 36, 8);
      this.endTurnBg.lineStyle(2, 0x4dff4d, 1);
      this.endTurnBg.strokeRoundedRect(-55, -18, 110, 36, 8);
    });

    this.endTurnContainer.on('pointerout', () => {
      this.endTurnBg.clear();
      this.endTurnBg.fillStyle(0x1a3a1a, 1);
      this.endTurnBg.fillRoundedRect(-55, -18, 110, 36, 8);
      this.endTurnBg.lineStyle(2, 0x2ecc71, 1);
      this.endTurnBg.strokeRoundedRect(-55, -18, 110, 36, 8);
    });

    this.endTurnContainer.on('pointerdown', () => this.onEndTurn());
  }

  // ===============================
  // DECK COUNTERS
  // ===============================

  createDeckCounters() {
    const y = this.H - 18;

    this.drawCountText = this.add.text(20, y, '', {
      fontSize: '12px',
      fill: '#6699bb',
      fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    this.discardCountText = this.add.text(this.W / 2, y, '', {
      fontSize: '12px',
      fill: '#bb9966',
      fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5);

    this.exhaustCountText = this.add.text(this.W - 20, y, '', {
      fontSize: '12px',
      fill: '#996666',
      fontFamily: 'monospace'
    }).setOrigin(1, 0.5);

    this.updateDeckCounters();
  }

  updateDeckCounters() {
    const counts = this.combat.getState().deckCounts;
    this.drawCountText.setText(`Draw: ${counts.draw}`);
    this.discardCountText.setText(`Discard: ${counts.discard}`);
    this.exhaustCountText.setText(`Exhaust: ${counts.exhaust}`);
  }

  // ===============================
  // TURN INDICATOR
  // ===============================

  createTurnIndicator() {
    this.turnText = this.add.text(this.W / 2, 15, '', {
      fontSize: '14px',
      fill: '#8899bb',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(200);
  }

  updateTurnIndicator() {
    const state = this.combat.getState();
    this.turnText.setText(`Turn ${state.turn}`);
  }

  createTargetingPrompt() {
    this.targetPrompt = this.add.text(this.W / 2, this.H * 0.48, '', {
      fontSize: '14px',
      fill: '#f1c40f',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(300).setVisible(false);
  }

  showTargetingPrompt(text) {
    this.targetPrompt.setText(text);
    this.targetPrompt.setVisible(true);
  }

  hideTargetingPrompt() {
    this.targetPrompt.setVisible(false);
  }

  // ===============================
  // GAME FLOW
  // ===============================

  async startPlayerTurn() {
    this.animating = true;
    this.selectedCardIndex = -1;
    this.needsTarget = false;
    this.hideTargetingPrompt();

    const events = this.combat.startPlayerTurn();
    await this.processEvents(events);
    this.renderHand();
    this.updateAllUI();

    // CRITICAL: reset animating flag so player can interact
    this.animating = false;
    this.enableInput(true);
  }

  cancelSelection() {
    this.selectedCardIndex = -1;
    this.needsTarget = false;
    this.hideTargetingPrompt();
    // Re-render hand to reset all card positions and alphas
    this.renderHand();
  }

  onCardClick(handIndex) {
    if (this.animating) return;
    if (!this.combat.canPlayCard(handIndex)) return;

    // If clicking the already-selected card, deselect it
    if (this.selectedCardIndex === handIndex) {
      this.cancelSelection();
      return;
    }

    // If selecting a different card while one is selected, switch
    if (this.selectedCardIndex >= 0) {
      this.cancelSelection();
    }

    if (this.combat.cardNeedsTarget(handIndex)) {
      // Single-target card: need to select an enemy
      this.selectedCardIndex = handIndex;
      this.needsTarget = true;

      // Highlight selected card, dim others
      this.cardSprites.forEach((cs, i) => {
        if (i === handIndex) {
          cs.container.setScale(1.15);
          cs.container.setY(cs.baseY - 25);
          cs.container.setDepth(100);
        } else {
          cs.container.setScale(0.95);
          cs.container.setAlpha(0.6);
        }
      });

      // Highlight targetable enemies
      const state = this.combat.getState();
      this.enemySprites.forEach((sprite, i) => {
        if (state.enemies[i].hp > 0) {
          this.tweens.add({
            targets: sprite.container,
            scaleX: { from: 1.0, to: 1.08 },
            scaleY: { from: 1.0, to: 1.08 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });

      this.showTargetingPrompt('Click an enemy to target');
    } else {
      // Self / all / random cards: play immediately
      // Stop event from reaching background cancel handler
      this.needsTarget = false;
      this.selectedCardIndex = -1;
      this.playCardAtIndex(handIndex, 0);
    }
  }

  onEnemyClick(enemyIndex) {
    if (this.animating) return;

    const state = this.combat.getState();
    if (state.enemies[enemyIndex].hp <= 0) return;

    if (this.needsTarget && this.selectedCardIndex >= 0) {
      const cardIndex = this.selectedCardIndex;
      this.selectedCardIndex = -1;
      this.needsTarget = false;
      this.hideTargetingPrompt();

      // Stop enemy pulse tweens
      this.enemySprites.forEach(sprite => {
        this.tweens.killTweensOf(sprite.container);
        sprite.container.setScale(1);
      });

      this.playCardAtIndex(cardIndex, enemyIndex);
    }
  }

  async playCardAtIndex(handIndex, targetIndex) {
    this.enableInput(false);
    this.animating = true;
    this.hideTargetingPrompt();

    // Stop any enemy pulse tweens
    this.enemySprites.forEach(sprite => {
      this.tweens.killTweensOf(sprite.container);
      sprite.container.setScale(1);
    });

    const events = this.combat.playCard(handIndex, targetIndex);
    if (!events) {
      this.animating = false;
      this.enableInput(true);
      return;
    }

    await this.processEvents(events);

    const state = this.combat.getState();

    if (state.state === CombatState.COMBAT_WIN) {
      await this.delay(500);
      this.onCombatWin();
      return;
    }

    if (state.state === CombatState.COMBAT_LOSE) {
      await this.delay(500);
      this.onCombatLose();
      return;
    }

    this.renderHand();
    this.updateAllUI();
    this.animating = false;
    this.enableInput(true);
  }

  async onEndTurn() {
    if (this.animating) return;
    this.cancelSelection();
    this.enableInput(false);
    this.animating = true;

    // End player turn
    const endEvents = this.combat.endPlayerTurn();
    await this.processEvents(endEvents);

    // Show enemy turn message
    await this.showTurnBanner('ENEMY TURN');

    // Process enemy turn
    const enemyEvents = this.combat.processEnemyTurn();
    await this.processEvents(enemyEvents);

    const state = this.combat.getState();

    if (state.state === CombatState.COMBAT_WIN) {
      await this.delay(500);
      this.onCombatWin();
      return;
    }

    if (state.state === CombatState.COMBAT_LOSE) {
      await this.delay(500);
      this.onCombatLose();
      return;
    }

    // Start new player turn
    await this.showTurnBanner('YOUR TURN');
    await this.startPlayerTurn();
  }

  onCombatWin() {
    this.animating = true;
    const isBoss = this.combatData.nodeType === 'boss';
    this.showMessage(isBoss ? 'BREACH SEALED!' : 'VICTORY!', 2000);
    this.time.delayedCall(1500, () => {
      if (this.combatData.quickCombat) {
        this.scene.start('MenuScene');
      } else if (isBoss) {
        const rm = this.combatData.runManager;
        rm.recordCombatWin();
        this.scene.start('GameOverScene', {
          combatsWon: rm.getState().combatsWon,
          runState: rm.getState(),
          victory: true
        });
      } else {
        this.scene.start('RewardScene', {
          playerHp: this.combat.getPlayerHp(),
          runManager: this.combatData.runManager,
          nodeType: this.combatData.nodeType || 'combat'
        });
      }
    });
  }

  onCombatLose() {
    this.animating = true;
    this.showMessage('DEFEAT', 2000);
    this.time.delayedCall(1500, () => {
      const rm = this.combatData.runManager;
      this.scene.start('GameOverScene', {
        combatsWon: rm ? rm.getState().combatsWon : 0,
        runState: rm ? rm.getState() : null,
        victory: false
      });
    });
  }

  enableInput(enabled) {
    if (enabled) {
      this.endTurnContainer.setInteractive({ useHandCursor: true });
    } else {
      this.endTurnContainer.disableInteractive();
    }
  }

  // ===============================
  // ANIMATION & EVENTS
  // ===============================

  async processEvents(events) {
    if (!events) return;

    for (const event of events) {
      await this.animateEvent(event);
    }

    this.updateAllUI();
  }

  async animateEvent(event) {
    switch (event.type) {
      case 'damage':
        await this.animateDamage(event);
        break;
      case 'enemyAttack':
        await this.animateEnemyAttack(event);
        break;
      case 'block':
        await this.animateBlock(event);
        break;
      case 'status':
      case 'enemyBuff':
      case 'enemyDebuff':
        await this.animateStatus(event);
        break;
      case 'death':
        await this.animateDeath(event);
        break;
      case 'playerDeath':
        await this.animatePlayerDeath();
        break;
      case 'poison':
      case 'burn':
        await this.animateDoT(event);
        break;
      case 'playCard':
        await this.animateCardPlay(event);
        break;
      default:
        // No animation needed
        break;
    }
  }

  async animateDamage(event) {
    if (event.targetType === 'enemy' && event.targetIndex !== undefined) {
      const sprite = this.enemySprites[event.targetIndex];
      if (!sprite) return;

      // Flash enemy red
      const flash = this.add.graphics();
      this.drawEnemyShape(flash, sprite.enemy, 0, 0);
      flash.setAlpha(0.5);
      flash.setTint(0xff0000);
      sprite.container.add(flash);

      // Floating damage number
      const dmgColor = DAMAGE_TYPE_COLORS[event.damageType] || '#ffffff';
      this.showFloatingText(
        sprite.container.x,
        sprite.container.y - 30,
        `-${event.hpDamage}`,
        dmgColor,
        22
      );

      if (event.blocked > 0) {
        this.showFloatingText(
          sprite.container.x + 30,
          sprite.container.y - 15,
          `(${event.blocked} blocked)`,
          '#3498db',
          11
        );
      }

      // Shake
      this.tweens.add({
        targets: sprite.container,
        x: sprite.x + 5,
        duration: 50,
        yoyo: true,
        repeat: 2
      });

      await this.delay(200);
      flash.destroy();
      this.updateEnemyDisplay();
    } else if (event.targetType === 'player') {
      this.cameras.main.shake(100, 0.005);
      this.showFloatingText(
        this.W / 4,
        this.H * 0.55,
        `-${event.hpDamage}`,
        '#ff4444',
        20
      );
      await this.delay(200);
      this.updatePlayerUI();
    }
  }

  async animateEnemyAttack(event) {
    const sprite = this.enemySprites[event.enemyIndex];
    if (!sprite) return;

    // Enemy lunges forward
    await new Promise(resolve => {
      this.tweens.add({
        targets: sprite.container,
        y: sprite.y + 40,
        duration: 150,
        ease: 'Power2',
        yoyo: true,
        onComplete: resolve
      });
    });

    // Damage effect on player
    this.cameras.main.shake(120, 0.008);
    const dmgColor = DAMAGE_TYPE_COLORS[event.damageType] || '#ff4444';
    this.showFloatingText(
      this.W / 4,
      this.H * 0.55,
      `-${event.hpDamage}`,
      dmgColor,
      22
    );

    if (event.blocked > 0) {
      this.showFloatingText(
        this.W / 4 + 40,
        this.H * 0.55 + 10,
        `(${event.blocked} blocked)`,
        '#3498db',
        11
      );
    }

    await this.delay(250);
    this.updatePlayerUI();
  }

  async animateBlock(event) {
    if (event.targetType === 'player') {
      this.showFloatingText(
        this.W * 0.75,
        this.H * 0.55,
        `+${event.amount} 🛡`,
        '#3498db',
        18
      );
      await this.delay(200);
    }
    this.updatePlayerUI();
  }

  async animateStatus(event) {
    const status = event.status;
    const value = event.value;

    if (event.targetType === 'enemy' && event.targetIndex !== undefined) {
      const sprite = this.enemySprites[event.targetIndex];
      if (sprite) {
        this.showFloatingText(
          sprite.container.x,
          sprite.container.y + 30,
          `${status} +${value}`,
          '#f39c12',
          12
        );
      }
    } else if (event.targetType === 'player') {
      this.showFloatingText(
        this.W / 2,
        this.H * 0.65,
        `${status} +${value}`,
        '#f39c12',
        14
      );
    }
    await this.delay(200);
    this.updateAllUI();
  }

  async animateDeath(event) {
    const sprite = this.enemySprites[event.targetIndex];
    if (!sprite) return;

    // Death animation
    await new Promise(resolve => {
      this.tweens.add({
        targets: sprite.container,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 400,
        ease: 'Power2',
        onComplete: resolve
      });
    });

    this.showFloatingText(
      sprite.x, sprite.y,
      `${event.enemyName} defeated!`,
      '#f1c40f',
      16
    );

    await this.delay(300);
  }

  async animatePlayerDeath() {
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.fade(1000, 128, 0, 0);
    await this.delay(1000);
  }

  async animateDoT(event) {
    const color = event.type === 'burn' ? '#ff6b35' : '#2ecc71';
    const label = event.type === 'burn' ? 'BURN' : 'POISON';

    if (event.targetType === 'player') {
      this.showFloatingText(this.W / 4, this.H * 0.55, `${label} -${event.amount}`, color, 16);
      this.cameras.main.shake(80, 0.003);
    } else if (event.targetType === 'enemy' && event.targetIndex !== undefined) {
      const sprite = this.enemySprites[event.targetIndex];
      if (sprite) {
        this.showFloatingText(sprite.x, sprite.y, `${label} -${event.amount}`, color, 14);
      }
    }

    await this.delay(300);
    this.updateAllUI();
  }

  async animateCardPlay(event) {
    // Show the played card name
    const card = event.card;
    const colors = CARD_COLORS[card.type] || CARD_COLORS.attack;
    this.showFloatingText(
      this.W / 2,
      this.H * 0.48,
      card.name,
      colors.text,
      18
    );
    await this.delay(150);
  }

  // ===============================
  // UI HELPERS
  // ===============================

  showFloatingText(x, y, text, color, size = 16) {
    const txt = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      fill: color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  async showTurnBanner(text) {
    const banner = this.add.text(this.W / 2, this.H * 0.4, text, {
      fontSize: '28px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setDepth(1000);

    await new Promise(resolve => {
      this.tweens.add({
        targets: banner,
        alpha: 1,
        duration: 200,
        hold: 500,
        yoyo: true,
        onComplete: () => {
          banner.destroy();
          resolve();
        }
      });
    });
  }

  showMessage(text, duration = 1500) {
    const msg = this.add.text(this.W / 2, this.H * 0.35, text, {
      fontSize: '36px',
      fill: '#f1c40f',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: msg.y - 30,
      duration: duration,
      delay: 500,
      onComplete: () => msg.destroy()
    });
  }

  formatStatuses(statuses) {
    if (!statuses || Object.keys(statuses).length === 0) return '';

    const icons = {
      strength: '💪',
      weak: '⬇',
      vulnerable: '🎯',
      poison: '☠',
      burn: '🔥',
      thorns: '🌹',
      slow: '🐌',
      block: '🛡'
    };

    return Object.entries(statuses)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${icons[k] || k} ${v}`)
      .join('  ');
  }

  updateAllUI() {
    this.updatePlayerUI();
    this.updateEnemyDisplay();
    this.updateDeckCounters();
    this.updateTurnIndicator();
  }

  delay(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
