export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.combatsWon = data.combatsWon || 0;
    this.victory = data.victory || false;
    this.runState = data.runState || null;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    if (this.victory) {
      bg.fillGradientStyle(0x0a1a0a, 0x0a1a0a, 0x1a3a1a, 0x1a3a1a, 1);
    } else {
      bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a1a1a, 0x2a1a1a, 1);
    }
    bg.fillRect(0, 0, w, h);

    // Title
    const titleText = this.victory ? 'BREACH SEALED!' : 'GAME OVER';
    const titleColor = this.victory ? '#2ecc71' : '#e74c3c';

    const title = this.add.text(w / 2, h * 0.2, titleText, {
      fontSize: '42px',
      fill: titleColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Pulse animation
    this.tweens.add({
      targets: title,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    // Stats
    const statsY = h * 0.4;
    const stats = [
      `Combats Won: ${this.combatsWon}`,
    ];

    if (this.runState) {
      stats.push(`Cards in Deck: ${this.runState.deck.length}`);
      stats.push(`Floor Reached: ${this.runState.floor + 1}`);
    }

    stats.forEach((stat, i) => {
      this.add.text(w / 2, statsY + i * 30, stat, {
        fontSize: '16px',
        fill: '#aabbcc',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
    });

    // Play Again button
    this.createButton(w / 2, h * 0.72, 'PLAY AGAIN', () => {
      this.scene.start('MapScene', { newRun: true });
    });

    // Main Menu button
    this.createButton(w / 2, h * 0.82, 'MAIN MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  createButton(x, y, text, callback) {
    const bw = 200;
    const bh = 42;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a4a, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0x3498db, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
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
