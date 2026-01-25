/**
 * Common JMAP types for mail operations
 */

export interface EmailAddress {
    email: string;
    name?: string;
}

export interface Attachment {
    blobId: string;
    name: string;
    type: string;
    size: number;
    cid?: string; // Content-ID for inline images
}

export interface EmailData {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    attachments?: Attachment[];
}
