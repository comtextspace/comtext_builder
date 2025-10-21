import fs from "fs";
import path from "path";
import { createHash } from "crypto";

import YAML from "yaml";
import _ from "lodash";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import matter from "gray-matter";
import { transliterate } from 'transliteration';

import { tryRestoreFileFromCache, saveFileToCache, initCache, cleanupOldCache } from "./cache.js";
import { addBookToOPDS, saveOPDS } from "./opdsBuilder.js";

const cacheId = 1;

let workDir;
let destImageDir;
let destPublicDir;
let destMdDir;
let destFilesDir;
let vuepressConfigPath;

const DEBUG = false;

const IMAGE_DIR = "img";
const FILE_DIR = "files";

const configFilename = "comtext.yml";

const zipFileDate = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

let sourceDir;

const getHash = (text) => 
  createHash("sha256").update(text, "utf8").digest("hex");

const readYamlFile = (filename) => {
  const file = fs.readFileSync(filename, "utf-8");
  return YAML.parse(file);
};

const readConfig = () => {
  const configPath = path.join(sourceDir, configFilename);
  return readYamlFile(configPath);
};

let config;

const concatFiles = (sourceFiles) => {
  const bookContent = sourceFiles.map((filename) =>
    fs.readFileSync(filename, "utf-8")
  );
  return bookContent.join("");
};

const moveFiles = (sourcePath, destPath) => {
  // console.log('moveFiles ' + sourcePath + ' ' + destPath);

  if (fs.existsSync(sourcePath)) {
    const images = fs.readdirSync(sourcePath);
    images.forEach((imageFilename) => {
      // console.log(imageFilename);
      
      const sourceImg = path.join(sourcePath, imageFilename);
      const destImg = path.join(destPath, imageFilename);
      fs.copyFileSync(sourceImg, destImg);
    });
  }
};

const movePages = () => {
  config.pages.forEach((pageFilename) => {
    const sourseFilename = path.join(sourceDir, pageFilename);
    const destFilename = path.join(destMdDir, pageFilename);

    const sourceText = fs.readFileSync(sourseFilename, "utf8");
    const preparedText = sourceText.replaceAll(
      /\[\[files\s+([^\]]+?)\]\]/g,
      (_, filename) => {
        const trimmedName = filename.trim();
        return `[comtext](files/${trimmedName}.ct.zip){.file-link} [FB2](files/${trimmedName}.fb2){.file-link} [EPUB](files/${trimmedName}.epub){.file-link}`;
      }
     );

    fs.writeFileSync(destFilename, preparedText);
  });
  // перемещение изображений и файлов для страниц
  const sourceImagesPath = path.join(sourceDir, IMAGE_DIR);
  moveFiles(sourceImagesPath, destImageDir);
};

function changeFileExtension(filePath, newExtension) {
  const dir = path.dirname(filePath);          // Получаем директорию
  const filename = path.basename(filePath);    // Имя файла с текущим расширением
  const name = path.parse(filename).name;      // Имя без расширения
  return path.join(dir, name + newExtension);  // Собираем новый путь
}

