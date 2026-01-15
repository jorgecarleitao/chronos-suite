/**
 * Application configuration loaded from environment variables at build time
 */

interface AppConfig {
  oauth: {
    authority: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };
  jmap: {
    endpoint: string;
    sessionEndpoint: string;
  };
}

// Parse scopes from space-separated string
const parseScopes = (scopes: string | undefined): string[] => {
  return scopes?.split(' ').filter(Boolean) || [];
};

export const config: AppConfig = {
  oauth: {
    authority: import.meta.env.VITE_OAUTH_AUTHORITY || '',
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    scopes: parseScopes(import.meta.env.VITE_OAUTH_SCOPES),
  },
  jmap: {
    endpoint: import.meta.env.VITE_JMAP_ENDPOINT || '',
    sessionEndpoint: import.meta.env.VITE_JMAP_SESSION_ENDPOINT || '',
  },
};

// Validate required config at startup
export const validateConfig = (): void => {
  const errors: string[] = [];

  if (!config.oauth.authority) errors.push('VITE_OAUTH_AUTHORITY is required');
  if (!config.oauth.clientId) errors.push('VITE_OAUTH_CLIENT_ID is required');
  if (!config.oauth.redirectUri) errors.push('VITE_OAUTH_REDIRECT_URI is required');
  if (config.oauth.scopes.length === 0) errors.push('VITE_OAUTH_SCOPES is required');
  if (!config.jmap.endpoint) errors.push('VITE_JMAP_ENDPOINT is required');
  if (!config.jmap.sessionEndpoint) errors.push('VITE_JMAP_SESSION_ENDPOINT is required');

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    throw new Error(`Invalid configuration:\n${errors.join('\n')}`);
  }
};
