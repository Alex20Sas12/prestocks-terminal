#!/usr/bin/env bash
# deploy.sh — PreStocks Terminal → Vercel (project: prestocks-terminal).
# Creds live in %APPDATA%/xdg.data (same as storefront). No proxy needed for Vercel.
set -e
cd "$(dirname "$0")"
source ~/.bashrc 2>/dev/null
export XDG_DATA_HOME="${APPDATA%/}/xdg.data"
npx vercel deploy --prod "$@"
