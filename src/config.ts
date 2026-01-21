/**
 * Application configuration loaded from environment variables
 * Supports both build-time (Vite) and runtime (Docker) configuration
 */

// Extend window interface for runtime config
declare global {
    interface Window {
        _env_?: {
            OAUTH2_AUTHORITY?: string;
            OAUTH2_CLIENT_ID?: string;
            OAUTH2_REDIRECT_URI?: string;
            OAUTH2_SCOPES?: string;
            JMAP_ENDPOINT?: string;
            JMAP_SESSION_ENDPOINT?: string;
        };
    }
}

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

// Get environment variable from runtime config (Docker) or build-time config (Vite)
const getEnv = (
    runtimeKey: keyof NonNullable<Window['_env_']>,
    viteKey: string
): string | undefined => {
    return window._env_?.[runtimeKey] || import.meta.env[viteKey];
};

// Parse scopes from space-separated string
const parseScopes = (scopes: string | undefined): string[] => {
    return scopes?.split(' ').filter(Boolean) || [];
};

export const config: AppConfig = {
    oauth: {
        authority: getEnv('OAUTH2_AUTHORITY', 'VITE_OAUTH_AUTHORITY') || '',
        clientId: getEnv('OAUTH2_CLIENT_ID', 'VITE_OAUTH_CLIENT_ID') || '',
        redirectUri:
            getEnv('OAUTH2_REDIRECT_URI', 'VITE_OAUTH_REDIRECT_URI') ||
            `${window.location.origin}/auth/callback`,
        scopes: parseScopes(getEnv('OAUTH2_SCOPES', 'VITE_OAUTH_SCOPES')),
    },
    jmap: {
        endpoint: getEnv('JMAP_ENDPOINT', 'VITE_JMAP_ENDPOINT') || '',
        sessionEndpoint: getEnv('JMAP_SESSION_ENDPOINT', 'VITE_JMAP_SESSION_ENDPOINT') || '',
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
