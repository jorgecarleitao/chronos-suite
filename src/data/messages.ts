// API functions for IMAP messages

const apiUrl = import.meta.env.VITE_API_URL;

// JSON from the server
interface MessageMetadataWire {
  uid: number;
  flags: string[];
  size?: number;
  from_name?: string;
  from_email?: string;
  to_name?: string;
  to_email?: string;
  subject?: string;
  date: string | null; // RFC3339 in UTC
}

interface MessagesWire {
  messages: MessageMetadataWire[];
  total: number;
}

// What the rest of the app uses
export interface MessageMetadata {
  uid: number;
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

function mapMessageMetadata(wire: MessageMetadataWire): MessageMetadata {
  return {
    uid: wire.uid,
    flags: wire.flags,
    size: wire.size,
    from_name: wire.from_name,
    from_email: wire.from_email,
    to_name: wire.to_name,
    to_email: wire.to_email,
    subject: wire.subject,
    date: parseDate(wire.date),
  };
}

function mapMessages(wire: MessagesWire): Messages {
  return {
    total: wire.total,
    messages: wire.messages.map(mapMessageMetadata),
  };
}

export async function fetchMessages(mailbox: string): Promise<Messages> {
  const response = await fetch(
    `${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages?limit=50`,
    { credentials: 'include' }
  );
  if (!response.ok) {
    throw new Error('Failed to load messages');
  }

  const json = (await response.json()) as MessagesWire;
  return mapMessages(json);
}

export async function fetchMessage(mailbox: string, uid: number) {
  const response = await fetch(
    `${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
    {
      credentials: 'include',
    }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }
  return response.json();
}

export async function sendMessage(to: string[], subject: string, body: string) {
  const response = await fetch(`${apiUrl}/api/smtp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      to,
      subject,
      body,
      cc: [],
      bcc: [],
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send email');
  }
  return response.json();
}

export async function deleteMessage(mailbox: string, uid: number) {
  const response = await fetch(
    `${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages/${uid}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!response.ok) {
    throw new Error('Failed to delete message');
  }
  return response;
}
