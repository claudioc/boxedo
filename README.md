# Joongle is the best CMS on Earth

Don't take this project too seriously, and don't install it.


- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted



## How to use transactions

```ts
  const session = await app.mongo.client.startSession();
  try {
    await session.withTransaction(async () => {
      await (collection as unknown as Collection).insertOne(
        {
          pageId,
          parentPageId,
          pageTitle,
          pageContent,
          pageSlug: slug,
          updatedAt: now,
          createdAt: now,
        },
        { session }
      );
    });
  } catch (error) {
    console.log(error);
    return redirectHome(rep, Feedbacks.E_CREATING_PAGE, app);
  } finally {
    await session.endSession();
  }
```
