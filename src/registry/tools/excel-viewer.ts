import type { ToolDefinition } from "../types";

export const excelViewerTool: ToolDefinition = {
  id: "excel-viewer",
  slug: "excel-viewer",
  name: "Excel Viewer",
  routeGroup: "tools",
  category: "view",
  engine: "spreadsheet",
  description:
    "Open XLSX workbooks in your browser — switch between sheets and browse the data without uploading the file.",
  keywords: ["excel viewer", "xlsx viewer", "view excel online", "open xlsx", "spreadsheet viewer"],
  acceptedFileTypes: ["xlsx"],
  outputFileTypes: [],
  relatedTools: ["excel-to-csv", "csv-to-excel"],
  appEntry: { app: "spreadsheet-data", mode: "view", lockedFormat: "xlsx" },
  seo: {
    title: "Excel Viewer Online — Free, Private & No Upload",
    description:
      "View XLSX spreadsheets in your browser, switch between sheets, and browse the data with dates and numbers preserved. Your workbook is never uploaded.",
  },
  faq: [
    {
      question: "Is my Excel file uploaded anywhere?",
      answer:
        "No. The workbook is opened and read entirely on your device. It's never sent to a server or any third party.",
    },
    {
      question: "Can I view a workbook with multiple sheets?",
      answer:
        "Yes. If a workbook has more than one sheet, a sheet selector appears so you can switch between them.",
    },
    {
      question: "Are dates and numbers displayed correctly?",
      answer:
        "Yes. Date-formatted cells are shown as real dates rather than the underlying serial numbers, and numeric/boolean values keep their original type.",
    },
    {
      question: "What happens with formulas or merged cells?",
      answer:
        "Formulas are shown using their last calculated value rather than the formula itself, and merged cells are flattened into their top-left cell — both are called out as a notice when they're present in a sheet.",
    },
    {
      question: "Can I view very large workbooks?",
      answer:
        "There's no server upload limit. The practical maximum depends on your device's memory and browser, and only the visible rows are ever rendered in the preview.",
    },
  ],
};
