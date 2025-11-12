import hre from "hardhat";

async function main() {
  const Counter = await hre.ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.waitForDeployment();
  console.log("Counter address:", await counter.getAddress());
  const value = await counter.count();
  console.log("Initial count:", value.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
