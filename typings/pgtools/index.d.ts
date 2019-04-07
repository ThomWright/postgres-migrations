declare module "pgtools" {
  import {QueryResult} from "pg"
  import * as Bluebird from "bluebird"

  interface PgtoolsConfig {
    database: string
    user: string
    password: string
    host: string
    port: number
  }

  type CreateDb = (
    config: PgtoolsConfig,
    databaseName: string,
  ) => Bluebird<QueryResult>
  interface Pgtools {
    createDb: CreateDb
  }

  export = Pgtools
}
