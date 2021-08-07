module.exports = {
  lang: 'ru-RU',
  title: 'Собрание сочинений Н. Г. Чернышевского',
  description: '',
  themeConfig: {
    contributors: false,
    lastUpdatedText: 'Последние обновление',
    sidebar: false,
    
    themePlugins: {
        
    }
  },
  
  markdown: {
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