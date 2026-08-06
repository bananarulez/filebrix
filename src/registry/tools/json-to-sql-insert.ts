import type { ToolDefinition } from "../types";

export const jsonToSqlInsertTool: ToolDefinition = {
  id: "json-to-sql-insert",
  slug: "json-to-sql-insert",
  name: "JSON to SQL INSERT",
  routeGroup: "convert",
  category: "convert",
  engine: "developer",
  devCategory: "sql",
  description:
    "Turn a JSON array of objects into INSERT statements for MySQL, PostgreSQL, SQLite or standard SQL, entirely in your browser.",
  keywords: ["json to sql", "json to sql insert", "generate insert statements", "json to database"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["sql"],
  // "csv-to-sql" is that tool's slug; "csv-to-sql-insert" is its id.
  relatedTools: ["csv-to-sql", "sql-formatter", "json-to-csv"],
  seo: {
    title: "JSON to SQL INSERT — Free, Private & No Upload",
    description:
      "Convert a JSON array into ready-to-run INSERT statements in your browser, with identifiers and values escaped for your chosen dialect. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer:
        "No. The statements are built in your browser. That matters here because the JSON being loaded into a database is usually real data — an export, a seed file, a migration payload.",
    },
    {
      question: "What JSON shape does it expect?",
      answer:
        "An array of objects, where each object is a row. The union of the object keys becomes the column list, and a key missing from a given object becomes NULL for that row.",
    },
    {
      question: "Is the output safe from SQL injection?",
      answer:
        "Values and identifiers are escaped by doubling the delimiter, which is the standard SQL escape, so a string containing a quote can't terminate its literal and inject a statement. MySQL's backslash escaping is applied too when that dialect is selected.",
    },
    {
      question: "Does it connect to my database?",
      answer:
        "No, and it never will. This tool only produces text — it has no database connection, no credentials and no way to execute anything. You review the statements and run them yourself.",
    },
    {
      question: "What happens to nested objects and arrays?",
      answer:
        "A column holds one value, so nested structures are flattened into their text form rather than being expanded into extra columns. For deeply nested data, converting to CSV first and reviewing the columns usually gives a better result.",
    },
  ],
};
