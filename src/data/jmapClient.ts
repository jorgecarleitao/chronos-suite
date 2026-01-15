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
            },
        ]);

        return response.list;
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
                },
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
            update[id] = { keywords };
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
     * Clear the client (on logout)
     */
    clear(): void {
        this.client = null;
    }
}

// Export singleton instance
export const jmapService = new JmapService();
