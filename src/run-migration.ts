import SQL from "sql-template-strings"
import {Logger, Migration, BasicPgClient} from "./types"

const noop = () => {
  //
}

const split = async (migration: Migration, client: BasicPgClient) => {
  const queries = migration.sql.split("-- split-query")

  await Promise.all(queries.map(async (query: string) => client.query(query)))
}

const insertMigration = async (
  migrationTableName: string,
  client: BasicPgClient,
  migration: Migration,
  log: Logger,
) => {
  log(
    `Saving migration to '${migrationTableName}': ${migration.id} | ${migration.name} | ${migration.hash}`,
  )

  const sql = SQL`INSERT INTO `
    .append(migrationTableName)
    .append(
      SQL` ("id", "name", "hash") VALUES (${migration.id},${migration.name},${migration.hash})`,
    )

  return client.query(sql)
}

export const runMigration =
  (migrationTableName: string, client: BasicPgClient, log: Logger = noop) =>
  async (migration: Migration) => {
    const inTransaction =
      migration.sql.includes("-- postgres-migrations disable-transaction") ===
      false

    const splitQueries =
      migration.sql.includes("-- postgres-migrations split-queries") === false

    log(`Running migration in transaction: ${inTransaction}`)

    const begin = inTransaction ? () => client.query("START TRANSACTION") : noop

    const end = inTransaction ? () => client.query("COMMIT") : noop

    const cleanup = inTransaction ? () => client.query("ROLLBACK") : noop

    const run = splitQueries
      ? () => client.query(migration.sql)
      : () => split(migration, client)

    try {
      await begin()
      await run()
      await insertMigration(migrationTableName, client, migration, log)
      await end()

      return migration
    } catch (err) {
      try {
        await cleanup()
      } catch {
        //
      }
      throw new Error(
        `An error occurred running '${migration.name}'. Rolled back this migration. No further migrations were run. Reason: ${err.message}`,
      )
    }
  }
