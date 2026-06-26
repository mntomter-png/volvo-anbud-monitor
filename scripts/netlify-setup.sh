#!/usr/bin/env bash
# Oppretter Netlify-site og setter miljøvariabler fra .env.local.
# Krever: NETLIFY_AUTH_TOKEN (Personal Access Token fra Netlify)
#
# Bruk:
#   export NETLIFY_AUTH_TOKEN=nfp_...
#   ./scripts/netlify-setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${NETLIFY_AUTH_TOKEN:-}" ]]; then
  echo "Mangler NETLIFY_AUTH_TOKEN."
  echo "Hent token: https://app.netlify.com/user/applications#personal-access-tokens"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Mangler .env.local"
  exit 1
fi

API="https://api.netlify.com/api/v1"
AUTH="Authorization: Bearer $NETLIFY_AUTH_TOKEN"

echo "==> Oppretter site (hvis den ikke finnes)..."
SITE_JSON=$(curl -sS -X POST "$API/sites" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"name":"volvo-anbud-monitor","repo":{"provider":"github","repo":"mntomter-png/volvo-anbud-monitor","branch":"main"}}' 2>/dev/null || true)

SITE_ID=$(echo "$SITE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")

if [[ -z "$SITE_ID" ]]; then
  echo "==> Site finnes kanskje allerede – henter liste..."
  SITE_ID=$(curl -sS "$API/sites" -H "$AUTH" | python3 -c "
import sys,json
sites=json.load(sys.stdin)
for s in sites:
    if s.get('name')=='volvo-anbud-monitor' or 'volvo-anbud-monitor' in (s.get('url') or ''):
        print(s['id']); break
")
fi

if [[ -z "$SITE_ID" ]]; then
  echo "Kunne ikke opprette/finne site. Sjekk token og prøv igjen."
  exit 1
fi

echo "Site ID: $SITE_ID"

echo "==> Setter miljøvariabler..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  # Hopp over NEXT_PUBLIC under build – settes i GitHub Actions også
  curl -sS -X POST "$API/sites/$SITE_ID/env" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'key':'''$key''','values':[{'value':'''$val''','context':'all'}],'is_secret':'''$key''' in ['SUPABASE_SERVICE_ROLE_KEY','DOFFIN_API_KEY','RESEND_API_KEY','CRON_SECRET']}))")" \
    > /dev/null
  echo "  ✓ $key"
done < .env.local

echo ""
echo "==> Ferdig!"
echo "NETLIFY_SITE_ID=$SITE_ID"
echo ""
echo "Legg til i GitHub → Settings → Secrets → Actions:"
echo "  NETLIFY_AUTH_TOKEN"
echo "  NETLIFY_SITE_ID=$SITE_ID"
echo "  NEXT_PUBLIC_SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
