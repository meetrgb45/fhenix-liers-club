// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/ILiarsBarGame.sol";

/**
 * @title LiarsBarRoulette
 * @notice Encrypted Russian Roulette. Bullet position stays secret until the
 *         fatal chamber is hit — nobody knows it until decryptForTx resolves.
 *
 * Flow per penalty pull:
 *   1. Game calls beginPull(gameId, player)
 *   2. Contract computes isBullet = FHE.eq(bulletPos, chamber), calls allowPublic
 *   3. Frontend: client.decryptForTx(ctHash).withoutPermit().execute() → {result, signature}
 *   4. Frontend calls publishTriggerResult(gameId, player, ctHash, result, sig)
 *   5. FHE.publishDecryptResult verifies on-chain; TriggerPulled emitted
 *
 * Note: ctHash is stored/passed as uint256.
 *       ebool.unwrap() returns bytes32 — cast to uint256 for FHE.publishDecryptResult.
 */
contract LiarsBarRoulette is ILiarsBarGame {
    uint8 public constant CHAMBERS = 6;

    mapping(uint256 => mapping(address => euint8))  private _bulletPosition;
    mapping(uint256 => mapping(address => uint8))   public  currentChamber;
    // stored as uint256 — FHE.publishDecryptResult(uint256, ...) overload
    mapping(uint256 => mapping(address => uint256)) public  pendingTriggerCtHash;

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

    /// @notice Initialize an encrypted revolver for a player. Called once per player at deal time.
    function initRevolver(uint256 gameId, address player) external onlyGame {
        euint8 rand      = FHE.randomEuint8();
        euint8 bulletPos = FHE.rem(rand, FHE.asEuint8(CHAMBERS));
        FHE.allowThis(bulletPos);
        _bulletPosition[gameId][player] = bulletPos;
        currentChamber[gameId][player]  = 0;
    }

    /**
     * @notice Begin a trigger pull. Computes encrypted isBullet comparison,
     *         grants public decryption, emits RouletteStarted.
     * @return ctHash  uint256 handle of the isBullet ebool for frontend to decrypt
     */
    function beginPull(uint256 gameId, address player) external onlyGame returns (uint256 ctHash) {
        uint8 chamber = currentChamber[gameId][player];
        require(chamber < CHAMBERS, "All chambers exhausted");

        ebool isBullet = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(chamber));
        FHE.allowPublic(isBullet);

        // ebool.unwrap() returns bytes32 — cast to uint256 for storage and FHE.publishDecryptResult
        ctHash = uint256(ebool.unwrap(isBullet));
        pendingTriggerCtHash[gameId][player] = ctHash;

        emit RouletteStarted(gameId, player, chamber);
    }

    /**
     * @notice Submit decrypted result + Threshold Network signature on-chain.
     * @param result  0 = click (survived), 1 = bang (eliminated)
     */
    function publishTriggerResult(
        uint256 gameId,
        address player,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        require(ctHash == pendingTriggerCtHash[gameId][player], "Wrong ctHash");

        // FHE.publishDecryptResult(uint256, uint256, bytes) overload
        FHE.publishDecryptResult(ctHash, result, signature);

        uint8 chamber = currentChamber[gameId][player];
        currentChamber[gameId][player] = chamber + 1;
        delete pendingTriggerCtHash[gameId][player];

        bool survived = (result == 0);
        emit TriggerPulled(gameId, player, survived, chamber);
        if (!survived) emit PlayerEliminated(gameId, player);
    }

    function getPullCount(uint256 gameId, address player) external view returns (uint8) {
        return currentChamber[gameId][player];
    }
}
