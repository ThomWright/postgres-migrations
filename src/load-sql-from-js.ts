import * as path from "path"

export const loadSqlFromJs = (filePath: string): string => {
  const migrationModule = require(filePath)
  if (!migrationModule.generateSql) {
    throw new Error(`Invalid javascript migration file: '${path.basename(
      filePath,
    )}'.
It must to export a 'generateSql' function.`)
  }
  const generatedValue = migrationModule.generateSql()
  if (typeof generatedValue !== "string") {
    throw new Error(`Invalid javascript migration file: '${path.basename(
      filePath,
    )}'.
'generateSql' function must return a string literal.`)
  }

  return generatedValue
}
