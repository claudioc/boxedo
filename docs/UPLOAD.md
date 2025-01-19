
## Couchdb definition for attachment (example)

```json
{
  "_id": "image123",
  "_attachments": {
    "image.jpg": {
      "content_type": "image/jpeg",
      "revpos": 2,
      "digest": "md5-jNmxbH1oC0NVQuFMYhQK2w==",
      "length": 23784,
      "stub": true  // indicates the actual data isn't included
    }
  }
}
```

## How to uplaod files to couchdb (without resizing)
```ts
import { FastifyInstance } from 'fastify'
import { Readable } from 'stream'
import fastifyMultipart from '@fastify/multipart'
import nano from 'nano'

export async function uploadRoutes(fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart)

  const couch = nano('http://localhost:5984')
  const attachments = couch.use('attachments')

  fastify.post('/upload', async function (request, reply) {
    try {
      const data = await request.file()

      if (!data) {
        throw new Error('No file uploaded')
      }

      const docId = `${Date.now()}_${data.filename}`

      // Create a minimal document with just the essential metadata
      const doc = {
        _id: docId,
        originalName: data.filename,
        mimetype: data.mimetype,
        uploadDate: new Date().toISOString()
      }

      const { rev } = await attachments.insert(doc)

      // Convert the upload buffer to a readable stream
      const buffer = await data.toBuffer()
      const stream = Readable.from(buffer)

      await attachments.attachment.insert(
        docId,
        data.filename,
        stream,
        data.mimetype,
        { rev }
      )

      return {
        success: true,
        id: docId,
        filename: data.filename
      }

    } catch (err) {
      request.log.error(err)
      throw err
    }
  })

  fastify.get('/files/:id/:filename', async function (request, reply) {
    const { id, filename } = request.params as { id: string, filename: string }

    try {
      const doc = await attachments.get(id)
      const stream = await attachments.attachment.get(id, filename)

      reply.type(doc.mimetype)
      return stream

    } catch (err) {
      request.log.error(err)
      throw err
    }
  })
}
```

## Upload file (with resizing)

```ts
import { FastifyInstance } from 'fastify'
import { Readable } from 'stream'
import fastifyMultipart from '@fastify/multipart'
import sharp from 'sharp'
import nano from 'nano'

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 85  // Good balance between quality and size

export async function uploadRoutes(fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart)

  const couch = nano('http://localhost:5984')
  const attachments = couch.use('attachments')

  fastify.post('/upload', async function (request, reply) {
    try {
      const data = await request.file()

      if (!data) {
        throw new Error('No file uploaded')
      }

      // Check if it's an image
      if (!data.mimetype.startsWith('image/')) {
        throw new Error('Only images are allowed')
      }

      const buffer = await data.toBuffer()

      // Get image info
      const imageInfo = await sharp(buffer).metadata()

      // Determine if resizing is needed
      const needsResize = (imageInfo.width || 0) > MAX_DIMENSION ||
                         (imageInfo.height || 0) > MAX_DIMENSION

      // Process image if needed
      let processedBuffer = buffer
      if (needsResize) {
        processedBuffer = await sharp(buffer)
          .resize(MAX_DIMENSION, MAX_DIMENSION, {
            withoutEnlargement: true,  // Don't upscale smaller images
            fit: 'inside',             // Maintain aspect ratio
          })
          .jpeg({ quality: JPEG_QUALITY }) // Convert to JPEG with good quality
          .toBuffer()
      }

      const docId = `${Date.now()}_${data.filename}`

      // Store original image metadata
      const doc = {
        _id: docId,
        originalName: data.filename,
        originalMimetype: data.mimetype,
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        originalDimensions: {
          width: imageInfo.width,
          height: imageInfo.height
        },
        uploadDate: new Date().toISOString()
      }

      const { rev } = await attachments.insert(doc)

      // Store the processed image
      const stream = Readable.from(processedBuffer)

      await attachments.attachment.insert(
        docId,
        data.filename,
        stream,
        'image/jpeg', // We're converting everything to JPEG
        { rev }
      )

      return {
        success: true,
        id: docId,
        filename: data.filename,
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        wasResized: needsResize
      }

    } catch (err) {
      request.log.error(err)
      throw err
    }
  })
}
```

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

