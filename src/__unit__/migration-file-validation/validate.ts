// tslint:disable no-console
import test from "ava"
import {loadMigrationFiles} from "../.."
process.on("uncaughtException", function (err) {
  console.log(err)
})

test("two migrations with the same id", async (t) => {
  const error = await t.throwsAsync(async () =>
    loadMigrationFiles(
      "src/__unit__/migration-file-validation/fixtures/conflict",
    ),
  )
  t.regex(error.message, /non-consecutive/)
})

test("filter  migrations based on env name as test", async (t) => {
  process.env.TENANT_CODE = "test"
  let result = await loadMigrationFiles(
    "src/__unit__/migration-file-validation/fixtures/envname",
  )
  t.is(result.length, 3)
  process.env.TENANT_CODE = "test2"
  result = await loadMigrationFiles(
    "src/__unit__/migration-file-validation/fixtures/envname",
  )
  t.is(result.length, 2)
})
