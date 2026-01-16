import { jmapService } from './jmapClient';
import { getAllAccounts, getPrimaryAccountId } from './accounts';
import { oauthService } from './authService';

/**
 * Handle authentication errors
 */
async function handleAuthError(error: any): Promise<never> {
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
                    await jmapService.initialize(newAccessToken);
                    throw new Error('TOKEN_REFRESHED');
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
            }
        }

        oauthService.logout();
        jmapService.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    throw error;
}

async function withAuthHandling<T>(fn: () => Promise<T>): Promise<T> {
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

// JMAP mailbox structure
interface JmapMailbox {
    id: string;
    name: string;
    parentId?: string | null;
    role?: string | null;
    sortOrder?: number;
    isSubscribed?: boolean;
}

// What the rest of the app uses
export interface Mailbox {
    id: string; // JMAP mailbox ID
    name: string;
    display_name: string;
    role?: string;
    is_selectable: boolean;
    children: Mailbox[];
    accountId?: string;
    accountName?: string;
    parentId?: string | null;
}

interface MailboxesResponse {
    mailboxes: Mailbox[];
}

// Convert JMAP mailbox to our format
function mapJmapToMailbox(
    jmapMailbox: JmapMailbox,
    allMailboxes: JmapMailbox[],
    accountId?: string,
    accountName?: string
): Mailbox {
    // Get children mailboxes
    const children = allMailboxes
        .filter((m) => m.parentId === jmapMailbox.id)
        .map((child) => mapJmapToMailbox(child, allMailboxes, accountId, accountName));

    const mailbox: Mailbox = {
        id: jmapMailbox.id,
        name: jmapMailbox.name,
        display_name: jmapMailbox.name,
        role: jmapMailbox.role || undefined,
        is_selectable: true, // JMAP mailboxes are generally selectable
        children,
        parentId: jmapMailbox.parentId,
    };

    if (accountId) mailbox.accountId = accountId;
    if (accountName) mailbox.accountName = accountName;

    return mailbox;
}

// Build a hierarchical tree from flat list
function buildMailboxTree(mailboxes: readonly JmapMailbox[]): Mailbox[] {
    // Get root mailboxes (no parent)
    const rootMailboxes = mailboxes.filter((m) => !m.parentId);
    return rootMailboxes.map((m) => mapJmapToMailbox(m, [...mailboxes]));
}

export async function fetchMailboxes(accountId: string): Promise<MailboxesResponse> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const jmapMailboxes = await jmapService.getMailboxes(accountId);
        const mailboxTree = buildMailboxTree(jmapMailboxes);

        return {
            mailboxes: mailboxTree,
        };
    });
}

/**
 * Fetch shared mailboxes from other accounts
 */
export async function fetchSharedMailboxes(): Promise<Mailbox[]> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const primaryAccountId = await getPrimaryAccountId();
    const allAccounts = await getAllAccounts();
    const sharedMailboxes: Mailbox[] = [];

    // Get mailboxes from non-primary accounts
    for (const account of allAccounts) {
        if (account.id !== primaryAccountId) {
            try {
                const mailboxes = await jmapService.getMailboxes(account.id);

                // Build hierarchical tree with account info
                const rootMailboxes = mailboxes.filter((m) => !m.parentId);
                const accountMailboxes = rootMailboxes.map((m) =>
                    mapJmapToMailbox(m, [...mailboxes], account.id, account.name)
                );

                sharedMailboxes.push(...accountMailboxes);
            } catch (error) {
                console.warn(`Failed to fetch mailboxes for account ${account.id}:`, error);
            }
        }
    }

    return sharedMailboxes;
}

/**
 * Create a new mailbox/folder
 */
export async function createMailbox(
    accountId: string,
    name: string,
    parentId?: string
): Promise<any> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    return await jmapService.createMailbox(accountId, name, parentId);
}

/**
 * Rename a mailbox/folder
 */
export async function renameMailbox(
    accountId: string,
    mailboxId: string,
    newName: string
): Promise<any> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    return await jmapService.renameMailbox(accountId, mailboxId, newName);
}

/**
 * Delete a mailbox/folder
 */
export async function deleteMailbox(accountId: string, mailboxId: string): Promise<boolean> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    return await jmapService.deleteMailbox(accountId, mailboxId);
}
