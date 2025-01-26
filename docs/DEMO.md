## Setup a demo server (proposal)

The idea is to use the same couchdb but with each db prefixed with "-demo" (like we already do for the tests)

```sh
curl -X PUT http://admin:password@localhost:5984/pages-demo
curl -X PUT http://admin:password@localhost:5984/settings-demo
curl -X PUT http://admin:password@localhost:5984/files-demo
```

```sh
NODE_ENV=production
PORT=3001
COUCHDB_URL=http://localhost:5984
DB_USER=admin
DB_PASSWORD=
DB_PREFIX=demo-
```

## ecosystem.config.js for PM2

```js
module.exports = {
  apps: [
    {
      name: 'joongle',
      script: './dist/server/app.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'joongle-demo',
      script: './dist/server/app.js',
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '.env.demo'
      }
    }
  ]
};
```

## Changes in bootstrap

```js
const dbPrefix = process.env.DB_PREFIX || '';
app.decorate(
  'dbClient',
  await dbService.init({
    serverUrl: process.env.COUCHDB_URL ?? '',
    username: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    env: process.env.NODE_ENV as NodeEnv,
    dbPrefix: dbPrefix // Add this
  })
);
```
