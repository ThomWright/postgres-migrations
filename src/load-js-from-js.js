const dedent = require("dedent-js")
const path = require("path")

module.exports = filePath => {
  const mutationModule = require(filePath)
  if (!mutationModule.generateSql) {
    throw new Error(dedent`
          Invalid javascript mutation file: '${path.basename(filePath)}'.
          It need to export a 'generateSql' function.`)
  }
  return mutationModule.generateSql()
}
