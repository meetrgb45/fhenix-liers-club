// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ILiarsBarGame {
    // ─── Enums ────────────────────────────────────────────────────────────
    enum GameState { WaitingForPlayers, Dealing, PlayerTurn, Revealing, Roulette, GameOver }

    enum CardRank { Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Ace }

    // ─── Events ───────────────────────────────────────────────────────────
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameStarted(uint256 indexed gameId);
    event CardsDealt(uint256 indexed gameId);
    event ClaimMade(uint256 indexed gameId, address indexed claimant, CardRank rank, uint8 count);
    event ChallengeIssued(uint256 indexed gameId, address indexed challenger, address indexed challenged);
    event RevealResult(uint256 indexed gameId, address indexed loser, bool wasLying);
    event RouletteStarted(uint256 indexed gameId, address indexed player, uint8 chamberNumber);
    event TriggerPulled(uint256 indexed gameId, address indexed player, bool survived, uint8 chamberNumber);
    event PlayerEliminated(uint256 indexed gameId, address indexed player);
    event GameOver(uint256 indexed gameId, address indexed winner);

    // ─── Errors ───────────────────────────────────────────────────────────
    error NotYourTurn();
    error GameNotActive();
    error InvalidClaim();
    error GameFull();
    error NotInRoulettePhase();
}
