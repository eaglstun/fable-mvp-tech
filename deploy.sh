#!/usr/bin/env bash
# Deploy fable-mvp to the pinecone droplet (https://fable-mvp.gg).
# Builds the production bundle, then rsyncs dist/ to the nginx webroot as eric.
# nginx vhost + Let's Encrypt cert are already set up on the droplet; this only
# ships static files, so no sudo / nginx reload is needed.

set -euo pipefail

HOST="eric@68.183.63.41"
WEBROOT="/var/www/fable-mvp.gg/"

cd "$(dirname "$0")"

echo "==> Building..."
yarn build

echo "==> Deploying dist/ to ${HOST}:${WEBROOT}"
rsync -avz --delete dist/ "${HOST}:${WEBROOT}"

echo "==> Done. Live at https://fable-mvp.gg"
