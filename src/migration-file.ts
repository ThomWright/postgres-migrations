import {promisify} from "util"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
import {loadSqlFromJs} from "./load-sql-from-js"
import {parseFileName} from "./file-name-parser"

const readFile = promisify(fs.readFile)

const getFileName = (filePath: string) => path.basename(filePath)

const getFileContents = async (filePath: string) => readFile(filePath, "utf8")

const hashString = (s: string) =>
  crypto.createHash("sha1").update(s, "utf8").digest("hex")

const getSqlStringLiteral = (
  filePath: string,
  contents: string,
  type: "js" | "sql",
  context?: {},
) => {
  switch (type) {
    case "sql":
      return contents
    case "js":
      return loadSqlFromJs(filePath, context)
    default: {
      const exhaustiveCheck: never = type
      return exhaustiveCheck
    }
  }
}

export const load = async ({
  filePath,
  context,
}: {
  filePath: string
  context?: {}
}) => {
  const fileName = getFileName(filePath)

  try {
    const {id, name, type} = parseFileName(fileName)
    const contents = await getFileContents(filePath)
    const sql = getSqlStringLiteral(filePath, contents, type, context)
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
    throw new Error(`${err.message}
Offending file: '${fileName}'.`)
  }
}

// module.exports._fileNameParser = fileNameParser
