import { jmapService } from './jmapClient';

export interface Draft {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

// Mailbox cache to map names to IDs
let mailboxCache: Map<string, any> | null = null;

async function getMailboxByName(name: string) {
  if (!mailboxCache) {
    const mailboxes = await jmapService.getMailboxes();
    mailboxCache = new Map(mailboxes.map((m: any) => [m.name.toLowerCase(), m]));
  }
  return mailboxCache.get(name.toLowerCase());
}

// Create a new draft
export async function createDraft(mailbox: string, draft: Draft) {
  // For JMAP, we'll need to implement draft saving
  // This is a simplified version - JMAP drafts are more complex
  throw new Error('Draft creation not yet implemented for JMAP');
}

// Update an existing draft
export async function updateDraft(mailbox: string, uid: number, draft: Draft) {
  throw new Error('Draft update not yet implemented for JMAP');
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
    if (jmapEmail.keywords.$seen) flags.push('\\Seen');
    if (jmapEmail.keywords.$flagged) flags.push('\\Flagged');
    if (jmapEmail.keywords.$draft) flags.push('\\Draft');
    if (jmapEmail.keywords.$answered) flags.push('\\Answered');
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
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export async function fetchMessages(mailbox: string): Promise<Messages> {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  // Get mailbox ID from name
  const mailboxObj = await getMailboxByName(mailbox);
  const mailboxId = mailboxObj?.id;
  
  const emails = await jmapService.getEmails(mailboxId, 50);
  
  return {
    messages: emails.map(mapJmapToMessageMetadata),
    total: emails.length, // JMAP query response has totalCount, but we'd need to modify getEmails
  };
}

export async function fetchMessage(mailbox: string, uid: number) {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  // We need to find the email ID from the UID
  // Since UID is a hash, we'll need to search by fetching messages
  const messages = await fetchMessages(mailbox);
  const messageMetadata = messages.messages.find(m => m.uid === uid);
  
  if (!messageMetadata?.id) {
    throw new Error('Message not found');
  }
  
  const email = await jmapService.getEmail(messageMetadata.id);
  
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
  
  return {
    uid: messageMetadata.uid,
    id: email.id,
    from_name: from?.name,
    from_email: from?.email,
    to_name: to?.name,
    to_email: to?.email,
    subject: email.subject,
    date: parseDate(email.receivedAt),
    body: bodyText,
    has_attachments: email.hasAttachment,
  };
}

export async function sendMessage(to: string[], subject: string, body: string) {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  const result = await jmapService.sendEmail({
    to: to.map(email => ({ email })),
    subject,
    bodyText: body,
  });
  
  return result;
}

export async function deleteMessage(mailbox: string, uid: number) {
  if (!jmapService.isInitialized()) {
    throw new Error('JMAP client not initialized. Please log in first.');
  }

  // Find the email ID from the UID
  const messages = await fetchMessages(mailbox);
  const messageMetadata = messages.messages.find(m => m.uid === uid);
  
  if (!messageMetadata?.id) {
    throw new Error('Message not found');
  }
  
  // Get the trash mailbox
  const trashMailbox = await getMailboxByName('Trash') || await getMailboxByName('Deleted');
  
  if (!trashMailbox) {
    throw new Error('Trash mailbox not found');
  }
  
  await jmapService.deleteEmail(messageMetadata.id, trashMailbox.id);
}
