import 'dotenv/config';
import { JsonRpcProvider, Wallet, formatEther } from 'ethers';

const p = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL, { name:'baseSepolia', chainId:84532 });
const w = new Wallet(process.env.PRIVATE_KEY, p);
const bal = await p.getBalance(w.address);
console.log('signer:', w.address, 'balance:', formatEther(bal), 'ETH');
