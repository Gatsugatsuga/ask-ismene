import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();
  const counter = await viem.deployContract("Counter");
  console.log("Counter address:", counter.address);
  const current = await counter.read.count();
  console.log("Initial count:", current.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
