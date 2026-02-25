export class EffectResolver {
  constructor(logger) {
    this.logger = logger;
  }

  // Resolve all effects of a played card
  resolveCard(card, player, enemies, targetIndex) {
    const events = [];

    for (const effect of card.effects) {
      const effectEvents = this.resolveEffect(effect, card, player, enemies, targetIndex);
      events.push(...effectEvents);
    }

    return events;
  }

  resolveEffect(effect, card, player, enemies, targetIndex) {
    switch (effect.type) {
      case 'damage':
        return this.resolveDamage(effect, card, player, enemies, targetIndex);
      case 'block':
        return this.resolveBlock(effect, player);
      case 'applyStatus':
        return this.resolveApplyStatus(effect, player, enemies, targetIndex);
      case 'draw':
        return [{ type: 'draw', value: effect.value }];
      case 'energy':
        return [{ type: 'energy', value: effect.value }];
      default:
        return [];
    }
  }

  resolveDamage(effect, card, player, enemies, targetIndex) {
    const events = [];
    const baseDamage = effect.value + (player.statuses.strength || 0);
    const isWeak = (player.statuses.weak || 0) > 0;
    const damageType = effect.damageType || 'physical';
    const hits = effect.hits || 1;

    for (let h = 0; h < hits; h++) {
      let targets = [];
      if (card.target === 'all') {
        targets = enemies.map((_, i) => i).filter(i => enemies[i].hp > 0);
      } else if (card.target === 'random') {
        const alive = enemies.map((_, i) => i).filter(i => enemies[i].hp > 0);
        if (alive.length > 0) {
          targets = [alive[Math.floor(Math.random() * alive.length)]];
        }
      } else {
        if (targetIndex >= 0 && targetIndex < enemies.length && enemies[targetIndex].hp > 0) {
          targets = [targetIndex];
        }
      }

      for (const ti of targets) {
        const enemy = enemies[ti];
        let damage = baseDamage;

        // Weakness reduces damage by 25%
        if (isWeak) {
          damage = Math.floor(damage * 0.75);
        }

        // Vulnerability increases damage taken by 50%
        if ((enemy.statuses.vulnerable || 0) > 0) {
          damage = Math.floor(damage * 1.5);
        }

        // Apply resistance
        const resistance = enemy.resistances[damageType] ?? 1.0;
        damage = Math.floor(damage * resistance);

        // Apply to block first, then HP
        const { blocked, hpDamage } = this.applyDamageToTarget(enemy, damage);

        this.logger.damage(
          card.name, enemy.name, damage, damageType, resistance
        );

        events.push({
          type: 'damage',
          targetIndex: ti,
          targetType: 'enemy',
          amount: damage,
          damageType,
          blocked,
          hpDamage,
          resistance
        });

        // Check for thorns on enemy (when attacking)
        if ((enemy.statuses.thorns || 0) > 0) {
          const thornsDmg = enemy.statuses.thorns;
          const { blocked: tb, hpDamage: thd } = this.applyDamageToTarget(player, thornsDmg);
          events.push({
            type: 'damage',
            targetType: 'player',
            amount: thornsDmg,
            damageType: 'physical',
            blocked: tb,
            hpDamage: thd,
            source: 'thorns'
          });
        }

        if (enemy.hp <= 0) {
          events.push({ type: 'death', targetIndex: ti, enemyName: enemy.name });
        }
      }
    }

    return events;
  }

  resolveBlock(effect, player) {
    const block = effect.value;
    player.block += block;
    this.logger.block('Player', block);
    return [{ type: 'block', targetType: 'player', amount: block }];
  }

  resolveApplyStatus(effect, player, enemies, targetIndex) {
    const events = [];
    const status = effect.status;
    const value = effect.value;

    if (effect.target === 'self') {
      player.statuses[status] = (player.statuses[status] || 0) + value;
      this.logger.status('Player', status, value);
      events.push({ type: 'status', targetType: 'player', status, value });
    } else if (effect.target === 'enemy') {
      if (targetIndex >= 0 && targetIndex < enemies.length) {
        const enemy = enemies[targetIndex];
        enemy.statuses[status] = (enemy.statuses[status] || 0) + value;
        this.logger.status(enemy.name, status, value);
        events.push({ type: 'status', targetType: 'enemy', targetIndex, status, value });
      }
    } else if (effect.target === 'allEnemies') {
      enemies.forEach((enemy, i) => {
        if (enemy.hp > 0) {
          enemy.statuses[status] = (enemy.statuses[status] || 0) + value;
          this.logger.status(enemy.name, status, value);
          events.push({ type: 'status', targetType: 'enemy', targetIndex: i, status, value });
        }
      });
    }

    return events;
  }

  applyDamageToTarget(target, damage) {
    let blocked = 0;
    let hpDamage = damage;

    if (target.block > 0) {
      blocked = Math.min(target.block, damage);
      target.block -= blocked;
      hpDamage = damage - blocked;
    }

    target.hp = Math.max(0, target.hp - hpDamage);

    return { blocked, hpDamage };
  }

  // Process start-of-turn effects for player
  processPlayerTurnStart(player) {
    const events = [];

    // Block resets
    if (player.block > 0) {
      player.block = 0;
      events.push({ type: 'blockReset', targetType: 'player' });
    }

    // Poison ticks
    if ((player.statuses.poison || 0) > 0) {
      const poisonDmg = player.statuses.poison;
      player.hp = Math.max(0, player.hp - poisonDmg);
      player.statuses.poison--;
      this.logger.log(`Player takes ${poisonDmg} poison damage`);
      events.push({ type: 'poison', targetType: 'player', amount: poisonDmg });
    }

    // Burn ticks
    if ((player.statuses.burn || 0) > 0) {
      const burnDmg = player.statuses.burn;
      player.hp = Math.max(0, player.hp - burnDmg);
      player.statuses.burn--;
      this.logger.log(`Player takes ${burnDmg} burn damage`);
      events.push({ type: 'burn', targetType: 'player', amount: burnDmg });
    }

    return events;
  }

  // Process start-of-turn effects for enemies
  processEnemyTurnStart(enemies) {
    const events = [];

    enemies.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;

      // Block resets
      if (enemy.block > 0) {
        enemy.block = 0;
        events.push({ type: 'blockReset', targetType: 'enemy', targetIndex: i });
      }

      // Poison ticks
      if ((enemy.statuses.poison || 0) > 0) {
        const poisonDmg = enemy.statuses.poison;
        enemy.hp = Math.max(0, enemy.hp - poisonDmg);
        enemy.statuses.poison--;
        this.logger.log(`${enemy.name} takes ${poisonDmg} poison damage`);
        events.push({ type: 'poison', targetType: 'enemy', targetIndex: i, amount: poisonDmg });

        if (enemy.hp <= 0) {
          events.push({ type: 'death', targetIndex: i, enemyName: enemy.name });
        }
      }

      // Burn ticks
      if ((enemy.statuses.burn || 0) > 0) {
        const burnDmg = enemy.statuses.burn;
        enemy.hp = Math.max(0, enemy.hp - burnDmg);
        enemy.statuses.burn--;
        this.logger.log(`${enemy.name} takes ${burnDmg} burn damage`);
        events.push({ type: 'burn', targetType: 'enemy', targetIndex: i, amount: burnDmg });

        if (enemy.hp <= 0) {
          events.push({ type: 'death', targetIndex: i, enemyName: enemy.name });
        }
      }
    });

    return events;
  }

  // Decrement duration-based statuses at end of turn
  tickStatuses(entity, entityName) {
    const events = [];
    const durationStatuses = ['weak', 'vulnerable', 'slow'];

    for (const status of durationStatuses) {
      if ((entity.statuses[status] || 0) > 0) {
        entity.statuses[status]--;
        if (entity.statuses[status] <= 0) {
          delete entity.statuses[status];
          events.push({ type: 'statusExpire', name: entityName, status });
        }
      }
    }

    return events;
  }

  // Resolve an enemy intent
  resolveEnemyIntent(intent, enemy, enemyIndex, player) {
    const events = [];

    if (intent.type === 'attack') {
      let damage = intent.damage + (enemy.statuses.strength || 0);
      const isWeak = (enemy.statuses.weak || 0) > 0;
      if (isWeak) damage = Math.floor(damage * 0.75);
      if ((player.statuses.vulnerable || 0) > 0) damage = Math.floor(damage * 1.5);

      const { blocked, hpDamage } = this.applyDamageToTarget(player, damage);
      const damageType = intent.damageType || 'physical';

      this.logger.damage(enemy.name, 'Player', damage, damageType);
      events.push({
        type: 'enemyAttack',
        enemyIndex,
        amount: damage,
        damageType,
        blocked,
        hpDamage
      });

      // Check player thorns
      if ((player.statuses.thorns || 0) > 0) {
        const thornsDmg = player.statuses.thorns;
        const { blocked: tb, hpDamage: thd } = this.applyDamageToTarget(enemy, thornsDmg);
        events.push({
          type: 'damage',
          targetType: 'enemy',
          targetIndex: enemyIndex,
          amount: thornsDmg,
          damageType: 'physical',
          blocked: tb,
          hpDamage: thd,
          source: 'thorns'
        });
        if (enemy.hp <= 0) {
          events.push({ type: 'death', targetIndex: enemyIndex, enemyName: enemy.name });
        }
      }

      if (player.hp <= 0) {
        events.push({ type: 'playerDeath' });
      }
    } else if (intent.type === 'defend') {
      enemy.block += intent.block;
      this.logger.block(enemy.name, intent.block);
      events.push({ type: 'enemyBlock', enemyIndex, amount: intent.block });
    } else if (intent.type === 'buff') {
      enemy.statuses[intent.status] = (enemy.statuses[intent.status] || 0) + intent.value;
      this.logger.status(enemy.name, intent.status, intent.value);
      events.push({ type: 'enemyBuff', enemyIndex, status: intent.status, value: intent.value });
    } else if (intent.type === 'debuff') {
      player.statuses[intent.status] = (player.statuses[intent.status] || 0) + intent.value;
      this.logger.status('Player', intent.status, intent.value);
      events.push({ type: 'enemyDebuff', enemyIndex, status: intent.status, value: intent.value });
    } else if (intent.type === 'multi') {
      for (const action of intent.actions) {
        const subEvents = this.resolveEnemyIntent(
          { ...action, name: intent.name },
          enemy, enemyIndex, player
        );
        events.push(...subEvents);
      }
    }

    return events;
  }
}
