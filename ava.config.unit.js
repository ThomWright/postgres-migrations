import baseConfig from "./ava.config"

export default {
  ...baseConfig,
  files: ["src/**/__unit__/**/*.ts"],
}
