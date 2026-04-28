export const GAME_ADDRESS     = (process.env.NEXT_PUBLIC_GAME_ADDRESS     ?? '0x') as `0x${string}`;
export const DECK_ADDRESS     = (process.env.NEXT_PUBLIC_DECK_ADDRESS     ?? '0x') as `0x${string}`;
export const ROULETTE_ADDRESS = (process.env.NEXT_PUBLIC_ROULETTE_ADDRESS ?? '0x') as `0x${string}`;

// GameState enum values (must match Solidity order)
export const GameState = {
  WaitingForPlayers: 0,
  Dealing:           1,
  PlayerTurn:        2,
  Revealing:         3,
  Roulette:          4,
  GameOver:          5,
} as const;

export const GAME_ABI = [
  { name: 'createGame',           type: 'function', stateMutability: 'nonpayable', inputs: [],                                                                                                                                                outputs: [{ name: '', type: 'uint256' }] },
  { name: 'joinGame',             type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [] },
  { name: 'startGame',            type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [] },
  { name: 'makeClaim',            type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'rank', type: 'uint8' }, { name: 'count', type: 'uint8' }],                                       outputs: [] },
  { name: 'challenge',            type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [] },
  { name: 'publishRevealResult',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { name: 'publishTriggerResult', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { name: 'getGameState',         type: 'function', stateMutability: 'view',       inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [{ name: '', type: 'uint8' }] },
  { name: 'getCurrentPlayer',     type: 'function', stateMutability: 'view',       inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [{ name: '', type: 'address' }] },
  { name: 'getPlayers',           type: 'function', stateMutability: 'view',       inputs: [{ name: 'gameId', type: 'uint256' }],                                                                                                          outputs: [{ name: 'players', type: 'address[]' }, { name: 'eliminated', type: 'bool[]' }] },
  { name: 'getLastClaim',             type: 'function', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'claimant', type: 'address' }, { name: 'rank', type: 'uint8' }, { name: 'count', type: 'uint8' }] },
  { name: 'getPendingRevealCtHash',     type: 'function', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getPendingRoulettePlayer',   type: 'function', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  // Events
  { name: 'PlayerJoined',    type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }] },
  { name: 'GameStarted',     type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }] },
  { name: 'ClaimMade',       type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'claimant', type: 'address', indexed: true }, { name: 'rank', type: 'uint8' }, { name: 'count', type: 'uint8' }] },
  { name: 'ChallengeIssued', type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'challenger', type: 'address', indexed: true }, { name: 'challenged', type: 'address', indexed: true }] },
  { name: 'RevealResult',    type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'loser', type: 'address', indexed: true }, { name: 'wasLying', type: 'bool' }] },
  { name: 'RouletteStarted', type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'chamberNumber', type: 'uint8' }] },
  { name: 'TriggerPulled',   type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'survived', type: 'bool' }, { name: 'chamberNumber', type: 'uint8' }] },
  { name: 'PlayerEliminated',type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }] },
  { name: 'GameOver',        type: 'event', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'winner', type: 'address', indexed: true }] },
] as const;

export const DECK_ABI = [
  { name: 'getHandHashes',         type: 'function', stateMutability: 'view',       inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ name: 'hashes', type: 'uint256[3]' }] },
  { name: 'verifyClaimEncrypted',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }, { name: 'claimedRank', type: 'uint64' }], outputs: [{ name: 'matchCtHash', type: 'uint256' }] },
] as const;

export const ROULETTE_ABI = [
  { name: 'pendingTriggerCtHash', type: 'function', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getPullCount',         type: 'function', stateMutability: 'view', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ name: '', type: 'uint8' }] },
] as const;
