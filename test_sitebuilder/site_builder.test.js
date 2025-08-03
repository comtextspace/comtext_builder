import fs from "fs";
import path from "path";

// 3-rd paty
import { jest } from "@jest/globals"; // Импортируем jest для ESM
import readDir from "fs-readdir-recursive";

// Используем jest.unstable_mockModule для ESM
// ВАЖНО: Это должно быть до импорта тестируемого модуля
jest.unstable_mockModule("../source/cache.js", () => ({
  // Экспортируем функции как именованные exports
  tryRestoreFileFromCache: jest.fn().mockResolvedValue(false),
  saveFileToCache: jest.fn().mockResolvedValue(false),
  // Если бы у cache.js был экспорт по умолчанию, нужно было бы добавить default: ...
}));

// Следующий код подменяет функцию конвертации даты в adm-zip
// чтобы архив формировался одинаково независимо от таймзоны ПК

const utilsModule = await import("adm-zip/util/utils.js");
const utils = utilsModule.default || utilsModule.utils || utilsModule;

// Патчим fromDate2DOS, чтобы использовать UTC
utils.fromDate2DOS = function (val) {
    let date = 0;
    let time = 0;

    if (val.getUTCFullYear() > 1979) {
        date = (((val.getUTCFullYear() - 1980) & 0x7f) << 9) |
               ((val.getUTCMonth() + 1) << 5) |
               val.getUTCDate();

        time = (val.getUTCHours() << 11) |
               (val.getUTCMinutes() << 5) |
               (val.getUTCSeconds() >> 1);
    }

    return (date << 16) | time;
};

// ----------- конец замены функции из модуля admZip

test("buildSite", async () => {
  const { build } = await import("../source/site_builder.js");

  fs.rmSync("./test_sitebuilder/dest", {
    recursive: true,
    force: true,
  });

  fs.mkdirSync("./test_sitebuilder/dest");
  fs.mkdirSync("./test_sitebuilder/dest/docs");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public/img");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public/files");

  fs.copyFileSync(
    "./test_sitebuilder/source/docs/.vuepress/config.json",
    "./test_sitebuilder/dest/docs/.vuepress/config.json"
  );

  await build("./test_sitebuilder/source/", "./test_sitebuilder/dest/");

  const foundFiles = readDir("./test_sitebuilder/dest_correct", () => true);

  foundFiles.forEach((filename) => {
    const correctFilename = path.join("./test_sitebuilder/dest_correct", filename);
    const testFilename = path.join("./test_sitebuilder/dest", filename);
  
    console.log("correct " + correctFilename);
    console.log("test " + testFilename);

    let correctFile, testFile;
  
    // Проверяем, это ZIP-файл или нет
    if (filename.toLowerCase().endsWith(".zip") 
      || filename.toLowerCase().endsWith(".epub")) {
      // Читаем как Buffer (без кодировки)
      correctFile = fs.readFileSync(correctFilename);
      testFile = fs.readFileSync(testFilename);
    } else {
      // Читаем как текст в кодировке UTF-8
      correctFile = fs.readFileSync(correctFilename, "utf-8");
      testFile = fs.readFileSync(testFilename, "utf-8");
    }
  
    expect(testFile).toEqual(correctFile);
  });
});

// TODO нет проверки на то, что генерируются все нужные файлы
//   на экспорт, а лишние не генерируются