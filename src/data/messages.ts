import { jmapService, EmailData } from './jmapClient';

export interface Draft {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
}

// Mailbox cache to map names to IDs
let mailboxCache: Map<string, any> | null = null;

async function getMailboxByName(accountId: string, name: string) {
    if (!mailboxCache) {
        const mailboxes = await jmapService.getMailboxes(accountId);
        mailboxCache = new Map(mailboxes.map((m: any) => [m.name.toLowerCase(), m]));
    }
    return mailboxCache.get(name.toLowerCase());
}

// Create a new draft
export async function createDraft(accountId: string, draft: Draft) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    // Get the drafts mailbox
    const draftsMailbox = await getMailboxByName(accountId, 'Drafts');
    if (!draftsMailbox) {
        throw new Error('Drafts mailbox not found');
    }

    const client = jmapService.getClient();

    // Get the default identity for the from address
    const [identities] = await client.request(['Identity/get', { accountId }]);
    const defaultIdentity = identities.list[0];

    // Build the email object
    const emailObject: any = {
        mailboxIds: { [draftsMailbox.id]: true },
        keywords: { $draft: true },
        from: [{ email: defaultIdentity.email, name: defaultIdentity.name }],
        to: draft.to.map((email) => ({ email })),
        subject: draft.subject,
    };

    if (draft.cc && draft.cc.length > 0) {
        emailObject.cc = draft.cc.map((email) => ({ email }));
    }
    if (draft.bcc && draft.bcc.length > 0) {
        emailObject.bcc = draft.bcc.map((email) => ({ email }));
    }

    // Build body structure
    emailObject.bodyValues = {
        text: { value: draft.body },
    };
    emailObject.textBody = [{ partId: 'text', type: 'text/plain' }];

    // Create the draft
    const [response] = await client.request([
        'Email/set',
        {
            accountId,
            create: {
                draft: emailObject,
            },
        },
    ]);

    if (response.created?.draft) {
        return response.created.draft;
    } else {
        throw new Error('Failed to create draft');
    }
}

// Update an existing draft
export async function updateDraft(accountId: string, emailId: string, draft: Draft) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const client = jmapService.getClient();

    // In JMAP, updating email bodies is complex. The standard approach is:
    // Create a new draft first, then delete the old one (to avoid losing data if create fails)
    const newDraft = await createDraft(accountId, draft);

    // Only if creation succeeds, delete the old draft
    try {
        await client.request([
            'Email/set',
            {
                accountId,
                destroy: [emailId],
            },
        ]);
    } catch (err) {
        // If deletion fails, we still have the new draft, so just log the error
        console.warn('Failed to delete old draft, but new draft was created:', err);
    }

    return newDraft;
}

// What the rest of the app uses
export interface MessageMetadata {
    uid: number; // We'll use a numeric hash of the JMAP ID for compatibility
    id?: string; // The actual JMAP email ID
    flags: string[];
    size?: number;
    from_name?: string;
    from_email?: string;
    to_name?: string;
    to_email?: string;
    subject?: string;
    date: Date | null;
}

export interface Messages {
    messages: MessageMetadata[];
    total: number;
}

function parseDate(value: string | null): Date | null {
    if (!value) return null;
    return new Date(value);
}

// Convert JMAP email to our MessageMetadata format
function mapJmapToMessageMetadata(jmapEmail: any): MessageMetadata {
    // Create a numeric UID from the JMAP ID for compatibility
    const uid = hashStringToNumber(jmapEmail.id);

    // Extract from/to info
    const from = jmapEmail.from?.[0];
    const to = jmapEmail.to?.[0];

    // Convert JMAP keywords to flags
    const flags: string[] = [];
    if (jmapEmail.keywords) {
        if (jmapEmail.keywords.$seen) flags.push('Seen');
        if (jmapEmail.keywords.$flagged) flags.push('Flagged');
        if (jmapEmail.keywords.$draft) flags.push('Draft');
        if (jmapEmail.keywords.$answered) flags.push('Answered');
    }

    return {
        uid,
        id: jmapEmail.id,
        flags,
        from_name: from?.name,
        from_email: from?.email,
        to_name: to?.name,
        to_email: to?.email,
        subject: jmapEmail.subject,
        date: parseDate(jmapEmail.receivedAt),
    };
}

// Simple hash function to convert string ID to number
function hashStringToNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export async function fetchMessages(accountId: string, mailbox: string): Promise<Messages> {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    // Get mailbox ID from name
    const mailboxObj = await getMailboxByName(accountId, mailbox);
    const mailboxId = mailboxObj?.id;

    const emails = await jmapService.getEmails(accountId, mailboxId, 50);

    return {
        messages: emails.map(mapJmapToMessageMetadata),
        total: emails.length, // JMAP query response has totalCount, but we'd need to modify getEmails
    };
}

export async function fetchMessage(accountId: string, emailId: string, uid: number) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const email = await jmapService.getEmail(accountId, emailId);

    // Convert to expected format
    const from = email.from?.[0];
    const to = email.to?.[0];

    // Get body text
    let bodyText = '';
    if (email.textBody && email.textBody.length > 0) {
        const partId = email.textBody[0].partId;
        bodyText = email.bodyValues?.[partId]?.value || '';
    } else if (email.htmlBody && email.htmlBody.length > 0) {
        const partId = email.htmlBody[0].partId;
        bodyText = email.bodyValues?.[partId]?.value || '';
    }

    // Format to/cc/bcc as comma-separated strings for draft editing
    const toStr = email.to?.map((addr: any) => addr.email).join(', ') || '';
    const ccStr = email.cc?.map((addr: any) => addr.email).join(', ') || '';
    const bccStr = email.bcc?.map((addr: any) => addr.email).join(', ') || '';

    return {
        uid,
        id: email.id,
        from_name: from?.name,
        from_email: from?.email,
        to_name: to?.name,
        to_email: to?.email,
        to: toStr,
        cc: ccStr,
        bcc: bccStr,
        subject: email.subject,
        date: parseDate(email.receivedAt),
        body: bodyText,
        has_attachments: email.hasAttachment,
    };
}

export async function sendMessage(
    accountId: string,
    to: string[],
    subject: string,
    body: string,
    options?: {
        cc?: string[];
        bcc?: string[];
        isHtml?: boolean;
    }
) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const emailData: EmailData = {
        to: to.map((email) => ({ email })),
        subject,
    };

    // Add cc and bcc if provided
    if (options?.cc && options.cc.length > 0) {
        emailData.cc = options.cc.map((email) => ({ email }));
    }
    if (options?.bcc && options.bcc.length > 0) {
        emailData.bcc = options.bcc.map((email) => ({ email }));
    }

    // Set body as HTML or text
    if (options?.isHtml) {
        emailData.bodyHtml = body;
    } else {
        emailData.bodyText = body;
    }

    return await jmapService.sendEmail(accountId, emailData);
}

export async function deleteMessage(accountId: string, emailId: string) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    await jmapService.deleteEmail(accountId, emailId);
}
