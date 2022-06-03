export const defaultMigrationsTableName = "migrations"
export const defaultSchemaName = "public"

function isNonEmptyString(input?: string): boolean {
  return input !== undefined && input !== null && input !== ""
}

export function getFullTableName(
  tableNameInput: string | undefined,
  schemaName: string | undefined,
): string {
  const tableName =
    isNonEmptyString(tableNameInput) && tableNameInput !== undefined
      ? tableNameInput
      : defaultMigrationsTableName
  if (isNonEmptyString(schemaName)) {
    return `${schemaName}.${tableName}`
  }
  return tableName
}

export function isValidSchemaName(schemaName?: string): boolean {
  return isNonEmptyString(schemaName)
}
