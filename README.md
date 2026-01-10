# Mail Client Frontend

A modern email client frontend built with Preact, Material-UI, and TypeScript.

## Features

- **Gmail-like Layout**: Mailboxes on the left sidebar, message list in the center
- **OAuth2 Authentication**: Secure login through the directory service
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Theme toggle support
- **Internationalization**: Multi-language support with i18next

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API URLs
```

3. Start development server:
```bash
pnpm dev
```

4. Build for production:
```bash
pnpm build
```

## Configuration

Environment variables in `.env`:

- `VITE_API_URL`: Mail API backend URL (default: `http://localhost:3000`)
- `VITE_DIRECTORY_URL`: Directory/Auth service URL (default: `http://localhost:8080`)

## Technology Stack

- **Preact**: Lightweight React alternative
- **Material-UI**: React component library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **i18next**: Internationalization framework
- **preact-router**: Client-side routing
