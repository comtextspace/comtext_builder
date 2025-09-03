import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

let CACHE_PATH;

export function initCache(cachePath) {
  CACHE_PATH = cachePath;

  if (!existsSync(CACHE_PATH)) {
    mkdirSync(CACHE_PATH, { recursive: true });
  }
}


/**
 * Пытается восстановить файл из кеша.
 * @param {string} cacheFileName - Имя файла в папке кеша.
 * @param {string} restoreToPath - Путь, куда скопировать файл.
 * @returns {boolean} true, если файл был найден и скопирован, иначе false.
 */
export function tryRestoreFileFromCache(cacheFileName, restoreToPath) {
  const cacheFilePath = resolve(CACHE_PATH, cacheFileName);
  const targetPath = resolve(restoreToPath);

  if (existsSync(cacheFilePath)) {
    copyFileSync(cacheFilePath, targetPath);
    return true;
  }

  return false;
}

/**
 * Сохраняет файл в кеш, удалив все старые файлы с таким же префиксом до и с `|`.
 * Например: для `fb2--book1.md-|-v1--hash.fb2` → префикс: `fb2--book1.md-|`
 * Удаляет все файлы, начинающиеся с этого префикса.
 * 
 * @param {string} filePath - Путь к исходному файлу.
 * @param {string} cacheFileName - Имя файла в кеше: например, fb2--book1.md-|-v1--abc.fb2
 * @returns {boolean} true, если успешно.
 */
export function saveFileToCache(filePath, cacheFileName) {
  const sourcePath = resolve(filePath);
  const cacheDir = resolve(CACHE_PATH);
  const cacheFilePath = join(cacheDir, cacheFileName);

  // Находим позицию символа '|'
  const pipeIndex = cacheFileName.indexOf('|');
  if (pipeIndex === -1) {
    console.error(`❌ Имя файла не содержит символ "|": ${cacheFileName}`);
    return false;
  }

  // Берём всё, что до `|` включительно — это наш префикс
  const prefix = cacheFileName.slice(0, pipeIndex + 1); // +1 чтобы включить `|`
  const files = readdirSync(cacheDir);

  try {
    // Удаляем все файлы, начинающиеся с этого префикса
    for (const file of files) {
      if (file.startsWith(prefix)) {
        const fullPath = join(cacheDir, file);
        unlinkSync(fullPath);
        console.log(`🗑️ Удалён старый кеш-файл: ${file}`);
      }
    }

    // Сохраняем новый файл
    copyFileSync(sourcePath, cacheFilePath);
    console.log(`✅ Сохранён новый кеш-файл: ${cacheFileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при сохранении в кеш: ${error.message}`);
    return false;
  }
}