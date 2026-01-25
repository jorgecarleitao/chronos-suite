/**
 * Message/Email CRUD operations with authentication handling
 */

import { jmapService } from '../../../../data/jmapClient';
import { withAuthHandling } from '../../../../utils/authHandling';
import { marked } from 'marked';
import type { Email as JmapEmail } from './jmap';
import { fromJmapToMetadata, fromJmapToDetail, draftToJmap, draftToEmailData, type Messages, type MessageDetail, type Draft } from './ui';
import { getMailboxByName } from '../mailbox/actions';

/**
 * Fetch messages from a mailbox
 */
export async function fetchMessages(
    accountId: string,
    mailbox: string,
    limit = 50,
    offset = 0
): Promise<Messages> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        // Get mailbox ID from name
        const mailboxObj = await getMailboxByName(accountId, mailbox);
        const mailboxId = mailboxObj?.id;

        const result = await jmapService.getEmails(accountId, mailboxId, limit, offset);

        return {
            messages: result.emails.map((email: any) => fromJmapToMetadata(email as JmapEmail)),
            total: result.total,
        };
    });
}

/**
 * Fetch a single message by ID
 */
export async function fetchMessage(accountId: string, emailId: string): Promise<MessageDetail> {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        const email: any = await jmapService.getEmail(accountId, emailId);
        return fromJmapToDetail(email as JmapEmail);
    });
}

/**
 * Create a new draft
 */
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

    // Build the email object using conversion function
    const emailObject = draftToJmap(
        draft,
        { [draftsMailbox.id]: true },
        { email: defaultIdentity.email, name: defaultIdentity.name }
    );

    // Create the draft
    const [response] = await client.request([
        'Email/set',
        {
            accountId,
            create: {
                draft: emailObject as any,
            },
        },
    ]);

    if (response.created?.draft) {
        return response.created.draft;
    } else {
        throw new Error('Failed to create draft');
    }
}

/**
 * Update an existing draft
 * Note: JMAP requires creating a new draft and deleting the old one
 */
export async function updateDraft(accountId: string, emailId: string, draft: Draft) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    const client = jmapService.getClient();

    // Create a new draft first
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

/**
 * Prepare and send a message from a draft body (markdown)
 * Converts markdown to HTML and uses markdown as plain text
 */
export async function prepareAndSendMessage(accountId: string, draft: Draft) {
    // Convert markdown to HTML
    let htmlBody = marked.parse(draft.body);
    if (htmlBody instanceof Promise) {
        htmlBody = await htmlBody;
    }

    return sendMessage(accountId, {
        ...draft,
        body: htmlBody,
    }, {
        isHtml: true,
        plainText: draft.body,
    });
}

/**
 * Send a message
 */
export async function sendMessage(
    accountId: string,
    draft: Draft,
    options?: {
        isHtml?: boolean;
        plainText?: string;
    }
) {
    if (!jmapService.isInitialized()) {
        throw new Error('JMAP client not initialized. Please log in first.');
    }

    // Convert Draft to EmailData
    const emailData = draftToEmailData(draft);

    // Set both HTML and plain text body for better compatibility
    if (options?.isHtml) {
        emailData.bodyHtml = draft.body;
        // Use provided plain text or strip HTML tags as fallback
        emailData.bodyText = options.plainText || draft.body.replace(/<[^>]*>/g, '').trim();
    } else {
        emailData.bodyText = draft.body;
    }

    return await jmapService.sendEmail(accountId, emailData);
}

/**
 * Delete a message
 */
export async function deleteMessage(accountId: string, emailId: string) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.deleteEmail(accountId, emailId);
    });
}

/**
 * Mark message(s) as read
 */
export async function markAsRead(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.markAsRead(accountId, emailIds);
    });
}

/**
 * Mark message(s) as unread
 */
export async function markAsUnread(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.markAsUnread(accountId, emailIds);
    });
}

/**
 * Mark message(s) as flagged
 */
export async function markAsFlagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.markAsFlagged(accountId, emailIds);
    });
}

/**
 * Mark message(s) as unflagged
 */
export async function markAsUnflagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.markAsUnflagged(accountId, emailIds);
    });
}

/**
 * Mark message(s) as answered
 */
export async function markAsAnswered(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.markAsAnswered(accountId, emailIds);
    });
}

/**
 * Move messages to a different mailbox
 */
export async function moveMessages(accountId: string, emailIds: string[], targetMailboxId: string) {
    return withAuthHandling(async () => {
        if (!jmapService.isInitialized()) {
            throw new Error('JMAP client not initialized. Please log in first.');
        }

        await jmapService.moveEmails(accountId, emailIds, targetMailboxId);
    });
}
