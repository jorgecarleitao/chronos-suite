#!/bin/sh
set -e

# Generate env-config.js with runtime environment variables
cat > /app/dist/env-config.js << EOF
window._env_ = {
  OAUTH2_AUTHORITY: "${OAUTH2_AUTHORITY:-}",
  OAUTH2_CLIENT_ID: "${OAUTH2_CLIENT_ID:-}",
  OAUTH2_REDIRECT_URI: "${OAUTH2_REDIRECT_URI:-}",
  OAUTH2_SCOPES: "${OAUTH2_SCOPES:-}",
  JMAP_ENDPOINT: "${JMAP_ENDPOINT:-}",
  JMAP_SESSION_ENDPOINT: "${JMAP_SESSION_ENDPOINT:-}"
};
EOF

exec "$@"
