module.exports = {
  generateSql: ({migrationTableName}) => `
    CREATE TABLE IF NOT EXISTS ${migrationTableName} (
      id integer PRIMARY KEY,
      name varchar(100) UNIQUE NOT NULL,
      hash varchar(40) NOT NULL, -- sha1 hex encoded hash of the file name and contents, to ensure it hasn't been altered since applying the migration
      executed_at timestamp DEFAULT current_timestamp
    )`,
}
