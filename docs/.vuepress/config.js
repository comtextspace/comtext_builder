fs = require('fs');
path = require('path');

const workDir = path.dirname(__filename);
const jsonConfigPath = path.join(workDir, 'config.json');
const json_config = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf-8'));

const makeRevisionmeHeader = (config) => {
  if (!config.revisionmeProjectId) {
    return [];
  }
  
  return [
    	['script', {}, `
	    var __rm__config = {
			projectId: '${config.revisionmeProjectId}',
			locale: 'ru',
			contextWidget: 0,
			embedBtn: 0,
			floatingBtn: 0,
			floatingBtnPosition: 'left',
			floatingBtnStyle: 'light',
			};
    `],
    ['script', { src: "https://widget.revisionme.com/app.js", defer: "defer", id: "rm_app_script", }],
  ]
}

const revisionmeHeader = makeRevisionmeHeader(json_config);

module.exports = {
  lang: 'ru-RU',
  title: json_config.title,
  base: json_config.base,
  description: '',
  head: [
    ...revisionmeHeader
  ],
  themeConfig: {
    contributors: false,
    lastUpdatedText: 'Последние обновление',
    sidebar: false,
    
    themePlugins: {
        
    }
  },
  
  markdown: {
    toc: {
      level: [2, 3, 4]
    },
    extractHeaders: {
      level: [2, 3, 4, 5, 6]
    }
  },    

  extendsMarkdown: (md) => {
    md.use(require('markdown-it-footnote'));
  },
  
  plugins: [
    [
      '@vuepress/plugin-search',
      {
        locales: {
          '/': {
            placeholder: 'Поиск',
          }
        },
      },
    ],
    ['@maginapp/vuepress-plugin-katex', { delimiters: 'dollars',
	                                      katexOptions: { strict: katex_strict_handler }
	                                    }]
 
  ],
}



// Обработчик вызывается при появлении ошибки при обработке формы KaTeX
// https://katex.org/docs/options.html
function katex_strict_handler(errorCode, errorMsg, token) {
    if (errorCode === 'unicodeTextInMathMode') {
        return 'ignore'
    } else {
        return 'warn'
    }
}