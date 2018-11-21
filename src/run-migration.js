const SQL = require("sql-template-strings")
const dedent = require("dedent-js")

const noop = () => {}
const insertMigration = async (migrationTableName, client, migration, log) => {
  log(
    `Saving migration to '${migrationTableName}': ${migration.id} | ${
      migration.name
    } | ${migration.hash}`,
  )

  const sql = SQL`INSERT INTO `
    .append(migrationTableName)
    .append(
      SQL` ("id", "name", "hash") VALUES (${migration.id},${migration.name},${
        migration.hash
      })`,
    )

  log(`Executing query: ${sql.text}:${sql.values}`)

  return client.query(sql)
}

module.exports = (
  migrationTableName,
  client,
  log = noop,
) => async migration => {
  const inTransaction =
    migration.sql.includes("-- postgres-migrations disable-transaction") ===
    false

  log(`Running migration in transaction: ${inTransaction}`)

  const begin = inTransaction ? () => client.query("START TRANSACTION") : noop

  const end = inTransaction ? () => client.query("COMMIT") : noop

  const cleanup = inTransaction ? () => client.query("ROLLBACK") : noop

  try {
    await begin()
    await client.query(migration.sql)
    await insertMigration(migrationTableName, client, migration, log)
    await end()

    return migration
  } catch (err) {
    try {
      await cleanup()
    } finally {
      // eslint-disable-next-line no-unsafe-finally
      throw new Error(
        dedent`
An error occurred running '${migration.name}'. Rolled back this migration.
No further migrations were run.
Reason: ${err.message}`,
      )
    }
  }
}