## Drag and drop files in the editor

```ts

import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

// Upload file function
async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.url // Assuming server returns { url: "path/to/file" }
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

// Custom extension for handling file uploads
const FileUpload = Extension.create({
  name: 'fileUpload',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: async (view, event) => {
              event.preventDefault()

              const files = Array.from(event.dataTransfer.files)

              // Get drop position
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })

              if (!coordinates) return true

              // Add loading placeholder
              const tr = view.state.tr.insert(
                coordinates.pos,
                view.state.schema.text('Uploading...')
              )
              view.dispatch(tr)

              for (const file of files) {
                try {
                  if (!file.type.startsWith('image/')) {
                    console.warn('Only images are supported')
                    continue
                  }

                  // Show loading state in editor
                  const loadingNode = document.createElement('div')
                  loadingNode.textContent = `Uploading ${file.name}...`
                  loadingNode.className = 'upload-loading'

                  // Upload file and get URL
                  const imageUrl = await uploadFile(file)

                  // Replace loading text with image
                  view.dispatch(
                    view.state.tr
                      .delete(coordinates.pos, coordinates.pos + 11) // Remove "Uploading..."
                      .insert(
                        coordinates.pos,
                        view.state.schema.nodes.image.create({
                          src: imageUrl,
                          alt: file.name,
                        })
                      )
                  )
                } catch (error) {
                  // Replace loading text with error message
                  view.dispatch(
                    view.state.tr
                      .delete(coordinates.pos, coordinates.pos + 11)
                      .insert(
                        coordinates.pos,
                        view.state.schema.text(`Upload failed: ${error.message}`)
                      )
                  )
                }
              }

              return true
            },

            dragover: (view, event) => {
              event.preventDefault()
              return true
            },

            paste: async (view, event) => {
              const files = Array.from(event.clipboardData?.files || [])

              if (files.length === 0) return false

              event.preventDefault()

              const { from } = view.state.selection

              // Add loading placeholder
              view.dispatch(
                view.state.tr.insert(
                  from,
                  view.state.schema.text('Uploading...')
                )
              )

              for (const file of files) {
                try {
                  if (!file.type.startsWith('image/')) continue

                  const imageUrl = await uploadFile(file)

                  // Replace loading text with image
                  view.dispatch(
                    view.state.tr
                      .delete(from, from + 11)
                      .insert(
                        from,
                        view.state.schema.nodes.image.create({
                          src: imageUrl,
                          alt: file.name,
                        })
                      )
                  )
                } catch (error) {
                  view.dispatch(
                    view.state.tr
                      .delete(from, from + 11)
                      .insert(
                        from,
                        view.state.schema.text(`Upload failed: ${error.message}`)
                      )
                  )
                }
              }

              return true
            }
          },
        },
      }),
    ]
  },
})

// Initialize editor
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit,
    Image,
    FileUpload,
  ],
  content: '<p>Drag and drop images here!</p>',
})

// Add visual feedback for drag and drop
const editorElement = document.querySelector('#editor')

editorElement.addEventListener('dragenter', (e) => {
  e.preventDefault()
  editorElement.classList.add('drag-active')
})

editorElement.addEventListener('dragleave', (e) => {
  e.preventDefault()
  editorElement.classList.remove('drag-active')
})

// Add styles
const style = document.createElement('style')
style.textContent = `
  #editor {
    border: 2px solid #ccc;
    border-radius: 4px;
    padding: 20px;
    min-height: 200px;
  }

  #editor.drag-active {
    border-color: #4CAF50;
    background-color: rgba(76, 175, 80, 0.1);
  }

  #editor img {
    max-width: 100%;
    height: auto;
  }

  .upload-loading {
    color: #666;
    font-style: italic;
  }
`
document.head.appendChild(style)
```
