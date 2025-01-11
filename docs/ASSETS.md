## The asset schema

```js
{
  "_id": "asset_abc123...",
  "type": "asset",
  "filename": "original-name.jpg",
  "storagePath": "uploads/abc123...", // or "s3://bucket/key" etc.
  "mimetype": "image/jpeg",
  "size": 12345,
  "references": ["page_xyz", "page_123"],
  "storageType": "FileSystemProvider",
  "createdAt": "2025-01-11T..."
}
```

## The code for the managers

```js
// storageProviders.js
class StorageProvider {
  async save(buffer, filename) { throw new Error('Not implemented'); }
  async get(path) { throw new Error('Not implemented'); }
  async delete(path) { throw new Error('Not implemented'); }
}

class FileSystemProvider extends StorageProvider {
  constructor(config) {
    super();
    this.uploadDir = config.uploadDir || 'uploads';
    this.fs = require('fs').promises;
    this.path = require('path');
  }

  async save(buffer, filename) {
    const filePath = this.path.join(this.uploadDir, filename);
    await this.fs.mkdir(this.path.dirname(filePath), { recursive: true });
    await this.fs.writeFile(filePath, buffer);
    return filePath;
  }

  async get(path) {
    return await this.fs.readFile(path);
  }

  async delete(path) {
    await this.fs.unlink(path);
  }
}

class S3Provider extends StorageProvider {
  constructor(config) {
    super();
    const { S3 } = require('@aws-sdk/client-s3');
    this.s3 = new S3(config.s3Config);
    this.bucket = config.bucket;
    this.prefix = config.prefix || '';
  }

  async save(buffer, filename) {
    const key = this.prefix + filename;
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: buffer
    });
    return key;
  }

  async get(key) {
    const result = await this.s3.getObject({
      Bucket: this.bucket,
      Key: key
    });
    return result.Body;
  }

  async delete(key) {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key
    });
  }
}

// assetManager.js
class AssetManager {
  constructor(config) {
    this.db = config.db;  // CouchDB assets database
    this.storage = config.storageProvider;
    this.allowedTypes = config.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];
    this.maxSize = config.maxSize || 5 * 1024 * 1024;
  }

  async saveAsset(file, metadata = {}) {
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
    if (file.size > this.maxSize) {
      throw new Error('File too large');
    }

    // Generate unique filename
    const ext = path.extname(file.filename);
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;

    // Save the binary data
    const storagePath = await this.storage.save(file.buffer, uniqueName);

    // Save metadata in CouchDB
    const assetDoc = {
      _id: `asset_${uniqueName}`,
      type: 'asset',
      filename: file.filename,
      storagePath,
      mimetype: file.mimetype,
      size: file.size,
      metadata,
      references: [], // Documents that reference this asset
      createdAt: new Date().toISOString(),
      storageType: this.storage.constructor.name
    };

    const result = await this.db.insert(assetDoc);
    return { id: result.id, ...assetDoc };
  }

  async getAsset(id) {
    const doc = await this.db.get(id);
    const buffer = await this.storage.get(doc.storagePath);
    return {
      ...doc,
      buffer
    };
  }

  async deleteAsset(id) {
    const doc = await this.db.get(id);

    // Only delete if no references exist
    if (doc.references && doc.references.length > 0) {
      throw new Error('Asset is still referenced by documents');
    }

    // Delete binary data
    await this.storage.delete(doc.storagePath);

    // Delete metadata
    await this.db.destroy(doc._id, doc._rev);
  }

  // Reference management methods...
  async addReference(assetId, documentId) {
    const doc = await this.db.get(assetId);
    if (!doc.references.includes(documentId)) {
      doc.references.push(documentId);
      await this.db.insert(doc);
    }
  }

  async removeReference(assetId, documentId) {
    const doc = await this.db.get(assetId);
    doc.references = doc.references.filter(ref => ref !== documentId);
    await this.db.insert(doc);

    // If no more references, delete the asset
    if (doc.references.length === 0) {
      await this.deleteAsset(assetId);
    }
  }
}

// Example usage
const manager = new AssetManager({
  db: nano.use('cms_assets'),
  storageProvider: new FileSystemProvider({ uploadDir: './uploads' })
  // OR
  // storageProvider: new S3Provider({
  //   s3Config: { region: 'us-east-1', credentials: {...} },
  //   bucket: 'my-cms-assets',
  //   prefix: 'uploads/'
  // })
});
```

