import { CARDS } from '../data/cards.js';

export class DeckManager {
  constructor(deckCardIds, logger) {
    this.logger = logger;
    this.drawPile = [];
    this.hand = [];
    this.discardPile = [];
    this.exhaustPile = [];
    this.handSize = 5;

    // Build deck from card IDs
    this.drawPile = deckCardIds.map(id => this.makeCard(id));
    this.shuffle();
  }

  makeCard(id) {
    const template = CARDS[id];
    if (!template) throw new Error(`Unknown card: ${id}`);
    return {
      ...template,
      uid: `${id}_${Math.random().toString(36).substr(2, 6)}`
    };
  }

  shuffle() {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
    this.logger.shuffle();
  }

  drawCards(count = null) {
    const toDraw = count != null ? count : this.handSize;
    const drawn = [];

    for (let i = 0; i < toDraw; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.drawPile = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
      }
      const card = this.drawPile.pop();
      this.hand.push(card);
      drawn.push(card);
    }

    this.logger.draw(drawn.map(c => c.name));
    return drawn;
  }

  playCard(handIndex) {
    if (handIndex < 0 || handIndex >= this.hand.length) return null;
    const card = this.hand.splice(handIndex, 1)[0];

    if (card.exhaust) {
      this.exhaustPile.push(card);
      this.logger.combat('Exhausted', card.name);
    } else {
      this.discardPile.push(card);
    }

    return card;
  }

  discardHand() {
    const discarded = [...this.hand];
    this.discardPile.push(...this.hand);
    this.hand = [];
    return discarded;
  }

  getHand() {
    return [...this.hand];
  }

  getCounts() {
    return {
      draw: this.drawPile.length,
      hand: this.hand.length,
      discard: this.discardPile.length,
      exhaust: this.exhaustPile.length
    };
  }

  addCardToDeck(cardId) {
    const card = this.makeCard(cardId);
    this.discardPile.push(card);
    return card;
  }
}
