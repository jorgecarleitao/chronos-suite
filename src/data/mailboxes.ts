import { jmapService } from './jmapClient';

// What the rest of the app uses
export interface Mailbox {
  name: string;
  display_name: string;
  attributes: string[];
  is_selectable: boolean;
  children: Mailbox[];
}

interface MailboxesResponse {
  mailboxes: Mailbox[];
}

// Convert JMAP mailbox to our format
function mapJmapToMailbox(jmapMailbox: any, allMailboxes: any[]): Mailbox {
  // Get children mailboxes
  const children = allMailboxes
    .filter((m: any) => m.parentId === jmapMailbox.id)
    .map((child: any) => mapJmapToMailbox(child, allMailboxes));

  // Map JMAP role to attributes (similar to IMAP special-use flags)
  const attributes: string[] = [];
  if (jmapMailbox.role) {
    switch (jmapMailbox.role) {
      case 'inbox':
        attributes.push('\\Inbox');
        break;
      case 'sent':
        attributes.push('\\Sent');
        break;
      case 'drafts':
        attributes.push('\\Drafts');
        break;
      case 'trash':
        attributes.push('\\Trash');
        break;
      case 'junk':
        attributes.push('\\Junk');
        break;
      case 'archive':
        attributes.push('\\Archive');
        break;
    }
  }

  return {
    name: jmapMailbox.name,
    display_name: jmapMailbox.name,
    attributes,
    is_selectable: true, // JMAP mailboxes are generally selectable
    children,
  };
}

// Build a hierarchical tree from flat list
function buildMailboxTree(mailboxes: readonly any[]): Mailbox[] {
  // Get root mailboxes (no parent)
  const rootMailboxes = mailboxes.filter((m: any) => !m.parentId);
  return rootMailboxes.map((m: any) => mapJmapToMailbox(m, [...mailboxes]));
}

export async function fetchMailboxes(accountId: string): Promise<MailboxesResponse> {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  const jmapMailboxes = await jmapService.getMailboxes(accountId);
  const mailboxTree = buildMailboxTree(jmapMailboxes);

  return {
    mailboxes: mailboxTree,
  };
}
