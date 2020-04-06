// tslint:disable no-console
import test from "ava"
import * as pg from "pg"
import {createDb} from "../"
import {PASSWORD, startPostgres, stopPostgres} from "./fixtures/docker-postgres"

const CONTAINER_NAME = "pg-migrations-test-create"

let port: number

test.before.cb((t) => {
  port = startPostgres(CONTAINER_NAME, t)
})

test.after.always(() => {
  stopPostgres(CONTAINER_NAME)
})

test("with connected client", async (t) => {
  t.plan(0)

  const client = new pg.Client({
    database: "postgres",
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })
  await client.connect()

  try {
    await createDb("create-test-with-connected-client", {client})
  } finally {
    await client.end()
  }
})

test("successful creation", (t) => {
  t.plan(0)

  return createDb("create-test-success", {
    user: "postgres",
    password: PASSWORD,
    host: "localhost",
    port,
  })
})

test("bad arguments - no database name", (t) => {
  return t
    .throwsAsync(
      // tslint:disable-next-line no-any
      (createDb as any)({
        user: "postgres",
        password: PASSWORD,
        host: "localhost",
        port,
      }),
    )
    .then((err) => {
      t.regex(err.message, /database name/)
    })
})

test("bad arguments - empty db config", (t) => {
  return (
    t
      // tslint:disable-next-line no-any
      .throwsAsync(createDb("create-test-no-config", {} as any))
      .then((err) => {
        t.regex(err.message, /config/)
      })
  )
})

test("bad arguments - incorrect user", (t) => {
  return t
    .throwsAsync(
      createDb("create-test-user", {
        user: "nobody",
        password: PASSWORD,
        host: "localhost",
        port,
      }),
    )
    .then((err) => {
      t.regex(err.message, /nobody/)
    })
})

test("bad arguments - incorrect password", (t) => {
  return t
    .throwsAsync(
      createDb("create-test-password", {
        user: "postgres",
        password: "not_the_password",
        host: "localhost",
        port,
      }),
    )
    .then((err) => {
      t.regex(err.message, /password/)
    })
})

test("bad arguments - incorrect host", (t) => {
  return t
    .throwsAsync(
      createDb("create-test-host", {
        user: "postgres",
        password: PASSWORD,
        host: "sillyhost",
        port,
      }),
    )
    .then((err) => {
      t.regex(err.message, /sillyhost/)
    })
})

test("bad arguments - incorrect port", (t) => {
  return t
    .throwsAsync(
      createDb("create-test-port", {
        user: "postgres",
        password: PASSWORD,
        host: "localhost",
        port: 1234,
      }),
    )
    .then((err) => {
      t.regex(err.message, /1234/)
    })
})

test("already created", (t) => {
  t.plan(0)
  const create = () =>
    createDb("create-test-duplicate", {
      user: "postgres",
      password: PASSWORD,
      host: "localhost",
      port,
    })

  return create().then(create)
})

test("database name included in config", (t) => {
  t.plan(0)
  const create = () =>
    createDb("create-test-db-name", {
      database: "somethingsilly",
      user: "postgres",
      password: PASSWORD,
      host: "localhost",
      port,
      // tslint:disable-next-line no-any
    } as any)

  return create().then(create)
})

test("custom default database name", (t) => {
  t.plan(0)
  const create = () =>
    createDb("create-test-default-db", {
      defaultDatabase: "postgres",
      user: "postgres",
      password: PASSWORD,
      host: "localhost",
      port,
    })

  return create().then(create)
})
