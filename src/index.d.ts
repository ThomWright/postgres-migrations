declare module "postgres-migrations" {
  export interface Migration {
    id: number
    name: string
    contents: string
    fileName: string
    hash: string
    sql: string
  }

  interface BaseDBConfig {
    user: string
    password: string
    host: string
    port: number
  }

  export interface CreateDBConfig extends BaseDBConfig {
    defaultDatabase?: string
  }

  export interface MigrateDBConfig extends BaseDBConfig {
    database: string
  }

  export interface Config {
    logger: (msg: string) => void
  }

  export function createDb(
    dbName: string,
    dbConfig: CreateDBConfig,
    config: Config,
  ): Promise<void>

  export function migrate(
    dbConfig: MigrateDBConfig,
    migrationsDirectory: string,
    config: Config,
  ): Promise<Migration[]>
}
