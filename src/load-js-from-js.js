const dedent = require("dedent-js")
const path = require("path")

module.exports = filePath => {
  const mutationModule = require(filePath)
  if (!mutationModule.generateSql) {
    throw new Error(dedent`
          Invalid javascript mutation file: '${path.basename(filePath)}'.
          It need to export a 'generateSql' function.`)
  }
  const generatedValue = mutationModule.generateSql()
  if (typeof generatedValue !== "string") {
    throw new Error(dedent`
          Invalid javascript mutation file: '${path.basename(filePath)}'.
          'generateSql' function must return a string literal.`)
  }

  return generatedValue
}
