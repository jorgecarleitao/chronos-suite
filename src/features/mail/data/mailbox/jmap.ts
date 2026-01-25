/**
 * JMAP Mailbox types following JMAP Mail RFC 8621
 * Pure server format from JMAP spec
 */

/**
 * JMAP Mailbox - Pure JMAP spec format
 * Following JMAP Mail RFC 8621
 */
export interface Mailbox {
    id: string;
    name: string;
    parentId?: string | null;
    role?: string | null;
    sortOrder?: number;
    isSubscribed?: boolean;
    totalEmails?: number;
    unreadEmails?: number;
    totalThreads?: number;
    unreadThreads?: number;
    myRights?: MailboxRights;
}

/**
 * Mailbox rights
 */
export interface MailboxRights {
    mayReadItems?: boolean;
    mayAddItems?: boolean;
    mayRemoveItems?: boolean;
    maySetSeen?: boolean;
    maySetKeywords?: boolean;
    mayCreateChild?: boolean;
    mayRename?: boolean;
    mayDelete?: boolean;
    maySubmit?: boolean;
}
