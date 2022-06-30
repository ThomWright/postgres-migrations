# Changelog

## 5.3.2
Added support for tenant filtering of files. If the file name has tenant name we would match it with TENANT_CODE environment variable to filter it.

We need to set TENANT_CODE in environment(may be via .env)
if the file name has for format like <SerialNumber>_<Description>.{sql/js} we would execute it without any checks.
if the file name has for format like <SerialNumber>_<Description>.<TENANT_CODE>.{sql/js} we would compare it with  TENANT_CODE environment variable to filter it.

## 5.3.1
We have added support for giving a schema name and the migrations table name also.

We have also added cli for running migrations directly by reading inputs from environment or .env file from local directory.

Here are the variables which we read.
- DB_NAME
- DB_USERNAME
- DB_PASSWORD
- DB_SERVER
- DB_SCHEMA
-
- DB_PORT (if missing we default it to 5432)

The cli takes an argument for the folder with migration files. If no argument is provided we would use db_migrations folder.



## 5.3.0

- [DEPRECATION] Deprecate `createDb`
- Add `ensureDatabaseExists` to check/create database in `migrate`

## 5.1.0

- Validate migration ordering when loading files (instead of when applying migrations)
- Expose `loadMigrationFiles` publicly, which can be used to validate files in e.g. a pre-push hook
- Add `pg-validate-migrations` bin script

## 5.0.0

- [BREAKING] Update `pg` to version 8. See the [pg changelog](https://github.com/brianc/node-postgres/blob/master/CHANGELOG.md#pg800) for details.

## 4.0.0

- [BREAKING] Updated whole project to TypeScript
  - some types might differ, no functional change
  - 21a7ee6
- [BREAKING] Increase required Node.js version to v10
  - 24bf9b7
- [BREAKING] Ensure file extension includes `.`
  - b8ed85a
- [BREAKING] Implement advisory locks to manage concurrency
  - 73b5ade
- Optionally accept a `pg` client for database connections
  - ad81ed9 c246ad3
