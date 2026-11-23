#!/usr/bin/env bash
# Start a throwaway local validator with darwin-arena and MagicBlock's
# session-keys program, run the base-layer tests, stop the validator.
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK=${TMPDIR:-/tmp}/darwin-arena-local
mkdir -p "$WORK"
SESSION_SO="$WORK/session-keys.so"
[ -f "$SESSION_SO" ] || solana program dump -u devnet KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5 "$SESSION_SO"
PROGRAM_ID=$(node -p 'require("./src/lib/chain/idl/darwin_arena.json").address')
solana-test-validator --reset --quiet --ledger "$WORK/ledger" \
  --bpf-program "$PROGRAM_ID" chain/target/deploy/darwin_arena.so \
  --bpf-program KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5 "$SESSION_SO" &
VALIDATOR=$!
trap 'kill $VALIDATOR 2>/dev/null; wait $VALIDATOR 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do solana -u localhost cluster-version >/dev/null 2>&1 && break; sleep 1; done
ARENA_ENV=local npx tsx ops/test/local.ts
