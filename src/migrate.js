const pg = require("pg")
const SQL = require("sql-template-strings")
const dedent = require("dedent-js")

const migrationFile = require("./migration-file")
const runMigration = require("./run-migration")
const filesLoader = require("./files-loader")

module.exports = async function migrate(dbConfig = {}, migrationsDirectory, config = {}) { // eslint-disable-line complexity
  if (
    typeof dbConfig.database !== "string" ||
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    throw new Error("Database config problem")
  }
  if (typeof migrationsDirectory !== "string") {
    throw new Error("Must pass migrations directory as a string")
  }

  const log = config.logger || (() => {})

  const migrationTableName = "migrations"

  const client = new pg.Client(dbConfig)

  client.on("error", (err) => {
    log(`pg client emitted an error: ${err.message}`)
  })

  log("Attempting database migration")

  let executedMigrations = null

  try {
    await client.connect()
    log("Connected to database")

    const migrations = await filesLoader.load(migrationsDirectory, log)

    const appliedMigrations = await fetchAppliedMigrationFromDB(migrationTableName, client, log)

    validateMigrations(migrations, appliedMigrations)

    const filteredMigrations = filterMigrations(migrations, appliedMigrations)

    const completedMigrations = await Promise.all(filteredMigrations.map(runMigration(migrationTableName, client, log)))

    executedMigrations = finalize(completedMigrations, log)
  } catch (err) {
    log(`Migration failed. Reason: ${err.message}`)
    throw new Error(dedent`
      ${err.message}
      ${err.stack}
      Migration failed.`)
  } finally {
    await client.end()
  }

  return executedMigrations
}

// Queries the database for migrations table and retrieve it rows if exists
async function fetchAppliedMigrationFromDB(migrationTableName, client, log) {
  let appliedMigrations = []
  if (await doesTableExist(client, migrationTableName)) {
    log(dedent`
        Migrations table with name '${migrationTableName}' exists,
        filtering not applied migrations.`)

    const {rows} = await client.query(`SELECT * FROM ${migrationTableName}`)
    appliedMigrations = rows
  } else {
    log(dedent`
        Migrations table with name '${migrationTableName}' hasn't been created,
        so the database is new and we need to run all migrations.`)
  }
  return appliedMigrations
}

// Validates mutation order and hash
function validateMigrations(migrations, appliedMigrations) {
  const {indexNotMatch, invalidHash} = migrationFile.validator(appliedMigrations)

  // Assert migration IDs are consecutive integers
  const notMatchingId = migrations.find(indexNotMatch)
  if (notMatchingId) {
    throw new Error(`Found a non-consecutive migration ID on file: '${notMatchingId.fileName}'`)
  }

  // Assert migration hashs are still same
  const invalidHashes = migrations.filter(invalidHash)
  if (invalidHashes.length) {
    // Someone has altered one or more migrations which has already run - gasp!
    throw new Error(dedent`
          Hashes don't match for migrations '${invalidHashes.map(({fileName}) => fileName)}'.
          This means that the scripts has changed since it was applied.`)
  }
}

// Work out which migrations to apply
function filterMigrations(migrations, appliedMigrations) {
  const {notAppliedMigration} = migrationFile.validator(appliedMigrations)

  return migrations.filter(notAppliedMigration)
}

// Logs the result
function finalize(completedMigrations, log) {
  if (completedMigrations.length === 0) {
    log("No migrations applied")
  } else {
    log(`Successfully applied migrations: ${completedMigrations.map(({name}) => name)}`)
  }

  return completedMigrations
}

// Check whether table exists in postgres - http://stackoverflow.com/a/24089729
async function doesTableExist(client, tableName) {
  const result = await client.query(SQL`
      SELECT EXISTS (
        SELECT 1
        FROM   pg_catalog.pg_class c
        WHERE  c.relname = ${tableName}
        AND    c.relkind = 'r'
      );
    `)

  return result.rows.length > 0 && result.rows[0].exists
}
