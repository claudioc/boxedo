import { FastifyInstance } from 'fastify';
import { IndexPage } from '../views/IndexPage';
import { NotFoundPage } from '../views/NotFoundPage';
import { ErrorPage } from '../views/ErrorPage';
import { EditPage } from '../views/EditPage';
import { CreatePage } from '../views/CreatePage';
import { ServerTime } from '../views/components/ServerTime';
import { FromSchema } from 'json-schema-to-ts';

const PageParamsSchema = {
  type: 'object',
  required: ['pageId'],
  properties: {
    pageId: {
      oneOf: [
        { type: 'string', format: 'uuid' },
        { type: 'string', enum: ['index'] },
      ],
    },
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

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  app.get('/', async () => {
    return <IndexPage title="The home page" />;
  });

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/edit/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;

      console.log('pageId', pageId);
      return <EditPage title="La mosca bianca" content="<p>Ciao</p>" />;
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

      console.log('pageId', pageId);
      console.log('Content', req.body.pageTitle, req.body.pageContent);
      return res.redirect(303, '/');
    }
  );

  app.get('/create', async () => {
    return <CreatePage title="Create page" />;
  });

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
