// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  // Включаем рекомендованные правила ESLint
  js.configs.recommended,

  // Основная конфигурация для Node.js + ESM
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module', // важно для ESM (type: "module")
      globals: {
        ...globals.node, // добавляем глобальные переменные Node.js (process, __dirname и т.д.)
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'double', { avoidEscape: true, allowTemplateLiterals: true }],
    },
  },

  // Игнорируемые файлы (вместо .eslintignore)
  {
    ignores: [
      'node_modules/',
      '*.config.js',
      'docs/.vuepress/.cache/',
      'docs/.vuepress/.temp/',
    ],
  },
];