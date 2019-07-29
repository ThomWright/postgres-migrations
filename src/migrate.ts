import * as pg from "pg"
import SQL from "sql-template-strings"

import {runMigration} from "./run-migration"
import {load} from "./files-loader"
import {
  MigrateDBConfig,
  Config,
  MigrationError,
  Logger,
  Migration,
  FullConfig,
} from "./types"

export async function migrate(
  dbConfig: MigrateDBConfig,
  migrationsDirectory: string,
  config: Config = {},
) {
  if (
    dbConfig == null ||
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

  const fullConfig: FullConfig = {
    logger:
      config.logger != null
        ? config.logger
        : () => {
            //
          },
  }

  return loadAndRunMigrations(dbConfig, migrationsDirectory, fullConfig)
}

async function loadAndRunMigrations(
  dbConfig: MigrateDBConfig,
  migrationsDirectory: string,
  config: FullConfig,
): Promise<Array<Migration>> {
  const {logger: log} = config

  const intendedMigrations = await load(migrationsDirectory, log)

  const client = new pg.Client(dbConfig)

  client.on("error", err => {
    log(`pg client emitted an error: ${err.message}`)
  })

  log("Attempting database migration")

  const runWith = withConnection(
    config,
    runMigrations(intendedMigrations, config),
  )

  return runWith(client)
}

function runMigrations(
  intendedMigrations: Array<Migration>,
  {logger: log}: FullConfig,
): (client: pg.Client) => Promise<Array<Migration>> {
  return async (client: pg.Client) => {
    try {
      const migrationTableName = "migrations"

      log("Will run migrations...")

      const appliedMigrations = await fetchAppliedMigrationFromDB(
        migrationTableName,
        client,
        log,
      )

      log(appliedMigrations.length.toString())

      validateMigrations(intendedMigrations, appliedMigrations)

      const migrationsToRun = filterMigrations(
        intendedMigrations,
        appliedMigrations,
      )
      const completedMigrations = []

      for (const migration of migrationsToRun) {
        const result = await runMigration(migrationTableName, client, log)(
          migration,
        )
        completedMigrations.push(result)
      }

      logResult(completedMigrations, log)

      return completedMigrations
    } catch (e) {
      const error: MigrationError = new Error(
        `Migration failed. Reason: ${e.message}`,
      )
      error.cause = e
      throw error
    }
  }
}

function withConnection<T>(
  {logger: log}: FullConfig,
  f: (client: pg.Client) => Promise<T>,
): (client: pg.Client) => Promise<T> {
  return async (client: pg.Client): Promise<T> => {
    try {
      try {
        await client.connect()
        log("Connected to database")
      } catch (e) {
        log(`Error connecting to database: ${e.message}`)
        throw e
      }

      const result = await f(client)
      return result
    } finally {
      // always try to close the connection
      try {
        await client.end()
      } catch (e) {
        log(`Error closing the connection: ${e.message}`)
      }
    }
  }
}

/** Queries the database for migrations table and retrieve it rows if exists */
async function fetchAppliedMigrationFromDB(
  migrationTableName: string,
  client: pg.Client,
  log: Logger,
) {
  let appliedMigrations = []
  if (await doesTableExist(client, migrationTableName)) {
    log(`
Migrations table with name '${migrationTableName}' exists,
filtering not applied migrations.`)

    const {rows} = await client.query(
      `SELECT * FROM ${migrationTableName} ORDER BY id`,
    )
    appliedMigrations = rows
  } else {
    log(`
Migrations table with name '${migrationTableName}' hasn't been created,
so the database is new and we need to run all migrations.`)
  }
  return appliedMigrations
}

/** Validates mutation order and hash */
function validateMigrations(
  migrations: Array<Migration>,
  appliedMigrations: Record<number, Migration | undefined>,
) {
  const indexNotMatch = (migration: Migration, index: number) =>
    migration.id !== index
  const invalidHash = (migration: Migration) => {
    const appliedMigration = appliedMigrations[migration.id]
    return appliedMigration != null && appliedMigration.hash !== migration.hash
  }

  // Assert migration IDs are consecutive integers
  const notMatchingId = migrations.find(indexNotMatch)
  if (notMatchingId) {
    throw new Error(
      `Found a non-consecutive migration ID on file: '${notMatchingId.fileName}'`,
    )
  }

  // Assert migration hashes are still same
  const invalidHashes = migrations.filter(invalidHash)
  if (invalidHashes.length > 0) {
    // Someone has altered one or more migrations which has already run - gasp!
    const invalidFiles = invalidHashes.map(({fileName}) => fileName)
    throw new Error(`
Hashes don't match for migrations '${invalidFiles}'.
This means that the scripts have changed since it was applied.`)
  }
}

/** Work out which migrations to apply */
function filterMigrations(
  migrations: Array<Migration>,
  appliedMigrations: Record<number, Migration | undefined>,
) {
  const notAppliedMigration = (migration: Migration) =>
    !appliedMigrations[migration.id]

  return migrations.filter(notAppliedMigration)
}

/** Logs the result */
function logResult(completedMigrations: Array<Migration>, log: Logger) {
  if (completedMigrations.length === 0) {
    log("No migrations applied")
  } else {
    log(
      `Successfully applied migrations: ${completedMigrations.map(
        ({name}) => name,
      )}`,
    )
  }
}

/** Check whether table exists in postgres - http://stackoverflow.com/a/24089729 */
async function doesTableExist(client: pg.Client, tableName: string) {
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