## The asset reference manager schema

Claude made a bit of mess around here: on a first try it created this class, but in the final example it didn't and instead used an helper to add to the create/update/delete routes (see down below)

```js
// assetReferences.js
class AssetReferenceManager {
  constructor(db) {
    this.db = db;
  }

  async addReference(assetId, documentId) {
    try {
      const asset = await this.db.get(assetId);

      // Initialize or update references array
      asset.references = asset.references || [];
      if (!asset.references.includes(documentId)) {
        asset.references.push(documentId);
        await this.db.insert(asset);
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error(`Asset ${assetId} not found`);
      }
      throw error;
    }
  }

  async removeReference(assetId, documentId) {
    try {
      const asset = await this.db.get(assetId);

      if (asset.references) {
        asset.references = asset.references.filter(ref => ref !== documentId);

        // If no more references, mark for deletion
        if (asset.references.length === 0) {
          asset._deleted = true;
        }

        await this.db.insert(asset);
      }
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  async cleanupDocumentAssets(documentId) {
    // Query view to find all assets referenced by this document
    const result = await this.db.view('assets', 'by_reference', {
      key: documentId
    });

    // Remove references and potentially delete unreferenced assets
    for (const row of result.rows) {
      await this.removeReference(row.id, documentId);
    }
  }

  // Parse document content to find asset references
  extractAssetIds(content) {
    // This is a simple example - adjust regex based on your content structure
    const assetPattern = /asset_[a-f0-9]{32}/g;
    return [...new Set(content.match(assetPattern) || [])];
  }

  // Handle document updates
  async handleDocumentUpdate(oldDoc, newDoc) {
    const oldAssets = oldDoc ? this.extractAssetIds(JSON.stringify(oldDoc)) : [];
    const newAssets = this.extractAssetIds(JSON.stringify(newDoc));

    // Remove references that no longer exist
    for (const assetId of oldAssets) {
      if (!newAssets.includes(assetId)) {
        await this.removeReference(assetId, newDoc._id);
      }
    }

    // Add new references
    for (const assetId of newAssets) {
      if (!oldAssets.includes(assetId)) {
        await this.addReference(assetId, newDoc._id);
      }
    }
  }
}

// CouchDB views needed for asset reference management
const assetViews = {
  _id: '_design/assets',
  views: {
    by_reference: {
      map: function(doc) {
        if (doc.type === 'asset' && doc.references) {
          for (var i = 0; i < doc.references.length; i++) {
            emit(doc.references[i], 1);
          }
        }
      }
    },
    orphaned: {
      map: function(doc) {
        if (doc.type === 'asset' && (!doc.references || doc.references.length === 0)) {
          emit(doc._id, 1);
        }
      }
    }
  }
};

module.exports = { AssetReferenceManager, assetViews };
```

## The other approach for reference management

```js
  // Helper to extract asset IDs from document content
  function extractAssetIds(content) {
    // Adjust these patterns based on how assets are referenced in your content
    const patterns = [
      // Match markdown image syntax: ![alt](asset_123abc...)
      /!\[.*?\]\(asset_[a-f0-9]+\)/g,
      // Match HTML img tags: <img src="asset_123abc..." />
      /<img[^>]*?src="(asset_[a-f0-9]+)"[^>]*?>/g,
      // Match direct asset references: asset_123abc...
      /asset_[a-f0-9]+/g
    ];

    const assetIds = new Set();
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        // Extract just the asset_id part
        const assetId = match.match(/asset_[a-f0-9]+/)[0];
        assetIds.add(assetId);
      });
    }

    return Array.from(assetIds);
  }
```

and in the create/update do something like

