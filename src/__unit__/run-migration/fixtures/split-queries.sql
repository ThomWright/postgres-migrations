-- postgres-migrations disable-transaction
-- postgres-migrations split-queries

-- split-query
ALTER TYPE eggs ADD VALUE IF NOT EXISTS 'Fried';

-- split-query
ALTER TYPE eggs ADD VALUE IF NOT EXISTS 'Scrambled';
