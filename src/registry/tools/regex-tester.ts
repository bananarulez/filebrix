import type { ToolDefinition } from "../types";

export const regexTesterTool: ToolDefinition = {
  id: "regex-tester",
  slug: "regex-tester",
  name: "Regex Tester",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description:
    "Test a regular expression against your text as you type, with every match, its position and its capture groups listed.",
  keywords: ["regex tester", "regular expression tester", "test regex online", "regex match", "regex101 alternative"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["text-diff", "case-converter", "sort-lines"],
  seo: {
    title: "Regex Tester Online — Free, Private & No Upload",
    description:
      "Test JavaScript regular expressions live in your browser, with match positions, capture groups and a replacement preview. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my pattern or test text sent anywhere?",
      answer:
        "No. Matching runs in this tab using your browser's own regular-expression engine. That's the practical difference from most online testers, where both the pattern and the sample text — often a real log line or a real customer record — are sent to a server.",
    },
    {
      question: "Which regex dialect does it use?",
      answer:
        "JavaScript's, exactly as your browser implements it. Nothing is translated or reinterpreted, so what you see here is what the same pattern will do in your own JavaScript or TypeScript code. Patterns written for PCRE, Python or Go may behave differently.",
    },
    {
      question: "Does it support named capture groups?",
      answer:
        "Yes. Groups written as (?<name>...) are listed by name alongside the numbered ones — both views, because a named group is also numbered and the two are genuinely different ways to read the same match.",
    },
    {
      question: "Why does my results list stop at 1000?",
      answer:
        "Matching is capped so a very broad pattern over a large input can't lock up the page building a list nobody will read. When the cap is reached the count is shown with a plus sign, so it's never mistaken for the true total.",
    },
    {
      question: "Can a regular expression freeze the page?",
      answer:
        "Yes, and it's worth knowing. Certain patterns — typically nested quantifiers such as (a+)+ against a long non-matching string — take exponential time, and a running match can't be interrupted. Reloading the page recovers it; nothing is lost, since nothing was saved anywhere.",
    },
    {
      question: "Can I preview a replacement?",
      answer:
        "Yes. Turn on the replacement preview and use $1, $& or $<name> — the same substitution syntax String.replace uses, so the preview matches what your code would produce.",
    },
  ],
};
