/**
 * Message/Email CRUD operations with authentication handling
 */

import { jmapClient } from '../../../../data/jmapClient';
import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import { marked } from 'marked';
import type { Email as JmapEmail } from './jmap';
import type { EmailAddress, EmailData, Attachment } from './jmapTypes';
import {
    fromJmapToMetadata,
    fromJmapToDetail,
    draftToJmap,
    draftToEmailData,
    type Messages,
    type MessageDetail,
    type Draft,
} from './ui';
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
        const client = getAuthenticatedClient();

        // Get mailbox ID from name
        const mailboxObj = await getMailboxByName(accountId, mailbox);
        const mailboxId = mailboxObj?.id;

        const filter: any = {};
        if (mailboxId) {
            filter.inMailbox = mailboxId;
        }

        const [response] = await client.requestMany((ref) => {
            const query = ref.Email.query({
                accountId,
                filter,
                sort: [{ property: 'receivedAt', isAscending: false }],
                limit,
                position: offset,
                calculateTotal: true,
            });

            const get = ref.Email.get({
                accountId,
                ids: query.$ref('/ids'),
                properties: [
                    'id',
                    'subject',
                    'from',
                    'to',
                    'cc',
                    'bcc',
                    'receivedAt',
                    'preview',
                    'hasAttachment',
                    'mailboxIds',
                    'keywords',
                ],
            });

            return { query, get };
        });

        return {
            messages: response.get.list.map((email: any) => fromJmapToMetadata(email as JmapEmail)),
            total: response.query.total || 0,
        };
    });
}

/**
 * Fetch a single message by ID
 */
export async function fetchMessage(accountId: string, emailId: string): Promise<MessageDetail> {
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();
        const [response] = await client.request([
            'Email/get',
            {
                accountId,
                ids: [emailId],
                properties: [
                    'id',
                    'subject',
                    'from',
                    'to',
                    'cc',
                    'bcc',
                    'receivedAt',
                    'bodyValues',
                    'textBody',
                    'htmlBody',
                    'attachments',
                    'hasAttachment',
                    'mailboxIds',
                    'keywords',
                ],
                fetchTextBodyValues: true,
                fetchHTMLBodyValues: true,
            },
        ]);

        return fromJmapToDetail(response.list[0] as JmapEmail);
    });
}

/**
 * Create a new draft
 */
export async function createDraft(accountId: string, draft: Draft) {
    const client = getAuthenticatedClient();

    // Get the drafts mailbox
    const draftsMailbox = await getMailboxByName(accountId, 'Drafts');
    if (!draftsMailbox) {
        throw new Error('Drafts mailbox not found');
    }

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
    const client = getAuthenticatedClient();

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

    return sendMessage(
        accountId,
        {
            ...draft,
            body: htmlBody,
        },
        {
            isHtml: true,
            plainText: draft.body,
        }
    );
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
    const client = getAuthenticatedClient();

    // Get identities
    const [identities] = await client.request(['Identity/get', { accountId }]);

    if (!identities.list || identities.list.length === 0) {
        throw new Error('No identities available for this account');
    }

    const defaultIdentity = identities.list[0];

    // Get mailboxes for drafts folder
    const [mailboxes] = await client.request(['Mailbox/get', { accountId }]);
    const draftsMailbox = mailboxes.list.find((m: any) => m.role === 'drafts');

    if (!draftsMailbox) {
        throw new Error('Drafts mailbox not found');
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

    const emailObject: any = {
        mailboxIds: { [draftsMailbox.id]: true },
        keywords: { $draft: true },
        from: [{ email: defaultIdentity.email, name: defaultIdentity.name }],
        to: emailData.to,
        subject: emailData.subject,
    };

    if (emailData.cc) emailObject.cc = emailData.cc;
    if (emailData.bcc) emailObject.bcc = emailData.bcc;

    // Build body structure
    const bodyValues: any = {};
    let bodyStructure: any;

    if (!emailData.bodyText && !emailData.bodyHtml) {
        throw new Error('Email must have at least bodyText or bodyHtml');
    }

    if (emailData.bodyText && emailData.bodyHtml) {
        // Both text and HTML: use multipart/alternative
        bodyValues.text = { value: emailData.bodyText };
        bodyValues.html = { value: emailData.bodyHtml };
        bodyStructure = {
            type: 'multipart/alternative',
            subParts: [
                {
                    partId: 'text',
                    type: 'text/plain',
                },
                {
                    partId: 'html',
                    type: 'text/html',
                },
            ],
        };
    } else if (emailData.bodyText) {
        // Text only
        bodyValues.text = { value: emailData.bodyText };
        bodyStructure = {
            partId: 'text',
            type: 'text/plain',
        };
    } else {
        // HTML only
        bodyValues.html = { value: emailData.bodyHtml };
        bodyStructure = {
            partId: 'html',
            type: 'text/html',
        };
    }

    emailObject.bodyValues = bodyValues;
    emailObject.bodyStructure = bodyStructure;

    // Add attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
        // Separate inline (with cid) and regular attachments
        const inlineAttachments = emailData.attachments.filter((att) => att.cid);
        const regularAttachments = emailData.attachments.filter((att) => !att.cid);

        let contentPart = bodyStructure;

        // Wrap content with inline images in multipart/related
        if (inlineAttachments.length > 0) {
            contentPart = {
                type: 'multipart/related',
                subParts: [
                    contentPart,
                    ...inlineAttachments.map((attachment) => ({
                        blobId: attachment.blobId,
                        type: attachment.type,
                        name: attachment.name,
                        cid: attachment.cid,
                        disposition: 'inline',
                        size: attachment.size,
                    })),
                ],
            };
        }

        // Wrap everything in multipart/mixed if we have regular attachments
        if (regularAttachments.length > 0) {
            emailObject.bodyStructure = {
                type: 'multipart/mixed',
                subParts: [
                    contentPart,
                    ...regularAttachments.map((attachment) => ({
                        blobId: attachment.blobId,
                        type: attachment.type,
                        name: attachment.name,
                        disposition: 'attachment',
                        size: attachment.size,
                    })),
                ],
            };
        } else {
            emailObject.bodyStructure = contentPart;
        }
    }

    // Create the email
    const [createResponse] = await client.request([
        'Email/set',
        {
            accountId,
            create: {
                email1: emailObject,
            },
        },
    ]);

    if (createResponse.notCreated) {
        throw new Error(`Failed to create email: ${JSON.stringify(createResponse.notCreated)}`);
    }

    const createdEmail = createResponse.created.email1;

    // Submit the email
    const [submitResponse] = await client.request([
        'EmailSubmission/set',
        {
            accountId,
            create: {
                sub1: {
                    emailId: createdEmail.id,
                    identityId: defaultIdentity.id,
                    envelope: {
                        mailFrom: {
                            email: defaultIdentity.email,
                        },
                        rcptTo: [
                            ...emailData.to.map((addr) => ({ email: addr.email })),
                            ...(emailData.cc || []).map((addr) => ({ email: addr.email })),
                            ...(emailData.bcc || []).map((addr) => ({ email: addr.email })),
                        ],
                    },
                },
            } as any,
        },
    ]);

    if (submitResponse.notCreated) {
        throw new Error(`Failed to submit email: ${JSON.stringify(submitResponse.notCreated)}`);
    }

    return submitResponse.created.sub1;
}

