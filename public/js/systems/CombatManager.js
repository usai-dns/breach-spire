import { DeckManager } from './DeckManager.js';
import { EffectResolver } from './EffectResolver.js';
import { EnemyAI } from './EnemyAI.js';
import { Logger } from '../utils/Logger.js';

export const CombatState = {
  PLAYER_TURN_START: 'PLAYER_TURN_START',
  PLAYER_TURN: 'PLAYER_TURN',
  PLAYER_TURN_END: 'PLAYER_TURN_END',
  ENEMY_TURN_START: 'ENEMY_TURN_START',
  ENEMY_INTENT_EXECUTE: 'ENEMY_INTENT_EXECUTE',
  ENEMY_TURN_END: 'ENEMY_TURN_END',
  COMBAT_WIN: 'COMBAT_WIN',
  COMBAT_LOSE: 'COMBAT_LOSE'
};

export class CombatManager {
  constructor(playerState, enemyIds) {
    this.logger = new Logger();
    this.effectResolver = new EffectResolver(this.logger);
    this.enemyAI = new EnemyAI(this.logger);

    // Initialize player combat state
    this.player = {
      hp: playerState.hp,
      maxHp: playerState.maxHp,
      block: 0,
      energy: 3,
      maxEnergy: 3,
      statuses: {}
    };

    // Initialize deck
    this.deck = new DeckManager(playerState.deck, this.logger);

    // Initialize enemies
    this.enemies = enemyIds.map(id => this.enemyAI.createEnemy(id));

    // Combat state
    this.turn = 0;
    this.state = CombatState.PLAYER_TURN_START;
    this.selectedCardIndex = -1;
  }

  // Start a new player turn
  startPlayerTurn() {
    this.turn++;
    this.logger.setTurn(this.turn);
    this.logger.combat('Turn Start', `Turn ${this.turn}`);

    const events = [];

    // Reset energy
    this.player.energy = this.player.maxEnergy;
    events.push({ type: 'energyRefresh', value: this.player.maxEnergy });

    // Process start-of-turn effects
    const startEvents = this.effectResolver.processPlayerTurnStart(this.player);
    events.push(...startEvents);

    if (this.player.hp <= 0) {
      this.state = CombatState.COMBAT_LOSE;
      events.push({ type: 'playerDeath' });
      return events;
    }

    // Check slow status - draw fewer cards
    let drawCount = this.deck.handSize;
    if ((this.player.statuses.slow || 0) > 0) {
      drawCount = Math.max(1, drawCount - this.player.statuses.slow);
      this.player.statuses.slow = 0;
    }

    // Draw cards
    const drawn = this.deck.drawCards(drawCount);
    events.push({ type: 'drawCards', cards: drawn });

    // Select enemy intents for display
    this.enemyAI.selectAllIntents(this.enemies);
    events.push({ type: 'enemyIntents', enemies: this.enemies });

    this.state = CombatState.PLAYER_TURN;
    return events;
  }

  // Check if a card can be played
  canPlayCard(handIndex) {
    if (this.state !== CombatState.PLAYER_TURN) return false;
    const hand = this.deck.getHand();
    if (handIndex < 0 || handIndex >= hand.length) return false;
    return hand[handIndex].cost <= this.player.energy;
  }

  // Check if a card needs a target
  cardNeedsTarget(handIndex) {
    const hand = this.deck.getHand();
    if (handIndex < 0 || handIndex >= hand.length) return false;
    return hand[handIndex].target === 'single';
  }

  // Play a card from hand
  playCard(handIndex, targetIndex = 0) {
    if (!this.canPlayCard(handIndex)) return null;

    const hand = this.deck.getHand();
    const card = hand[handIndex];

    // Spend energy
    this.player.energy -= card.cost;

    // Remove from hand
    this.deck.playCard(handIndex);

    this.logger.combat('Played', card.name);

    // Resolve card effects
    const events = this.effectResolver.resolveCard(
      card, this.player, this.enemies, targetIndex
    );

    events.unshift({
      type: 'playCard',
      card,
      handIndex,
      targetIndex
    });

    // Draw events
    const drawEvents = events.filter(e => e.type === 'draw');
    for (const de of drawEvents) {
      const drawn = this.deck.drawCards(de.value);
      events.push({ type: 'drawCards', cards: drawn });
    }

    // Energy events
    const energyEvents = events.filter(e => e.type === 'energy');
    for (const ee of energyEvents) {
      this.player.energy += ee.value;
      events.push({ type: 'energyGain', value: ee.value });
    }

    // Check for combat end
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (allDead) {
      this.state = CombatState.COMBAT_WIN;
      events.push({ type: 'combatWin' });
    }

    if (this.player.hp <= 0) {
      this.state = CombatState.COMBAT_LOSE;
      events.push({ type: 'playerDeath' });
    }

    return events;
  }

  // End the player's turn
  endPlayerTurn() {
    if (this.state !== CombatState.PLAYER_TURN) return [];

    this.logger.combat('Turn End', `Player ends turn ${this.turn}`);
    const events = [];

    // Discard remaining hand
    const discarded = this.deck.discardHand();
    events.push({ type: 'discardHand', cards: discarded });

    // Tick player statuses
    const statusEvents = this.effectResolver.tickStatuses(this.player, 'Player');
    events.push(...statusEvents);

    this.state = CombatState.ENEMY_TURN_START;
    return events;
  }

  // Process enemy turn
  processEnemyTurn() {
    if (this.state !== CombatState.ENEMY_TURN_START) return [];

    this.logger.combat('Enemy Turn', `Enemies act`);
    const events = [];

    // Reset enemy blocks & process DoTs
    const enemyStartEvents = this.effectResolver.processEnemyTurnStart(this.enemies);
    events.push(...enemyStartEvents);

    // Check for deaths from DoTs
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (allDead) {
      this.state = CombatState.COMBAT_WIN;
      events.push({ type: 'combatWin' });
      return events;
    }

    this.state = CombatState.ENEMY_INTENT_EXECUTE;

    // Execute each living enemy's intent
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0 || !enemy.currentIntent) continue;

      const intentEvents = this.effectResolver.resolveEnemyIntent(
        enemy.currentIntent, enemy, i, this.player
      );
      events.push(...intentEvents);

      if (this.player.hp <= 0) {
        this.state = CombatState.COMBAT_LOSE;
        events.push({ type: 'playerDeath' });
        return events;
      }
    }

    // Tick enemy statuses
    this.enemies.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;
      const statusEvents = this.effectResolver.tickStatuses(enemy, enemy.name);
      events.push(...statusEvents);
    });

    this.state = CombatState.ENEMY_TURN_END;

    // Auto-start next player turn
    this.state = CombatState.PLAYER_TURN_START;

    return events;
  }

  // Get current game state (for UI)
  getState() {
    return {
      player: { ...this.player },
      enemies: this.enemies.map(e => ({ ...e })),
      hand: this.deck.getHand(),
      deckCounts: this.deck.getCounts(),
      turn: this.turn,
      state: this.state
    };
  }

  // Get the player's final HP after combat (for run state update)
  getPlayerHp() {
    return { hp: this.player.hp, maxHp: this.player.maxHp };
  }
}
