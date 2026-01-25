/**
 * Message/Email module - JMAP/UI/Actions pattern
 *
 * This module handles email messages with separation of concerns:
 * - jmap.ts: Pure JMAP spec types (server format)
 * - ui.ts: Client-friendly types and conversion functions
 * - actions.ts: CRUD operations with authentication handling
 */

// Re-export JMAP types
export type { Email, EmailAddress, EmailBodyPart, EmailBodyValue } from './jmap';

// Re-export common JMAP types
export type { Attachment, EmailData, EmailAddress as JmapEmailAddress } from './jmapTypes';

// Re-export UI types and conversion functions
export type { MessageMetadata, Messages, MessageDetail, Draft, MessageFlag } from './ui';

export { fromJmapToMetadata, fromJmapToDetail, draftToJmap, draftToEmailData } from './ui';

// Re-export all actions
export {
    fetchMessages,
    fetchMessage,
    createDraft,
    updateDraft,
    prepareAndSendMessage,
    sendMessage,
    deleteMessage,
    markAsRead,
    markAsUnread,
    markAsFlagged,
    markAsUnflagged,
    markAsAnswered,
    moveMessages,
    uploadBlob,
    downloadBlob,
} from './actions';
