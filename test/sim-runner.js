import { CombatManager, CombatState } from '../public/js/systems/CombatManager.js';
import { STARTER_DECK, CARDS, REWARD_POOL } from '../public/js/data/cards.js';
import { ENEMIES, ENCOUNTERS } from '../public/js/data/enemies.js';

/**
 * SimRunner - Headless combat simulator for balance testing.
 * Runs N combats with configurable decks/enemies and reports statistics.
 *
 * Usage (CLI):  node test/sim-runner.js [runs] [--deck starter] [--enemies goblin,fire_imp]
 * Usage (code): new SimRunner().runBatch(1000, deck, enemies)
 */
export class SimRunner {
  constructor(opts = {}) {
    this.verbose = opts.verbose || false;
  }

  // Run a single combat and return result
  runOne(deckIds, enemyIds) {
    const playerState = { hp: 80, maxHp: 80, deck: [...deckIds] };
    const cm = new CombatManager(playerState, enemyIds, { silent: !this.verbose });

    let turns = 0;
    const maxTurns = 50;
    const cardsPlayed = {};
    let totalDamageDealt = 0;
    let totalDamageTaken = 0;

    while (turns < maxTurns) {
      turns++;
      const startEvents = cm.startPlayerTurn();

      // Check for death from DoTs at turn start
      if (cm.getState().state === CombatState.COMBAT_LOSE) {
        return this.makeResult('lose', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
      }

      // AI: play cards greedily (attacks first, then skills, then powers)
      let keepPlaying = true;
      while (keepPlaying) {
        keepPlaying = false;
        const hand = cm.getState().hand;
        const priorities = this.prioritizeHand(hand, cm);

        for (const idx of priorities) {
          if (cm.canPlayCard(idx)) {
            const card = cm.getState().hand[idx];
            const target = this.pickTarget(card, cm);
            const events = cm.playCard(idx, target);

            // Track stats
            cardsPlayed[card.id] = (cardsPlayed[card.id] || 0) + 1;
            if (events) {
              for (const e of events) {
                if (e.type === 'damage' && e.targetType === 'enemy') totalDamageDealt += e.hpDamage || 0;
              }
            }

            const state = cm.getState();
            if (state.state === CombatState.COMBAT_WIN) {
              return this.makeResult('win', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
            }
            if (state.state === CombatState.COMBAT_LOSE) {
              return this.makeResult('lose', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
            }

            keepPlaying = true;
            break; // Re-evaluate hand after playing
          }
        }
      }

      // End turn
      cm.endPlayerTurn();
      const enemyEvents = cm.processEnemyTurn();

      // Track damage taken
      for (const e of enemyEvents) {
        if (e.type === 'enemyAttack') totalDamageTaken += e.hpDamage || 0;
      }

      const state = cm.getState();
      if (state.state === CombatState.COMBAT_WIN) {
        return this.makeResult('win', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
      }
      if (state.state === CombatState.COMBAT_LOSE) {
        return this.makeResult('lose', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
      }
    }

    return this.makeResult('timeout', turns, cm, cardsPlayed, totalDamageDealt, totalDamageTaken);
  }

  makeResult(outcome, turns, cm, cardsPlayed, dmgDealt, dmgTaken) {
    const state = cm.getState();
    return {
      outcome,
      turns,
      playerHp: state.player.hp,
      playerMaxHp: state.player.maxHp,
      cardsPlayed,
      damageDealt: dmgDealt,
      damageTaken: dmgTaken,
      log: cm.logger.getLog()
    };
  }

  // Simple AI: prioritize by card type
  prioritizeHand(hand, cm) {
    const state = cm.getState();
    const indices = hand.map((_, i) => i);

    // Sort: attacks on low-hp enemies first, then blocks if enemies about to attack, then powers
    return indices.sort((a, b) => {
      const ca = hand[a];
      const cb = hand[b];

      // Check if enemies have attack intents
      const enemyAttacking = state.enemies.some(e =>
        e.hp > 0 && e.currentIntent && e.currentIntent.type === 'attack'
      );
      const totalIncomingDmg = state.enemies.reduce((sum, e) => {
        if (e.hp > 0 && e.currentIntent && e.currentIntent.type === 'attack') {
          return sum + (e.currentIntent.displayDamage || e.currentIntent.damage || 0);
        }
        return sum;
      }, 0);

      // If player is low HP and enemies attacking, prioritize defense
      const hpPercent = state.player.hp / state.player.maxHp;
      const needsBlock = enemyAttacking && (hpPercent < 0.5 || totalIncomingDmg > state.player.hp * 0.3);

      const typeOrder = (card) => {
        if (needsBlock && card.type === 'skill') return 0; // Block first when in danger
        if (card.type === 'attack') return 1;
        if (card.type === 'skill') return 2;
        if (card.type === 'power') return 0; // Powers always good to play early
        return 3;
      };

      return typeOrder(ca) - typeOrder(cb);
    });
  }

  // Pick best target for a card
  pickTarget(card, cm) {
    const state = cm.getState();
    if (card.target !== 'single') return 0;

    // Target lowest HP enemy
    let bestIdx = 0;
    let lowestHp = Infinity;
    state.enemies.forEach((e, i) => {
      if (e.hp > 0 && e.hp < lowestHp) {
        lowestHp = e.hp;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  // Run N combats and aggregate results
  runBatch(count, deckIds, enemyIds) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.runOne(deckIds, enemyIds));
    }

    const wins = results.filter(r => r.outcome === 'win');
    const losses = results.filter(r => r.outcome === 'lose');
    const timeouts = results.filter(r => r.outcome === 'timeout');

    const avgTurns = results.reduce((s, r) => s + r.turns, 0) / count;
    const avgHpRemaining = wins.length > 0
      ? wins.reduce((s, r) => s + r.playerHp, 0) / wins.length
      : 0;
    const avgDmgDealt = results.reduce((s, r) => s + r.damageDealt, 0) / count;
    const avgDmgTaken = results.reduce((s, r) => s + r.damageTaken, 0) / count;

    // Card usage frequency
    const cardFreq = {};
    results.forEach(r => {
      for (const [id, count] of Object.entries(r.cardsPlayed)) {
        cardFreq[id] = (cardFreq[id] || 0) + count;
      }
    });
    // Sort by frequency
    const sortedCards = Object.entries(cardFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([id, freq]) => ({ id, name: CARDS[id]?.name || id, totalPlays: freq, avgPerGame: (freq / count).toFixed(1) }));

    return {
      total: count,
      wins: wins.length,
      losses: losses.length,
      timeouts: timeouts.length,
      winRate: ((wins.length / count) * 100).toFixed(1) + '%',
      avgTurns: avgTurns.toFixed(1),
      avgHpRemaining: avgHpRemaining.toFixed(1),
      avgDamageDealt: avgDmgDealt.toFixed(0),
      avgDamageTaken: avgDmgTaken.toFixed(0),
      cardUsage: sortedCards
    };
  }

  // Print a formatted report
  printReport(report, label = '') {
    console.log(`\n${'='.repeat(50)}`);
    if (label) console.log(`  ${label}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`  Runs: ${report.total}`);
    console.log(`  Win Rate: ${report.winRate} (${report.wins}W / ${report.losses}L / ${report.timeouts}T)`);
    console.log(`  Avg Turns: ${report.avgTurns}`);
    console.log(`  Avg HP Remaining (wins): ${report.avgHpRemaining}`);
    console.log(`  Avg Damage Dealt: ${report.avgDamageDealt}`);
    console.log(`  Avg Damage Taken: ${report.avgDamageTaken}`);
    console.log(`\n  Card Usage (avg per game):`);
    report.cardUsage.slice(0, 10).forEach(c => {
      console.log(`    ${c.name.padEnd(20)} ${c.avgPerGame}`);
    });
    console.log(`${'='.repeat(50)}\n`);
  }
}

// ========================
// CLI ENTRY POINT
// ========================
const isMain = process.argv[1]?.includes('sim-runner');
if (isMain) {
  const args = process.argv.slice(2);
  const runs = parseInt(args[0]) || 500;

  let deckIds = [...STARTER_DECK];
  let enemyIds = ['goblin'];

  // Parse --deck
  const deckIdx = args.indexOf('--deck');
  if (deckIdx >= 0 && args[deckIdx + 1]) {
    const deckName = args[deckIdx + 1];
    if (deckName === 'starter') deckIds = [...STARTER_DECK];
    else if (deckName === 'upgraded') {
      deckIds = [...STARTER_DECK, 'lightning_bolt', 'fireball', 'empower'];
    }
  }

  // Parse --enemies
  const enemyIdx = args.indexOf('--enemies');
  if (enemyIdx >= 0 && args[enemyIdx + 1]) {
    enemyIds = args[enemyIdx + 1].split(',');
  }

  const sim = new SimRunner();

  console.log(`\nRunning ${runs} simulations...`);
  console.log(`Deck: ${deckIds.join(', ')}`);
  console.log(`Enemies: ${enemyIds.join(', ')}\n`);

  // Run against specified enemies
  const report = sim.runBatch(runs, deckIds, enemyIds);
  sim.printReport(report, `${enemyIds.join(' + ')} (${deckIds.length} cards)`);

  // If no custom enemies specified, also run standard battery
  if (enemyIdx < 0) {
    console.log('\n--- Standard Balance Battery ---\n');

    const scenarios = [
      { label: 'Single Goblin', enemies: ['goblin'] },
      { label: 'Double Goblin', enemies: ['goblin', 'goblin'] },
      { label: 'Goblin + Fire Imp', enemies: ['goblin', 'fire_imp'] },
      { label: 'Ice Golem', enemies: ['ice_golem'] },
      { label: 'Shadow', enemies: ['shadow'] },
      { label: 'Slime + Goblin', enemies: ['slime', 'goblin'] },
      { label: 'Elite: Goblin Chief', enemies: ['goblin_chief'] },
      { label: 'Elite: Void Weaver', enemies: ['void_weaver'] },
      { label: 'Boss: Breach Lord', enemies: ['breach_lord'] }
    ];

    for (const s of scenarios) {
      const r = sim.runBatch(Math.min(runs, 200), deckIds, s.enemies);
      sim.printReport(r, s.label);
    }
  }
}
