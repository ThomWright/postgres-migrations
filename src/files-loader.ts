import * as fs from "fs"
import * as path from "path"
import {promisify} from "util"
import {load as loadMigrationFile} from "./migration-file"
import {Logger, Migration} from "./types"

const readDir = promisify(fs.readdir)

const isValidFile = (fileName: string) => /\.(sql|js)$/gi.test(fileName)

export const load = async (
  directory: string,
  log: Logger,
): Promise<Array<Migration>> => {
  log(`Loading migrations from: ${directory}`)

  const fileNames = await readDir(directory)
  log(`Found migration files: ${fileNames}`)

  if (fileNames != null) {
    const migrationFiles = [
      path.join(__dirname, "migrations/0_create-migrations-table.sql"),
      ...fileNames.map((fileName) => path.resolve(directory, fileName)),
    ].filter(isValidFile)

    const unorderedMigrations = await Promise.all(
      migrationFiles.map(loadMigrationFile),
    )

    // Arrange in ID order
    return unorderedMigrations.sort((a, b) => a.id - b.id)
  }

  return []
}
