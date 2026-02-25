import { ENEMIES } from '../data/enemies.js';

export class EnemyAI {
  constructor(logger) {
    this.logger = logger;
  }

  // Create a combat-ready enemy instance from a template
  createEnemy(enemyId) {
    const template = ENEMIES[enemyId];
    if (!template) throw new Error(`Unknown enemy: ${enemyId}`);

    const hp = this.randomRange(template.hpRange[0], template.hpRange[1]);

    return {
      id: template.id,
      name: template.name,
      hp,
      maxHp: hp,
      block: 0,
      statuses: {},
      resistances: { ...template.resistances },
      intents: template.intents,
      color: template.color,
      shape: template.shape,
      size: { ...template.size },
      elite: template.elite || false,
      boss: template.boss || false,
      currentIntent: null,
      lastIntentIndex: -1
    };
  }

  // Select next intent for an enemy using weighted random
  selectIntent(enemy) {
    const intents = enemy.intents;
    const totalWeight = intents.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < intents.length; i++) {
      roll -= intents[i].weight;
      if (roll <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Avoid repeating the same intent twice in a row (try once)
    if (selectedIndex === enemy.lastIntentIndex && intents.length > 1) {
      selectedIndex = (selectedIndex + 1) % intents.length;
    }

    enemy.lastIntentIndex = selectedIndex;
    enemy.currentIntent = { ...intents[selectedIndex] };

    // Calculate displayed damage (includes strength)
    if (enemy.currentIntent.type === 'attack') {
      enemy.currentIntent.displayDamage =
        enemy.currentIntent.damage + (enemy.statuses.strength || 0);
    } else if (enemy.currentIntent.type === 'multi') {
      enemy.currentIntent.actions = enemy.currentIntent.actions.map(a => {
        if (a.type === 'attack') {
          return { ...a, displayDamage: a.damage + (enemy.statuses.strength || 0) };
        }
        return { ...a };
      });
    }

    this.logger.combat('Intent', `${enemy.name}: ${enemy.currentIntent.name}`);
    return enemy.currentIntent;
  }

  // Select intents for all living enemies
  selectAllIntents(enemies) {
    return enemies.map((enemy, i) => {
      if (enemy.hp <= 0) return null;
      return this.selectIntent(enemy);
    });
  }

  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
