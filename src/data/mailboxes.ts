import { jmapService } from './jmapClient';
import { getAllAccounts, getPrimaryAccountId } from './accounts';

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
    name: string;
    display_name: string;
    role?: string;
    is_selectable: boolean;
    children: Mailbox[];
    accountId?: string;
    accountName?: string;
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
        name: jmapMailbox.name,
        display_name: jmapMailbox.name,
        role: jmapMailbox.role || undefined,
        is_selectable: true, // JMAP mailboxes are generally selectable
        children,
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
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const jmapMailboxes = await jmapService.getMailboxes(accountId);
    const mailboxTree = buildMailboxTree(jmapMailboxes);

    return {
        mailboxes: mailboxTree,
    };
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
