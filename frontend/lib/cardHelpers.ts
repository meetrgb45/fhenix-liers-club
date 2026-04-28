export const RANK_NAMES   = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
export const SUIT_SYMBOLS = ['♣','♦','♥','♠'];
export const SUIT_COLORS  = ['text-gray-900','text-red-500','text-red-500','text-gray-900'];

export const cardRank = (v: number) => v % 13;
export const cardSuit = (v: number) => Math.floor(v / 13);

export function cardLabel(v: number): string {
  return `${RANK_NAMES[cardRank(v)]}${SUIT_SYMBOLS[cardSuit(v)]}`;
}

export function countRankInHand(hand: number[], rank: number): number {
  return hand.filter(c => cardRank(c) === rank).length;
}
