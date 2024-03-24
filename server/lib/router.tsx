import { FastifyInstance } from 'fastify';
import { ReadPage } from '../views/ReadPage';
import { NotFoundPage } from '../views/NotFoundPage';
import { ErrorPage } from '../views/ErrorPage';
import { EditPage } from '../views/EditPage';
import { CreatePage } from '../views/CreatePage';
import { CreateIndex } from '../views/CreateIndex';
import { Nav } from '../views/components/Nav';
import { FromSchema } from 'json-schema-to-ts';
import { PagesPage } from '../views/PagesPage';
import { INDEX_PAGE_ID } from '../constants';
import { PageModel, PageWithoutContentModel, NavItem } from '../types';
import { Db } from 'mongodb';

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

const DEFAULT_HOMEPAGE: PageModel = {
  pageId: INDEX_PAGE_ID,
  pageTitle: 'Welcome to Joongle!',
  pageContent: '<p>Click on the "Create this page" link to get started</p>',
};

const PageWithoutContentProjection = {
  projection: {
    pageId: 1,
    pageTitle: 1,
    parentPageId: 1,
  },
} as const;

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  // The home page, folks
  app.get('/', async () => {
    const root = await getPageById(app.mongo.db, INDEX_PAGE_ID);
    return <ReadPage page={root || DEFAULT_HOMEPAGE} />;
  });

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/parts/nav/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;

      const root = await getPageById(app.mongo.db, INDEX_PAGE_ID);

      if (!root) {
        return 'No root page found';
      }

      const tree: NavItem = {
        pageId: root.pageId,
        title: root.pageTitle,
        link: '/',
        children: await buildMenuTree(app.mongo.db, root.pageId),
      };

      return <Nav tree={tree} currentPageId={pageId} />;
    }
  );

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/page/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;

      const page = await getPageById(app.mongo.db, pageId);

      if (!page) {
        return <NotFoundPage title="Page not found" />;
      }

      return <ReadPage page={page} />;
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
    const root = await getPageById(app.mongo.db, INDEX_PAGE_ID);

    if (root) {
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

      const page = await getPageById(app.mongo.db, pageId);

      if (!page) {
        // TODO: handle error
        return res.redirect(303, '/error=3');
      }

      return <EditPage page={page} />;
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

      const page = await getPageById(app.mongo.db, pageId);
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

      return res.redirect(303, pathForRead(pageId));
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

      const parentPage = await getPageById(app.mongo.db, parentPageId);

      if (!parentPage) {
        return res.redirect(303, '/?error=10');
      }

      return <CreatePage parentPage={parentPage} />;
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

      const parentPage = await getPageById(app.mongo.db, parentPageId);

      if (!parentPage) {
        return res.redirect(303, '/?error=8');
      }

      const pageId = app.uuid.v4();
      try {
        await app.mongo.db?.collection('pages').insertOne({
          pageId,
          parentPageId,
          pageTitle: req.body.pageTitle,
          pageContent: req.body.pageContent,
        });
      } catch (error) {
        app.log.error('Error creating page:', error);
        return res.redirect(303, '/?error=9');
      }

      return res.redirect(303, pathForRead(pageId));
    }
  );

  // List all pages
  app.get('/pages', async () => {
    const pages =
      (await app.mongo.db
        ?.collection<PageWithoutContentModel>('pages')
        .find({}, PageWithoutContentProjection)
        .toArray()) || [];

    return <PagesPage pages={pages} />;
  });

  app.setNotFoundHandler(() => {
    return <NotFoundPage title="Page not found" />;
  });

  app.setErrorHandler((err, req, reply) => {
    app.log.error(err);

    // Fastify will lowercase the header name
    if (req.headers['hx-request']) {
      // If the request is a HTMX request, we send the error message as
      // a normal partial response.
      return 'An unexpected error occurred';
    } else {
      if (err.validation) {
        reply.code(400);
        return (
          <ErrorPage title="Request parameters are not valid." error={err} />
        );
      } else {
        reply.code(500);
        return <ErrorPage title="Unhandled error" error={err} />;
      }
    }
  });
};

const pathForRead = (pageId: string) => `/page/${pageId}`;

async function buildMenuTree(
  db: Db | undefined,
  parentId: string
): Promise<NavItem[]> {
  if (!db) {
    return [];
  }

  const pages = await db
    .collection<PageWithoutContentModel>('pages')
    .find({ parentPageId: parentId }, PageWithoutContentProjection)
    .toArray();

  const menuTree = [];
  for (const page of pages) {
    const menuItem: NavItem = {
      pageId: page.pageId,
      title: page.pageTitle,
      link: pathForRead(page.pageId),
      children: await buildMenuTree(db, page.pageId),
    };

    menuTree.push(menuItem);
  }

  return menuTree;
}

const getPageById = async (db: Db | undefined, pageId: string) => {
  return await db?.collection<PageModel>('pages').findOne({ pageId });
};

export default router;
