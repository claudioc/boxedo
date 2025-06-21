# Boxedo Server

The Fastify-based server that powers Boxedo, handling JSX rendering, API endpoints, and database interactions.

## Features

- **Server-side JSX rendering** with [Kitajs/html](https://github.com/kitajs/html)
- **Database support** for PouchDB/CouchDB and LevelDB
- **Full-text search** with SQLite FTS5
- **Security features** including CSRF protection, input sanitization, and Helmet
- **File uploads** with image processing via Sharp
- **Email notifications** with Nodemailer

## Architecture

- **Framework**: Fastify with TypeScript
- **Rendering**: Server-side JSX
- **Database**: PouchDB (with CouchDB or LevelDB adapters)
- **Search**: SQLite FTS5
- **Styling**: TailwindCSS with DaisyUI
- **Validation**: JSON Schema with AJV

## Development

The server is built and managed by the hawk.ts build tool. Key dependencies:

- `fastify` - Web framework
- `@kitajs/html` - JSX rendering
- `pouchdb-*` - Database adapters
- `better-sqlite3` - Search indexing
- `sharp` - Image processing

## Configuration

Server configuration is handled via environment variables defined in `.env`. See the main documentation for setup details.

---

📖 **[Back to main documentation](../../README.md)**
