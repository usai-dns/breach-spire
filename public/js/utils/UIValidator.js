/**
 * UI Validator - Browser-based interaction testing.
 *
 * Load this script in the browser console or include via <script> tag
 * to run automated UI interaction tests on the live game.
 *
 * Usage:
 *   1. Open the game in browser
 *   2. Open dev console (F12)
 *   3. Paste this file or load via: import('/js/utils/UIValidator.js')
 *   4. Run: UIValidator.runAll()
 */
export class UIValidator {
  constructor(game) {
    this.game = game || window.game;
    this.results = [];
    this.errors = [];
  }

  log(test, pass, detail = '') {
    const entry = { test, pass, detail, time: new Date().toISOString() };
    this.results.push(entry);
    const icon = pass ? '✓' : '✗';
    const color = pass ? 'color:green' : 'color:red';
    console.log(`%c${icon} ${test}${detail ? ' — ' + detail : ''}`, color);
    if (!pass) this.errors.push(entry);
  }

  // Get the active scene
  getScene(key) {
    return this.game.scene.getScene(key);
  }

  getActiveScene() {
    const scenes = this.game.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0] : null;
  }

  // ==============================
  // TEST SUITES
  // ==============================

  testGameBoot() {
    console.log('\n── Game Boot ──');

    this.log('Game instance exists', !!this.game);
    this.log('Game is running', this.game?.isRunning);
    this.log('Canvas exists', !!this.game?.canvas);
    this.log('Canvas width > 0', this.game?.canvas?.width > 0, `w=${this.game?.canvas?.width}`);
    this.log('Canvas height > 0', this.game?.canvas?.height > 0, `h=${this.game?.canvas?.height}`);

    const scene = this.getActiveScene();
    this.log('Active scene exists', !!scene, scene?.scene?.key);
  }

  testMenuScene() {
    console.log('\n── Menu Scene ──');

    const scene = this.getScene('MenuScene');
    if (!scene) {
      this.log('MenuScene exists', false, 'Scene not found');
      return;
    }

    this.log('MenuScene exists', true);
    this.log('MenuScene is active or sleeping',
      scene.scene.isActive() || scene.scene.isSleeping(),
      `active=${scene.scene.isActive()}`);

    // Check for interactive elements
    const interactive = scene.children?.list?.filter(c => c.input?.enabled) || [];
    this.log('Has interactive elements', interactive.length > 0, `count=${interactive.length}`);
  }

  testCombatScene() {
    console.log('\n── Combat Scene ──');

    const scene = this.getScene('CombatScene');
    if (!scene || !scene.scene.isActive()) {
      this.log('CombatScene active', false, 'Not in combat');
      return;
    }

    this.log('CombatScene active', true);
    this.log('Combat manager exists', !!scene.combat);

    if (!scene.combat) return;

    const state = scene.combat.getState();
    this.log('Player HP > 0', state.player.hp > 0, `hp=${state.player.hp}`);
    this.log('Player maxHp valid', state.player.maxHp > 0);
    this.log('Energy >= 0', state.player.energy >= 0, `energy=${state.player.energy}`);
    this.log('Has enemies', state.enemies.length > 0, `count=${state.enemies.length}`);
    this.log('Has hand cards', state.hand.length >= 0, `hand=${state.hand.length}`);

    // Check card sprites match hand
    this.log('Card sprites match hand', scene.cardSprites.length === state.hand.length,
      `sprites=${scene.cardSprites.length}, hand=${state.hand.length}`);

    // Check enemy sprites match enemies
    this.log('Enemy sprites match enemies', scene.enemySprites.length === state.enemies.length);

    // Check animating flag
    this.log('Not stuck in animating', !scene.animating, `animating=${scene.animating}`);

    // Verify each enemy has intent
    state.enemies.forEach((e, i) => {
      if (e.hp > 0) {
        this.log(`Enemy ${i} (${e.name}) has intent`, !!e.currentIntent,
          e.currentIntent?.name || 'none');
        this.log(`Enemy ${i} HP valid`, e.hp > 0 && e.hp <= e.maxHp,
          `${e.hp}/${e.maxHp}`);
      }
    });

    // Verify deck counts add up
    const counts = state.deckCounts;
    const totalCards = counts.draw + counts.hand + counts.discard + counts.exhaust;
    this.log('Deck count integrity', totalCards >= 10,
      `draw=${counts.draw} hand=${counts.hand} disc=${counts.discard} exh=${counts.exhaust} total=${totalCards}`);

    // Check combat state
    this.log('Combat state valid',
      Object.values(state.state !== undefined),
      `state=${state.state}`);
  }

  testCardInteraction() {
    console.log('\n── Card Interaction ──');

    const scene = this.getScene('CombatScene');
    if (!scene?.scene.isActive() || !scene.combat) {
      this.log('CombatScene available', false);
      return;
    }

    const state = scene.combat.getState();

    // Test canPlayCard for each card in hand
    state.hand.forEach((card, i) => {
      const canPlay = scene.combat.canPlayCard(i);
      const hasEnergy = card.cost <= state.player.energy;
      this.log(`Card ${i} (${card.name}, cost ${card.cost}) playable=${canPlay}`,
        canPlay === hasEnergy,
        `energy=${state.player.energy}`);
    });

    // Test card needs target
    state.hand.forEach((card, i) => {
      const needsTarget = scene.combat.cardNeedsTarget(i);
      const shouldNeed = card.target === 'single';
      this.log(`Card ${i} (${card.name}) needsTarget=${needsTarget}`,
        needsTarget === shouldNeed,
        `target=${card.target}`);
    });

    // Check no stuck state
    this.log('selectedCardIndex is -1 (no stuck selection)',
      scene.selectedCardIndex === -1,
      `selected=${scene.selectedCardIndex}`);
    this.log('needsTarget is false',
      scene.needsTarget === false,
      `needsTarget=${scene.needsTarget}`);
  }

  testMapScene() {
    console.log('\n── Map Scene ──');

    const scene = this.getScene('MapScene');
    if (!scene?.scene.isActive()) {
      this.log('MapScene active', false, 'Not on map');
      return;
    }

    this.log('MapScene active', true);
    this.log('RunManager exists', !!scene.runManager);

    if (!scene.runManager) return;

    const state = scene.runManager.getState();
    this.log('Run state exists', !!state);
    this.log('Map exists', !!state.map);
    this.log('HP > 0', state.hp > 0, `hp=${state.hp}`);
    this.log('Deck has cards', state.deck.length > 0, `deck=${state.deck.length}`);

    // Check accessible nodes exist
    let accessibleCount = 0;
    state.map.floors.forEach(floor => {
      floor.forEach(node => {
        if (node.accessible && !node.visited) accessibleCount++;
      });
    });
    this.log('Has accessible nodes', accessibleCount > 0, `count=${accessibleCount}`);
  }

  // ==============================
  // RUN ALL
  // ==============================

  runAll() {
    this.results = [];
    this.errors = [];

    console.log('%c\n═══ UI Validator ═══', 'font-weight:bold;font-size:14px');

    this.testGameBoot();

    const active = this.getActiveScene();
    if (active) {
      const key = active.scene.key;
      console.log(`\nActive scene: ${key}`);

      if (key === 'MenuScene') this.testMenuScene();
      if (key === 'CombatScene') {
        this.testCombatScene();
        this.testCardInteraction();
      }
      if (key === 'MapScene') this.testMapScene();
    }

    this.printReport();
    return { passed: this.results.filter(r => r.pass).length, failed: this.errors.length, errors: this.errors };
  }

  // Run combat-specific tests (call from combat scene)
  runCombat() {
    this.results = [];
    this.errors = [];
    this.testGameBoot();
    this.testCombatScene();
    this.testCardInteraction();
    this.printReport();
    return { passed: this.results.filter(r => r.pass).length, failed: this.errors.length, errors: this.errors };
  }

  printReport() {
    const passed = this.results.filter(r => r.pass).length;
    console.log(`\n%c═══ Results: ${passed} passed, ${this.errors.length} failed ═══`,
      `font-weight:bold;color:${this.errors.length > 0 ? 'red' : 'green'}`);

    if (this.errors.length > 0) {
      console.log('%c\nFailed tests:', 'color:red;font-weight:bold');
      this.errors.forEach(e => {
        console.log(`  ✗ ${e.test}${e.detail ? ' — ' + e.detail : ''}`);
      });
    }
  }
}

// Auto-register on window for browser usage
if (typeof window !== 'undefined') {
  window.UIValidator = UIValidator;

  // Auto-create instance if game exists
  if (window.game) {
    window.uiTest = new UIValidator(window.game);
    console.log('UIValidator ready. Run: uiTest.runAll()');
  } else {
    // Wait for game to be ready
    const check = setInterval(() => {
      if (window.game) {
        window.uiTest = new UIValidator(window.game);
        console.log('UIValidator ready. Run: uiTest.runAll()');
        clearInterval(check);
      }
    }, 500);
    setTimeout(() => clearInterval(check), 10000);
  }
}
