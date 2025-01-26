
## Use couchdb as the cache storage

```ts
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import nano from 'nano'

interface CacheOptions {
  ttl?: number  // Default TTL in milliseconds
}

const cachePlugin: FastifyPluginAsync<CacheOptions> = fp(async (fastify, opts) => {
  const couch = nano('http://localhost:5984')
  const cache = couch.use('cache')

  // Ensure the cache database exists
  try {
    await couch.db.get('cache')
  } catch (err) {
    if (err.statusCode === 404) {
      await couch.db.create('cache')
    } else {
      throw err
    }
  }

  const cacheManager = {
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const doc = await cache.get(key)

        // Check if expired
        if (doc.expiresAt && Date.now() > doc.expiresAt) {
          // We found an expired document, delete it
          await cache.destroy(doc._id, doc._rev)
          return null
        }

        return doc.value
      } catch (err) {
        if (err.statusCode === 404) {
          return null
        }
        throw err
      }
    },

    set: async <T>(key: string, value: T, ttl = opts.ttl): Promise<boolean> => {
      try {
        const expiresAt = ttl ? Date.now() + ttl : undefined

        // Try to get existing document
        let doc
        try {
          doc = await cache.get(key)
        } catch (err) {
          if (err.statusCode !== 404) throw err
        }

        await cache.insert({
          _id: key,
          _rev: doc?._rev,
          value,
          expiresAt,
          updatedAt: Date.now()
        })

        return true
      } catch (err) {
        fastify.log.error(err)
        return false
      }
    },

    reset: async (key?: string): Promise<void> => {
      if (key) {
        try {
          const doc = await cache.get(key)
          await cache.destroy(doc._id, doc._rev)
        } catch (err) {
          if (err.statusCode !== 404) throw err
        }
      } else {
        // Delete and recreate the database
        await couch.db.destroy('cache')
        await couch.db.create('cache')
      }
    }
  }

  // Add a periodic cleanup of expired documents
  const cleanup = async () => {
    const response = await cache.view('cache', 'expired', {
      endkey: Date.now()
    })

    for (const row of response.rows) {
      try {
        await cache.destroy(row.id, row.value)
      } catch (err) {
        fastify.log.error(`Failed to delete expired cache entry ${row.id}:`, err)
      }
    }
  }

  // Run cleanup every hour
  const interval = setInterval(cleanup, 60 * 60 * 1000)

  fastify.addHook('onClose', (instance, done) => {
    clearInterval(interval)
    done()
  })

  // Create views for maintenance
  const designDoc = {
    _id: '_design/cache',
    views: {
      expired: {
        map: function(doc) {
          if (doc.expiresAt) {
            emit(doc.expiresAt, doc._rev);
          }
        }.toString()
      }
    }
  }

  try {
    await cache.insert(designDoc)
  } catch (err) {
    if (err.statusCode !== 409) throw err
  }

  fastify.decorate('cache', cacheManager)
}, {
  name: 'cache-manager'
})

export default cachePlugin
```

