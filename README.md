# Postgres migrations

![GitHub Actions](https://github.com/ThomWright/postgres-migrations/actions/workflows/node.js.yml/badge.svg)
[![npm](https://img.shields.io/npm/v/postgres-migrations.svg)](https://www.npmjs.com/package/postgres-migrations)
[![David](https://img.shields.io/david/ThomWright/postgres-migrations.svg)](https://david-dm.org/ThomWright/postgres-migrations)
[![David](https://img.shields.io/david/dev/ThomWright/postgres-migrations.svg)](https://david-dm.org/ThomWright/postgres-migrations)

A PostgreSQL migration library inspired by the Stack Overflow system described in [Nick Craver's blog](http://nickcraver.com/blog/2016/05/03/stack-overflow-how-we-do-deployment-2016-edition/#database-migrations).

Migrations are defined in sequential SQL files, for example:

```text
migrations
├ 1_create-table.sql
├ 2_alter-table.sql
└ 3_add-index.sql
```

Requires Node 10.17.0+

Supports PostgreSQL 9.4+

## API

There are two ways to use the API.

Either, pass a database connection config object:

```typescript
import {migrate} from "postgres-migrations"

async function() {
  const dbConfig = {
    database: "database-name",
    user: "postgres",
    password: "password",
    host: "localhost",
    port: 5432,

    // Default: false for backwards-compatibility
    // This might change!
    ensureDatabaseExists: true,

    // Default: "postgres"
    // Used when checking/creating "database-name"
    defaultDatabase: "postgres"
  }

  await migrate(dbConfig, "path/to/migration/files")
}
```

Or, pass a `pg` client:

```typescript
import {migrate} from "postgres-migrations"

async function() {
  const dbConfig = {
    database: "database-name",
    user: "postgres",
    password: "password",
    host: "localhost",
    port: 5432,
  }

  // Note: when passing a client, it is assumed that the database already exists
  const client = new pg.Client(dbConfig) // or a Pool, or a PoolClient
  await client.connect()
  try {
    await migrate({client}, "path/to/migration/files")
  } finally {
    await client.end()
  }
}
```

### Validating migration files

Occasionally, if two people are working on the same codebase independently, they might both create a migration at the same time. For example, `5_add-table.sql` and `5_add-column.sql`. If these both get pushed, there will be a conflict.

While the migration system will notice this and refuse to apply the migrations, it can be useful to catch this as early as possible.

The `loadMigrationFiles` function can be used to check if the migration files satisfy the rules.

Alternatively, use the `pg-validate-migrations` bin script: `pg-validate-migrations "path/to/migration/files"`.

## Design decisions

### No down migrations

There is deliberately no concept of a 'down' migration. In the words of Nick Craver:

> If we needed to reverse something, we could just push another migration negating whatever we did that went boom ... Why roll back when you can roll forward?

### Simple ordering

Migrations are guaranteed to run in the same order every time, on every system.

Some migration systems use timestamps for ordering migrations, where the timestamp represents when the migration file was created. This doesn't guarantee that the migrations will be run in the same order on every system.

For example, imagine Developer A creates a migration file in a branch. The next day, Developer B creates a migration in master, and deploys it to production. On day three Developer A merges in their branch and deploys to production.

The production database sees the migrations applied out of order with respect to their creation time. Any new development database will run the migrations in the timestamp order.

### The `migrations` table

A `migrations` table is created as the first migration, before any user-supplied migrations. This keeps track of all the migrations which have already been run.

### Hash checks for previous migrations

Previously run migration scripts shouldn't be modified, since we want the process to be repeated in the same way for every new environment.

This is enforced by hashing the file contents of a migration script and storing this in `migrations` table. Before running a migration, the previously run scripts are hashed and checked against the database to ensure they haven't changed.

### Each migration runs in a transaction

Running in a transaction ensures each migration is atomic. Either it completes successfully, or it is rolled back and the process is aborted.

An exception is made when `-- postgres-migrations disable-transaction` is included at the top of the migration file. This allows migrations such as `CREATE INDEX CONCURRENTLY` which cannot be run inside a transaction.

### Abort on errors

If anything fails, the migration in progress is rolled back and an exception is thrown.

## Concurrency

As of v4, [advisory locks](https://www.postgresql.org/docs/9.4/explicit-locking.html#ADVISORY-LOCKS) are used to control concurrency. If two migration runs are kicked off concurrently, one will wait for the other to finish before starting. Once a process has acquired a lock, it will run each of the pending migrations before releasing the lock again.

Logs from two processes `A` and `B` running concurrently should look something like the following.

```text
B Connected to database
B Acquiring advisory lock...
A Connected to database
A Acquiring advisory lock...
B ... acquired advisory lock
B Starting migrations
B Starting migration: 2 migration-name
B Finished migration: 2 migration-name
B Starting migration: 3 another-migration-name
B Finished migration: 3 another-migration-name
B Successfully applied migrations: migration-name, another-migration-name
B Finished migrations
B Releasing advisory lock...
B ... released advisory lock
A ... acquired advisory lock
A Starting migrations
A No migrations applied
A Finished migrations
A Releasing advisory lock...
A ... released advisory lock
```

Warning: the use of advisory locks will cause problems when using [transaction pooling or statement pooling in PgBouncer](http://www.pgbouncer.org/features.html). A similar system is used in Rails, [see this for an explanation of the problem](https://blog.saeloun.com/2019/09/09/rails-6-disable-advisory-locks.html).

## Migration rules

### Make migrations idempotent

Migrations should only be run once, but this is a good principle to follow regardless.

### Migrations are immutable

Once applied (to production), a migration cannot be changed.

This is enforced by storing a hash of the file contents for each migration in the migrations table.

These hashes are checked when running migrations.

### Migrations should be backwards compatible

Backwards incompatible changes can usually be made in a few stages.

For an example, see [this blog post](http://www.brunton-spall.co.uk/post/2014/05/06/database-migrations-done-right/).

### File name

A migration file must match the following pattern:

`[id][separator][name][extension]`

| Section   | Accepted Values                   | Description                                                                                                                      |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| id        | Any integer or left zero integers | Consecutive integer ID. <br />**Must start from 1 and be consecutive, e.g. if you have migrations 1-4, the next one must be 5.** |
| separator | `_` or `-` or nothing             |                                                                                                                                  |
| name      | Any length text                   |                                                                                                                                  |
| extension | `.sql` or `.js`                   | File extensions supported. **Case insensitive.**                                                                                 |

Example:

```text
migrations
├ 1_create-initial-tables.sql
├ 1_create-initial-tables.md # Docs can go here
├ 2-alter-initial-tables.SQL
└ 3-alter-initial-tables-again.js
```

Or, if you want better ordering in your filesystem:

```text
migrations
├ 00001_create-initial-tables.sql
├ 00001_create-initial-tables.md # Docs can go here
├ 00002-alter-initial-tables.sql
└ 00003_alter-initial-tables-again.js
```

Migrations will be performed in the order of the ids. If ids are not consecutive or if multiple migrations have the same id, the migration run will fail.

Note that file names cannot be changed later.

### Javascript Migrations

By using `.js` extension on your migration file you gain access to all NodeJS features and only need to export a method called `generateSql` that returns a `string` literal like:

```js
// ./migrations/helpers/create-main-table.js
module.exports = `
CREATE TABLE main (
    id int primary key
);`

// ./migrations/helpers/create-secondary-table.js
module.exports = `
CREATE TABLE secondary (
    id int primary key
);`

// ./migrations/1-init.js
const createMainTable = require("./create-main-table")
const createSecondaryTable = require("./create-secondary-table")

module.exports.generateSql = () => `${createMainTable}
${createSecondaryTable}`
```

## Tips

### Date handling

If you want sane date handling, it is recommended you use the following code snippet to fix a `node-postgres` [bug](https://github.com/brianc/node-postgres/issues/818):

```js
const pg = require("pg")

const parseDate = (val) =>
  val === null ? null : moment(val).format("YYYY-MM-DD")
const DATATYPE_DATE = 1082
pg.types.setTypeParser(DATATYPE_DATE, (val) => {
  return val === null ? null : parseDate(val)
})
```

### Schema migrations vs data migrations

General rule: only change schemas and other static data in database migrations.

When writing a migration which affects data, consider whether the migration needs to be run for all possible environments or just some specific environment. Schema changes and static data need changing for all environments. Often, data changes need to only happen in dev or prod (to fix some data), and might be better of run as one-off jobs (manually or otherwise).

### Making a column NOT NULL

```sql
-- No no no nononono (at least for big tables)
ALTER TABLE my_table ALTER COLUMN currently_nullable SET NOT NULL;
```

TL;DR don't do the above without [reading this](https://medium.com/doctolib/adding-a-not-null-constraint-on-pg-faster-with-minimal-locking-38b2c00c4d1c). It can be slow for big tables, and will lock out all writes to the table until it completes.

### Creating indexes

When creating indexes, there are a few important considerations.

Creating an index should probably look like this:

```sql
-- postgres-migrations disable-transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS name_of_idx
  ON table_name (column_name);
```

- `CONCURRENTLY` - without this, writes on the table will block until the index has finished being created. However, it can't be run inside a transaction.
- `-- postgres-migrations disable-transaction` - migrations are run inside a transaction by default. This disables that.
- `IF NOT EXISTS` - since the transaction is disabled, it's possible to end up in a partially applied state where the index exists but the migration wasn't recorded. In this case, the migration will probably get run again. This ensures that will succeed.

See the [Postgres docs on creating indexes](https://www.postgresql.org/docs/9.6/sql-createindex.html).

### Avoid `IF NOT EXISTS`

_Most_ of the time using `IF NOT EXISTS` is not necessary (see above for an exception). In most cases, we would be better off with a failing migration script that tells us that we tried to create a table with a duplicate name.

### Use separate markdown files for complex documentation

A comment that is added to a migration script can never be changed once the migration script has been deployed. For complex migration scripts, consider documenting them in a separate markdown file with the same file name as the migration script. This documentation can then be updated later if a better explanation becomes apparent.

Your file structure might look something like this:

```text
- migrations
  - 0001_complex_migration.md   <--- Contains documentation that can be updated.
  - 0001_complex_migration.sql
  - 0002_simple_migration.sql
Rather than this:
- migrations
  - 0001_complex_migration.sql   <--- Contains documentation that can never be updated.
  - 0002_simple_migration.sql
```

### Bundling postgres-migrations

If you are bundling this package with for example Vite/Rollup, you might get the error `ReferenceError: __dirname is not defined` when trying to run migrations.

To work around this, you need to:

1. Download the initial migration from [this link](https://github.com/ThomWright/postgres-migrations/blob/master/src/migrations/0_create-migrations-table.sql) and put it in *your* migrations folder.
2. Make sure the name of the file is exactly the same as the original: `0_create-migrations-table.sql`

The library will then detect the presence of the file and skip including the original file using `__dirname`. To make sure you copied the file correctly, verify that the `hash` for the `create-migrations-table` migration in the `migrations` table is `e18db593bcde2aca2a408c4d1100f6abba2195df`.

See [this issue](https://github.com/ThomWright/postgres-migrations/issues/79) for additional details.

## Useful resources

[Stack Overflow: How We Do Deployment - 2016 Edition (Database Migrations)](http://nickcraver.com/blog/2016/05/03/stack-overflow-how-we-do-deployment-2016-edition/#database-migrations)

[Database Migrations Done Right](http://www.brunton-spall.co.uk/post/2014/05/06/database-migrations-done-right/)

[Database versioning best practices](http://enterprisecraftsmanship.com/2015/08/10/database-versioning-best-practices/)

## Developing `postgres-migrations`

The tests require Docker to be installed. It probably helps to `docker pull postgres:9.4`.
