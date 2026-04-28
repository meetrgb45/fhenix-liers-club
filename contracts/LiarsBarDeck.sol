// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title LiarsBarDeck
 * @notice Encrypted card hands. Cards are euint64 (values 0–51) to avoid
 *         multi-type FHE cast issues. Only the owning player can decrypt
 *         their hand via permit + decryptForView.
 *
 * Card encoding:  value = rank + suit*13
 *   rank = value % 13  (0=Two … 12=Ace)
 *   suit = value / 13  (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
 */
contract LiarsBarDeck {
    uint8 public constant HAND_SIZE = 3;

    // gameId => player => 3 encrypted cards
    mapping(uint256 => mapping(address => euint64[HAND_SIZE])) private _hands;

    address public gameContract;

    modifier onlyGame() {
        require(msg.sender == gameContract, "Only game");
        _;
    }

    constructor(address _gameContract) {
        gameContract = _gameContract;
    }

    function setGameContract(address _gameContract) external {
        require(gameContract == address(0) || gameContract == msg.sender, "Unauthorized");
        gameContract = _gameContract;
    }

    /**
     * @notice Deal 3 random encrypted cards to a player.
     *         Uses one random seed + per-slot salt to derive each card.
     *         FHE.allow(card, player) — only that player can decryptForView.
     *         FHE.allowThis(card)     — contract can run comparisons during reveal.
     */
    function dealHand(uint256 gameId, address player) external onlyGame {
        euint64 seed = FHE.randomEuint64();
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            euint64 salt = FHE.asEuint64(uint64(i * 7 + 43));
            euint64 card = FHE.rem(FHE.add(seed, salt), FHE.asEuint64(52));
            FHE.allow(card, player);
            FHE.allowThis(card);
            _hands[gameId][player][i] = card;
        }
    }

    /**
     * @notice Returns uint256 ciphertext handles for a player's hand.
     *         Frontend: decryptForView(ctHash, FheTypes.Uint64).withPermit().execute()
     */
    function getHandHashes(
        uint256 gameId,
        address player
    ) external view returns (uint256[HAND_SIZE] memory hashes) {
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            hashes[i] = uint256(euint64.unwrap(_hands[gameId][player][i]));
        }
    }

    /**
     * @notice Compute encrypted count of cards matching claimedRank.
     *         Called during challenge resolution. Returns uint256 ctHash.
     *         FHE.allowPublic → frontend uses withoutPermit() for decryptForTx.
     */
    function verifyClaimEncrypted(
        uint256 gameId,
        address player,
        uint64  claimedRank
    ) external onlyGame returns (uint256 matchCtHash) {
        euint64 encRank    = FHE.asEuint64(claimedRank);
        euint64 matchCount = FHE.asEuint64(0);

        for (uint8 i = 0; i < HAND_SIZE; i++) {
            euint64 cardRank = FHE.rem(_hands[gameId][player][i], FHE.asEuint64(13));
            ebool   isMatch  = FHE.eq(cardRank, encRank);
            matchCount = FHE.add(matchCount, FHE.select(isMatch, FHE.asEuint64(1), FHE.asEuint64(0)));
        }

        FHE.allowPublic(matchCount);
        FHE.allowThis(matchCount);
        matchCtHash = uint256(euint64.unwrap(matchCount));
    }
}
