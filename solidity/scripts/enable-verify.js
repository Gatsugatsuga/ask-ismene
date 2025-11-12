const fs = require('fs');
const path = 'hardhat.config.cjs';
let s = fs.readFileSync(path, 'utf8');
if (!s.includes('@nomicfoundation/hardhat-verify')) {
  s = `require("@nomicfoundation/hardhat-verify");\n` + s;
}
if (!/etherscan:\s*\{/.test(s)) {
  s = s.replace(
    /module\.exports\s*=\s*\{/,
    `module.exports = {
  etherscan: {
    apiKey: { baseSepolia: process.env.BASESCAN_API_KEY },
    customChains: [{
      network: "baseSepolia",
      chainId: 84532,
      urls: {
        apiURL: "https://api-sepolia.basescan.org/api",
        browserURL: "https://sepolia.basescan.org"
      }
    }]
  },`
  );
}
fs.writeFileSync(path, s);
console.log('ok');
