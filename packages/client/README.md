# Boxedo Client

The browser-side JavaScript that enhances Boxedo's user interface with rich interactivity and editing capabilities.

## Features

- **Rich text editing** with TipTap editor
- **Interactive UI** powered by Alpine.js and HTMX
- **Drag & drop** functionality with SortableJS
- **Real-time updates** and progressive enhancement
- **Table editing** and content management tools

## Key Technologies

- **[TipTap](https://tiptap.dev/)** - Rich text editor with extensions for:
  - Tables, links, images
  - Text formatting and alignment
  - Bubble and floating menus
- **[Alpine.js](https://alpinejs.dev/)** - Reactive UI framework
- **[HTMX](https://htmx.org/)** - Modern HTML interactions
- **[SortableJS](https://github.com/SortableJS/Sortable)** - Drag and drop

## Build Process

The client code is:
1. Bundled with esbuild via hawk.ts
2. Copied to `packages/server/assets/js/`
3. Served as static assets by the Fastify server

The build process handles:
- TypeScript compilation
- Asset bundling and optimization
- Hot reloading in development
- Vendor asset management

## Development

Client assets are automatically rebuilt when files change during development. The hawk.ts tool manages the entire build pipeline.

---

📖 **[Back to main documentation](../../README.md)**
