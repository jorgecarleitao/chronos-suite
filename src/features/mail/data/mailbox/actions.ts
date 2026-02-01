import { jmapClient } from '../../../../data/jmapClient';
import { getAllAccounts, getPrimaryAccountId } from '../../../../data/accounts';
import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import type { Mailbox as JmapMailbox } from './jmap';
import { buildMailboxTree, type UIMailbox } from './ui';

interface MailboxesResponse {
    mailboxes: UIMailbox[];
}

export async function fetchMailboxes(accountId: string): Promise<MailboxesResponse> {
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();

        const [response] = await client.request([
            'Mailbox/get',
            {
                accountId,
                properties: [
                    'id',
                    'name',
                    'parentId',
                    'role',
                    'sortOrder',
                    'isSubscribed',
                    'totalEmails',
                    'unreadEmails',
                ],
            },
        ]);

        const jmapMailboxes = response.list as readonly JmapMailbox[];
        const mailboxTree = buildMailboxTree(jmapMailboxes);

        return {
            mailboxes: mailboxTree,
        };
    });
}

export async function fetchSharedMailboxes(): Promise<UIMailbox[]> {
    const client = getAuthenticatedClient();
    const primaryAccountId = await getPrimaryAccountId();
    const allAccounts = await getAllAccounts();
    const sharedMailboxes: UIMailbox[] = [];

    // Get mailboxes from non-primary accounts
    for (const account of allAccounts) {
        if (account.id !== primaryAccountId) {
            try {
                const [response] = await client.request([
                    'Mailbox/get',
                    {
                        accountId: account.id,
                        properties: [
                            'id',
                            'name',
                            'parentId',
                            'role',
                            'sortOrder',
                            'isSubscribed',
                            'totalEmails',
                            'unreadEmails',
                        ],
                    },
                ]);

                const mailboxes = response.list as readonly JmapMailbox[];
                const accountMailboxes = buildMailboxTree(mailboxes, account.id, account.name);
                sharedMailboxes.push(...accountMailboxes);
            } catch (error) {
                console.warn(`Failed to fetch mailboxes for account ${account.id}:`, error);
            }
        }
    }

    return sharedMailboxes;
}

export async function createMailbox(
    accountId: string,
    name: string,
    parentId?: string
): Promise<any> {
    const client = getAuthenticatedClient();

    const mailboxData: any = {
        name,
    };

    if (parentId) {
        mailboxData.parentId = parentId;
    }

    const [response] = await client.request([
        'Mailbox/set',
        {
            accountId,
            create: {
                newMailbox: mailboxData,
            },
        },
    ]);

    if (response.notCreated) {
        throw new Error(`Failed to create mailbox: ${JSON.stringify(response.notCreated)}`);
    }

    return response.created.newMailbox;
}

export async function renameMailbox(
    accountId: string,
    mailboxId: string,
    newName: string
): Promise<any> {
    const client = getAuthenticatedClient();

    const [response] = await client.request([
        'Mailbox/set',
        {
            accountId,
            update: {
                [mailboxId]: {
                    name: newName,
                },
            } as any,
        },
    ]);

    if (response.notUpdated) {
        throw new Error(`Failed to rename mailbox: ${JSON.stringify(response.notUpdated)}`);
    }

    return response.updated[mailboxId];
}

export async function deleteMailbox(accountId: string, mailboxId: string): Promise<boolean> {
    const client = getAuthenticatedClient();

    const [response] = await client.request([
        'Mailbox/set',
        {
            accountId,
            destroy: [mailboxId],
        },
    ]);

    if (response.notDestroyed) {
        throw new Error(`Failed to delete mailbox: ${JSON.stringify(response.notDestroyed)}`);
    }

    return true;
}

let mailboxCache: Map<string, JmapMailbox> | null = null;
let mailboxByRoleCache: Map<string, JmapMailbox> | null = null;

export async function getMailboxByName(
    accountId: string,
    name: string
): Promise<JmapMailbox | undefined> {
    if (!mailboxCache) {
        const client = jmapClient.getClient();

        const [response] = await client.request([
            'Mailbox/get',
            {
                accountId,
                properties: [
                    'id',
                    'name',
                    'parentId',
                    'role',
                    'sortOrder',
                    'isSubscribed',
                    'totalEmails',
                    'unreadEmails',
                ],
            },
        ]);

        const mailboxes = response.list as readonly JmapMailbox[];
        mailboxCache = new Map(mailboxes.map((m) => [m.name.toLowerCase(), m]));
        mailboxByRoleCache = new Map(
            mailboxes.filter((m) => m.role).map((m) => [m.role!, m])
        );
    }
    return mailboxCache.get(name.toLowerCase());
}

export async function getMailboxByRole(
    accountId: string,
    role: string
): Promise<JmapMailbox | undefined> {
    if (!mailboxByRoleCache) {
        // Trigger cache population
        await getMailboxByName(accountId, '');
    }
    return mailboxByRoleCache?.get(role);
}

/**
 * Clear the mailbox cache (call when mailboxes change)
 */
export function clearMailboxCache() {
    mailboxCache = null;
    mailboxByRoleCache = null;
}
