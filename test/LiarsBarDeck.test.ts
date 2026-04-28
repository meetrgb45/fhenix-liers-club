import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { FheTypes } from "@cofhe/sdk";
import { expect } from "chai";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("LiarsBarDeck", () => {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [deployer, alice, bob] = await hre.ethers.getSigners();

    // Deploy with deployer as the "game" so we can call onlyGame functions directly
    const Deck       = await hre.ethers.deployContract("LiarsBarDeck", [deployer.address]);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);
    const bobClient   = await hre.cofhe.createClientWithBatteries(bob);

    return { Deck, deployer, alice, bob, aliceClient, bobClient };
  }

  it("dealHand stores 3 encrypted card handles", async () => {
    const { Deck, alice } = await loadFixture(deployFixture);
    await Deck.dealHand(0n, alice.address);

    const hashes = await Deck.getHandHashes(0n, alice.address);
    expect(hashes.length).to.equal(3);
    for (const h of hashes) {
      expect(h).to.not.equal(0n);
    }
  });

  it("owner can decrypt their own cards (values 0–51)", async () => {
    const { Deck, alice, aliceClient } = await loadFixture(deployFixture);
    await Deck.dealHand(0n, alice.address);

    const hashes = await Deck.getHandHashes(0n, alice.address);
    for (const h of hashes) {
      // decryptForView with permit — cards are euint64
      const card = await aliceClient
        .decryptForView(h, FheTypes.Uint64)
        .withPermit()
        .execute();
      expect(Number(card)).to.be.gte(0).and.lte(51);
    }
  });

  it("verifyClaimEncrypted returns encrypted match count (0–3)", async () => {
    const { Deck, alice, aliceClient } = await loadFixture(deployFixture);
    await Deck.dealHand(0n, alice.address);

    // Get alice's actual cards to know the correct rank to claim
    const hashes = await Deck.getHandHashes(0n, alice.address);
    const cards: number[] = [];
    for (const h of hashes) {
      const v = await aliceClient.decryptForView(h, FheTypes.Uint64).withPermit().execute();
      cards.push(Number(v));
    }

    // Claim rank 0 (Two) — count how many alice actually has
    const claimedRank = 0n;
    const ctHash = await Deck.verifyClaimEncrypted(0n, alice.address, claimedRank);

    // allowPublic was called — use withoutPermit
    const { result } = await aliceClient
      .decryptForTx(ctHash)
      .withoutPermit()
      .execute();

    // Verify against local count
    const expected = cards.filter(c => c % 13 === Number(claimedRank)).length;
    expect(Number(result)).to.equal(expected);
  });

  it("mocks.getPlaintext can inspect card values directly", async () => {
    const { Deck, alice } = await loadFixture(deployFixture);
    await Deck.dealHand(0n, alice.address);

    const hashes = await Deck.getHandHashes(0n, alice.address);
    for (const h of hashes) {
      const plaintext = await hre.cofhe.mocks.getPlaintext(h);
      expect(Number(plaintext)).to.be.gte(0).and.lte(51);
    }
  });
});
