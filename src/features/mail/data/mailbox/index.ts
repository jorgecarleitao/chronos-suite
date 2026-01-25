/**
 * Mailbox module - JMAP/UI/Actions pattern
 * 
 * This module handles mailboxes/folders with separation of concerns:
 * - jmap.ts: Pure JMAP spec types (server format)
 * - ui.ts: Client-friendly types and conversion functions
 * - actions.ts: CRUD operations with authentication handling
 */

// Re-export JMAP types
export type {
    Mailbox,
    MailboxRights,
} from './jmap';

// Re-export UI types and conversion functions
export type {
    UIMailbox,
} from './ui';

export {
    fromJmap,
    buildMailboxTree,
} from './ui';

// Re-export all actions
export {
    fetchMailboxes,
    fetchSharedMailboxes,
    createMailbox,
    renameMailbox,
    deleteMailbox,
    getMailboxByName,
    clearMailboxCache,
} from './actions';
