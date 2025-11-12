import 'dotenv/config';
import { JsonRpcProvider } from 'ethers';

const hash = process.argv[2];
if (!hash) {
  console.error('Usage: npm run tx -- 0xHASH');
  process.exit(1);
}

const p = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL, { name:'baseSepolia', chainId:84532 });
const rcpt = await p.getTransactionReceipt(hash);
console.log(rcpt);
