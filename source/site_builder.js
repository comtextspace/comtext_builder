import fs from "fs";
import path from "path";
import { createHash } from "crypto";

import YAML from "yaml";
import AdmZip from "adm-zip";
import matter from "gray-matter";
import { transliterate } from "transliteration";

import { initCache, cleanupOldCache } from "./cache.js";
import { addBookToOPDS, saveOPDS } from "./opdsBuilder.js";
import { convertPoemBlocks, startTimer, endTimer } from "./utils.js";
import { exportFb2WithCache, exportEpubWithCache } from "./exporter.js";

const cacheId = 1;

let workDir;
let destImageDir;
let destPublicDir;
let destMdDir;
let destFilesDir;
let vuepressConfigPath;
let commitHash;

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

// Читает содержимое файла (оставлено для совместимости, но используется только для одного файла)
const readFile = (filename) => {
  return fs.readFileSync(filename, "utf-8");
};

const moveFiles = (sourcePath, destPath) => {
  try {
    if (!fs.existsSync(sourcePath)) {
      return;
    }
    
    const files = fs.readdirSync(sourcePath);
    files.forEach((filename) => {
      const sourceFile = path.join(sourcePath, filename);
      const destFile = path.join(destPath, filename);
      fs.copyFileSync(sourceFile, destFile);
    });
  } catch (error) {
    // Игнорируем ошибки доступа к файлам
    if (DEBUG) {
      console.error(`Ошибка при копировании файлов из ${sourcePath}:`, error);
    }
  }
};

// Функция для получения всех .md файлов из каталога (рекурсивно)
const getMdFilesFromDir = (dirPath, baseDir = sourceDir) => {
  const fullDirPath = path.join(baseDir, dirPath);
  const mdFiles = [];
  
  try {
    const stats = fs.statSync(fullDirPath);
    if (!stats.isDirectory()) {
      return mdFiles;
    }
    
    const entries = fs.readdirSync(fullDirPath);
    
    for (const entry of entries) {
      const entryPath = path.join(fullDirPath, entry);
      const relativeEntryPath = path.join(dirPath, entry);
      
      try {
        const entryStats = fs.statSync(entryPath);
        
        if (entryStats.isDirectory()) {
          // Рекурсивно обрабатываем подкаталоги
          mdFiles.push(...getMdFilesFromDir(relativeEntryPath, baseDir));
        } else if (entryStats.isFile() && path.extname(entry) === ".md") {
          mdFiles.push(relativeEntryPath);
        }
      } catch {
        // Пропускаем файлы, к которым нет доступа
        continue;
      }
    }
  } catch {
    // Каталог не существует или нет доступа
    return mdFiles;
  }
  
  return mdFiles;
};

// Функция для получения списка файлов (файл или все .md из каталога)
const expandPageOrDir = (pagePath) => {
  const fullPath = path.join(sourceDir, pagePath);
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.isFile()) {
      return [pagePath];
    } else if (stats.isDirectory()) {
      return getMdFilesFromDir(pagePath);
    } else {
      throw new Error(`Неизвестный тип: ${pagePath}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Путь не существует: ${pagePath}`);
    }
    throw error;
  }
};

