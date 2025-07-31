# ComtextBuilder

ComtextBuilder — это статический сборщик сайта, предназначенный для работы с текстологическими данными в формате [Comtext](https://research.comtext.space/format-comtext.html). 

ComtextBuilder читает файлы в формате Comtext (на основе Markdown + YAML Frontmatter) из репозитория и преобразует их в современный статический сайт. 

Сборка запускается через CI/CD, например, с помощью GitHub Actions:

👉 [Пример workflow для деплоя](https://github.com/comtextspace/rubin/blob/main/.github/workflows/deploy-site.yml)

Репозиторий должен следовать [рекомендуемой структуре](documentation/structure.md). 

## Зависимости

* [Node.js](https://nodejs.org) > 22
* [Yarn](https://yarnpkg.com) v1.22.22 (Classic)
* [Pandoc](https://pandoc.org) > 3.7

> 💡 Pandoc используется для преобразования текстов между форматами, включая поддержку LaTeX, цитат, таблиц, математических формул и более чем 50 форматов ввода/вывода. 

## Установка

```sh
make install
```

## Запуск сайта

Файлы сайта должны находится в каталоге `./docs/`.

```sh
echo 'Hello!' > ./docs/index.md
make dev
```

## Тестирование

Запуск тестов

```sh
make test
```