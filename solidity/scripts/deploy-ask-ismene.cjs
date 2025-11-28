const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const royaltyReceiver = deployer.address;
  const royaltyFee = 750; // 7.5%

  const AskIsmene = await hre.ethers.getContractFactory("AskIsmene");
  const contract = await AskIsmene.deploy(royaltyReceiver, royaltyFee);
  await contract.waitForDeployment();

  console.log("AskIsmene deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
