#!/usr/bin/env bash
set -euo pipefail
node scripts/whoami.mjs || true
node -r dotenv/config -e "const {JsonRpcProvider,Contract}=require('ethers');(async()=>{const p=new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL,{name:'baseSepolia',chainId:84532});const a=require('./deploy-baseSepolia.json').Counter;const abi=[{inputs:[],name:'count',outputs:[{type:'uint256'}],stateMutability:'view',type:'function'}];const c=new Contract(a,abi,p);console.log('count =',(await c.count({blockTag:'latest'})).toString())})()"
node -r dotenv/config -e "const {JsonRpcProvider}=require('ethers');(async()=>{const p=new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL,{name:'baseSepolia',chainId:84532});const a=require('./deploy-baseSepolia.json').Counter;console.log('slot0 =',await p.send('eth_getStorageAt',[a,'0x0','latest']))})()"
node scripts/sim.mjs || true
node scripts/bump-retry.mjs
node -r dotenv/config -e "const {JsonRpcProvider,Contract}=require('ethers');(async()=>{const p=new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL,{name:'baseSepolia',chainId:84532});const a=require('./deploy-baseSepolia.json').Counter;const abi=[{inputs:[],name:'count',outputs:[{type:'uint256'}],stateMutability:'view',type:'function'}];const c=new Contract(a,abi,p);console.log('count =',(await c.count({blockTag:'latest'})).toString())})()"
