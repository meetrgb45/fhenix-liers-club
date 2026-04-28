import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeploying to ${network} as ${deployer.address}`);

  // Deploy Deck and Roulette with ZeroAddress — game address set after
  const Deck = await hre.ethers.deployContract("LiarsBarDeck", [hre.ethers.ZeroAddress]);
  await Deck.waitForDeployment();
  console.log("LiarsBarDeck:     ", await Deck.getAddress());

  const Roulette = await hre.ethers.deployContract("LiarsBarRoulette", [hre.ethers.ZeroAddress]);
  await Roulette.waitForDeployment();
  console.log("LiarsBarRoulette: ", await Roulette.getAddress());

  const Game = await hre.ethers.deployContract("LiarsBarGame", [
    await Deck.getAddress(),
    await Roulette.getAddress(),
  ]);
  await Game.waitForDeployment();
  console.log("LiarsBarGame:     ", await Game.getAddress());

  // Link game contract into Deck and Roulette
  await (await Deck.setGameContract(await Game.getAddress())).wait();
  await (await Roulette.setGameContract(await Game.getAddress())).wait();
  console.log("\n✅ All contracts deployed and linked.");

  // Save deployment addresses
  const deployment = {
    LiarsBarGame:     await Game.getAddress(),
    LiarsBarDeck:     await Deck.getAddress(),
    LiarsBarRoulette: await Roulette.getAddress(),
    network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network}.json`), JSON.stringify(deployment, null, 2));
  console.log(`\nSaved to deployments/${network}.json`);
  console.log("\nNext steps:");
  console.log(`  NEXT_PUBLIC_GAME_ADDRESS=${deployment.LiarsBarGame}`);
  console.log(`  NEXT_PUBLIC_DECK_ADDRESS=${deployment.LiarsBarDeck}`);
  console.log(`  NEXT_PUBLIC_ROULETTE_ADDRESS=${deployment.LiarsBarRoulette}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
