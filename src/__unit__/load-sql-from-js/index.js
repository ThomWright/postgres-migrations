const test = require("ava")

const loadSqlFromJs = require("../../load-sql-from-js")

const fixturesPaths = {
  normal: __dirname + "/fixtures/normal.sql.js",
  async: __dirname + "/fixtures/async.sql.js",
}

test("load js file with normal generateSql", async t => {
  const sql = await loadSqlFromJs(fixturesPaths.normal)
  t.truthy(sql)
})

test("load js file with async generateSql", async t => {
  const sql = await loadSqlFromJs(fixturesPaths.async)
  t.truthy(sql)
})
