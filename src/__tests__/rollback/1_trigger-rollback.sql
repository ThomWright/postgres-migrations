CREATE TABLE should_get_rolled_back (
  id integer PRIMARY KEY
);

INSERT INTO should_get_rolled_back VALUES (
  'not an integer'
)
