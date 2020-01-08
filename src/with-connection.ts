import * as pg from "pg"
import {Logger, BasicPgClient} from "./types"

export function withConnection<T>(
  log: Logger,
  f: (client: BasicPgClient) => Promise<T>,
): (client: pg.Client) => Promise<T> {
  return async (client: pg.Client): Promise<T> => {
    try {
      try {
        await client.connect()
        log("Connected to database")
      } catch (e) {
        log(`Error connecting to database: ${e.message}`)
        throw e
      }

      const result = await f(client)
      return result
    } finally {
      // always try to close the connection
      try {
        await client.end()
      } catch (e) {
        log(`Error closing the connection: ${e.message}`)
      }
    }
  }
}
