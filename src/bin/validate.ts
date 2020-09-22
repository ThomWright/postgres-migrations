#!/usr/bin/env node
// tslint:disable no-console

import {argv} from "process"
import {loadMigrationFiles} from "../files-loader"

async function main(args: Array<string>) {
  const directory = args[0]

  await loadMigrationFiles(directory, (x) => console.error(x))
}

main(argv.slice(2)).catch((e) => {
  console.error(`ERROR: ${e.message}`)
  process.exit(1)
})
