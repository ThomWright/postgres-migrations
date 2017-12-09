module.exports = filePath => {
  const mutationModule = require(filePath)
  if (mutationModule.generateSql) {
    return mutationModule.generateSql()
  }
  return false
}
