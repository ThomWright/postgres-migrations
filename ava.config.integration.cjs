const baseConfig = require("./ava.config.cjs")

module.exports = {
  ...baseConfig,
  files: ["src/**/__tests__/**/*.ts", "!src/**/__tests__/**/fixtures/**/*"],
}
