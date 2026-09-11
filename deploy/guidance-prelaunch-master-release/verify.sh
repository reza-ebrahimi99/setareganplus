#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
npm run test:guidance-prelaunch
echo "VERIFY PASS"
