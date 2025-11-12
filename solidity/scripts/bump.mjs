import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import fs from 'fs';

const addr = JSON.parse(fs.readFileSync('deploy-baseSepolia.json','utf8')).Counter;
const abi = [
  { inputs:[], name:'count', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'inc',   outputs:[],                stateMutability:'nonpayable', type:'function' }
];

const p = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL, { name:'baseSepolia', chainId:84532 });
const w = new Wallet(process.env.PRIVATE_KEY, p);
const c = new Contract(addr, abi, w);

const before = await c.count();
const tx = await c.inc();
console.log('tx hash:', tx.hash);
await tx.wait();
const after = await c.count();
console.log('before =', before.toString());
console.log('after  =', after.toString());
