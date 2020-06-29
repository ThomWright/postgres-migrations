import {hashString} from "./migration-file"

export const loadInitialMigration = async (migrationTableName: string) => {
  // Since the hash of the initial migration is distributed across users' databases
  // the values `fileName` and `sql` must NEVER change!
  const fileName = "0_create-migrations-table.sql"
  const sql = getInitialMigrationSql(migrationTableName)
  const hash = hashString(fileName + sql)

  return {
    id: 0,
    name: "create-migrations-table",
    contents: sql,
    fileName,
    hash,
    sql,
  }
}

// Formatting must not change to ensure content hash remains the same
export const getInitialMigrationSql = (
  migrationTableName: string,
) => `CREATE TABLE IF NOT EXISTS ${migrationTableName} (
  id integer PRIMARY KEY,
  name varchar(100) UNIQUE NOT NULL,
  hash varchar(40) NOT NULL, -- sha1 hex encoded hash of the file name and contents, to ensure it hasn't been altered since applying the migration
  executed_at timestamp DEFAULT current_timestamp
);
`
