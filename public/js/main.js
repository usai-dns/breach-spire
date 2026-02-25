import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MapScene } from './scenes/MapScene.js';
import { CombatScene } from './scenes/CombatScene.js';
import { RewardScene } from './scenes/RewardScene.js';
import { RestScene } from './scenes/RestScene.js';
import { EventScene } from './scenes/EventScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: document.body,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    MenuScene,
    MapScene,
    CombatScene,
    RewardScene,
    RestScene,
    EventScene,
    GameOverScene
  ]
};

const game = new Phaser.Game(config);

// Expose game for debugging
if (typeof window !== 'undefined') {
  window.game = game;
}
