# 🃏🔫 Liar's Bar on Fhenix

A fully on-chain, privacy-preserving Liar's Bar game using Fhenix CoFHE. Players hold **encrypted hands** and the **bullet position is encrypted** — nobody knows where the bullet is until the trigger is actually pulled.

## What's Built

✅ **Smart Contracts** (Solidity 0.8.28 + FHE.sol)
- `LiarsBarGame.sol` — Main state machine (lobby, claims, challenges, turn management)
- `LiarsBarDeck.sol` — Encrypted card dealing (euint64, 0–51 per card)
- `LiarsBarRoulette.sol` — Encrypted Russian Roulette (euint8 bullet position)
- `ILiarsBarGame.sol` — Shared interface (events, enums, errors)

✅ **Tests** (Hardhat + @cofhe/hardhat-plugin)
- `LiarsBarRoulette.test.ts` — Roulette mechanics (beginPull, publishTriggerResult, 6-chamber exhaustion)
- `LiarsBarDeck.test.ts` — Card dealing, decryption, verifyClaimEncrypted

✅ **Deploy Script**
- `scripts/deploy.ts` — Deploys all 3 contracts, links them, saves addresses to `deployments/{network}.json`

## Quick Start

### 1. Install Dependencies

```bash
cd liars-bar-fhenix
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your SEPOLIA_RPC_URL and PRIVATE_KEY
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
npm test
```

### 5. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

Deployment addresses will be saved to `deployments/eth-sepolia.json`.

## Architecture

```
LiarsBarGame (state machine)
    ├── LiarsBarDeck (encrypted cards)
    └── LiarsBarRoulette (encrypted bullet)
```

**Key FHE Patterns:**
- Cards are `euint64` (0–51) to avoid multi-type cast issues
- Bullet position is `euint8` (0–5), stays encrypted until decryptForTx
- `ebool.unwrap()` and `euint64.unwrap()` return `bytes32` (not `uint256`)
- `decryptForTx` returns `{ result, signature }` (not `{ decryptedValue, signature }`)
- `FHE.allowPublic` used for challenge/roulette results (public outcomes)
- `FHE.allow(card, player)` used for private card hands (only owner can decrypt)

## Game Flow

1. **Lobby** — `createGame()` → `joinGame()` (2–6 players)
2. **Deal** — `startGame()` → `dealHand()` + `initRevolver()` for each player
3. **Claim** — `makeClaim(rank, count)` → next player's turn
4. **Challenge** — `challenge()` → `verifyClaimEncrypted()` → frontend `decryptForTx` → `publishRevealResult()`
5. **Roulette** — `beginPull()` → frontend `decryptForTx` → `publishTriggerResult()`
6. **Repeat** until 1 player remains → `GameOver`

## Next Steps

- [ ] Build Next.js frontend with wagmi + @cofhe/sdk
- [ ] Add UI components (CardHand, RouletteWheel, TriggerAnimation)
- [ ] Implement hooks (useCofheClient, useMyHand, useChallenge, usePullTrigger)
- [ ] Deploy to production

## Resources

- [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone)
- [Plan.md](../plan.md) — Complete build plan with all FHE patterns
- [@cofhe/sdk](https://www.npmjs.com/package/@cofhe/sdk)
- [@cofhe/hardhat-plugin](https://www.npmjs.com/package/@cofhe/hardhat-plugin)

## License

MIT
