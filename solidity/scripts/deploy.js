const hre = require("hardhat");

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function main() {
  const Counter = await hre.ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  const tx = counter.deploymentTransaction();
  console.log("Deploy tx:", tx.hash);
  await tx.wait(2);
  const addr = await counter.getAddress();
  console.log("Counter address:", addr);

  for (let i=0;i<20;i++){
    const code = await hre.ethers.provider.getCode(addr);
    if (code && code !== "0x") { 
      console.log("Code length:", code.length);
      const value = await counter.count();
      console.log("Initial count:", value.toString());
      return;
    }
    await sleep(1500);
  }
  const finalCode = await hre.ethers.provider.getCode(addr);
  console.log("Final code length:", finalCode.length);
  throw new Error("No bytecode detected at address after waiting");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
