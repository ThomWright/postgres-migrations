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
    const invalidFiles = invalidHashes.map(({fileName}) => fileName)
    throw new Error(`Hashes don't match for migrations '${invalidFiles}'.
This means that the scripts have changed since it was applied.`)
  }
}
