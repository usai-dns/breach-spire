export class EventScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EventScene' });
  }

  init(data) {
    this.runManager = data.runManager;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1a2e, 0x0a1a2e, 0x1a2a3e, 0x1a2a3e, 1);
    bg.fillRect(0, 0, w, h);

    // Generate random event
    const event = this.runManager.generateEvent();

    // Mystery icon
    this.add.text(w / 2, 50, '?', {
      fontSize: '48px',
      fill: '#3498db',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Event title
    this.add.text(w / 2, 100, event.title, {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    this.add.text(w / 2, 145, event.description, {
      fontSize: '14px',
      fill: '#aabbcc',
      fontFamily: 'monospace',
      wordWrap: { width: w - 100 },
      align: 'center'
    }).setOrigin(0.5);

    // Choices
    event.choices.forEach((choice, i) => {
      this.createChoiceButton(w / 2, 210 + i * 55, choice);
    });
  }

  createChoiceButton(x, y, choice) {
    const bw = 380;
    const bh = 42;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a4a, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0x3498db, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const label = this.add.text(0, 0, choice.text, {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'monospace'
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
      label.setColor('#5dade2');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a2a4a, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0x3498db, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      label.setColor('#ffffff');
    });

    container.on('pointerdown', () => {
      const result = this.runManager.applyEventChoice(choice);
      this.showResult(result.results);
    });
  }

  showResult(results) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);
    overlay.setDepth(100);

    const resultText = results.join('\n');
    this.add.text(w / 2, h * 0.4, resultText, {
      fontSize: '18px',
      fill: '#f1c40f',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setDepth(101);

    this.add.text(w / 2, h * 0.55, 'Click to continue', {
      fontSize: '14px',
      fill: '#aaaaaa',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(101);

    this.input.once('pointerdown', () => {
      this.scene.start('MapScene', { runManager: this.runManager });
    });
  }
}
