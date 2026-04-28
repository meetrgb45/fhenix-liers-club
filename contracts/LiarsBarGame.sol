// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/ILiarsBarGame.sol";
import "./LiarsBarDeck.sol";
import "./LiarsBarRoulette.sol";

/**
 * @title LiarsBarGame
 * @notice Main state machine for Liar's Bar.
 *
 * Game flow:
 *   joinGame → startGame (deals cards + initializes revolvers) → makeClaim →
 *   challenge → [verifyClaimEncrypted off-chain] → publishRevealResult →
 *   [beginPull] → [decryptForTx off-chain] → publishTriggerResult → repeat
 */
contract LiarsBarGame is ILiarsBarGame {
    uint8 public constant MIN_PLAYERS = 2;
    uint8 public constant MAX_PLAYERS = 6;

    struct Game {
        address[MAX_PLAYERS] players;
        bool[MAX_PLAYERS]    eliminated;
        uint8                playerCount;
        uint8                currentPlayerIndex;
        GameState            state;
        CardRank             lastClaimRank;
        uint8                lastClaimCount;
        address              lastClaimant;
        // ctHash stored as uint256 — matches FHE.publishDecryptResult(uint256, ...) overload
        uint256              pendingRevealCtHash;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId = 1;

    LiarsBarDeck     public immutable deck;
    LiarsBarRoulette public immutable roulette;

    constructor(address _deck, address _roulette) {
        deck     = LiarsBarDeck(_deck);
        roulette = LiarsBarRoulette(_roulette);
    }

    // ─── Lobby ────────────────────────────────────────────────────────────

    function createGame() external returns (uint256 gameId) {
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.players[0]  = msg.sender;
        g.playerCount = 1;
        g.state       = GameState.WaitingForPlayers;
        emit PlayerJoined(gameId, msg.sender);
    }

    function joinGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.WaitingForPlayers, "Not waiting");
        require(g.playerCount < MAX_PLAYERS, "Game full");
        for (uint8 i = 0; i < g.playerCount; i++) {
            require(g.players[i] != msg.sender, "Already joined");
        }
        g.players[g.playerCount++] = msg.sender;
        emit PlayerJoined(gameId, msg.sender);
    }

    // ─── Start ────────────────────────────────────────────────────────────

    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.WaitingForPlayers, "Not waiting");
        require(g.players[0] == msg.sender, "Only host");
        require(g.playerCount >= MIN_PLAYERS, "Need more players");

        g.state = GameState.Dealing;
        emit GameStarted(gameId);

        for (uint8 i = 0; i < g.playerCount; i++) {
            deck.dealHand(gameId, g.players[i]);
            roulette.initRevolver(gameId, g.players[i]);
        }

        g.state = GameState.PlayerTurn;
        emit CardsDealt(gameId);
    }

    // ─── Gameplay ─────────────────────────────────────────────────────────

    function makeClaim(uint256 gameId, CardRank rank, uint8 count) external {
        Game storage g = games[gameId];
        require(g.state == GameState.PlayerTurn, "Not player turn");
        require(g.players[g.currentPlayerIndex] == msg.sender, "Not your turn");
        require(count >= 1 && count <= 3, "Invalid count");

        g.lastClaimRank  = rank;
        g.lastClaimCount = count;
        g.lastClaimant   = msg.sender;

        emit ClaimMade(gameId, msg.sender, rank, count);

        // Advance to next living player
        _advanceTurn(gameId);
    }

    /**
     * @notice Challenge the last claim. Calls verifyClaimEncrypted on the deck,
     *         stores the ctHash, transitions to Revealing state.
     *         Frontend must then call decryptForTx(ctHash).withoutPermit() and
     *         submit result via publishRevealResult.
     */
    function challenge(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.PlayerTurn, "Not player turn");
        require(g.players[g.currentPlayerIndex] == msg.sender, "Not your turn");
        require(g.lastClaimant != address(0), "No claim to challenge");
        require(g.lastClaimant != msg.sender, "Cannot challenge own claim");

        g.state = GameState.Revealing;
        emit ChallengeIssued(gameId, msg.sender, g.lastClaimant);

        uint256 ctHash = deck.verifyClaimEncrypted(
            gameId,
            g.lastClaimant,
            uint64(g.lastClaimRank)
        );
        g.pendingRevealCtHash = ctHash;
    }

    /**
     * @notice Submit decrypted matchCount + signature after challenge.
     *         result >= lastClaimCount → claimant was honest → challenger loses.
     *         result <  lastClaimCount → claimant was lying  → claimant loses.
     */
    function publishRevealResult(
        uint256 gameId,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        Game storage g = games[gameId];
        require(g.state == GameState.Revealing, "Not revealing");
        require(ctHash == g.pendingRevealCtHash, "Wrong ctHash");

        FHE.publishDecryptResult(ctHash, result, signature);
        delete g.pendingRevealCtHash;

        bool wasLying = result < uint256(g.lastClaimCount);
        address loser = wasLying ? g.lastClaimant : _currentPlayer(gameId);

        emit RevealResult(gameId, loser, wasLying);

        g.state = GameState.Roulette;
        pendingRoulettePlayer[gameId] = loser;
        uint256 triggerCtHash = roulette.beginPull(gameId, loser);
        // triggerCtHash is emitted in RouletteStarted event — frontend picks it up
        (triggerCtHash); // silence unused warning
    }

    /**
     * @notice Called by frontend after roulette decryptForTx resolves.
     *         Delegates to roulette contract for signature verification.
     *         If player is eliminated, checks for game over.
     */
    function publishTriggerResult(
        uint256 gameId,
        address player,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        Game storage g = games[gameId];
        require(g.state == GameState.Roulette, "Not in roulette");

        roulette.publishTriggerResult(gameId, player, ctHash, result, signature);

        bool survived = (result == 0);
        if (!survived) {
            _eliminatePlayer(gameId, player);
            if (_activePlayers(gameId) == 1) {
                g.state = GameState.GameOver;
                emit GameOver(gameId, _lastAlivePlayer(gameId));
                return;
            }
        }

        g.state = GameState.PlayerTurn;
        // Reset claim state for next round
        g.lastClaimant   = address(0);
        g.lastClaimCount = 0;
        delete pendingRoulettePlayer[gameId];
        // After roulette, advance to next player after the one who just pulled
        _setTurnToPlayer(gameId, player);
        _advanceTurn(gameId);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────

    function _currentPlayer(uint256 gameId) internal view returns (address) {
        return games[gameId].players[games[gameId].currentPlayerIndex];
    }

    function _advanceTurn(uint256 gameId) internal {
        Game storage g = games[gameId];
        uint8 next = g.currentPlayerIndex;
        for (uint8 i = 0; i < g.playerCount; i++) {
            next = (next + 1) % g.playerCount;
            if (!g.eliminated[next]) break;
        }
        g.currentPlayerIndex = next;
    }

    function _setTurnToPlayer(uint256 gameId, address player) internal {
        Game storage g = games[gameId];
        for (uint8 i = 0; i < g.playerCount; i++) {
            if (g.players[i] == player) {
                g.currentPlayerIndex = i;
                return;
            }
        }
    }

    function _eliminatePlayer(uint256 gameId, address player) internal {
        Game storage g = games[gameId];
        for (uint8 i = 0; i < g.playerCount; i++) {
            if (g.players[i] == player) {
                g.eliminated[i] = true;
                return;
            }
        }
    }

    function _activePlayers(uint256 gameId) internal view returns (uint8 count) {
        Game storage g = games[gameId];
        for (uint8 i = 0; i < g.playerCount; i++) {
            if (!g.eliminated[i]) count++;
        }
    }

    function _lastAlivePlayer(uint256 gameId) internal view returns (address) {
        Game storage g = games[gameId];
        for (uint8 i = 0; i < g.playerCount; i++) {
            if (!g.eliminated[i]) return g.players[i];
        }
        return address(0);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getGameState(uint256 gameId) external view returns (GameState) {
        return games[gameId].state;
    }

    function getCurrentPlayer(uint256 gameId) external view returns (address) {
        return _currentPlayer(gameId);
    }

    function getLastClaim(uint256 gameId) external view returns (address claimant, uint8 rank, uint8 count) {
        Game storage g = games[gameId];
        return (g.lastClaimant, uint8(g.lastClaimRank), g.lastClaimCount);
    }

    function getPendingRevealCtHash(uint256 gameId) external view returns (uint256) {
        return games[gameId].pendingRevealCtHash;
    }

    // Track who is in roulette phase
    mapping(uint256 => address) public pendingRoulettePlayer;

    function getPendingRoulettePlayer(uint256 gameId) external view returns (address) {
        return pendingRoulettePlayer[gameId];
    }

    function getPlayers(uint256 gameId) external view returns (address[] memory players, bool[] memory eliminated) {
        Game storage g = games[gameId];
        players   = new address[](g.playerCount);
        eliminated = new bool[](g.playerCount);
        for (uint8 i = 0; i < g.playerCount; i++) {
            players[i]   = g.players[i];
            eliminated[i] = g.eliminated[i];
        }
    }
}
