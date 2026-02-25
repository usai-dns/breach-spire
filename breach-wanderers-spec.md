# Breach Wanderers Clone — Phaser 3 Deckbuilder

## Overview
Roguelike deckbuilder in the style of Breach Wanderers / Slay the Spire. Browser-based using Phaser 3. Hosted on Cloudflare Pages (static files only, no backend initially).

## Tech Stack
- **Engine:** Phaser 3 (CDN — `https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js`)
- **Language:** Plain JavaScript (no TypeScript, no build tools, no framework)
- **Structure:** Multi-file project with ES modules, or single HTML entry point that loads scene files
- **Hosting:** Cloudflare Pages (static deploy from git repo)
- **Assets:** Placeholder/programmatic art first. Rectangles, text, and basic shapes. Visual polish is a later phase.

## Architecture

### Project Structure
```
/
├── index.html            # Entry point, loads Phaser + game config
├── js/
│   ├── main.js           # Phaser game config, scene registration
│   ├── scenes/
│   │   ├── BootScene.js      # Asset loading
│   │   ├── MenuScene.js      # Title screen
│   │   ├── MapScene.js       # Run map / node selection
│   │   ├── CombatScene.js    # Core combat gameplay
│   │   ├── RewardScene.js    # Card reward selection
│   │   ├── RestScene.js      # Rest site (heal or upgrade)
│   │   └── GameOverScene.js  # Run end screen
│   ├── systems/
│   │   ├── CombatManager.js  # Turn state machine, damage resolution
│   │   ├── DeckManager.js    # Draw pile, hand, discard, shuffle
│   │   ├── EnemyAI.js        # Intent selection and execution
│   │   ├── MapGenerator.js   # Procedural map/node graph
│   │   └── EffectResolver.js # Status effects, buffs, debuffs
│   ├── data/
│   │   ├── cards.json        # Card definitions
│   │   ├── enemies.json      # Enemy definitions
│   │   ├── relics.json       # Relic definitions (phase 2)
│   │   └── events.json       # Random event definitions (phase 2)
│   └── utils/
│       ├── Logger.js         # Debug logging system
│       └── SimRunner.js      # Headless combat simulator for balance testing
├── assets/                   # Placeholder sprites, sounds (later)
└── wrangler.toml             # Cloudflare Pages config (if needed)
```

### Scene Flow
```
Boot → Menu → Map → Combat → Reward → Map → ... → Boss → GameOver
                      ↓
                    Rest/Event
```

## Core Systems — Build Order

### Phase 1: Combat Core (build this first, playable standalone)

**1.1 Card Data Structure**
```json
{
  "id": "strike_fire",
  "name": "Fire Strike",
  "cost": 1,
  "type": "attack",
  "damage": 6,
  "damageType": "fire",
  "target": "single",
  "effects": [],
  "description": "Deal 6 fire damage.",
  "rarity": "starter"
}
```

Card types: `attack`, `skill`, `power`
Damage types: `physical`, `fire`, `ice`, `lightning`, `void`
Target modes: `single`, `all`, `self`, `random`

**1.2 Damage Type System**
Each enemy has resistances/weaknesses:
```json
{
  "resistances": {
    "physical": 1.0,
    "fire": 0.5,
    "ice": 1.5,
    "lightning": 1.0,
    "void": 1.0
  }
}
```
Multiplier applied at damage resolution. 1.0 = normal, 0.5 = resistant, 1.5 = weak, 0 = immune.

**1.3 Combat State Machine**
States: `PLAYER_TURN_START` → `PLAYER_TURN` → `PLAYER_TURN_END` → `ENEMY_TURN_START` → `ENEMY_INTENT_EXECUTE` → `ENEMY_TURN_END` → back to `PLAYER_TURN_START`

Player actions during PLAYER_TURN: play card (if enough energy), end turn.
Energy resets each turn (default 3).

**1.4 Deck Manager**
- Draw pile (shuffled)
- Hand (drawn at turn start, default 5)
- Discard pile (played cards + hand at end of turn)
- Exhaust pile (removed from combat)
- When draw pile empty, shuffle discard into draw

**1.5 Enemy Intent System**
Each enemy has a pattern or weighted random intent list:
```json
{
  "intents": [
    { "type": "attack", "damage": 8, "weight": 3 },
    { "type": "defend", "block": 5, "weight": 2 },
    { "type": "buff", "effect": "strength", "value": 2, "weight": 1 }
  ]
}
```
Intent selected at start of enemy turn, displayed to player, executed at end of enemy turn.

**1.6 Combat UI Layout**
```
┌─────────────────────────────────────────┐
│  Player HP: ██████░░ 65/80    Energy: 3 │
│                                         │
│           [Enemy]  Intent: ⚔️ 12        │
│           HP: ██████████░ 40/45         │
│                                         │
│  Block: 5    Strength: +2               │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Card 1│ │Card 2│ │Card 3│ │Card 4│   │
│  │ (1)  │ │ (2)  │ │ (0)  │ │ (1)  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                              [End Turn] │
│  Draw: 12  Discard: 3  Exhaust: 1      │
└─────────────────────────────────────────┘
```

