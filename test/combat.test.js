import { CombatManager, CombatState } from '../public/js/systems/CombatManager.js';
import { DeckManager } from '../public/js/systems/DeckManager.js';
import { EffectResolver } from '../public/js/systems/EffectResolver.js';
import { EnemyAI } from '../public/js/systems/EnemyAI.js';
import { MapGenerator } from '../public/js/systems/MapGenerator.js';
import { RunManager } from '../public/js/systems/RunManager.js';
import { STARTER_DECK, CARDS, REWARD_POOL } from '../public/js/data/cards.js';
import { ENEMIES, ENCOUNTERS } from '../public/js/data/enemies.js';
import { Logger } from '../public/js/utils/Logger.js';

/**
 * Combat engine unit tests.
 * Run: node test/combat.test.js
 *
 * Tests pure logic systems with zero Phaser dependencies.
 * Exit code 0 = all pass, 1 = failures.
 */

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    const msg = `  ✗ ${testName}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    errors.push(msg);
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ================================
// CARD DATA INTEGRITY
// ================================
section('Card Data Integrity');

assert(Object.keys(CARDS).length >= 15, 'At least 15 cards defined',
  `found ${Object.keys(CARDS).length}`);

for (const [id, card] of Object.entries(CARDS)) {
  assert(card.id === id, `Card ${id} has matching id field`);
  assert(card.name && card.name.length > 0, `Card ${id} has a name`);
  assert(typeof card.cost === 'number' && card.cost >= 0, `Card ${id} has valid cost`);
  assert(['attack', 'skill', 'power'].includes(card.type), `Card ${id} has valid type`);
  assert(['single', 'all', 'self', 'random'].includes(card.target), `Card ${id} has valid target`);
  assert(Array.isArray(card.effects) && card.effects.length > 0, `Card ${id} has effects`);
  assert(card.description && card.description.length > 0, `Card ${id} has description`);
}

// Check starter deck references valid cards
for (const id of STARTER_DECK) {
  assert(CARDS[id] !== undefined, `Starter deck card "${id}" exists in CARDS`);
}

// Check reward pools reference valid cards
for (const [rarity, pool] of Object.entries(REWARD_POOL)) {
  for (const id of pool) {
    assert(CARDS[id] !== undefined, `Reward pool (${rarity}) card "${id}" exists in CARDS`);
  }
}

// ================================
// ENEMY DATA INTEGRITY
// ================================
section('Enemy Data Integrity');

for (const [id, enemy] of Object.entries(ENEMIES)) {
  assert(enemy.id === id, `Enemy ${id} has matching id field`);
  assert(enemy.name && enemy.name.length > 0, `Enemy ${id} has a name`);
  assert(Array.isArray(enemy.hpRange) && enemy.hpRange.length === 2, `Enemy ${id} has HP range`);
  assert(enemy.hpRange[0] > 0 && enemy.hpRange[1] >= enemy.hpRange[0], `Enemy ${id} HP range valid`);
  assert(enemy.resistances && typeof enemy.resistances === 'object', `Enemy ${id} has resistances`);
  assert(Array.isArray(enemy.intents) && enemy.intents.length > 0, `Enemy ${id} has intents`);

  const totalWeight = enemy.intents.reduce((s, i) => s + i.weight, 0);
  assert(totalWeight > 0, `Enemy ${id} intents have positive total weight`);
}

// Check encounter references
for (const [difficulty, encounters] of Object.entries(ENCOUNTERS)) {
  for (const enc of encounters) {
    for (const eid of enc.enemies) {
      assert(ENEMIES[eid] !== undefined, `Encounter (${difficulty}) enemy "${eid}" exists`);
    }
  }
}

// ================================
// DECK MANAGER
// ================================
section('DeckManager');

{
  const logger = new Logger();
  logger.enabled = false;
  const dm = new DeckManager([...STARTER_DECK], logger);

  const counts = dm.getCounts();
  assert(counts.draw === 10, 'Initial draw pile has 10 cards', `got ${counts.draw}`);
  assert(counts.hand === 0, 'Initial hand is empty');
  assert(counts.discard === 0, 'Initial discard is empty');

  const drawn = dm.drawCards(5);
  assert(drawn.length === 5, 'Drew 5 cards');
  assert(dm.getCounts().hand === 5, 'Hand has 5 cards');
  assert(dm.getCounts().draw === 5, 'Draw pile has 5 remaining');

  const card = dm.playCard(0);
  assert(card !== null, 'Playing card returns the card');
  assert(dm.getCounts().hand === 4, 'Hand has 4 after playing');
  assert(dm.getCounts().discard === 1, 'Discard has 1 after playing');

  dm.discardHand();
  assert(dm.getCounts().hand === 0, 'Hand empty after discard');
  assert(dm.getCounts().discard === 5, 'Discard has 5 after discarding hand');

  // Draw more than available - should shuffle
  const drawn2 = dm.drawCards(7);
  assert(drawn2.length >= 5, 'Drew cards after shuffle',
    `got ${drawn2.length}`);
}

// drawCards(0) should draw 0
{
  const logger = new Logger();
  logger.enabled = false;
  const dm = new DeckManager([...STARTER_DECK], logger);
  const drawn = dm.drawCards(0);
  assert(drawn.length === 0, 'drawCards(0) draws 0 cards');
}

// ================================
// EFFECT RESOLVER
// ================================
section('EffectResolver');

{
  const logger = new Logger();
  logger.enabled = false;
  const er = new EffectResolver(logger);

  // Test damage resolution
  const player = { hp: 80, maxHp: 80, block: 0, statuses: {} };
  const enemy = { hp: 20, maxHp: 20, block: 0, statuses: {}, resistances: { physical: 1.0, fire: 1.5, ice: 0.0 }, name: 'TestEnemy' };

  // Physical damage
  const card = { name: 'Strike', target: 'single', effects: [{ type: 'damage', value: 6, damageType: 'physical' }] };
  const events = er.resolveCard(card, player, [enemy], 0);
  assert(enemy.hp === 14, 'Physical damage reduces HP', `HP=${enemy.hp}`);

  // Fire weakness (1.5x)
  enemy.hp = 20;
  const fireCard = { name: 'Fire Strike', target: 'single', effects: [{ type: 'damage', value: 6, damageType: 'fire' }] };
  er.resolveCard(fireCard, player, [enemy], 0);
  assert(enemy.hp === 11, 'Fire damage with 1.5x weakness = 9 damage', `HP=${enemy.hp}`);

  // Ice immunity (0.0x)
  enemy.hp = 20;
  const iceCard = { name: 'Ice Shard', target: 'all', effects: [{ type: 'damage', value: 4, damageType: 'ice' }] };
  er.resolveCard(iceCard, player, [enemy], 0);
  assert(enemy.hp === 20, 'Ice damage against immune enemy = 0', `HP=${enemy.hp}`);

  // Block absorbs damage
  enemy.hp = 20;
  enemy.block = 5;
  er.resolveCard(card, player, [enemy], 0); // 6 physical
  assert(enemy.block === 0, 'Block fully consumed');
  assert(enemy.hp === 19, '1 damage goes through after block', `HP=${enemy.hp}`);

  // Strength bonus
  player.statuses.strength = 3;
  enemy.hp = 20;
  er.resolveCard(card, player, [enemy], 0); // 6 + 3 = 9
  assert(enemy.hp === 11, 'Strength adds to damage', `HP=${enemy.hp}`);
  player.statuses.strength = 0;

  // Weakness reduces damage 25%
  player.statuses.weak = 1;
  enemy.hp = 20;
  er.resolveCard(card, player, [enemy], 0); // floor(6 * 0.75) = 4
  assert(enemy.hp === 16, 'Weakness reduces damage by 25%', `HP=${enemy.hp}`);
  player.statuses.weak = 0;

  // Vulnerability increases damage taken 50%
  enemy.hp = 20;
  enemy.statuses.vulnerable = 1;
  er.resolveCard(card, player, [enemy], 0); // floor(6 * 1.5) = 9
  assert(enemy.hp === 11, 'Vulnerable increases damage by 50%', `HP=${enemy.hp}`);
}

// ================================
// ENEMY AI
// ================================
section('EnemyAI');

{
  const logger = new Logger();
  logger.enabled = false;
  const ai = new EnemyAI(logger);

  const goblin = ai.createEnemy('goblin');
  assert(goblin.hp >= 20 && goblin.hp <= 25, 'Goblin HP in range', `HP=${goblin.hp}`);
  assert(goblin.block === 0, 'Goblin starts with 0 block');
  assert(goblin.resistances.fire === 1.5, 'Goblin weak to fire');

  const intent = ai.selectIntent(goblin);
  assert(intent !== null, 'Intent selected');
  assert(intent.type !== undefined, 'Intent has type');

  // Boss creation
  const boss = ai.createEnemy('breach_lord');
  assert(boss.hp >= 100 && boss.hp <= 120, 'Boss HP in range', `HP=${boss.hp}`);
  assert(boss.boss === true, 'Boss flag set');
}

// ================================
// COMBAT MANAGER - FULL TURN CYCLE
// ================================
section('CombatManager - Turn Cycle');

{
  const cm = new CombatManager({ hp: 80, maxHp: 80, deck: [...STARTER_DECK] }, ['goblin']);
  cm.logger.enabled = false;

  // Start turn
  const startEvents = cm.startPlayerTurn();
  let state = cm.getState();
  assert(state.turn === 1, 'Turn 1 started');
  assert(state.player.energy === 3, 'Player has 3 energy');
  assert(state.hand.length === 5, 'Player drew 5 cards');
  assert(state.state === CombatState.PLAYER_TURN, 'State is PLAYER_TURN');
  assert(state.enemies[0].currentIntent !== null, 'Enemy has intent');

  // Play a card
  const canPlay = cm.canPlayCard(0);
  assert(canPlay, 'Can play first card');
  const playEvents = cm.playCard(0, 0);
  assert(playEvents !== null, 'Play returns events');
  state = cm.getState();
  assert(state.player.energy < 3, 'Energy spent');
  assert(state.hand.length === 4, 'Hand has 4 after play');

  // End turn
  const endEvents = cm.endPlayerTurn();
  assert(endEvents.length > 0, 'End turn returns events');
  state = cm.getState();
  assert(state.hand.length === 0, 'Hand discarded');
  assert(state.state === CombatState.ENEMY_TURN_START, 'State is ENEMY_TURN_START');

  // Enemy turn
  const enemyEvents = cm.processEnemyTurn();
  assert(enemyEvents.length > 0, 'Enemy turn produces events');
  state = cm.getState();
  assert(state.state === CombatState.PLAYER_TURN_START, 'State back to PLAYER_TURN_START');

  // Second turn
  cm.startPlayerTurn();
  state = cm.getState();
  assert(state.turn === 2, 'Turn 2 started');
  assert(state.player.energy === 3, 'Energy refreshed');
  assert(state.hand.length === 5, 'Drew new hand');
}

// ================================
// COMBAT MANAGER - WIN/LOSE
// ================================
section('CombatManager - Win/Lose');

{
  // Win: kill a weak enemy
  const cm = new CombatManager({ hp: 80, maxHp: 80, deck: [...STARTER_DECK] }, ['goblin']);
  cm.logger.enabled = false;

  let turns = 0;
  let result = null;
  while (turns < 30 && !result) {
    turns++;
    cm.startPlayerTurn();
    if (cm.getState().state === CombatState.COMBAT_LOSE) { result = 'lose'; break; }

    while (true) {
      let played = false;
      for (let i = 0; i < cm.getState().hand.length; i++) {
        if (cm.canPlayCard(i)) {
          cm.playCard(i, 0);
          played = true;
          break;
        }
      }
      if (!played) break;
      if (cm.getState().state === CombatState.COMBAT_WIN) { result = 'win'; break; }
      if (cm.getState().state === CombatState.COMBAT_LOSE) { result = 'lose'; break; }
    }
    if (result) break;

    cm.endPlayerTurn();
    cm.processEnemyTurn();
    if (cm.getState().state === CombatState.COMBAT_WIN) result = 'win';
    if (cm.getState().state === CombatState.COMBAT_LOSE) result = 'lose';
  }

  assert(result !== null, 'Combat ends in reasonable turns', `turns=${turns}`);
  assert(result === 'win' || result === 'lose', `Combat result is win or lose: ${result}`);
}

// ================================
// MAP GENERATOR
// ================================
section('MapGenerator');

{
  const mg = new MapGenerator();
  const map = mg.generate();

  assert(map.floors.length === 15, '15 floors generated', `got ${map.floors.length}`);
  assert(map.floors[14].length === 1, 'Last floor has 1 boss node');
  assert(map.floors[14][0].type === 'boss', 'Last node is boss');

  // Check all nodes have connections (except boss)
  let allConnected = true;
  for (let i = 0; i < 14; i++) {
    for (const node of map.floors[i]) {
      if (node.connections.length === 0) {
        allConnected = false;
      }
    }
  }
  assert(allConnected, 'All non-boss nodes have connections');

  // Check first floor is accessible
  const accessible = map.floors[0].filter(n => n.accessible);
  assert(accessible.length > 0, 'First floor has accessible nodes', `got ${accessible.length}`);

  // Visit a node and check connections open
  const firstNode = map.floors[0][0];
  mg.visitNode(map, firstNode.id);
  assert(firstNode.visited, 'Node marked as visited');
  const nextAccessible = map.floors[1].filter(n => n.accessible);
  assert(nextAccessible.length > 0, 'Connected nodes became accessible');
}

// ================================
// RUN MANAGER
// ================================
section('RunManager');

{
  const rm = new RunManager();
  const state = rm.newRun();

  assert(state.hp === 80, 'Starting HP is 80');
  assert(state.maxHp === 80, 'Starting maxHp is 80');
  assert(state.deck.length === STARTER_DECK.length, 'Starting deck is starter deck');
  assert(state.map.floors.length === 15, 'Map has 15 floors');

  // Healing
  rm.updateHp(50);
  const healed = rm.heal(0.3);
  assert(healed === 24, 'Heal 30% of 80 = 24', `got ${healed}`);
  assert(rm.getState().hp === 74, 'HP after heal is 74', `got ${rm.getState().hp}`);

  // Reward generation
  const rewards = rm.generateRewards(false);
  assert(rewards.length === 3, 'Generate 3 rewards');
  rewards.forEach(r => {
    assert(r.id && r.name && r.effects, 'Reward card has required fields');
  });

  // Add card
  rm.addCard('fireball');
  assert(rm.getState().deck.length === STARTER_DECK.length + 1, 'Card added to deck');

  // Event generation
  const event = rm.generateEvent();
  assert(event.title && event.choices, 'Event has title and choices');
  assert(event.choices.length >= 2, 'Event has at least 2 choices');
}

// ================================
// REPORT
// ================================
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(40)}`);

if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(e => console.log(e));
}

process.exit(failed > 0 ? 1 : 0);
