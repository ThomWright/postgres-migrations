const test = require("ava")
const {execSync} = require("child_process")
const pg = require("pg")
const SQL = require("sql-template-strings")

const startPostgres = require("./fixtures/start-postgres")

const createDb = require("../create")
const migrate = require("../migrate")

const CONTAINER_NAME = "pg-migrations-test-migrate"
const PASSWORD = startPostgres.PASSWORD

let port

process.on("uncaughtException", function(err) {
  console.log(err)
})

test.before.cb(t => {
  port = startPostgres(CONTAINER_NAME, t)
})

test("successful first migration", t => {
  const databaseName = "migration-test-success-first"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-first"))
    .then(() => doesTableExist(dbConfig, "success"))
    .then(exists => {
      t.truthy(exists)
    })
})

test("successful second migration", t => {
  const databaseName = "migration-test-success-second"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-first"))
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-second"))
    .then(() => doesTableExist(dbConfig, "more_success"))
    .then(exists => {
      t.truthy(exists)
    })
})

test("successful first javascript migration", t => {
  const databaseName = "migration-test-success-js-first"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-js-first"))
    .then(() => doesTableExist(dbConfig, "success"))
    .then(exists => {
      t.truthy(exists)
    })
})

test("successful second mixed js and sql migration", t => {
  const databaseName = "migration-test-success-second-mixed-js-sql"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-js-first"))
    .then(() =>
      migrate(dbConfig, "src/__tests__/fixtures/success-second-mixed-js-sql"),
    )
    .then(() => doesTableExist(dbConfig, "more_success"))
    .then(exists => {
      t.truthy(exists)
    })
})

test("successful complex js migration", t => {
  const databaseName = "migration-test-success-complex-js"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig)
    .then(() => migrate(dbConfig, "src/__tests__/fixtures/success-complex-js"))
    .then(() => doesTableExist(dbConfig, "complex"))
    .then(exists => {
      t.truthy(exists)
    })
})

test("bad arguments - no db config", t => {
  return t.throwsAsync(migrate()).then(err => {
    t.regex(err.message, /config/)
  })
})

test("bad arguments - no migrations directory argument", t => {
  return t
    .throwsAsync(
      migrate({
        database: "migration-test-args",
        user: "postgres",
        password: PASSWORD,
        host: "localhost",
        port,
      }),
    )
    .then(err => {
      t.regex(err.message, /directory/)
    })
})

test("bad arguments - incorrect user", t => {
  return t
    .throwsAsync(
      migrate(
        {
          database: "migration-test-args",
          user: "nobody",
          password: PASSWORD,
          host: "localhost",
          port,
        },
        "some/path",
      ),
    )
    .then(err => {
      t.regex(err.message, /nobody/)
    })
})

test("bad arguments - incorrect password", t => {
  return t
    .throwsAsync(
      migrate(
        {
          database: "migration-test-args",
          user: "postgres",
          password: "not_the_password",
          host: "localhost",
          port,
        },
        "some/path",
      ),
    )
    .then(err => {
      t.regex(err.message, /password/)
    })
})

test("bad arguments - incorrect host", t => {
  return t
    .throwsAsync(
      migrate(
        {
          database: "migration-test-args",
          user: "postgres",
          password: PASSWORD,
          host: "sillyhost",
          port,
        },
        "some/path",
      ),
    )
    .then(err => {
      t.regex(err.message, /sillyhost/)
    })
})

test("bad arguments - incorrect port", t => {
  return t
    .throwsAsync(
      migrate(
        {
          database: "migration-test-args",
          user: "postgres",
          password: PASSWORD,
          host: "localhost",
          port: 1234,
        },
        "some/path",
      ),
    )
    .then(err => {
      t.regex(err.message, /1234/)
    })
})

