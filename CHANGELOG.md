# Changelog

## V4

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
