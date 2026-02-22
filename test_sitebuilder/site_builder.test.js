import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { jest } from "@jest/globals";

// 3-rd paty
import readDir from "fs-readdir-recursive";

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


import { build } from "../source/site_builder.js";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-01-20T14:33:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

test("buildSite", async () => {

  // Удаляем кеш перед запуском тестов
  fs.rmSync("./test_sitebuilder/export-cache", {
    recursive: true,
    force: true,
  });

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

   build("./test_sitebuilder/source/", 
         "./test_sitebuilder/dest/", 
         "./test_sitebuilder/export-cache/",
         "a1b2c3d4e5f6789012345678901234567890abcd");

  // Проверка рекурсивной обработки каталогов: файлы из подкаталогов должны быть обработаны
  const sourceBookFiles = readDir("./test_sitebuilder/source/book", (file) => file.endsWith(".md"));
  const destBookFiles = fs.readdirSync("./test_sitebuilder/dest/docs")
    .filter(file => file.endsWith(".md") && file.startsWith("book_"));
  
  // Проверяем, что все файлы из каталога book (включая подкаталоги) обработаны
  expect(destBookFiles.length).toBeGreaterThanOrEqual(sourceBookFiles.length);
  expect(destBookFiles).toContain("book_third.md"); // из подкаталога other

  const foundFiles = readDir("./test_sitebuilder/dest_correct", () => true);

  foundFiles.forEach((filename) => {
    const correctFilename = path.join("./test_sitebuilder/dest_correct", filename);
    const testFilename = path.join("./test_sitebuilder/dest", filename);
  
    // console.log("correct " + correctFilename);
    // console.log("test " + testFilename);

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

  // Проверка валидности FB2 файлов по XSD схеме
  const xsdPath = path.join("./test_sitebuilder/files/fb2-xsd/FictionBook.xsd");
  const fb2Files = fs.readdirSync("./test_sitebuilder/dest/docs/.vuepress/public/files")
    .filter(file => file.endsWith(".fb2"))
    .map(file => path.join("./test_sitebuilder/dest/docs/.vuepress/public/files", file));

  // Проверяем наличие xmllint
  let xmllintAvailable = false;
  try {
    execSync("which xmllint", { stdio: "ignore" });
    xmllintAvailable = true;
  } catch {
    console.warn("xmllint не найден, проверка валидности FB2 по XSD пропущена");
  }

  if (xmllintAvailable && fs.existsSync(xsdPath)) {
    fb2Files.forEach((fb2File) => {
      try {
        const result = execSync(
          `xmllint --noout --schema "${xsdPath}" "${fb2File}"`,
          { encoding: "utf-8", stdio: "pipe" }
        );
        // Если валидация прошла успешно, xmllint не выводит ничего
        expect(result).toBe("");
      } catch (error) {
        const errorMessage = error.stdout || error.stderr || error.message;
        throw new Error(`FB2 файл ${path.basename(fb2File)} не прошел валидацию по XSD:\n${errorMessage}`);
      }
    });
  }
});

// TODO нет проверки на то, что генерируются все нужные файлы
//   на экспорт, а лишние не генерируются