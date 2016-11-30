const pgtools = require("pgtools")

module.exports = createDb

// Time out after 10 seconds - should probably be able to override this
const DEFAULT_TIMEOUT = 10000

function createDb(dbName, dbConfig = {}, config = {}) { // eslint-disable-line complexity
  const {user, password, host, port} = dbConfig
  if (typeof dbName !== "string") {
    return Promise.reject(new Error("Must pass database name as a string"))
  }
  if (
    typeof user !== "string" ||
    typeof password !== "string" ||
    typeof host !== "string" ||
    typeof port !== "number"
  ) {
    return Promise.reject(new Error("Database config problem"))
  }

  const log = config.logger || (() => {})

  log(`Attempting to create database: ${dbName}`)

  // pgtools mutates its inputs (tut tut) so create our own object here
  const pgtoolsConfig = {
    database: dbConfig.defaultDatabase || "postgres",
    user,
    password,
    host,
    port,
  }

  return pgtools.createdb(
    pgtoolsConfig,
    dbName
  )
  .timeout(DEFAULT_TIMEOUT, `Timed out trying to create database: ${dbName}`) // pgtools uses Bluebird
  .then(() => log(`Created database: ${dbName}`))
  .catch((err) => {
    if (err) {
      // we are not worried about duplicate db errors
      if (err.name !== "duplicate_database") {
        log(err)
        throw new Error(`Error creating database. Caused by: '${err.name}: ${err.message}'`)
      } else {
        log(`'${dbName}' database already exists`)
      }
    }
  })
}
