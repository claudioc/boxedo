import { FastifyInstance } from 'fastify';
import { IndexPage } from '../views/IndexPage';
import { ReadPage } from '../views/ReadPage';
import { NotFoundPage } from '../views/NotFoundPage';
import { ErrorPage } from '../views/ErrorPage';
import { EditPage } from '../views/EditPage';
import { CreatePage } from '../views/CreatePage';
import { CreateIndex } from '../views/CreateIndex';
import { ServerTime } from '../views/components/ServerTime';
import { FromSchema } from 'json-schema-to-ts';
import { INDEX_PAGE_ID } from '../constants';
import { ObjectId } from 'mongodb';

const pageIdSchema = {
  oneOf: [
    { type: 'string', format: 'uuid' },
    { type: 'string', enum: [INDEX_PAGE_ID] },
  ],
} as const;

const PageParamsSchema = {
  type: 'object',
  required: ['pageId'],
  properties: {
    pageId: pageIdSchema,
  },
} as const;

const SubpageParamsSchema = {
  type: 'object',
  required: ['parentPageId'],
  properties: {
    parentPageId: pageIdSchema,
  },
} as const;

const PageBodySchema = {
  type: 'object',
  required: ['pageTitle', 'pageContent'],
  properties: {
    pageTitle: { type: 'string' },
    pageContent: { type: 'string' },
  },
} as const;

interface PageModel {
  _id: ObjectId;
  pageId: string;
  pageParentId: string;
  pageTitle: string;
  pageContent: string;
}

const DEFAULT_HOMEPAGE: Partial<PageModel> = {
  pageTitle: 'Welcome to Joongle!',
  pageContent: '<p>Click on the "Create this page" link to get started</p>',
};

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  // The home page, folks
  app.get('/', async () => {
    const page = await app.mongo.db
      ?.collection('pages')
      .findOne({ pageId: INDEX_PAGE_ID });

    const isEmpty = page?.pageContent === undefined;
    const content = isEmpty ? DEFAULT_HOMEPAGE.pageContent : page.pageContent;
    const title = page?.pageTitle || DEFAULT_HOMEPAGE.pageTitle;

    return <IndexPage title={title} content={content} isEmpty={isEmpty} />;
  });

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/read/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;

      const page = await app.mongo.db?.collection('pages').findOne({ pageId });

      if (!page) {
        return <NotFoundPage title="Page not found" />;
      }

      return <ReadPage title={page.pageTitle} content={page.pageContent} />;
    }
  );

  // Create the index page form
  app.get('/create-index', async () => {
    return <CreateIndex title={DEFAULT_HOMEPAGE.pageTitle!} />;
  });

  // Create the index page
  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
  }>('/create-index', async (req, res) => {
    const page = await app.mongo.db
      ?.collection('pages')
      .findOne({ pageId: INDEX_PAGE_ID });

    if (page) {
      app.log.error('Index page already exists');
      return res.redirect(303, '/?error=1');
    }

    const newPage = {
      parentPageId: null,
      pageId: INDEX_PAGE_ID,
      pageTitle: req.body.pageTitle,
      pageContent: req.body.pageContent,
    };

    try {
      await app.mongo.db?.collection('pages').insertOne(newPage);
    } catch (error) {
      app.log.error('Error creating index page:', error);
      return res.redirect(303, '/?error=2');
    }

    return res.redirect(303, '/');
  });

  // Edit a page form
  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/edit/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req, res) => {
      const { pageId } = req.params;

      const page = await app.mongo.db
        ?.collection<PageModel>('pages')
        .findOne({ pageId });

      if (!page) {
        // TODO: handle error
        return res.redirect(303, '/error=3');
      }

      return <EditPage title={page.pageTitle} content={page.pageContent} />;
    }
  );

  // Update a page
  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
    Params: FromSchema<typeof PageParamsSchema>;
  }>(
    '/edit/:pageId',
    {
      schema: {
        body: PageBodySchema,
        params: PageParamsSchema,
      },
    },
    async (req, res) => {
      const { pageId } = req.params;

      const page = await app.mongo.db?.collection('pages').findOne({ pageId });

      if (!page) {
        // TODO: handle error
        return res.redirect(303, '/error=4');
      }

      try {
        await app.mongo.db?.collection('pages').updateOne(
          { _id: page._id },
          {
            $set: {
              pageTitle: req.body.pageTitle,
              pageContent: req.body.pageContent,
            },
          }
        );
      } catch (error) {
        app.log.error('Error updating page:', error);
        return res.redirect(303, '/?error=5');
      }

      return res.redirect(303, '/');
    }
  );

  // Creates a page form
  app.get<{
    Params: FromSchema<typeof SubpageParamsSchema>;
  }>(
    '/create/:parentPageId',
    {
      schema: {
        params: SubpageParamsSchema,
      },
    },
    async (req, res) => {
      const { parentPageId } = req.params;

      const parentPage = await app.mongo.db
        ?.collection('pages')
        .findOne({ pageId: parentPageId });

      if (!parentPage) {
        return res.redirect(303, '/?error=10');
      }

      return <CreatePage />;
    }
  );

  // Creates a page
  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
    Params: FromSchema<typeof SubpageParamsSchema>;
  }>(
    '/create/:parentPageId',
    {
      schema: {
        body: PageBodySchema,
        params: SubpageParamsSchema,
      },
    },
    async (req, res) => {
      const { parentPageId } = req.params;

      const parentPage = await app.mongo.db
        ?.collection('pages')
        .findOne({ pageId: parentPageId });

      if (!parentPage) {
        return res.redirect(303, '/?error=8');
      }

      try {
        await app.mongo.db?.collection('pages').insertOne({
          pageId: app.uuid.v4(),
          parentPageId,
          pageTitle: req.body.pageTitle,
          pageContent: req.body.pageContent,
        });
      } catch (error) {
        app.log.error('Error creating page:', error);
        return res.redirect(303, '/?error=9');
      }

      return res.redirect(303, '/');
    }
  );

  app.setNotFoundHandler(() => {
    return <NotFoundPage title="Page not found" />;
  });

  app.setErrorHandler((err, req) => {
    app.log.error(err);
    // Fastify will lowercase the header name
    if (req.headers['hx-request']) {
      // If the request is a HTMX request, we send the error message as
      // a normal partial response.
      return <ServerTime error="An unexpected error occurred" />;
    } else {
      return <ErrorPage title="Unhandled error" error={err} />;
    }
  });
};

export default router;
