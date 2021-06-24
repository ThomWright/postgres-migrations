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
    ensureDatabaseExists: true

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
├ 2-alter-initial-tables.SQL
└ 3-alter-initial-tables-again.js
```

Or, if you want better ordering in your filesystem:

```text
migrations
├ 00001_create-initial-tables.sql
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

## Useful resources

[Stack Overflow: How We Do Deployment - 2016 Edition (Database Migrations)](http://nickcraver.com/blog/2016/05/03/stack-overflow-how-we-do-deployment-2016-edition/#database-migrations)

[Database Migrations Done Right](http://www.brunton-spall.co.uk/post/2014/05/06/database-migrations-done-right/)

[Database versioning best practices](http://enterprisecraftsmanship.com/2015/08/10/database-versioning-best-practices/)

## Developing `postgres-migrations`

The tests require Docker to be installed. It probably helps to `docker pull postgres:9.4`.
