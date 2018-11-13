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

const getSqlStringLiteral = (filePath, contents, type) => {
  let result
  switch (type) {
    case "sql":
      result = contents
      break
    case "js":
      result = dedent(loadSqlFromJs(filePath))
      break
    default:
      result = null
      break
  }
  return result
}

module.exports.load = async filePath => {
  const fileName = getFileName(filePath)

  try {
    const {id, name, type} = fileNameParser(fileName)
    const contents = await getFileContents(filePath)
    const sql = getSqlStringLiteral(filePath, contents, type)
    const hash = hashString(fileName + sql)

    return {
      id,
      name,
      contents,
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
