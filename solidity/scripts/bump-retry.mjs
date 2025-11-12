import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import fs from 'fs';

const addr = JSON.parse(fs.readFileSync('deploy-baseSepolia.json','utf8')).Counter;
const abi = [
  { inputs:[], name:'count', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'inc',   outputs:[],                stateMutability:'nonpayable', type:'function' }
];

const p = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL,{name:'baseSepolia',chainId:84532});
const w = new Wallet(process.env.PRIVATE_KEY,p);
const c = new Contract(addr,abi,w);

const before = await c.count();
const tx = await c.inc();
const rcpt = await tx.wait(); // mined

let after = before;
for (let i=0;i<8;i++){
  try {
    after = await c.count({ blockTag: 'latest' });
    if (after > before) break;
  } catch {}
  await new Promise(r=>setTimeout(r, 1500));
}

console.log(JSON.stringify({
  addr,
  tx: tx.hash,
  status: rcpt.status,
  gasUsed: rcpt.gasUsed.toString(),
  before: before.toString(),
  after: after.toString()
}, null, 2));
