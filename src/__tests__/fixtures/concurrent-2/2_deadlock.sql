-- will acquire ROW EXCLUSIVE table-level locks for the rest of the (reasonably long-running) transaction
INSERT INTO concurrent (id) SELECT i FROM generate_series(1, 1000000) as t(i);

-- will attempt to acquire ACCESS EXCLUSIVE table-level lock
-- will deadlock if this same transaction is running concurrently:
-- - both transactions will be waiting for the other to release the conflicting ROW EXCLUSIVE locks
ALTER TABLE concurrent ADD PRIMARY KEY (id);
