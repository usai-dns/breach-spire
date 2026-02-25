import { STARTER_DECK, REWARD_POOL, CARDS } from '../data/cards.js';
import { ENCOUNTERS, FLOOR_DIFFICULTY } from '../data/enemies.js';
import { MapGenerator } from './MapGenerator.js';

export class RunManager {
  constructor() {
    this.mapGenerator = new MapGenerator();
    this.state = null;
  }

  // Start a new run
  newRun() {
    this.state = {
      hp: 80,
      maxHp: 80,
      gold: 0,
      deck: [...STARTER_DECK],
      relics: [],
      map: this.mapGenerator.generate(),
      floor: 0,
      combatsWon: 0,
      cardsPlayed: 0
    };
    return this.state;
  }

  // Get the current run state
  getState() {
    return this.state;
  }

  // Update HP after combat
  updateHp(hp) {
    if (this.state) {
      this.state.hp = Math.min(hp, this.state.maxHp);
    }
  }

  // Add a card to the deck
  addCard(cardId) {
    if (this.state) {
      this.state.deck.push(cardId);
    }
  }

  // Remove a card from the deck (for removal events)
  removeCard(index) {
    if (this.state && index >= 0 && index < this.state.deck.length) {
      this.state.deck.splice(index, 1);
    }
  }

  // Heal at rest site
  heal(percentage = 0.3) {
    if (this.state) {
      const healAmount = Math.floor(this.state.maxHp * percentage);
      this.state.hp = Math.min(this.state.hp + healAmount, this.state.maxHp);
      return healAmount;
    }
    return 0;
  }

  // Visit a map node
  visitNode(nodeId) {
    if (this.state) {
      this.mapGenerator.visitNode(this.state.map, nodeId);
    }
  }

  // Get encounter for a node
  getEncounter(nodeId) {
    if (!this.state) return null;

    const node = this.mapGenerator.getNode(this.state.map, nodeId);
    if (!node) return null;

    const floor = node.floor + 1;
    let difficulty;

    if (node.type === 'elite') {
      difficulty = 'elite';
    } else if (node.type === 'boss') {
      difficulty = 'boss';
    } else {
      difficulty = FLOOR_DIFFICULTY[floor] || 'medium';
    }

    const encounters = ENCOUNTERS[difficulty];
    if (!encounters || encounters.length === 0) return null;

    const encounter = encounters[Math.floor(Math.random() * encounters.length)];
    return encounter.enemies;
  }

  // Generate card rewards (3 random cards weighted by rarity)
  generateRewards(isElite = false) {
    const rewards = [];
    const rarityWeights = isElite
      ? { common: 30, uncommon: 50, rare: 20 }
      : { common: 55, uncommon: 35, rare: 10 };

    const offered = new Set();

    let attempts = 0;
    while (rewards.length < 3 && attempts < 30) {
      attempts++;
      const rarity = this.rollRarity(rarityWeights);
      const pool = REWARD_POOL[rarity];
      if (!pool || pool.length === 0) continue;

      const cardId = pool[Math.floor(Math.random() * pool.length)];
      if (offered.has(cardId)) continue;

      const card = CARDS[cardId];
      if (!card) continue;

      offered.add(cardId);
      rewards.push(card);
    }

    return rewards;
  }

  rollRarity(weights) {
    const total = weights.common + weights.uncommon + weights.rare;
    let roll = Math.random() * total;

    if (roll < weights.common) return 'common';
    roll -= weights.common;
    if (roll < weights.uncommon) return 'uncommon';
    return 'rare';
  }

  // Generate a random event
  generateEvent() {
    const events = [
      {
        title: 'Mysterious Shrine',
        description: 'A glowing shrine pulses with energy. Do you approach?',
        choices: [
          { text: 'Pray (Heal 15 HP)', effect: 'heal', value: 15 },
          { text: 'Sacrifice (Lose 5 HP, gain random card)', effect: 'sacrifice', value: 5 },
          { text: 'Leave', effect: 'none' }
        ]
      },
      {
        title: 'Wandering Merchant',
        description: 'A hooded figure offers you something...',
        choices: [
          { text: 'Trade (Remove a card, lose 10 HP)', effect: 'removeCard', value: 10 },
          { text: 'Accept Gift (Random common card)', effect: 'randomCard', rarity: 'common' },
          { text: 'Decline', effect: 'none' }
        ]
      },
      {
        title: 'Ancient Forge',
        description: 'Flames dance around an ancient anvil.',
        choices: [
          { text: 'Forge (Gain 10 Max HP)', effect: 'maxHp', value: 10 },
          { text: 'Scavenge (Gain random uncommon card)', effect: 'randomCard', rarity: 'uncommon' },
          { text: 'Walk Away', effect: 'none' }
        ]
      },
      {
        title: 'Cursed Well',
        description: 'Dark waters swirl in an ancient well.',
        choices: [
          { text: 'Drink (Full Heal, gain Weakness next combat)', effect: 'fullHeal' },
          { text: 'Drop a Card (Remove a random card)', effect: 'removeRandom' },
          { text: 'Ignore', effect: 'none' }
        ]
      }
    ];

    return events[Math.floor(Math.random() * events.length)];
  }

  // Apply event choice
  applyEventChoice(choice) {
    const results = [];

    switch (choice.effect) {
      case 'heal':
        this.state.hp = Math.min(this.state.hp + choice.value, this.state.maxHp);
        results.push(`Healed ${choice.value} HP`);
        break;
      case 'sacrifice':
        this.state.hp = Math.max(1, this.state.hp - choice.value);
        const rPool = REWARD_POOL.common;
        const newCard = rPool[Math.floor(Math.random() * rPool.length)];
        this.state.deck.push(newCard);
        results.push(`Lost ${choice.value} HP, gained ${CARDS[newCard].name}`);
        break;
      case 'removeCard':
        this.state.hp = Math.max(1, this.state.hp - choice.value);
        results.push(`Lost ${choice.value} HP. Choose a card to remove.`);
        return { results, action: 'removeCard' };
      case 'randomCard': {
        const pool = REWARD_POOL[choice.rarity] || REWARD_POOL.common;
        const card = pool[Math.floor(Math.random() * pool.length)];
        this.state.deck.push(card);
        results.push(`Gained ${CARDS[card].name}`);
        break;
      }
      case 'maxHp':
        this.state.maxHp += choice.value;
        this.state.hp += choice.value;
        results.push(`Max HP increased by ${choice.value}`);
        break;
      case 'fullHeal':
        this.state.hp = this.state.maxHp;
        results.push('Fully healed! (Weakness applied next combat)');
        break;
      case 'removeRandom':
        if (this.state.deck.length > 5) {
          const idx = Math.floor(Math.random() * this.state.deck.length);
          const removed = this.state.deck.splice(idx, 1)[0];
          results.push(`Removed ${CARDS[removed].name} from deck`);
        } else {
          results.push('Deck too small to remove a card');
        }
        break;
      case 'none':
        results.push('You walk away.');
        break;
    }

    return { results };
  }

  // Record combat win
  recordCombatWin() {
    if (this.state) {
      this.state.combatsWon++;
    }
  }
}
