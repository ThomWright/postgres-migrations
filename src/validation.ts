import {Migration} from "./types"

const indexNotMatch = (migration: Migration, index: number) =>
  migration.id !== index

/** Assert migration IDs are consecutive integers */
export function validateMigrationOrdering(migrations: Array<Migration>) {
  const notMatchingId = migrations.find(indexNotMatch)
  if (notMatchingId) {
    throw new Error(
      `Found a non-consecutive migration ID on file: '${notMatchingId.fileName}'`,
    )
  }
}

/** Assert hashes match */
export function validateMigrationHashes(
  migrations: Array<Migration>,
  appliedMigrations: Record<number, Migration | undefined>,
) {
  const invalidHash = (migration: Migration) => {
    const appliedMigration = appliedMigrations[migration.id]
    return appliedMigration != null && appliedMigration.hash !== migration.hash
  }

  // Assert migration hashes are still same
  const invalidHashes = migrations.filter(invalidHash)
  if (invalidHashes.length > 0) {
    // Someone has altered one or more migrations which has already run - gasp!
    const errors = invalidHashes
      .map(migration => `Migration failed for File: ${migration.fileName}.`
        + 'This means that this script has changed since it was applied.\n\t'
        + `Expected Hash: ${appliedMigrations[migration.id].hash}\n\tActual Hash: ${migration.hash}`)
      .join('\n');
    throw new Error(errors);
  }
}
