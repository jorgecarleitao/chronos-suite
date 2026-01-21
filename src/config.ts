/**
 * Application configuration loaded from environment variables
 * All configuration uses VITE_ prefixed variables
 * Docker runtime can override via window._env_
 */

declare global {
    interface Window {
        _env_?: Record<string, string>;
    }
}

interface AppConfig {
    oauth: {
        authority: string;
        clientId: string;
        redirectUri: string;
        scopes: string;
    };
    jmap: {
        endpoint: string;
        sessionEndpoint: string;
    };
}

// Get env variable from window._env_ (Docker runtime) or import.meta.env (Vite build-time)
const getEnv = (key: string): string | undefined => {
    return window._env_?.[key] || import.meta.env[key];
};

export const config: AppConfig = {
    oauth: {
        authority: getEnv('VITE_OAUTH_AUTHORITY') || '',
        clientId: getEnv('VITE_OAUTH_CLIENT_ID') || '',
        redirectUri: `${getEnv('VITE_BASE_URL') || window.location.origin}/auth/callback`,
        scopes: getEnv('VITE_OAUTH_SCOPES') || '',
    },
    jmap: {
        endpoint: getEnv('VITE_JMAP_ENDPOINT') || '',
        sessionEndpoint: getEnv('VITE_JMAP_SESSION_ENDPOINT') || '',
    },
};

// Validate required config at startup
export const validateConfig = (): void => {
    const errors: string[] = [];

    if (!config.oauth.authority) errors.push('OAUTH_AUTHORITY is required');
    if (!config.oauth.clientId) errors.push('OAUTH_CLIENT_ID is required');
    if (!config.oauth.redirectUri) errors.push('BASE_URL is required');
    if (config.oauth.scopes.length === 0) errors.push('OAUTH_SCOPES is required');
    if (!config.jmap.endpoint) errors.push('JMAP_ENDPOINT is required');
    if (!config.jmap.sessionEndpoint) errors.push('JMAP_SESSION_ENDPOINT is required');

    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        throw new Error(`Invalid configuration:\n${errors.join('\n')}`);
    }
};

// Validate on module load
validateConfig();
