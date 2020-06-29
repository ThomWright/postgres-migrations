module.exports = `
CREATE TABLE migrations (
    id integer PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migrations ("id","name","hash","executed_at")
VALUES (0,E'create-migrations-table',E'e18db593bcde2aca2a408c4d1100f6abba2195df',E'2020-06-29 18:38:05.064546');
`
