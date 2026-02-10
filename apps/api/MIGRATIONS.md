# Database migrations (production)

In **development**, TypeORM is configured with `synchronize: true` in `app.module.ts` so the schema is updated automatically from entities.

In **production**, you must:

1. Set `NODE_ENV=production` (so `synchronize` is false and the DB is not auto-altered).
2. Use TypeORM migrations to apply schema changes:
   - Generate: `npx typeorm migration:generate -d path/to/data-source.js -n MigrationName`
   - Run: `npx typeorm migration:run -d path/to/data-source.js`

Use a dedicated DataSource file (or Nest CLI typeorm config) that reads `DATABASE_URL` from env. Do not use `synchronize: true` in production.
