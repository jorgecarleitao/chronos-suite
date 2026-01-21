import Client from 'jmap-jam';
import { config } from '../config';

export interface EmailAddress {
    email: string;
    name?: string;
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

export interface Attachment {
    blobId: string;
    name: string;
    type: string;
    size: number;
}

/**
 * JMAP Client wrapper for email operations
 */
class JmapService {
    private client: Client | null = null;

    /**
     * Initialize the JMAP client with an access token
     */
    async initialize(accessToken: string): Promise<void> {
        this.client = new Client({
            sessionUrl: config.jmap.sessionEndpoint,
            bearerToken: accessToken,
        });
    }

    /**
     * Get the primary account ID from the session
     */
    async getPrimaryAccountId(): Promise<string> {
        const client = this.getClient();
        return await client.getPrimaryAccount();
    }

    /**
     * Get the current JMAP client instance
     */
    getClient(): Client {
        if (!this.client) {
            throw new Error('JMAP client not initialized. Call initialize() first.');
        }
        return this.client;
    }

    /**
     * Check if the client is initialized
     */
    isInitialized(): boolean {
        return this.client !== null;
    }

    /**
     * Get mailboxes (folders)
     */
    async getMailboxes(accountId: string) {
        const client = this.getClient();

        const [response] = await client.request([
            'Mailbox/get',
            {
                accountId,
                properties: [
                    'id',
                    'name',
                    'parentId',
                    'role',
                    'sortOrder',
                    'isSubscribed',
                    'totalEmails',
                    'unreadEmails',
                ],
            },
        ]);

        return response.list;
    }

    /**
     * Create a new mailbox
     */
    async createMailbox(accountId: string, name: string, parentId?: string) {
        const client = this.getClient();

        const mailboxData: any = {
            name,
        };

        if (parentId) {
            mailboxData.parentId = parentId;
        }

        const [response] = await client.request([
            'Mailbox/set',
            {
                accountId,
                create: {
                    newMailbox: mailboxData,
                },
            },
        ]);

        if (response.notCreated) {
            throw new Error(`Failed to create mailbox: ${JSON.stringify(response.notCreated)}`);
        }

        return response.created.newMailbox;
    }

    /**
     * Rename a mailbox
     */
    async renameMailbox(accountId: string, mailboxId: string, newName: string) {
        const client = this.getClient();

        const [response] = await client.request([
            'Mailbox/set',
            {
                accountId,
                update: {
                    [mailboxId]: {
                        name: newName,
                    },
                } as any,
            },
        ]);

        if (response.notUpdated) {
            throw new Error(`Failed to rename mailbox: ${JSON.stringify(response.notUpdated)}`);
        }

        return response.updated[mailboxId];
    }

    /**
     * Delete a mailbox
     */
    async deleteMailbox(accountId: string, mailboxId: string) {
        const client = this.getClient();

        const [response] = await client.request([
            'Mailbox/set',
            {
                accountId,
                destroy: [mailboxId],
            },
        ]);

        if (response.notDestroyed) {
            throw new Error(`Failed to delete mailbox: ${JSON.stringify(response.notDestroyed)}`);
        }

        return true;
    }

    /**
     * Get emails from a mailbox
     */
    async getEmails(accountId: string, mailboxId?: string, limit = 50) {
        const client = this.getClient();

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

        return response.get.list;
    }

    /**
     * Get a single email with full body
     */
    async getEmail(accountId: string, emailId: string) {
        const client = this.getClient();

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

        return response.list[0];
    }

