export class Logger {
  constructor() {
    this.logs = [];
    this.turn = 0;
    this.enabled = true;
  }

  setTurn(turn) {
    this.turn = turn;
  }

  log(message, data = null) {
    if (!this.enabled) return;
    const entry = {
      turn: this.turn,
      time: Date.now(),
      message,
      data
    };
    this.logs.push(entry);
    console.log(`[Turn ${this.turn}] ${message}`, data || '');
  }

  combat(action, details) {
    this.log(`${action}: ${details}`);
  }

  damage(source, target, amount, type, resistance = 1.0) {
    const resText = resistance !== 1.0 ? ` (${resistance}x ${type} resistance)` : '';
    this.log(`${source} → ${target}: ${amount} ${type} damage${resText}`);
  }

  block(target, amount) {
    this.log(`${target} gains ${amount} Block`);
  }

  status(target, status, amount) {
    this.log(`${target} gains ${amount} ${status}`);
  }

  draw(cards) {
    this.log(`Drew: ${cards.join(', ')}`);
  }

  shuffle() {
    this.log('Shuffled discard pile into draw pile');
  }

  clear() {
    this.logs = [];
    this.turn = 0;
  }

  getLog() {
    return this.logs.map(e => `[Turn ${e.turn}] ${e.message}`).join('\n');
  }
}
