# Joongle (codename)

> [!IMPORTANT]
> The name of this project (Joongle) is subject to change in case it will get out of the current "experimental" phase

> [!CAUTION]
> Although at this point the project is relatively stable in terms of MVP features, don't take this project too seriously and most importantly don't install it on public facing internet website.

## Current status

Officially unreleased (and unsupported).

## Project's end goal

Joongle aims to provide a modern alternative to systems like Atlassian Confluence, specifically designed for writing internal documentation in regulated companies that require audit trails and access control (IAM). Unlike general website creation tools such as WordPress, Joongle focuses on organizing documentation hierarchically, offering an "OK" design (can't invest much on it), theming options, search capabilities, and ease of customization. Joongle is also Free Software and aims to stay so forever.

## Secondary goal

Joongle is also the first serious project to put at test some ideas that have been floating in my mind for several months. Those ideas initially gave birth to my [Fastify-HTMX-JSX](https://github.com/claudioc/fastify-htmx-ts-starter-kit) starter kit, so Joongle is basically the first of my project to stem from that starter kit, and of course improve over it adding other bits.

I have been experimenting with several ideas during the development of Joongle and right now I am pretty happy with the development workflow, which is of [primary importance for me](https://claudio.cica.li/posts/2024/using-nodejs-for-everything/). I have tried to keep the dependencies to the bare minimum (more on that later) and although I work with React every day, this project only uses JSX which is server-side rendered (using [Preact](https://preactjs.com/)). The rest of the frontend is managed by [HTMX](https://htmx.org/) for the server interactions and [Alpinejs](https://alpinejs.dev/) for a bit of UI and state management.

## Missing for the a real first release

First and foremost, I want to add some kind of _pluggable_ authentication and authorization later on; I want to lay out all the most important features before deciding who-can-do-what. This means that at this time Joongle **does not provide any login** capability. You use it for yourself, as you own Knowledge Base, or you would help me with adding that feature ;)

Of course, you can always add a basic Auth in front of the server using nginx as reverse proxy (or whatever you are going to use) just to protect access to it, but Joongle won't know who you are once "logged in".

Another important feature that's missing is the support for media (images and/or videos). This is a hard nut to crack and must also be considered "pluggable".

Configurability is also pretty rough; the db configuration for example is spread over at least 2 files (the defaults work out-of-the-box to get you started anyway).

## What is inside, anyway

I think Joongle is pretty packed with features, given the relative youth for the project (and one single developer):
- For editing, Joongle uses the low-level [TipTap editor](https://tiptap.dev/) which is extremely configurable; for now I haven't done any crazy thing with it, so expect pretty basic functionalities when writing your docs
- Supports i18n out of the box, although we only have English translation at the moment
- Basic search capabilities
- Some configuration capabilities directly from the website
- History of changes for each page
- Pretty solid security from the ground up
- a quite primitive but effective autoreload of the pages when you update one of the files. Not HMR of course, but it works
- I try to make hacking it an easy and enjoyable experience (see [my post about the `hawk`](https://claudio.cica.li/posts/2024/using-nodejs-for-everything/)) script I developed for this project specifically

## Tech stack

- Fastify
- Couchdb
- TipTap WYSIWYG editor
- Server side JSX (via Preact)
- Alpinejs
- HTMX
- CSS Modules
- esbuild
- biome
- TypeScript everywhere
- docker compose

## Why couchdb?

I could have chosen several other alternatives of course, but I wanted to use this project to better understand how a document-oriented, schema-less database works. I have never had a lot of experience with any of those, and using a SQL database seemed a bit too comfortable for me. I wanted to look a bit outside of the box.

I initially chose Mongodb, but then I realized that its licensing terms are a bit problematic.

Couchdb is admittedly a bit overkill for this project at this point, but since I work in a big corporation I also know that this for sure is a "future proof" solution in case the documents cardinality will grow exponentially. There is also a `data` directory in the repository, which contains a book I found on the [Project Gutenberg](https://www.gutenberg.org/) about the [Fall of the Roman Empire](https://www.gutenberg.org/ebooks/890) (Public Domain), that I use to load test the application.

Couchdb also offers document's revisions and history out-of-the-box which something that I would have to implement anyway.

## Installation

Requirements:
- nodejs 20+
- docker
- macOS (not tested on linux but it should work)

Clone the repository and:
- `npm install`
- `cp dot.env .env` and change what you want (the default values already work). The DB password is also shared in `compose.yml`
- `npm run db:start` (there is also a `db:stop`)
- `npm run dev`
- now you can open http://localhost:3000

## Random info
- A cookie is used for csrf protection
- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted
- Alpine "dot" discussion https://github.com/alpinejs/alpine/discussions/4164
- Conflicts are managed by checking the revision while saving; only the same revision gets saved

## Security
- uses Hamlet
- uses schema validation
- uses CSRF
- uses query sanitizer
- user user input sanitizer

## Mandatory screenshots

![Screenshot of how reading a page looks like](/docs/any-page.png)

![Screenshot of how the settings page looks like](/docs/settings.png)
