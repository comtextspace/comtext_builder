import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from "fs";
import { resolve, join } from "path";

let CACHE_PATH;
const actualFiles = [];

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
    actualFiles.push(cacheFileName);
    return true;
  }

  return false;
}

/**
 * Сохраняет файл в кеш.
 * 
 * @param {string} filePath - Путь к исходному файлу.
 * @param {string} cacheFileName - Имя файла в кеше: например, fb2--book1.md-|-v1--abc.fb2
 * @returns {boolean} true, если успешно.
 */
export function saveFileToCache(filePath, cacheFileName) {
  const sourcePath = resolve(filePath);
  const cacheDir = resolve(CACHE_PATH);
  const cacheFilePath = join(cacheDir, cacheFileName);

  try {
    // Сохраняем новый файл
    copyFileSync(sourcePath, cacheFilePath);
    actualFiles.push(cacheFileName);
    console.log(`✅ Сохранён новый кеш-файл: ${cacheFileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при сохранении в кеш: ${error.message}`);
    return false;
  }
}

/**
 * Удаляет все файлы в каталоге CACHE_PATH, кроме перечисленных в actualFiles.
 * @param {string} cachePath - Путь к кеш-каталогу.
 * @param {string[]} actualFiles - Массив имён файлов, которые нужно сохранить (например: ['book1.fb2', 'book2.epub']).
 */
export function cleanupOldCache() {
  const fullPath = resolve(CACHE_PATH);

  try {
    const files = readdirSync(fullPath);

    for (const file of files) {
      // Если файла нет в списке разрешённых — удаляем
      if (!actualFiles.includes(file)) {
        const filePath = join(fullPath, file);
        unlinkSync(filePath);
        console.log(`🗑️ Удалён файл: ${file}`);
      }
    }
  } catch (error) {
    console.error(`❌ Ошибка при очистке кеша: ${error.message}`);
  }
}