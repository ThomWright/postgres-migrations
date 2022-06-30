#!/usr/bin/env node
// tslint:disable no-console

import {argv} from "process"
import {config as envConfig} from "dotenv"
import {migrate} from "../migrate"

async function main(args: Array<string>) {
  envConfig()
  const directory = typeof args[0] !== "string" ? "./db_migrations" : args[0]
  if (typeof process.env.DB_NAME !== "string") {
    console.log("DB_NAME is not set in environment")
    process.exit(1)
  }
  if (typeof process.env.DB_USERNAME !== "string") {
    console.log("DB_USERNAME is not set in environment")
    process.exit(1)
  }
  if (typeof process.env.DB_PASSWORD !== "string") {
    console.log("DB_PASSWORD is not set in environment")
    process.exit(1)
  }
  if (typeof process.env.DB_SERVER !== "string") {
    console.log("DB_SERVER is not set in environment")
    process.exit(1)
  }
  if (typeof process.env.DB_SCHEMA !== "string") {
    console.log("DB_SCHEMA is not set in environment")
    process.exit(1)
  }
  if (typeof process.env.TENANT_CODE !== "string") {
    console.log("TENANT_CODE is not set in environment")
    process.exit(1)
  }
  const port =
    typeof process.env.DB_PORT === "string"
      ? parseInt(process.env.DB_PORT, 10)
      : 5432
  const dbConfig = {
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_SERVER,
    port,
    // Default: false for backwards-compatibility
    // This might change!
    ensureDatabaseExists: true,

    // Default: "postgres"
    // Used when checking/creating "database-name"
    defaultDatabase: process.env.DB_NAME,
  }
  const config = {
    schema: process.env.DB_SCHEMA,
    log: (x: string) => console.log(x),
  }
  await migrate(dbConfig, directory, config)
}

main(argv.slice(2)).catch((e) => {
  console.error(`ERROR: ${e.message}`)
  process.exit(1)
})
