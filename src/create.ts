import * as pg from "pg"
import {BasicPgClient, Config, CreateDBConfig, Logger} from "./types"
import {withConnection} from "./with-connection"

const DUPLICATE_DATABASE = "42P04"

/**
 * @deprecated Use `migrate` instead with `ensureDatabaseExists: true`.
 */
export async function createDb(
  dbName: string,
  dbConfig: CreateDBConfig,
  config: Config = {},
): Promise<void> {
  if (typeof dbName !== "string") {
    throw new Error("Must pass database name as a string")
  }

  const log =
    config.logger != null
      ? config.logger
      : () => {
          //
        }

  if (dbConfig == null) {
    throw new Error("No config object")
  }

  if ("client" in dbConfig) {
    return runCreateQuery(dbName, log)(dbConfig.client)
  }

  if (
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    throw new Error("Database config problem")
  }

  const {user, password, host, port} = dbConfig
  const client = new pg.Client({
    database:
      dbConfig.defaultDatabase != null ? dbConfig.defaultDatabase : "postgres",
    user,
    password,
    host,
    port,
  })
  client.on("error", (err) => {
    log(`pg client emitted an error: ${err.message}`)
  })

  const runWith = withConnection(log, runCreateQuery(dbName, log))

  return runWith(client)
}

export function runCreateQuery(dbName: string, log: Logger) {
  return async (client: BasicPgClient): Promise<void> => {
    await client
      .query(`CREATE DATABASE "${dbName.replace(/\"/g, '""')}"`)
      .catch((e) => {
        switch (e.code) {
          case DUPLICATE_DATABASE: {
            log(`'${dbName}' database already exists`)
            return
          }

          default: {
            log(e)
            throw new Error(
              `Error creating database. Caused by: '${e.name}: ${e.message}'`,
            )
          }
        }
      })
  }
}
