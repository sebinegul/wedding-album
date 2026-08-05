#!/usr/bin/env bash
# Wire S3-compatible object storage (Cloudflare R2) into Vercel and redeploy.
# Works for any S3-compatible provider; for Backblaze B2 change the endpoint
# to https://s3.<region>.backblazeb2.com and pass your region as ACCOUNT_ID.
#
# Usage (from the repo root):
#   bash scripts/vercel-set-s3.sh <account_id> <access_key_id> <secret_access_key> [bucket_name]
#
#   account_id     R2: your Cloudflare Account ID (dashboard.cloudflare.com -> R2 -> account id)
#   access_key_id  R2: Access Key ID from "Manage R2 API Tokens"
#   secret         R2: Secret Access Key
#   bucket_name    default: wedding-album
set -euo pipefail

ACCOUNT_ID="${1:?usage: vercel-set-s3.sh <account_id> <access_key_id> <secret_access_key> [bucket_name]}"
ACCESS_KEY_ID="${2:?missing access key id}"
SECRET="${3:?missing secret access key}"
BUCKET="${4:-wedding-album}"
ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"

set_env() { # name value env...
  local name="$1" value="$2"; shift 2
  for env in "$@"; do
    vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$env" --yes >/dev/null
    echo "  set $name ($env)"
  done
}

echo "Setting Vercel env vars..."
set_env STORAGE_DRIVER s3 production preview
set_env S3_BUCKET "$BUCKET" production preview
set_env S3_ENDPOINT "$ENDPOINT" production preview
set_env S3_ACCESS_KEY_ID "$ACCESS_KEY_ID" production preview
set_env S3_SECRET_ACCESS_KEY "$SECRET" production preview

echo "Redeploying production..."
vercel --prod --yes
echo "Done. Verify with a test upload."
