# Boxedo Core

Shared libraries, types, and utilities used across all Boxedo packages. This package contains the common foundation that other packages depend on.

## Contents

- **TypeScript types** and interfaces
- **Shared utilities** and helper functions
- **Localization data** and translation strings
- **Common configurations** and base settings
- **Validation schemas** with AJV

## Key Dependencies

- **[AJV](https://ajv.js.org/)** - JSON Schema validation
- **ajv-formats** - Additional validation formats

## Structure

```
packages/core/
├── types/          # TypeScript type definitions
├── utils/          # Shared utility functions
├── locales/        # Translation files
├── schemas/        # JSON schemas for validation
└── config/         # Base configurations
```

## Usage

Other packages import from core like:

```typescript
import { SomeType } from 'boxedo-core/types'
import { validateSchema } from 'boxedo-core/validation'
import { formatDate } from 'boxedo-core/utils'
```

This package serves as the foundation that keeps the monorepo's packages in sync with shared types and utilities.

---

📖 **[Back to main documentation](../../README.md)**
