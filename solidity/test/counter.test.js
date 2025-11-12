import { expect } from "chai";
import hre from "hardhat";           // CJS default
const { ethers } = hre;

describe("Counter (smoke)", function () {
  it("environment loads", async function () {
    const [deployer] = await ethers.getSigners();
    expect(deployer.address).to.be.a("string");
  });
});
