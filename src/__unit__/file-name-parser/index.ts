import test from "ava"

import {parseFileName} from "../../file-name-parser"

test("parse name: 1.sql", (t) => {
  const parsed = parseFileName("1.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "1.sql",
      type: "sql",
    },
    "should parse correctly without name, the parsed name must be the fileName",
  )
})

test("parse name: 1file.sql", (t) => {
  const parsed = parseFileName("1file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "file",
      type: "sql",
    },
    "should parse correctly without separator",
  )
})

test("parse name: 1-file.sql", (t) => {
  const parsed = parseFileName("1-file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "file",
      type: "sql",
    },
    "should parse correctly with dash separator",
  )
})

test("parse name: 1_file.sql", (t) => {
  const parsed = parseFileName("1_file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "file",
      type: "sql",
    },
    "should parse correctly with underscore separator",
  )
})

test("parse name: 1-2_file.sql", (t) => {
  const parsed = parseFileName("1-2_file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "2_file",
      type: "sql",
    },
    "should parse correctly returning everything after dash separator as name",
  )
})

test("parse name: 1_2_file.sql", (t) => {
  const parsed = parseFileName("1_2_file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "2_file",
      type: "sql",
    },
    "should parse correctly returning everything after underscore separator as name",
  )
})

test("parse name: 1_file.SQL", (t) => {
  const parsed = parseFileName("1_file.SQL")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "file",
      type: "sql",
    },
    "should parse correctly with case insensitive",
  )
})

test("parse name: 0001_file.sql", (t) => {
  const parsed = parseFileName("0001_file.sql")
  t.deepEqual(
    parsed,
    {
      id: 1,
      name: "file",
      type: "sql",
    },
    "should parse correctly with left zeros",
  )
})

test("parse name: not_file.sql", (t) => {
  const err = t.throws(() => parseFileName("not_file.sql"))

  t.regex(err.message, /Invalid file name/)
  t.regex(err.message, /not_file/, "Should name the problem file")
})
