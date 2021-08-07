chcp 65001

REM Скрипт создает проект NodeJS для VuePress и устанавливает все зависимости
REM версии зависимостей прописаны в файле yarn.lock

call yarn install --immutable

cd docs
cd .vuepress
mkdir public

cd public
mkdir files
mkdir img

pause