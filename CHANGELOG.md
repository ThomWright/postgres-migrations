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