test("no database", t => {
  return t
    .throwsAsync(
      migrate(
        {
          database: "migration-test-no-database",
          user: "postgres",
          password: PASSWORD,
          host: "localhost",
          port,
        },
        "some/path",
      ),
    )
    .then(err => {
      t.regex(
        err.message,
        /database "migration-test-no-database" does not exist/,
      )
    })
})

test("no migrations dir", t => {
  const databaseName = "migration-test-no-dir"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "some/path")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /some\/path/)
  })
})

test("empty migrations dir", t => {
  t.plan(0)
  const databaseName = "migration-test-empty-dir"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  return createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/empty")
  })
})

test("non-consecutive ordering", t => {
  const databaseName = "migration-test-non-consec"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/non-consecutive")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /Found a non-consecutive migration ID/)
  })
})

test("not starting from one", t => {
  const databaseName = "migration-test-starting-id"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/start-from-2")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /Found a non-consecutive migration ID/)
  })
})

test("negative ID", t => {
  const databaseName = "migration-test-negative"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/negative")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /Found a non-consecutive migration ID/)
    t.regex(err.message, /-1_negative/, "Should name the problem file")
  })
})

test("invalid file name", t => {
  const databaseName = "migration-test-invalid-file-name"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/invalid-file-name")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /Invalid file name/)
    t.regex(err.message, /migrate-this/, "Should name the problem file")
  })
})

test("syntax error", t => {
  const databaseName = "migration-test-syntax-error"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/syntax-error")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /syntax error/)
  })
})

test("bad javascript file - no generateSql method exported", t => {
  const databaseName = "migration-test-javascript-file-errors"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/js-no-generate-sql")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /export a 'generateSql' function/)
  })
})

test("bad javascript file - generateSql not returning string literal", t => {
  const databaseName = "migration-test-javascript-no-literal"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() => {
    return migrate(dbConfig, "src/__tests__/fixtures/js-no-string-literal")
  })

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /string literal/)
  })
})

test("hash check failure", t => {
  const databaseName = "migration-test-hash-check"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig)
    .then(() =>
      migrate(dbConfig, "src/__tests__/fixtures/hash-check/first-run"),
    )
    .then(() =>
      migrate(dbConfig, "src/__tests__/fixtures/hash-check/second-run"),
    )

  return t.throwsAsync(promise).then(err => {
    t.regex(err.message, /Hashes don't match/)
    t.regex(err.message, /1_migration/, "Should name the problem file")
  })
})

test("rollback", t => {
  const databaseName = "migration-test-rollback"
  const dbConfig = {
    database: databaseName,
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }

  const promise = createDb(databaseName, dbConfig).then(() =>
    migrate(dbConfig, "src/__tests__/fixtures/rollback"),
  )

  return t
    .throwsAsync(promise)
    .then(err => {
      t.regex(err.message, /Rolled back/)
      t.regex(err.message, /trigger-rollback/)
    })
    .then(() => doesTableExist(dbConfig, "should_get_rolled_back"))
    .then(exists => {
      t.false(
        exists,
        "The table created in the migration should not have been committed.",
      )
    })
})

test.after.always(() => {
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`)
  } catch (error) {
    console.log("Could not remove the Postgres container")
    throw error
  }
})

function doesTableExist(dbConfig, tableName) {
  const client = new pg.Client(dbConfig)
  client.on("error", err => console.log("doesTableExist on error", err))
  return client
    .connect()
    .then(() =>
      client.query(SQL`
        SELECT EXISTS (
          SELECT 1
          FROM   pg_catalog.pg_class c
          WHERE  c.relname = ${tableName}
          AND    c.relkind = 'r'
        );
      `),
    )
    .then(result => {
      try {
        return client
          .end()
          .then(() => {
            return result.rows.length > 0 && result.rows[0].exists
          })
          .catch(error => {
            console.log("Async error in 'doesTableExist", error)
            return result.rows.length > 0 && result.rows[0].exists
          })
      } catch (error) {
        console.log("Sync error in 'doesTableExist", error)
        return result.rows.length > 0 && result.rows[0].exists
      }
    })
}
