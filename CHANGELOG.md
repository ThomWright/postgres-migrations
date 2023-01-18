# [5.4.0](https://github.com/thomwright/postgres-migrations/compare/v5.3.0...v5.4.0) (2023-01-18)


### Bug Fixes

* makefile ([321d8cb](https://github.com/thomwright/postgres-migrations/commit/321d8cb75b202313d0729e10672a07564c03b1ac))


### Features

* add environment variable ([930b07c](https://github.com/thomwright/postgres-migrations/commit/930b07c736aafaf25985536480a96026b8118207))
* add makefile for shipjs ([af0743b](https://github.com/thomwright/postgres-migrations/commit/af0743bbeb20170e7d317543a2dbe4b41d87fcf3))
* add migration based on schema ([7155129](https://github.com/thomwright/postgres-migrations/commit/71551299b4692c2beaa9d62f82b60c377cc2071d))



# [5.4.0](https://github.com/thomwright/postgres-migrations/compare/v5.3.0...v5.4.0) (2023-01-18)


### Bug Fixes

* makefile ([321d8cb](https://github.com/thomwright/postgres-migrations/commit/321d8cb75b202313d0729e10672a07564c03b1ac))


### Features

* add environment variable ([930b07c](https://github.com/thomwright/postgres-migrations/commit/930b07c736aafaf25985536480a96026b8118207))
* add makefile for shipjs ([af0743b](https://github.com/thomwright/postgres-migrations/commit/af0743bbeb20170e7d317543a2dbe4b41d87fcf3))
* add migration based on schema ([7155129](https://github.com/thomwright/postgres-migrations/commit/71551299b4692c2beaa9d62f82b60c377cc2071d))



# Changelog

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
