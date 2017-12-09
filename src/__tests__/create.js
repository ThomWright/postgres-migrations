const test = require("ava")
const {execSync} = require("child_process")

const startPostgres = require("./fixtures/start-postgres")

const createDb = require("../create")

const CONTAINER_NAME = "pg-migrations-test-create"
const PASSWORD = startPostgres.PASSWORD

let port

test.cb.before((t) => {
  port = startPostgres(CONTAINER_NAME, t)
})

test("successful creation", () => {
  return createDb("create-test-success", {
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })
})

test("bad arguments - no database name", (t) => {
  return t.throws(createDb({
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  }))
  .then((err) => {
    t.regex(err.message, /database name/)
  })
})

test("bad arguments - empty db config", (t) => {
  return t.throws(createDb("create-test-no-config", {}))
    .then((err) => {
      t.regex(err.message, /config/)
    })
})

test("bad arguments - incorrect user", (t) => {
  return t.throws(createDb("create-test-user", {
    user: "nobody",
    password: PASSWORD,
    host: "localhost",
    port,
  }))
  .then((err) => {
    t.regex(err.message, /nobody/)
  })
})

test("bad arguments - incorrect password", (t) => {
  return t.throws(createDb("create-test-password", {
    user: "postgres",
    password: "not_the_password",
    host: "localhost",
    port,
  }))
  .then((err) => {
    t.regex(err.message, /password/)
  })
})

test("bad arguments - incorrect host", (t) => {
  return t.throws(createDb("create-test-host", {
    user: "postgres",
    password: PASSWORD,
    host: "sillyhost",
    port,
  }))
  .then((err) => {
    t.regex(err.message, /sillyhost/)
  })
})

test("bad arguments - incorrect port", (t) => {
  return t.throws(createDb("create-test-port", {
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port: 1234,
  }))
  .then((err) => {
    t.regex(err.message, /1234/)
  })
})

test("already created", () => {
  const create = () => createDb("create-test-duplicate", {
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })

  return create()
    .then(create)
})

test("database name included in config", () => {
  const create = () => createDb("create-test-db-name", {
    database: "somethingsilly",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })

  return create()
    .then(create)
})

test("custom default database name", () => {
  const create = () => createDb("create-test-default-db", {
    defaultDatabase: "postgres",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })

  return create()
    .then(create)
})

test.after.always(() => {
  execSync(`docker rm -f ${CONTAINER_NAME}`)
})
