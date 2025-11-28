const hre = require("hardhat");

async function main() {
  // USDC address on Base mainnet
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  // Your treasury wallet (your Farcaster-linked wallet is fine)
  const TREASURY = "0x9D3329594C0C035821D92F0c2f40C244Ef5f3D72";

  console.log("Deploying AskIsmeneBooth...");

  const Booth = await hre.ethers.getContractFactory("AskIsmeneBooth");
  const booth = await Booth.deploy(USDC_BASE, TREASURY);

  const tx = booth.deploymentTransaction();
  console.log("Deployment tx:", tx.hash);

  await tx.wait(2);

  const address = await booth.getAddress();
  console.log("AskIsmeneBooth deployed at:", address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

