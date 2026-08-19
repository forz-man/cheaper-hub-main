#!/usr/bin/env bash
set -euo pipefail

# Reconcile dependencies after isolated task changes without prompting.
export CI=1
npm install --no-audit --no-fund --prefer-offline

# Catch integration/schema regressions before workflow reconciliation.
npm run test:integrations
npm run build
