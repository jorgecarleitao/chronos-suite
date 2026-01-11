// API functions for IMAP messages

export async function fetchMessages(mailbox: string) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(
    `${apiUrl}/api/imap/mailboxes/${encodeURIComponent(mailbox)}/messages?limit=50`,
    {
      credentials: 'include',
    }
  );
  if (!response.ok) {
    throw new Error('Failed to load messages');
  }
  return response.json();
}

export async function fetchMessage(mailbox: string, uid: number) {
  const apiUrl = import.meta.env.VITE_API_URL;
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
  const apiUrl = import.meta.env.VITE_API_URL;
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
  const apiUrl = import.meta.env.VITE_API_URL;
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
