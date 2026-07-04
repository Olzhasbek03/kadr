#!/usr/bin/env bash
set -euo pipefail
SB=http://127.0.0.1:54321
ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
SERVICE='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

# create both users (idempotent — ignore "already registered")
curl -s -X POST "$SB/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" --data '{"email":"host@kadr.test","password":"test-password-123","email_confirm":true}' -o /dev/null || true
curl -s -X POST "$SB/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" --data '{"email":"other@kadr.test","password":"test-password-123","email_confirm":true}' -o /dev/null || true
UID_HOST=$(docker exec supabase_db_kadr psql -U postgres -tAc "select id from auth.users where email='host@kadr.test';" | tr -d '[:space:]')

get_token () {
  curl -s -X POST "$SB/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" --data "{\"email\":\"$1\",\"password\":\"test-password-123\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])"
}
HOST_JWT=$(get_token host@kadr.test)
OTHER_JWT=$(get_token other@kadr.test)
echo "host_jwt_len=${#HOST_JWT} other_jwt_len=${#OTHER_JWT} uid=$UID_HOST"

HOST_JWT="$HOST_JWT" OTHER_JWT="$OTHER_JWT" HOST_UID="$UID_HOST" SERVICE_KEY="$SERVICE" node scripts/e2e.mjs
