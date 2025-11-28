// scripts/deployAskIsmeneBooth.js
import hre from "hardhat";

async function main() {
  // 1. Addresses for constructor
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  const TREASURY_ADDRESS = "0x4c18cC72fEaDd269402cB7C445DEE1224E0384Ef"; // your Safe or wallet

  console.log("Deploying AskIsmeneBooth...");
  console.log("USDC:", USDC_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);

  const Booth = await hre.ethers.getContractFactory("AskIsmeneBooth");
  const booth = await Booth.deploy(USDC_ADDRESS, TREASURY_ADDRESS);

  // Hardhat v2 + ESM style: waitForDeployment + getAddress
  await booth.waitForDeployment();

  console.log("AskIsmeneBooth deployed to:", await booth.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