```js
        // Extract asset IDs from old and new content
        const oldAssetIds = oldDoc ? extractAssetIds(JSON.stringify(oldDoc)) : [];
        const newAssetIds = extractAssetIds(JSON.stringify(document));

        // Remove references that no longer exist
        for (const assetId of oldAssetIds) {
          if (!newAssetIds.includes(assetId)) {
            await assetManager.removeReference(assetId, id);
          }
        }

        // Add new references
        for (const assetId of newAssetIds) {
          if (!oldAssetIds.includes(assetId)) {
            await assetManager.addReference(assetId, id);
          }
        }
```

and in the delete route

```js
        // Extract all asset IDs
        const assetIds = extractAssetIds(JSON.stringify(doc));

        // Remove all asset references
        for (const assetId of assetIds) {
          await assetManager.removeReference(assetId, id);
        }
```


## The fastify plugin

```js
// assetRoutes.js
const fp = require('fastify-plugin');
const mime = require('mime-types');

async function assetRoutes(fastify, options) {
  const { assetManager } = options;

  // Schema for the upload response
  const assetResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      filename: { type: 'string' },
      mimetype: { type: 'string' },
      size: { type: 'number' },
      createdAt: { type: 'string' }
    }
  };

  // Schema for error responses
  const errorSchema = {
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      error: { type: 'string' },
      message: { type: 'string' }
    }
  };

  // Upload route
  fastify.post('/assets', {
    config: {
      // Enable multipart support for this route
      multipart: true,
    },
    schema: {
      response: {
        200: assetResponseSchema,
        400: errorSchema,
        413: errorSchema,
        415: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      try {
        // Get the uploaded file
        const data = await request.file();

        if (!data) {
          reply.code(400);
          throw new Error('No file uploaded');
        }

        // Get additional metadata from request
        const metadata = request.body || {};

        // Save the asset
        const result = await assetManager.saveAsset(data, metadata);

        reply.code(200).send({
          id: result.id,
          filename: result.filename,
          mimetype: result.mimetype,
          size: result.size,
          createdAt: result.createdAt
        });

      } catch (error) {
        if (error.message === 'File type not allowed') {
          reply.code(415);
        } else if (error.message === 'File too large') {
          reply.code(413);
        } else if (!reply.statusCode || reply.statusCode === 200) {
          reply.code(500);
        }

        throw error;
      }
    }
  });

  // Retrieve route
  fastify.get('/assets/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        404: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const asset = await assetManager.getAsset(request.params.id);

        // Set appropriate headers
        reply
          .header('Content-Type', asset.mimetype)
          .header('Content-Length', asset.size)
          .header('Cache-Control', 'public, max-age=31536000')
          .header('ETag', `"${asset._rev}"`)
          .header('Content-Disposition', `inline; filename="${encodeURIComponent(asset.filename)}"`);

        // Handle conditional requests
        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch === `"${asset._rev}"`) {
          return reply.code(304).send();
        }

        return reply.send(asset.buffer);

      } catch (error) {
        if (error.statusCode === 404) {
          reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Asset not found'
          });
        } else {
          reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Error retrieving asset'
          });
        }
      }
    }
  });

  // Delete route
  fastify.delete('/assets/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        400: errorSchema,
        404: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      try {
        await assetManager.deleteAsset(request.params.id);
        reply.send({ message: 'Asset deleted successfully' });
      } catch (error) {
        if (error.message === 'Asset is still referenced by documents') {
          reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: error.message
          });
        } else if (error.statusCode === 404) {
          reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Asset not found'
          });
        } else {
          reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Error deleting asset'
          });
        }
      }
    }
  });
}

module.exports = fp(assetRoutes, {
  name: 'asset-routes',
  dependencies: ['@fastify/multipart']
});
```

## How to use the route

```js
const fastify = require('fastify');
const multipart = require('@fastify/multipart');
const { AssetManager } = require('./assetManager');
const { FileSystemProvider } = require('./storageProviders');
const assetRoutes = require('./assetRoutes');

const app = fastify();

// Register multipart support
app.register(multipart);

// Create asset manager instance
const assetManager = new AssetManager({
  db: nano.use('cms_assets'),
  storageProvider: new FileSystemProvider({ uploadDir: './uploads' })
});

// Register asset routes
app.register(assetRoutes, { assetManager });
```
