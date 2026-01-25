/**
 * UI-friendly Mailbox interface and conversion utilities
 */

import type { Mailbox as JmapMailbox } from './jmap';

/**
 * UI-friendly mailbox (client representation)
 */
export interface UIMailbox {
    id: string;
    name: string;
    displayName: string;
    role?: string;
    isSelectable: boolean;
    children: UIMailbox[];
    accountId?: string;
    accountName?: string;
    parentId?: string | null;
    unreadEmails?: number;
    totalEmails?: number;
}

/**
 * Convert JMAP Mailbox to UI Mailbox
 */
export function fromJmap(
    jmapMailbox: JmapMailbox,
    allMailboxes: JmapMailbox[],
    accountId?: string,
    accountName?: string
): UIMailbox {
    // Get children mailboxes
    const children = allMailboxes
        .filter((m) => m.parentId === jmapMailbox.id)
        .map((child) => fromJmap(child, allMailboxes, accountId, accountName));

    return {
        id: jmapMailbox.id,
        name: jmapMailbox.name,
        displayName: jmapMailbox.name,
        role: jmapMailbox.role || undefined,
        isSelectable: true, // JMAP mailboxes are generally selectable
        children,
        parentId: jmapMailbox.parentId,
        unreadEmails: jmapMailbox.unreadEmails,
        totalEmails: jmapMailbox.totalEmails,
        accountId,
        accountName,
    };
}

/**
 * Build a hierarchical tree from flat list
 */
export function buildMailboxTree(
    mailboxes: readonly JmapMailbox[],
    accountId?: string,
    accountName?: string
): UIMailbox[] {
    // Get root mailboxes (no parent)
    const rootMailboxes = mailboxes.filter((m) => !m.parentId);
    return rootMailboxes.map((m) => fromJmap(m, [...mailboxes], accountId, accountName));
}
