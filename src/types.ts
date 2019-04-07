export interface Migration {
  readonly id: number
  readonly name: string
  readonly contents: string
  readonly fileName: string
  readonly hash: string
  readonly sql: string
}

export interface BaseDBConfig {
  readonly user: string
  readonly password: string
  readonly host: string
  readonly port: number
}

export interface CreateDBConfig extends BaseDBConfig {
  readonly defaultDatabase?: string
}

export interface MigrateDBConfig extends BaseDBConfig {
  readonly database: string
}

export type Logger = (msg: string) => void
export interface Config {
  readonly logger?: Logger
}

export class MigrationError extends Error {
  public cause?: string
}

export type FileType = "sql" | "js"
