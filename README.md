# Postgres migrations

[![Travis](https://img.shields.io/travis/ThomWright/postgres-migrations.svg)](https://travis-ci.org/ThomWright/postgres-migrations)
[![npm](https://img.shields.io/npm/v/postgres-migrations.svg)](https://www.npmjs.com/package/postgres-migrations)
[![David](https://img.shields.io/david/ThomWright/postgres-migrations.svg)](https://david-dm.org/ThomWright/postgres-migrations)
[![David](https://img.shields.io/david/dev/ThomWright/postgres-migrations.svg)](https://david-dm.org/ThomWright/postgres-migrations)

A PostgreSQL migration library inspired by the Stack Overflow system described in [Nick Craver's blog](http://nickcraver.com/blog/2016/05/03/stack-overflow-how-we-do-deployment-2016-edition/#database-migrations).

Requires Node 8.9.3+

Supports PostgreSQL 9.4+

## API

```js
const {createDb, migrate} = require("postgres-migrations")

createDb("database-name", {
  defaultDatabase: "postgres", // optional, default: "postgres"
  user: "postgres",
  password: "password",
  host: "localhost",
  port: 5432,
})
.then(() => {
  return migrate({
    database: "database-name",
    user: "postgres",
    password: "password",
    host: "localhost",
    port: 5432,
  }, "path/to/migration/files")
})
.then(() => {/* ... */})
.catch((err) => {
  console.log(err)
})
```

## Design decisions

### No down migrations

There is deliberately no concept of a 'down' migration. In the words of Nick Craver:

> If we needed to reverse something, we could just push another migration negating whatever we did that went boom ... Why roll back when you can roll forward?

### Simple ordering

Migrations are guaranteed to run in the same order every time, on every system.

Some migration systems use timestamps for ordering migrations, where the timestamp represents when the migration file was created. This doesn't guarantee that the migrations will be run in the same order on every system.

For example, imagine Developer A creates a migration file in a branch. The next day, Developer B creates a migration in master, and deploys it to production. On day three Developer A merges in their branch and deploys to production.

The production database sees the migrations applied out of order with respect to their creation time. Any new development database will run the migrations in a different order.

### The `migrations` table

A `migrations` table is created as the first migration, before any user-supplied migrations. This keeps track of all the migrations which have already been run.

### Hash checks for previous migrations

Previously run migration scripts shouldn't be modified, since we want the process to be repeated in the same way for every new environment.

This is enforced by hashing the file contents of a migration script and storing this in `migrations` table. Before running a migration, the previously run scripts are hashed and checked against the database to ensure they haven't changed.

### Each migration run in a transaction

Ensures each migration is atomic. Either it completes successfully, or it is rolled back and the process is aborted.

An exception is made when `-- postgres-migrations disable-transaction` is included at the top of the migration file. This allows migrations such as `CREATE INDEX CONCURRENTLY` which cannot be run inside a transaction.

### Abort on errors

If anything fails, the process is aborted by throwing an exception.

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

| Section | Accepted Values | Description   |
|   ---   |         ---     |       ---     |
|   id    |   Any integer or left zero integers      |   Consecutive integer ID. <br />**Must start from 1 and be consecutive, e.g. if you have migrations 1-4, the next one must be 5.** |
|   separator | `_` or `-` or nothing | |
|   name    |   Any length text | |
|   extension   |   `.sql` or `.js` | File extensions supported **not case sensitive** |

Example:

```text
migrations
├ 1_create-initial-tables.sql
├ 2-alter-initial-tables.SQL
└ 3alter-initial-tables-again.js
```

Or, if you want better ordering in your filesystem:

```text
migrations
├ 00001_create-initial-tables.sql
├ 00002-alter-initial-tables.sql
└ 00003_alter-initial-tables-again.js
```

Migrations will be performed in the order of the ids.

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
const createMainTable = require('./create-main-table')
const createSecondaryTable = require('./create-secondary-table')

module.exports.generateSql = () => `${createMainTable}
${createSecondaryTable}`
```

## Tips

If you want sane date handling, it is recommended you use the following code snippet to fix a `node-postgres` [bug](https://github.com/brianc/node-postgres/issues/818):

```js
const pg = require("pg")

const parseDate = (val) => val === null ? null : moment(val).format("YYYY-MM-DD")
const DATATYPE_DATE = 1082
pg.types.setTypeParser(DATATYPE_DATE, val => {
  return val === null ? null : parseDate(val)
})
```

## Further work

- Ability to force migrations to run (i.e. no hash checks)
- Ability to run migrations up to a set point (e.g. run to migration 5)
- Ability to configure timeouts (and add timeout to migrations)
- Ability to configure migration table name
- CLI if people want it

## Useful resources

[Stack Overflow: How We Do Deployment - 2016 Edition (Database Migrations)](http://nickcraver.com/blog/2016/05/03/stack-overflow-how-we-do-deployment-2016-edition/#database-migrations)

[Database Migrations Done Right](http://www.brunton-spall.co.uk/post/2014/05/06/database-migrations-done-right/)

[Database versioning best practices](http://enterprisecraftsmanship.com/2015/08/10/database-versioning-best-practices/)

## Developing `postgres-migrations`

The tests require Docker to be installed.
