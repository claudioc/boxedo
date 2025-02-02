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

Joongle's long term vision is to provide a nicer and more appealing alternative to tools like Atlassian Confluence, tailored for creating internal documentation in regulated environments requiring audit trails and robust access control (IAM). This doesn't mean that Joongle doesn't work at a smaller scale, in fact it is also amazing as a simple, personal knowledge base engine, similar to Obsidian or Notion but installed on your own server. This is how I use it right now.

Some feature highlights:

- **Hierarchical documentation organization** - pages are in a parent/child relationship to each others, with multiple roots. Single pages or even group of pages can be moved freely around
- **Page history tracking** - using CouchDB's native support for revisions, it's always possible to see what changed over time in any document (but we don't offer "diff" representation at the moment)
- **Basic but functional design** - limited resources for aesthetics at the moment but things should look ok, both on desktop and on mobile
- **Advanced WYSIWYG editor** - Joongle's content editor is based on a heavily customized [TipTap editor](https://tiptap.dev/) which I believe is at the state-of-the-art of this technology (based on ProseMirror)
- **Search capabilities** - search is there, but is currently limited to what Couchdb offers out of the box. In bigger installations, adding something like OpenSearch (formerly ElasticSearch) should be pretty easy given the replication feature of CouchDB
- **Support tools** - the repository comes with tools for backing up, restoring and exporting the db. Additionally, other tools are present to provide a nice development experience, like translations keys managers and pm2 helpers
- **Internationalization (i18n)** - only English is supported at the moment, but the codebase doesn't use hardcode sentences and can be easily translated in any language (it's just a json file to add)
- **Developer-friendly** - Designed for easy hacking from the ground-up
- **Image upload support** - images are also transparently saved in CouchDB. A support script exists to remove unused images

Joongle is **Free Software**, currently using a MIT license. All its components are also all using a Free Software license.

---

## Missing Features for First Release

### No Authentication & Authorization
Currently, Joongle lacks a built-in login or user management features. Planned improvements include pluggable authentication and authorization systems. I want to lay out all the most important features before deciding who-can-do-what. This means that at this time Joongle **does not provide any login** capability, and there is no concept of "user" whatsoever. You use it for yourself, as you own Knowledge Base, or you would help me with adding that feature

In the interim, you can secure access using a reverse proxy (e.g., nginx) but note that Joongle won't distinguish between users once "logged in."

At this very moment there is already an experimental support for authentication using Magic Links, which you would setup using the "email" configuration group: *this is not active yet*, so do not use it.

### No caching layer

I know how I want to add a caching layer but at this moment Joongle's features are still a bit a moving target to complicate its workflow and testing with caching. I will revisit this topic later on.

---

## Philosophy behind the architecture
When developing Joongle, my primary focus was on creating a system that was both simple to modify and quick to deploy, while maintaining a minimal dependency footprint. For a CMS intended to be released as an open-source project, keeping dependencies to a minimum is crucial for ensuring long-term sustainability and maintainability.

Security was another paramount concern from the outset. The system needed to be straightforward to secure and present the smallest possible attack surface. This consideration was particularly important given that the final feature set was still evolving during development. The inherent uncertainty in the feature roadmap further reinforced the need for a flexible yet secure foundation.

These factors led me to architect Joongle as a server-side rendered application. However, I wanted to leverage the expressiveness and developer experience of JSX as my templating language, even in a server-side context. The combination of Fastify's flexibility and the Kitajs library made this possible while maintaining excellent performance. While this approach doesn't provide React's context and hooks (though they could be implemented with some additional work), the trade-off of some prop drilling was acceptable for the benefits gained. I also previously wrote a [starter kit application](https://github.com/claudioc/fastify-htmx-ts-starter-kit) for projects like these, should you like the idea.

For client-side interactivity, including AJAX calls and progressive enhancement, I chose HTMX and Alpine.js instead of writing extensive custom JavaScript. These libraries provide much of the reactivity we've come to expect in modern frontend development, while maintaining a lightweight footprint. While this aspect of Joongle's codebase currently represents its greatest opportunity for improvement and will likely undergo significant refactoring after the MVP release, it effectively serves the current needs of the project.

### Why CouchDB and not XXX?
CouchDB was chosen to explore document-oriented, schema-less database architecture. Its built-in features like document revisions and history tracking make it ideal for this use case, despite being potentially overscaled for current needs. The project includes sample content from Project Gutenberg's [Fall of the Roman Empire](https://www.gutenberg.org/ebooks/890) for load testing.

CouchDB scales very well in case in the future we would like to see Joongle exposed on website using many users and documents.

Images are also saved directly in the database since CouchDB has also a nice support for binary content, like compression, digest, and streaming.

Couchdb also offers, out-of-the-box, and administrative web interface (called Fauxston) at `http://localhost:5984/_utils`. That's _very_ handy indeed.

The database operations are relatively well decoupled so a version with maybe less features but an easier installation could be present in the future. I am thinking SQLite for example. A completely db-less approach - using just the file system for storing data - could also be an option; in that hypothesis, we could use a "front matter" approach for storing metadata (this very approach is already used when we want to export all the html files).

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

## Installation

### Prerequisites
- nodejs 20+
- docker
- macOS or linux (my personal deployment uses Ubuntu 24.04)

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

### Mobile editing

![Screenshot of how editing a page on mobile looks like](/docs/edit-mobile.png)

### Editing selection's bubble menu

![Screenshot of how the bubble menu looks like](/docs/bubble-menu.png)

### New paragraph's bubble menu

![Screenshot of how the bubble menu of a new paragraph looks like](/docs/new-para.png)


### Settings

![Screenshot of how the settings page looks like](/docs/settings.png)
