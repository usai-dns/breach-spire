export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, w, h);

    // Decorative particles
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = 1 + Math.random() * 2;
      const alpha = 0.2 + Math.random() * 0.5;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);

      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000
      });
    }

    // Title
    const title = this.add.text(w / 2, h * 0.25, 'BREACH\nWANDERERS', {
      fontSize: '52px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
      stroke: '#3498db',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(w / 2, h * 0.42, 'A Roguelike Deckbuilder', {
      fontSize: '16px',
      fill: '#8899bb',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Title glow animation
    this.tweens.add({
      targets: title,
      alpha: { from: 0.85, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });

    // New Run button
    this.createButton(w / 2, h * 0.58, 'NEW RUN', () => {
      this.scene.start('MapScene', { newRun: true });
    });

    // Quick Combat button (for testing)
    this.createButton(w / 2, h * 0.68, 'QUICK COMBAT', () => {
      this.scene.start('CombatScene', { quickCombat: true });
    });

    // Version
    this.add.text(w / 2, h - 20, 'v0.1.0 - Placeholder Art', {
      fontSize: '11px',
      fill: '#445566',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  createButton(x, y, text, callback) {
    const w = 220;
    const h = 44;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a4a, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0x3498db, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a3a5a, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0x5dade2, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      label.setColor('#5dade2');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a2a4a, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0x3498db, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      label.setColor('#ffffff');
    });

    container.on('pointerdown', callback);

    return container;
  }
}
