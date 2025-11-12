import hre from "hardhat";

async function main() {
  const counter = await hre.viem.deployContract("Counter");
  console.log("Counter address:", counter.address);
  const current = await counter.read.count();
  console.log("Initial count:", current.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
