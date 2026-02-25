export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const barW = 320;
    const barH = 30;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x222244, 1);
    bg.fillRect(barX, barY, barW, barH);

    const bar = this.add.graphics();

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x3498db, 1);
      bar.fillRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4);
    });

    this.add.text(width / 2, barY - 30, 'Loading...', {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Generate placeholder textures programmatically
    this.createPlaceholderTextures();
  }

  createPlaceholderTextures() {
    // Card back
    const cardBack = this.make.graphics({ add: false });
    cardBack.fillStyle(0x2c2c3e, 1);
    cardBack.fillRoundedRect(0, 0, 120, 160, 8);
    cardBack.lineStyle(2, 0x6b6b8d);
    cardBack.strokeRoundedRect(0, 0, 120, 160, 8);
    cardBack.generateTexture('card_back', 120, 160);
    cardBack.destroy();

    // Energy orb
    const orb = this.make.graphics({ add: false });
    orb.fillStyle(0xf39c12, 1);
    orb.fillCircle(15, 15, 15);
    orb.lineStyle(2, 0xf1c40f);
    orb.strokeCircle(15, 15, 15);
    orb.generateTexture('energy_orb', 30, 30);
    orb.destroy();

    // Intent icons
    this.createIntentTexture('intent_attack', 0xe74c3c, 'sword');
    this.createIntentTexture('intent_defend', 0x3498db, 'shield');
    this.createIntentTexture('intent_buff', 0xf39c12, 'arrow_up');
    this.createIntentTexture('intent_debuff', 0x9b59b6, 'arrow_down');
    this.createIntentTexture('intent_multi', 0xe67e22, 'multi');

    // Particle texture
    const particle = this.make.graphics({ add: false });
    particle.fillStyle(0xffffff, 1);
    particle.fillCircle(4, 4, 4);
    particle.generateTexture('particle', 8, 8);
    particle.destroy();
  }

  createIntentTexture(key, color, type) {
    const g = this.make.graphics({ add: false });
    const s = 24;

    g.fillStyle(color, 1);

    if (type === 'sword') {
      g.fillTriangle(s / 2, 2, s - 4, s - 2, 4, s - 2);
    } else if (type === 'shield') {
      g.fillRoundedRect(3, 2, s - 6, s - 4, 4);
    } else if (type === 'arrow_up') {
      g.fillTriangle(s / 2, 2, s - 2, s / 2, 2, s / 2);
      g.fillRect(s / 2 - 3, s / 2, 6, s / 2 - 2);
    } else if (type === 'arrow_down') {
      g.fillTriangle(s / 2, s - 2, s - 2, s / 2, 2, s / 2);
      g.fillRect(s / 2 - 3, 2, 6, s / 2 - 2);
    } else if (type === 'multi') {
      g.fillTriangle(s / 2, 2, s - 4, s / 2, 4, s / 2);
      g.fillTriangle(s / 2, s / 2, s - 4, s - 2, 4, s - 2);
    }

    g.generateTexture(key, s, s);
    g.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
