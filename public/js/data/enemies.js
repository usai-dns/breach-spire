export const ENEMIES = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    hpRange: [20, 25],
    color: '#2ecc71',
    shape: 'triangle',
    size: { w: 50, h: 60 },
    resistances: {
      physical: 1.0,
      fire: 1.5,
      ice: 1.0,
      lightning: 1.0,
      void: 1.0
    },
    intents: [
      { type: 'attack', damage: 8, weight: 50, name: 'Slash' },
      { type: 'attack', damage: 12, weight: 20, name: 'Heavy Slash' },
      { type: 'defend', block: 5, weight: 20, name: 'Guard' },
      { type: 'buff', status: 'strength', value: 1, weight: 10, name: 'War Cry' }
    ]
  },
  slime: {
    id: 'slime',
    name: 'Slime',
    hpRange: [30, 35],
    color: '#1abc9c',
    shape: 'blob',
    size: { w: 60, h: 45 },
    resistances: {
      physical: 0.5,
      fire: 1.5,
      ice: 1.0,
      lightning: 1.0,
      void: 1.0
    },
    intents: [
      { type: 'attack', damage: 6, weight: 40, name: 'Slam' },
      { type: 'attack', damage: 10, weight: 15, name: 'Engulf' },
      { type: 'defend', block: 8, weight: 25, name: 'Harden' },
      { type: 'buff', status: 'strength', value: 2, weight: 20, name: 'Absorb' }
    ]
  },
  fire_imp: {
    id: 'fire_imp',
    name: 'Fire Imp',
    hpRange: [15, 20],
    color: '#e74c3c',
    shape: 'diamond',
    size: { w: 40, h: 55 },
    resistances: {
      physical: 1.0,
      fire: 0.0,
      ice: 1.5,
      lightning: 1.0,
      void: 1.0
    },
    intents: [
      { type: 'attack', damage: 5, damageType: 'fire', weight: 35, name: 'Fire Bolt' },
      { type: 'attack', damage: 9, damageType: 'fire', weight: 20, name: 'Flame Burst' },
      { type: 'debuff', status: 'burn', value: 2, weight: 25, name: 'Ignite' },
      { type: 'buff', status: 'strength', value: 1, weight: 20, name: 'Enrage' }
    ]
  },
  ice_golem: {
    id: 'ice_golem',
    name: 'Ice Golem',
    hpRange: [45, 50],
    color: '#74b9ff',
    shape: 'rectangle',
    size: { w: 65, h: 70 },
    resistances: {
      physical: 0.75,
      fire: 1.5,
      ice: 0.0,
      lightning: 1.5,
      void: 1.0
    },
    intents: [
      { type: 'attack', damage: 10, weight: 35, name: 'Frost Slam' },
      { type: 'attack', damage: 15, weight: 15, name: 'Avalanche' },
      { type: 'defend', block: 12, weight: 30, name: 'Ice Wall' },
      { type: 'debuff', status: 'slow', value: 1, weight: 20, name: 'Chill' }
    ]
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    hpRange: [25, 30],
    color: '#9b59b6',
    shape: 'wisp',
    size: { w: 45, h: 55 },
    resistances: {
      physical: 0.75,
      fire: 1.0,
      ice: 1.0,
      lightning: 1.5,
      void: 0.0
    },
    intents: [
      { type: 'attack', damage: 7, damageType: 'void', weight: 35, name: 'Shadow Strike' },
      { type: 'debuff', status: 'weak', value: 1, weight: 25, name: 'Enfeeble' },
      { type: 'debuff', status: 'vulnerable', value: 1, weight: 20, name: 'Expose' },
      { type: 'buff', status: 'strength', value: 2, weight: 20, name: 'Shadow Power' }
    ]
  },

  // === ELITE ENEMIES ===
  goblin_chief: {
    id: 'goblin_chief',
    name: 'Goblin Chief',
    hpRange: [55, 65],
    color: '#27ae60',
    shape: 'triangle',
    size: { w: 60, h: 70 },
    elite: true,
    resistances: {
      physical: 0.75,
      fire: 1.5,
      ice: 1.0,
      lightning: 1.0,
      void: 1.0
    },
    intents: [
      { type: 'attack', damage: 12, weight: 30, name: 'Cleave' },
      { type: 'attack', damage: 18, weight: 15, name: 'Execute' },
      { type: 'defend', block: 10, weight: 20, name: 'Rally' },
      { type: 'buff', status: 'strength', value: 2, weight: 20, name: 'Warcry' },
      { type: 'multi', actions: [
        { type: 'attack', damage: 6 },
        { type: 'attack', damage: 6 }
      ], weight: 15, name: 'Double Strike' }
    ]
  },
  void_weaver: {
    id: 'void_weaver',
    name: 'Void Weaver',
    hpRange: [50, 60],
    color: '#8e44ad',
    shape: 'wisp',
    size: { w: 55, h: 65 },
    elite: true,
    resistances: {
      physical: 1.0,
      fire: 1.0,
      ice: 1.0,
      lightning: 1.5,
      void: 0.0
    },
    intents: [
      { type: 'attack', damage: 10, damageType: 'void', weight: 30, name: 'Void Blast' },
      { type: 'debuff', status: 'weak', value: 2, weight: 20, name: 'Curse' },
      { type: 'debuff', status: 'vulnerable', value: 2, weight: 20, name: 'Doom Mark' },
      { type: 'buff', status: 'strength', value: 3, weight: 15, name: 'Void Surge' },
      { type: 'attack', damage: 15, damageType: 'void', weight: 15, name: 'Void Storm' }
    ]
  },

  // === BOSS ===
  breach_lord: {
    id: 'breach_lord',
    name: 'Breach Lord',
    hpRange: [100, 120],
    color: '#c0392b',
    shape: 'boss',
    size: { w: 80, h: 90 },
    boss: true,
    resistances: {
      physical: 0.75,
      fire: 0.75,
      ice: 0.75,
      lightning: 0.75,
      void: 0.75
    },
    intents: [
      { type: 'attack', damage: 12, weight: 25, name: 'Breach Slash' },
      { type: 'attack', damage: 20, weight: 10, name: 'Breach Storm' },
      { type: 'defend', block: 15, weight: 15, name: 'Breach Shield' },
      { type: 'buff', status: 'strength', value: 2, weight: 15, name: 'Empower' },
      { type: 'debuff', status: 'weak', value: 2, weight: 10, name: 'Weakening Aura' },
      { type: 'debuff', status: 'vulnerable', value: 2, weight: 10, name: 'Expose Weakness' },
      { type: 'multi', actions: [
        { type: 'attack', damage: 8 },
        { type: 'debuff', status: 'burn', value: 2 }
      ], weight: 15, name: 'Infernal Strike' }
    ]
  }
};

