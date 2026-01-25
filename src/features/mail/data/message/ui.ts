/**
 * UI-friendly Message/Email types and conversion utilities
 */

import type { Email as JmapEmail } from './jmap';
import type { Attachment, EmailData } from './jmapTypes';

export type MessageFlag = 'seen' | 'flagged' | 'draft' | 'answered';

/**
 * Message metadata for list views (client representation)
 */
export interface MessageMetadata {
    id: string;
    flags: MessageFlag[];
    size?: number;
    from_name?: string;
    from_email?: string;
    to_name?: string;
    to_email?: string;
    subject?: string;
    date: Date | null;
    hasAttachment?: boolean;
}

/**
 * Collection of messages with total count
 */
export interface Messages {
    messages: MessageMetadata[];
    total: number;
}

/**
 * Full message details for viewer/editor (client representation)
 */
export interface MessageDetail {
    id: string;
    from_name?: string;
    from_email?: string;
    to_name?: string;
    to_email?: string;
    to: string; // Comma-separated string for drafts
    cc?: string;
    bcc?: string;
    subject?: string;
    date: Date | null;
    htmlBody?: string;
    textBody?: string;
    flags?: MessageFlag[];
    attachments?: any[];
}

/**
 * Draft message for composition (client representation)
 */
export interface Draft {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Attachment[];
}

/**
 * Parse ISO date string to Date object
 */
function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    return new Date(value);
}

/**
 * Convert JMAP keywords to MessageFlag array
 */
function keywordsToFlags(keywords: Record<string, boolean> | undefined): MessageFlag[] {
    const flags: MessageFlag[] = [];
    if (keywords) {
        if (keywords.$seen) flags.push('seen');
        if (keywords.$flagged) flags.push('flagged');
        if (keywords.$draft) flags.push('draft');
        if (keywords.$answered) flags.push('answered');
    }
    return flags;
}

/**
 * Convert flags array to JMAP keywords
 */
function flagsToKeywords(flags: MessageFlag[]): Record<string, boolean> {
    const keywords: Record<string, boolean> = {};
    if (flags.includes('seen')) keywords.$seen = true;
    if (flags.includes('flagged')) keywords.$flagged = true;
    if (flags.includes('draft')) keywords.$draft = true;
    if (flags.includes('answered')) keywords.$answered = true;
    return keywords;
}

/**
 * Convert JMAP Email to MessageMetadata (for list views)
 */
export function fromJmapToMetadata(jmapEmail: JmapEmail): MessageMetadata {
    const from = jmapEmail.from?.[0];
    const to = jmapEmail.to?.[0];

    return {
        id: jmapEmail.id,
        flags: keywordsToFlags(jmapEmail.keywords),
        size: jmapEmail.size,
        from_name: from?.name,
        from_email: from?.email,
        to_name: to?.name,
        to_email: to?.email,
        subject: jmapEmail.subject,
        date: parseDate(jmapEmail.receivedAt),
        hasAttachment: jmapEmail.hasAttachment || false,
    };
}

/**
 * Convert JMAP Email to MessageDetail (for detail view)
 */
export function fromJmapToDetail(jmapEmail: JmapEmail): MessageDetail {
    const from = jmapEmail.from?.[0];
    const to = jmapEmail.to?.[0];

    // Get HTML body
    let htmlBody: string | undefined;
    if (jmapEmail.htmlBody && jmapEmail.htmlBody.length > 0) {
        const partId = jmapEmail.htmlBody[0].partId;
        htmlBody = jmapEmail.bodyValues?.[partId]?.value;
    }

    // Get text body
    let textBody: string | undefined;
    if (jmapEmail.textBody && jmapEmail.textBody.length > 0) {
        const partId = jmapEmail.textBody[0].partId;
        textBody = jmapEmail.bodyValues?.[partId]?.value;
    }

    // Format to/cc/bcc as comma-separated strings for draft editing
    const toStr = jmapEmail.to?.map((addr) => addr.email).join(', ') || '';
    const ccStr = jmapEmail.cc?.map((addr) => addr.email).join(', ') || '';
    const bccStr = jmapEmail.bcc?.map((addr) => addr.email).join(', ') || '';

    return {
        id: jmapEmail.id,
        from_name: from?.name,
        from_email: from?.email,
        to_name: to?.name,
        to_email: to?.email,
        to: toStr,
        cc: ccStr,
        bcc: bccStr,
        subject: jmapEmail.subject,
        date: parseDate(jmapEmail.receivedAt),
        htmlBody,
        textBody,
        flags: keywordsToFlags(jmapEmail.keywords),
        attachments: jmapEmail.attachments,
    };
}

/**
 * Convert Draft to partial JMAP Email object (for creation)
 */
export function draftToJmap(
    draft: Draft,
    mailboxIds: Record<string, boolean>,
    fromAddress: { email: string; name?: string }
): Partial<JmapEmail> {
    const emailObject: Partial<JmapEmail> = {
        mailboxIds,
        keywords: { $draft: true },
        from: [{ email: fromAddress.email, name: fromAddress.name }],
        to: draft.to.map((email) => ({ email })),
        subject: draft.subject,
        bodyValues: {
            text: { value: draft.body },
        },
        textBody: [{ partId: 'text', type: 'text/plain' }],
    };

    if (draft.cc && draft.cc.length > 0) {
        emailObject.cc = draft.cc.map((email) => ({ email }));
    }
    if (draft.bcc && draft.bcc.length > 0) {
        emailObject.bcc = draft.bcc.map((email) => ({ email }));
    }

    return emailObject;
}

/**
 * Convert Draft to EmailData for sending
 */
export function draftToEmailData(draft: Draft): EmailData {
    const emailData: EmailData = {
        to: draft.to.map((email) => ({ email })),
        subject: draft.subject,
        bodyText: draft.body,
    };

    if (draft.cc && draft.cc.length > 0) {
        emailData.cc = draft.cc.map((email) => ({ email }));
    }
    if (draft.bcc && draft.bcc.length > 0) {
        emailData.bcc = draft.bcc.map((email) => ({ email }));
    }
    if (draft.attachments && draft.attachments.length > 0) {
        emailData.attachments = draft.attachments;
    }

    return emailData;
}
