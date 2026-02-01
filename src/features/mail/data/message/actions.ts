import { withAuthHandling, getAuthenticatedClient } from '../../../../utils/authHandling';
import { getDefaultIdentity } from '../../../../data/identityService';
import { marked } from 'marked';
import type { Email as JmapEmail } from './jmap';
import {
    fromJmapToMetadata,
    fromJmapToDetail,
    draftToJmap,
    draftToEmailData,
    type Messages,
    type MessageDetail,
    type Draft,
} from './ui';
import { getMailboxByName, getMailboxByRole } from '../mailbox/actions';

export async function fetchMessages(
    accountId: string,
    mailbox: string,
    limit = 50,
    position = 0
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
                position,
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

export async function createDraft(accountId: string, draft: Draft) {
    const client = getAuthenticatedClient();

    // Get the drafts mailbox
    const draftsMailbox = await getMailboxByName(accountId, 'Drafts');
    if (!draftsMailbox) {
        throw new Error('Drafts mailbox not found');
    }

    // Get the default identity for the from address
    const defaultIdentity = await getDefaultIdentity(accountId);

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

export async function updateDraft(accountId: string, emailId: string, draft: Draft) {
    const client = getAuthenticatedClient();

    // Create a new draft
    const newDraft = await createDraft(accountId, draft);

    // Delete the old draft
    try {
        await client.request([
            'Email/set',
            {
                accountId,
                destroy: [emailId],
            },
        ]);
    } catch (err) {
        console.warn('Failed to delete old draft, but new draft was created:', err);
    }

    return newDraft;
}

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
 * Build JMAP email object from draft
 */
function buildEmailObject(
    draft: Draft,
    draftsMailboxId: string,
    defaultIdentity: { email: string; name?: string },
    options?: {
        isHtml?: boolean;
        plainText?: string;
    }
): any {
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
        mailboxIds: { [draftsMailboxId]: true },
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
    } else if (emailData.bodyHtml) {
        // HTML only
        bodyValues.html = { value: emailData.bodyHtml };
        bodyStructure = {
            partId: 'html',
            type: 'text/html',
        };
    } else {
        // Empty body - just use plain text with empty string
        bodyValues.text = { value: '' };
        bodyStructure = {
            partId: 'text',
            type: 'text/plain',
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

    return { emailObject, emailData };
}

export async function sendMessage(
    accountId: string,
    draft: Draft,
    options?: {
        isHtml?: boolean;
        plainText?: string;
    }
) {
    const client = getAuthenticatedClient();

    // Get default identity
    const defaultIdentity = await getDefaultIdentity(accountId);

    // Get mailboxes for drafts and sent folders
    const draftsMailbox = await getMailboxByRole(accountId, 'drafts');
    const sentMailbox = await getMailboxByRole(accountId, 'sent');

    if (!draftsMailbox) {
        throw new Error('Drafts mailbox not found');
    }
    if (!sentMailbox) {
        throw new Error('Sent mailbox not found');
    }

    // Build email object
    const { emailObject, emailData } = buildEmailObject(
        draft,
        draftsMailbox.id,
        defaultIdentity,
        options
    );

    // Create and submit the email in a single batch request
    const [response] = await client.requestMany((ref) => {
        const emailSet = ref.Email.set({
            accountId,
            create: {
                email1: emailObject,
            },
        });

        const submission = ref.EmailSubmission.set({
            accountId,
            create: {
                sub1: {
                    emailId: '#email1',
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
            onSuccessUpdateEmail: {
                '#sub1': {
                    mailboxIds: { [sentMailbox.id]: true },
                    'keywords/$draft': null,
                },
            },
        });

        return { emailSet, submission };
    });

    if (response.emailSet.notCreated) {
        throw new Error(`Failed to create email: ${JSON.stringify(response.emailSet.notCreated)}`);
    }

    if (response.submission.notCreated) {
        throw new Error(
            `Failed to submit email: ${JSON.stringify(response.submission.notCreated)}`
        );
    }

    return response.submission.created?.sub1;
}

export async function trashMessages(accountId: string, emailIds: string[]) {
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();

        if (emailIds.length === 0) return;

        // Get trash mailbox
        const trashMailbox = await getMailboxByRole(accountId, 'trash');

        if (!trashMailbox) {
            throw new Error('Trash mailbox not found');
        }

        const update: Record<string, any> = {};
        emailIds.forEach((id) => {
            update[id] = {
                mailboxIds: { [trashMailbox.id]: true },
            };
        });

        const [response] = await client.request([
            'Email/set',
            {
                accountId,
                update,
            } as any,
        ]);

        return response;
    });
}

export async function deleteMessages(accountId: string, emailIds: string[]) {
    if (emailIds.length === 0) return;
    return withAuthHandling(async () => {
        const client = getAuthenticatedClient();
        const [response] = await client.request([
            'Email/set',
            {
                accountId,
                destroy: emailIds,
            },
        ]);

        return response;
    });
}

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

export async function markAsRead(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $seen: true });
    });
}

export async function markAsUnread(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $seen: false });
    });
}

export async function markAsFlagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $flagged: true });
    });
}

export async function markAsUnflagged(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $flagged: false });
    });
}

export async function markAsAnswered(accountId: string, emailIds: string | string[]) {
    return withAuthHandling(async () => {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return updateEmailKeywords(accountId, ids, { $answered: true });
    });
}

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