const moveBookMd = (bookMdFilename) => {
  console.log("moveBookMd: " + bookMdFilename);

  const bookFilename = path.join(sourceDir, bookMdFilename);
  const bookDir = path.join(sourceDir, path.dirname(bookMdFilename));
  const bookBasename = path.basename(bookMdFilename);
  const bookBasenameWithoutExt = path.basename(bookMdFilename, path.extname(bookMdFilename));
  const sourceImagesPath = path.join(bookDir, IMAGE_DIR);

  const destBookPath = path.join(destMdDir, bookBasename);


  const destCtFilePath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".ct")
  );

  const destCtFileForConvertPath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".temp.ct")
  );
  
  const destCtZipFilePath = destCtFilePath + ".zip";


  const bookContent = concatFiles([bookFilename]);
  let preparedBookContent = bookContent.replaceAll("![cover](", "![](");

  fs.writeFileSync(destBookPath, preparedBookContent);

  const bookContentComtext = bookContent
    .replaceAll("](/img/", "](img/")
    .replaceAll("\n<Toc2 />\n", "")
    .replaceAll("\n<Toc3 />\n", "")
    .replaceAll("\n<Toc4 />\n", "");

  fs.writeFileSync(destCtFilePath, bookContentComtext);

  const bookContentComtextForConvert = bookContentComtext
    // 1. Удаляем [# N], если оно на отдельной строке (возможно, с пробелами вокруг)
    .replace(/^\n\[#\s*\d+\]\n$/gm, "\n")
    // 2. Удаляем [# N], если оно окружено пробелами (внутри строки)
    .replace(/ \[#\s*\d+\] /g, " ")
    // 3. Удаляем любые оставшиеся вхождения [# N] (на случай, если что-то пропустили)
    .replace(/\[#\s*\d+\]/g, "");  

  fs.writeFileSync(destCtFileForConvertPath, bookContentComtextForConvert);

  moveFiles(sourceImagesPath, destImageDir);

  // Нужно из-за того, что cover-image при конвертации
  // через pandoc 3.7.1 в epub не работает с --resource-path
  if (!fs.existsSync("./img/")) {
    fs.mkdirSync("./img/");
  }
  moveFiles(sourceImagesPath, "./img/"); 
  
  console.log("Zip files");
  const zipTimer = startTimer();
  zipFiles(destCtZipFilePath, destCtFilePath, destImageDir);
  endTimer(zipTimer);

  // TODO возможно, нужна возможность отключать экспорт
  // как сделано для yaml конфига
  // if (!_.has(bookConfig, "export")) {
  //   return
  // }

  console.log("Export to fb2");

  const fb2FilePath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".fb2")
  );

  const fb2FilePathTrans = path.join(destFilesDir, 
    changeFileExtension(transliterate(bookBasename), ".fb2")
  );

  const sourceHash = getHash(bookContentComtextForConvert);

  
  const fb2Timer = startTimer();

  let loadedFromCache = false;
  const fb2CacheFileName = `fb2--${bookBasenameWithoutExt}-|-${cacheId}--${sourceHash}.fb2`;

  loadedFromCache = tryRestoreFileFromCache(fb2CacheFileName, fb2FilePath);
  if (loadedFromCache) {
    console.log("Loaded from cache");
  } else {
    exportFb2(destCtFileForConvertPath, fb2FilePath, destPublicDir);
    saveFileToCache(fb2FilePath, fb2CacheFileName);
  }

  fs.copyFileSync(fb2FilePath, fb2FilePathTrans);
  
  endTimer(fb2Timer);

  console.log("Export to epub");

  const epubFilePath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".epub")
  );  

  const epubTimer = startTimer();
  
  loadedFromCache = false;
  const epubCacheFileName = `epub--${bookBasenameWithoutExt}-|-${cacheId}--${sourceHash}.epub`;

  loadedFromCache = tryRestoreFileFromCache(epubCacheFileName, epubFilePath);
  if (loadedFromCache) {
    console.log("Loaded from cache");
  } else {
    exportEpub(destCtFileForConvertPath, epubFilePath, destPublicDir);
    saveFileToCache(epubFilePath, epubCacheFileName);
  }

  endTimer(epubTimer);

  const { data } = matter(bookContent);

  if (data.title) {
  const opdsTitle = data.title;

  let opdsAuthors = [];
 
  if (data.author) {
    opdsAuthors = data.author.map(name => ({ name }));
  }

  const opdsFb2Path = "files/" + changeFileExtension(transliterate(bookBasename), ".fb2");

  addBookToOPDS(opdsTitle, opdsAuthors, opdsFb2Path);
  }
};

// Функция для запуска таймера
function startTimer() {
  return Date.now();
}

// Функция для завершения таймера и вывода результата
function endTimer(start) {
  const end = Date.now();
  console.log(`Операция заняла ${end - start} мс`);
}

const zipFiles = (zipFilePath, filePath, imageDir) => { 
  // ZIP --------------------------------
  // Создаем новый ZIP-архив
  const zip = new AdmZip();

  // Добавляем файл в архив, сохраняя только имя файла (без полного пути)
  const fileNameInZip = path.basename(filePath);

  // Добавляем файл в архив с указанием имени внутри архива
  zip.addLocalFile(filePath, null, fileNameInZip, zipFileDate);

  const files = fs.readdirSync(imageDir);
  const baseName = path.basename(filePath, path.extname(filePath));

  // Фильтруем файлы, оставляя только те, которые начинаются с baseName и имеют графическое расширение
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return file.startsWith(baseName) && [".png", ".jpg", ".jpeg", ".gif"].includes(ext);
  });

  // Добавляем каждое изображение в подкаталог img архива
  imageFiles.forEach(file => {
    const fullPath = path.join(imageDir, file);
    const fileStat = fs.statSync(fullPath);

  if (fileStat.isFile()) {
    zip.addLocalFile(fullPath, "img", null, zipFileDate); // <-- здесь указываем папку внутри архива

    // console.log(`Добавлено в архив: img/${file}`);
  }
});

