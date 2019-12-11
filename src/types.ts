import * as pg from "pg"

export interface Migration {
  readonly id: number
  readonly name: string
  readonly contents: string
  readonly fileName: string
  readonly hash: string
  readonly sql: string
}

export interface ConnectionParams {
  readonly user: string
  readonly password: string
  readonly host: string
  readonly port: number
}

export interface ClientParams {
  /** A connected Client, or a Pool Client. The caller is responsible for connecting and cleaning up. */
  readonly client: pg.Client | pg.PoolClient | pg.Pool
}

export type CreateDBConfig =
  | (ConnectionParams & {
      readonly defaultDatabase?: string
    })
  | ClientParams

export type MigrateDBConfig =
  | (ConnectionParams & {
      readonly database: string
    })
  | ClientParams

export type Logger = (msg: string) => void
export type Config = Partial<FullConfig>

export interface FullConfig {
  readonly logger: Logger
}

export class MigrationError extends Error {
  public cause?: string
}

export type FileType = "sql" | "js"

export interface BasicPgClient {
  query(queryTextOrConfig: string | pg.QueryConfig): Promise<pg.QueryResult>
}
