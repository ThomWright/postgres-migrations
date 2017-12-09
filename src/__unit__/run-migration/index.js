const test = require("ava")
const sinon = require("sinon")
require("sinon-bluebird")

const bluebird = require("bluebird")

const runMigration = require("../../run-migration")
const loadSqlFromJs = require("../../load-sql-from-js")

const readFile = bluebird.promisify(require("fs").readFile)

let normalSqlFile
let normalJsFile
let noTransactionSqlFile

test.before(() => {
  return bluebird.all([
    readFile(__dirname + "/fixtures/normal.sql", "utf8").then(contents => {
      normalSqlFile = contents
    }),

    readFile(__dirname + "/fixtures/no-transaction.sql", "utf8").then(contents => {
      noTransactionSqlFile = contents
    }),

    bluebird.resolve().then(() => {
      normalJsFile = loadSqlFromJs(__dirname + "/fixtures/normal.sql.js")
    }),
  ])
})

function buildMigration(sql) {
  return {
    id: "id",
    name: "name",
    sql,
    hash: "hash",
  }
}

test("runs a simple migration", t => {
  const query = sinon.stub().resolves()
  const run = runMigration({query})

  const migration = buildMigration(normalSqlFile)

  return run(migration).then(() => {
    t.is(query.callCount, 4)
    t.is(
      query.firstCall.args[0],
      "START TRANSACTION",
      "should begin a transaction"
    )

    t.is(
      query.secondCall.args[0],
      migration.sql,
      "should execute the migration"
    )

    t.deepEqual(
      query.thirdCall.args[0].values,
      [migration.id, migration.name, migration.hash],
      "should record the running of the migration in the database"
    )

    t.is(
      query.lastCall.args[0],
      "COMMIT",
      "should complete the transaction"
    )
  })
})

test("runs a simple js migration", t => {
  const query = sinon.stub().resolves()
  const run = runMigration({query})

  const migration = buildMigration(normalJsFile)

  return run(migration).then(() => {
    t.is(query.callCount, 4)
    t.is(
      query.firstCall.args[0],
      "START TRANSACTION",
      "should begin a transaction"
    )

    t.is(
      query.secondCall.args[0],
      migration.sql,
      "should execute the migration"
    )

    t.deepEqual(
      query.thirdCall.args[0].values,
      [migration.id, migration.name, migration.hash],
      "should record the running of the migration in the database"
    )

    t.is(
      query.lastCall.args[0],
      "COMMIT",
      "should complete the transaction"
    )
  })
})

test("rolls back when there is an error inside a transactiony migration", t => {
  const query = sinon.stub().rejects(new Error("There was a problem"))
  const run = runMigration({query})

  const migration = buildMigration(normalSqlFile)
  t.plan(2)

  return run(migration).catch(e => {
    t.is(query.lastCall.args[0], "ROLLBACK", "should perform a rollback")
    t.true(
      e.message.indexOf("There was a problem") >= 0,
      "should throw an error"
    )
  })
})

test("does not run the migration in a transaction when instructed", t => {
  const query = sinon.stub().resolves()
  const run = runMigration({query})

  const migration = buildMigration(noTransactionSqlFile)

  return run(migration).then(() => {
    t.is(query.callCount, 2)

    t.is(
      query.firstCall.args[0],
      migration.sql,
      "should run the migration"
    )

    t.deepEqual(
      query.secondCall.args[0].values,
      [migration.id, migration.name, migration.hash],
      "should record the running of the migration in the database"
    )
  })
})

test(
  "does not roll back when there is an error inside a transactiony migration",
  t => {
    const query = sinon.stub().rejects(new Error("There was a problem"))
    const run = runMigration({query})

    const migration = buildMigration(noTransactionSqlFile)

    return run(migration).catch(e => {
      sinon.assert.neverCalledWith(query, "ROLLBACK")
      t.true(
        e.message.indexOf("There was a problem") >= 0,
        "should throw an error"
      )
    })
  }
)
