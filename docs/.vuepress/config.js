import fs from "fs";
import path from "path";

import { defaultTheme } from "@vuepress/theme-default";

import md_table from "markdown-it-multimd-table";
import md_katex from "@traptitech/markdown-it-katex";
import md_footnote from "markdown-it-footnote";
import md_page_number from "@comtext/markdown-it-book-page-number";
import md_underline from "@comtext/markdown-it-underline";
import { figure as md_figure } from "@mdit/plugin-figure";

const workDir = path.dirname(__filename);
const jsonConfigPath = path.join(workDir, "config.json");
const json_config = JSON.parse(fs.readFileSync(jsonConfigPath, "utf-8"));

const makeRevisionmeHeader = (config) => {
  if (!config.revisionmeProjectId) {
    return [];
  }

  return [
    [
      "script",
      {},
      `
	    var __rm__config = {
			projectId: '${config.revisionmeProjectId}',
			locale: 'ru',
			contextWidget: 0,
			embedBtn: 0,
			floatingBtn: 0,
			floatingBtnPosition: 'left',
			floatingBtnStyle: 'light',
			};
    `,
    ],
    [
      "script",
      {
        src: "https://widget.revisionme.com/app.js",
        defer: "defer",
        id: "rm_app_script",
      },
    ],
  ];
};

const revisionmeHeader = makeRevisionmeHeader(json_config);

module.exports = {
  lang: "ru-RU",
  title: json_config.title,
  base: json_config.base,
  description: "",
  head: [
    ...revisionmeHeader,
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/katex@0.16.3/dist/katex.min.css",
      },
    ],
  ],

  theme: defaultTheme({
    sidebar: false,
    contributors: false,
    lastUpdatedText: "Последниее изменение",
  }),

  markdown: {
    toc: {
      level: [2, 3, 4],
    },
    extractHeaders: {
      level: [2, 3, 4, 5, 6],
    },
  },

  extendsMarkdown: (md) => {
    md.use(md_footnote);
    md.use(md_page_number);
    md.use(md_underline);
    md.use(md_figure);
    md.use(md_table, {
      multiline: true,
      rowspan: true,
      headerless: true,
    });
    md.use(md_katex, {
      strict: false,
      //  katexOptions: { strict: katex_strict_handler },
    });
  },
};

// Обработчик вызывается при появлении ошибки при обработке формы KaTeX
// https://katex.org/docs/options.html
function katex_strict_handler(errorCode, errorMsg, token) {
  if (errorCode === "unicodeTextInMathMode") {
    return "ignore";
  } else {
    return "warn";
  }
}
