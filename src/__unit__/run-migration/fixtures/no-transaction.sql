-- postgres-migrations disable-transaction
CREATE INDEX CONCURRENTLY thingy_idx on eggs (color);
