/**
 * Identity service for fetching and caching user identities
 */

import { getAuthenticatedClient } from '../utils/authHandling';

interface Identity {
    id: string;
    name: string;
    email: string;
}

// Cache identities by accountId
const identitiesCache = new Map<string, Identity[]>();

/**
 * Get identities for an account (cached)
 */
export async function getIdentities(accountId: string): Promise<Identity[]> {
    // Return cached identities if available
    if (identitiesCache.has(accountId)) {
        return identitiesCache.get(accountId)!;
    }

    // Fetch and cache
    const client = getAuthenticatedClient();
    const [response] = await client.request(['Identity/get', { accountId }]);
    const identities = response.list as Identity[];

    identitiesCache.set(accountId, identities);
    return identities;
}

/**
 * Get the default identity for an account
 */
export async function getDefaultIdentity(accountId: string): Promise<Identity> {
    const identities = await getIdentities(accountId);

    if (!identities || identities.length === 0) {
        throw new Error('No identities available for this account');
    }

    return identities[0];
}

/**
 * Clear the identity cache (useful after logout or account changes)
 */
export function clearIdentityCache(accountId?: string): void {
    if (accountId) {
        identitiesCache.delete(accountId);
    } else {
        identitiesCache.clear();
    }
}
