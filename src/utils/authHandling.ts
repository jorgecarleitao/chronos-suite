import { jmapClient } from '../data/jmapClient';
import { oauthService } from '../data/authService';

/**
 * Get authenticated JMAP client
 * Throws error if client is not initialized
 */
export function getAuthenticatedClient() {
    if (!jmapClient.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }
    return jmapClient.getClient();
}

/**
 * Handle authentication errors and attempt token refresh
 */
export async function handleAuthError(error: any): Promise<never> {
    if (
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized') ||
        error.message?.includes('authentication')
    ) {
        const refreshToken = oauthService.getRefreshToken();
        if (refreshToken) {
            try {
                await oauthService.refreshAccessToken(refreshToken);
                const newAccessToken = oauthService.getAccessToken();
                if (newAccessToken) {
                    await jmapClient.initialize(newAccessToken);
                    throw new Error('TOKEN_REFRESHED');
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
            }
        }

        oauthService.logout();
        jmapClient.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    throw error;
}

/**
 * Wrap async functions to handle auth errors with automatic retry
 */
export async function withAuthHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        await handleAuthError(error);
        if (error instanceof Error && error.message === 'TOKEN_REFRESHED') {
            return await fn();
        }
        throw error;
    }
}
