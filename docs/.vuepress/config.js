import fs from "fs";
import path from "path";

import { defaultTheme } from "@vuepress/theme-default";
import { viteBundler } from "@vuepress/bundler-vite";
import { slugify as defaultSlugify } from "@mdit-vue/shared";
import { tocPlugin } from "@vuepress/plugin-toc";

import md_table from "markdown-it-multimd-table";
import md_katex from "@traptitech/markdown-it-katex";
import md_footnote from "markdown-it-footnote";
import md_page_number from "@comtext/markdown-it-book-page-number";
import md_underline from "@comtext/markdown-it-underline";
import md_razradka from "@comtext/markdown-it-razradka";
import { figure as md_figure } from "@mdit/plugin-figure";
import md_attr from "markdown-it-attrs";

const workDir = path.dirname(__filename);
const jsonConfigPath = path.join(workDir, "config.json");
const json_config = JSON.parse(fs.readFileSync(jsonConfigPath, "utf-8"));

const makeRevisionmeHeader = (config) => {
  if (!config.revisionmeProjectId) {
    return [];
  }

  let floatingBtn = 0;

  if (config.revisionmeFloatingBtn) {
    floatingBtn = config.revisionmeFloatingBtn;
  }

  let contextWidget = 0;

  if (config.revisionmeContextWidget) {
    contextWidget = config.revisionmeContextWidget;
  }

  return [
    [
      "script",
      {},
      `
	    var __rm__config = {
			projectId: '${config.revisionmeProjectId}',
			locale: 'ru',
			contextWidget: ${contextWidget},
			embedBtn: 0,
			floatingBtn: ${floatingBtn},
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

const customSlugify = (str) => {
  // Удаляем опасные символы
  const cleaned = str
    .replace(/[«»"!?:—–@#$%^&*()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // Передаём очищенный текст стандартной функции slugify
  return defaultSlugify(cleaned);
};

export default {
  bundler: viteBundler({
    viteOptions: {},
    vuePluginOptions: {},
  }),
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
    lastUpdatedText: "Последнее изменение",
    navbar: [
      { text: "Mastodon", link: "https://defcon.social/@pensadoj" },
      { text: "Telegram", link: "https://t.me/pensadoj" },
      { text: "OPDS", link: "/opds" },
    ],
  }),

  markdown: {
    toc: {
      level: json_config.markdown_toc_level ?? [2, 3, 4],
    },
    extractHeaders: {
      level: [2, 3, 4, 5, 6],
    },
    slugify: customSlugify
  },

  extendsMarkdown: (md) => {
    md.use(md_footnote);
    md.use(md_page_number);
    md.use(md_underline);
    md.use(md_razradka);
    md.use(md_figure);
    md.use(md_attr);
    md.use(md_table, {
      multiline: true,
      rowspan: true,
      headerless: true,
    });
    md.use(md_katex, {
      strict: "warn"
    });
  },
  plugins: [
    tocPlugin({
    })
  ],
};

// Обработчик вызывается при появлении ошибки при обработке формы KaTeX
// https://katex.org/docs/options.html
// function katex_strict_handler(errorCode, errorMsg, token) {
//   if (errorCode === "unicodeTextInMathMode") {
//     return "ignore";
//   } else {
//     return "warn";
//   }
// }
