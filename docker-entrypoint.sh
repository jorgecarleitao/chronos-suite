#!/bin/sh
set -e

# Generate env-config.js with runtime environment variables mapped to VITE_ format
cat > /usr/share/nginx/html/env-config.js << EOF
window._env_ = {
  VITE_OAUTH_AUTHORITY: "${OAUTH_AUTHORITY:-}",
  VITE_OAUTH_CLIENT_ID: "${OAUTH_CLIENT_ID:-}",
  VITE_BASE_URL: "${BASE_URL:-}",
  VITE_OAUTH_SCOPES: "${OAUTH_SCOPES:-}",
  VITE_JMAP_SESSION_ENDPOINT: "${JMAP_SESSION_ENDPOINT:-}"
};
EOF

exec "$@"
