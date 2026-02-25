export const CARDS = {
  // === STARTER CARDS ===
  strike: {
    id: 'strike',
    name: 'Strike',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'starter',
    description: 'Deal 6 damage.',
    effects: [
      { type: 'damage', value: 6, damageType: 'physical' }
    ]
  },
  defend: {
    id: 'defend',
    name: 'Defend',
    cost: 1,
    type: 'skill',
    target: 'self',
    rarity: 'starter',
    description: 'Gain 5 Block.',
    effects: [
      { type: 'block', value: 5 }
    ]
  },
  fire_strike: {
    id: 'fire_strike',
    name: 'Fire Strike',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 6 fire damage.',
    effects: [
      { type: 'damage', value: 6, damageType: 'fire' }
    ]
  },
  ice_shard: {
    id: 'ice_shard',
    name: 'Ice Shard',
    cost: 1,
    type: 'attack',
    target: 'all',
    rarity: 'common',
    description: 'Deal 4 ice damage to ALL enemies.',
    effects: [
      { type: 'damage', value: 4, damageType: 'ice' }
    ]
  },

  // === COMMON CARDS ===
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    cost: 2,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 12 lightning damage.',
    effects: [
      { type: 'damage', value: 12, damageType: 'lightning' }
    ]
  },
  void_touch: {
    id: 'void_touch',
    name: 'Void Touch',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 5 void damage. Apply 1 Weak.',
    effects: [
      { type: 'damage', value: 5, damageType: 'void' },
      { type: 'applyStatus', status: 'weak', value: 1, target: 'enemy' }
    ]
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    cost: 2,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 8 damage. Apply 2 Vulnerable.',
    effects: [
      { type: 'damage', value: 8, damageType: 'physical' },
      { type: 'applyStatus', status: 'vulnerable', value: 2, target: 'enemy' }
    ]
  },
  quick_slash: {
    id: 'quick_slash',
    name: 'Quick Slash',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 4 damage. Draw 1 card.',
    effects: [
      { type: 'damage', value: 4, damageType: 'physical' },
      { type: 'draw', value: 1 }
    ]
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'common',
    description: 'Deal 3 damage. Gain 3 Block.',
    effects: [
      { type: 'damage', value: 3, damageType: 'physical' },
      { type: 'block', value: 3 }
    ]
  },

  // === UNCOMMON CARDS ===
  flame_barrier: {
    id: 'flame_barrier',
    name: 'Flame Barrier',
    cost: 2,
    type: 'skill',
    target: 'self',
    rarity: 'uncommon',
    description: 'Gain 8 Block. Gain 3 Thorns.',
    effects: [
      { type: 'block', value: 8 },
      { type: 'applyStatus', status: 'thorns', value: 3, target: 'self' }
    ]
  },
  frost_armor: {
    id: 'frost_armor',
    name: 'Frost Armor',
    cost: 1,
    type: 'skill',
    target: 'self',
    rarity: 'uncommon',
    description: 'Gain 4 Block. Apply 1 Slow to ALL enemies.',
    effects: [
      { type: 'block', value: 4 },
      { type: 'applyStatus', status: 'slow', value: 1, target: 'allEnemies' }
    ]
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    cost: 0,
    type: 'skill',
    target: 'self',
    rarity: 'uncommon',
    description: 'Gain 2 Energy. Exhaust.',
    effects: [
      { type: 'energy', value: 2 }
    ],
    exhaust: true
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    cost: 2,
    type: 'attack',
    target: 'all',
    rarity: 'uncommon',
    description: 'Deal 8 fire damage to ALL enemies.',
    effects: [
      { type: 'damage', value: 8, damageType: 'fire' }
    ]
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    cost: 2,
    type: 'attack',
    target: 'random',
    rarity: 'uncommon',
    description: 'Deal 4 lightning damage to random enemies 3 times.',
    effects: [
      { type: 'damage', value: 4, damageType: 'lightning', hits: 3 }
    ]
  },
  poisoned_blade: {
    id: 'poisoned_blade',
    name: 'Poisoned Blade',
    cost: 1,
    type: 'attack',
    target: 'single',
    rarity: 'uncommon',
    description: 'Deal 3 damage. Apply 3 Poison.',
    effects: [
      { type: 'damage', value: 3, damageType: 'physical' },
      { type: 'applyStatus', status: 'poison', value: 3, target: 'enemy' }
    ]
  },
  battle_cry: {
    id: 'battle_cry',
    name: 'Battle Cry',
    cost: 1,
    type: 'skill',
    target: 'self',
    rarity: 'uncommon',
    description: 'Gain 2 Strength. Draw 1 card.',
    effects: [
      { type: 'applyStatus', status: 'strength', value: 2, target: 'self' },
      { type: 'draw', value: 1 }
    ]
  },

  // === RARE CARDS ===
  void_rift: {
    id: 'void_rift',
    name: 'Void Rift',
    cost: 3,
    type: 'attack',
    target: 'single',
    rarity: 'rare',
    description: 'Deal 15 void damage. Apply 2 Vulnerable.',
    effects: [
      { type: 'damage', value: 15, damageType: 'void' },
      { type: 'applyStatus', status: 'vulnerable', value: 2, target: 'enemy' }
    ]
  },
  empower: {
    id: 'empower',
    name: 'Empower',
    cost: 1,
    type: 'power',
    target: 'self',
    rarity: 'rare',
    description: 'Gain 1 Strength permanently.',
    effects: [
      { type: 'applyStatus', status: 'strength', value: 1, target: 'self' }
    ]
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    cost: 3,
    type: 'attack',
    target: 'all',
    rarity: 'rare',
    description: 'Deal 12 fire damage to ALL enemies. Apply 2 Burn.',
    effects: [
      { type: 'damage', value: 12, damageType: 'fire' },
      { type: 'applyStatus', status: 'burn', value: 2, target: 'allEnemies' }
    ]
  },
  absolute_zero: {
    id: 'absolute_zero',
    name: 'Absolute Zero',
    cost: 3,
    type: 'skill',
    target: 'self',
    rarity: 'rare',
    description: 'Gain 15 Block. Apply 2 Slow to ALL enemies.',
    effects: [
      { type: 'block', value: 15 },
      { type: 'applyStatus', status: 'slow', value: 2, target: 'allEnemies' }
    ]
  },
  thunder_god: {
    id: 'thunder_god',
    name: 'Thunder God',
    cost: 3,
    type: 'attack',
    target: 'random',
    rarity: 'rare',
    description: 'Deal 7 lightning damage 5 times to random enemies.',
    effects: [
      { type: 'damage', value: 7, damageType: 'lightning', hits: 5 }
    ]
  }
};

// Starter deck composition
export const STARTER_DECK = [
  'strike', 'strike', 'strike', 'strike',
  'defend', 'defend', 'defend', 'defend',
  'fire_strike',
  'ice_shard'
];

// Cards available as rewards by rarity
export const REWARD_POOL = {
  common: ['fire_strike', 'ice_shard', 'lightning_bolt', 'void_touch', 'bash', 'quick_slash', 'shield_bash'],
  uncommon: ['flame_barrier', 'frost_armor', 'surge', 'fireball', 'chain_lightning', 'poisoned_blade', 'battle_cry'],
  rare: ['void_rift', 'empower', 'inferno', 'absolute_zero', 'thunder_god']
};

// Card type colors for rendering
export const CARD_COLORS = {
  attack: { bg: '#8b1a1a', border: '#e74c3c', text: '#ff6b6b' },
  skill: { bg: '#1a3a8b', border: '#3498db', text: '#6bb5ff' },
  power: { bg: '#8b6b1a', border: '#f39c12', text: '#ffd966' }
};

// Damage type colors
export const DAMAGE_TYPE_COLORS = {
  physical: '#ffffff',
  fire: '#ff6b35',
  ice: '#00d4ff',
  lightning: '#ffeb3b',
  void: '#b366ff'
};
