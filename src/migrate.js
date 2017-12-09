const pg = require("pg")
const fs = require("fs")
const crypto = require("crypto")
const bluebird = require("bluebird")
const path = require("path")
const SQL = require("sql-template-strings")
const dedent = require("dedent-js")

const runMigration = require("./run-migration")
const loadSqlFromJs = require("./load-js-from-js")

module.exports = migrate

function migrate(dbConfig = {}, migrationsDirectory, config = {}) { // eslint-disable-line complexity
  if (
    typeof dbConfig.database !== "string" ||
    typeof dbConfig.user !== "string" ||
    typeof dbConfig.password !== "string" ||
    typeof dbConfig.host !== "string" ||
    typeof dbConfig.port !== "number"
  ) {
    return Promise.reject(new Error("Database config problem"))
  }
  if (typeof migrationsDirectory !== "string") {
    return Promise.reject(new Error("Must pass migrations directory as a string"))
  }

  const log = config.logger || (() => {})

  const client = new pg.Client(dbConfig)

  client.on("error", (err) => {
    log(`pg client emitted an error: ${err.message}`)
  })

  log("Attempting database migration")

  try {
    return bluebird.resolve()
      .then(() => client.connect())
      .then(() => log("Connected to database"))
      .then(() => loadMigrationFiles(migrationsDirectory, log))
      .then(filterMigrations(client))
      .each(runMigration(client))
      .then(finalise(client, log))
      .catch((err) => {
        log(`Migration failed. Reason: ${err.message}`)
        try {
          return client.end()
            .then(() => {
              throw err
            })
            .catch(() => {
              throw err
            })
        } catch (e) {
          return Promise.reject(err)
        }
      })
  } catch (e) {
    return Promise.reject(e)
  }
}

function finalise(client, log) {
  return (completedMigrations) => {
    if (completedMigrations.length === 0) {
      log("No migrations applied")
    } else {
      const names = completedMigrations.map((m) => m.name)
      log(`Successfully applied migrations: ${names}`)
    }

    return client.end()
      .then(() => completedMigrations)
  }
}

// Work out which migrations to apply
function filterMigrations(client) {
  return (migrations) => {
    // Arrange in ID order
    const orderedMigrations = migrations.sort((a, b) => a.id - b.id)

    // Assert their IDs are consecutive integers
    migrations.forEach((mig, i) => {
      if (mig.id !== i) {
        throw new Error("Found a non-consecutive migration ID")
      }
    })

    return doesTableExist(client, "migrations")
      .then((exists) => {
        if (!exists) {
          // Migrations table hasn't been created,
          // so the database is new and we need to run all migrations
          return orderedMigrations
        }

        return client.query("SELECT * FROM migrations")
          .then(filterUnappliedMigrations(orderedMigrations))
      })
  }
}

// Remove migrations that have already been applied
function filterUnappliedMigrations(orderedMigrations) {
  return ({rows: appliedMigrations}) => {
    return orderedMigrations.filter((mig) => {
      const migRecord = appliedMigrations[mig.id]
      if (!migRecord) {
        return true
      }
      if (migRecord.hash !== mig.hash) {
        // Someone has altered a migration which has already run - gasp!
        throw new Error(dedent`
          Hashes don't match for migration file '${mig.fileName}'.
          This means that the script has changed since it was applied.`)
      }
      return false
    })
  }
}

const isFile = (type) => (fileName) => fileName.endsWith(type)
const isSqlFile = isFile(".sql")
const isJsFile = isFile(".js")
const readDir = bluebird.promisify(fs.readdir)
function loadMigrationFiles(directory, log) {
  log(`Loading migrations from: ${directory}`)
  return readDir(directory)
    .then((fileNames) => {
      log(`Found migration files: ${fileNames}`)
      return fileNames
        .map((fileName) => fileName.toLowerCase())
        .filter((fileName) => isSqlFile(fileName) || isJsFile(fileName))
        .map((fileName) => path.resolve(directory, fileName))
    })
    .then((fileNames) => {
      // Add a special zeroth migration to create the migrations table
      fileNames.unshift(path.join(__dirname, "migrations/0_create-migrations-table.sql"))
      return fileNames
    })
    .then((fileNames) => bluebird.map(fileNames, loadFile))
}

const readFile = bluebird.promisify(fs.readFile)
const fileNameParser = (fileName) => {
  const [_, id, __, name, type] = /^(([^_-]|-\d)+)[_-](.*).(sql|js)/g.exec(fileName) // eslint-disable-line

  return {
    id: parseInt(id, 10),
    name,
    type,
  }
}

function checkLoadJs(mutationDefinition) {
  if (mutationDefinition.type === "js") {
    mutationDefinition.sql = dedent(loadSqlFromJs(mutationDefinition.file))
  }
  return mutationDefinition
}

function loadFile(filePath) {
  const fileName = path.basename(filePath)

  const {id, name, type} = fileNameParser(fileName)
  if (isNaN(id)) {
    return Promise.reject(new Error(dedent`
      Migration files should begin with an integer ID.
      Offending file: '${fileName}'`))
  }

  return readFile(filePath, "utf8")
    .then((contents) => {
      const hash = crypto.createHash("sha1")
      hash.update(fileName + contents, "utf8")
      const encodedHash = hash.digest("hex")

      return {
        id,
        name,
        type,
        fileName,
        sql: contents,
        file: filePath,
        hash: encodedHash,
      }
    })
    .then(checkLoadJs)
}

// Check whether table exists in postgres - http://stackoverflow.com/a/24089729
function doesTableExist(client, tableName) {
  return client.query(SQL`
      SELECT EXISTS (
        SELECT 1
        FROM   pg_catalog.pg_class c
        WHERE  c.relname = ${tableName}
        AND    c.relkind = 'r'
      );
    `)
    .then((result) => {
      return result.rows.length > 0 && result.rows[0].exists
    })
}
