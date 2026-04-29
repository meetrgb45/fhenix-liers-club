# 🃏🔫 Liar's Bar on Fhenix

A fully on-chain, privacy-preserving Liar's Bar game using Fhenix CoFHE on Arbitrum Sepolia.
Players hold **FHE-encrypted card hands**. The **bullet position is encrypted** — nobody knows where it is until the trigger is pulled.

Demo Video: https://youtu.be/lrY2mOBJp-w

## Live Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| LiarsBarGame | `0xAf0B662FFaff462e2A7e0949Ab98B24eA9b45cfF` |
| LiarsBarDeck | `0xf59dCeC66B8FD8FFc7C6CB6B74c8C01E78298D96` |
| LiarsBarRoulette | `0xD5Ab5324c87e8C3ac48a438615B1C9d1B4C3E0A4` |

## How to Play

1. Connect wallet (MetaMask on Arbitrum Sepolia)
2. **Create Game** → share the URL with another player
3. Other player opens the URL → **Join Game** with the game ID
4. Host clicks **Start Game** (requires ≥2 players)
5. Cards are dealt — only you can see your own hand (FHE-encrypted)
6. **Make Claim** → select rank + count → submit
7. Next player can **Call Liar!** to challenge
8. Challenge triggers on-chain FHE decryption → loser revealed
9. Loser clicks **Pull Trigger** → encrypted roulette resolves
10. CLICK = survive, BANG = eliminated 💀
11. Last player standing wins 🏆

## Project Structure

```
liars-bar-fhenix/
├── contracts/
│   ├── LiarsBarGame.sol       # State machine (lobby → deal → claim → challenge → roulette)
│   ├── LiarsBarDeck.sol       # FHE card dealing (euint64, per-player randomness)
│   ├── LiarsBarRoulette.sol   # Encrypted bullet position (euint8, beginPull/publishTriggerResult)
│   └── interfaces/ILiarsBarGame.sol
├── scripts/deploy.ts          # Deploy + link all 3 contracts
├── test/                      # Hardhat tests (compile-verified; FHE.random not in mocks)
└── frontend/
    ├── app/
    │   ├── page.tsx           # Lobby (connect, create, join)
    │   └── game/[id]/page.tsx # Game room (all actions, real-time events, auto-roulette)
    ├── components/            # CardHand, RouletteWheel, TriggerAnimation, PlayerSeat, ClaimModal, GameLog
    ├── hooks/                 # useCofheClient, useMyHand, useChallenge, usePullTrigger
    └── lib/                   # cofhe.ts, contracts.ts, cardHelpers.ts
```

## Local Development

### Contracts

```bash
cd liars-bar-fhenix
npm install
npm run compile
npm test          # Note: FHE.random* not supported in mocks — tests verify compilation only
```

### Deploy

```bash
# Add PRIVATE_KEY=0x... to .env
npm run deploy:sepolia   # eth-sepolia
# or
npx hardhat run scripts/deploy.ts --network arb-sepolia
```

### Frontend

```bash
cd frontend
npm install
# Create .env.local:
# NEXT_PUBLIC_GAME_ADDRESS=0x...
# NEXT_PUBLIC_DECK_ADDRESS=0x...
# NEXT_PUBLIC_ROULETTE_ADDRESS=0x...
# NEXT_PUBLIC_RPC_URL=https://arbitrum-sepolia-rpc.publicnode.com
# NEXT_PUBLIC_DEPLOY_BLOCK=<deployment block number>
npm run dev
```

## Key FHE Patterns
- **Cards**: `euint64` (0–51), dealt with `FHE.randomEuint64()` + per-player address salt
- **Bullet**: `euint8` (0–5), `FHE.randomEuint8() % 6`, stays encrypted until trigger pulled
- **Card decrypt**: `decryptForView(ctHash, FheTypes.Uint64).withPermit()` — only card owner can see
- **Challenge reveal**: `FHE.allowPublic` → `decryptForTx(ctHash).withoutPermit()` → `publishRevealResult`
- **Roulette**: `FHE.eq(bulletPos, chamber)` → `FHE.allowPublic` → `decryptForTx` → `publishTriggerResult`
- **`decryptForTx` returns** `{ decryptedValue, signature }` (SDK v0.5.x)
- **All ctHashes** stored/passed as `uint256` (cast from `euint*.unwrap()` which returns `bytes32`)

## Architecture Notes

- `verifyClaimEncrypted` is called **inside** `challenge()` on-chain (has `onlyGame` modifier)
- `pendingRoulettePlayer` tracks who is in roulette so any player can submit the trigger result
- Gas overrides use `estimateFeesPerGas() * 2n` to handle Arbitrum Sepolia fee fluctuations
- Frontend uses `useWatchContractEvent` for real-time updates + `getLogs` from deploy block for history
- CoFHE threshold network: `https://testnet-cofhe-tn.fhenix.zone` (Arbitrum Sepolia supported)

## Resources

- [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone)
- [@cofhe/sdk](https://www.npmjs.com/package/@cofhe/sdk)
- [Arbitrum Sepolia Faucet](https://faucet.triangleplatform.com/arbitrum/sepolia)
