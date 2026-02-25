import { CARD_COLORS } from '../data/cards.js';

export class RewardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RewardScene' });
  }

  init(data) {
    this.playerHp = data.playerHp;
    this.runManager = data.runManager;
    this.nodeType = data.nodeType || 'combat';
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    // Update run state
    this.runManager.updateHp(this.playerHp.hp);
    this.runManager.recordCombatWin();

    // Victory text
    this.add.text(w / 2, 40, 'VICTORY!', {
      fontSize: '32px',
      fill: '#f1c40f',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // HP display
    this.add.text(w / 2, 75, `HP: ${this.playerHp.hp}/${this.playerHp.maxHp}`, {
      fontSize: '14px',
      fill: '#2ecc71',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Generate rewards
    const isElite = this.nodeType === 'elite';
    const rewards = this.runManager.generateRewards(isElite);

    this.add.text(w / 2, 110, 'Choose a card to add to your deck:', {
      fontSize: '14px',
      fill: '#aabbcc',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Display reward cards
    const cardW = 140;
    const cardH = 200;
    const spacing = 170;
    const startX = w / 2 - (rewards.length - 1) * spacing / 2;

    rewards.forEach((card, i) => {
      const x = startX + i * spacing;
      const y = h * 0.45;
      this.createRewardCard(x, y, cardW, cardH, card);
    });

    // Skip button
    this.createButton(w / 2, h - 60, 'SKIP', () => {
      this.goToMap();
    });
  }

  createRewardCard(x, y, cardW, cardH, card) {
    const container = this.add.container(x, y);
    const colors = CARD_COLORS[card.type] || CARD_COLORS.attack;
    const bgColor = Phaser.Display.Color.HexStringToColor(colors.bg).color;
    const borderColor = Phaser.Display.Color.HexStringToColor(colors.border).color;

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
    bg.lineStyle(3, borderColor, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);

    // Cost
    const costBg = this.add.graphics();
    costBg.fillStyle(0xf39c12, 1);
    costBg.fillCircle(-cardW / 2 + 20, -cardH / 2 + 20, 16);
    costBg.lineStyle(2, 0xffffff, 0.5);
    costBg.strokeCircle(-cardW / 2 + 20, -cardH / 2 + 20, 16);

    const costText = this.add.text(-cardW / 2 + 20, -cardH / 2 + 20, `${card.cost}`, {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Rarity badge
    const rarityColors = { common: '#aaaaaa', uncommon: '#3498db', rare: '#f1c40f' };
    const rarityText = this.add.text(cardW / 2 - 20, -cardH / 2 + 20, card.rarity.charAt(0).toUpperCase(), {
      fontSize: '12px',
      fill: rarityColors[card.rarity] || '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Name
    const nameText = this.add.text(0, -30, card.name, {
      fontSize: '15px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      align: 'center', wordWrap: { width: cardW - 20 }
    }).setOrigin(0.5);

    // Type
    const typeText = this.add.text(0, -8, card.type.charAt(0).toUpperCase() + card.type.slice(1), {
      fontSize: '11px', fill: colors.text, fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Divider
    bg.lineStyle(1, borderColor, 0.3);
    bg.lineBetween(-cardW / 2 + 10, 8, cardW / 2 - 10, 8);

    // Description
    const descText = this.add.text(0, 40, card.description, {
      fontSize: '11px', fill: '#ccccdd', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: cardW - 20 }, lineSpacing: 3
    }).setOrigin(0.5);

    container.add([bg, costBg, costText, rarityText, nameText, typeText, descText]);
    container.setSize(cardW, cardH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      container.setScale(1.1);
      container.setY(y - 10);
    });

    container.on('pointerout', () => {
      container.setScale(1);
      container.setY(y);
    });

    container.on('pointerdown', () => {
      this.runManager.addCard(card.id);

      // Flash effect
      const flash = this.add.graphics();
      flash.fillStyle(0xf1c40f, 0.3);
      flash.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          flash.destroy();
          this.goToMap();
        }
      });
    });
  }

  goToMap() {
    this.scene.start('MapScene', { runManager: this.runManager });
  }

  createButton(x, y, text, callback) {
    const bw = 160;
    const bh = 38;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a4a, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0x3498db, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const label = this.add.text(0, 0, text, {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a3a5a, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0x5dade2, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a2a4a, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0x3498db, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    });

    container.on('pointerdown', callback);
  }
}
