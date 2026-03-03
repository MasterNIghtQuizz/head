# Database Migrations

This monorepo uses TypeORM for database management. While `synchronize: true` is enabled in development, we use migrations for controlled schema updates.

## Architecture

Each microservice has its own `migrations` directory in `src/migrations`.
The `DatabaseContext` from `@monorepo/common-database` provides a `runMigrations()` method that each microservice leverages.

## Commands

### Run Migrations

To run all migrations across all services:

```bash
chmod +x scripts/run-migrations.sh
./scripts/run-migrations.sh
```

To run migrations for a specific service:

```bash
yarn workspace @monorepo/ms-user run migrations:run
```

## Creating Migrations

Currently, you should create migration classes in `src/migrations`.
Example naming: `[Timestamp]-InitialMigration.js`.

The files should export a class implementing `MigrationInterface` from TypeORM.
Don't forget to import them in your `database.js` and add them to the `migrations` array.