/**
 * Delete a message
 */
export async function deleteMessage(accountId: string, emailId: string) {
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();

        // Get the email to check which mailboxes it's in
        const [emailResponse] = await client.request([
            'Email/get',
            {
                accountId,
                ids: [emailId],
                properties: ['mailboxIds'],
            },
        ]);

        const email = emailResponse.list[0];
        if (!email) {
            throw new Error('Email not found');
        }

        // Get mailboxes to find trash folder
        const [mailboxes] = await client.request(['Mailbox/get', { accountId }]);
        const trashMailbox = mailboxes.list.find((m: any) => m.role === 'trash');

        if (!trashMailbox) {
            throw new Error('Trash mailbox not found');
        }

        // Check if email is already in trash
        const isInTrash = email.mailboxIds && trashMailbox.id in email.mailboxIds;

        if (isInTrash) {
            // Permanently delete the email
            const [response] = await client.request([
                'Email/set',
                {
                    accountId,
                    destroy: [emailId],
                },
            ]);

            return response.destroyed?.[0];
        } else {
            // Move to trash
            const [response] = await client.request([
                'Email/set',
                {
                    accountId,
                    update: {
                        [emailId]: {
                            mailboxIds: { [trashMailbox.id]: true },
                        },
                    } as any,
                },
            ]);

            return response.updated?.[emailId];
        }
    });
}

/**
 * Update email keywords (flags) for one or more emails
 */
async function updateEmailKeywords(
    accountId: string,
    emailIds: string[],
    keywords: Record<string, boolean>
) {
    const client = getAuthenticatedClient();

    const update: any = {};
    emailIds.forEach((id) => {
        // Use patch format to add/remove specific keywords without affecting others
        const patches: any = {};
        Object.entries(keywords).forEach(([keyword, value]) => {
            patches[`keywords/${keyword}`] = value;
        });
        update[id] = patches;
    });

    const [response] = await client.request([
        'Email/set',
        {
            accountId,
            update,
        },
    ]);

    return response.updated;
}

/**
 * Mark message(s) as read
 */
export async function markAsRead(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $seen: true });
    });
}

/**
 * Mark message(s) as unread
 */
export async function markAsUnread(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $seen: false });
    });
}

/**
 * Mark message(s) as flagged
 */
export async function markAsFlagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $flagged: true });
    });
}

/**
 * Mark message(s) as unflagged
 */
export async function markAsUnflagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $flagged: false });
    });
}

/**
 * Mark message(s) as answered
 */
export async function markAsAnswered(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $answered: true });
    });
}

/**
 * Move messages to a different mailbox
 */
export async function moveMessages(accountId: string, emailIds: string[], targetMailboxId: string) {
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();

        const update: any = {};
        emailIds.forEach((id) => {
            update[id] = {
                mailboxIds: { [targetMailboxId]: true },
            };
        });

        const [response] = await client.request([
            'Email/set',
            {
                accountId,
                update,
            },
        ]);

        if (response.notUpdated) {
            throw new Error(`Failed to move emails: ${JSON.stringify(response.notUpdated)}`);
        }

        return response.updated;
    });
}

/**
 * Upload a blob (for attachments)
 */
export async function uploadBlob(
    accountId: string,
    file: File
): Promise<{ blobId: string; size: number; type: string }> {
    const client = getAuthenticatedClient();

    // Upload the file as a blob - uploadBlob takes accountId and body as separate parameters
    const uploadResponse = await client.uploadBlob(accountId, file);

    return {
        blobId: uploadResponse.blobId,
        size: uploadResponse.size,
        type: uploadResponse.type || file.type,
    };
}

/**
 * Download blob content (for attachments)
 */
export async function downloadBlob(
    accountId: string,
    blobId: string,
    mimeType?: string
): Promise<Response> {
    const client = getAuthenticatedClient();

    return await client.downloadBlob({
        accountId,
        blobId,
        mimeType: mimeType || 'application/octet-stream',
        fileName: 'attachment',
    });
}
