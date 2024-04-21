# Joongle is the best CMS on Earth

Don't take this project too seriously for now, and don't install it (there are no instructions).

## End goal

To release a modern alternative to systems like Atlassian Confluence for writing internal documentation especially in regulated company with need of audits and access control (IAM). Joongle is not supposed to create general websites (like WordPress), but documentation in a hierarchy, with a good look, theming, good search and easy to hack and, maybe most importantly, Free Software.

## Current status

Unreleased.

### Missing for the first release (MVP)

- Authentication
- Authorization
- Configurability
- Instructions for deployment

## Tech stack
- Fastify
- Mongodb (with transactions)
- Server side JSX (via Preact)
- Alpinejs
- HTMX
- CSS Modules
- esbuild

## Random info
- a cookie is used for csrf protection
- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted
- Alpine "dot" discussion https://github.com/alpinejs/alpine/discussions/4164

## Security
- uses Hamlet
- uses schema validation
- uses CSRF
- uses mongodb sanitizer
- user user input sanitizer
