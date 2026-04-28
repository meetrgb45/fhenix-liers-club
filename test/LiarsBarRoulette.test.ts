import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect } from "chai";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("LiarsBarRoulette", () => {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [deployer, alice, bob] = await hre.ethers.getSigners();

    // Deploy with deployer as the "game" so we can call onlyGame functions directly
    const Roulette = await hre.ethers.deployContract("LiarsBarRoulette", [deployer.address]);
    const client   = await hre.cofhe.createClientWithBatteries(alice);

    return { Roulette, deployer, alice, bob, client };
  }

  it("initializes revolver — currentChamber starts at 0", async () => {
    const { Roulette, alice } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);
    expect(await Roulette.getPullCount(0n, alice.address)).to.equal(0);
  });

  it("beginPull emits RouletteStarted and stores ctHash", async () => {
    const { Roulette, alice } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);

    await expect(Roulette.beginPull(0n, alice.address))
      .to.emit(Roulette, "RouletteStarted")
      .withArgs(0n, alice.address, 0);

    const ctHash = await Roulette.pendingTriggerCtHash(0n, alice.address);
    expect(ctHash).to.not.equal(0n);
  });

  it("publishTriggerResult resolves click (result=0) and increments chamber", async () => {
    const { Roulette, alice, client } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);
    await Roulette.beginPull(0n, alice.address);

    const ctHash = await Roulette.pendingTriggerCtHash(0n, alice.address);

    // decryptForTx returns { result, signature } — withoutPermit because allowPublic was called
    const { result, signature } = await client
      .decryptForTx(ctHash)
      .withoutPermit()
      .execute();

    const tx = await Roulette.publishTriggerResult(0n, alice.address, ctHash, result, signature);
    await expect(tx).to.emit(Roulette, "TriggerPulled");

    // Chamber advances
    expect(await Roulette.getPullCount(0n, alice.address)).to.equal(1);
    // Pending hash cleared
    expect(await Roulette.pendingTriggerCtHash(0n, alice.address)).to.equal(0n);
  });

  it("emits PlayerEliminated when result=1 (bang)", async () => {
    const { Roulette, alice } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);
    await Roulette.beginPull(0n, alice.address);

    const ctHash = await Roulette.pendingTriggerCtHash(0n, alice.address);

    // Use mocks to inspect plaintext and force a bang by checking what the mock returns
    const plaintext = await hre.cofhe.mocks.getPlaintext(ctHash);
    // plaintext is 0 (click) or 1 (bang) — either is valid; just verify the event fires correctly
    const isBang = plaintext === 1n;

    // Get a valid signature from the mock client
    const { result, signature } = await (await hre.cofhe.createClientWithBatteries(alice))
      .decryptForTx(ctHash)
      .withoutPermit()
      .execute();

    const tx = Roulette.publishTriggerResult(0n, alice.address, ctHash, result, signature);
    if (isBang) {
      await expect(tx).to.emit(Roulette, "PlayerEliminated").withArgs(0n, alice.address);
    } else {
      await expect(tx).to.emit(Roulette, "TriggerPulled").withArgs(0n, alice.address, true, 0);
    }
  });

  it("reverts on wrong ctHash", async () => {
    const { Roulette, alice, client } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);
    await Roulette.beginPull(0n, alice.address);

    const ctHash = await Roulette.pendingTriggerCtHash(0n, alice.address);
    const { result, signature } = await client.decryptForTx(ctHash).withoutPermit().execute();

    const wrongHash = 999999999n;
    await expect(
      Roulette.publishTriggerResult(0n, alice.address, wrongHash, result, signature)
    ).to.be.revertedWith("Wrong ctHash");
  });

  it("reverts after all 6 chambers exhausted", async () => {
    const { Roulette, alice, client } = await loadFixture(deployFixture);
    await Roulette.initRevolver(0n, alice.address);

    // Pull all 6 chambers
    for (let i = 0; i < 6; i++) {
      await Roulette.beginPull(0n, alice.address);
      const ctHash = await Roulette.pendingTriggerCtHash(0n, alice.address);
      const { result, signature } = await client.decryptForTx(ctHash).withoutPermit().execute();
      await Roulette.publishTriggerResult(0n, alice.address, ctHash, result, signature);
    }

    await expect(Roulette.beginPull(0n, alice.address)).to.be.revertedWith("All chambers exhausted");
  });
});
