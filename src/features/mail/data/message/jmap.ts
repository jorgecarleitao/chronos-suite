/**
 * JMAP Email/Message types following JMAP Mail RFC 8621
 * Pure server format from JMAP spec
 */

/**
 * Email address
 */
export interface EmailAddress {
    name?: string;
    email: string;
}

/**
 * Email body part
 */
export interface EmailBodyPart {
    partId?: string;
    blobId?: string;
    size?: number;
    name?: string;
    type?: string;
    charset?: string;
    disposition?: string;
    cid?: string;
    language?: string[];
    location?: string;
    subParts?: EmailBodyPart[];
}

/**
 * Email body value
 */
export interface EmailBodyValue {
    value: string;
    isEncodingProblem?: boolean;
    isTruncated?: boolean;
}

/**
 * JMAP Email - Pure JMAP spec format
 * Following JMAP Mail RFC 8621
 */
export interface Email {
    id: string;
    blobId?: string;
    threadId?: string;
    mailboxIds: Record<string, boolean>;
    keywords?: Record<string, boolean>;
    size?: number;
    receivedAt?: string;
    messageId?: string[];
    inReplyTo?: string[];
    references?: string[];
    sender?: EmailAddress[];
    from?: EmailAddress[];
    to?: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress[];
    subject?: string;
    sentAt?: string;
    hasAttachment?: boolean;
    preview?: string;
    bodyValues?: Record<string, EmailBodyValue>;
    textBody?: EmailBodyPart[];
    htmlBody?: EmailBodyPart[];
    attachments?: EmailBodyPart[];
    bodyStructure?: EmailBodyPart;
    headers?: Array<{ name: string; value: string }>;
}
