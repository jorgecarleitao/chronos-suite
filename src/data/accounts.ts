import { jmapClient } from './jmapClient';
import { getAuthenticatedClient } from '../utils/authHandling';

export interface Account {
    id: string;
    name: string;
    email: string;
    isPersonal: boolean;
}

/**
 * Get the primary account ID
 */
export async function getPrimaryAccountId(): Promise<string> {
    getAuthenticatedClient(); // Validates client is initialized
    return await jmapClient.getPrimaryAccountId();
}

/**
 * Get account information
 * Note: Currently jmap-jam doesn't expose full account details via public API,
 * so this returns minimal information based on the account ID
 */
export async function getAccount(accountId: string): Promise<Account> {
    getAuthenticatedClient(); // Validates client is initialized

    // For now, return basic account info
    // In the future, this could be enhanced if the API exposes more account details
    return {
        id: accountId,
        name: accountId,
        email: accountId,
        isPersonal: true,
    };
}

/**
 * Get all accounts accessible to the user (including shared accounts)
 */
export async function getAllAccounts(): Promise<Account[]> {
    const client = getAuthenticatedClient();
    const session = await client.session;

    const primaryAccountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];

    return Object.entries(session.accounts).map(([accountId, accountInfo]) => ({
        id: accountId,
        name: accountInfo.name,
        email: accountId,
        isPersonal: accountId === primaryAccountId,
    }));
}
