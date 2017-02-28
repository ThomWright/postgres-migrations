const test = require("ava")
const bluebird = require("bluebird")
const {execSync} = require("child_process")
const pg = require("pg")
const SQL = require("sql-template-strings")

const startPostgres = require("./_start-postgres")

const createDb = require("../create")
const migrate = require("../migrate")

const CONTAINER_NAME = "pg-migrations-test-migrate"
const PASSWORD = startPostgres.PASSWORD

let port

test.cb.before((t) => {
  port = startPostgres(CONTAINER_NAME, t)
})

test("successful first migration", (t) => {
  const databaseName = "migration-test-success-first"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/success-first"))
    .then(() => doesTableExist(dbConfig, "success"))
    .then((exists) => {
      t.truthy(exists)
    })
})

test("successful second migration", (t) => {
  const databaseName = "migration-test-success-second"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/success-first"))
    .then(() => migrate(dbConfig, "src/__tests__/success-second"))
    .then(() => doesTableExist(dbConfig, "more_success"))
    .then((exists) => {
      t.truthy(exists)
    })
})

test("bad arguments - no db config", (t) => {
  return t.throws(migrate())
    .then((err) => {
      t.regex(err.message, /config/)
    })
})

test("bad arguments - no migrations directory argument", (t) => {
  return t.throws(migrate({
    database: "migration-test-args",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }))
  .then((err) => {
    t.regex(err.message, /directory/)
  })
})

test("bad arguments - incorrect user", (t) => {
  return t.throws(migrate({
    database: "migration-test-args",
    user: "nobody",
    password: PASSWORD,
    host: "localhost",
    port,
  }, "some/path"))
  .then((err) => {
    t.regex(err.message, /nobody/)
  })
})

test("bad arguments - incorrect password", (t) => {
  return t.throws(migrate({
    database: "migration-test-args",
    user: "postgres",
    password: "not_the_password",
    host: "localhost",
    port,
  }, "some/path"))
  .then((err) => {
    t.regex(err.message, /password/)
  })
})

test("bad arguments - incorrect host", (t) => {
  return t.throws(migrate({
    database: "migration-test-args",
    user: "postgres",
    password: PASSWORD,
    host: "sillyhost",
    port,
  }, "some/path"))
  .then((err) => {
    t.regex(err.message, /sillyhost/)
  })
})

test("bad arguments - incorrect port", (t) => {
  return t.throws(migrate({
    database: "migration-test-args",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port: 1234,
  }, "some/path"))
  .then((err) => {
    t.regex(err.message, /1234/)
  })
})

test("no database", (t) => {
  return t.throws(migrate({
    database: "migration-test-no-database",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }, "some/path"))
  .then((err) => {
    t.regex(err.message, /database "migration-test-no-database" does not exist/)
  })
})

test("no migrations dir", (t) => {
  const databaseName = "migration-test-no-dir"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "some/path")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /some\/path/)
    })
})

test("empty migrations dir", () => {
  const databaseName = "migration-test-empty-dir"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/empty")
    })
})

test("non-consecutive ordering", (t) => {
  const databaseName = "migration-test-non-consec"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/non-consecutive")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Found a non-consecutive migration ID/)
    })
})

test("not starting from one", (t) => {
  const databaseName = "migration-test-starting-id"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/start-from-2")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Found a non-consecutive migration ID/)
    })
})

test("negative ID", (t) => {
  const databaseName = "migration-test-negative"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/negative")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Found a non-consecutive migration ID/)
    })
})

test("no prefix", (t) => {
  const databaseName = "migration-test-prefix"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/no-prefix")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Migration files should begin with an integer ID/)
      t.regex(err.message, /migrate-this/, "Should name the problem file")
    })
})

test("syntax error", (t) => {
  const databaseName = "migration-test-syntax-error"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => {
      return migrate(dbConfig, "src/__tests__/syntax-error")
    })

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /syntax error/)
    })
})

test("hash check failure", (t) => {
  const databaseName = "migration-test-hash-check"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/hash-check/first-run"))
    .then(() => migrate(dbConfig, "src/__tests__/hash-check/second-run"))

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Hashes don't match/)
      t.regex(err.message, /1_migration/, "Should name the problem file")
    })
})

test("rollback", (t) => {
  const databaseName = "migration-test-rollback"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/rollback"))

  return t.throws(promise)
    .then((err) => {
      t.regex(err.message, /Rolled back/)
      t.regex(err.message, /1_trigger-rollback/)
    })
    .then(() => doesTableExist(dbConfig, "should_get_rolled_back"))
    .then((exists) => {
      t.false(exists, "The table created in the migration should not have been committed.")
    })
})

test.after.always(() => {
  execSync(`docker rm -f ${CONTAINER_NAME}`)
})

function doesTableExist(dbConfig, tableName) {
  const client = bluebird.promisifyAll(new pg.Client(dbConfig))
  return client.connectAsync()
    .then(() => client.queryAsync(SQL`
        SELECT EXISTS (
          SELECT 1
          FROM   pg_catalog.pg_class c
          WHERE  c.relname = ${tableName}
          AND    c.relkind = 'r'
        );
      `)
    )
    .then((result) => {
      client.end()
      return result.rows.length > 0 && result.rows[0].exists
    })
}
