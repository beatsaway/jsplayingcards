class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }
}

class Deck {
  static ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  static suits = [
    { name: "clubs", symbol: "♣", color: "black" },
    { name: "spades", symbol: "♠", color: "black" },
    { name: "diamonds", symbol: "♦", color: "red" },
    { name: "hearts", symbol: "♥", color: "red" },
  ];

  constructor() {
    this.cards = Deck.suits.flatMap((suit) =>
      Deck.ranks.map((rank) => new Card(rank, suit))
    );
  }

  getCard(rank, suitName) {
    return this.cards.find((card) => card.rank === rank && card.suit.name === suitName) || null;
  }

  summon(rank, suitName, target, renderer = new CardRenderer()) {
    const card = this.getCard(rank, suitName);
    if (!card) {
      return null;
    }
    const node = renderer.createCardElement(card);
    target.appendChild(node);
    return node;
  }

  renderAll(target, renderer = new CardRenderer()) {
    this.cards.forEach((card) => target.appendChild(renderer.createCardElement(card)));
  }
}

class CardRenderer {
  constructor() {
    this.faceEmoji = {
      J: "🦹‍♂️",
      Q: "👸🏼",
      K: "🤴🏻",
    };
  }

  createCardElement(card) {
    const cardNode = document.createElement("div");
    cardNode.className = `card ${card.suit.color}`;

    if (this.isNumberRank(card.rank)) {
      cardNode.classList.add(`rank-${card.rank}`);
    }

    cardNode.appendChild(this.buildCorner(card, "top"));
    cardNode.appendChild(this.buildCenter(card));
    cardNode.appendChild(this.buildCorner(card, "bottom"));
    return cardNode;
  }

  buildCorner(card, position) {
    const corner = document.createElement("div");
    corner.className = `corner ${position}`;
    corner.textContent = card.rank;

    const suit = document.createElement("span");
    suit.textContent = card.suit.symbol;
    corner.appendChild(suit);

    return corner;
  }

  buildCenter(card) {
    if (this.isFaceRank(card.rank)) {
      return this.buildFace(card);
    }
    if (card.rank === "A") {
      return this.buildAce(card);
    }
    return this.buildPips(card);
  }

  buildAce(card) {
    const center = document.createElement("div");
    center.className = "center";
    center.textContent = card.suit.symbol;
    return center;
  }

  buildFace(card) {
    const center = document.createElement("div");
    center.className = "center face-emoji";

    const top = document.createElement("span");
    top.className = "emoji";
    top.textContent = this.faceEmoji[card.rank];

    const bottom = document.createElement("span");
    bottom.className = "emoji flipped";
    bottom.textContent = this.faceEmoji[card.rank];

    center.appendChild(top);
    center.appendChild(bottom);
    return center;
  }

  buildPips(card) {
    const rankNumber = Number(card.rank);
    const center = document.createElement("div");

    if (rankNumber <= 6) {
      center.className = "center pips";
      center.appendChild(this.buildPipsGrid(card.suit.symbol, rankNumber));
      return center;
    }

    if (rankNumber === 8) {
      center.className = "center pips pips-4 layout-8";
      center.appendChild(this.buildPipsGrid(card.suit.symbol, 8));
      return center;
    }

    center.className = "center pips-stack";
    const isSeven = rankNumber === 7;
    const topLayer = document.createElement("div");
    topLayer.className = `pips ${isSeven ? "pips-5 layout-6" : "pips-4 layout-8"}`;
    topLayer.appendChild(this.buildPipsGrid(card.suit.symbol, isSeven ? 6 : 8));
    center.appendChild(topLayer);

    const midLayer = document.createElement("div");
    if (isSeven) {
      midLayer.className = "pips pips-4 mid-1";
    } else {
      midLayer.className = `pips pips-5 ${rankNumber === 10 ? "mid-2" : "mid-1"}`;
    }
    midLayer.appendChild(this.buildPipsGrid(card.suit.symbol, rankNumber === 10 ? 2 : 1));
    center.appendChild(midLayer);

    return center;
  }

  buildPipsGrid(symbol, count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.textContent = symbol;
      fragment.appendChild(pip);
    }
    return fragment;
  }

  isFaceRank(rank) {
    return rank === "J" || rank === "Q" || rank === "K";
  }

  isNumberRank(rank) {
    return rank !== "A" && !this.isFaceRank(rank);
  }
}

// Example usage in HTML:
// const deck = new Deck();
// const renderer = new CardRenderer();
// const card = deck.getCard("A", "spades");
// document.body.appendChild(renderer.createCardElement(card));

window.Card = Card;
window.Deck = Deck;
window.CardRenderer = CardRenderer;
