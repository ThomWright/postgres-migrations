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