const movePages = () => {
  const allPages = config.pages.flatMap(pagePath => expandPageOrDir(pagePath));
  
  allPages.forEach((pageFilename) => {
    const sourceFilename = path.join(sourceDir, pageFilename);
    const destFilename = path.join(destMdDir, pageFilename);

    // Создаем необходимые подкаталоги в dest
    const destDir = path.dirname(destFilename);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const sourceText = fs.readFileSync(sourceFilename, "utf8");
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
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, parsed.name + newExtension);
}

const moveBookMd = (bookMdFilename) => {
  console.log("moveBookMd: " + bookMdFilename);

  const bookFilename = path.join(sourceDir, bookMdFilename);
  const bookDir = path.join(sourceDir, path.dirname(bookMdFilename));
  const bookBasename = path.basename(bookMdFilename);
  const bookBasenameWithoutExt = path.basename(bookMdFilename, path.extname(bookMdFilename));
  const translitBookBasenameWithoutExt = transliterate(bookBasenameWithoutExt);
  const sourceImagesPath = path.join(bookDir, IMAGE_DIR);

  const destBookPath = path.join(destMdDir, bookBasename);


  const destCtFilePath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".ct")
  );

  const destCtFileForConvertPath = path.join(destFilesDir, 
    changeFileExtension(bookBasename, ".temp.ct")
  );
  
  const destCtZipFilePath = destCtFilePath + ".zip";


  const bookContent = readFile(bookFilename);
  
  let preparedBookContent = bookContent.replaceAll("![cover](", "![](");
  preparedBookContent = convertPoemBlocks(preparedBookContent);

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

  const fb2FilePath = path.join(destFilesDir, changeFileExtension(bookBasename, ".fb2"));
  const fb2FilePathTrans = path.join(destFilesDir, changeFileExtension(transliterate(bookBasename), ".fb2"));

  const sourceHash = getHash(bookContentComtextForConvert);

  // Извлекаем frontmatter для получения жанров и даты
  const { data } = matter(bookContent);
  
  // Нормализуем genre: если строка - делаем массив, если массив - оставляем как есть
  let genres = [];
  if (data.genre) {
    genres = Array.isArray(data.genre) ? data.genre : [data.genre];
  }

  // Извлекаем дату издания книги
  const bookDate = data.date || null;

  console.log("Export to fb2");
  const fb2Timer = startTimer();
  const fb2CacheFileName = `fb2--${translitBookBasenameWithoutExt}-|-${cacheId}--${sourceHash}.fb2`;
  
  const siteTitle = config.vuepress?.title || "";
  exportFb2WithCache(fb2CacheFileName, fb2FilePath, destCtFileForConvertPath, destPublicDir, commitHash, siteTitle, bookBasename, genres, bookDate, DEBUG);
  fs.copyFileSync(fb2FilePath, fb2FilePathTrans);
  endTimer(fb2Timer);

  console.log("Export to epub");
  const epubTimer = startTimer();
  const epubFilePath = path.join(destFilesDir, changeFileExtension(bookBasename, ".epub"));
  const epubCacheFileName = `epub--${translitBookBasenameWithoutExt}-|-${cacheId}--${sourceHash}.epub`;

  exportEpubWithCache(epubCacheFileName, epubFilePath, destCtFileForConvertPath, destPublicDir);
  endTimer(epubTimer);

  // Удаляем временный .temp.ct файл после использования
  if (fs.existsSync(destCtFileForConvertPath)) {
    fs.unlinkSync(destCtFileForConvertPath);
  }

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
 
const moveBooks = () => {
  if (!config.books) {
    return;
  }
  
  const allBooks = config.books.flatMap(bookPath => expandPageOrDir(bookPath));

  for (const bookFilename of allBooks) {
    if (path.extname(bookFilename) !== ".md") {
      throw new Error(`Неизвестное расширение файла книги "${bookFilename}"`); 
    }
    moveBookMd(bookFilename);
  }
};

const updateVuepressConfig = () => {
  const vuepressConfig = JSON.parse(
    fs.readFileSync(vuepressConfigPath, "utf-8")
  );

  vuepressConfig.title = config.vuepress?.title ?? "";
  vuepressConfig.base = config.vuepress?.base ?? "/";

  if (config.vuepress?.markdown_toc_level !== undefined) {
    vuepressConfig.markdown_toc_level = config.vuepress.markdown_toc_level;
  }

  if (config.vuepress?.revisionmeProjectId !== undefined) {
    vuepressConfig.revisionmeProjectId = config.vuepress.revisionmeProjectId;
  }

  if (config.vuepress?.revisionmeFloatingBtn !== undefined) {
    vuepressConfig.revisionmeFloatingBtn = config.vuepress.revisionmeFloatingBtn;
  }

  if (config.vuepress?.revisionmeContextWidget !== undefined) {
    vuepressConfig.revisionmeContextWidget = config.vuepress.revisionmeContextWidget;
  }

  fs.writeFileSync(vuepressConfigPath, JSON.stringify(vuepressConfig));
};

const build = (source = "..", dest = ".", cachePath, commitHashRepos) => {
  sourceDir = source;
  workDir = dest;
  commitHash = commitHashRepos;

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
