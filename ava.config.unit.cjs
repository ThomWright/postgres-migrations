const baseConfig = require("./ava.config.cjs")

module.exports = {
  ...baseConfig,
  files: ["src/**/__unit__/**/*.ts", "!src/**/__unit__/**/fixtures/**/*"],
}
