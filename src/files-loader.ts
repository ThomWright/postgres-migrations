import * as fs from "fs"
import * as path from "path"
import {promisify} from "util"
import {load as loadMigrationFile} from "./migration-file"
import {loadInitialMigration} from "./initial-migration"
import {Logger, Migration} from "./types"

const readDir = promisify(fs.readdir)

const isValidFile = (fileName: string) => /\.(sql|js)$/gi.test(fileName)

export const load = async (
  directory: string,
  log: Logger,
  migrationTableName: string,
): Promise<Array<Migration>> => {
  log(`Loading migrations from: ${directory}`)

  const fileNames = await readDir(directory)
  log(`Found migration files: ${fileNames}`)

  if (fileNames != null) {
    const migrationFiles = fileNames
      .map((fileName) => path.resolve(directory, fileName))
      .filter(isValidFile)

    const unorderedMigrations = await Promise.all(
      migrationFiles.map(loadMigrationFile),
    )

    const initialMigration = await loadInitialMigration(migrationTableName)

    // Arrange in ID order
    return [
      initialMigration,
      ...unorderedMigrations.sort((a, b) => a.id - b.id),
    ]
  }

  return []
}
