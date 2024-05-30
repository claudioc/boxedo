# Joongle is the best CMS on Earth

Don't take this project too seriously for now, and don't install it (there are no instructions).

## End goal

Joongle aims to provide a modern alternative to systems like Atlassian Confluence, specifically designed for writing internal documentation in regulated companies that require audit trails and access control (IAM). Unlike general website creation tools such as WordPress, Joongle focuses on organizing documentation hierarchically, offering an "OK" appearance, theming options, search capabilities, and ease of customization. Additionally, and perhaps most importantly, Joongle is committed to being Free Software forever.

## Current status

Unreleased.

### Missing for the first release (MVP)

- Authentication
- Authorization
- Configurability
- Instructions for deployment
- More tests

## Tech stack
- Fastify
- Couchdb
- TipTap WYSIWYG editor
- Server side JSX (via Preact)
- Alpinejs
- HTMX
- CSS Modules
- esbuild

## Random info
- A cookie is used for csrf protection
- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted
- Alpine "dot" discussion https://github.com/alpinejs/alpine/discussions/4164
- Conflicts are managed by checking the revision while saving; only the same revision gets saved
-
## Security
- uses Hamlet
- uses schema validation
- uses CSRF
- uses query sanitizer
- user user input sanitizer
