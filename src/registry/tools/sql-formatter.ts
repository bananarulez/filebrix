import type { ToolDefinition } from "../types";

export const sqlFormatterTool: ToolDefinition = {
  id: "sql-formatter",
  slug: "sql-formatter",
  name: "SQL Formatter",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "sql",
  description: "Pretty-print SQL queries with dialect-aware formatting — entirely in your browser.",
  keywords: ["sql formatter", "format sql online", "sql beautifier", "pretty print sql"],
  acceptedFileTypes: ["sql"],
  outputFileTypes: ["sql"],
  relatedTools: ["csv-to-sql", "json-formatter"],
  seo: {
    title: "SQL Formatter Online — Free, Private & No Upload",
    description:
      "Pretty-print SQL queries directly in your browser for Standard SQL, MySQL, PostgreSQL, SQLite, MariaDB and SQL Server. Nothing is uploaded, and nothing is executed.",
  },
  faq: [
    {
      question: "Is my SQL uploaded or executed anywhere?",
      answer: "No. This only reformats whitespace, casing and indentation — it never parses your SQL into an execution plan, connects to a database, or runs it.",
    },
    {
      question: "Which SQL dialects are supported?",
      answer: "Standard SQL, MySQL, PostgreSQL, SQLite, MariaDB, and SQL Server (T-SQL) — pick the one matching your query's syntax for the most accurate formatting.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};
