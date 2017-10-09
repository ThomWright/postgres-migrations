const bluebird = require("bluebird")
const SQL = require("sql-template-strings")
const dedent = require("dedent-js")

const noop = () => {}

module.exports = client => migration => {
  const inTransaction = migration.sql
    .split("\n")[0]
    .indexOf("-- postgres-migrations disable-transaction") === -1

  const begin = inTransaction
    ? () => client.query("START TRANSACTION")
    : noop

  const end = inTransaction
    ? () => client.query("COMMIT")
    : noop

  const cleanup = inTransaction
    ? () => client.query("ROLLBACK")
    : noop

  return bluebird
    .resolve()
    .then(begin)
    .then(() => client.query(migration.sql))
    .then(() => {
      return client.query(
        SQL`
        INSERT INTO migrations (id, name, hash)
          VALUES (${migration.id}, ${migration.name}, ${migration.hash})
      `
      )
    })
    .then(end)
    .catch(err => {
      return bluebird.resolve().tap(cleanup).then(() => {
        throw new Error(
          dedent`
            An error occurred running '${migration.name}'. Rolled back this migration.
            No further migrations were run.
            Reason: ${err.message}`
        )
      })
    })
}
