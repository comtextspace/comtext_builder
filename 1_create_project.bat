chcp 65001

REM Скрипт создает проект NodeJS для VuePress и устанавливает все зависимости

call npm ci

cd docs
cd .vuepress
mkdir public

cd public
mkdir files
mkdir img

pause