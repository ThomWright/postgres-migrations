const {promisify} = require("util")
const path = require("path")
const fs = require("fs")

const migrationFile = require("./migration-file")

const readDir = promisify(fs.readdir)

const isValidFile = fileName => /.(sql|js)$/gi.test(fileName)

function filterAndResolveFileName(directory) {
  return (files = [], fileName) => {
    let result = files
    if (isValidFile(fileName)) {
      result = [...files, path.resolve(directory, fileName)]
    }

    return result
  }
}

module.exports.load = async (directory, log) => {
  log(`Loading migrations from: ${directory}`)

  const fileNames = await readDir(directory)
  log(`Found migration files: ${fileNames}`)

  let orderedMigrations = []
  if (fileNames) {
    const migrationFiles = [
      path.join(__dirname, "migrations/0_create-migrations-table.sql"),
      ...fileNames.reduce(filterAndResolveFileName(directory), []),
    ]

    const unorderedMigrations = await Promise.all(
      migrationFiles.map(migrationFile.load),
    )

    // Arrange in ID order
    orderedMigrations = unorderedMigrations.sort((a, b) => a.id - b.id)
  }

  return orderedMigrations
}
