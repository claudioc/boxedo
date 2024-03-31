import { FastifyInstance } from 'fastify';
import { ReadPage } from '../views/ReadPage';
import { NotFound } from '../views/NotFound';
import { Error } from '../views/Error';
import { EditPage } from '../views/EditPage';
import { CreatePage } from '../views/CreatePage';
import { CreateIndex } from '../views/CreateIndex';
import { Nav } from '../views/components/Nav';
import { FromSchema } from 'json-schema-to-ts';
import { Pages } from '../views/Pages';
import { SearchResults } from '../views/SearchResults';
import { INDEX_PAGE_ID } from '../constants';
import { PageModel, PageWithoutContentModel, NavItem } from '../types';
import { Feedbacks } from './feedbacks';
import cheerio from 'cheerio';
import { Db } from 'mongodb';

const PageIdFormat = {
  oneOf: [
    { type: 'string', format: 'uuid' },
    { type: 'string', enum: [INDEX_PAGE_ID] },
  ],
} as const;

const PageParamsSchema = {
  type: 'object',
  required: ['pageId'],
  properties: {
    pageId: PageIdFormat,
  },
} as const;

const PageQuerySchema = {
  type: 'object',
  properties: {
    f: { type: 'number' },
  },
} as const;

const SearchQuerySchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string' },
  },
} as const;

const PageIdSchema = PageParamsSchema;

const SubpageParamsSchema = {
  type: 'object',
  required: ['parentPageId'],
  properties: {
    parentPageId: PageIdFormat,
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
  pageContent:
    '<p class="empty-index-placeholder">Click on the "Create this page" link to get started</p>',
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
  app.get<{ Querystring: FromSchema<typeof PageQuerySchema> }>(
    '/',
    {
      schema: {
        querystring: PageQuerySchema,
      },
    },
    async (req) => {
      const root = await getPageById(app.mongo.db, INDEX_PAGE_ID);
      const { f: feedbackCode } = req.query;

      return (
        <ReadPage page={root || DEFAULT_HOMEPAGE} feedbackCode={feedbackCode} />
      );
    }
  );

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

  app.get<{
    Params: FromSchema<typeof PageParamsSchema>;
    Querystring: FromSchema<typeof PageQuerySchema>;
  }>(
    '/page/:pageId',
    {
      schema: {
        params: PageParamsSchema,
        querystring: PageQuerySchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;
      const { f: feedbackCode } = req.query;

      const page = await getPageById(app.mongo.db, pageId);

      if (!page) {
        const fb = Feedbacks.E_MISSING_PAGE;
        app.log.error(fb.message);
        return <NotFound title="Page not found" />;
      }

      return <ReadPage page={page} feedbackCode={feedbackCode} />;
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
      const fb = Feedbacks.E_INDEX_ALREADY_EXISTS;
      app.log.error(fb.message);
      return res.redirect(303, pathForRead('/', fb.code));
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
      const fb = Feedbacks.E_CREATING_INDEX;
      app.log.error(fb.message, error);
      return res.redirect(303, pathForRead('/', fb.code));
    }

    return res.redirect(303, pathForRead('/', Feedbacks.S_PAGE_CREATED.code));
  });

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
        const fb = Feedbacks.E_MISSING_PAGE;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      return <EditPage page={page} />;
    }
  );

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
        const fb = Feedbacks.E_MISSING_PAGE;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
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
        const fb = Feedbacks.E_UPDATING_PAGE;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      return res.redirect(
        303,
        pathForRead(pageId, Feedbacks.S_PAGE_UPDATED.code)
      );
    }
  );

  app.post<{
    Body: FromSchema<typeof PageIdSchema>;
  }>(
    '/delete',
    {
      schema: {
        body: PageIdSchema,
      },
    },

    async (req, res) => {
      const { pageId } = req.body;

      if (pageId === INDEX_PAGE_ID) {
        const fb = Feedbacks.E_CANNOT_DELETE_INDEX;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      const page = await getPageById(app.mongo.db, pageId);

      if (!page) {
        const fb = Feedbacks.E_MISSING_PAGE;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      const parentId = page.parentPageId;

      if (!parentId) {
        const fb = Feedbacks.E_MISSING_PARENT;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      try {
        await app.mongo.db?.collection('pages').deleteOne({ pageId });
        await app.mongo.db
          ?.collection('pages')
          .updateMany(
            { parentPageId: pageId },
            { $set: { parentPageId: parentId } }
          );
      } catch (error) {
        const fb = Feedbacks.E_DELETING_PAGE;
        app.log.error(fb.message, error);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      return res.redirect(303, pathForRead('/', Feedbacks.S_PAGE_DELETED.code));
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
        const fb = Feedbacks.E_MISSING_PARENT;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
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
        const fb = Feedbacks.E_MISSING_PARENT;
        app.log.error(fb.message);
        return res.redirect(303, pathForRead('/', fb.code));
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
        const fb = Feedbacks.E_CREATING_PAGE;
        app.log.error(fb.message, error);
        return res.redirect(303, pathForRead('/', fb.code));
      }

      return res.redirect(
        303,
        pathForRead(pageId, Feedbacks.S_PAGE_CREATED.code)
      );
    }
  );

  app.get('/pages', async () => {
    const pages =
      (await app.mongo.db
        ?.collection<PageWithoutContentModel>('pages')
        .find({}, PageWithoutContentProjection)
        .toArray()) || [];

    return <Pages pages={pages} />;
  });

  app.get<{
    Querystring: FromSchema<typeof SearchQuerySchema>;
  }>(
    '/search',
    {
      schema: {
        querystring: SearchQuerySchema,
      },
    },

    async (req) => {
      const { q } = req.query;

      const results = await app.mongo.db
        ?.collection<PageModel>('pages')
        .find({ $text: { $search: q } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(25)
        .toArray();

      if (results) {
        const snippetSize = 200;
        results.forEach((result) => {
          const textContent = cheerio.load(result.pageContent).text();
          const matchIndex = textContent.indexOf(q);
          if (matchIndex >= 0) {
            let start = matchIndex - snippetSize / 2;
            let end = matchIndex + snippetSize / 2 + q.length;
            start = start < 0 ? 0 : start;
            end = end > textContent.length ? textContent.length : end;
            result.pageContent =
              textContent.substring(start, end) +
              (end < textContent.length ? '…' : '');
          }
        });
      }

      return <SearchResults query={q} results={results} />;
    }
  );

  app.get('/admin/text-index', async () => {
    try {
      app.mongo.db
        ?.collection('pages')
        .createIndex(
          { pageTitle: 'text', pageContent: 'text' },
          { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
        );
    } catch (err) {
      return err;
    }

    return 'OK';
  });

  app.setNotFoundHandler(() => {
    return <NotFound title="Page not found" />;
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
        return <Error title="Request parameters are not valid." error={err} />;
      } else {
        reply.code(500);
        return <Error title="Unhandled error" error={err} />;
      }
    }
  });
};

const pathForRead = (pageId: string, feedbackId?: number) => {
  let path;

  if (pageId === INDEX_PAGE_ID || pageId === '/') {
    path = '/';
  } else {
    path = `/page/${pageId}`;
  }

  if (feedbackId) {
    path += `?f=${feedbackId}`;
  }

  return path;
};

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
