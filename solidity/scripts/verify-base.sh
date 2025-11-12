#!/usr/bin/env bash
set -euo pipefail
ADDR=$(node -e "console.log(require('./deploy-baseSepolia.json').Counter)")
HARDHAT_TELEMETRY_DISABLED=1 CI=1 npx hardhat verify --network baseSepolia "$ADDR"
