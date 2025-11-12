require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: process.env.ALCHEMY_BASE_SEPOLIA_URL || process.env.RPC_BASE_SEPOLIA || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      url: process.env.ALCHEMY_BASE_URL || process.env.RPC_BASE || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.ETHERSCAN_KEY_BASE || "",
      base: process.env.ETHERSCAN_KEY_BASE || "",
    },
  },
};
