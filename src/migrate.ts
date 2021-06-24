import * as pg from "pg"
import SQL from "sql-template-strings"
import {loadMigrationFiles} from "./files-loader"
import {runMigration} from "./run-migration"
import {
  BasicPgClient,
  Config,
  Logger,
  MigrateDBConfig,
  Migration,
  MigrationError,
} from "./types"
import {validateMigrationHashes} from "./validation"
import {withConnection} from "./with-connection"
import {withAdvisoryLock} from "./with-lock"

export async function migrate(
  dbConfig: MigrateDBConfig,
  migrationsDirectory: string,
  config: Config = {},
): Promise<Array<Migration>> {
  const log =
    config.logger != null
      ? config.logger
      : () => {
          //
        }

  if (dbConfig == null) {
    throw new Error("No config object")
  }

  if (typeof migrationsDirectory !== "string") {
    throw new Error("Must pass migrations directory as a string")
  }
  const intendedMigrations = await loadMigrationFiles(migrationsDirectory, log)

  if ("client" in dbConfig) {
    // we have been given a client to use, it should already be connected
    return withAdvisoryLock(
      log,
      runMigrations(intendedMigrations, log),
    )(dbConfig.client)
  }

  if (
    typeof dbConfig.database !== "string" ||
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    throw new Error("Database config problem")
  }

  const client = new pg.Client(dbConfig)
  client.on("error", (err) => {
    log(`pg client emitted an error: ${err.message}`)
  })

  const runWith = withConnection(
    log,
    withAdvisoryLock(log, runMigrations(intendedMigrations, log)),
  )

  return runWith(client)
}

function runMigrations(intendedMigrations: Array<Migration>, log: Logger) {
  return async (client: BasicPgClient) => {
    try {
      const migrationTableName = "migrations"

      log("Starting migrations")

      const appliedMigrations = await fetchAppliedMigrationFromDB(
        migrationTableName,
        client,
        log,
      )

      validateMigrationHashes(intendedMigrations, appliedMigrations)

      const migrationsToRun = filterMigrations(
        intendedMigrations,
        appliedMigrations,
      )
      const completedMigrations = []

      for (const migration of migrationsToRun) {
        log(`Starting migration: ${migration.id} ${migration.name}`)
        const result = await runMigration(
          migrationTableName,
          client,
          log,
        )(migration)
        log(`Finished migration: ${migration.id} ${migration.name}`)
        completedMigrations.push(result)
      }

      logResult(completedMigrations, log)

      log("Finished migrations")

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

/** Queries the database for migrations table and retrieve it rows if exists */
async function fetchAppliedMigrationFromDB(
  migrationTableName: string,
  client: BasicPgClient,
  log: Logger,
) {
  let appliedMigrations = []
  if (await doesTableExist(client, migrationTableName)) {
    log(
      `Migrations table with name '${migrationTableName}' exists, filtering not applied migrations.`,
    )

    const {rows} = await client.query(
      `SELECT * FROM ${migrationTableName} ORDER BY id`,
    )
    appliedMigrations = rows
  } else {
    log(`Migrations table with name '${migrationTableName}' hasn't been created,
so the database is new and we need to run all migrations.`)
  }
  return appliedMigrations
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

/** Check whether table exists in postgres in the current search path
 * http://stackoverflow.com/a/24089729
 * https://dba.stackexchange.com/a/86098
 */
async function doesTableExist(client: BasicPgClient, tableName: string) {
  const result = await client.query(
    SQL`SELECT to_regclass(${tableName}) is not NULL as exists;`,
  )
  return result.rows.length > 0 && result.rows[0].exists
}
