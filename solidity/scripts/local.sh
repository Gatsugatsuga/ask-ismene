#!/usr/bin/env bash
set -euo pipefail
STARTED_NODE=0
if ! lsof -t -i :8545 >/dev/null 2>&1; then
  npx hardhat node > /tmp/hh-node.log 2>&1 & echo $! > /tmp/hh-node.pid
  STARTED_NODE=1
  sleep 2
fi
HARDHAT_TELEMETRY_DISABLED=1 CI=1 npx hardhat run scripts/deploy.js --network localhost
HARDHAT_TELEMETRY_DISABLED=1 CI=1 npx hardhat run scripts/interact.js --network localhost
if [ "$STARTED_NODE" = "1" ]; then
  kill $(cat /tmp/hh-node.pid) 2>/dev/null || true
  rm -f /tmp/hh-node.pid
fi
