import Client from 'jmap-jam';
import { config } from '../config';

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
    
    const [response] = await client.request(['Mailbox/get', {
      accountId,
    }]);

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
    
    const [response] = await client.request(['Email/get', {
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
    }]);

    return response.list[0];
  }

  /**
   * Send an email
   */
  async sendEmail(accountId: string, email: {
    to: { email: string; name?: string }[];
    cc?: { email: string; name?: string }[];
    bcc?: { email: string; name?: string }[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
  }) {
    const client = this.getClient();
    
    // Get the default identity for sending
    const [identities] = await client.request(['Identity/get', { accountId }]);
    const defaultIdentity = identities.list[0];
    
    const emailObject: any = {
      from: [{ email: defaultIdentity.email, name: defaultIdentity.name }],
      to: email.to,
      subject: email.subject,
    };

    if (email.cc) emailObject.cc = email.cc;
    if (email.bcc) emailObject.bcc = email.bcc;

    // Build body structure
    if (email.bodyText && email.bodyHtml) {
      emailObject.bodyValues = {
        text: { value: email.bodyText },
        html: { value: email.bodyHtml },
      };
      emailObject.textBody = [{ partId: 'text', type: 'text/plain' }];
      emailObject.htmlBody = [{ partId: 'html', type: 'text/html' }];
    } else if (email.bodyText) {
      emailObject.bodyValues = {
        text: { value: email.bodyText },
      };
      emailObject.textBody = [{ partId: 'text', type: 'text/plain' }];
    } else if (email.bodyHtml) {
      emailObject.bodyValues = {
        html: { value: email.bodyHtml },
      };
      emailObject.htmlBody = [{ partId: 'html', type: 'text/html' }];
    }

    const [response] = await client.requestMany((ref) => {
      const createEmail = ref.Email.set({
        accountId,
        create: {
          draft: emailObject,
        },
      });
      
      const submit = ref.EmailSubmission.set({
        accountId,
        create: {
          submission: {
            emailId: createEmail.$ref('/created/draft/id') as any,
            identityId: defaultIdentity.id,
          },
        },
        onSuccessDestroyEmail: [createEmail.$ref('/created/draft/id')] as any,
      });
      
      return { createEmail, submit };
    });

    return (response.submit as any).created?.submission;
  }

  /**
   * Update email keywords (flags)
   */
  async updateEmailKeywords(accountId: string, emailId: string, keywords: Record<string, boolean>) {
    const client = this.getClient();
    
    const [response] = await client.request(['Email/set', {
      accountId,
      update: {
        [emailId]: {
          keywords,
        },
      } as any,
    }]);

    return response.updated?.[emailId];
  }

  /**
   * Mark email as read
   */
  async markAsRead(accountId: string, emailId: string) {
    return this.updateEmailKeywords(accountId, emailId, { $seen: true });
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(accountId: string, emailId: string) {
    return this.updateEmailKeywords(accountId, emailId, { $seen: false });
  }

  /**
   * Delete (trash) an email
   */
  async deleteEmail(accountId: string, emailId: string, trashMailboxId: string) {
    const client = this.getClient();
    
    const [response] = await client.request(['Email/set', {
      accountId,
      update: {
        [emailId]: {
          mailboxIds: { [trashMailboxId]: true },
        },
      } as any,
    }]);

    return response.updated?.[emailId];
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
  