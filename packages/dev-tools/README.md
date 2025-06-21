# Boxedo Dev Tools 🦅

Development workflow tools for the Boxedo monorepo, featuring the mighty **hawk.ts** - a swiss-army-knife build orchestrator.

## Hawk.ts

The star of this package! Hawk handles the entire development workflow:

- **Client building** with esbuild
- **Server compilation** and bundling
- **Asset copying** and vendor management
- **Live reloading** and (almost) hot updates
- **Development server** coordination

## Usage

From the project root:

```bash
npm run dev      # Start development with hawk
npm run build    # Build all packages
```

## Features

Hawk orchestrates complex build tasks:

- Compiles TypeScript to optimized JavaScript
- Bundles client assets with esbuild (including CSS)
- Copies vendor libraries to server assets
- Manages live reload functionality
- Handles both development and production builds
- Watches for changes and lint/rebuild everything as needed

## Architecture

The hawk.ts script uses:
- **esbuild** for fast compilation and bundling
- **File system operations** for asset management
- **Task coordination** across multiple packages
- **Development server integration** for live updates

This centralized approach eliminates the need for complex build configuration in each individual package.

---

📖 **[Back to main documentation](../../README.md)**