// Encounter definitions for each floor tier
export const ENCOUNTERS = {
  easy: [
    { enemies: ['goblin'] },
    { enemies: ['slime'] },
    { enemies: ['goblin', 'goblin'] },
    { enemies: ['fire_imp'] }
  ],
  medium: [
    { enemies: ['goblin', 'fire_imp'] },
    { enemies: ['slime', 'goblin'] },
    { enemies: ['ice_golem'] },
    { enemies: ['shadow'] },
    { enemies: ['fire_imp', 'fire_imp'] }
  ],
  hard: [
    { enemies: ['ice_golem', 'goblin'] },
    { enemies: ['shadow', 'fire_imp'] },
    { enemies: ['shadow', 'shadow'] },
    { enemies: ['goblin', 'goblin', 'goblin'] }
  ],
  elite: [
    { enemies: ['goblin_chief'] },
    { enemies: ['void_weaver'] },
    { enemies: ['goblin_chief', 'goblin'] },
    { enemies: ['void_weaver', 'shadow'] }
  ],
  boss: [
    { enemies: ['breach_lord'] }
  ]
};

// Difficulty scaling per floor
export const FLOOR_DIFFICULTY = {
  1: 'easy', 2: 'easy', 3: 'easy',
  4: 'medium', 5: 'medium', 6: 'medium',
  7: 'hard', 8: 'hard', 9: 'hard',
  10: 'hard', 11: 'hard', 12: 'hard',
  13: 'hard', 14: 'hard', 15: 'boss'
};