    /**
     * Send an email
     */
    async sendEmail(accountId: string, email: EmailData) {
        const client = this.getClient();

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

        const emailObject: any = {
            mailboxIds: { [draftsMailbox.id]: true },
            keywords: { $draft: true },
            from: [{ email: defaultIdentity.email, name: defaultIdentity.name }],
            to: email.to,
            subject: email.subject,
        };

        if (email.cc) emailObject.cc = email.cc;
        if (email.bcc) emailObject.bcc = email.bcc;

        // Build body structure
        const bodyValues: any = {};
        let bodyStructure: any;

        if (!email.bodyText && !email.bodyHtml) {
            throw new Error('Email must have at least bodyText or bodyHtml');
        }

        if (email.bodyText && email.bodyHtml) {
            // Both text and HTML: use multipart/alternative
            bodyValues.text = { value: email.bodyText };
            bodyValues.html = { value: email.bodyHtml };
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
        } else if (email.bodyText) {
            // Text only
            bodyValues.text = { value: email.bodyText };
            bodyStructure = {
                partId: 'text',
                type: 'text/plain',
            };
        } else {
            // HTML only
            bodyValues.html = { value: email.bodyHtml };
            bodyStructure = {
                partId: 'html',
                type: 'text/html',
            };
        }

        emailObject.bodyValues = bodyValues;
        emailObject.bodyStructure = bodyStructure;

        // Add attachments if provided
        if (email.attachments && email.attachments.length > 0) {
            // Convert to multipart/mixed if we have attachments
            const contentPart = bodyStructure;

            emailObject.bodyStructure = {
                type: 'multipart/mixed',
                subParts: [
                    contentPart,
                    ...email.attachments.map((attachment, index) => ({
                        partId: `attachment${index}`,
                        blobId: attachment.blobId,
                        type: attachment.type,
                        name: attachment.name,
                        disposition: 'attachment',
                        size: attachment.size,
                    })),
                ],
            };
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
                                ...email.to.map((addr) => ({ email: addr.email })),
                                ...(email.cc || []).map((addr) => ({
                                    email: addr.email,
                                })),
                                ...(email.bcc || []).map((addr) => ({
                                    email: addr.email,
                                })),
                            ],
                        },
                    },
                } as any,
            },
        ]);

        if (submitResponse.notCreated) {
            throw new Error(`Failed to submit email: ${JSON.stringify(submitResponse.notCreated)}`);
        }

        const submission = submitResponse.created.sub1;

        return submission;
    }

    /**
     * Update email keywords (flags) for one or more emails
     */
    async updateEmailKeywords(
        accountId: string,
        emailIds: string[],
        keywords: Record<string, boolean>
    ) {
        const client = this.getClient();

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
     * Mark email(s) as read
     */
    async markAsRead(accountId: string, emailIds: string | string[]) {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return this.updateEmailKeywords(accountId, ids, { $seen: true });
    }

    /**
     * Mark email(s) as unread
     */
    async markAsUnread(accountId: string, emailIds: string | string[]) {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return this.updateEmailKeywords(accountId, ids, { $seen: false });
    }

    /**
     * Mark email(s) as flagged/starred
     */
    async markAsFlagged(accountId: string, emailIds: string | string[]) {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return this.updateEmailKeywords(accountId, ids, { $flagged: true });
    }

    /**
     * Mark email(s) as unflagged/unstarred
     */
    async markAsUnflagged(accountId: string, emailIds: string | string[]) {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return this.updateEmailKeywords(accountId, ids, { $flagged: false });
    }

    /**
     * Mark email(s) as answered
     */
    async markAsAnswered(accountId: string, emailIds: string | string[]) {
        const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
        return this.updateEmailKeywords(accountId, ids, { $answered: true });
    }

    /**
     * Move email(s) to a different mailbox
     */
    async moveEmails(accountId: string, emailIds: string[], targetMailboxId: string) {
        const client = this.getClient();

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
    }

    /**
     * Delete (trash) an email or permanently delete if already in trash
     */
    async deleteEmail(accountId: string, emailId: string) {
        const client = this.getClient();

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
    }

    /**
     * Download blob content (for attachments)
     */
    async downloadBlob(accountId: string, blobId: string, mimeType?: string): Promise<Response> {
        const client = this.getClient();

        return await client.downloadBlob({
            accountId,
            blobId,
            mimeType: mimeType || 'application/octet-stream',
            fileName: 'attachment',
        });
    }

    /**
     * Upload a blob (for attachments)
     */
    async uploadBlob(
        accountId: string,
        file: File
    ): Promise<{ blobId: string; size: number; type: string }> {
        const client = this.getClient();

        // Upload the file as a blob - uploadBlob takes accountId and body as separate parameters
        const uploadResponse = await client.uploadBlob(accountId, file);

        return {
            blobId: uploadResponse.blobId,
            size: uploadResponse.size,
            type: uploadResponse.type || file.type,
        };
    }

    /**
     * Clear the client (on logout)
     */
    clear(): void {
        this.client = null;
    }
}

// Export singleton instance
export const jmapService = new JmapService();
