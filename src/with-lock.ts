import {Logger, BasicPgClient} from "./types"

export function withAdvisoryLock<T>(
  log: Logger,
  f: (client: BasicPgClient) => Promise<T>,
): (client: BasicPgClient) => Promise<T> {
  return async (client: BasicPgClient): Promise<T> => {
    try {
      try {
        log("Acquiring advisory lock...")
        let acquired = false
        while (!acquired) {
          const lockResult = await client.query(
            "SELECT pg_try_advisory_lock(-8525285245963000605);",
          )
          if (lockResult.rows[0].pg_try_advisory_lock === true) {
            acquired = true
          } else {
            await new Promise((res) => setTimeout(res, 1000))
          }
        }
        log("... acquired advisory lock")
      } catch (e) {
        log(`Error acquiring advisory lock: ${e.message}`)
        throw e
      }

      const result = await f(client)
      return result
    } catch (e) {
      log(`Error while using lock: ${e.message}`)
      throw e
    } finally {
      try {
        log("Releasing advisory lock...")
        await client.query("SELECT pg_advisory_unlock(-8525285245963000605);")
        log("... released advisory lock")
      } catch (e) {
        log(`Error releasing advisory lock: ${e.message}`)
      }
    }
  }
}
