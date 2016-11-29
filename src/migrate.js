const pg = require("pg")
const fs = require("fs")
const crypto = require("crypto")
const bluebird = require("bluebird")
const path = require("path")
const SQL = require("sql-template-strings")
const dedent = require("dedent-js")

module.exports = migrate

function migrate(dbConfig = {}, migrationsDirectory, config = {}) { // eslint-disable-line complexity
  if (
    typeof dbConfig.database !== "string" ||
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    return Promise.reject(new Error("Database config problem"))
  }
  if (typeof migrationsDirectory !== "string") {
    return Promise.reject(new Error("Must pass migrations directory as a string"))
  }

  const log = config.logger || (() => {})

  const client = bluebird.promisifyAll(new pg.Client(dbConfig))

  log("Attempting database migration")

  return client.connectAsync()
    .then(() => log("Connected to database"))
    .then(() => loadMigrationFiles(migrationsDirectory, log))
    .then(filterMigrations(client))
    .then(runMigrations(client, log))
    .then(() => client.end())
    .then(() => log("Successfully applied all migrations"))
    .catch((err) => {
      log(`Migration failed. Reason: ${err.message}`)
      throw err
    })
}

// Work out which migrations to apply
function filterMigrations(client) {
  return (migrations) => {
    // Arrange in ID order
    const orderedMigrations = migrations.sort((a, b) => a.id - b.id)

    // Assert their IDs are consecutive integers
    migrations.forEach((mig, i) => {
      if (mig.id !== i) {
        throw new Error("Found a non-consecutive migration ID")
      }
    })

    return doesTableExist(client, "migrations")
      .then((exists) => {
        if (!exists) {
          // Migrations table hasn't been created,
          // so the database is new and we need to run all migrations
          return orderedMigrations
        }

        return client.queryAsync("SELECT * FROM migrations")
          .then(filterUnappliedMigrations(orderedMigrations))
      })
  }
}

// Remove migrations that have already been applied
function filterUnappliedMigrations(orderedMigrations) {
  return ({rows: appliedMigrations}) => {
    return orderedMigrations.filter((mig) => {
      const migRecord = appliedMigrations[mig.id]
      if (!migRecord) {
        return true
      }
      if (migRecord.hash !== mig.hash) {
        // Someone has altered a migration which has already run - gasp!
        throw new Error(dedent`
          Hashes don't match for migration '${mig.name}'.
          This means that the script has changed since it was applied.`)
      }
      return false
    })
  }
}

// For each migration, inside a transaction:
// - run migration
// - add to migration table
function runMigrations(client, log) {
  return (migrationsToRun) => bluebird.each(migrationsToRun, (migration) => {
    log(`Starting migration: ${migration.name}`)
    return client.queryAsync("START TRANSACTION")
      .then(() => client.queryAsync(migration.sql))
      .then(() => {
        return client.queryAsync(SQL`
          INSERT INTO migrations (id, name, hash)
            VALUES (${migration.id}, ${migration.name}, ${migration.hash})
        `)
      })
      .then(() => client.queryAsync("COMMIT"))
      .then(() => log(`Finished migration: ${migration.name}`))
      .catch((err) => {
        log(`Caught error running migration '${migration.name}' - rolling back.`)
        return client.queryAsync("ROLLBACK")
          .then(() => {
            throw new Error(dedent`
              An error occurred running '${migration.name}'. Rolled back this migration.
              No further migrations were run.
              Reason: ${err.message}`)
          })
      })
  })
}

const readDir = bluebird.promisify(fs.readdir)
function loadMigrationFiles(directory, log) {
  log(`Loading migrations from: ${directory}`)
  return readDir(directory)
    .then((fileNames) => {
      log(`Found migration files: ${fileNames}`)
      return fileNames
        .filter((fileName) => fileName.toLowerCase().endsWith(".sql"))
        .map((fileName) => path.resolve(directory, fileName))
    })
    .then((fileNames) => {
      // Add a special zeroth migration to create the migrations table
      fileNames.unshift(path.resolve("src/migrations", "0_create-migrations-table.sql"))
      return fileNames
    })
    .then((fileNames) => bluebird.map(fileNames, loadFile))
}

const readFile = bluebird.promisify(fs.readFile)
function loadFile(filePath) {
  const fileName = path.basename(filePath, ".sql")

  const id = parseInt(fileName, 10)
  if (isNaN(id)) {
    return Promise.reject(new Error(dedent`
      Migration files should begin with an integer ID.
      Offending file: '${path.basename(filePath)}'`))
  }

  return readFile(filePath, "utf8")
    .then((contents) => {
      const hash = crypto.createHash("sha1")
      hash.update(fileName + contents, "utf8")
      const encodedHash = hash.digest("hex")

      return {
        id,
        name: fileName,
        sql: contents,
        hash: encodedHash,
      }
    })
}

// Check whether table exists in postgres - http://stackoverflow.com/a/24089729
function doesTableExist(client, tableName) {
  return client.queryAsync(SQL`
      SELECT EXISTS (
        SELECT 1
        FROM   pg_catalog.pg_class c
        WHERE  c.relname = ${tableName}
        AND    c.relkind = 'r'
      );
    `)
    .then((result) => {
      return result.rows.length > 0 && result.rows[0].exists
    })
}
