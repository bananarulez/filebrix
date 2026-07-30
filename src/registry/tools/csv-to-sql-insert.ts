import type { ToolDefinition } from "../types";

export const csvToSqlInsertTool: ToolDefinition = {
  id: "csv-to-sql-insert",
  // Matches its actual page folder (app/convert/csv-to-sql/) and the site's
  // "x-to-y" URL convention (no other converter slug has a trailing verb
  // like "-insert") — see CLAUDE.md's SEO audit notes.
  slug: "csv-to-sql",
  name: "CSV to SQL INSERT",
  routeGroup: "convert",
  category: "convert",
  engine: "developer",
  devCategory: "sql",
  description: "Convert a CSV file to SQL INSERT statements, with a configurable table name and dialect — entirely in your browser.",
  keywords: ["csv to sql", "csv to sql insert", "convert csv to sql statements", "generate insert statements from csv"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["sql"],
  relatedTools: ["sql-formatter", "csv-to-json", "csv-viewer"],
  seo: {
    title: "CSV to SQL INSERT Converter — Free, Private & No Upload",
    description:
      "Convert a CSV file into one INSERT INTO statement per row directly in your browser, with a configurable table name and Standard SQL, MySQL, PostgreSQL or SQLite escaping. Nothing is uploaded, and nothing is executed.",
  },
  faq: [
    {
      question: "Is my CSV file uploaded or executed anywhere?",
      answer: "No. Parsing and statement-building both happen locally, and the output is only ever text — nothing is run against a database.",
    },
    {
      question: "How are values escaped?",
      answer:
        "Single quotes inside text values are doubled (the standard SQL escape), numbers are written unquoted, empty cells become NULL, and table/column names are quoted and escaped the same way, so a crafted CSV header can't break out of the statement.",
    },
    {
      question: "Does it produce one big multi-row INSERT, or one per row?",
      answer: "One INSERT INTO ... VALUES (...); statement per row — this keeps the output valid and easy to review regardless of row count or SQL dialect.",
    },
    {
      question: "Can I set the table name?",
      answer: "Yes — it defaults to the CSV's filename, and you can change it to anything before converting.",
    },
  ],
};
