const dedent = require("dedent-js")
const path = require("path")

const loadFromObject = async (filePath, migrationModule, migrationConfig) => {
  if (!migrationModule.generateSql) {
    throw new Error(dedent`
          Invalid javascript migration file: '${path.basename(filePath)}'.
          It must to export a 'generateSql' function.`)
  }
  return await migrationModule.generateSql(migrationConfig)
}

const getModuleValue = async (filePath, migrationConfig) => {
  const migrationModule = require(filePath)
  const type = typeof migrationModule

  let generatedValue
  if (type === "function") {
    generatedValue = await migrationModule(migrationConfig)
  }

  if (type === "string") {
    generatedValue = migrationModule
  }

  if (type === "object") {
    generatedValue = await loadFromObject(
      filePath,
      migrationModule,
      migrationConfig,
    )
  }

  return generatedValue
}

module.exports = async (filePath, migrationConfig) => {
  const generatedValue = await getModuleValue(filePath, migrationConfig)
  if (typeof generatedValue !== "string") {
    throw new Error(dedent`
          Invalid javascript migration file: '${path.basename(filePath)}'.
          'generateSql' function must return a string literal.`)
  }

  return generatedValue
}
