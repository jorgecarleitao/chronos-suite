/**
 * Mailbox CRUD operations with authentication handling
 */

import { jmapService } from '../../../../data/jmapClient';
import { getAllAccounts, getPrimaryAccountId } from '../../../../data/accounts';
import { withAuthHandling } from '../../../../utils/authHandling';
import type { Mailbox as JmapMailbox } from './jmap';
import { buildMailboxTree, type UIMailbox } from './ui';

interface MailboxesResponse {
    mailboxes: UIMailbox[];
}

/**
 * Fetch mailboxes for a specific account
 */
export async function fetchMailboxes(accountId: string): Promise<MailboxesResponse> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const jmapMailboxes = await jmapService.getMailboxes(accountId) as readonly JmapMailbox[];
        const mailboxTree = buildMailboxTree(jmapMailboxes);

        return {
            mailboxes: mailboxTree,
        };
    });
}

/**
 * Fetch shared mailboxes from other accounts
 */
export async function fetchSharedMailboxes(): Promise<UIMailbox[]> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const primaryAccountId = await getPrimaryAccountId();
    const allAccounts = await getAllAccounts();
    const sharedMailboxes: UIMailbox[] = [];

    // Get mailboxes from non-primary accounts
    for (const account of allAccounts) {
        if (account.id !== primaryAccountId) {
            try {
                const mailboxes = await jmapService.getMailboxes(account.id) as readonly JmapMailbox[];
                const accountMailboxes = buildMailboxTree(mailboxes, account.id, account.name);
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

/**
 * Mailbox cache to map names to IDs
 */
let mailboxCache: Map<string, JmapMailbox> | null = null;

/**
 * Get a mailbox by name (case-insensitive)
 */
export async function getMailboxByName(accountId: string, name: string): Promise<JmapMailbox | undefined> {
    if (!mailboxCache) {
        const mailboxes = await jmapService.getMailboxes(accountId) as readonly JmapMailbox[];
        mailboxCache = new Map(mailboxes.map((m) => [m.name.toLowerCase(), m]));
    }
    return mailboxCache.get(name.toLowerCase());
}

/**
 * Clear the mailbox cache (call when mailboxes change)
 */
export function clearMailboxCache() {
    mailboxCache = null;
}
