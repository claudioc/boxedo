# Implement magic links for auth

### the validation route for magic links:
```js
// Add to router.tsx

const AuthParamsSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string', pattern: '^[a-z0-9]{24}$' },
  },
} as const;

app.get<{ Params: FromSchema<typeof AuthParamsSchema> }>(
  '/auth/verify/:token',
  {
    schema: {
      params: AuthParamsSchema,
    },
  },
  async (req, rep) => {
    const { token } = req.params;
    const dbs = dbService(app.dbClient);
    const rs = redirectService(app, rep);

    // Get and validate magic link
    const result = await dbs.getMagicLink(token);
    if (!result) {
      return rs.homeWithFeedback(Feedbacks.E_INVALID_TOKEN);
    }

    // Check if expired
    if (new Date(result.expires) < new Date()) {
      return rs.homeWithFeedback(Feedbacks.E_TOKEN_EXPIRED);
    }

    // Check if already used
    if (result.used) {
      return rs.homeWithFeedback(Feedbacks.E_TOKEN_USED);
    }

    // Mark token as used
    await dbs.markMagicLinkUsed(token);

    // Create session
    const sessionId = createId();
    await dbs.createSession({
      _id: `session:${sessionId}`,
      email: result.email,
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // Set session cookie
    rep.setCookie('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return rs.homeWithFeedback(Feedbacks.S_LOGIN_SUCCESS);
  }
);

// Add login form route
app.get('/auth/login', async (req, rep) => {
  rep.html(
    <LoginPage
      app={app}
      token={rep.generateCsrf()}
      error={req.query.error}
    />
  );
});

// Add form submission handler
app.post('/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  },
  preHandler: app.csrfProtection,
}, async (req, rep) => {
  const { email } = req.body;
  const dbs = dbService(app.dbClient);
  const rs = redirectService(app, rep);

  // Check if user exists
  const user = await dbs.getUserByEmail(email);
  if (!user) {
    return rs.redirectTo('/auth/login?error=unknown_user');
  }

  // Generate magic link token
  const token = createId();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await dbs.createMagicLink({
    _id: `magic:${token}`,
    token,
    email,
    expires: expires.toISOString(),
    used: false,
  });

  // Send email via Mailgun
  // TODO: Add your Mailgun implementation here

  return rs.homeWithFeedback(Feedbacks.S_MAGIC_LINK_SENT);
});
```

## Middleware for protection

```js
// Add to router.tsx before your routes

const requireAuth = async (req: FastifyRequest, rep: FastifyReply) => {
  const sessionId = req.cookies.session;
  if (!sessionId) {
    return rep.redirect('/auth/login');
  }

  const dbs = dbService(app.dbClient);
  const session = await dbs.getSession(sessionId);

  if (!session || new Date(session.expires) < new Date()) {
    rep.clearCookie('session');
    return rep.redirect('/auth/login');
  }

  // Add user to request for use in routes
  req.user = await dbs.getUserByEmail(session.email);
};

// Add to protected routes:
app.get('/settings', {
  preHandler: requireAuth,
}, async (req, rep) => {
  // Your existing settings route code
});
```

### Login component

```jsx
// Add to views/LoginPage.tsx
const LoginPage = ({ app, token, error }: { app: FastifyInstance, token: string, error?: string }) => {
  return (
    <div class="container">
      <h1 class="title">Login</h1>
      {error && <div class="notification is-danger">Unknown email address</div>}
      <form method="POST" action="/auth/login">
        <input type="hidden" name="_csrf" value={token} />
        <div class="field">
          <label class="label">Email</label>
          <div class="control">
            <input
              class="input"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>
        <button class="button is-primary" type="submit">
          Send Magic Link
        </button>
      </form>
    </div>
  );
};
```

### dbservice updates

```js
// Add to dbService.ts
interface MagicLinkModel {
  _id: string;
  token: string;
  email: string;
  expires: string;
  used: boolean;
}

interface SessionModel {
  _id: string;
  email: string;
  created: string;
  expires: string;
}

// Add inside dbService return object
async getMagicLink(token: string): Promise<MagicLinkModel | null> {
  try {
    return await magicLinksDb.get(`magic:${token}`);
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode !== 404) {
      throw new ErrorWithFeedback(Feedbacks.E_UNKNOWN_ERROR);
    }
    return null;
  }
},

async markMagicLinkUsed(token: string) {
  const link = await this.getMagicLink(token);
  if (link) {
    link.used = true;
    await magicLinksDb.insert(link);
  }
},

async createSession(session: SessionModel) {
  await sessionsDb.insert(session);
},

async getSession(sessionId: string): Promise<SessionModel | null> {
  try {
    return await sessionsDb.get(`session:${sessionId}`);
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode !== 404) {
      throw new ErrorWithFeedback(Feedbacks.E_UNKNOWN_ERROR);
    }
    return null;
  }
},

async getUserByEmail(email: string): Promise<UserModel | null> {
  const result = await usersDb.find({
    selector: { email },
    limit: 1,
  });
  return result.docs[0] || null;
}
```

- Add Mailgun implementation to send the actual emails
- Add appropriate feedback messages to your i18n files
- Create the users database and add some initial users
- Add logout functionality if desired
- Consider rate limiting the magic link generation
- Add types for the user property on FastifyRequest
