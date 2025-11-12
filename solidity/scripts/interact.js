const fs = require("fs");
const hre = require("hardhat");
async function main() {
  const addr = JSON.parse(fs.readFileSync("deploy-local.json","utf8")).Counter;
  const c = await hre.ethers.getContractAt("Counter", addr);
  const tx = await c.inc();
  await tx.wait();
  console.log("After inc:", (await c.count()).toString());
}
main().catch((e)=>{console.error(e);process.exit(1);});
