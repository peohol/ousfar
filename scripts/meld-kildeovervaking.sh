#!/usr/bin/env bash
# Sender en melding (JSON-fila i $1) til kildeovervåkingen i appen
# (/api/kildeovervaking, src/verktoy/overvaking/endepunkt.ts), med et OIDC-token
# GitHub utsteder for kjøringen. Brukes av .github/workflows/verktoy-overvaking.yml,
# som må ha `id-token: write` og ADRESSE i miljøet.
set -euo pipefail
token=$(curl -sSf -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=ousfar" | jq -r .value)
echo "::add-mask::$token"
kode=$(curl -sS -o svar.json -w '%{http_code}' --max-time 60 -X POST \
  -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  --data-binary @"$1" "$ADRESSE")
cat svar.json
echo
if [ "$kode" != "200" ]; then
  echo "::error::Appen svarte $kode; ingenting er meldt."
  exit 1
fi
