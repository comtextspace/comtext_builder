import cache from "@actions/cache";
import core from "@actions/core";
import fs from "fs";
import crypto from "crypto";

/**
 * Попытаться восстановить кэш по ключу: prefix + hash(fileToHashPath)
 *
 * @param {string} prefix - Префикс ключа (например, 'node-modules')
 * @param {string} fileToHashPath - Путь к файлу, хеш которого определяет версию кэша
 * @param {string} restoreToPath - Путь, куда восстановить кэш (например, 'node_modules')
 * @returns {Promise<string|false>} - Возвращает ключ, если кэш найден, иначе false
 */
export async function tryRestoreFileFromCache(prefix, fileToHashPath, restoreToPath) {
  try {
    // Проверяем, существует ли файл, от которого зависит ключ
    if (!fs.existsSync(fileToHashPath)) {
      console.warn(`[Cache] Файл не найден: ${fileToHashPath}`);
      return false;
    }

    // Читаем содержимое файла и вычисляем хеш
    const content = fs.readFileSync(fileToHashPath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    // Формируем ключ
    const key = `${prefix}-${hash}`;

    console.log(`[Cache] Поиск кэша по ключу: ${key}`);
    console.log(`[Cache] Путь восстановления: ${restoreToPath}`);

    // Попытка восстановить кэш (без restoreKeys — только точное совпадение)
    const matchedKey = await cache.restoreCache([restoreToPath], key);

    if (matchedKey) {
      console.log(`✅ Кэш найден и восстановлен: ${matchedKey}`);
      return matchedKey;
    } else {
      console.log("❌ Кэш не найден");
      return false;
    }
  } catch (error) {
    // Ошибки валидации нужно пробрасывать
    if (error.name === "ValidationError") {
      core.setFailed(`Ошибка валидации кэша: ${error.message}`);
      throw error;
    } else if (error.name === "ReservedCacheError") {
      console.warn(`⚠️ Кэш с этим ключом уже зарезервирован: ${error.message}`);
    } else {
      console.warn(`⚠️ Ошибка при восстановлении кэша: ${error.message}`);
    }
    return false;
  }
}

/**
 * Сохраняет файл или папку в кэш GitHub Actions по ключу: prefix + hash(fileToHashPath)
 *
 * @param {string} prefix - Префикс ключа (например, 'node-modules')
 * @param {string} fileToHashPath - Путь к файлу, хеш которого будет частью ключа
 * @param {string} pathToCache - Путь к файлу или папке, которую нужно сохранить в кэш
 * @returns {Promise<boolean>} - true, если сохранение прошло успешно, иначе false
 */
export async function saveFileToCache(prefix, fileToHashPath, pathToCache) {
    try {
      // Проверяем, существует ли файл, от которого зависит ключ
      if (!fs.existsSync(fileToHashPath)) {
        console.warn(`[Cache] Не могу создать ключ: файл не найден — ${fileToHashPath}`);
        return false;
      }
  
      if (!fs.existsSync(pathToCache)) {
        console.warn(`[Cache] Не могу сохранить кэш: путь не существует — ${pathToCache}`);
        return false;
      }
  
      // Генерируем хеш содержимого файла-источника
      const content = fs.readFileSync(fileToHashPath);
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      const key = `${prefix}-${hash}`;
  
      console.log(`[Cache] Сохраняем в кэш по ключу: ${key}`);
      console.log(`[Cache] Путь для сохранения: ${pathToCache}`);
  
      try {
        await cache.saveCache([pathToCache], key);
        console.log(`✅ Кэш успешно сохранён: ${key}`);
        return true;
      } catch (error) {
        if (error.name === "ValidationError") {
          console.error(`❌ Ошибка валидации кэша: ${error.message}`);
          throw error;
        } else if (error.name === "ReservedCacheError") {
          console.warn(`⚠️ Кэш с ключом '${key}' уже существует.`);
          return false;
        } else {
          console.warn(`⚠️ Ошибка при сохранении кэша: ${error.message}`);
          return false;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Не удалось сохранить кэш: ${error.message}`);
      return false;
    }
  }
