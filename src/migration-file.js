const {promisify} = require("util")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const dedent = require("dedent-js")

const loadSqlFromJs = require("./load-sql-from-js")
const fileNameParser = require("./file-name-parser")

const readFile = promisify(fs.readFile)

const getFileName = filePath => path.basename(filePath)

const getFileContents = async filePath => readFile(filePath, "utf8")

const hashString = string =>
  crypto
    .createHash("sha1")
    .update(string, "utf8")
    .digest("hex")

const getSqlStringLiteral = async (filePath, type, migrationConfig) => {
  const content = await getFileContents(filePath)
  let sql = null

  if (type === "sql") {
    sql = content
  }

  if (type === "js") {
    const sqlFromJs = await loadSqlFromJs(filePath, migrationConfig)
    sql = dedent(sqlFromJs)
  }

  return {sql, content}
}

module.exports.load = async (filePath, migrationConfig) => {
  const fileName = getFileName(filePath)

  try {
    const {id, name, type} = fileNameParser(fileName)
    const {sql, content} = await getSqlStringLiteral(
      filePath,
      type,
      migrationConfig,
    )
    const hash = hashString(
      fileName + content + JSON.stringify(migrationConfig),
    )

    return {
      id,
      name,
      fileName,
      hash,
      sql,
    }
  } catch (err) {
    throw new Error(dedent`
      ${err.message}
      Offending file: '${fileName}'.`)
  }
}

module.exports._fileNameParser = fileNameParser
