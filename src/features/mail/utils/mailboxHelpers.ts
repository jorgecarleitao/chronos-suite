import { Mailbox } from '../../../data/mailboxes';

export interface MailboxNode {
    name: string; // Full path name
    displayName: string; // Just the last segment
    children: MailboxNode[];
    isLeaf: boolean;
    role?: string;
    id?: string; // JMAP mailbox ID
    parentId?: string | null;
    unreadEmails?: number;
    totalEmails?: number;
}

// Convert backend tree to frontend node structure
export const convertToNode = (mailbox: Mailbox): MailboxNode => ({
    name: mailbox.name,
    displayName: mailbox.display_name,
    children: mailbox.children.map(convertToNode),
    isLeaf: mailbox.is_selectable,
    role: mailbox.role,
    id: mailbox.id,
    parentId: mailbox.parentId,
    unreadEmails: mailbox.unreadEmails,
    totalEmails: mailbox.totalEmails,
});

// Custom order for main mailboxes
const MAIN_ORDER = ['inbox', 'drafts', 'sent items', 'junk mail', 'deleted items'];

// Helper to flatten and sort mailboxes by MAIN_ORDER, then others
export function sortMailboxes(nodes: MailboxNode[]): MailboxNode[] {
    const main: MailboxNode[] = [];
    const others: MailboxNode[] = [];
    for (const node of nodes) {
        const idx = MAIN_ORDER.findIndex((name) => node.displayName.toLowerCase() === name);
        if (idx !== -1) {
            main[idx] = node;
        } else {
            others.push(node);
        }
    }
    // Filter out undefined slots in main
    const orderedMain = main.filter(Boolean);
    // Sort others alphabetically
    others.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [...orderedMain, ...others];
}

// Check if selected mailbox is selectable
export const isSelectableMailbox = (name: string, mailboxes: Mailbox[]): boolean => {
    for (const mb of mailboxes) {
        if (mb.name === name) return mb.is_selectable;
        if (mb.children.length > 0 && isSelectableMailbox(name, mb.children)) {
            return true;
        }
    }
    return false;
};

// Find inbox in mailbox tree
export const findInbox = (mailboxList: Mailbox[]): Mailbox | null => {
    for (const mb of mailboxList) {
        if (mb.role === 'inbox') return mb;
        if (mb.children.length > 0) {
            const found = findInbox(mb.children);
            if (found) return found;
        }
    }
    return null;
};

// Group shared mailboxes by account
export const groupSharedMailboxesByAccount = (sharedMailboxes: Mailbox[]) => {
    return sharedMailboxes.reduce(
        (acc, mailbox) => {
            const accountId = mailbox.accountId!;
            if (!acc[accountId]) {
                acc[accountId] = {
                    accountName: mailbox.accountName!,
                    mailboxes: [],
                };
            }
            acc[accountId].mailboxes.push(mailbox);
            return acc;
        },
        {} as Record<string, { accountName: string; mailboxes: Mailbox[] }>
    );
};
