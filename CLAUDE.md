# Breach Wanderers - Development Guide

## Project Overview
Roguelike deckbuilder clone of Breach Wanderers, built with Phaser 3 (CDN), plain JS ES modules, hosted on Cloudflare Workers.

**Live URL:** https://breach-wanderers.usai-dlh.workers.dev

## Architecture

```
public/                         # Static files served by Cloudflare
├── index.html                  # Entry point (Phaser 3 CDN + modules)
├── js/
│   ├── main.js                 # Phaser config, scene registration
│   ├── scenes/                 # Phaser rendering layer (UI + animations)
│   │   ├── BootScene.js        # Programmatic texture generation
│   │   ├── MenuScene.js        # Title screen
│   │   ├── MapScene.js         # Roguelike map with branching paths
│   │   ├── CombatScene.js      # Core combat UI (cards, enemies, animations)
│   │   ├── RewardScene.js      # Pick 1-of-3 card rewards
│   │   ├── RestScene.js        # Campfire rest/heal
│   │   ├── EventScene.js       # Random narrative events
│   │   └── GameOverScene.js    # Win/loss screen
│   ├── systems/                # Pure logic (ZERO Phaser dependency, headless-testable)
│   │   ├── CombatManager.js    # Turn state machine, energy, card orchestration
│   │   ├── DeckManager.js      # Draw/hand/discard/exhaust/shuffle
│   │   ├── EffectResolver.js   # Damage calc, resistances, block, status effects
│   │   ├── EnemyAI.js          # Weighted intent selection
│   │   ├── MapGenerator.js     # Procedural 15-floor branching map
│   │   └── RunManager.js       # Run state, rewards, events, deck building
│   ├── data/                   # Game data (cards, enemies, encounters)
│   │   ├── cards.js            # 21 cards, 5 damage types, 4 rarities
│   │   └── enemies.js          # 8 enemies, encounter tables, floor difficulty
│   └── utils/
│       ├── Logger.js           # Debug logging system
│       └── UIValidator.js      # Browser-based UI interaction tester
├── test/
│   ├── combat.test.js          # Unit tests for all systems
│   └── sim-runner.js           # Balance simulation (headless N-combat runs)
├── wrangler.toml               # Cloudflare Worker config
└── breach-wanderers-spec.md    # Original game design spec
```

### Key Design Principle
**Systems** (`systems/`) contain pure logic with zero Phaser imports. **Scenes** (`scenes/`) call systems and translate results into visuals. This lets us run the full combat engine headlessly in Node for testing and balance tuning.

## Commands

### Development
```bash
npm run dev              # Start local dev server (http://localhost:8788)
npm run deploy           # Deploy to Cloudflare Workers (live URL)
```

### Testing
```bash
npm test                 # Run combat engine unit tests (data, systems, flow)
npm run test:balance     # Run 500 simulated combats, report win rates
npm run test:balance:quick  # Run 100 simulations (faster)
npm run test:all         # Run unit tests + balance simulation
```

### Balance Simulation (advanced)
```bash
# Custom enemies
node test/sim-runner.js 500 --enemies goblin,fire_imp
node test/sim-runner.js 200 --enemies breach_lord

# Upgraded deck
node test/sim-runner.js 500 --deck upgraded --enemies goblin_chief
```

### Browser UI Testing
Open the game in a browser, then in the dev console (F12):
```javascript
uiTest.runAll()          // Test whatever scene is active
uiTest.runCombat()       // Test combat-specific interactions

// Or import manually:
import('/js/utils/UIValidator.js')
```

## Testing Workflow (What to Run When)

### After changing combat logic (systems/)
```bash
npm test                 # Verify no regressions
npm run test:balance     # Check win rates haven't gone crazy
```

### After changing UI (scenes/)
1. `npm run deploy` to push changes
2. Open live URL in browser
3. Run `uiTest.runAll()` in console
4. Play-test manually: Menu → Map → Combat → Reward → Map loop

### After changing card/enemy data
```bash
npm test                 # Data integrity checks
npm run test:balance     # Full balance battery (all encounters)
```

### After any change
```bash
npm run test:all         # Quick sanity check (tests + short sim)
npm run deploy           # Push to live
```

## Balance Targets
- Single easy enemy (goblin): ~90%+ win rate
- Double enemy (goblin+fire_imp): ~60-75% win rate
- Elite (goblin_chief): ~40-60% win rate
- Boss (breach_lord): ~15-30% win rate with starter deck

## Combat State Machine
```
PLAYER_TURN_START → PLAYER_TURN → PLAYER_TURN_END →
ENEMY_TURN_START → ENEMY_INTENT_EXECUTE → ENEMY_TURN_END →
(back to PLAYER_TURN_START)
```

### Critical: `animating` Flag
CombatScene uses `this.animating` to gate all player input. Every code path must:
- Set `animating = true` before async work
- Set `animating = false` when player should regain control
- `startPlayerTurn()` MUST reset `animating = false` at the end

## Card Effect System
Cards define effects as arrays:
```javascript
effects: [
  { type: 'damage', value: 6, damageType: 'fire' },      // deal damage
  { type: 'block', value: 5 },                             // gain block
  { type: 'applyStatus', status: 'weak', value: 1, target: 'enemy' },
  { type: 'draw', value: 1 },                              // draw cards
  { type: 'energy', value: 2 }                             // gain energy
]
```

Target modes: `single` (click enemy), `all` (all enemies), `self` (player), `random` (random enemy).

## Damage Pipeline
```
base_damage + strength → weakness (×0.75) → vulnerability (×1.5) → resistance → block → HP
```

## Status Effects
| Status     | Effect                           | Duration     |
|------------|----------------------------------|--------------|
| strength   | +N attack damage                 | permanent    |
| weak       | deal 25% less damage             | N turns      |
| vulnerable | take 50% more damage             | N turns      |
| poison     | take N damage at turn start, -1  | until 0      |
| burn       | take N damage at turn start, -1  | until 0      |
| thorns     | deal N damage to attackers       | permanent    |
| slow       | draw 1 fewer card next turn      | N turns      |

## Adding New Content

### New Card
1. Add to `public/js/data/cards.js` CARDS object
2. Add to appropriate REWARD_POOL rarity
3. Run `npm test` to verify data integrity
4. Run `npm run test:balance` to check balance impact

### New Enemy
1. Add to `public/js/data/enemies.js` ENEMIES object
2. Add to appropriate ENCOUNTERS difficulty tier
3. Run `npm test` to verify data integrity
4. Run balance sim: `node test/sim-runner.js 200 --enemies new_enemy_id`

### New Status Effect
1. Add tick logic in `EffectResolver.js` `processPlayerTurnStart`/`processEnemyTurnStart`
2. Add duration decrement in `tickStatuses` if it's duration-based
3. Add icon in `CombatScene.js` `formatStatuses`
4. Run `npm test`

## Error Patterns to Watch For

### "Card won't play" / Clicks do nothing
- Check `animating` flag: should be `false` during player turn
- Check `combat.state`: should be `PLAYER_TURN`
- Check `player.energy`: must be >= card cost
- Run `uiTest.runCombat()` in browser to diagnose

### "Scene transition fails"
- Check data passing between scenes (runManager, playerState)
- Check `MapScene.selectNode` validates encounter before `visitNode`

### "Balance feels off"
```bash
node test/sim-runner.js 500 --enemies problematic_enemy
```
Check win rate, avg turns, card usage frequency.
