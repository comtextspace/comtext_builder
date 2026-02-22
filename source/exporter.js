import { execSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { tryRestoreFileFromCache, saveFileToCache } from "./cache.js";

/**
 * Экспортирует файл в FB2 формат с помощью Pandoc
 * @param {string} ctFilePath - путь к исходному .ct файлу
 * @param {string} fb2FilePath - путь к выходному .fb2 файлу
 * @param {string} resourcePath - путь к ресурсам для Pandoc
 * @param {string} commitHash - хеш коммита для вставки в метаданные
 * @param {string} siteTitle - название сайта из конфига
 * @param {string} bookFilename - название файла книги
 * @param {string[]} genres - массив жанров из frontmatter
 * @param {boolean} debug - режим отладки
 */
export function exportFb2(ctFilePath, fb2FilePath, resourcePath, commitHash, siteTitle, bookFilename, genres = [], debug = false) {
  const pandocCommand =
    `pandoc ${ctFilePath} ` +
    `-s -f markdown -t fb2 -o ${fb2FilePath} ` +
    `--resource-path=${resourcePath} ` +
    `--lua-filter=source/pandoc/remove-cover.lua ` +
    `--lua-filter=source/pandoc/remove-toc.lua ` +
    `--lua-filter=source/pandoc/wrap-code-blocks.lua`;

  const res = execSync(pandocCommand);

  if (debug) {
    console.log(pandocCommand);
    console.log("" + res);
  }

  // Удаляем первый title из FB2
  const sedCommand1 = `sed -i '0,/<title><p>[^<]*<\\/p><\\/title>/s///' "${fb2FilePath}"`;
  execSync(sedCommand1);

  // Исправляем атрибут l:type у изображений: заменяем imageType и inlineImageType на simple
  // XSD схема требует фиксированное значение "simple" для xlink:type
  const sedCommandImageType1 = `sed -i 's|l:type="imageType"|l:type="simple"|g' "${fb2FilePath}"`;
  execSync(sedCommandImageType1);
  const sedCommandImageType2 = `sed -i 's|l:type="inlineImageType"|l:type="simple"|g' "${fb2FilePath}"`;
  execSync(sedCommandImageType2);

  // Если указано несколько жанров, заменяем <genre>unrecognised</genre> на список жанров
  // Pandoc при нескольких жанрах ставит unrecognised, при одном - правильный жанр
  if (genres.length > 1) {
    // Создаем строку с тегами жанров
    const genresXml = genres.map(genre => `<genre>${genre}</genre>`).join("");
    // Заменяем первое вхождение <genre>unrecognised</genre> в секции title-info
    // Используем двойные кавычки для sed, экранируя специальные символы
    const sedCommandGenres = `sed -i "0,/<genre>unrecognised<\\/genre>/s|<genre>unrecognised<\\/genre>|${genresXml}|" "${fb2FilePath}"`;
    execSync(sedCommandGenres);
  }


  // Добавляем author сразу после открытия document-info
  const sedCommandAuthor = `sed -i 's|<document-info>|<document-info><author><nickname>Анонимный текстолог</nickname></author>|' "${fb2FilePath}"`;
  execSync(sedCommandAuthor);

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

  // Вычисляем версию на основе текущего времени
  // Версия = дни с 2026-01-01 + минуты с начала дня / 10000
  // (первая минута = 0.0001, вторая = 0.0002, десятая = 0.001)
  const baseDate = new Date("2026-01-01T00:00:00Z");
  const days = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const versionNumber = days + minutes / 10000;
  
  // Добавляем версию (float число) перед закрывающим тегом document-info
  const sedCommand5 = `sed -i 's|<\\/document-info>|<version>${versionNumber}</version></document-info>|' "${fb2FilePath}"`;
  execSync(sedCommand5);

  // Добавляем custom-info с хешем коммита в конец description, но вне document-info
  if (commitHash) {
    const sedCommand6 = `sed -i 's|<\\/description>|<custom-info info-type="git-hash">${commitHash}</custom-info></description>|' "${fb2FilePath}"`;
    execSync(sedCommand6);
  }

  // Оборачиваем контент в секции, если в секции есть и контент, и дочерние секции
  wrapSectionContent(fb2FilePath);
}

/**
 * Оборачивает контент в отдельные секции для соответствия XSD схеме FB2
 * @param {string} fb2FilePath - путь к FB2 файлу
 */
function wrapSectionContent(fb2FilePath) {
  const xmlContent = fs.readFileSync(fb2FilePath, "utf-8");
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: (e) => {
        throw e;
      }
    }
  });
  
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const namespace = "http://www.gribuser.ru/xml/fictionbook/2.0";
  
  let wrapperCounter = 0;
  
  // Находим все секции
  const sections = doc.getElementsByTagNameNS(namespace, "section");
  
  // Обрабатываем секции в обратном порядке (от вложенных к корневым)
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    
    // Проверяем, есть ли в секции и контент, и дочерние секции
    const childNodes = Array.from(section.childNodes);
    const hasContent = childNodes.some(node => {
      if (node.nodeType === 1) { // Element node
        const localName = node.localName || node.nodeName.split(":")[1] || node.nodeName;
        return localName === "p" || localName === "poem" || localName === "subtitle" || 
               localName === "cite" || localName === "empty-line" || localName === "table" ||
               localName === "image";
      }
      return false;
    });
    
    const hasChildSections = childNodes.some(node => {
      if (node.nodeType === 1) {
        const localName = node.localName || node.nodeName.split(":")[1] || node.nodeName;
        return localName === "section";
      }
      return false;
    });
    
    // Если есть и контент, и дочерние секции - нужно обернуть контент
    if (hasContent && hasChildSections) {
      // Разделяем контент и дочерние секции
      const contentNodes = [];
      const childSectionNodes = [];
      const otherNodes = []; // title, epigraph, image, annotation
      
      childNodes.forEach(node => {
        if (node.nodeType === 1) {
          const localName = node.localName || node.nodeName.split(":")[1] || node.nodeName;
          if (localName === "section") {
            childSectionNodes.push(node);
          } else if (localName === "p" || localName === "poem" || localName === "subtitle" || 
                     localName === "cite" || localName === "empty-line" || localName === "table" ||
                     localName === "image") {
            contentNodes.push(node);
          } else {
            otherNodes.push(node); // title, epigraph, annotation и т.д.
          }
        } else {
          otherNodes.push(node); // текстовые узлы
        }
      });
      
      if (contentNodes.length > 0) {
        // Создаем новую секцию без title для контента
        // Секции без title не отображаются в оглавлении читалок, но контент внутри них виден
        wrapperCounter++;
        const baseId = section.getAttribute("id") || "";
        const wrapperId = baseId ? `${baseId}-wrapper-${wrapperCounter}` : `wrapper-section-${wrapperCounter}`;
        
        const wrapperSection = doc.createElementNS(namespace, "section");
        wrapperSection.setAttribute("id", wrapperId);
        
        // Перемещаем контент в новую секцию
        contentNodes.forEach(node => {
          wrapperSection.appendChild(node.cloneNode(true));
          section.removeChild(node);
        });
        
        // Вставляем новую секцию перед дочерними секциями
        if (childSectionNodes.length > 0) {
          section.insertBefore(wrapperSection, childSectionNodes[0]);
        } else {
          section.appendChild(wrapperSection);
        }
      }
    }
  }
  
  // Сохраняем измененный XML
  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(doc);
  fs.writeFileSync(fb2FilePath, newXml, "utf-8");
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
 * @param {string[]} genres - массив жанров из frontmatter
 * @param {boolean} debug - режим отладки
 */
export function exportFb2WithCache(cacheFileName, outputPath, ctFilePath, resourcePath, commitHash, siteTitle, bookFilename, genres = [], debug) {
  const loadedFromCache = tryRestoreFileFromCache(cacheFileName, outputPath);
  if (loadedFromCache) {
    console.log("Loaded from cache");
  } else {
    exportFb2(ctFilePath, outputPath, resourcePath, commitHash, siteTitle, bookFilename, genres, debug);
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
