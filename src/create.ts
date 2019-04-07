import {CreateDBConfig, Config} from "./types"

// TODO: remove this dependency?
// tslint:disable ignore-next-line no-var-requires
const pgtools = require("pgtools")

// Time out after 10 seconds - should probably be able to override this
const DEFAULT_TIMEOUT = 10000

export async function createDb(
  dbName: string,
  dbConfig: CreateDBConfig,
  config?: Config,
) {
  if (typeof dbName !== "string") {
    throw new Error("Must pass database name as a string")
  }
  if (
    dbConfig == null ||
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    throw new Error("Database config problem")
  }

  return create(dbName, dbConfig, config)
}

async function create(
  dbName: string,
  dbConfig: CreateDBConfig,
  config: Config = {},
) {
  const {user, password, host, port} = dbConfig

  const log =
    config.logger != null
      ? config.logger
      : () => {
          //
        }

  log(`Attempting to create database: ${dbName}`)

  // pgtools mutates its inputs (tut tut) so create our own object here
  const pgtoolsConfig = {
    database:
      dbConfig.defaultDatabase != null ? dbConfig.defaultDatabase : "postgres",
    user,
    password,
    host,
    port,
  }

  try {
    await pgtools
      .createdb(pgtoolsConfig, dbName)
      .timeout(
        DEFAULT_TIMEOUT,
        `Timed out trying to create database: ${dbName}`,
      ) // pgtools uses Bluebird
    log(`Created database: ${dbName}`)
  } catch (err) {
    if (err) {
      // we are not worried about duplicate db errors
      if (err.name !== "duplicate_database") {
        log(err)
        throw new Error(
          `Error creating database. Caused by: '${err.name}: ${err.message}'`,
        )
      } else {
        log(`'${dbName}' database already exists`)
      }
    }
  }
}
