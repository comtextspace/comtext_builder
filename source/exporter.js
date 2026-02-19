import { execSync } from "child_process";
import { createHash } from "crypto";
import { tryRestoreFileFromCache, saveFileToCache } from "./cache.js";

/**
 * Экспортирует файл в FB2 формат с помощью Pandoc
 * @param {string} ctFilePath - путь к исходному .ct файлу
 * @param {string} fb2FilePath - путь к выходному .fb2 файлу
 * @param {string} resourcePath - путь к ресурсам для Pandoc
 * @param {string} commitHash - хеш коммита для вставки в метаданные
 * @param {string} siteTitle - название сайта из конфига
 * @param {string} bookFilename - название файла книги
 * @param {boolean} debug - режим отладки
 */
export function exportFb2(ctFilePath, fb2FilePath, resourcePath, commitHash, siteTitle, bookFilename, debug = false) {
  const pandocCommand =
    `pandoc ${ctFilePath} ` +
    `-s -f markdown -t fb2 -o ${fb2FilePath} ` +
    `--resource-path=${resourcePath} ` +
    `--lua-filter=source/pandoc/remove-cover.lua ` +
    `--lua-filter=source/pandoc/remove-toc.lua`;

  const res = execSync(pandocCommand);

  if (debug) {
    console.log(pandocCommand);
    console.log("" + res);
  }

  // Удаляем первый title из FB2
  const sedCommand1 = `sed -i '0,/<title><p>[^<]*<\\/p><\\/title>/s///' "${fb2FilePath}"`;
  execSync(sedCommand1);

  // Обновляем program-used
  const programUsed = "Экспорт из формата Комтекст (https://comtext.space) через Pandoc";
  const sedCommand2 = `sed -i 's|<program-used>.*</program-used>|<program-used>${programUsed}</program-used>|' "${fb2FilePath}"`;
  execSync(sedCommand2);

  // Добавляем дату генерации файла перед закрывающим тегом document-info
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const formattedDate = `${day}.${month}.${year}`; // DD.MM.YYYY
  const sedCommand3 = `sed -i 's|<\\/document-info>|<date value="${isoDate}">${formattedDate}</date></document-info>|' "${fb2FilePath}"`;
  execSync(sedCommand3);

  // Добавляем id (хеш от siteTitle|bookFilename) перед закрывающим тегом document-info
  const idString = `${siteTitle}|${bookFilename}`;
  const idHash = createHash("sha256").update(idString, "utf8").digest("hex");
  const sedCommand4 = `sed -i 's|<\\/document-info>|<id>${idHash}</id></document-info>|' "${fb2FilePath}"`;
  execSync(sedCommand4);

  // Добавляем версию (commit hash) перед закрывающим тегом document-info
  const sedCommand5 = `sed -i 's|<\\/document-info>|<version>${commitHash}</version></document-info>|' "${fb2FilePath}"`;
  execSync(sedCommand5);
}

/**
 * Экспортирует файл в EPUB формат с помощью Pandoc
 * @param {string} ctFilePath - путь к исходному .ct файлу
 * @param {string} epubFilePath - путь к выходному .epub файлу
 * @param {string} resourcePath - путь к ресурсам для Pandoc
 */
export function exportEpub(ctFilePath, epubFilePath, resourcePath) {
  const pandocCommand =
    `pandoc ${ctFilePath} ` +
    `-s -f markdown -t epub3 -o ${epubFilePath} ` +
    `--resource-path=${resourcePath} ` +
    `--toc ` +
    `--standalone ` +
    `--shift-heading-level-by=-1 ` +
    `--toc-depth=3 ` +
    `--gladtex ` +
    `--top-level-division=chapter ` +
    `--lua-filter=source/pandoc/remove-cover.lua ` +
    `--lua-filter=source/pandoc/remove-toc.lua`;

  execSync(pandocCommand);
}

/**
 * Экспортирует книгу в FB2 с кешированием
 * @param {string} cacheFileName - имя файла в кеше
 * @param {string} outputPath - путь к выходному файлу
 * @param {string} ctFilePath - путь к исходному .ct файлу
 * @param {string} resourcePath - путь к ресурсам
 * @param {string} commitHash - хеш коммита
 * @param {string} siteTitle - название сайта из конфига
 * @param {string} bookFilename - название файла книги
 * @param {boolean} debug - режим отладки
 */
export function exportFb2WithCache(cacheFileName, outputPath, ctFilePath, resourcePath, commitHash, siteTitle, bookFilename, debug) {
  const loadedFromCache = tryRestoreFileFromCache(cacheFileName, outputPath);
  if (loadedFromCache) {
    console.log("Loaded from cache");
  } else {
    exportFb2(ctFilePath, outputPath, resourcePath, commitHash, siteTitle, bookFilename, debug);
    saveFileToCache(outputPath, cacheFileName);
  }
}

/**
 * Экспортирует книгу в EPUB с кешированием
 * @param {string} cacheFileName - имя файла в кеше
 * @param {string} outputPath - путь к выходному файлу
 * @param {string} ctFilePath - путь к исходному .ct файлу
 * @param {string} resourcePath - путь к ресурсам
 */
export function exportEpubWithCache(cacheFileName, outputPath, ctFilePath, resourcePath) {
  const loadedFromCache = tryRestoreFileFromCache(cacheFileName, outputPath);
  if (loadedFromCache) {
    console.log("Loaded from cache");
  } else {
    exportEpub(ctFilePath, outputPath, resourcePath);
    saveFileToCache(outputPath, cacheFileName);
  }
}
