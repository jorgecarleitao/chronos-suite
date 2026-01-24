# Chronos Suite

A modern communication suite with email, calendar, and contacts built with Preact, Material-UI, and TypeScript against JMAP.

## Features

### 📧 Email Client
- **Modern Compose Experience**
  - Markdown editor with live preview
  - Inline image support (paste from clipboard)
  - File attachments with drag-and-drop
  - Auto-save drafts every 3 seconds
  - CC/BCC support
- **Mailbox Management**
  - Gmail-like layout with sidebar navigation
  - Multiple mailboxes and folders
  - Shared mailbox support
  - Create, rename, and delete folders
- **Message Operations**
  - Bulk actions (select multiple messages)
  - Mark as read/unread, flag, delete
  - Move messages between folders
  - Search and filter messages
- **Rich Message Display**
  - HTML and plain text rendering
  - Attachment preview
  - Participant information

### 📅 Calendar
- **Multiple Views**
  - Week view with hourly time slots
  - Month view with event indicators
  - Event list view
- **Event Management**
  - Create, edit, and delete events
  - All-day and timed events
  - Event recurrence support
  - Add participants and manage RSVPs
- **Smart Features**
  - Next event time shown in browser tab
  - Color-coded calendars
  - Timezone handling
  - Calendar invite parsing

### 👥 Contacts
- Address book integration
- Contact search and management
- Contact details and editing

### For administrators / platform engineers

- Single Page Application deployed from a OCI container or SPA bundle (check [Dockerfile](./Dockerfile))
- Authentication exclusively via OAuth2 against IdP using PKCE and public client
- Interaction with email server exclusively via JMAP protocol

## Known issues
iMIP (iCalendar Message-Based Interoperability Protocol) sending functionality is not working.

**Impact:** Calendar invitations cannot be sent via email. See [Unable to use iMIP with JMAP](https://github.com/stalwartlabs/stalwart/discussions/2700)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
# .env
VITE_OAUTH_AUTHORITY=https://idp.example.com/application/o/mail-client1/
VITE_OAUTH_CLIENT_ID=...
VITE_BASE_URL=http://localhost:5173
VITE_OAUTH_SCOPES=openid email profile
VITE_JMAP_SESSION_ENDPOINT=https://mail.example.com/jmap/session
```

3. Start development server:
```bash
pnpm dev
```

4. Build for production:
```bash
pnpm build
```

## Docker

### Building the image log

```bash
docker build -t chronos-suite .
```

### Running with Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e OAUTH_AUTHORITY=https://idp.example.com/application/o/mail-client1/ \
  -e OAUTH_CLIENT_ID=your-client-id \
  -e BASE_URL=https://mail.yourdomain.com \
  -e OAUTH_SCOPES="openid email profile" \
  -e JMAP_SESSION_ENDPOINT=https://mail.example.com/jmap/session \
  --name chronos-suite \
  chronos-suite
```

### Environment Variables

The Docker container requires the following environment variables at runtime:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OAUTH_AUTHORITY` | Yes | OAuth2 provider authorization endpoint URL | `https://idp.example.com/application/o/mail-client1/` |
| `OAUTH_CLIENT_ID` | Yes | OAuth2 client ID for authentication | `mail-client-abc123` |
| `BASE_URL` | Yes | Public URL where the application is deployed (used for OAuth redirect) | `https://mail.yourdomain.com` |
| `OAUTH_SCOPES` | Yes | OAuth2 scopes to request (space-separated) | `openid email profile` |
| `JMAP_SESSION_ENDPOINT` | Yes | JMAP server session endpoint URL | `https://mail.example.com/jmap/session` |

**Notes:**
- Variables are injected at container startup via `docker-entrypoint.sh`
- The application runs on port `8080` (non-privileged) inside the container
- Nginx serves the static files and handles SPA routing
- No rebuild needed when changing configuration - just restart with new environment variables
