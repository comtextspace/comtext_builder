import path from "path";
import { fileURLToPath } from "url";

import { build } from "./source/site_builder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Из GitHub Actions скрипт запускается так:
// ./ — корень на сервере, содержит каталог с файлами книг
// ./builder — репозиторий comtext_builder
// TODO нужно изменить чтобы index.js принимал оба пути как параметры

const sourcePath = path.join(__dirname, "..");
const cachePath = path.join(__dirname, "..", "export-cache");
const destPath = __dirname;

build(sourcePath, destPath, cachePath);
