# Joongle (codename)

> [!IMPORTANT]
> The name of this project (Joongle) is subject to change in case it will get out of the current "experimental" phase

> [!CAUTION]
> Although at this point the project is relatively stable in terms of MVP features, its quality is to be considered Alpha: don't install it on public facing internet website.

---

## Project Status

**Unreleased** (and unsupported).

---

## Vision and Goals

### Primary (End) Goal
Joongle aims to provide a modern alternative to tools like Atlassian Confluence, tailored for creating internal documentation in regulated environments requiring audit trails and robust access control (IAM). Unlike general-purpose website builders such as WordPress, Joongle focuses on:
- **Hierarchical documentation organization**
- **Basic but functional design** (limited resources for aesthetics at the moment)
- **Theming and search capabilities**
- **Ease of customization**

Joongle is and will remain **Free Software**, currently using a MIT license.

### Secondary goal

Joongle is also the first serious project to put at test some ideas that have been floating in my mind for several months. Those ideas initially gave birth to my [Fastify-HTMX-JSX](https://github.com/claudioc/fastify-htmx-ts-starter-kit) starter kit, so Joongle is basically the first of my projects to stem from that starter kit, and of course improve over it adding other bits.

I have been experimenting with several ideas during the development of Joongle and right now I am pretty happy with the development workflow, which is of [primary importance for me](https://claudio.cica.li/posts/2024/using-nodejs-for-everything/). I have tried to keep the dependencies to the bare minimum (more on that later) and although I work with React every day, this project only uses JSX which is server-side rendered (using [Kitajs](https://github.com/kitajs/html)). The rest of the frontend is managed by [HTMX](https://htmx.org/) for the server interactions and [Alpinejs](https://alpinejs.dev/) for a bit of UI and state management.

---

## Missing Features for First Release

### No Authentication & Authorization
Currently, Joongle lacks built-in login or user management features. Planned improvements include pluggable authentication and authorization systems. I want to lay out all the most important features before deciding who-can-do-what. This means that at this time Joongle **does not provide any login** capability, and there is no concept of "user" whatsoever. You use it for yourself, as you own Knowledge Base, or you would help me with adding that feature

In the interim, you can secure access using a reverse proxy (e.g., nginx) but note that Joongle won't distinguish between users once "logged in."

### Configuration
Configuration is rudimentary and spans multiple files. Default settings work out of the box for quick experimentation.

---

## Features

Despite its experimental nature, Joongle already includes:

- **Content editing**: Powered by [TipTap](https://tiptap.dev/) for a intuitive WYSIWYG functionality. Joongle contains several custom extensions.
- **Internationalization (i18n)**: Only English is supported at the moment, but the codebase doesn't use hardcode sentences
- **Basic search capabilities**
- **Page history tracking**: Includes revisions.
- **Configurable settings**: Directly adjustable from the web UI.
- **Developer-friendly**: Designed for easy hacking.
- **Autoreload on file change**: Not HMR but the next best thing
- **Page reordering using drag & drop**
- **Editor's bubble menu for commands**
- **Image upload support**
- **Export and maintenance tasks** included

---

## Technical Stack

- [Fastify](https://www.fastify.io/)
- [CouchDB](https://couchdb.apache.org/)
- [TipTap](https://tiptap.dev/)
- Server-side JSX rendering with [Kitajs/html](https://github.com/kitajs/html)
- [Alpine.js](https://alpinejs.dev/) and [HTMX](https://htmx.org/)
- CSS Modules
- [esbuild](https://esbuild.github.io/)
- [biome](https://biome.sh/)
- [Bulma CSS](https://bulma.io)
- [Sortablejs](https://github.com/SortableJS/Sortable)
- [Heroicons](https://heroicons.com/)
- TypeScript
- Docker Compose

---

## Why couchdb?

CouchDB was chosen to explore document-oriented, schema-less database architecture. Its built-in features like document revisions and history tracking make it ideal for this use case, despite being potentially overscaled for current needs. The project includes sample content from Project Gutenberg's [Fall of the Roman Empire](https://www.gutenberg.org/ebooks/890) for load testing.

CouchDB scales very well in case in the future we would like to see Joongle exposed on website using many users and documents.

Images are also saved directly in the database since CouchDB has also a nice support for binary content, like compression, digest, and streaming.

Couchdb also offers, out-of-the-box, and administrative web interface (called Fauxston) at `http://localhost:5984/_utils`. That's _very_ handy indeed.

The database operations are relatively well decoupled so a version with maybe less features but an easier installation could be present in the future. I am thinking SQLite for example. A completely db-less approach - using just the file system for storing data - could also be an option; in that hypothesis, we could use a "front matter" approach for storing metadata (this very approach is already used when we want to export all the html files).

---

## Installation

### Prerequisites
- nodejs 20+
- docker
- macOS or linux (my installation uses Ubuntu 24.04)

### Setup
1. Clone the repository
2. Copy environment config: `cp dot.env .env` and edit the values if you feel like
3. Run `npm install`
4. Start the database: `npm run db:start`
5. Launch development server: `npm run dev`
6. Access at http://localhost:3000

For docker specific instructions, there is also a Docker.md in the docs/ directory where I have written some notes related to my own installation (in Ubuntu 24.04).

---

## Security and other stuff
- uses Hamlet
- uses schema validation
- uses CSRF
- uses query sanitizer
- user user input sanitizer
- A cookie is used for csrf protection
- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted
- Alpine "dot" discussion https://github.com/alpinejs/alpine/discussions/4164
- Conflicts are managed by checking the revision while saving; only the same revision gets saved

---

## Mandatory screenshots

### Reading a page

![Screenshot of how reading a page looks like](/docs/any-page.png)

### Creating a page

![Screenshot of how editing a page looks like](/docs/creating-page.png)

### Settings

![Screenshot of how the settings page looks like](/docs/settings.png)
