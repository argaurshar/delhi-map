#!/usr/bin/env bash
set -euo pipefail
cd /workspace/delhi-map
npm ci --no-audit --no-fund
if [ ! -x .venv/bin/python ]; then
  python -m venv .venv
fi
.venv/bin/python -m pip install --cache-dir /workspace/.pip-cache -r scripts/requirements.txt
npm test
npm run build