**1.7 Combat Animations (Phaser tweens)**
- Card hover: scale up 1.2x, raise Y position
- Card play: tween card to target, fade out
- Damage dealt: screen shake, damage number popup (float up + fade), enemy flash red/white
- Block gained: shield icon pulse
- Enemy attack: enemy sprite lunges forward, returns
- Damage type VFX: color-coded particles (red=fire, blue=ice, yellow=lightning, purple=void)
- Turn transition: brief dim/brighten

**1.8 Debug Logger**
Every game action logs to an array:
```
[Turn 1] Drew: Fire Strike, Defend, Ice Shard, Strike, Block
[Turn 1] Played: Fire Strike → Goblin (6 fire × 1.5 weakness = 9 damage)
[Turn 1] Played: Defend → Self (5 block)
[Turn 1] End Turn. Discard hand.
[Turn 1] Enemy Intent: Attack 8 physical → Player (8 - 5 block = 3 damage)
```
Accessible via console or exportable as text. This is critical for balance testing.

### Phase 2: Run Structure
- MapGenerator: creates node graph (3-4 paths, 15 nodes, branching)
- Node types: normal fight, elite fight, rest site, random event, shop, boss
- Reward screen: pick 1 of 3 cards after combat
- Rest site: heal 30% or upgrade a card
- Run state: current HP, gold, deck, relics, map position

### Phase 3: Content & Balance
- Full card pool (start with ~30 cards, expandable)
- 8-10 basic enemies, 3-4 elites, 2-3 bosses
- Status effects: strength, weakness, vulnerable, poison, block
- SimRunner.js: headless mode that runs N combats and reports win rates, average damage, card pick rates

### Phase 4: Visual Polish
- Card art (placeholder → generated → custom)
- Enemy sprites
- Background art per zone
- Particle effects upgrade
- Sound effects and music
- Screen transitions

## Design Constraints
- No build tools. No webpack, no vite, no npm. Script tags and ES modules only.
- All game state must be serializable (for save/load and simulation)
- Card and enemy data lives in JSON, not hardcoded
- Every system should work headlessly (no Phaser dependency in core logic) so SimRunner can execute combat without rendering
- Mobile-friendly viewport (responsive canvas scaling) is a nice-to-have but not phase 1

## Separation of Concerns — Critical
The combat logic (CombatManager, DeckManager, EnemyAI, EffectResolver) must be **pure logic with no Phaser dependencies**. CombatScene reads state from these systems and renders it. This separation enables:
1. Headless simulation for balance testing
2. Easy porting to other engines later if desired
3. Clean testability

## Testing Strategy
1. **Debug logger** from day one — every action logged
2. **Console commands** — window.game.debugDraw(5), window.game.debugDamage("fire", 20), etc.
3. **SimRunner** — run 1000 combats headless, report: win rate, avg turns to win, card play frequency, damage type distribution
4. **Browser playtest** — open index.html, play, report bugs/feel issues

## Starter Card Pool (Phase 1 — minimum viable deck)

### Basic / Starter Cards
| Name | Cost | Type | Damage | DmgType | Effects | Notes |
|------|------|------|--------|---------|---------|-------|
| Strike | 1 | attack | 6 | physical | — | Starter card |
| Defend | 1 | skill | — | — | block 5 | Starter card |
| Fire Strike | 1 | attack | 6 | fire | — | |
| Ice Shard | 1 | attack | 4 | ice | — | Hits ALL enemies |
| Lightning Bolt | 2 | attack | 12 | lightning | — | |
| Void Touch | 1 | attack | 5 | void | apply weak 1 | |
| Flame Barrier | 2 | skill | — | — | block 8, thorns 3 fire | |
| Frost Armor | 1 | skill | — | — | block 4, apply slow 1 | |
| Surge | 0 | skill | — | — | +2 energy | Exhaust |
| Empower | 1 | power | — | — | +1 strength | Permanent for combat |
| Fireball | 2 | attack | 8 | fire | — | Hits ALL enemies |
| Chain Lightning | 2 | attack | 4 | lightning | — | Hits random enemy 3x |
| Void Rift | 3 | attack | 15 | void | apply vulnerable 2 | |

### Starter Enemies
| Name | HP | Intents | Resistances |
|------|-----|---------|-------------|
| Goblin | 20-25 | Attack 6-8 (60%), Defend 4 (40%) | fire weak (1.5×) |
| Slime | 30-35 | Attack 5 (50%), Buff str+1 (30%), Split (20% below 50% HP) | physical resist (0.5×), fire weak (1.5×) |
| Fire Imp | 15-20 | Attack 8 fire (70%), Buff str+2 (30%) | fire immune (0×), ice weak (2.0×) |
| Ice Golem | 45-50 | Attack 10 (40%), Defend 12 (40%), AoE 6 ice (20%) | ice immune (0×), fire weak (1.5×), lightning weak (1.5×) |
| Shadow | 25-30 | Attack 7 void (50%), Apply weak 1 (30%), Apply vulnerable 1 (20%) | void immune (0×), physical resist (0.5×) |

## Deployment
- Cloudflare Pages: connect git repo, deploy on push
- No build command needed (static files)
- Custom domain optional

## Working Agreement
- Claude Code builds and iterates autonomously on logic, systems, and balance
- Dennis and Sam playtest in browser and provide feedback on feel, fun, visual direction
- Debug logs and SimRunner output feed back to Claude for data-driven balance tuning
- Visual/animation polish is iterative — ugly-but-functional first, juice later
