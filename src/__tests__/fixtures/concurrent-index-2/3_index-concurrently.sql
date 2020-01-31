-- postgres-migrations disable-transaction

CREATE INDEX CONCURRENTLY concurrent_index ON concurrent (id);
