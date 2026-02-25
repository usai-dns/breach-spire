export class RestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RestScene' });
  }

  init(data) {
    this.runManager = data.runManager;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = this.runManager.getState();

    // Background - warm campfire colors
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0d0a, 0x1a0d0a, 0x2a1a10, 0x2a1a10, 1);
    bg.fillRect(0, 0, w, h);

    // Campfire effect
    this.createCampfire(w / 2, h * 0.35);

    // Title
    this.add.text(w / 2, 30, 'REST SITE', {
      fontSize: '28px',
      fill: '#f39c12',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // HP display
    const healAmount = Math.floor(state.maxHp * 0.3);
    this.add.text(w / 2, h * 0.55, `HP: ${state.hp}/${state.maxHp}`, {
      fontSize: '18px',
      fill: '#2ecc71',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Rest option
    this.createButton(w / 2, h * 0.68, `REST (Heal ${healAmount} HP)`, () => {
      this.runManager.heal(0.3);
      this.showResult(`Healed ${healAmount} HP! (${Math.min(state.hp + healAmount, state.maxHp)}/${state.maxHp})`);
    });

    // Leave option
    this.createButton(w / 2, h * 0.78, 'LEAVE', () => {
      this.scene.start('MapScene', { runManager: this.runManager });
    });
  }

  createCampfire(x, y) {
    // Fire base
    const fire = this.add.graphics();

    // Animate fire
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        fire.clear();
        // Logs
        fire.fillStyle(0x4a2800, 1);
        fire.fillRect(x - 25, y + 15, 50, 8);
        fire.fillRect(x - 20, y + 10, 40, 8);

        // Fire shapes (randomized)
        const flames = [
          { ox: 0, oy: 0, w: 15, h: 25 + Math.random() * 10, color: 0xff6600 },
          { ox: -8, oy: 3, w: 10, h: 18 + Math.random() * 8, color: 0xff4400 },
          { ox: 8, oy: 2, w: 10, h: 20 + Math.random() * 8, color: 0xff8800 },
          { ox: -3, oy: -5, w: 8, h: 12 + Math.random() * 6, color: 0xffaa00 },
          { ox: 4, oy: -3, w: 7, h: 10 + Math.random() * 5, color: 0xffcc00 }
        ];

        flames.forEach(f => {
          fire.fillStyle(f.color, 0.8);
          fire.fillEllipse(x + f.ox, y - f.h / 2 + f.oy + 5, f.w, f.h);
        });

        // Embers
        for (let i = 0; i < 3; i++) {
          const ex = x + (Math.random() - 0.5) * 30;
          const ey = y - 20 - Math.random() * 30;
          fire.fillStyle(0xffcc00, 0.3 + Math.random() * 0.5);
          fire.fillCircle(ex, ey, 1 + Math.random());
        }
      }
    });

    // Fire glow
    const glow = this.add.circle(x, y, 80, 0xff6600, 0.08);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.12 },
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  showResult(text) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Clear scene except background
    this.children.getAll().forEach(c => {
      if (c.type !== 'Graphics') c.destroy();
    });

    this.add.text(w / 2, h * 0.4, text, {
      fontSize: '20px',
      fill: '#2ecc71',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      this.scene.start('MapScene', { runManager: this.runManager });
    });
  }

  createButton(x, y, text, callback) {
    const bw = 280;
    const bh = 42;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a1a10, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0xf39c12, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const label = this.add.text(0, 0, text, {
      fontSize: '15px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3a2a18, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0xf5b041, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2a1a10, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0xf39c12, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    });

    container.on('pointerdown', callback);
  }
}
