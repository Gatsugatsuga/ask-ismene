import 'dotenv/config';
import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

const addr = JSON.parse(fs.readFileSync('deploy-baseSepolia.json','utf8')).Counter;
const abi = [
  { inputs:[], name:'count', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' }
];

const p = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL, { name:'baseSepolia', chainId:84532 });
const c = new Contract(addr, abi, p);

const v = await c.count();
console.log('count =', v.toString());