for (const entry of zip.getEntries()) {
  entry.header.time = zipFileDate;
}

  // Сохраняем архив
  zip.writeZip(zipFilePath);
};

function exportFb2(ctFilePath, fb2FilePath, resourcePath) {
  const pandocCommand =
    `pandoc ${ctFilePath} ` +
    `-s -f markdown -t fb2 -o ${fb2FilePath} ` +
    `--resource-path=${resourcePath} ` +
    `--lua-filter=source/pandoc/remove-cover.lua ` +
    `--lua-filter=source/pandoc/remove-toc.lua`;

  const res = execSync(pandocCommand);

  if (DEBUG) {
    console.log(pandocCommand);
    console.log("" + res);
  }

  const sedCommand = `sed '0,/<title><p>[^<]*<\\/p><\\/title>/s///' "${fb2FilePath}" > "${fb2FilePath}.tmp" && mv "${fb2FilePath}.tmp" "${fb2FilePath}"`;

  execSync(sedCommand);
}

function exportEpub(ctFilePath, epubFilePath, resourcePath) {
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

  // Нужно чтобы работали тесты для epub. 
  // Но они всё равно не работают так как 
  // внутри генерируются случайные uud
  // normalizeEpubTimestamps(epubFilePath);

  // console.log(pandocCommand);
  // console.log('' + res);
}

 
const moveBooks = () => {
  if (config.books === null) {
    return null;
  }
  for (const bookFilename of config.books) {
    const ext = path.extname(bookFilename);

    if (ext == ".md") {
      moveBookMd(bookFilename);
    } else {
      throw new Error(`Неизвестное расширение файла книги "${bookFilename}"`); 
    }
  };
};

const updateVuepressConfig = () => {
  const vuepressConfig = JSON.parse(
    fs.readFileSync(vuepressConfigPath, "utf-8")
  );

  vuepressConfig.title = _.get(config, "vuepress.title", "");
  vuepressConfig.base = _.get(config, "vuepress.base", "/");

  if (_.has(config, "vuepress.markdown_toc_level")) {
    vuepressConfig.markdown_toc_level = _.get(config, "vuepress.markdown_toc_level");
  }

  if (_.has(config, "vuepress.revisionmeProjectId")) {
    vuepressConfig.revisionmeProjectId = config.vuepress.revisionmeProjectId;
  }

  if (_.has(config, "vuepress.revisionmeFloatingBtn")) {
    vuepressConfig.revisionmeFloatingBtn = config.vuepress.revisionmeFloatingBtn;
  }

  if (_.has(config, "vuepress.revisionmeContextWidget")) {
    vuepressConfig.revisionmeContextWidget = config.vuepress.revisionmeContextWidget;
  }

  fs.writeFileSync(vuepressConfigPath, JSON.stringify(vuepressConfig));
};

const build = (source = "..", dest = ".", cachePath) => {
  sourceDir = source;
  workDir = dest;

  initCache(cachePath);

  destImageDir = path.join(workDir, "docs", ".vuepress", "public", "img");
  destPublicDir = path.join(workDir, "docs", ".vuepress", "public");
  destMdDir = path.join(workDir, "docs");
  destFilesDir = path.join(workDir, "docs", ".vuepress", "public", "files");
  vuepressConfigPath = path.join(workDir, "docs", ".vuepress", "config.json");

  config = readConfig();
  
  if (!config.vuepress.cacheId) {
    config.vuepress.cacheId = 1;
  }

  try {
    // перемещение файлов
    const sourceFilesPath = path.join(sourceDir, FILE_DIR);
    moveFiles(sourceFilesPath, destFilesDir);   
    
    movePages();
    moveBooks();
    
    saveOPDS(path.join(destPublicDir, "catalog.opds"), config.vuepress.title);

    updateVuepressConfig();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  cleanupOldCache();
};

export { build };
