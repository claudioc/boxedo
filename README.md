# Boxedo

> [!CAUTION]
> Although at this point the project is relatively stable in terms of MVP features, its quality is to be considered Beta: don't install it on public facing internet website.

---

## Project Status

**(unsupported) Beta**

Use at your own risk!

---

## Vision and Goals

Boxedo's long term vision is to provide a simpler, nicer and more appealing alternative to tools like Atlassian Confluence, tailored for creating internal documentation in regulated environments requiring audit trails and robust access control (IAM). This doesn't mean that Boxedo doesn't work at a smaller scale, in fact it is also amazing as a simple, personal knowledge base engine, similar to Obsidian or Notion but installed on your own server. This is how I use it right now.

Some feature highlights:

- **Hierarchical documentation organization** - pages are in a parent/child relationship to each others, with multiple roots. Single pages or even group of pages can be moved freely around
- **Page history tracking** - using CouchDB's (or PouchDB's)native support for revisions, it's always possible to see what changed over time in any document (but we don't offer "diff" representation at the moment)
- **Basic but functional design** - limited resources for aesthetics at the moment but things should look ok, both on desktop and on mobile. The CSS framework [supports theming](https://daisyui.com/docs/themes/) out-of-the-box, and a theme selection is possible via configuration file
- **Advanced WYSIWYG editor** - Boxedo's content editor is based on a heavily customized [TipTap editor](https://tiptap.dev/) which I believe is at the state-of-the-art of this technology (based on ProseMirror)
- **Multi-database backend** - at his core Boxedo uses a document model database and the flavour I chose is CouchDB. Boxedo uses [PouchDB](https://pouchdb.com/) though, which means that you don't necessarily need to install and run a docker image (or a separate server) to use Boxedo! With PouchDB, you can run Boxedo with a "local" database too - in which case, PouchDB will use LevelDB. There is also a convenient "memory" backend that it's used for test purposes
- **Search capabilities** - a fulltext search capability is integrated in Boxedo by using [Sqlite FTS5](https://www.sqlite.org/fts5.html)
- **Internationalization (i18n)** - only English and Italian are supported at the moment (but only English in terms of search stemming), but the codebase doesn't use hardcode sentences and can be easily translated in any language (it's just a json file to add)
- **Developer-friendly** - Designed for easy hacking from the ground-up
- **Image upload support** - images are also transparently saved in CouchDB/PouchDB. A support script exists to remove unused images
- **Magic link authentication** - You can optionally use an authentication layer (more on this later), but you don't have to maintain any credentials (see below for more details)
- **Powerful CLI** - to manage the database, add accounts, export and more
- **User roles** - users can be added to one of the pre-defined set of roles with different capabilities, to complete administration to inactive

Boxedo is **Free Software**, currently using a MIT license. All its components are also all using a Free Software license.

---

## Missing Features for First Release

### Experimental Authentication support
There are currently two options to authenticate a user to Boxedo:
- no authentication at all
- using magic links

When no application authentication is in place, you can obviously still "protect" your Boxedo-powered website by securing access using a reverse proxy (e.g., nginx) but note that Boxedo won't distinguish between users once "logged in." with that method.

A "magic link" is a link that is sent to a user via email. Following that link, which contains a special identification token, the user is logged in. That's it. There are no password to maintain or any other critical concern.

Configuring the magic link authentication takes a moment, though:
- first, you can only use one of the supported email providers: sendgrid, mailgun or plain smtp. Sendgrid and Mailgun provide a fair amount of free emails that you can send with their services, but you have to "white list" all the emails you want to use beforehand (to avoid abusing their services). If you have a better option, please talk to me and I will add it as a supported provider.
- second, you have to manage your users via the Boxedo CLI, using the commands `user-list`, `user-add`, `user-role` and `user-del`. Note that only a simple, formal validation is performed by the CLI (no email is sent at the moment of the user creation)

Something that is already planned for future releases includes:
- OAuth2 support with a (small) selection of providers
- maybe SAML for more corporate usages
- ability to provision users with an API instead of a CLI for corporate IAM integration

### User roles

When authentication is in place, Boxedo supports assigning a role to each user. The current roles are:
- **admin**: can do anything that the application can offer
- **author**: can write documents but cannot change any website's setting
- **reader**: can only read documents
- **inactive**: cannot even login

### No caching layer

I know how I want to add a caching layer but at this moment Boxedo's features are still a bit a moving target to complicate its workflow and testing with caching. I will revisit this topic later on.

---

## Philosophy behind the architecture
When developing Boxedo, my primary focus was on creating a system that was both simple to modify and quick to deploy, while maintaining a minimal dependency footprint. For a CMS intended to be released as an open-source project, keeping dependencies to a minimum is crucial for ensuring long-term sustainability and maintainability.

Security was another paramount concern from the outset. The system needed to be straightforward to secure and present the smallest possible attack surface. This consideration was particularly important given that the final feature set was still evolving during development. The inherent uncertainty in the feature roadmap further reinforced the need for a flexible yet secure foundation.

These factors led me to architect Boxedo as a server-side rendered application. However, I wanted to leverage the expressiveness and developer experience of JSX as my templating language, even in a server-side context. The combination of Fastify's flexibility and the Kitajs library made this possible while maintaining excellent performance. Even though this approach doesn't provide React's context and hooks (though they could be implemented with some additional work), the trade-off of some prop drilling was acceptable for the benefits gained. I also previously wrote a [starter kit application](https://github.com/claudioc/fastify-htmx-ts-starter-kit) for projects like these, should you like the idea.

For client-side interactivity, including AJAX calls and progressive enhancement, I chose HTMX and Alpine.js instead of writing extensive custom JavaScript. These libraries provide much of the reactivity we've come to expect in modern frontend development, while maintaining a lightweight footprint. While this aspect of Boxedo's codebase currently represents its greatest opportunity for improvement and will likely undergo significant refactoring after the MVP release, it effectively serves the current needs of the project.

### Why CouchDB/PouchDb and not XXX?
PouchDb was chosen because of its built-in features, like document revisions and history tracking, make it ideal for this use case, despite being potentially overscaled for current needs. The project includes sample content from Project Gutenberg's [Fall of the Roman Empire](https://www.gutenberg.org/ebooks/890) for load testing.

PouchDb (CouchDB) scales very well in case in the future we would like to see Boxedo exposed on website using many users and documents.

Images are also saved directly in the database since CouchDB has also a nice support for binary content, like compression, digest, and streaming.

Couchdb also offers, out-of-the-box, and administrative web interface (called Fauxston) at `http://localhost:5984/_utils`. That's _very_ handy indeed. Note that this is only supported if you use Couchdb and not another PouchDB driver (like LevelDB).

PouchDb also offers a memory-only adapter which is great for testing.

The database operations are relatively well decoupled so a version with maybe less features but an easier installation could be present in the future. A completely db-less approach - using just the file system for storing data - could also be an option; in that hypothesis, we could use a "front matter" approach for storing metadata (this very approach is already used when we want to export all the html files).

## Limits of the search

One of the aim of Boxedo is to offer a great user experience, and part of it is of course a good full-test search engine. Since Couchdb doesn't provide anything like that out-of-the-box, during the development several approaches have been tried:

- Couchdb/Pouchdb (native): search the documents using just regular expressions: too limited and not really a full text search (no stemming, no stopwords)
- Using Lunrjs: uses a lot of memory if the document are above several hundreds. Cannot add/remove documents dynamically and cannot export the index (which is then rebuilt at each server restart). Quite reach query language, messy output that needs normalization but also returns each (stemmed) matched term, with its position (very useful for highlighting)
- Using Flexsearch: very small memory footprint and super fast (probably the fastest out there). Can export/import the index once built and allow to dynamically edit the docs in the index. Very poor query language, very poor documentation, very poor result output and still uses memory for the live index
- CouchDB search plugin (Clouseau)[https://docs.couchdb.org/en/stable/install/search.html]: it needs Java and also an old version of it. Installing that plugin can be done in Docker but it will also only work with the CouchDB backend
- [Sqlite FTS5](https://www.sqlite.org/fts5.html) (current solution) is the almost perfect solution, since it has everything I wish for except... it must store a copy of anything that's indexed, so if you index the content of the document, a copy of that content will also be stored in the sql fts database (size and security concern). At the moment this is the tradeoff

> [!CAUTION]
> The current search engine, Sqlite FT5, copies the content in its index (although heavily redacted for performances). This means that if you need to know where exactly your content is, remember that there is another (partial) copy in there. Sqlite runs alongside your application server, so as long as your application server is secure, you should be fine also with the sqlite database: the theory here is that if you can get access to the application server, the security of your content is compromized anyway.

## Technical Stack

- [Fastify](https://www.fastify.io/)
- [PouchDB](https://pouchdb.com/)
  - [CouchDB](https://couchdb.apache.org/) (optional)
  - [LevelDB](https://github.com/google/leveldb) (optional)
- [TipTap](https://tiptap.dev/)
- [Sqlite FTS5](https://www.sqlite.org/fts5.html)
- Server-side JSX rendering with [Kitajs/html](https://github.com/kitajs/html)
- [Alpine.js](https://alpinejs.dev/) and [HTMX](https://htmx.org/)
- [esbuild](https://esbuild.github.io/)
- [biome](https://biome.sh/)
- [DaisyUI](https://daisyui.com/) - based on Tailwind
- [Sortablejs](https://github.com/SortableJS/Sortable)
- [Heroicons](https://heroicons.com/)
- TypeScript
- Docker Compose

---

## Repository structure
Boxedo's repository is a monorepo composed by several semi-independent packages:
- boxedo-cli: this is the code for the client JavaScript which runs in the browser, enhancing the UI
- boxedo-core: a set on library and typings that are shared among the modules. Also contains the localization data
- boxedo-cli: the code for the CLI, command line tools interface for administrative and maintenance tasks
- boxedo-server: the Fastify server which renders the JSX and provides the API layer for the UI client to interface to
- boxedo-dev-tools: hawk.ts is a special swiss-army-knife custom script built to address all the development workflow's task

The relative simplicity of this architecture doesn't need any particular monorepo manager, so everything is under the control of the standard `npm`.

## Installation

### Prerequisites
- nodejs 20+
- docker (optional)
- macOS or linux (my personal deployment uses Ubuntu 24.04). Windows is totally untested.

### Setup
1. Clone the repository
2. Copy environment config: `cp dot.env .env` and edit the values if you feel like
3. Run `npm install`
4. Keep reading…

### The database server
If you decide to use a "local" database (that is, LevelDb), there is nothing else you have to do after you have configured it in the `.env` file. Just keep in mind that in that case, the "database" is not a server but it will just be a bunch of files.

If you prefer to use the "remote" option for a database (that is, CouchDb), then you need to have a running CouchDb server, somewhere. This repository provides you with a docker-compose file and some CLI commands to allow for a quick start with that database configuration. In a production environment, the final configuration is of course up to you, whether you want to use the docker image, a standalone server colocated with the Boxedo server, or another machine altogether for it.

### Running Boxedo
1. if you are using docker, start its demon and then use our CLI command 'db-up' to start the database server
2. Launch the development server with `npm run dev`
3. Access at http://localhost:3000

For a final production environment, I use `pm2` to start and monitor the server. You can check the `pm2-start.sh` script in the root directory for inspiration.

For docker specific instructions, there is also a Docker.md in the docs/ directory where I have written some notes related to my own installation (in Ubuntu 24.04).

### The CLI

Boxedo provides its users and developers with a powerful CLI to perform all sort of tasks, from managing users, export pages, check translation and even releasing the project to Github (although this last one task is supposed to only be used by the core developers!).

To run the CLI, just use the `./packages/cli/boxedo help` command first from the root of the project. A list of the available commands will show. Please note that we will use npx as soon as [#32](https://github.com/claudioc/boxedo/issues/32) is closed.

To run the CLI in [debug](https://www.npmjs.com/package/debug) mode, use `DEBUG=boxedo-cli:* ./cli/boxedo help`.

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

## Troubleshooting

If the npm install fails because of some weird issue with node-gyp and PouchDB, is it possible that either you don't have the `xcode-select` toolchain installed or its installation is somehow problematic (this could happen after a macOS major release upgrade).

Either run a `xcode-select --install` or even `sudo rm -rf /Library/Developer/CommandLineTools` before that ([source](https://github.com/nodejs/node/issues/55023#issuecomment-2363342176)).

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
